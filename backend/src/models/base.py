from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timedelta

Base = declarative_base()

class User(Base):
    __tablename__ = "Users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    active = Column(Boolean, default=True)
    tenant_id = Column(Integer, nullable=False, index=True, default=1)
    created_at = Column(DateTime)

    # Relationships
    maps = relationship("Map", back_populates="analyst")

class Category(Base):
    __tablename__ = "Categories"

    category_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    prefix = Column(String(5), unique=True, nullable=False)
    description = Column(String)
    tenant_id = Column(Integer, nullable=False, index=True, default=1)

class Project(Base):
    __tablename__ = "Projects"

    project_id = Column(Integer, primary_key=True, index=True)
    project_code = Column(String(50), unique=True, nullable=False)
    client_name = Column(String(200), nullable=False)
    active = Column(Boolean, default=True)
    tenant_id = Column(Integer, nullable=False, index=True, default=1)
