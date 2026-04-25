# Tasks: Sentinel Map Archive System

**Input**: Design documents from `/specs/001-layout-monitoring/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/api-contracts.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure for `addin/`, `backend/`, and `frontend/` per implementation plan
- [x] T002 Initialize FastAPI project in `backend/` with `requirements.txt`
- [x] T003 Initialize React project in `frontend/` with Vite and TypeScript
- [x] T004 [P] Configure Tailwind CSS and Framer Motion in `frontend/`
- [x] T005 Initialize ArcGIS Pro Add-in project in `addin/` using C# .NET
- [x] T006 [P] Configure linting and formatting for Python, TypeScript, and C#

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Setup SQL Server schema for `Users`, `Categories`, and `Projects` in `database/schema.sql`
- [x] T008 [P] Implement JWT authentication and role-based middleware in `backend/dependencies/auth.py`
- [x] T009 [P] Create SQLAlchemy models for `Users`, `Categories`, and `Projects` in `backend/models/`
- [x] T010 Implement User Management API endpoints in `backend/routers/users.py`
- [x] T011 [P] Create reusable `Button`, `Input`, and `Modal` components in `frontend/src/components/`
- [x] T012 Configure environment management (`.env`, `config.py`) in `backend/` and `frontend/`
- [ ] T012a [Stability] Setup **Structured Logging** (Serilog for C#, JSON for Python) in `addin/` and `backend/`
- [ ] T012b [Stability] Implement **Atomic Transaction** wrapper (SQL record + File system move) in `backend/services/`
- [ ] T012c [Stability] Refactor **ConnectButton** and **LoginDialog** (Zero-SDK pattern) to resolve UI freezes

**Checkpoint**: Foundation & Login ready - Terminal test `test_login_api.py` must pass.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Frictionless ArcGIS Pro Archiving (Priority: P1) 🎯 MVP

**Goal**: Automate the export, naming, and database registration of map layouts directly from ArcGIS Pro.

**Independent Test**: Execute "Archive Map" in ArcGIS Pro and verify the file is created on the network and the record appears in SQL Server.

### Implementation for User Story 1

- [x] T013 [P] [US1] Create `Maps` and `Audit_Log` tables in `database/schema.sql`
- [x] T014 [P] [US1] Create `Map` and `AuditLog` ORM models in `backend/models/`
- [x] T014a [Stability] Implement **Pre-Flight Heartbeat** API endpoint in `backend/routers/proxy.py`
- [x] T015 [US1] Implement Unique ID generation logic in `backend/services/id_generator.py`
- [x] T016 [US1] Create `POST /maps` endpoint for Add-in archival in `backend/routers/maps.py`
- [x] T017 [US1] Implement automated Audit Log service in `backend/services/audit.py`
- [x] T017a [Stability] Implement **Zero-SDK UI** (Standard WPF/MVVM) in `addin/src/Dialogs/`
- [x] T017b [Stability] Implement **Pre-Flight Heartbeat** check service in `addin/src/Services/PreFlightService.cs`
- [x] T018 [US1] Design Ribbon UI with "Archive Map" button in `addin/src/Ribbon/`
- [x] T019 [US1] Create Archive Metadata Modal dialog in `addin/src/Dialogs/` (Refactor to Zero-SDK)
- [x] T020 [US1] Implement dynamic layout selection logic in `addin/src/Services/LayoutService.cs`
- [x] T021 [US1] Implement automated folder hierarchy and file naming logic in `addin/src/Services/ArchivalService.cs`
- [x] T022 [US1] Implement ArcGIS Pro Export API integration in `addin/src/Services/ExportService.cs` (QueuedTask optimization)
- [x] T023 [US1] Integrate Add-in with `POST /maps` API in `addin/src/Services/ApiService.cs`

**Checkpoint**: User Story 1 (Core Archiving) is functional and testable.

---

## Phase 4: User Story 2 - Role-Based Monitoring Dashboard (Priority: P1)

**Goal**: Provide a web interface for searching, filtering, and managing archived maps with RBAC enforcement.

**Independent Test**: Log in as Owner and verify full visibility/edit capability across all analyst records.

### Implementation for User Story 2

- [x] T024 [P] [US2] Implement `GET /maps` and `GET /maps/{map_id}` with filters in `backend/routers/maps.py`
- [x] T025 [US2] Implement RBAC-enforced `PATCH /maps/{map_id}` in `backend/routers/maps.py`
- [x] T026 [P] [US2] Build Dashboard Main Table component in `frontend/src/components/MapTable.tsx`
- [x] T027 [US2] Implement Global Search and Filter logic in `frontend/src/pages/Dashboard.tsx`
- [x] T028 [P] [US2] Build Edit Modal with Framer Motion in `frontend/src/components/EditModal.tsx`
- [x] T029 [US2] Implement Dashboard Summary Cards in `frontend/src/components/SummaryCards.tsx`
- [ ] T030 [US2] Create Analyst Output table in `frontend/src/components/AnalystStats.tsx`
- [x] T031 [US2] Integrate Dashboard with `GET /stats` endpoints in `backend/routers/maps.py`

**Checkpoint**: User Story 2 (Monitoring Dashboard) is functional and integrated with US1.

---

## Phase 5: User Story 3 - Secure File Access via Proxy (Priority: P2)

**Goal**: Securely stream archived PDF/JPEG files to the browser via the backend proxy.

**Independent Test**: Click "View" in the Dashboard and verify the PDF renders inline without revealing the server path.

### Implementation for User Story 3

- [x] T032 [US3] Implement `GET /proxy/file` streaming endpoint in `backend/routers/proxy.py`
- [x] T033 [US3] Configure read-only volume mount for archive root in `backend/`
- [x] T034 [P] [US3] Add "View" button and inline PDF viewer in `frontend/src/components/FileViewer.tsx`
- [x] T035 [US3] Implement file type resolution (PDF vs JPEG) in `backend/routers/proxy.py`

**Checkpoint**: User Story 3 (File Proxy) is functional across all records.

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T036 [P] Documentation updates for API and Add-in deployment in `docs/`
- [x] T037 Performance audit for dashboard search and file streaming
- [x] T038 UI/UX tuning for Framer Motion transitions and Tailwind styling
- [x] T039 Security hardening for JWT storage and CORS configuration
- [x] T040 Final end-to-end validation of all user stories via `quickstart.md`

## Phase R: Add-in Refactor & Stability (RECOVERY)

**Purpose**: Resolve silent failures in the ArcGIS Pro Add-in and ensure stable data entry.

- [x] R001 Align `.csproj` with correct ArcGIS Pro SDK and .NET Version (3.3+ -> .NET 8.0)
- [x] R002 Refactor `ArchiveButton.cs` to use proper `QueuedTask` patterns and avoid UI deadlocks
- [x] R003 Implement robust error reporting in `ArchiveMetadataDialog` to prevent silent failures
- [x] R004 Add a "Test Connection" feature to the Add-in to verify Backend visibility
- [x] R005 Verify `Config.daml` registration and Add-in loading sequence
- [ ] R006 Final validation: Export layout -> Backend API -> SQL Server -> Frontend Dashboard

**Project Status**: REFACTORING COMPLETE - Add-in stabilized with Zero-SDK pattern and Pre-Flight checks.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Phase 2. US1 and US2 are P1 and should be prioritized.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: The core data producer. No dependencies on other stories.
- **User Story 2 (P1)**: Data consumer. Depends on US1 schema but can be developed in parallel after T014.
- **User Story 3 (P2)**: Utility feature. Depends on US1 file organization.

### Parallel Opportunities

- T004, T006 (Phase 1 Setup)
- T008, T009, T011 (Phase 2 Foundation)
- T013, T014 (Phase 3 Models)
- T024, T026, T028 (Phase 4 Dashboard)
- Once Phase 2 is complete, US1 and US2 development can proceed in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup + Foundation (Phases 1 & 2).
2. Complete User Story 1 (Phase 3).
3. **STOP and VALIDATE**: Verify ArcGIS Pro Archival works as expected.

### Incremental Delivery

1. Foundation ready.
2. Add-in Core (US1) -> Verify Source Control.
3. Dashboard Table (US2) -> Verify Visibility.
4. File Proxy (US3) -> Verify Security.

---

## Notes

- Every record mutation MUST be logged via the Audit service (T017).
- Dashboard search MUST remain below 200ms (T037).
- No direct filesystem access permitted from the frontend (FR-008).
