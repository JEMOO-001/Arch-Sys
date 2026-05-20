from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
from html import escape
import logging
import base64
import os

from ..database import get_db
from ..models.maps import Map
from ..dependencies.auth import verify_token
from ..core.config import settings

router = APIRouter(prefix="/proxy", tags=["Proxy"])
logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

# ── Security constants ──────────────────────────────────────────────────────
_ALLOWED_SUFFIXES = {".pdf", ".jpg", ".jpeg", ".png"}
_SUFFIX_TO_MEDIA = {
    ".pdf":  "application/pdf",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
}

def _safe_media_type(path: Path) -> str:
    mt = _SUFFIX_TO_MEDIA.get(path.suffix.lower())
    if mt is None:
        raise HTTPException(status_code=415, detail="File type not supported")
    return mt


def _resolve_safe(file_path_str: str) -> Path:
    """
    Resolve the stored file_path and verify:
      1. It is inside ARCHIVE_ROOT_PATH  (blocks path-traversal / arbitrary read).
      2. It has an allowed extension.
      3. It is not a symlink escaping the root.
    """
    archive_root = Path(settings.ARCHIVE_ROOT_PATH).resolve()
    candidate = Path(file_path_str).resolve()

    try:
        candidate.relative_to(archive_root)
    except ValueError:
        logger.warning("Path traversal attempt blocked: %s", file_path_str)
        raise HTTPException(status_code=403, detail="Access denied")

    if candidate.suffix.lower() not in _ALLOWED_SUFFIXES:
        raise HTTPException(status_code=415, detail="File type not supported")

    if os.path.islink(file_path_str):
        logger.warning("Symlink access blocked: %s", file_path_str)
        raise HTTPException(status_code=403, detail="Access denied")

    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="File not found on server")

    return candidate


async def _get_authorized_file(
    map_id: int,
    db: AsyncSession,
    auth_token: str | None = None,
    token: str | None = None,
) -> Path:
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

    return _resolve_safe(db_map.file_path)


_FILE_SEC_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'",
    "Cache-Control": "no-store",
}


@router.get("/file/{map_id}")
async def stream_file(
    map_id: int,
    token: str = Query(None, description="Bearer token (iframe use only)"),
    mode: str = Query("inline", pattern=r"^(inline|attachment)$"),
    db: AsyncSession = Depends(get_db),
    auth_token: str = Depends(oauth2_scheme),
):
    file_path = await _get_authorized_file(map_id, db, auth_token=auth_token, token=token)
    media_type = _safe_media_type(file_path)
    safe_name = escape(file_path.name)

    if mode == "attachment":
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=file_path.name,
            headers={"Content-Disposition": f'attachment; filename="{safe_name}"', **_FILE_SEC_HEADERS},
        )

    is_image = media_type.startswith("image/")
    is_pdf   = media_type == "application/pdf"

    if token and (is_image or is_pdf):
        safe_token = escape(token)
        raw_url = f"/api/v1/proxy/raw/{map_id}"

        if is_image:
            html_content = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{safe_name}</title>
<style>*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:100%;min-height:100vh;background:#0f0f1a;display:flex;align-items:center;justify-content:center}}
img{{max-width:95vw;max-height:95vh;object-fit:contain;box-shadow:0 8px 32px rgba(0,0,0,.5)}}</style>
</head><body><img id="img" alt="{safe_name}">
<script>(async()=>{{
  const r=await fetch("{raw_url}",{{headers:{{Authorization:"Bearer {safe_token}"}}}});
  if(!r.ok){{document.body.textContent="Failed to load";return;}}
  document.getElementById("img").src=URL.createObjectURL(await r.blob());
}})();</script></body></html>"""
        else:
            html_content = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{safe_name}</title>
<style>*{{margin:0;padding:0;box-sizing:border-box}}html,body,iframe{{width:100%;height:100%;border:0;background:#111827}}</style>
</head><body><iframe id="pdf" title="{safe_name}"></iframe>
<script>(async()=>{{
  const r=await fetch("{raw_url}",{{headers:{{Authorization:"Bearer {safe_token}"}}}});
  if(!r.ok){{document.body.textContent="Failed to load";return;}}
  document.getElementById("pdf").src=URL.createObjectURL(await r.blob());
}})();</script></body></html>"""

        return HTMLResponse(content=html_content)

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers={"Content-Disposition": "inline", **_FILE_SEC_HEADERS},
    )


@router.get("/preview/{map_id}")
async def preview_file(
    map_id: int,
    db: AsyncSession = Depends(get_db),
    auth_token: str = Depends(oauth2_scheme),
):
    """Return file as base64 JSON."""
    file_path = await _get_authorized_file(map_id, db, auth_token=auth_token)
    media_type = _safe_media_type(file_path)

    size = file_path.stat().st_size
    if size > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large for preview")

    data_b64 = base64.b64encode(file_path.read_bytes()).decode("ascii")
    return {"media_type": media_type, "filename": file_path.name, "data_base64": data_b64}


@router.get("/raw/{map_id}")
async def raw_file(
    map_id: int,
    db: AsyncSession = Depends(get_db),
    # Raw endpoint uses Authorization header only — no query-string token
    auth_token: str = Depends(oauth2_scheme),
):
    """Raw file stream for JS fetch -> blob URL embedding."""
    file_path = await _get_authorized_file(map_id, db, auth_token=auth_token)
    media_type = _safe_media_type(file_path)
    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers={"Content-Disposition": "inline", **_FILE_SEC_HEADERS},
    )
