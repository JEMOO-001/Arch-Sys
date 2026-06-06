from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
import logging
import os
import uuid
import aiofiles
from datetime import datetime, timedelta, timezone
from ..core.config import settings

from ..database import get_db

logger = logging.getLogger(__name__)
from ..models.maps import Map, AuditLog, MapComment, Notification
from ..models.base import User
from ..schemas.maps import MapCreate, MapResponse, MapUpdate, MapEditUpdate, MapApprovalUpdate, MapCommentCreate, MapCommentResponse
from ..services.id_generator import generate_unique_id
from ..dependencies.auth import get_current_user, TokenData
from ..services.audit import log_change, log_multiple_changes
from ..services.websocket import manager

router = APIRouter(prefix="/maps", tags=["Maps"])

# Allowed values for search_field — prevents unexpected column probing
_SEARCH_FIELDS = {
    "all", "unique_id", "layout_name", "project_name", "status",
    "to_whom", "income_num", "outcome_num", "comment",
    "approval_status", "approval_comment",
}

def check_map_authorization(current_user: TokenData, db_map: Map, mode: str = "edit"):
    """Check if user is authorized to access/modify this map record."""
    if current_user.role == "admin":
        return
    
    # SECURITY: tenant isolation
    if db_map.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # NOTE: All users in the same tenant are allowed to view/edit maps as requested.
    # Previously, non-admins were restricted to editing only their own records.


def _apply_search(query, search: str, search_field: str):
    """Apply search filters; reject unknown field names."""
    if search_field not in _SEARCH_FIELDS:
        raise HTTPException(status_code=400, detail="Invalid search_field value")

    search_term = f"%{search}%"

    if search_field == "all":
        return query.where(
            or_(
                Map.unique_id.ilike(search_term),
                Map.layout_name.ilike(search_term),
                Map.project_name.ilike(search_term),
                Map.status.ilike(search_term),
                Map.income_num.ilike(search_term),
                Map.outcome_num.ilike(search_term),
                Map.to_whom.ilike(search_term),
                Map.comment.ilike(search_term),
                Map.approval_status.ilike(search_term),
                Map.approval_comment.ilike(search_term),
            )
        )

    column_map = {
        "unique_id":        Map.unique_id,
        "layout_name":      Map.layout_name,
        "project_name":     Map.project_name,
        "status":           Map.status,
        "to_whom":          Map.to_whom,
        "income_num":       Map.income_num,
        "outcome_num":      Map.outcome_num,
        "comment":          Map.comment,
        "approval_status":  Map.approval_status,
        "approval_comment": Map.approval_comment,
    }
    return query.where(column_map[search_field].ilike(search_term))


