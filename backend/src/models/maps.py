from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
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
    status = Column(String(20), nullable=False, default="In Progress")
    comment = Column(Text)
    approval_status = Column(String(30))
    approval_comment = Column(Text)
    approved_by = Column(Integer, ForeignKey("Users.user_id"))
    approved_at = Column(DateTime)
    file_path = Column(Text, nullable=False)
    analyst_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False, index=True)
    tenant_id = Column(Integer, nullable=False, index=True, default=1)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    # Two separate relationships — each pinned to its own FK column via primaryjoin
    analyst = relationship(
        "User",
        primaryjoin="Map.analyst_id == User.user_id",
        foreign_keys=[analyst_id],
        back_populates="maps",
    )
    approver = relationship(
        "User",
        primaryjoin="Map.approved_by == User.user_id",
        foreign_keys=[approved_by],
        back_populates="approved_maps",
    )

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

class MapComment(Base):
    __tablename__ = "Map_Comments"

    comment_id = Column(Integer, primary_key=True, index=True)
    map_id = Column(Integer, ForeignKey("Maps.map_id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    attachment_path = Column(Text, nullable=True)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    deleted_at = Column(DateTime)
    tenant_id = Column(Integer, nullable=False, index=True, default=1)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False, index=True)
    map_id = Column(Integer, ForeignKey("Maps.map_id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime)
    tenant_id = Column(Integer, nullable=False, index=True, default=1)
