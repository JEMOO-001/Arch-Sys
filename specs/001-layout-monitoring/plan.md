# Implementation Plan: Sentinel Map Archive System

**Branch**: `001-layout-monitoring` | **Date**: 2026-04-21 | **Spec**: [specs/001-layout-monitoring/spec.md](spec.md)
**Input**: PRD `Sentinel_PRD.md` - Technical roadmap for the Sentinel system.

## Summary

The **Sentinel Map Archive System** is a three-tier enterprise solution consisting of a C# ArcGIS Pro Add-in for archival automation, a FastAPI/SQL Server backend for secure data management and file proxying, and a React-based monitoring dashboard for real-time visibility and auditing.

## Technical Context

**Language/Version**: 
- Backend: Python 3.11+ (FastAPI)
- Frontend: TypeScript (React 18+)
- Add-in: C# (.NET 8.0 preferred, ArcGIS Pro SDK 3.x)
- Database: T-SQL (SQL Server 2019+)

**Primary Dependencies**: 
- Backend: `fastapi`, `sqlalchemy`, `pydantic-settings`, `python-jose`, `pyodbc`, `serilog-python`
- Frontend: `tailwindcss`, `framer-motion`, `lucide-react`, `axios`
- Add-in: `ArcGIS.Desktop.SDK`, `Microsoft.Data.SqlClient`, `Serilog`, `CommunityToolkit.Mvvm`

**Storage**: SQL Server Enterprise (`GIS_Archiving` database only). Tables: `Maps`, `Audit_Log`, `Users`, `Projects`, `Categories`.
**Performance Goals**: 
- < 200ms Search response
- < 3s Archival action end-to-end
- < 2s Initial dashboard load
- 100% Pre-Flight check success before write operations.

## Project Structure

```text
addin/                  # ArcGIS Pro Sentinel Add-in (C#)
├── src/
│   ├── Ribbon/         # UI Elements (Tabs, Buttons)
│   ├── Dialogs/        # Zero-SDK WPF Dialogs (Decoupled from Pro SDK UI)
│   ├── Services/       # Export, DB, and Pre-Flight Logic
│   ├── Models/         # Internal entity definitions
│   └── Logging/        # Structured logging (Serilog) configuration
```
backend/                # FastAPI Application
├── main.py             # Entry point
├── config.py           # Pydantic settings
├── database.py         # Async SQLAlchemy setup
├── models/             # ORM (Maps, Users, Audit)
├── schemas/            # Pydantic (Request/Response)
├── routers/            # API Endpoints (Auth, Maps, Proxy)
├── dependencies/       # Auth & Role middleware
└── services/           # Audit Logging & ID Generation

frontend/               # React Monitoring Dashboard
├── src/
│   ├── components/     # UI Components (Tables, Modals)
│   ├── pages/          # Login, Dashboard, Stats
│   ├── services/       # API Client (Axios)
│   └── styles/         # Tailwind CSS config
```

## Phase 0: Foundation & Schema
- [ ] Deploy SQL Server schema with `Audit_Log` triggers and `AB-####` sequence.
- [ ] Implement Backend Auth (JWT) and User management endpoints.
- [ ] **[Stability]** Setup **Structured Logging** (Serilog) in Backend and Add-in.
- [ ] **[Stability]** Implement **Atomic Transaction** wrapper in Backend for Archival (DB + File move).
- [ ] Configure Docker environment for Backend/Frontend deployment.

## Phase 1: Archival Workflow (Add-in)
- [ ] **[Stability]** Implement **Zero-SDK UI pattern** for the Archive Modal (Pure WPF/MVVM).
- [ ] **[Stability]** Develop **Pre-Flight Heartbeat** service (Ping API, Verify Token, Test UNC write access).
- [ ] Implement Ribbon UI and Archive Modal in C#.
- [ ] Develop automated Export logic using ArcGIS Pro SDK (QueuedTask optimized).
- [ ] Implement the `XX-NNNN` sequential ID generator service.
- [ ] Configure the Year/Month/Day folder hierarchy logic.

## Phase 2: Monitoring & Dashboard
- [ ] Build the Main Data Table with instant search and filtering.
- [ ] Implement the **File Proxy** service for secure PDF/JPEG streaming.
- [ ] Build the **Audit History** view and Edit modal with RBAC enforcement.
- [ ] Design the Owner Summary cards and Stats charts.

## Constitution Check

*GATE: Must pass before development.*

- [x] **I. SQL Server Metadata**: Metadata logged on archival.
- [x] **II. ArcGIS Pro Workflow**: Sentinel Add-in is the primary producer.
- [x] **III. Application Identity**: JWT/SQL-based auth (No MAC addresses).
- [x] **IV. Standardized Naming**: Sequential ID + File naming convention enforced.
- [x] **V. Role-Based Access**: Analyst/Owner/Admin roles implemented.
- [x] **VI. Audit Integrity**: Immutable Audit_Log for all mutations.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| File Proxy | Security | Direct filesystem links are blocked by browsers and expose server structure. |
| Audit Table | Compliance | Simple status changes don't capture the full history required for management. |
