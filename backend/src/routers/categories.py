from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models.base import Category
from ..dependencies.auth import get_current_user, TokenData
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/categories", tags=["Categories"])

class CategoryResponse(BaseModel):
    category_id: int
    name: str
    prefix: str
    description: str | None = None

@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    result = await db.execute(select(Category))
    categories = result.scalars().all()
    return [
        CategoryResponse(
            category_id=c.category_id,
            name=c.name,
            prefix=c.prefix,
            description=c.description
        )
        for c in categories
    ]
