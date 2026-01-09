@echo off
setlocal
echo =============================================
echo   Seed Example Data for Admin Account
echo =============================================
echo.

REM Locate backend directory relative to this script
set "BACKEND_DIR=%~dp0backend"
if not exist "%BACKEND_DIR%" (
    echo ERROR: Could not find backend directory. Expected path: %BACKEND_DIR%
    exit /b 1
)

pushd "%BACKEND_DIR%" >nul || (
    echo ERROR: Unable to change directory to %BACKEND_DIR%
    exit /b 1
)

set "GRADLEW=gradlew.bat"
set "ERR=0"

echo Backend directory: %CD%
echo.

echo === Seeding example data ===
echo (This creates event types, tasks, and calendar events for admin@local.test)
echo.
call "%GRADLEW%" seedExampleData
if errorlevel 1 (
    echo ERROR: gradlew seedExampleData failed. Check backend logs for details.
    set "ERR=1"
) else (
    echo.
    echo Example data seeded successfully!
    echo.
    echo Created:
    echo   - Event Types: Deep Work, Meeting, Workout, Break, Personal
    echo   - Tasks: 4 sample tasks
    echo   - Calendar Events: 5 events (today and tomorrow)
)

popd >nul

echo -------------------------------------------------
if "%ERR%"=="0" (
    echo Seed complete. Start the backend to see the data.
) else (
    echo Seed failed. Make sure the backend database exists and admin account is seeded.
)
echo.
pause

