from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from ..database import get_db
from ..dependencies.auth import get_current_user, TokenData
from ..models.maps import Notification, Map
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class NotificationResponse(BaseModel):
    id: int
    map_id: int
    type: str
    message: str
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List unread notifications for the current user."""
    query = select(Notification).where(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False,
        Notification.tenant_id == current_user.tenant_id
    ).order_by(Notification.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/{notif_id}/read")
async def mark_as_read(
    notif_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Mark a specific notification as read."""
    query = update(Notification).where(
        Notification.id == notif_id,
        Notification.user_id == current_user.user_id
    ).values(is_read=True)
    
    await db.execute(query)
    await db.commit()
    return {"status": "success"}

@router.patch("/read-all")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Mark all unread notifications for the user as read."""
    query = update(Notification).where(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False
    ).values(is_read=True)
    
    await db.execute(query)
    await db.commit()
    return {"status": "success"}

@router.patch("/read-map/{map_id}")
async def mark_map_as_read(
    map_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Mark all notifications for a specific map as read."""
    query = update(Notification).where(
        Notification.user_id == current_user.user_id,
        Notification.map_id == map_id,
        Notification.is_read == False
    ).values(is_read=True)
    
    await db.execute(query)
    await db.commit()
    return {"status": "success"}
