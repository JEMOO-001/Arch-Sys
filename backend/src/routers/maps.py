from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional, Literal
import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import Request

from ..database import get_db
from ..core.config import settings

logger = logging.getLogger(__name__)
from ..models.maps import Map, AuditLog
from ..schemas.maps import MapCreate, MapResponse, MapUpdate, MapEditUpdate
from ..services.id_generator import generate_unique_id
from ..dependencies.auth import get_current_user, TokenData
from ..services.audit import log_change, log_multiple_changes

router = APIRouter(prefix="/maps", tags=["Maps"])
SEARCH_FIELDS = ("all", "unique_id", "layout_name", "project_name", "status", "to_whom", "income_num", "outcome_num", "comment")
APP_TIMEZONE = ZoneInfo(settings.TIMEZONE)


def get_tenant_id(request: Request) -> int:
    return int(getattr(request.state, "tenant_id", 1))


def escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def build_search_filter(query, search_field: str, search_term: str):
    term = f"%{escape_like(search_term)}%"
    if search_field == "all":
        return query.where(
            or_(
                Map.unique_id.ilike(term, escape="\\"),
                Map.layout_name.ilike(term, escape="\\"),
                Map.project_name.ilike(term, escape="\\"),
                Map.status.ilike(term, escape="\\"),
                Map.income_num.ilike(term, escape="\\"),
                Map.outcome_num.ilike(term, escape="\\"),
                Map.to_whom.ilike(term, escape="\\"),
                Map.comment.ilike(term, escape="\\")
            )
        )
    if search_field == "unique_id":
        return query.where(Map.unique_id.ilike(term, escape="\\"))
    if search_field == "layout_name":
        return query.where(Map.layout_name.ilike(term, escape="\\"))
    if search_field == "project_name":
        return query.where(Map.project_name.ilike(term, escape="\\"))
    if search_field == "status":
        return query.where(Map.status.ilike(term, escape="\\"))
    if search_field == "to_whom":
        return query.where(Map.to_whom.ilike(term, escape="\\"))
    if search_field == "income_num":
        return query.where(Map.income_num.ilike(term, escape="\\"))
    if search_field == "outcome_num":
        return query.where(Map.outcome_num.ilike(term, escape="\\"))
    if search_field == "comment":
        return query.where(Map.comment.ilike(term, escape="\\"))
    return query


def check_map_authorization(current_user: TokenData, db_map: Map):
    """Check if user is authorized to access this map record."""
    if current_user.role == "analyst" and db_map.analyst_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this record")

