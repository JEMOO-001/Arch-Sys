# UI Contracts: Connect-Archive UI Buttons

## Overview

This document defines the user interface contracts for the Connect-Archive UI Buttons feature.

---

## Ribbon UI Contract

### Sentinel Tab / Group

**Location**: ArcGIS Pro ribbon, Sentinel tab, Sentinel group

### Button: Connect

| Property | Value |
|----------|-------|
| ID | Sentinel_ConnectButton (new) |
| Caption | Connect |
| Size | Large |
| Default State | Enabled (when not logged in) |
| Condition | sentinel_not_logged_in_state |
| Icon | Blue/green connection icon |
| Tooltip | Connect to Sentinel |

### Button: Disconnect

| Property | Value |
|----------|-------|
| ID | Sentinel_DisconnectButton (new) |
| Caption | Disconnect |
| Size | Large |
| Default State | Hidden (shown only when logged in) |
| Condition | sentinel_logged_in_state |
| Icon | Red disconnected icon |
| Tooltip | Disconnect from Sentinel |

### Button: Archive

| Property | Value |
|----------|-------|
| ID | Sentinel_ArchiveButton |
| Caption | Archive |
| Size | Large |
| Default State | Disabled (when not logged in) |
| Condition | sentinel_logged_in_state |
| Icon | Blue archive icon |
| Tooltip | Archive current layout to Sentinel |

---

## Login Dock Pane Contract

### Sentinel Login Pane

| Property | Value |
|----------|-------|
| ID | Sentinel_LoginPane |
| Caption | Sentinel |
| Docking | Float (dock="float") |
| Initial Visibility | Collapsed |
| Contents | Login form |

### Login Form Fields

| Field | Type | Required |
|-------|------|----------|
| Username | Text input | Yes |
| Password | Password input | Yes |
| Login Button | Button | Yes |
| Cancel Button | Button | No |

---

## Session Persistence Contract

### Session Storage

| Property | Value |
|----------|-------|
| Storage Location | Local AppData folder |
| File Format | JSON |
| File Name | sentinel-session.json |

### Session Data Schema

```json
{
  "sessionId": "string",
  "userId": "string", 
  "token": "string",
  "machineId": "string",
  "createdAt": "ISO8601 datetime",
  "expiresAt": "ISO8601 datetime"
}
```

### Session Validation Rules

1. Token must exist and be valid
2. Machine ID must match current machine
3. ExpiresAt must be in the future
4. PC restart detection clears session

---

## State Transitions

### Login Flow

```
User clicks Connect --> Login pane opens --> User enters credentials --> 
Login succeeds --> Connect hides, Disconnect shows --> Session saved
```

### Logout Flow

```
User clicks Disconnect --> Session cleared --> Disconnect hides, Connect shows
```

### Session Persistence Flow

```
App starts --> Check session file --> Validate token --> 
If valid and same machine --> Restore session state
```

---

## Error Handling UI

### Login Failed

- Display error message in login pane
- Keep credentials entered (except password)
- Allow retry

### Session Expired

- Display notification
- Clear session
- Show Connect button

### Network Error

- Display network error message
- Allow retry when network available