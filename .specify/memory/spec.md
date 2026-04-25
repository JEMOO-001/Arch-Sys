# Feature Specification: GIS Archiving System Baseline

**Feature Branch**: `001-baseline-implementation`  
**Created**: 2026-04-20  
**Status**: Draft  
**Input**: User description: "Enterprise GIS archiving tool for ArcGIS Pro using SQL Server, MAC address detection, AB- format IDs, and a web dashboard."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arc GIS Pro Archiving Workflow (Priority: P1)

As a GIS Analyst, I want to export my current map to a PDF and automatically log its metadata so that I can maintain a historical record of my work without manual data entry.

**Why this priority**: This is the core data-entry mechanism and the foundation of the archiving system.

**Independent Test**: Can be tested by running the ArcGIS Pro tool, verifying a PDF is created in the network path, and checking the SQL Server for a new record with a correctly formatted 'AB-' ID.

**Acceptance Scenarios**:

1. **Given** a workstation with a registered MAC address, **When** the archiving tool is executed in ArcGIS Pro, **Then** a PDF is saved to the network path and a metadata record is created in SQL Server.
2. **Given** a workstation with an unregistered MAC address, **When** the tool is executed, **Then** the operation is blocked with a security warning.

---

### User Story 2 - Automated ID Generation (Priority: P1)

As a System Administrator, I want the system to automatically assign unique IDs in the 'AB-####' format so that every archive is consistently identified.

**Why this priority**: Consistency in ID formatting is non-negotiable for system-wide tracking and lookup.

**Independent Test**: Create multiple archives in sequence and verify the IDs follow the auto-incrementing pattern (AB-001, AB-002, etc.).

**Acceptance Scenarios**:

1. **Given** the last ID was 'AB-100', **When** a new archive is created, **Then** the new ID MUST be 'AB-101'.

---

### User Story 3 - Web Dashboard Viewer (Priority: P2)

As a Manager, I want to log into a web dashboard and search for archived documents by their 'AB-' ID or category so that I can quickly retrieve historical map data.

**Why this priority**: Provides the primary interface for data consumption and validation of the archiving process.

**Independent Test**: Log into the web dashboard and perform a search for a known 'AB-' ID, verifying the correct metadata and PDF link are displayed.

**Acceptance Scenarios**:

1. **Given** a valid login, **When** searching for 'AB-001', **Then** the dashboard displays the metadata and a link to the PDF on the network path.
2. **Given** a user with 'Category A' permissions, **When** viewing the dashboard, **Then** they only see records associated with 'Category A'.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect the workstation's MAC address and validate it against an authorized list before allowing any archiving operation.
- **FR-002**: ArcGIS Pro Add-in MUST export the current layout/map as a PDF to a static network path.
- **FR-003**: System MUST generate a unique ID using the format 'AB-' + auto-incrementing integer for every new archive.
- **FR-004**: Metadata (including ID, Date, MAC Address, Category, and File Path) MUST be persisted in a SQL Server Enterprise database.
- **FR-005**: Web Dashboard MUST provide a secure login and enforce category-based access control (CBAC).
- **FR-006**: System MUST support categorizing archives during the export process in ArcGIS Pro.

### Key Entities

- **ArchiveRecord**: Represents a single archived map. Attributes: `InternalID` (AB- format), `Timestamp`, `MACAddress`, `Category`, `NetworkPath`, `UserIdentifier`.
- **AuthorizedWorkstation**: Represents a machine permitted to archive. Attributes: `MACAddress`, `MachineName`, `Status`.
- **UserPermission**: Maps users to accessible categories. Attributes: `UserID`, `AllowedCategory`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Successful end-to-end archiving (Export -> Log -> Dashboard View) takes less than 30 seconds for a standard map layout.
- **SC-002**: 100% of archived records follow the 'AB-####' ID format without duplicates.
- **SC-003**: Unauthorized MAC addresses are blocked from archiving with 100% accuracy.
- **SC-004**: Users are unable to view metadata or files for categories they are not permitted to access.

## Assumptions

- **A-001**: The SQL Server Enterprise instance is pre-configured and accessible over the internal network.
- **A-002**: The network path for PDF storage is a static, high-availability share with appropriate write permissions for the ArcGIS Pro tool.
- **A-003**: ArcGIS Pro SDK (C# .NET) will be used for the Add-in development.
- **A-004**: The Web Dashboard will be built using a standard web framework (e.g., React or ASP.NET Core) compatible with enterprise security standards.
- **A-005**: MAC address detection is reliable within the target network environment (e.g., no MAC spoofing or complex virtualization that obscures physical MACs).