@router.get("/next-id")
async def get_next_id(
    prefix: str = Query(..., min_length=2, max_length=5),
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Generate a unique ID for a new map. Used by the ArcGIS Pro add-in."""
    unique_id = await generate_unique_id(db, prefix)
    return {"next_id": unique_id}

@router.post("/", response_model=MapResponse)
async def create_map(
    map_in: MapCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")

    logger.info(f"create_map received: {map_in.model_dump()}")

    # 1. Use provided unique_id or generate one
    if map_in.unique_id:
        unique_id = map_in.unique_id
    else:
        unique_id = await generate_unique_id(db, map_in.category_prefix)
    
    # 2. Create Map record
    tenant_id = get_tenant_id(request)
    dump = map_in.model_dump(exclude={"category_prefix", "unique_id"})
    logger.info(f"Creating Map with fields: unique_id={unique_id}, analyst_id={current_user.user_id}, dump={dump}")
    
    db_map = Map(
        **dump,
        unique_id=unique_id,
        analyst_id=current_user.user_id,
        tenant_id=tenant_id,
        created_at=datetime.now(APP_TIMEZONE)
    )
    
    db.add(db_map)
    await db.commit()
    await db.refresh(db_map)
    
    logger.info(f"Map created: id={db_map.map_id}, uid={db_map.unique_id}, income_num={db_map.income_num}, outcome_num={db_map.outcome_num}, to_whom={db_map.to_whom}, status={db_map.status}, comment={db_map.comment}")
    
    return db_map

@router.get("/", response_model=List[MapResponse])
async def list_maps(
    request: Request,
    search: Optional[str] = None,
    search_field: Literal["all", "unique_id", "layout_name", "project_name", "status", "to_whom", "income_num", "outcome_num", "comment"] = "all",
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    tenant_id = get_tenant_id(request)
    query = select(Map).where(Map.tenant_id == tenant_id)
    
    if status:
        query = query.where(Map.status == status)
    
    if search:
        query = build_search_filter(query, search_field, search)
    
    query = query.order_by(Map.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/my", response_model=List[MapResponse])
async def list_my_maps(
    request: Request,
    search: Optional[str] = None,
    search_field: Literal["all", "unique_id", "layout_name", "project_name", "status", "to_whom", "income_num", "outcome_num", "comment"] = "all",
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List maps archived by the current user only."""
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
    
    tenant_id = get_tenant_id(request)
    query = select(Map).where(Map.analyst_id == current_user.user_id, Map.tenant_id == tenant_id)
    
    if status_filter:
        query = query.where(Map.status == status_filter)
    
    if search:
        query = build_search_filter(query, search_field, search)
    
    query = query.order_by(Map.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{map_id}", response_model=MapResponse)
async def get_map(
    map_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = result.scalar_one_or_none()
    
    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")

    check_map_authorization(current_user, db_map)
    return db_map

@router.patch("/{map_id}", response_model=MapResponse)
async def update_map(
    map_id: int,
    map_in: MapUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")

    result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = result.scalar_one_or_none()
    
    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")
    
    if current_user.role == "analyst" and db_map.analyst_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this record")
    
    update_data = map_in.model_dump()  # Include all fields, even None
    logger.debug(f"update_data = {update_data}")
    logger.debug(f"map_in fields = {map_in}")
    
    # Collect changes for audit log - log ALL provided fields (even if same)
    changes = {}
    
    for field, new_val in update_data.items():
        if new_val is not None:  # Only update if value is provided and not null
            old_val = getattr(db_map, field)
            # Always log if explicitly provided (even if same value)
            changes[field] = (str(old_val) if old_val else "", str(new_val) if new_val else "")
            setattr(db_map, field, new_val)
            logger.debug(f"{field} set from '{old_val}' to '{new_val}'")
    
    # Log changes as SINGLE batch entry (only actual changes, newlines)
    if changes and current_user.user_id:
        changes_list = [f"{k}: {v[0]} -> {v[1]}" for k, v in changes.items() if v[0] != v[1]]
        if changes_list:
            combined = "\n".join(changes_list)
            await log_change(db, map_id, current_user.user_id, "batch", combined, "")
    
    # Always commit if we have fields to update (regardless of audit log)
    await db.commit()
    await db.refresh(db_map)
    logger.info(f"Map {map_id} updated. New status: {db_map.status}")
        
    return db_map

@router.put("/{map_id}/reexport", response_model=MapResponse)
async def reexport_map(
    map_id: int,
    map_in: MapEditUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Update map metadata and file path (for re-export/overwrite)."""
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
    
    result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = result.scalar_one_or_none()
    
    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")
    
    if current_user.role == "analyst" and db_map.analyst_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this record")
    
    update_data = map_in.model_dump()  # Include all fields
    
    # Collect changes for audit log
    changes = {}
    
    for field, new_val in update_data.items():
        if new_val is not None:
            if field == "category_prefix":
                continue
            old_val = getattr(db_map, field)
            if str(old_val) != str(new_val):
                changes[field] = (str(old_val) if old_val else "", str(new_val) if new_val else "")
            setattr(db_map, field, new_val)
            logger.debug(f"{field} updated from '{old_val}' to '{new_val}'")
    
    # Log changes as SINGLE batch entry (only actual changes, newlines)
    if changes and current_user.user_id:
        changes_list = [f"{k}: {v[0]} -> {v[1]}" for k, v in changes.items() if v[0] != v[1]]
        if changes_list:
            combined = "\n".join(changes_list)
            await log_change(db, map_id, current_user.user_id, "batch", combined, "")
    
    db_map.updated_at = datetime.now(APP_TIMEZONE)
    
    await db.commit()
    await db.refresh(db_map)
    logger.info(f"Map {map_id} re-exported. status={db_map.status}")
    
    return db_map

def format_audit_action(field_name: str, old_value: str, new_value: str) -> str:
    """Format audit action for display."""
    # Check if it's a batch change (contains |)
    if "|" in field_name:
        # Parse batch changes
        parts = []
        for part in field_name.split("|"):
            if ":" in part:
                field, vals = part.split(":", 1)
                if "→" in vals:
                    old, new = vals.split("→", 1)
                    old_disp = old if old else "(empty)"
                    new_disp = new if new else "(empty)"
                    parts.append(f"{field}: {old_disp} → {new_disp}")
        return "Updated: " + ", ".join(parts) if parts else "Multiple changes"
    
    if field_name == "file_path":
        return "Re-exported map file"
    
    # For other fields, show "Changed field from X to Y"
    old = old_value if old_value else "(empty)"
    new = new_value if new_value else "(empty)"
    
    if field_name == "batch":
        # Batch changes stored in old_value
        return f"Updated:\n{old}"
    
    return f"Changed {field_name}: {old} → {new}"

def format_combined_action(changes: dict) -> str:
    """Format multiple changes into one action."""
    if len(changes) == 1:
        field, (old, new) = list(changes.items())[0]
        return format_audit_action(field, old, new)
    
    # Multiple changes - list them
    parts = []
    for field, (old, new) in changes.items():
        old_disp = old if old else "(empty)"
        new_disp = new if new else "(empty)"
        parts.append(f"{field}: {old_disp} → {new_disp}")
    return "Updated: " + ", ".join(parts)

@router.get("/{map_id}/audit")
async def get_audit_log(
    map_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Get audit log entries for a map."""
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
    
    # Verify map exists
    map_result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = map_result.scalar_one_or_none()
    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")
    check_map_authorization(current_user, db_map)
    
    result = await db.execute(
        select(AuditLog).where(AuditLog.map_id == map_id).order_by(AuditLog.changed_at.desc())
    )
    logs = result.scalars().all()
    
    return [
        {
            "id": log.audit_id,
            "field_name": log.field_name,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "action": format_audit_action(log.field_name, log.old_value, log.new_value),
            "changed_by": log.changed_by,
            "changed_at": log.changed_at.isoformat() if log.changed_at else None
        }
        for log in logs
    ]

@router.post("/audit/batch")
async def check_audit_logs_batch(
    request: Request,
    map_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Check which maps have audit logs (batch). Returns list of map_ids that have changes."""
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
    if len(map_ids) > 500:
        raise HTTPException(status_code=413, detail="Too many map IDs")
    
    tenant_id = get_tenant_id(request)
    result = await db.execute(
        select(AuditLog.map_id).where(AuditLog.map_id.in_(map_ids), AuditLog.tenant_id == tenant_id).distinct()
    )
    maps_with_audit = [row[0] for row in result.fetchall()]
    
    return {"maps_with_audit": maps_with_audit}
