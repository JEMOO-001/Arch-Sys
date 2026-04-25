# Feature Specification: Sentinel Map Archive System

**Feature Branch**: `001-layout-monitoring`  
**Created**: 2026-04-21  
**Status**: Draft  
**Input**: PRD `Sentinel_PRD.md` - Enterprise-grade map archival and monitoring system.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Frictionless Arc GIS Pro Archiving (Priority: P1)

As a GIS Analyst, I want to archive my map layout with a single click in ArcGIS Pro so that it is automatically named, saved to the correct folder, and registered in the database.

**Why this priority**: Core value proposition. Eliminates manual work and ensures data consistency from the source.

**Independent Test**: Execute the "Archive Map" action in ArcGIS Pro, verify the file exists on the network path with the correct name (`XX-NNNN_...pdf`), and verify a corresponding record exists in SQL Server.

**Acceptance Scenarios**:

1. **Given** an open map layout, **When** the "Archive Map" button is clicked and metadata entered, **Then** the system assigns a unique ID and exports the file to the Year/Month/Day folder.
2. **Given** a successful export, **When** checking the database, **Then** the record contains the project code, client, and the exact UNC file path.

---

### User Story 2 - Role-Based Monitoring Dashboard (Priority: P1)

As a Manager (Owner), I want to view a dashboard of all archived maps so that I can monitor team output and project status in real-time.

**Why this priority**: Essential for the "Monitoring" goal. Provides visibility and management control.

**Independent Test**: Log into the dashboard as an 'Owner', perform a search by Project Code, and verify all records (including those by other analysts) are visible and editable.

**Acceptance Scenarios**:

1. **Given** a valid login, **When** searching for a specific Unique ID, **Then** the dashboard displays the map metadata and an inline view of the PDF/JPEG.
2. **Given** a Manager role, **When** viewing the dashboard, **Then** a "Status" change on any row is permitted and logged in the Audit history.

---

### User Story 3 - Secure File Access via Proxy (Priority: P2)

As an Analyst or Manager, I want to view the archived maps directly in the browser without needing direct access to the network server paths.

**Why this priority**: Security requirement. Protects the raw filesystem while allowing easy access.

**Independent Test**: Click "View" on a dashboard record and verify the file opens in the browser without exposing the `\\server\path` in the URL.

**Acceptance Scenarios**:

1. **Given** an archived record, **When** the view button is clicked, **Then** the Backend API streams the file content to the browser via the Proxy endpoint.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require authentication via a Login Page using SQL-stored credentials (Username/Password).
- **FR-002**: System MUST provide an ArcGIS Pro Add-in with a ribbon interface for archival.
- **FR-003**: System MUST automatically generate unique IDs in the format `XX-NNNN` (Category-based prefix).
- **FR-004**: System MUST enforce the file naming convention: `{UniqueID}_{ClientCode}_{ProjectCode}_{YYYYMMDD}.{ext}`.
- **FR-005**: System MUST organize archives in a time-based folder hierarchy: `\\server\archive\{YYYY}\{Month}\{DD}\{Category}\`.
- **FR-006**: System MUST capture an immutable **Audit Log** for every metadata change (Old Value, New Value, User, Time).
- **FR-007**: System MUST enforce Role-Based Access Control:
    - **Analyst**: Edit own records only.
    - **Owner/Admin**: Edit all records.
    - **Read-only**: View only.
- **FR-008**: System MUST provide a File Proxy to stream PDFs and JPEGs securely to the browser.
- **FR-009**: Dashboard MUST include a "Summary" view with total counts per day/month and output per analyst.
- **FR-010**: System MUST operate exclusively within the `GIS_Archiving` database; interaction with any other database on the instance is strictly prohibited.
- **FR-011**: Add-in MUST implement a **Zero-SDK UI pattern** (Standard WPF) for metadata entry to decouple UI stability from ArcGIS Pro internal state.
- **FR-012**: Add-in MUST perform a **Pre-Flight Heartbeat** check (API connectivity, Token validity, and UNC path write access) before allowing archival.
- **FR-013**: System MUST support **ArcGIS Pro 3.x+** (.NET 6/8) with backward-compatible service patterns.
- **FR-014**: Backend MUST ensure **Atomic Archival**: Database record creation and file movement must succeed together or rollback completely.
- **FR-015**: System MUST implement **Structured Logging** (JSON/Serilog) across all tiers for proactive error monitoring.

### Key Entities

- **MapRecord**: The central archive record (ID, Metadata, File Path, Status, Ownership).
- **AuditEntry**: Log of every change to a MapRecord.
- **User**: Application user with an assigned Role (Analyst, Owner, Admin, Read-only).
- **Category**: Defines the Unique ID prefix and folder organization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dashboard search response time < 200ms for datasets up to 10,000 records.
- **SC-002**: End-to-end archival process (Click -> Export -> Log) completed in < 5 seconds.
- **SC-003**: 100% of metadata changes successfully logged in the Audit table.
- **SC-004**: Zero unauthorized edit attempts (e.g., Analyst editing another's row) permitted by the API.
- **SC-005**: Zero "Orphaned Files" (files on disk without DB records) or "Ghost Records" (DB records without files) due to Atomic Rollback.
- **SC-006**: 100% Pre-Flight coverage: No archival attempt allowed if Backend or UNC path is unreachable.

## Assumptions

- **A-001**: Users have write access to the static network path via the ArcGIS Pro tool and the Dashboard server has read access to the same path.
- **A-002**: SQL Server Enterprise is pre-configured and accessible via the local network.
- **A-003**: The system will be accessed via modern web browsers (Chrome/Edge/Firefox).
- **A-004**: The project uses a monorepo structure for Add-in, Backend, and Frontend.
