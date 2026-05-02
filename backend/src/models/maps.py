from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from .base import Base

class Map(Base):
    __tablename__ = "Maps"

    map_id = Column(Integer, primary_key=True, index=True)
    unique_id = Column(String(20), unique=True, nullable=False, index=True)
    layout_name = Column(String(200), nullable=False)
    project_path = Column(Text, nullable=False)
    project_name = Column(String(50), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    income_num = Column(String(50))
    outcome_num = Column(String(50))
    to_whom = Column(String(200))
    status = Column(String(20), nullable=False, default="Not Started")
    comment = Column(Text)
    file_path = Column(Text, nullable=False)
    analyst_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False, index=True)
    tenant_id = Column(Integer, nullable=False, index=True, default=1)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    # Relationships
    analyst = relationship("User", back_populates="maps")

class AuditLog(Base):
    __tablename__ = "Audit_Log"

    audit_id = Column(Integer, primary_key=True, index=True)
    map_id = Column(Integer, nullable=False, index=True)
    field_name = Column(String(50), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    changed_by = Column(Integer, ForeignKey("Users.user_id"), nullable=False)
    changed_at = Column(DateTime)
    tenant_id = Column(Integer, nullable=False, index=True, default=1)