@router.get("/next-id")
async def get_next_id(
    prefix: str = Query(..., min_length=2, max_length=5, pattern=r"^[A-Z]{2,5}$"),
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Generate a unique ID for a new map. Used by the ArcGIS Pro add-in."""
    unique_id = await generate_unique_id(db, prefix)
    return {"next_id": unique_id}


@router.post("/", response_model=MapResponse)
async def create_map(
    map_in: MapCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")

    logger.info("create_map received: %s", map_in.model_dump())

    unique_id = map_in.unique_id or await generate_unique_id(db, map_in.category_prefix)

    dump = map_in.model_dump(exclude={"category_prefix", "unique_id"})
    logger.info(
        "Creating Map: unique_id=%s analyst_id=%s dump=%s",
        unique_id, current_user.user_id, dump,
    )

    db_map = Map(
        **dump,
        unique_id=unique_id,
        analyst_id=current_user.user_id,
        tenant_id=current_user.tenant_id or 1,
        created_at=datetime.now(timezone.utc) + timedelta(hours=3),
    )

    db.add(db_map)
    await db.commit()
    await db.refresh(db_map)

    logger.info(
        "Map created: id=%s uid=%s income=%s outcome=%s to_whom=%s status=%s",
        db_map.map_id, db_map.unique_id, db_map.income_num,
        db_map.outcome_num, db_map.to_whom, db_map.status,
    )
    return db_map


@router.get("/", response_model=List[MapResponse])
async def list_maps(
    search: Optional[str] = Query(None, max_length=200),
    search_field: Optional[str] = Query("all", max_length=30),
    status: Optional[str] = Query(None, pattern=r"^(In Progress|Complete)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    query = select(Map, User.full_name.label("analyst_name")).join(User, Map.analyst_id == User.user_id).where(Map.tenant_id == current_user.tenant_id)

    if status:
        query = query.where(Map.status == status)
    if search:
        query = _apply_search(query, search, search_field or "all")

    query = query.order_by(Map.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    
    maps = []
    for db_map, analyst_name in result.all():
        map_dict = {c.name: getattr(db_map, c.name) for c in db_map.__table__.columns}
        map_dict["analyst_name"] = analyst_name
        maps.append(map_dict)
    
    return maps


@router.get("/my", response_model=List[MapResponse])
async def list_my_maps(
    search: Optional[str] = Query(None, max_length=200),
    search_field: Optional[str] = Query("all", max_length=30),
    status_filter: Optional[str] = Query(None, alias="status", pattern=r"^(In Progress|Complete)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """List maps archived by the current user only."""
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")

    query = select(Map, User.full_name.label("analyst_name")).join(User, Map.analyst_id == User.user_id).where(Map.analyst_id == current_user.user_id, Map.tenant_id == current_user.tenant_id)

    if status_filter:
        query = query.where(Map.status == status_filter)
    if search:
        query = _apply_search(query, search, search_field or "all")

    query = query.order_by(Map.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    
    maps = []
    for db_map, analyst_name in result.all():
        map_dict = {c.name: getattr(db_map, c.name) for c in db_map.__table__.columns}
        map_dict["analyst_name"] = analyst_name
        maps.append(map_dict)
    
    return maps


@router.get("/{map_id}", response_model=MapResponse)
async def get_map(
    map_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    result = await db.execute(
        select(Map, User.full_name.label("analyst_name"))
        .join(User, Map.analyst_id == User.user_id)
        .where(Map.map_id == map_id)
    )
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Map record not found")

    db_map, analyst_name = row
    if db_map.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    map_dict = {c.name: getattr(db_map, c.name) for c in db_map.__table__.columns}
    map_dict["analyst_name"] = analyst_name
    return map_dict


@router.patch("/{map_id}", response_model=MapResponse)
async def update_map(
    map_id: int,
    map_in: MapUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")

    result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = result.scalar_one_or_none()

    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")
    
    check_map_authorization(current_user, db_map, mode="edit")

    update_data = map_in.model_dump()
    changes = {}

    for field, new_val in update_data.items():
        if new_val is not None:
            old_val = getattr(db_map, field)
            changes[field] = (str(old_val) if old_val else "", str(new_val))
            setattr(db_map, field, new_val)
            logger.debug("%s set from '%s' to '%s'", field, old_val, new_val)

    if changes:
        changes_list = [f"{k}: {v[0]} -> {v[1]}" for k, v in changes.items() if v[0] != v[1]]
        if changes_list:
            await log_change(db, map_id, current_user.user_id, "batch", "", "\n".join(changes_list))

    await db.commit()
    await db.refresh(db_map)
    logger.info("Map %s updated. New status: %s", map_id, db_map.status)
    return db_map


@router.put("/{map_id}/reexport", response_model=MapResponse)
async def reexport_map(
    map_id: int,
    map_in: MapEditUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Update map metadata and file path (for re-export/overwrite)."""
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")

    result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = result.scalar_one_or_none()

    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")
    
    check_map_authorization(current_user, db_map, mode="edit")

    update_data = map_in.model_dump()
    changes = {}

    for field, new_val in update_data.items():
        if new_val is not None:
            if field == "category_prefix":
                continue
            old_val = getattr(db_map, field)
            if str(old_val) != str(new_val):
                changes[field] = (str(old_val) if old_val else "", str(new_val))
            setattr(db_map, field, new_val)
            logger.debug("%s updated from '%s' to '%s'", field, old_val, new_val)

    if changes:
        changes_list = [f"{k}: {v[0]} -> {v[1]}" for k, v in changes.items()]
        await log_change(db, map_id, current_user.user_id, "batch", "", "\n".join(changes_list))

    db_map.updated_at = datetime.now(timezone.utc) + timedelta(hours=3)

    await db.commit()
    await db.refresh(db_map)
    logger.info("Map %s re-exported. status=%s", map_id, db_map.status)
    return db_map


@router.patch("/{map_id}/approval", response_model=MapResponse)
async def update_map_approval(
    map_id: int,
    approval_in: MapApprovalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can change approval status")

    result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = result.scalar_one_or_none()
    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")
    if db_map.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    old_status  = db_map.approval_status or ""
    old_comment = db_map.approval_comment or ""
    db_map.approval_status  = approval_in.approval_status
    db_map.approval_comment = approval_in.approval_comment or ""
    db_map.approved_by  = current_user.user_id
    db_map.approved_at  = datetime.now(timezone.utc) + timedelta(hours=3)
    db_map.updated_at   = datetime.now(timezone.utc) + timedelta(hours=3)

    # NEW LOGIC: If approved, automatically set status to Complete
    if db_map.approval_status == "Approve":
        db_map.status = "Complete"
        logger.info("Map %s automatically marked as Complete due to Approval", map_id)
    else:
        # Revert to In Progress if status was Complete but approval is now revoked/changed
        db_map.status = "In Progress"

    await log_change(db, map_id, current_user.user_id, "approval_status", old_status, db_map.approval_status or "")
    if old_comment != (db_map.approval_comment or ""):
        await log_change(db, map_id, current_user.user_id, "approval_comment", old_comment, db_map.approval_comment or "")

    # REAL-TIME: Notify Analyst of the decision
    if db_map.analyst_id != current_user.user_id:
        msg = f"{current_user.username} required Editing in Map {db_map.unique_id}"
        if db_map.approval_status == "Approve":
            msg = f"{current_user.username} Approve The Map Ready For Print {db_map.unique_id}"
        elif db_map.approval_status == "On Hold":
            msg = f"{current_user.username} Set Current Map {db_map.unique_id} As On Hold"

        db_notif = Notification(
            user_id=db_map.analyst_id,
            map_id=map_id,
            type="status_change",
            message=msg,
            created_at=datetime.now(timezone.utc) + timedelta(hours=3),
            tenant_id=current_user.tenant_id or 1
        )
        db.add(db_notif)

    await db.commit()
    await db.refresh(db_map)

    # Push notification AFTER successful commit
    if db_map.analyst_id != current_user.user_id:
        await manager.send_personal_message({
            "type": "NOTIFICATION",
            "data": {
                "id": 0,
                "map_id": map_id,
                "message": msg,
                "type": "status_change"
            }
        }, db_map.analyst_id)

    return db_map


@router.get("/{map_id}/comments", response_model=List[MapCommentResponse])
async def list_map_comments(
    map_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")

    map_result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = map_result.scalar_one_or_none()
    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")
    if db_map.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    check_map_authorization(current_user, db_map, mode="view")

    # Join with User table to get usernames
    result = await db.execute(
        select(MapComment, User.full_name)
        .join(User, MapComment.user_id == User.user_id)
        .where(MapComment.map_id == map_id, MapComment.deleted_at.is_(None))
        .order_by(MapComment.created_at.asc())
    )
    
    comments = []
    for comment, username in result.all():
        comment_dict = {
            "comment_id": comment.comment_id,
            "map_id": comment.map_id,
            "user_id": comment.user_id,
            "username": username,
            "message": comment.message,
            "attachment_path": comment.attachment_path,
            "created_at": comment.created_at,
            "updated_at": comment.updated_at
        }
        comments.append(comment_dict)
    
    return comments


@router.post("/{map_id}/comments", response_model=MapCommentResponse)
async def create_map_comment(
    map_id: int,
    message: str = Form(""),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")

    map_result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = map_result.scalar_one_or_none()
    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")
    if db_map.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    check_map_authorization(current_user, db_map, mode="view")

    attachment_path = None
    if file:
        # Secure filename and save
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".gif"]:
            raise HTTPException(status_code=400, detail="Only images are allowed (.jpg, .png, .gif)")
        
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        
        with open(filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        attachment_path = f"/static/uploads/{filename}"

    now = datetime.now(timezone.utc) + timedelta(hours=3)
    db_comment = MapComment(
        map_id=map_id,
        user_id=current_user.user_id,
        message=message.strip(),
        attachment_path=attachment_path,
        created_at=now,
        updated_at=now,
        tenant_id=current_user.tenant_id or 1,
    )
    db.add(db_comment)
    await db.commit()
    await db.refresh(db_comment)

    # Fetch username for response
    user_result = await db.execute(select(User.full_name).where(User.user_id == current_user.user_id))
    username = user_result.scalar()

    await log_change(db, map_id, current_user.user_id, "comment_thread", "", "Added map comment")

    # REAL-TIME: Notify recipient
    # If Admin commented, notify Analyst. If Analyst commented, notify Admins.
    notif_targets = []
    if current_user.role == "admin":
        notif_targets = [db_map.analyst_id]
    else:
        # Notify all admins in tenant 1
        admin_result = await db.execute(select(User.user_id).where(User.role == "admin", User.tenant_id == current_user.tenant_id))
        notif_targets = admin_result.scalars().all()

    for target_id in notif_targets:
        if target_id == current_user.user_id: continue

        db_notif = Notification(
            user_id=target_id,
            map_id=map_id,
            type="comment",
            message=f"{current_user.username} Sent New message at Map {db_map.unique_id}",
            created_at=now,
            tenant_id=current_user.tenant_id or 1
        )
        db.add(db_notif)

    await db.commit()

    # Push notifications AFTER successful commit
    for target_id in notif_targets:
        if target_id == current_user.user_id: continue
        await manager.send_personal_message({
            "type": "NOTIFICATION",
            "data": {
                "id": 0,
                "map_id": map_id,
                "message": f"{current_user.username} Sent New message at Map {db_map.unique_id}",
                "type": "comment"
            }
        }, target_id)

    # Broadcast message to anyone viewing this map
    await manager.broadcast_to_tenant({
    "type": "CHAT_MESSAGE",
    "data": {
        "comment_id": db_comment.comment_id,
        "map_id": db_comment.map_id,
        "user_id": db_comment.user_id,
        "username": username,
        "message": db_comment.message,
        "attachment_path": attachment_path,
        "created_at": db_comment.created_at.isoformat()
    }
}, current_user.tenant_id)

    return {
        "comment_id": db_comment.comment_id,
        "map_id": db_comment.map_id,
        "user_id": db_comment.user_id,
        "username": username,
        "message": db_comment.message,
        "attachment_path": attachment_path,
        "created_at": db_comment.created_at,
        "updated_at": db_comment.updated_at
    }


def format_audit_action(field_name: str, old_value: str, new_value: str) -> str:
    if "|" in field_name:
        parts = []
        for part in field_name.split("|"):
            if ":" in part:
                field, vals = part.split(":", 1)
                if "→" in vals:
                    old, new = vals.split("→", 1)
                    parts.append(f"{field}: {old or '(empty)'} → {new or '(empty)'}")
        return "Updated: " + ", ".join(parts) if parts else "Multiple changes"

    if field_name == "file_path":
        return "Re-exported map file"

    old = old_value or "(empty)"
    new = new_value or "(empty)"

    if field_name == "batch":
        return f"Updated:\n{new}"

    return f"Changed {field_name}: {old} → {new}"


@router.get("/{map_id}/audit")
async def get_audit_log(
    map_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")

    map_result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = map_result.scalar_one_or_none()
    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")
    if db_map.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(AuditLog, User.full_name.label("username"))
        .join(User, AuditLog.changed_by == User.user_id)
        .where(AuditLog.map_id == map_id)
        .order_by(AuditLog.changed_at.desc())
    )
    
    audit_data = []
    for log, username in result.all():
        audit_data.append({
            "id": log.audit_id,
            "field_name": log.field_name,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "action": format_audit_action(log.field_name, log.old_value, log.new_value),
            "changed_by": username,
            "changed_at": log.changed_at.isoformat() if log.changed_at else None,
        })

    return audit_data


@router.post("/audit/batch")
async def check_audit_logs_batch(
    map_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Check which maps have audit logs (batch). Returns list of map_ids that have changes."""
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")

    # SECURITY: cap the input list to prevent DoS via enormous IN clauses
    if len(map_ids) > 500:
        raise HTTPException(status_code=400, detail="Too many map IDs (max 500)")

    result = await db.execute(
        select(AuditLog.map_id)
        .where(AuditLog.map_id.in_(map_ids), AuditLog.tenant_id == current_user.tenant_id)
        .distinct()
    )
    return {"maps_with_audit": [row[0] for row in result.fetchall()]}
