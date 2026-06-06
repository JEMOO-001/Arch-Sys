from pydantic import BaseModel, Field
from typing import Optional


class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    reply: str
    data: Optional[list[dict]] = None
