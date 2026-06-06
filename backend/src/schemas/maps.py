from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime
import re

# Allowed status values — single source of truth
_STATUS_PATTERN    = r"^(In Progress|Complete)$"
_APPROVAL_PATTERN  = r"^(Approve|Editing Required|On Hold)$"

# Characters that are meaningless in a file-system path but useful for injection
_PATH_DANGEROUS_RE = re.compile(r"[<>|\"'\x00]")


def _validate_path(v: str) -> str:
    """
    Block path traversal and shell-injection characters in stored paths.
    We keep this intentionally strict:
      - No '..' segments (traversal).
      - No Unix absolute roots outside the expected share (starts with /).
      - No characters that are harmless in paths but dangerous elsewhere.
    """
    if ".." in v:
        raise ValueError("Path traversal sequence '..' is not allowed")
    if v.startswith("/etc") or v.startswith("/proc") or v.startswith("/sys"):
        raise ValueError("Absolute system paths are not allowed")
    if _PATH_DANGEROUS_RE.search(v):
        raise ValueError("Path contains invalid characters")
    return v


class MapBase(BaseModel):
    layout_name:      str           = Field(..., min_length=1, max_length=200)
    project_path:     str           = Field(..., min_length=1, max_length=500)
    project_name:     str           = Field(..., min_length=1, max_length=50)
    category:         str           = Field(..., min_length=1, max_length=100)
    income_num:       Optional[str] = Field(None, max_length=50)
    outcome_num:      Optional[str] = Field(None, max_length=50)
    to_whom:          Optional[str] = Field(None, max_length=200)
    status:           str           = Field(default="In Progress", pattern=_STATUS_PATTERN)
    comment:          Optional[str] = Field(None, max_length=1000)
    approval_status:  Optional[str] = Field(None, pattern=_APPROVAL_PATTERN)
    approval_comment: Optional[str] = Field(None, max_length=1000)
    file_path:        str           = Field(..., min_length=1, max_length=500)

    @field_validator("file_path", "project_path")
    @classmethod
    def validate_path(cls, v: str) -> str:
        return _validate_path(v)


class MapCreate(MapBase):
    category_prefix: str           = Field(..., min_length=2, max_length=5, pattern=r"^[A-Z]{2,5}$")
    unique_id:       Optional[str] = Field(None, pattern=r"^[A-Z]{2,5}-\d{4}$")


class MapUpdate(BaseModel):
    comment:     Optional[str] = Field(None, max_length=1000)
    income_num:  Optional[str] = Field(None, max_length=50)
    outcome_num: Optional[str] = Field(None, max_length=50)
    to_whom:     Optional[str] = Field(None, max_length=200)


class MapEditUpdate(BaseModel):
    comment:         Optional[str] = Field(None, max_length=1000)
    income_num:      Optional[str] = Field(None, max_length=50)
    outcome_num:     Optional[str] = Field(None, max_length=50)
    to_whom:         Optional[str] = Field(None, max_length=200)
    category:        Optional[str] = Field(None, max_length=100)
    category_prefix: Optional[str] = Field(None, max_length=5)
    file_path:       Optional[str] = Field(None, max_length=500)

    @field_validator("file_path")
    @classmethod
    def validate_path(cls, v: Optional[str]) -> Optional[str]:
        return _validate_path(v) if v else v


class MapResponse(MapBase):
    map_id:       int
    unique_id:    str
    analyst_id:   int
    analyst_name: Optional[str] = None
    approved_by:  Optional[int] = None
    approved_at:  Optional[datetime] = None
    tenant_id:    int = 1
    created_at:   datetime
    updated_at:   Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MapApprovalUpdate(BaseModel):
    approval_status:  str           = Field(..., pattern=_APPROVAL_PATTERN)
    approval_comment: Optional[str] = Field(None, max_length=1000)

    @model_validator(mode="after")
    def check_comment_required(self) -> "MapApprovalUpdate":
        status_val = self.approval_status
        comment_val = self.approval_comment or ""
        if status_val in ["Editing Required", "On Hold"] and not comment_val.strip():
            raise ValueError("Comment is required for Editing Required or On Hold decisions")
        return self


class MapCommentCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class MapCommentResponse(BaseModel):
    comment_id: int
    map_id:     int
    user_id:    int
    username:   Optional[str] = None
    message:    str
    attachment_path: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
