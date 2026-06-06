import logging
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies.auth import get_current_user, TokenData
from ..middleware.limiter import limiter
from ..schemas.chat import ChatMessage, ChatResponse
from ..services.chat import chat as chat_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["AI Chat"])


@router.post("/", response_model=ChatResponse)
@limiter.limit("20/minute")
async def chat_endpoint(
    request: Request,
    body: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Send a message to Sentinel AI and get a response based on archived map data."""
    logger.info(
        "Chat request from user=%s (id=%s): %s",
        current_user.username,
        current_user.user_id,
        body.message[:80],
    )
    result = await chat_service(body.message, db, tenant_id=current_user.tenant_id)
    return ChatResponse(**result)
