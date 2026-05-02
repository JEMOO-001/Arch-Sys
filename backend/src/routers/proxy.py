from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
from html import escape
from ..database import get_db
from ..models.maps import Map
from ..dependencies.auth import verify_token

router = APIRouter(prefix="/proxy", tags=["Proxy"])

# Local copy to avoid circular import
def _check_map_auth(current_user, db_map):
    if current_user.role == "analyst" and db_map.analyst_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this record")
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
    
    _check_map_auth(current_user, db_map)
    
    if not db_map.file_path:
        raise HTTPException(status_code=404, detail="No file attached to this map record")
    
    file_path = Path(db_map.file_path)
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    media_type = "application/pdf"
    is_image = file_path.suffix.lower() in [".jpeg", ".jpg", ".png"]
    if is_image:
        media_type = "image/jpeg" if file_path.suffix.lower() in [".jpeg", ".jpg"] else "image/png"
    
    # mode: attachment=force download
    if mode == "attachment":
        headers = {"Content-Disposition": f"attachment; filename=\"{file_path.name}\""}
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=file_path.name,
            headers=headers
        )
    
    # For inline/view mode: show image directly, embed PDF in iframe
    if is_image:
        # Images: browser displays directly
        return FileResponse(path=file_path, media_type=media_type)
    
    # PDFs: embed in HTML with iframe
    safe_token = escape(token or '')
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{escape(file_path.name)}</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            html, body {{ height: 100%; overflow: hidden; }}
            iframe {{ width: 100%; height: 100%; border: none; }}
        </style>
    </head>
    <body>
        <iframe src="/proxy/raw/{map_id}?token={safe_token}"></iframe>
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
    """Raw file stream for iframe embedding"""
    current_user = None
    
    if token:
        current_user = verify_token(token.replace("Bearer ", ""))
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.execute(select(Map).where(Map.map_id == map_id))
    db_map = result.scalar_one_or_none()
    
    if not db_map:
        raise HTTPException(status_code=404, detail="Map not found")
    
    _check_map_auth(current_user, db_map)
    
    file_path = Path(db_map.file_path)
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    media_type = "application/pdf"
    if file_path.suffix.lower() in [".jpeg", ".jpg"]:
        media_type = "image/jpeg"
    elif file_path.suffix.lower() == ".png":
        media_type = "image/png"
    
    return FileResponse(path=file_path, media_type=media_type)
