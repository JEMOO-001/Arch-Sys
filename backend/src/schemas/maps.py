from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from datetime import datetime
import re

class MapBase(BaseModel):
    layout_name: str = Field(..., min_length=1, max_length=200)
    project_path: str = Field(..., min_length=1, max_length=500)
    project_name: str = Field(..., min_length=1, max_length=50)
    category: str = Field(..., min_length=1, max_length=100)
    income_num: Optional[str] = Field(None, max_length=50)
    outcome_num: Optional[str] = Field(None, max_length=50)
    to_whom: Optional[str] = Field(None, max_length=200)
    status: str = Field(default="Not Started", pattern=r'^(Not Started|In Progress|Complete|On Hold)$')
    comment: Optional[str] = Field(None, max_length=1000)
    file_path: str = Field(..., min_length=1, max_length=500)
    
    @field_validator('file_path', 'project_path')
    @classmethod
    def validate_path(cls, v: str) -> str:
        if '..' in v or v.startswith('/etc') or v.startswith('/proc'):
            raise ValueError('Invalid file path')
        return v

class MapCreate(MapBase):
    category_prefix: str = Field(..., min_length=2, max_length=5, pattern=r'^[A-Z]{2,5}$')
    unique_id: Optional[str] = Field(None, pattern=r'^[A-Z]{2,5}-\d{4}$')

class MapUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern=r'^(Not Started|In Progress|Complete|On Hold)$')
    comment: Optional[str] = Field(None, max_length=1000)
    income_num: Optional[str] = Field(None, max_length=50)
    outcome_num: Optional[str] = Field(None, max_length=50)
    to_whom: Optional[str] = Field(None, max_length=200)

class MapEditUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern=r'^(Not Started|In Progress|Complete|On Hold)$')
    comment: Optional[str] = Field(None, max_length=1000)
    income_num: Optional[str] = Field(None, max_length=50)
    outcome_num: Optional[str] = Field(None, max_length=50)
    to_whom: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    category_prefix: Optional[str] = Field(None, max_length=5)
    file_path: Optional[str] = Field(None, max_length=500)
    
    @field_validator('file_path')
    @classmethod
    def validate_path(cls, v: Optional[str]) -> Optional[str]:
        if v and ('..' in v or v.startswith('/etc') or v.startswith('/proc')):
            raise ValueError('Invalid file path')
        return v

class MapResponse(MapBase):
    map_id: int
    unique_id: str
    analyst_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
