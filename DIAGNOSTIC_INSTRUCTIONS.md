# ArcGIS Add-in Diagnostic Steps

## Problem
When clicking the **Connect** button, the login dialog with username and password fields is not appearing.

## Root Cause Analysis
We've verified:
✅ Config.daml is **properly embedded** in ArcLayoutSentinel.dll as `ArcLayoutSentinel.src.Config.daml`
✅ DockPane ID matches: `ArcLayoutSentinel_LoginDockPane` (in both Config.daml and code)
✅ All source files (ViewModel, View, Codebehind) are present and updated with debug output
✅ Build is successful with no compilation errors

## Diagnostic Steps to Run NOW

### Step 1: Close Everything
```powershell
# Close ArcGIS Pro completely
taskkill /F /IM ArcGISPro.exe
```

### Step 2: Clean Build
In Visual Studio:
```
Build → Clean Solution
Build → Rebuild Solution
```

### Step 3: Reopen ArcGIS Pro
- Double-click your project file or use `Debug → Start Debugging` in VS

### Step 4: Open Debug Output Window
```
Debug → Windows → Output
```
Make sure you're looking at the **Debug** output pane (not Build)

### Step 5: Click Connect Button
1. Look for the "**Sentinel**" ribbon tab (should appear)
2. Click the "**Connect**" button
3. **Watch the Debug Output window** for diagnostic messages

## What to Look For in Debug Output

### GOOD OUTPUT (pane is working):
```
========== CONNECT BUTTON CLICKED ==========
Timestamp: 2026-04-25 14:30:45.123
Listing ALL available DockPanes:
  - Pane ID: LoginDockPaneViewModel
Looking for 'ArcLayoutSentinel_LoginDockPane'...
✓ Pane FOUND! Activating...
✓ Pane activated successfully
========== END CONNECT BUTTON ==========
```

### BAD OUTPUT (pane not found):
```
========== CONNECT BUTTON CLICKED ==========
...
Looking for 'ArcLayoutSentinel_LoginDockPane'...
✗ Pane NOT FOUND!
This means Config.daml registration failed or pane ID doesn't match.
```

## If Pane NOT FOUND

Then check:

### 1. Is the ribbon loading at all?
- Can you see the "Sentinel" tab on the ribbon?
- If NO → Config.daml not loading (embed issue)
- If YES → Continue to next check

### 2. Check Config.daml is embedded
```powershell
# Run this in PowerShell:
$dllPath = "D:\claudeCode CLI\open-claude-code\GIS Archiving Sys\addin\bin\Debug\win-x64\ArcLayoutSentinel.dll"
[Reflection.Assembly]::LoadFile($dllPath).GetManifestResourceNames()

# Should contain: ArcLayoutSentinel.src.Config.daml
```

### 3. Check Config.daml syntax
- Verify dockPane ID: should be `ArcLayoutSentinel_LoginDockPane` (exact match)
- File: `D:\claudeCode CLI\open-claude-code\GIS Archiving Sys\addin\src\Config.daml`
- Line 34: `<dockPane id="ArcLayoutSentinel_LoginDockPane" ...`

### 4. If everything looks good but still failing
- Try deleting the entire `bin` and `obj` folders
- Close Visual Studio completely
- Delete `D:\claudeCode CLI\open-claude-code\GIS Archiving Sys\addin\bin\Debug\win-x64`
- Rebuild everything

## Expected Result

After the fix:
1. Click "Connect" button
2. A dock pane appears at the bottom of the screen with:
   - Status indicator (colored circle)
   - Username field
   - Password field
   - "Test Connection" button
   - "Log In" button

## Additional Debug Messages

Once the pane appears, the debug output should show:
```
=== LoginDockPaneView Constructor ===
LoginDockPaneView: DataContext already set to LoginDockPaneViewModel
=== LoginDockPaneViewModel Constructor ===
=== LoginDockPaneViewModel InitializeAsync ===
=== DoTestConnectionAsync ===
Server is reachable
```

## Next Steps

1. **Run the diagnostic above**
2. **Copy the Debug Output**
3. **If it shows "Pane NOT FOUND", send the output for analysis**
4. **If the pane appears, try logging in and monitor for any errors**

---

**File:** `D:\claudeCode CLI\open-claude-code\GIS Archiving Sys\DIAGNOSTIC_INSTRUCTIONS.md`
