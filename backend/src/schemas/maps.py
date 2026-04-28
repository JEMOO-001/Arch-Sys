from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class MapBase(BaseModel):
    layout_name: str
    project_path: str
    project_name: str
    category: str
    income_num: Optional[str] = None
    outcome_num: Optional[str] = None
    to_whom: Optional[str] = None
    status: str = "Not Started"
    comment: Optional[str] = None
    file_path: str

class MapCreate(MapBase):
    category_prefix: str
    unique_id: Optional[str] = None

class MapUpdate(BaseModel):
    status: Optional[str] = None
    comment: Optional[str] = None
    income_num: Optional[str] = None
    outcome_num: Optional[str] = None
    to_whom: Optional[str] = None

class MapEditUpdate(BaseModel):
    status: Optional[str] = None
    comment: Optional[str] = None
    income_num: Optional[str] = None
    outcome_num: Optional[str] = None
    to_whom: Optional[str] = None
    category: Optional[str] = None
    category_prefix: Optional[str] = None

class MapResponse(MapBase):
    map_id: int
    unique_id: str
    analyst_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
