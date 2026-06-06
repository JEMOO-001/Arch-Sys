USE GIS_Archiving;
GO

-- Role migration
UPDATE Users SET role = 'admin' WHERE role = 'owner';
UPDATE Users SET role = 'edit' WHERE role = 'analyst';
UPDATE Users SET role = 'edit' WHERE role = 'readonly';
GO

-- Normalize legacy map statuses
UPDATE Maps
SET status = 'In Progress'
WHERE status IN ('Not Started', 'On Hold') OR status IS NULL;
GO

-- Ensure tenant columns exist for code paths that filter by tenant_id
IF COL_LENGTH('Users', 'tenant_id') IS NULL
    ALTER TABLE Users ADD tenant_id INT NOT NULL CONSTRAINT DF_Users_TenantId DEFAULT 1;
IF COL_LENGTH('Categories', 'tenant_id') IS NULL
    ALTER TABLE Categories ADD tenant_id INT NOT NULL CONSTRAINT DF_Categories_TenantId DEFAULT 1;
IF COL_LENGTH('Projects', 'tenant_id') IS NULL
    ALTER TABLE Projects ADD tenant_id INT NOT NULL CONSTRAINT DF_Projects_TenantId DEFAULT 1;
IF COL_LENGTH('Maps', 'tenant_id') IS NULL
    ALTER TABLE Maps ADD tenant_id INT NOT NULL CONSTRAINT DF_Maps_TenantId DEFAULT 1;
IF COL_LENGTH('Audit_Log', 'tenant_id') IS NULL
    ALTER TABLE Audit_Log ADD tenant_id INT NOT NULL CONSTRAINT DF_AuditLog_TenantId DEFAULT 1;
GO

-- Add approval columns if missing
IF COL_LENGTH('Maps', 'approval_status') IS NULL
    ALTER TABLE Maps ADD approval_status NVARCHAR(30) NULL;
IF COL_LENGTH('Maps', 'approval_comment') IS NULL
    ALTER TABLE Maps ADD approval_comment NVARCHAR(MAX) NULL;
IF COL_LENGTH('Maps', 'approved_by') IS NULL
    ALTER TABLE Maps ADD approved_by INT NULL;
IF COL_LENGTH('Maps', 'approved_at') IS NULL
    ALTER TABLE Maps ADD approved_at DATETIME NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Maps_ApprovedBy_Users'
)
ALTER TABLE Maps ADD CONSTRAINT FK_Maps_ApprovedBy_Users
    FOREIGN KEY (approved_by) REFERENCES Users(user_id);
GO

-- Rebuild status constraint to new values
DECLARE @statusConstraint SYSNAME;
SELECT @statusConstraint = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.default_object_id = dc.object_id
JOIN sys.tables t ON t.object_id = c.object_id
WHERE t.name = 'Maps' AND c.name = 'status';

IF @statusConstraint IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Maps DROP CONSTRAINT ' + QUOTENAME(@statusConstraint));
END
GO

ALTER TABLE Maps ADD CONSTRAINT DF_Maps_Status DEFAULT 'In Progress' FOR status;
GO

DECLARE @checkConstraint SYSNAME;
SELECT @checkConstraint = cc.name
FROM sys.check_constraints cc
JOIN sys.tables t ON t.object_id = cc.parent_object_id
WHERE t.name = 'Maps' AND cc.definition LIKE '%status%';

IF @checkConstraint IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Maps DROP CONSTRAINT ' + QUOTENAME(@checkConstraint));
END
GO

ALTER TABLE Maps
ADD CONSTRAINT CK_Maps_Status CHECK (status IN ('In Progress', 'Complete'));
GO

-- Rebuild role constraint to admin/edit only
DECLARE @roleConstraint SYSNAME;
SELECT @roleConstraint = cc.name
FROM sys.check_constraints cc
JOIN sys.tables t ON t.object_id = cc.parent_object_id
WHERE t.name = 'Users' AND cc.definition LIKE '%role%';

IF @roleConstraint IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Users DROP CONSTRAINT ' + QUOTENAME(@roleConstraint));
END
GO

ALTER TABLE Users
ADD CONSTRAINT CK_Users_Role CHECK (role IN ('admin', 'edit'));
GO

-- Enforce approval status values when present
DECLARE @approvalConstraint SYSNAME;
SELECT @approvalConstraint = cc.name
FROM sys.check_constraints cc
JOIN sys.tables t ON t.object_id = cc.parent_object_id
WHERE t.name = 'Maps' AND cc.definition LIKE '%approval_status%';

IF @approvalConstraint IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Maps DROP CONSTRAINT ' + QUOTENAME(@approvalConstraint));
END
GO

ALTER TABLE Maps
ADD CONSTRAINT CK_Maps_ApprovalStatus
CHECK (approval_status IS NULL OR approval_status IN ('Approve', 'Editing Required', 'On Hold'));
GO

-- Create map comments table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Map_Comments' AND xtype='U')
CREATE TABLE Map_Comments (
    comment_id INT IDENTITY(1,1) PRIMARY KEY,
    map_id INT NOT NULL FOREIGN KEY REFERENCES Maps(map_id),
    user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id),
    message NVARCHAR(MAX) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME,
    deleted_at DATETIME,
    tenant_id INT NOT NULL DEFAULT 1
);
GO

IF COL_LENGTH('Map_Comments', 'tenant_id') IS NULL
    ALTER TABLE Map_Comments ADD tenant_id INT NOT NULL CONSTRAINT DF_MapComments_TenantId DEFAULT 1;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_MapComments_MapID')
CREATE INDEX IX_MapComments_MapID ON Map_Comments(map_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_MapComments_TenantID')
CREATE INDEX IX_MapComments_TenantID ON Map_Comments(tenant_id);
GO
