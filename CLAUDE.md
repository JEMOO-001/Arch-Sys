# Spec-Kit for Claude: Sentinel Map Archive System

This project is powered by **GitHub Spec-Kit**. All feature development follows a structured, spec-driven workflow.

## Spec-Kit Skills (Slash Commands)
- `/speckit-constitution`: Establish project principles and governance.
- `/speckit-specify`: Define functional requirements and user stories in `specs/`.
- `/speckit-plan`: Create a technical implementation plan and data models.
- `/speckit-tasks`: Generate an actionable, ordered task list from the plan.
- `/speckit-implement`: Execute tasks step-by-step with integrated validation.
- `/speckit-clarify`: (Optional) Resolve underspecified requirements before planning.
- `/speckit-analyze`: (Optional) Ensure consistency across artifacts.
- `/speckit-checklist`: (Optional) Generate requirement-quality unit tests.

## Build & Test Commands
### ArcGIS Pro Add-in (C#)
- **Build**: `dotnet build addin/ArcLayoutSentinel.csproj`
- **Package**: `dotnet build addin/ArcLayoutSentinel.csproj /t:PackageAddIn`

### Backend (FastAPI)
- **Run**: `uvicorn backend.src.main:app --reload`
- **Verify Login**: `python test_login_api.py`

### Frontend (React)
- **Dev**: `npm run dev --prefix frontend`

## Project Constitution
1. **Zero-SDK UI**: WPF Dialogs must not call ArcGIS Pro SDK methods on the UI thread.
2. **Pre-Flight First**: Always verify API and UNC path connectivity before write operations.
3. **Atomic Archival**: File system moves and Database records must succeed or fail together.

## Current Focus
[Implementation Plan: Layout Monitoring System](specs/001-layout-monitoring/plan.md)
- **Status**: Ready to refactor `ConnectButton` and `LoginDialog` for stability.
- **Workflow**: Next step is `/speckit-implement`.
