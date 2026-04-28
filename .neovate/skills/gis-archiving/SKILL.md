---
name: gis-archiving
description: Enterprise GIS archiving tool for ArcGIS Pro (ArcLayoutSentinel)
---

# GIS Archiving System (ArcLayoutSentinel)

Specialized instructions for developing and maintaining the Enterprise GIS Archiving tool.

## When to use
- Modifying the ArcGIS Pro Add-in (C#, DAML).
- Updating the FastAPI backend (Python, SQL Server).
- Refactoring the React dashboard (TypeScript).
- Implementing archival logic or metadata extraction.

## Instructions

### 1. Architecture & Core Mandates
- **Identity:** Use MAC address detection for machine identification.
- **ID Format:** All archive IDs must follow `AB-` followed by an auto-incrementing number.
- **Workflow:** ArcGIS Pro exports PDF to a static network path and logs metadata to SQL Server.
- **Security:** Never log credentials. Use `ApiService.cs` for backend communication.

### 2. Tech Stack & Commands
- **Add-in (C#):** `dotnet build addin/ArcLayoutSentinel.csproj`.
- **Backend (FastAPI):** `uvicorn backend.src.main:app --reload`.
- **Frontend (React):** `npm run dev --prefix frontend`.

### 3. Development Guidelines
- **DAML:** Ensure `Config.daml` in `addin/` is updated when adding new buttons or dockpanes.
- **Graph First:** ALWAYS use `code-review-graph` MCP tools before Grep/Glob.
- **Metadata:** Ensure `ArchiveMetadataDialog.xaml` captures all required fields defined in `database/schema.sql`.

### 4. Code Review & Impact
- Use `get_impact_radius` when changing `ApiService` or `ArchivalService`.
- Verify SQL changes against `backend/src/models/base.py`.
- Run `test_login_api.py` after modifying authentication logic.
