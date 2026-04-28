@echo off
setlocal

set "TARGET_DIR=%~1"
set "PROJECT_DIR=%~2"
set "PRO_ADDIN_FOLDER=%~3"
set "ADDIN_NAME=%~4"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0package-addin.ps1" -TargetDir "%TARGET_DIR%" -ProjectDir "%PROJECT_DIR%" -ProAddInFolder "%PRO_ADDIN_FOLDER%" -AddInName "%ADDIN_NAME%"
