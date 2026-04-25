from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from ..database import get_db
from ..models.maps import Map
from ..models.base import User
from ..dependencies.auth import get_current_user, TokenData, require_role

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/summary")
async def get_summary_stats(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    # Calculate totals by status
    query = select(Map.status, func.count(Map.map_id)).group_by(Map.status)
    result = await db.execute(query)
    rows = result.all()
    
    stats = {
        "total": sum(r[1] for r in rows),
        "inProgress": next((r[1] for r in rows if r[0] == "In Progress"), 0),
        "complete": next((r[1] for r in rows if r[0] == "Complete"), 0),
        "onHold": next((r[1] for r in rows if r[0] == "On Hold"), 0)
    }
    return stats

@router.get("/analysts")
async def get_analyst_performance(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["owner", "admin"]))
):
    # Complex join query for performance metrics
    query = select(
        User.user_id,
        User.full_name,
        func.count(Map.map_id).label("total_count"),
        func.sum(case((Map.status == "Complete", 1), else_=0)).label("completed_count"),
        func.max(Map.created_at).label("last_archive")
    ).join(Map).group_by(User.user_id, User.full_name)
    
    result = await db.execute(query)
    return result.mappings().all()
