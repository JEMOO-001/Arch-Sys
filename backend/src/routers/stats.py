from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from ..database import get_db
from ..models.maps import Map
from ..models.base import User
from ..dependencies.auth import get_current_user, TokenData, require_role

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/summary", summary="Map counts by status — current tenant")
async def get_summary_stats(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Returns total, in-progress, and complete map counts scoped to caller's tenant."""
    query = (
        select(Map.status, func.count(Map.map_id))
        .where(Map.tenant_id == current_user.tenant_id)
        .group_by(Map.status)
        .order_by(Map.status)
    )
    result = await db.execute(query)
    rows = result.all()
    return {
        "total":      sum(r[1] for r in rows),
        "inProgress": next((r[1] for r in rows if r[0] == "In Progress"), 0),
        "complete":   next((r[1] for r in rows if r[0] == "Complete"),    0),
    }


@router.get("/analysts", summary="Analyst performance metrics — admin only")
async def get_analyst_performance(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin"])),
):
    """Per-analyst map totals, completion counts, and last archive date.
    Restricted to admin role. Results ordered by total_count DESC."""
    query = (
        select(
            User.user_id,
            User.full_name,
            func.count(Map.map_id).label("total_count"),
            func.sum(case((Map.status == "Complete", 1), else_=0)).label("completed_count"),
            func.max(Map.created_at).label("last_archive"),
        )
        .join(Map, User.user_id == Map.analyst_id)
        .where(
            User.tenant_id == current_user.tenant_id,
            Map.tenant_id == current_user.tenant_id,
        )
        .group_by(User.user_id, User.full_name)
        .order_by(func.count(Map.map_id).desc())
    )
    result = await db.execute(query)
    return result.mappings().all()
