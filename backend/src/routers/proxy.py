from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
from ..database import get_db
from ..models.maps import Map
from ..dependencies.auth import get_current_user, TokenData
from ..core.config import settings

router = APIRouter(prefix="/proxy", tags=["Proxy"])

@router.get("/heartbeat")
async def preflight_heartbeat(
    current_user: TokenData = Depends(get_current_user)
):
    """
    Pre-Flight Heartbeat endpoint - verifies API connectivity and token validity.
    Also checks UNC path accessibility if configured.
    """
    from pathlib import Path
    import os

    # Check UNC path write access (if configured)
    unc_status = "ok"
    unc_error = None
    try:
        archive_root = settings.ARCHIVE_ROOT_PATH
        if archive_root and os.path.exists(archive_root):
            # Try to create a test file
            test_file = Path(archive_root) / f".sentinel_heartbeat_test_{os.getpid()}.tmp"
            test_file.touch()
            test_file.unlink()
        elif archive_root:
            unc_status = "unreachable"
            unc_error = f"Archive root not accessible: {archive_root}"
    except Exception as e:
        unc_status = "error"
        unc_error = str(e)

    return {
        "status": "healthy",
        "authenticated_user": current_user.username if current_user else None,
        "unc_path_status": unc_status,
        "unc_path_error": unc_error,
        "timestamp": "2026-04-22T00:00:00Z"
    }


@router.get("/file/{map_id}")
async def stream_file(
    map_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = result.scalar_one_or_none()
    
    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")
    
    file_path = Path(db_map.file_path)
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Physical file not found on server")
    
    return FileResponse(path=file_path)
