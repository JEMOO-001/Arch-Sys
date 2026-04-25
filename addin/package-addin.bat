@echo off
setlocal

set "TARGET_DIR=%~1"
set "PROJECT_DIR=%~2"
set "PRO_ADDIN_FOLDER=%~3"
set "ADDIN_NAME=%~4"

set "ZIP_PATH=%PRO_ADDIN_FOLDER%%ADDIN_NAME%.zip"
set "FINAL_PATH=%PRO_ADDIN_FOLDER%%ADDIN_NAME%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '%TARGET_DIR%ArcLayoutSentinel.dll', '%TARGET_DIR%ArcLayoutSentinel.deps.json', '%PROJECT_DIR%src\Config.daml' -DestinationPath '%ZIP_PATH%' -Force; Move-Item -Path '%ZIP_PATH%' -Destination '%FINAL_PATH%' -Force"

echo SENTINEL: Add-in packaged at %FINAL_PATH%
