import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from ..database import get_db
from ..models.base import User
from ..schemas.auth import Token
from ..dependencies.auth import verify_password, create_access_token, settings
from ..middleware.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login")
@limiter.limit("5/minute")
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    # 1. Find user
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Create token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.user_id},
        expires_delta=access_token_expires
    )
    
    # 3. Return token in body (for addin) AND set HttpOnly cookie (for frontend)
    response = JSONResponse({
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Login successful"
    })
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return response

@router.post("/logout")
async def logout():
    response = JSONResponse({"message": "Logout successful"})
    response.delete_cookie(key="access_token")
    return response

@router.get("/csrf-token")
@limiter.limit("10/minute")
async def get_csrf_token(request: Request):
    """Generate a secure CSRF token and store in session."""
    # Require authentication cookie
    if "access_token" not in request.cookies:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = secrets.token_urlsafe(32)
    request.session["csrf_token"] = token
    return {"csrf_token": token}
