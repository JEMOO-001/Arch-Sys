from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from ..database import get_db
from ..models.maps import Map
from ..schemas.maps import MapCreate, MapResponse, MapUpdate
from ..services.id_generator import generate_unique_id
from ..dependencies.auth import get_current_user, TokenData
from ..services.audit import log_multiple_changes

router = APIRouter(prefix="/maps", tags=["Maps"])

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
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    if current_user.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token: missing user_id")

    # 1. Use provided unique_id or generate one
    if map_in.unique_id:
        unique_id = map_in.unique_id
    else:
        unique_id = await generate_unique_id(db, map_in.category_prefix)
    
    # 2. Create Map record
    db_map = Map(
        **map_in.model_dump(exclude={"category_prefix", "unique_id"}),
        unique_id=unique_id,
        analyst_id=current_user.user_id
    )
    
    db.add(db_map)
    await db.commit()
    await db.refresh(db_map)
    
    return db_map

@router.get("/", response_model=List[MapResponse])
async def list_maps(
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    query = select(Map)
    
    if status:
        query = query.where(Map.status == status)
    
    if search:
        query = query.where(
            or_(
                Map.unique_id.ilike(f"%{search}%"),
                Map.layout_name.ilike(f"%{search}%"),
                Map.project_code.ilike(f"%{search}%"),
                Map.client_name.ilike(f"%{search}%")
            )
        )
    
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
    
    update_data = map_in.model_dump(exclude_unset=True)
    changes = {}
    for field, new_val in update_data.items():
        old_val = getattr(db_map, field)
        if old_val != new_val:
            changes[field] = (old_val, new_val)
            setattr(db_map, field, new_val)
    
    if changes:
        await log_multiple_changes(db, map_id, current_user.user_id, changes)
        await db.commit()
        await db.refresh(db_map)
        
    return db_map
