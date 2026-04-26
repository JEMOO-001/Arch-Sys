# Data Model: Connect-Archive UI Buttons

## Overview

This document defines the data entities and state models for the Connect-Archive UI Buttons feature.

---

## Entities

### Session Entity

Represents a user login session.

| Field | Type | Description |
|-------|------|------------|
| sessionId | string | Unique session identifier |
| userId | string | Authenticated user ID |
| token | string | Authentication token |
| machineId | string | Machine identifier (for session persistence) |
| createdAt | datetime | Session creation timestamp |
| expiresAt | datetime | Session expiration timestamp |

**Relationships**:
- One-to-one with User (via userId)
- One-to-one with Machine (via machineId)

---

### Button State Entity

Represents the current state of ribbon buttons.

| Field | Type | Description |
|-------|------|------------|
| isLoggedIn | boolean | Whether user is authenticated |
| connectEnabled | boolean | Connect button enabled state |
| disconnectEnabled | boolean | Disconnect button enabled state |
| archiveEnabled | boolean | Archive button enabled state |

**Valid State Transitions**:

```
Not Logged In:
  - connectEnabled: true
  - disconnectEnabled: false
  - archiveEnabled: false

Logged In:
  - connectEnabled: false
  - disconnectEnabled: true
  - archiveEnabled: true
```

---

### Login Credentials Entity

Represents user credentials (transient, not persisted).

| Field | Type | Description |
|-------|------|------------|
| username | string | User's username |
| password | string | User's password (in-memory only) |

---

## State Machine

### Button State Transition

```
[Not Logged In] --(login success)--> [Logged In]
[Logged In] --(logout)--> [Not Logged In]
[Logged In] --(PC restart)--> [Not Logged In]
```

### Session State Transitions

```
[No Session] --(login)--> [Active Session]
[Active Session] --(logout)--> [No Session]
[Active Session] --(PC restart)--> [No Session]
[Active Session] --(expire)--> [No Session]
```

---

## Validation Rules

1. Session must have valid token to be considered active
2. Session expiresAt must be in the future
3. Machine ID must match current machine for session persistence
4. Button states must be mutually exclusive (Connect vs Disconnect)