from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from ..models.base import User
from ..schemas.auth import UserCreate, UserResponse, UserUpdate
from ..dependencies.auth import require_role, get_current_user, get_password_hash, TokenData
# This assumes we have a get_db dependency. I will create it in a separate file.
from ..database import get_db

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(
            User.username == current_user.username,
            User.tenant_id == current_user.tenant_id
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin"])),
):
    """List users in the current tenant (paginated). Max 200 per request."""
    result = await db.execute(
        select(User)
        .where(User.tenant_id == current_user.tenant_id)
        .offset(skip)
        .limit(min(limit, 200))
    )
    return result.scalars().all()

@router.post("/", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin"]))
):
    existing_user = await db.execute(
        select(User).where(
            User.username == user_in.username,
            User.tenant_id == current_user.tenant_id
        )
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists in this tenant")

    db_user = User(
        username=user_in.username,
        full_name=user_in.full_name,
        role=user_in.role,
        active=user_in.active,
        tenant_id=current_user.tenant_id,
        password_hash=get_password_hash(user_in.password),
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin"]))
):
    result = await db.execute(
        select(User).where(
            User.user_id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)
    update_data.pop("tenant_id", None)

    if "password" in update_data:
        db_user.password_hash = get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(db_user, field, value)

    await db.commit()
    await db.refresh(db_user)
    return db_user
