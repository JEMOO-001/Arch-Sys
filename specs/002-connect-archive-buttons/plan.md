# Implementation Plan: Connect-Archive UI Buttons

**Feature Branch**: `connect-archive-buttons`  
**Created**: 2026-04-26  
**Feature Spec**: [spec.md](spec.md)

---

## Technical Context

### Current Implementation

The existing Config.daml has:
- One button (Sentinel_ArchiveButton) tied to `sentinel_logged_in_state` condition
- Floating dock pane already defined (Sentinel_LoginPane with dock="float")
- Existing session state condition in DAML

### Unknowns / Clarifications Needed

- **ICON RESOURCES**: Need to determine which icon resources are available in ArcGIS Pro or if custom icons need to be added
- **SESSION CLEAR ON PC RESTART**: Need to implement PC restart detection mechanism

---

## Constitution Check

Based on `.specify/memory/constitution.md`:

- [ ] Feature must follow existing code patterns - **VERIFIED**: Uses existing DAML structure
- [ ] Feature must be testable - **VERIFIED**: Has clear acceptance criteria
- [ ] Feature must be backward compatible - **VERIFIED**: Archive button behavior preserved

---

## Phase 1: UI Updates

### Task 1.1: Add Connect Button to DAML

**Location**: `addin/Config.daml`

**Changes**:
- Add new button `Sentinel_ConnectButton` with caption "Connect"
- Button should be enabled by default (not conditional)
- Add smallImage and largeImage references

### Task 1.2: Add Disconnect Button to DAML

**Location**: `addin/Config.daml`

**Changes**:
- Add new button `Sentinel_DisconnectButton` with caption "Disconnect"
- Button should be hidden or shown based on login state
- Use condition `sentinel_logged_in_state`
- Add red icon for visual distinction

### Task 1.3: Update Archive Button Configuration

**Location**: `addin/Config.daml`

**Changes**:
- Verify Archive button uses `sentinel_logged_in_state` condition
- Ensure proper icon and tooltip

---

## Phase 2: Code Implementation

### Task 2.1: Create Session Service

**Location**: `addin/src/Services/SessionService.cs` (new file)

**Responsibilities**:
- Manage session state (login/logout)
- Persist session to local file
- Validate stored session on startup
- Detect PC restart and clear session

**Public API**:
- `bool IsLoggedIn { get; }`
- `void Login(string username, string password)`
- `void Logout()`
- `void RestoreSession()`

### Task 2.2: Update Button Click Handlers

**Location**: `addin/src/ConnectButton.cs` (update existing)

**Changes**:
- Open login dock pane on click
- Handle login completion

**Location**: `addin/src/DisconnectButton.cs` (new file)

**Changes**:
- Clear session on click
- Update UI state

### Task 2.3: Update Archive Button Handler

**Location**: `addin/src/ArchiveButton.cs` (update existing)

**Changes**:
- Verify IsLoggedIn check before archiving
- Show error if not logged in

---

## Phase 3: Session Persistence

### Task 3.1: Implement Session File Storage

**Location**: `addin/src/Services/SessionStorage.cs` (new file)

**Responsibilities**:
- Save session to local JSON file
- Load session from file
- Clear session on PC restart

**Storage Location**: `%LOCALAPPDATA%\ArcLayoutSentinel\session.json`

### Task 3.2: Implement PC Restart Detection

**Location**: `addin/src/Services/SessionService.cs`

**Options**:
- Track last boot time and compare
- Track Windows session ID
- Store machine ID and verify match

**Decision**: Track last boot time and machine ID for simplicity

---

## Phase 4: Testing

### Test Scenarios

1. **Initial Load**: Connect enabled, Archive disabled
2. **Login Flow**: Click Connect -> Login pane -> Login -> Disconnect shows
3. **Logout Flow**: Click Disconnect -> Connect shows, Archive disabled
4. **Session Persistence**: Close ArcGIS Pro -> Reopen -> Still logged in
5. **PC Restart**: Restart PC -> Open ArcGIS Pro -> Must login again

---

## Dependencies

- Existing Config.daml structure
- Existing LoginDockPaneViewModel
- Existing ApiService for authentication
- Windows file system for session storage

---

## Notes

- Icon resources need to be verified/added
- Session persistence requires local file write permissions
- PC restart detection relies on system time comparison