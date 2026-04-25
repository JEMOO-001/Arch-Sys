# Data Model: Layout Monitoring & Archiving System

## Tables

### 1. Users
Stores application-level identities and roles.
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `UserID` | INT | PK, Identity | Unique internal ID |
| `Username` | NVARCHAR(50)| Unique, Not Null | Login name |
| `PasswordHash`| NVARCHAR(MAX)| Not Null | BCrypt/Argon2 hash |
| `FullName` | NVARCHAR(100)| Not Null | Display name |
| `Role` | NVARCHAR(20)| Not Null | 'User' or 'Owner' |

### 2. LayoutRecords
The primary record for every archived layout.
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `RecordID` | INT | PK, Identity | Internal primary key |
| `UniqueID` | NVARCHAR(10)| Unique, Not Null | Formatted 'AB-####' |
| `LayoutName` | NVARCHAR(200)| Not Null | Name from ArcGIS Pro |
| `ProjectPath` | NVARCHAR(MAX)| Not Null | Local .aprx path |
| `IncomeNum` | NVARCHAR(50)| Nullable | Manual entry |
| `OutcomeNum` | NVARCHAR(50)| Nullable | Manual entry |
| `ToWhom` | NVARCHAR(200)| Nullable | Manual entry |
| `Status` | NVARCHAR(20)| Not Null | Not Started, In Progress, Complete |
| `Comment` | NVARCHAR(MAX)| Nullable | Manual entry |
| `CreatedBy` | INT | FK -> Users | Owner of the record |
| `CreatedAt` | DATETIME | Default: Now | Archive timestamp |
| `UpdatedBy` | INT | FK -> Users | Last editor |
| `UpdatedAt` | DATETIME | Nullable | Modification timestamp |

### 3. MediaAttachments
Links to the exported PDF/JPEG files.
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `MediaID` | INT | PK, Identity | |
| `RecordID` | INT | FK -> Records| Associated record |
| `FilePath` | NVARCHAR(MAX)| Not Null | Full network path |
| `FileType` | NVARCHAR(10)| Not Null | 'PDF', 'JPEG', etc. |

### 4. AuditLogs
Tracks the history of status and metadata changes.
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `LogID` | INT | PK, Identity | |
| `RecordID` | INT | FK -> Records| |
| `UserID` | INT | FK -> Users | Who made the change |
| `Action` | NVARCHAR(MAX)| Not Null | "Status changed to Complete" |
| `Timestamp` | DATETIME | Default: Now | |

## Relationships
- **One-to-Many**: `Users` -> `LayoutRecords` (Creator)
- **One-to-Many**: `LayoutRecords` -> `MediaAttachments` (Multiple file formats per export)
- **One-to-Many**: `LayoutRecords` -> `AuditLogs` (Full history per record)
