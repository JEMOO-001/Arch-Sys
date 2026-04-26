# Feature Specification: Connect-Archive UI Buttons

**Feature Branch**: `connect-archive-buttons`  
**Created**: 2026-04-26  
**Status**: Draft  
**Input**: User description: "refactor the addin to have two buttons connect - archive ] the second one is disabled cause user don't login and the login will be float pane not docked one when user login the connect will convert into disconnect [ with red icon ] and the archieve will be enabled and user can click on it and begin ro archieve maps - when you login if he restart the pc he will login again but at the same machine [ not restarted or shutdown ] can remain with the same login session in any arcgis pro window - adjust the ui of the buttons [ connect and archieve ]"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect/Disconnect Button (Priority: P1)

As a GIS user, I want to see a Connect button on the ArcGIS Pro ribbon so that I can log in to Sentinel.

**Why this priority**: This is the primary entry point for user authentication - if users cannot connect, they cannot use any other functionality.

**Independent Test**: Can be tested by loading the add-in and verifying the Connect button appears on the Sentinel tab.

**Acceptance Scenarios**:

1. **Given** the user has not logged in, **When** the add-in loads, **Then** a Connect button is displayed (enabled) and Archive button is disabled
2. **Given** the user clicks Connect, **When** credentials are valid and login succeeds, **Then** the button changes to Disconnect with a red icon
3. **Given** the user is logged in, **When** they click Disconnect, **Then** the button reverts to Connect and Archive becomes disabled

---

### User Story 2 - Archive Button (Priority: P2)

As a logged-in GIS user, I want to archive layouts after logging in so that I can save map layouts to Sentinel.

**Why this priority**: This is the core functionality of the add-in - users need to archive layouts after authenticating.

**Independent Test**: Can be tested by logging in and verifying the Archive button becomes enabled.

**Acceptance Scenarios**:

1. **Given** the user is not logged in, **When** the add-in loads, **Then** Archive button is disabled
2. **Given** the user is logged in, **When** the add-in is idle, **Then** Archive button is enabled
3. **Given** the user is logged in, **When** they click Archive, **Then** the archival workflow begins

---

### User Story 3 - Persistent Login Session (Priority: P3)

As a GIS user, I want my login session to persist across ArcGIS Pro restarts (without full PC restart) so that I don't need to re-authenticate every time I open a new map.

**Why this priority**: Improves user experience by reducing repeated login prompts for the same work session.

**Independent Test**: Can be tested by logging in, closing ArcGIS Pro, reopening it, and verifying the session persists.

**Acceptance Scenarios**:

1. **Given** the user has logged in successfully, **When** they close ArcGIS Pro without shutting down the PC, **Then** the session persists
2. **Given** the user has logged in and restarts the PC, **When** they reopen ArcGIS Pro, **Then** they must log in again (session is cleared on full PC restart)
3. **Given** the user has logged in on machine A, **When** they open ArcGIS Pro on machine B, **Then** they must log in again (session is machine-specific)

---

### User Story 4 - Float Pane Login (Priority: P4)

As a GIS user, I want the login pane to appear as a floating window so that I can position it where needed on my screen.

**Why this priority**: Provides flexibility in UI layout - floating panes can be moved and resized independently.

**Independent Test**: Can be tested by opening the login pane and verifying it appears as a floating dock pane.

**Acceptance Scenarios**:

1. **Given** the user clicks Connect, **When** login is required, **Then** a floating login pane opens
2. **Given** the user is logged in, **When** they view the Sentinel pane, **Then** it appears as a floating window

---

### Edge Cases

- What happens when login credentials are invalid?
- How does the system handle network connectivity loss during login?
- What happens when the user minimizes all windows - does the floating pane get hidden?
- How does session persistence handle corrupted/missing session data?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display two buttons on the Sentinel ribbon group: Connect and Archive
- **FR-002**: System MUST disable the Archive button when user is not logged in
- **FR-003**: System MUST enable the Archive button when user is logged in
- **FR-004**: System MUST change Connect button to Disconnect (with red icon) after successful login
- **FR-005**: System MUST revert Disconnect to Connect button after user logs out
- **FR-006**: System MUST open a floating dock pane for login (not docked)
- **FR-007**: System MUST persist login session across ArcGIS Pro sessions on the same machine (until PC restart)
- **FR-008**: System MUST clear login session when PC is restarted or shut down
- **FR-009**: Users MUST be able to click Archive button to begin archiving layouts when logged in

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete login in under 30 seconds
- **SC-002**: Archive button is disabled for non-authenticated users 100% of the time
- **SC-003**: 95% of authenticated users can successfully archive on first attempt
- **SC-004**: Session persists across ArcGIS Pro restarts without re-authentication

## Assumptions

- Users have valid Sentinel credentials
- Network connectivity is available for authentication
- The add-in runs on ArcGIS Pro 3.x
- Session storage uses local file system (not database)