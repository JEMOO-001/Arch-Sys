from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
from html import escape
import logging
import base64
from ..database import get_db
from ..models.maps import Map
from ..dependencies.auth import verify_token

router = APIRouter(prefix="/proxy", tags=["Proxy"])
logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


async def _get_authorized_file(map_id: int, db: AsyncSession, auth_token: str = None, token: str = None):
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

    return file_path

@router.get("/file/{map_id}")
async def stream_file(
    map_id: int,
    token: str = Query(None, description="Bearer token for authentication"),
    mode: str = Query("inline", description="inline=view, attachment=download"),
    db: AsyncSession = Depends(get_db),
    auth_token: str = Depends(oauth2_scheme),
):
    file_path = await _get_authorized_file(map_id, db, auth_token=auth_token, token=token)
    
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

    if token and is_image:
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>{safe_name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        html, body {{ width: 100%; min-height: 100vh; background: #0f0f1a; }}
        body {{ display: flex; align-items: center; justify-content: center; padding: 40px; }}
        .wrap {{ width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }}
        img {{ max-width: 95vw; max-height: 95vh; width: auto; height: auto; object-fit: contain; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }}
    </style>
</head>
<body>
    <div class="wrap"><img id="preview-image" alt="{safe_name}" /></div>
    <script>
      (async function() {{
        const res = await fetch("/api/v1/proxy/raw/{map_id}?token={safe_token}");
        if (!res.ok) {{
          document.body.innerHTML = "<p style='color:#fff;padding:16px'>Failed to load image</p>";
          return;
        }}
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        document.getElementById("preview-image").src = url;
      }})();
    </script>
</body>
</html>
"""
        return HTMLResponse(content=html_content)

    if token and is_pdf:
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>{safe_name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        html, body {{ width: 100%; height: 100%; background: #111827; }}
        .pdf-wrap {{ width: 100vw; height: 100vh; }}
        iframe {{ width: 100%; height: 100%; border: 0; }}
    </style>
</head>
<body>
    <div class="pdf-wrap">
        <iframe id="pdf-frame" title="{safe_name}"></iframe>
    </div>
    <script>
      (async function() {{
        const res = await fetch("/api/v1/proxy/raw/{map_id}?token={safe_token}");
        if (!res.ok) {{
          document.body.innerHTML = "<p style='color:#fff;padding:16px'>Failed to load PDF</p>";
          return;
        }}
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        document.getElementById("pdf-frame").src = url;
      }})();
    </script>
</body>
</html>
"""
        return HTMLResponse(content=html_content)

    return FileResponse(path=file_path, media_type=media_type, headers={"Content-Disposition": "inline"})


@router.get("/preview/{map_id}")
async def preview_file(
    map_id: int,
    db: AsyncSession = Depends(get_db),
    auth_token: str = Depends(oauth2_scheme),
):
    """Return preview payload as JSON to avoid download-manager interception."""
    file_path = await _get_authorized_file(map_id, db, auth_token=auth_token)

    media_type = "application/pdf"
    suffix = file_path.suffix.lower()
    if suffix in [".jpeg", ".jpg"]:
        media_type = "image/jpeg"
    elif suffix == ".png":
        media_type = "image/png"

    file_bytes = file_path.read_bytes()
    data_b64 = base64.b64encode(file_bytes).decode("ascii")
    return {
        "media_type": media_type,
        "filename": file_path.name,
        "data_base64": data_b64,
    }


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
