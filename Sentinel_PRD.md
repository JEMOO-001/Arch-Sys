# Sentinel Map Archive System
## Product Requirements Document

**Version:** 1.0 — Initial Release
**Date:** April 21, 2026
**Audience:** Development Team
**Status:** Draft — Pending Review
**Owner:** Product / Engineering Lead

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Users & Roles](#4-users--roles)
5. [System Architecture](#5-system-architecture)
6. [Detailed Component Specifications](#6-detailed-component-specifications)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [User Stories](#8-user-stories)
9. [Out of Scope](#9-out-of-scope-v10)
10. [Open Questions & Risks](#10-open-questions--risks)
11. [Suggested Milestones](#11-suggested-milestones)
12. [Appendix](#12-appendix)

---

## 1. Executive Summary

The **Sentinel Map Archive System** is an enterprise-grade solution that replaces the current manual, error-prone map export workflow with a fully automated pipeline. It consists of three tightly integrated components:

- A custom **ArcGIS Pro C# Add-in** ("Sentinel" tool)
- A central **SQL Server database**
- A **React-based monitoring dashboard**

Every map export is automatically named, placed in a structured folder hierarchy, assigned a unique ID, and registered in the central database. Management gains real-time visibility into production throughput, analyst workloads, and project status — without requiring analysts to change how they work.

---

## 2. Problem Statement

### 2.1 Current State

The team produces a large volume of map layouts (PDFs and JPEGs) with no standardized naming convention, folder structure, or audit trail. This results in:

- Files saved with inconsistent names, making retrieval difficult
- No central record of who produced a map, when, or for which project
- Inability for managers to monitor analyst output or track income/outcome metrics
- No mechanism to verify or roll back changes — zero audit history
- Manual coordination overhead, prone to duplication and errors

### 2.2 Desired Future State

A single archival action inside ArcGIS Pro triggers an automated pipeline that handles naming, storage, database registration, and visibility — giving analysts a frictionless experience and managers a real-time dashboard.

---

## 3. Goals & Success Metrics

| Goal | Description | Success Metric |
|------|-------------|----------------|
| Automated archival | Zero manual file naming or folder creation by analysts | 100% of exports follow naming convention |
| Unique ID assignment | Every export receives a sequential ID (e.g. AB-0001) | 0 duplicate IDs in production |
| Central tracking | All metadata persisted to SQL Server on export | < 1s write latency for metadata insert |
| Role-based access | Analysts edit own rows; Owners see all data | Auth enforced server-side, not just UI |
| File viewing | PDFs/JPEGs viewable in browser via secure proxy | No direct filesystem URLs exposed |
| Audit history | Every field change logged with user + timestamp | 100% of mutations captured in audit log |
| Performance | Dashboard search returns results instantly | < 200ms query response at 10k+ rows |

---

## 4. Users & Roles

| Role | Who | Key Capabilities |
|------|-----|-----------------|
| **Analyst** | GIS staff using ArcGIS Pro | Archive maps; view all records; edit own rows only |
| **Owner / Manager** | Team leads, project managers | View all records; change job status; export reports |
| **Admin** | System administrator | User management; full data access; system config |
| **Read-only** | Stakeholders / clients | Search and view records; cannot edit or download source files |

---

## 5. System Architecture

### 5.1 Component Overview

| Component | Technology | Role |
|-----------|-----------|------|
| Sentinel Add-in | C# / .NET, ArcGIS Pro SDK | In-app archival UX, file automation, DB write |
| Central Database | SQL Server | Metadata storage, audit log, role data |
| Web Dashboard | React, Tailwind CSS, Framer Motion | Search, display, status management, file proxy |
| Backend API | FastAPI (Python 3.11+), SQLAlchemy | REST endpoints, auth middleware, file proxy, DB ORM |

### 5.2 Data Flow

1. Analyst completes map in ArcGIS Pro and clicks **"Archive"** in the Sentinel ribbon
2. Add-in validates required fields, generates the unique ID, builds the folder path, and copies the export file
3. Add-in writes a metadata record to SQL Server via a stored procedure or REST microservice
4. Dashboard reads from SQL Server via a backend API; file proxy streams files from the secured archive root
5. All mutations (edits, status changes) are written to an Audit table alongside the originating change

---

## 6. Detailed Component Specifications

### 6.1 Sentinel Add-in (ArcGIS Pro)

#### 6.1.1 Ribbon Integration

- A dedicated **"Sentinel"** tab and group appear in the ArcGIS Pro ribbon
- Primary CTA button: **"Archive Map"** — disabled if no active layout is open
- Secondary button: **"View Archive"** — opens the dashboard in the default browser

#### 6.1.2 Archive Workflow

When the analyst clicks "Archive Map", the add-in executes the following steps in sequence:

1. Display a modal dialog for analyst to confirm/enter required metadata (project code, category, client name)
2. Generate the next sequential unique ID — format: `XX-NNNN` where `XX` = category prefix
3. Build the destination folder path: `\\server\archive\{YYYY}\{Month}\{DD}\{Category}\`
4. Export the active layout to PDF and/or JPEG using ArcGIS Pro's export API
5. Write metadata record to SQL Server; display confirmation with the assigned ID

#### 6.1.3 File Naming Convention

```
{UniqueID}_{ClientCode}_{ProjectCode}_{YYYYMMDD}.{ext}
```

> **Example:** `AB-0042_NCAC_RD2024_20260421.pdf`

---

### 6.2 SQL Server Database

#### 6.2.1 Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `Maps` | One row per archived map | map_id, unique_id, project_code, client, category, file_path, analyst_id, status, created_at |
| `Audit_Log` | Immutable change history | audit_id, map_id, field_name, old_value, new_value, changed_by, changed_at |
| `Users` | User accounts and roles | user_id, username, role, active, created_at |
| `Projects` | Reference data for project codes | project_id, project_code, client_name, owner_id, active |
| `Categories` | Allowed category definitions | category_id, name, prefix, description |

#### 6.2.2 Performance Requirements

- All frequently queried columns (`analyst_id`, `project_code`, `status`, `created_at`) must be indexed
- Summary counts (income/outcome by analyst, by project) served from pre-computed or indexed views
- The `Audit_Log` table must never be updated or deleted — **insert only**

---

### 6.3 Backend API (FastAPI)

#### 6.3.1 Stack & Setup

- **Runtime:** Python 3.11+, FastAPI framework with Uvicorn ASGI server
- **ORM:** SQLAlchemy 2.0 (async) with `pyodbc` / `aioodbc` driver for SQL Server
- **Auth:** `python-jose` for JWT encoding/decoding; `passlib[bcrypt]` for password hashing
- **File streaming:** FastAPI `StreamingResponse` for the file proxy endpoint
- **Config:** `pydantic-settings` for environment-based configuration (`.env` file)
- **Deployment:** Dockerized; single `Dockerfile`, exposed on port `8000`

#### 6.3.2 Project Structure

```
backend/
├── main.py               # App entry point, router registration
├── config.py             # Settings via pydantic-settings
├── database.py           # Async SQLAlchemy engine + session factory
├── models/
│   ├── maps.py           # Maps ORM model
│   ├── users.py          # Users ORM model
│   └── audit.py          # Audit_Log ORM model
├── schemas/
│   ├── maps.py           # Pydantic request/response schemas
│   └── auth.py           # Login, token schemas
├── routers/
│   ├── auth.py           # POST /auth/login, POST /auth/refresh
│   ├── maps.py           # CRUD endpoints for Maps
│   ├── proxy.py          # GET /proxy/file
│   └── users.py          # Admin user management
├── dependencies/
│   └── auth.py           # get_current_user, require_role dependencies
└── services/
    ├── audit.py          # Audit log write service
    └── id_generator.py   # Unique ID generation logic
```

#### 6.3.3 Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | Public | Returns JWT access + refresh tokens |
| `POST` | `/auth/refresh` | Refresh token | Issues new access token |
| `GET` | `/maps` | Any role | List maps; supports `?search=`, `?status=`, `?from=`, `?to=` query params |
| `GET` | `/maps/{map_id}` | Any role | Single map record detail |
| `PATCH` | `/maps/{map_id}` | Analyst (own) / Owner (all) | Update editable fields; triggers audit log write |
| `POST` | `/maps` | Add-in service account | Create new map record (called by C# Add-in) |
| `GET` | `/maps/{map_id}/audit` | Owner / Admin | Full audit history for a record |
| `GET` | `/proxy/file` | Any role | Stream PDF or JPEG by `map_id`; resolves path from DB |
| `GET` | `/users` | Admin | List all users |
| `POST` | `/users` | Admin | Create user account |
| `PATCH` | `/users/{user_id}` | Admin | Activate / deactivate user, change role |
| `GET` | `/stats/summary` | Owner / Admin | Counts for dashboard summary cards |
| `GET` | `/stats/by-analyst` | Owner / Admin | Per-analyst output table data |

#### 6.3.4 Auth & Role Enforcement

```python
# All protected routes use FastAPI Depends()
@router.patch("/maps/{map_id}")
async def update_map(
    map_id: int,
    payload: MapUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Analysts may only edit their own rows
    if current_user.role == "analyst" and map.analyst_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    ...
```

- Role hierarchy: `admin` > `owner` > `analyst` > `readonly`
- Role stored in JWT payload (`role` claim); re-validated against DB on sensitive actions
- All endpoints return `401` for missing/invalid token, `403` for insufficient role

#### 6.3.5 File Proxy

```python
@router.get("/proxy/file")
async def proxy_file(map_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    record = await db.get(Map, map_id)
    if not record:
        raise HTTPException(404)
    file_path = Path(record.file_path)
    if not file_path.exists():
        raise HTTPException(404, detail="File not found on server")
    media_type = "application/pdf" if file_path.suffix == ".pdf" else "image/jpeg"
    return StreamingResponse(open(file_path, "rb"), media_type=media_type)
```

- The UNC archive path (`\\server\archive\...`) is mounted inside the Docker container as a read-only volume
- File path is never returned to the client — only streamed through the proxy

#### 6.3.6 Audit Log Service

Every `PATCH` on a map record calls the audit service before committing:

```python
async def write_audit(db, map_id, user_id, changed_fields: dict):
    for field, (old_val, new_val) in changed_fields.items():
        db.add(AuditLog(
            map_id=map_id, field_name=field,
            old_value=str(old_val), new_value=str(new_val),
            changed_by=user_id
        ))
    await db.commit()
```

---

### 6.4 Web Dashboard

#### 6.4.1 Authentication

- Login page with username/password; credentials validated against the `Users` table (bcrypt hashing)
- Session managed via JWT or cookie-based auth — configurable
- Unauthenticated requests redirected to login; all API routes protected server-side

#### 6.4.2 Main Data Table

- Displays all `Maps` records with sortable and filterable columns
- Global instant search (debounced, < 200ms) across ID, client, project, analyst, status
- Date range picker for filtering by creation date
- Analysts see edit icon **only on their own rows**; Owners see edit on all rows
- Status column shows colored badges (e.g. In Progress, Complete, On Hold)

#### 6.4.3 File Proxy

- "View" button calls a backend `/proxy/file?id={map_id}` endpoint
- Backend resolves the file path from the database, streams the file with correct `Content-Type`
- **No direct filesystem path is ever exposed to the browser**
- Supported types: PDF (rendered inline), JPEG/PNG (rendered inline)

#### 6.4.4 Edit Modal

- Opens when analyst or owner clicks Edit on a row
- Editable fields: status, notes, client name, project code (non-ID fields only)
- On save: updates the `Maps` table and inserts a diff record into `Audit_Log`
- Animated with Framer Motion — slide-in from right, backdrop blur

#### 6.4.5 Owner Dashboard View

- Summary cards at top: Total Maps Today, Maps This Month, Active Analysts, Pending Review
- Per-analyst output table: analyst name, count today, count this month
- Status breakdown chart (bar or donut)

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Security** | All API endpoints require valid auth token. File proxy validates user read permission. Passwords stored as bcrypt hashes. |
| **Performance** | Dashboard initial load < 2s. Search response < 200ms. Add-in archive action < 3s end-to-end. |
| **Reliability** | Archive action must be atomic — either all steps succeed or none persist. Rollback on DB write failure. |
| **Code Quality** | TypeScript strict mode for frontend. C# nullable reference types enabled. Unit tests for ID generation and file naming logic. |
| **Maintainability** | All components modular; no business logic in UI components. Stored procedures for all DB mutations. |
| **Accessibility** | Dashboard WCAG 2.1 AA compliant. Keyboard-navigable table and modal. |
| **Deployment** | Dashboard deployable as a Docker container. Add-in distributed as a signed `.esriAddinX` package. |

---

## 8. User Stories

### Analyst

- As an analyst, I want to archive a finished map with a single click so I don't have to manually name or move files.
- As an analyst, I can see the unique ID assigned to my export immediately so I can reference it in communications.
- As an analyst, I can edit the metadata on my own maps so I can correct mistakes without waiting for an admin.
- As an analyst, I can view any archived PDF or JPEG in my browser so I don't need network drive access.

### Owner / Manager

- As an owner, I can see the total output of each analyst for today and this month so I can monitor team productivity.
- As an owner, I can change the status of any map record so I can reflect project milestones accurately.
- As an owner, I can search across all records by project code or client so I can answer client queries quickly.

### Admin

- As an admin, I can add or deactivate user accounts so I can control who has access to the system.
- As an admin, I can view the full audit history for any record so I can investigate discrepancies.

---

## 9. Out of Scope (v1.0)

- Integration with external project management tools (Jira, Asana)
- Automated email or Slack notifications on archive events
- Mobile application or PWA version of the dashboard
- Multi-language / internationalization support
- Automated map QA or content validation inside the Add-in
- Version control or diff-viewing for multiple versions of the same map

---

## 10. Open Questions & Risks

| # | Question / Risk | Owner | Status |
|---|----------------|-------|--------|
| 1 | What is the ID prefix scheme? Per-category, per-team, or global? | Product | Open |
| 2 | Will the Add-in write directly to SQL Server or via a REST microservice? (firewall considerations) | Engineering | Open |
| 3 | What is the file server path and access control model for the archive root? | IT / Infra | Open |
| 4 | What fields are mandatory at archive time vs. optional (fillable later)? | Product | Open |
| 5 | What constitutes "income" vs. "outcome" in the database context? | Product / Finance | Open |
| 6 | Is SSO (Active Directory / LDAP) required for auth, or is username/password sufficient for v1? | Engineering | Open |

---

## 11. Suggested Milestones

| Milestone | Deliverable | Est. Duration |
|-----------|-------------|---------------|
| M1 — Foundation | DB schema finalized, migrations scripted, seed data loaded | 1 week |
| M2 — Add-in Core | Ribbon UI, archive workflow, file naming, DB write working end-to-end | 2 weeks |
| M3 — Dashboard Auth | Login page, JWT auth, protected routes, role enforcement | 1 week |
| M4 — Dashboard Data | Main table with search/filter, edit modal, audit log view | 2 weeks |
| M5 — File Proxy | Secure `/proxy/file` endpoint, PDF/JPEG inline rendering | 1 week |
| M6 — Owner View | Summary cards, analyst output table, status chart | 1 week |
| M7 — QA & Polish | End-to-end testing, animation tuning, performance validation, packaging | 1 week |

**Total estimated:** ~9 weeks

---

## 12. Appendix

### 12.1 Folder Hierarchy Example

```
\\server\archive\2026\April\21\Topographic\AB-0042_NCAC_RD2024_20260421.pdf
```

### 12.2 Tech Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Add-in | C# .NET 6+, ArcGIS Pro SDK 3.x | Required by ArcGIS Pro extension model; type-safe, robust |
| Database | SQL Server 2019+ | Enterprise reliability; supports row-level security and audit triggers |
| Backend API | FastAPI (Python 3.11+) | Async REST API; auth, file proxy, and DB access via SQLAlchemy |
| Frontend | React 18, TypeScript, Tailwind CSS | Component-driven, type-safe, utility-first styling |
| Animations | Framer Motion | Production-grade animation library with layout transitions |
| Auth | JWT or Cookie sessions | Stateless, scalable; integrate with AD in future |

---

*Confidential — Dev Team Only*
