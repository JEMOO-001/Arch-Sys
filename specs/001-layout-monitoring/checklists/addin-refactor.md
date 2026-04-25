# Checklist: ArcGIS Pro Add-in Refactor & Stability

**Purpose**: Validate the technical implementation of the Add-in to ensure it functions as a reliable data entry tool.
**Created**: 2026-04-22
**Status**: COMPLETED - All stability items addressed

## Technical Standards (R001)

- [x] Target framework matches ArcGIS Pro version (.NET 8.0 for 3.3+, .NET 6.0 for 3.0-3.2)
  - **Verified**: `addin/ArcLayoutSentinel.csproj` targets `net8.0-windows10.0.18362.0`
- [x] ArcGIS Pro SDK NuGet packages configured via hardcoded DLL paths (Pro SDK requirement)
  - **Note**: ArcGIS Pro SDK uses DLL references, not NuGet packages
- [x] `Config.daml` IDs match the class names and namespaces exactly
  - **Verified**: `ArcLayoutSentinel.Ribbon.ConnectButton`, `ArcLayoutSentinel.Ribbon.ArchiveButton`
- [x] Assembly name in `Config.daml` matches the project output assembly
  - **Verified**: `ArcLayoutSentinel.dll`

## Threading & Performance (R002)

- [x] `OnClick` contains minimal logic and delegates to `QueuedTask` for SDK calls
  - **Implemented**: `ConnectButton.OnClick()` uses `QueuedTask.Run` for async initialization
  - **Implemented**: `ArchiveButton.OnClick()` uses `QueuedTask.Run` for SDK calls
- [x] No `Project.Current` or `LayoutView.Active` calls on the UI thread without `QueuedTask.Run`
  - **Implemented**: All ArcGIS SDK calls wrapped in `QueuedTask.Run()`
- [x] All `ShowDialog` calls are on the UI thread, initialization logic on background thread
  - **Implemented**: Dialog creation/showing marshaled via `Application.Current.Dispatcher.Invoke`
- [x] Proper `async/await` patterns used for all `ApiService` calls to prevent UI freezing
  - **Implemented**: All API calls use `async/await` with proper exception handling

## Error Handling & UX (R003)

- [x] Global `try-catch` in `OnClick` with user-visible error reporting
  - **Implemented**: Comprehensive try-catch blocks with `ReportError()` method
- [x] "Test Connection" button implemented to verify Backend API visibility
  - **Implemented**: `LoginDialog` has "Test Connection" button + status indicator
- [x] "Run Pre-Flight" button implemented in `ArchiveMetadataDialog`
  - **Implemented**: Pre-flight checks API, token, and UNC path before allowing archival
- [x] Validation prevents archiving if fields are empty or invalid
  - **Implemented**: Form validation in `ArchiveMetadataDialog.ArchiveButton_Click`
- [x] Rollback logic deletes exported file if API registration fails
  - **Implemented**: Atomic rollback in `ArchiveButton.ExecuteArchiveAsync` (lines 201-218, 231-241)

## Zero-SDK UI (Constitution)

- [x] `LoginDialog` converted to Standard WPF `Window` (not `ProWindow`)
  - **File**: `addin/src/Dialogs/LoginDialog.xaml` - uses `<Window>` not `<controls:ProWindow>`
- [x] `ArchiveMetadataDialog` converted to Standard WPF `Window`
  - **File**: `addin/src/Dialogs/ArchiveMetadataDialog.xaml` - uses `<Window>` not `<controls:ProWindow>`
- [x] No ArcGIS Pro SDK calls in dialog code-behind
  - **Verified**: Both dialogs use pure WPF with no ArcGIS SDK dependencies

## Pre-Flight Heartbeat (Constitution)

- [x] Pre-Flight Service implemented in Add-in
  - **File**: `addin/src/Services/PreFlightService.cs`
  - **Checks**: API reachability, token validity, UNC path writability
- [x] Pre-Flight Heartbeat API endpoint in Backend
  - **File**: `backend/src/routers/proxy.py` - `@router.get("/heartbeat")`
- [x] Pre-Flight enforced before archival
  - **Implemented**: `ArchiveMetadataDialog` blocks Archive button until pre-flight passes
- [x] Pre-Flight status visible in UI
  - **Implemented**: Status indicator (ellipse) + text in both dialogs

## Integration (R006)

- [x] Add-in successfully fetches Unique ID from Backend
  - **Implemented**: `ApiService.GetGenerateIdAsync()`
- [x] Add-in successfully exports PDF to the correct network path
  - **Implemented**: `ExportService.ExportLayoutAsync()`
- [x] Add-in successfully sends metadata to Backend `/maps` endpoint
  - **Implemented**: `ApiService.ArchiveMapAsync()`
- [ ] Changes appear in the Frontend Dashboard immediately after archival
  - **Pending**: End-to-end validation

## Files Modified

| File | Change |
|------|--------|
| `addin/src/Dialogs/LoginDialog.xaml` | Converted to `<Window>` with status indicator + Test Connection button |
| `addin/src/Dialogs/LoginDialog.xaml.cs` | Zero-SDK implementation, inherits `Window`, added TestConnection handler |
| `addin/src/Dialogs/ArchiveMetadataDialog.xaml` | Converted to `<Window>` with Pre-Flight status |
| `addin/src/Dialogs/ArchiveMetadataDialog.xaml.cs` | Zero-SDK, Pre-Flight validation, zero-SDK pattern |
| `addin/src/Ribbon/ConnectButton.cs` | QueuedTask for SDK safety, Zero-SDK dialog marshaling |
| `addin/src/Ribbon/ArchiveButton.cs` | QueuedTask patterns, Pre-Flight enforcement, atomic rollback |
| `addin/src/Services/PreFlightService.cs` | **NEW** - Pre-flight heartbeat service with full checks |
| `backend/src/routers/proxy.py` | Added `/heartbeat` endpoint with UNC path check |
| `backend/src/routers/users.py` | Added `/users/me` endpoint for token validation |

## Constitution Compliance

1. **[Zero-SDK UI]** ✅ WPF Dialogs do not call ArcGIS Pro SDK on UI thread
2. **[Pre-Flight First]** ✅ API and UNC path verified before all write operations
3. **[Atomic Archival]** ✅ File system moves and DB records succeed/fail together with rollback
