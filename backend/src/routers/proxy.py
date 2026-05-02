from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
from html import escape
import logging
from ..database import get_db
from ..models.maps import Map
from ..dependencies.auth import verify_token

router = APIRouter(prefix="/proxy", tags=["Proxy"])
logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

@router.get("/file/{map_id}")
async def stream_file(
    map_id: int,
    token: str = Query(None, description="Bearer token for authentication"),
    mode: str = Query("inline", description="inline=view, attachment=download"),
    db: AsyncSession = Depends(get_db),
    auth_token: str = Depends(oauth2_scheme),
):
    current_user = None
    
    if auth_token:
        current_user = verify_token(auth_token)
    elif token:
        current_user = verify_token(token.replace("Bearer ", ""))
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = result.scalar_one_or_none()
    
    if not db_map:
        raise HTTPException(status_code=404, detail="Map record not found")
    
    if not db_map.file_path:
        raise HTTPException(status_code=404, detail="No file attached to this map record")
    
    file_path = Path(db_map.file_path)
    
    if not file_path.exists():
        logger.warning(f"File not found on disk: {db_map.file_path}")
        raise HTTPException(status_code=404, detail="File not found on server")
    
    safe_name = escape(file_path.name)
    is_pdf = file_path.suffix.lower() == ".pdf"
    is_image = file_path.suffix.lower() in [".jpeg", ".jpg", ".png"]
    media_type = "application/pdf"
    if is_image:
        media_type = "image/jpeg" if file_path.suffix.lower() in [".jpeg", ".jpg"] else "image/png"
    
    logger.info(f"Serving file: {file_path.name}, media_type={media_type}, mode={mode}, is_image={is_image}")
    
    if mode == "attachment":
        headers = {"Content-Disposition": f"attachment; filename=\"{file_path.name}\""}
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=file_path.name,
            headers=headers
        )
    
    safe_token = escape(token or '')

    if is_image:
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>{safe_name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        html, body {{ width: 100%; height: 100%; overflow: auto; background: #1a1a2e; }}
        .container {{ display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }}
        img {{ max-width: 100%; max-height: 100vh; object-fit: contain; }}
    </style>
</head>
<body>
    <div class="container">
        <img src="/api/v1/proxy/raw/{map_id}?token={safe_token}" alt="{safe_name}" />
    </div>
</body>
</html>
"""
        return HTMLResponse(content=html_content)

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>{safe_name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        html, body {{ width: 100%; height: 100%; }}
        iframe {{ width: 100%; height: 100%; border: none; }}
    </style>
</head>
<body>
    <iframe src="/api/v1/proxy/raw/{map_id}?token={safe_token}"></iframe>
</body>
</html>
"""
    return HTMLResponse(content=html_content)


@router.get("/raw/{map_id}")
async def raw_file(
    map_id: int,
    token: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Raw file stream for iframe/embedding"""
    current_user = None
    
    if token:
        current_user = verify_token(token.replace("Bearer ", ""))
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = result.scalar_one_or_none()
    
    if not db_map:
        raise HTTPException(status_code=404, detail="Map not found")
    
    file_path = Path(db_map.file_path)
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    media_type = "application/pdf"
    if file_path.suffix.lower() in [".jpeg", ".jpg"]:
        media_type = "image/jpeg"
    elif file_path.suffix.lower() == ".png":
        media_type = "image/png"
    
    headers = {"Content-Disposition": "inline"}
    return FileResponse(path=file_path, media_type=media_type, headers=headers)