# Tasks: Connect-Archive UI Buttons

**Feature**: Connect-Archive UI Buttons  
**Feature Branch**: `connect-archive-buttons`  
**Created**: 2026-04-26

---

## Phase 1: Setup

- [X] T001 Setup project initialization and verify existing Config.daml structure
- [X] T002 [P] Verify existing LoginDockPaneViewModel and login infrastructure

---

## Phase 2: Foundational

- [X] T003 Create SessionService class in addin/src/Services/SessionService.cs
- [X] T004 [P] Create SessionStorage class in addin/src/Services/SessionStorage.cs
- [X] T005 Implement PC restart detection mechanism in SessionService

---

## Phase 3: User Story 1 - Connect/Disconnect Button (P1)

**Story Goal**: Display Connect button that changes to Disconnect with red icon after login

**Independent Test**: Load add-in, verify Connect button enabled, login, verify button changes to Disconnect

### Implementation

- [X] T006 [P] [US1] Add Sentinel_ConnectButton to Config.daml in addin/Config.daml
- [X] T007 [P] [US1] Add Sentinel_DisconnectButton to Config.daml in addin/Config.daml
- [X] T008 [US1] Implement ConnectButton click handler in addin/src/ConnectButton.cs
- [X] T009 [US1] Create DisconnectButton class in addin/src/DisconnectButton.cs
- [X] T010 [US1] Update button state management in Module1.cs

---

## Phase 4: User Story 2 - Archive Button (P2)

**Story Goal**: Archive button enabled when logged in

**Independent Test**: Login, verify Archive button becomes enabled, click Archive, verify workflow starts

### Implementation

- [X] T011 [P] [US2] Verify Archive button uses sentinel_logged_in_state in addin/Config.daml
- [X] T012 [US2] Update ArchiveButton to check login state in addin/src/ArchiveButton.cs

---

## Phase 5: User Story 3 - Persistent Login Session (P3)

**Story Goal**: Login session persists across ArcGIS Pro restarts but clears on PC restart

**Independent Test**: Login, close ArcGIS Pro, reopen, verify still logged in. Restart PC, verify must login again.

### Implementation

- [X] T013 [P] [US3] Implement session save to local file in SessionStorage
- [X] T014 [P] [US3] Implement session load on startup in SessionService
- [X] T015 [US3] Add PC restart detection and session clear in SessionService

---

## Phase 6: User Story 4 - Float Pane Login (P4)

**Story Goal**: Login opens in floating pane (already configured)

**Independent Test**: Click Connect, verify floating pane opens

### Implementation

- [X] T016 [US4] Verify floating dock pane configuration in addin/Config.daml
- [X] T017 [US4] Connect ConnectButton to open floating pane in addin/src/ConnectButton.cs

---

## Phase 7: Polish & Integration

- [X] T018 [P] Update button icons (red for disconnect)
- [X] T019 Build and verify all buttons appear correctly
- [X] T020 End-to-end test all user stories

---

## Dependencies

```
Phase 1 (Setup)
  └── Phase 2 (Foundational)
        ├── Phase 3 (US1: Connect/Disconnect)
        ├── Phase 4 (US2: Archive Button)
        ├── Phase 5 (US3: Session Persistence)
        └── Phase 6 (US4: Float Pane)
              └── Phase 7 (Polish)
```

---

## Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T006 and T007 can run in parallel (different buttons)
- T011 and T012 can run parallel (different responsibilities)
- T013 and T014 can run parallel (session save/load)
- T018 can run parallel with other Phase 7 tasks

---

## MVP Scope

**Recommended MVP**: Complete User Story 1 (Connect/Disconnect Button)
- Phase 1: Setup
- Phase 2: Foundational  
- Phase 3: US1 implementation (T001-T010)

This delivers the core authentication flow.

---

## Summary

| Category | Count |
|----------|-------|
| Total Tasks | 20 |
| Setup | 2 |
| Foundational | 3 |
| User Story 1 | 5 |
| User Story 2 | 2 |
| User Story 3 | 3 |
| User Story 4 | 2 |
| Polish | 3 |

**Parallelizable Tasks**: 9 tasks marked [P]