<!--
Sync Impact Report
Version change: 1.0.0 → 1.1.0
List of modified principles:
- III. Application-Level Identity (Updated from MAC Address)
- IV. Standardized Archival Naming (Updated to include file naming convention)
- V. Role-Based Access Control (Updated from Category-Based)
Added sections: VI. Audit Integrity
Removed sections: None
-->

# Sentinel Map Archive System Constitution

## Core Principles

### I. SQL Server Metadata
All metadata related to archived documents must be stored in the SQL Server Enterprise database. This ensures centralized tracking, enterprise-level reliability, and a single source of truth for the entire pipeline.

### II. ArcGIS Pro Workflow
The primary archival action must originate within ArcGIS Pro via the Sentinel Add-in. The system must automate the export, file placement, and database registration in a single atomic operation to ensure data integrity.

### III. Application-Level Identity
Identity and authentication must be managed at the application level using a dedicated login system (Username/Password) stored in SQL Server. This replaces machine-level tracking to ensure stable user identities and account-based row ownership.

### IV. Standardized Archival Naming
Every export must be assigned a unique sequential ID (`XX-NNNN`) and follow the mandatory file naming convention: `{UniqueID}_{ClientCode}_{ProjectCode}_{YYYYMMDD}.{ext}`. This format is non-negotiable for system-wide consistency.

### V. Role-Based Access Control (RBAC)
System access and data visibility must be governed by defined roles: **Analyst, Owner, Admin, and Read-only**. The system must enforce that Analysts can only modify their own records, while Owners/Admins maintain full visibility and status control.

### VI. Audit Integrity
Every change to a map record's status or metadata must be captured in an immutable Audit Log. This log must record the old value, new value, acting user, and timestamp to ensure full accountability.

### VII. Database Isolation
The system MUST operate exclusively within the `GIS_Archiving` database. All connection strings, queries, and migrations are strictly limited to this scope; accessing or modifying any other database on the instance is prohibited.

## Technical Requirements

The system consists of three integrated components:
1.  **ArcGIS Pro Add-in (C#)**: Handles the archival UX, file automation, and initial DB write.
2.  **Backend API (FastAPI/Python)**: Serves as the secure interface for the dashboard, enforcing RBAC and providing a file proxy.
3.  **Web Dashboard (React)**: The monitoring and management interface for searching and auditing records.

## Security & Compliance

All archived files must be stored on a secure static network path. The system must act as a **File Proxy** to serve these files, ensuring no direct filesystem paths are exposed to the web interface.

## Governance

This constitution defines the core architecture and rules for the Sentinel Map Archive System. Any amendments to the ID format, identity mechanism, or database schema require a formal review. All implementations must be validated against these principles.

**Version**: 1.1.0 | **Ratified**: 2026-04-21 | **Last Amended**: 2026-04-21
