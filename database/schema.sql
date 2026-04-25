-- Sentinel Map Archive System Schema
-- Targeted Database: GIS_Archiving

USE GIS_Archiving;
GO

-- 1. Categories Table
CREATE TABLE Categories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    prefix NVARCHAR(5) NOT NULL UNIQUE, -- e.g., 'AB'
    description NVARCHAR(MAX)
);
GO

-- 2. Projects Table
CREATE TABLE Projects (
    project_id INT IDENTITY(1,1) PRIMARY KEY,
    project_code NVARCHAR(50) NOT NULL UNIQUE,
    client_name NVARCHAR(200) NOT NULL,
    active BIT DEFAULT 1
);
GO

-- 3. Users Table
CREATE TABLE Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL UNIQUE,
    password_hash NVARCHAR(MAX) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'owner', 'analyst', 'readonly')),
    active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- 4. Maps (Main Archival Table)
CREATE TABLE Maps (
    map_id INT IDENTITY(1,1) PRIMARY KEY,
    unique_id NVARCHAR(20) NOT NULL UNIQUE, -- e.g., 'AB-0001'
    layout_name NVARCHAR(200) NOT NULL,
    project_path NVARCHAR(MAX) NOT NULL,
    project_code NVARCHAR(50) NOT NULL,
    client_name NVARCHAR(200) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    income_num NVARCHAR(50),
    outcome_num NVARCHAR(50),
    to_whom NVARCHAR(200),
    status NVARCHAR(20) NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Complete', 'On Hold')),
    comment NVARCHAR(MAX),
    file_path NVARCHAR(MAX) NOT NULL, -- UNC Path
    analyst_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME
);
GO

-- 5. Audit_Log Table
CREATE TABLE Audit_Log (
    audit_id INT IDENTITY(1,1) PRIMARY KEY,
    map_id INT NOT NULL, -- Logical link, no hard FK to allow deletion of map but keep audit if needed
    field_name NVARCHAR(50) NOT NULL,
    old_value NVARCHAR(MAX),
    new_value NVARCHAR(MAX),
    changed_by INT NOT NULL FOREIGN KEY REFERENCES Users(user_id),
    changed_at DATETIME DEFAULT GETDATE()
);
GO

-- 6. Sequence for Unique ID generation per Category
-- Note: Simplified global sequence for v1.0
CREATE SEQUENCE LayoutIDSequence
    START WITH 1
    INCREMENT BY 1;
GO

-- 7. Indexes for Performance
CREATE INDEX IX_Maps_UniqueID ON Maps(unique_id);
CREATE INDEX IX_Maps_ProjectCode ON Maps(project_code);
CREATE INDEX IX_Maps_AnalystID ON Maps(analyst_id);
CREATE INDEX IX_Maps_Status ON Maps(status);
CREATE INDEX IX_Audit_MapID ON Audit_Log(map_id);
GO
