import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from ..core.config import settings

# bcrypt ≥ 4.x changed its internal API; passlib 1.7.x calls the old one and
# raises AttributeError / ValueError at verify() time even for valid passwords.
# Using sha256_crypt as the new default and keeping bcrypt only for READING
# existing hashes avoids the breakage while staying backward-compatible.
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    deprecated="auto",              # mark deprecated schemes so new hashes use pbkdf2
    pbkdf2_sha256__rounds=260000,
    bcrypt__rounds=12,              # keep cost factor explicit
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None
    tenant_id: Optional[int] = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=15))
    to_encode.update({
        "exp": expire,
        "iat": now,
        "jti": str(uuid.uuid4()),
        "type": "access",
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        user_id: int = payload.get("user_id")
        tenant_id: int = payload.get("tenant_id", 1)
        if username is None:
            raise credentials_exception
        return TokenData(username=username, role=role, user_id=user_id, tenant_id=tenant_id)
    except JWTError:
        raise credentials_exception

def require_role(allowed_roles: list[str]):
    async def role_checker(current_user: TokenData = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this role",
            )
        return current_user
    return role_checker

def verify_token(token: str) -> Optional[TokenData]:
    """Verify token directly without FastAPI Depends - for query param auth."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        user_id: int = payload.get("user_id")
        tenant_id: int = payload.get("tenant_id", 1)
        if username is None:
            return None
        return TokenData(username=username, role=role, user_id=user_id, tenant_id=tenant_id)
    except JWTError:
        return None
