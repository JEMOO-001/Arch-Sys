from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from datetime import datetime
import re

class UserBase(BaseModel):
    username:  str  = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    full_name: str  = Field(..., min_length=1, max_length=100)
    role:      str  = Field(..., pattern=r"^(admin|edit)$")
    active:    bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Password must contain at least one special character")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    role:      Optional[str] = Field(None, pattern=r"^(admin|edit)$")
    active:    Optional[bool] = None
    password:  Optional[str] = Field(None, min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Password must contain at least one special character")
        return v


class UserResponse(UserBase):
    user_id:    int
    tenant_id:  int = 1
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type:   str


class TokenData(BaseModel):
    username: Optional[str] = None
    role:     Optional[str] = None
    user_id:  Optional[int] = None
