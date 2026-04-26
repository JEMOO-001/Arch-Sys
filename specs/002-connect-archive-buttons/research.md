# Research: Connect-Archive UI Buttons

## Overview

This document contains research findings for implementing the Connect-Archive UI Buttons feature in the ArcGIS Pro add-in.

---

## Technical Context

### Key Technical Decisions

1. **Button State Management**: How to manage button state (enabled/disabled) based on login state
2. **Session Persistence**: Mechanism to persist login session across ArcGIS Pro restarts
3. **Icon Resources**: How to swap Connect button icon to Disconnect (red) icon

---

## Decisions Made

### Decision 1: Button State Management
**Decision**: Use ArcGIS Pro's condition system in DAML to control button enabled state
- The existing `sentinel_logged_in_state` condition already defined in Config.daml can enable/disable buttons
- Archive button already uses this condition - need to verify implementation

**Rationale**: ArcGIS Pro's built-in condition system is the idiomatic way to control UI element state
**Alternatives considered**: 
- Custom command canExecute logic in button click handler - more complex to maintain
- Event-driven state updates - adds complexity for state synchronization

---

### Decision 2: Session Persistence
**Decision**: Use local file-based session storage with Windows session info
- Store session token in local AppData folder
- Detect PC restart via Windows session/logon events
- Store machine identifier to detect same machine

**Rationale**: Simple implementation that leverages Windows session tracking
**Alternatives considered**:
- Windows credentials store - secure but more complex to implement
- Registry storage - not recommended for sensitive tokens

---

### Decision 3: Icon Resources
**Decision**: Use separate button definitions for Connect/Disconnect states OR single button with dynamic icon
- Option A: Two buttons, show/hide based on state
- Option B: Single button with conditional icon update (requires custom button class)

**Rationale**: Option A is simpler and follows ArcGIS Pro conventions
**Alternatives considered**:
- Dynamic icon swapping via property changes - requires more complex code

---

## ArcGIS Pro Add-in UI Patterns

Based on reviewing the existing Config.daml:

1. **Button Definition**: Uses `<button>` element with `condition` attribute
2. **Dock Pane**: Uses `<dockPane>` with `dock="float"` for floating windows
3. **State Conditions**: Use `<conditions><insertCondition>` for state definitions

---

## References

- ArcGIS Pro SDK for .NET Documentation
- Existing Config.daml structure
- Existing button implementations in addin/src/

---

## Notes

- No additional research needed - existing code patterns provide sufficient guidance
- All technical questions resolved through code analysis