import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from ..database import get_db
from ..models.base import User
from ..schemas.auth import Token
from ..dependencies.auth import verify_password, create_access_token, settings
from ..middleware.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger(__name__)


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # ── 1. Load user ────────────────────────────────────────────────────────
    try:
        result = await db.execute(select(User).where(User.username == form_data.username))
        user = result.scalar_one_or_none()
    except Exception as exc:
        logger.exception("Database error during login for user '%s'", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error",
        ) from exc

    # ── 2. Verify credentials ────────────────────────────────────────────────
    # Always run verify_password (even when user is None) so that the response
    # time is identical for "unknown user" and "wrong password".  This prevents
    # a timing side-channel that lets an attacker enumerate valid usernames.
    dummy_hash = "$2b$12$8sH6YLYr7Pold4YYuZP1hODMWaKeccgtfWdUvAWfnlm7tDSbud.Ge"
    hash_to_check = user.password_hash if user else dummy_hash

    try:
        password_ok = verify_password(form_data.password, hash_to_check)
    except Exception:
        logger.exception("Password verification error for user '%s'", form_data.username)
        password_ok = False

    # Also reject inactive accounts AFTER the full hash check (same timing)
    valid = bool(user) and password_ok and user.active

    if not valid:
        # Generic message — never reveal whether the username exists
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── 3. Issue token ───────────────────────────────────────────────────────
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.user_id},
        expires_delta=access_token_expires,
    )

    return {"access_token": access_token, "token_type": "bearer"}
