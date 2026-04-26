# Quickstart: Connect-Archive UI Buttons

## Prerequisites

- ArcGIS Pro 3.x installed
- .NET 8.0 SDK (for building the add-in)
- Visual Studio 2022 or VS Code

## Building the Add-in

1. Open the solution:
   ```
   addin\ArcLayoutSentinel.csproj
   ```

2. Build in Release mode:
   ```
   dotnet build -c Release
   ```

3. Locate output in:
   ```
   addin\bin\Release\
   ```

## Installing the Add-in

1. Copy the output folder to Arcade Pro add-in directory:
   ```
   %APPDATA%\ESRI\ArcGIS Pro\AddIns\ArcGISPro\3.0\
   ```

2. Start ArcGIS Pro - the Sentinel tab should appear

## Testing the Feature

### Test Connect Button
1. Launch ArcGIS Pro with add-in installed
2. Find Sentinel tab on the ribbon
3. Verify Connect button is enabled
4. Verify Archive button is disabled

### Test Login Flow
1. Click Connect button
2. Floating login pane should appear
3. Enter credentials
4. After login, button should change to Disconnect (red icon)
5. Archive button should become enabled

### Test Session Persistence
1. Log in successfully
2. Close ArcGIS Pro
3. Reopen ArcGIS Pro
4. Verify still logged in (session persisted)
5. Archive button should still be enabled

## Troubleshooting

- Add-in not appearing: Check ArcGIS Pro add-in errors in Windows Event Viewer
- Build errors: Ensure .NET 8.0 SDK is installed
- Session not persisting: Check log files for session save errors