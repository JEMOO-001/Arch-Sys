#!/usr/bin/env python3
"""
Database initialization script.
Creates tables and seeds initial admin user.
"""
import asyncio
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from src.core.config import settings
from src.dependencies.auth import get_password_hash

async def init_database():
    """Initialize database with tables and seed data."""
    # Create async engine
    engine = create_async_engine(
        settings.DATABASE_URL.replace("pyodbc", "aioodbc"),
        echo=True,
    )

    async with engine.begin() as conn:
        # Check if tables exist
        print("Checking database connection...")
        try:
            result = await conn.execute(text("SELECT 1"))
            print("✓ Database connection successful")
        except Exception as e:
            print(f"✗ Database connection failed: {e}")
            return False

        # Create tables (if they don't exist)
        print("\nCreating tables...")

        # Users table
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
            CREATE TABLE Users (
                user_id INT IDENTITY(1,1) PRIMARY KEY,
                username NVARCHAR(50) NOT NULL UNIQUE,
                password_hash NVARCHAR(MAX) NOT NULL,
                full_name NVARCHAR(100) NOT NULL,
                role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'edit')),
                active BIT DEFAULT 1,
                created_at DATETIME DEFAULT GETDATE(),
                tenant_id INT NOT NULL DEFAULT 1
            )
        """))
        print("  ✓ Users table")

        # Categories table
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Categories' AND xtype='U')
            CREATE TABLE Categories (
                category_id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(100) NOT NULL UNIQUE,
                prefix NVARCHAR(5) NOT NULL UNIQUE,
                description NVARCHAR(MAX),
                tenant_id INT NOT NULL DEFAULT 1
            )
        """))
        print("  ✓ Categories table")

        # Projects table
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Projects' AND xtype='U')
            CREATE TABLE Projects (
                project_id INT IDENTITY(1,1) PRIMARY KEY,
                project_code NVARCHAR(50) NOT NULL UNIQUE,
                client_name NVARCHAR(200) NOT NULL,
                active BIT DEFAULT 1,
                tenant_id INT NOT NULL DEFAULT 1
            )
        """))
        print("  ✓ Projects table")

        # Maps table
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Maps' AND xtype='U')
            CREATE TABLE Maps (
                map_id INT IDENTITY(1,1) PRIMARY KEY,
                unique_id NVARCHAR(20) NOT NULL UNIQUE,
                layout_name NVARCHAR(200) NOT NULL,
                project_path NVARCHAR(MAX) NOT NULL,
                project_name NVARCHAR(50) NOT NULL,
                category NVARCHAR(100) NOT NULL,
                income_num NVARCHAR(50),
                outcome_num NVARCHAR(50),
                to_whom NVARCHAR(200),
                status NVARCHAR(20) NOT NULL DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Complete')),
                comment NVARCHAR(MAX),
                approval_status NVARCHAR(30) CHECK (approval_status IS NULL OR approval_status IN ('Approve', 'Editing Required', 'On Hold')),
                approval_comment NVARCHAR(MAX),
                approved_by INT FOREIGN KEY REFERENCES Users(user_id),
                approved_at DATETIME,
                file_path NVARCHAR(MAX) NOT NULL,
                analyst_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id),
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME,
                tenant_id INT NOT NULL DEFAULT 1
            )
        """))
        print("  ✓ Maps table")

        # Audit_Log table
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Audit_Log' AND xtype='U')
            CREATE TABLE Audit_Log (
                audit_id INT IDENTITY(1,1) PRIMARY KEY,
                map_id INT NOT NULL,
                field_name NVARCHAR(50) NOT NULL,
                old_value NVARCHAR(MAX),
                new_value NVARCHAR(MAX),
                changed_by INT NOT NULL FOREIGN KEY REFERENCES Users(user_id),
                changed_at DATETIME DEFAULT GETDATE(),
                tenant_id INT NOT NULL DEFAULT 1
            )
        """))
        print("  ✓ Audit_Log table")

        # Map_Comments table
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Map_Comments' AND xtype='U')
            CREATE TABLE Map_Comments (
                comment_id INT IDENTITY(1,1) PRIMARY KEY,
                map_id INT NOT NULL FOREIGN KEY REFERENCES Maps(map_id),
                user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id),
                message NVARCHAR(MAX) NOT NULL,
                attachment_path NVARCHAR(MAX) NULL,
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME,
                deleted_at DATETIME,
                tenant_id INT NOT NULL DEFAULT 1
            )
        """))
        print("  ✓ Map_Comments table")

        # Notifications table
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notifications' AND xtype='U')
            CREATE TABLE notifications (
                id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id),
                map_id INT NOT NULL FOREIGN KEY REFERENCES Maps(map_id),
                type VARCHAR(50) NOT NULL,
                message NVARCHAR(MAX) NOT NULL,
                is_read BIT DEFAULT 0,
                created_at DATETIME2 DEFAULT GETDATE(),
                tenant_id INT NOT NULL DEFAULT 1
            )
        """))
        print("  ✓ Notifications table")

        # Create indexes
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Maps_UniqueID')
            CREATE INDEX IX_Maps_UniqueID ON Maps(unique_id)
        """))
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Maps_ProjectName')
            CREATE INDEX IX_Maps_ProjectName ON Maps(project_name)
        """))
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Maps_AnalystID')
            CREATE INDEX IX_Maps_AnalystID ON Maps(analyst_id)
        """))
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Maps_Status')
            CREATE INDEX IX_Maps_Status ON Maps(status)
        """))
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Maps_TenantID')
            CREATE INDEX IX_Maps_TenantID ON Maps(tenant_id)
        """))
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Audit_MapID')
            CREATE INDEX IX_Audit_MapID ON Audit_Log(map_id)
        """))
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_MapComments_MapID')
            CREATE INDEX IX_MapComments_MapID ON Map_Comments(map_id)
        """))
        print("  ✓ Indexes created")

        # Create Sequence for ID generation
        await conn.execute(text("""
            IF NOT EXISTS (SELECT * FROM sys.sequences WHERE name='LayoutIDSequence')
            CREATE SEQUENCE LayoutIDSequence START WITH 1 INCREMENT BY 1
        """))
        print("  ✓ LayoutIDSequence created")

        # Seed Categories
        print("\nSeeding categories...")
        categories = [
            ('General', 'GN', 'General purpose maps'),
            ('Topographic', 'TP', 'Topographic maps'),
            ('Satellite', 'ST', 'Satellite imagery'),
            ('Administrative', 'AD', 'Administrative maps'),
        ]
        for name, prefix, desc in categories:
            await conn.execute(text("""
                IF NOT EXISTS (SELECT 1 FROM Categories WHERE prefix = :prefix)
                INSERT INTO Categories (name, prefix, description, tenant_id) VALUES (:name, :prefix, :desc, 1)
            """), {"name": name, "prefix": prefix, "desc": desc})
        print("  ✓ Categories seeded")

        # Seed admin user
        print("\nSeeding admin user...")
        admin_password = "admin123"
        admin_hash = get_password_hash(admin_password)

        await conn.execute(text("""
            IF NOT EXISTS (SELECT 1 FROM Users WHERE username = :username)
            INSERT INTO Users (username, password_hash, full_name, role, active, tenant_id)
            VALUES (:username, :hash, :full_name, :role, 1, 1)
        """), {"username": "admin", "hash": admin_hash, "full_name": "System Administrator", "role": "admin"})
        print("  ✓ Admin user created")
        print(f"     Username: admin")
        print(f"     Password: {admin_password}")

        # Seed test edit user
        edit_password = "edit123"
        edit_hash = get_password_hash(edit_password)

        await conn.execute(text("""
            IF NOT EXISTS (SELECT 1 FROM Users WHERE username = :username)
            INSERT INTO Users (username, password_hash, full_name, role, active, tenant_id)
            VALUES (:username, :hash, :full_name, :role, 1, 1)
        """), {"username": "edit", "hash": edit_hash, "full_name": "Test Edit User", "role": "edit"})
        print("  ✓ Edit user created")
        print(f"     Username: edit")
        print(f"     Password: {edit_password}")

        # Seed a test project
        await conn.execute(text("""
            IF NOT EXISTS (SELECT 1 FROM Projects WHERE project_code = 'TEST001')
            INSERT INTO Projects (project_code, client_name, active, tenant_id)
            VALUES ('TEST001', 'Test Client', 1, 1)
        """))
        print("  ✓ Test project created")

    await engine.dispose()
    print("\n✅ Database initialized successfully!")
    return True

if __name__ == "__main__":
    print("=" * 60)
    print(" Sentinel Map Archive System - Database Initialization")
    print("=" * 60)
    result = asyncio.run(init_database())
    sys.exit(0 if result else 1)
