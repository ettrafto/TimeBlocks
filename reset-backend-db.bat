@echo off
setlocal
echo =============================================
echo   Reset TimeBlocks Dev Database (SQLite)
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
set "DB=timeblocks-dev.sqlite"
set "ERR=0"

echo Backend directory: %CD%
echo Database file    : %DB%
echo.

echo Stopping Gradle daemons...
call "%GRADLEW%" --stop >nul 2>&1

echo Terminating any java.exe processes launched from this backend (best-effort)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process ^| Where-Object { $_.Name -eq 'java.exe' -and $_.CommandLine -match 'blocks-experiment\\backend' } ^| ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
echo.

echo === Step 1: Clean dev SQLite files via Gradle task ===
REM Uses backend/build.gradle.kts::devCleanDb to remove SQLite + WAL/SHM safely.
call "%GRADLEW%" devCleanDb
if errorlevel 1 (
    echo ERROR: gradlew devCleanDb failed. Make sure no backend is running and try again.
    set "ERR=1"
) else (
    echo SQLite files removed via devCleanDb.
)
echo.

if "%ERR%"=="0" (
    echo === Step 2: Seed development admin account ===
    REM Seeds via backend/build.gradle.kts::seedAdmin (requires Java 21 toolchain).
    echo (username: admin@local.test  password: Admin123!)
    call "%GRADLEW%" seedAdmin
    if errorlevel 1 (
        echo ERROR: gradlew seedAdmin failed. Check backend logs for details.
        set "ERR=1"
    ) else (
        echo Admin account refreshed successfully.
    )
    echo.
)

popd >nul

echo -------------------------------------------------
if "%ERR%"=="0" (
    echo Reset complete. Start the backend to recreate schema/data.
    exit /b 0
) else (
    echo Reset failed. Resolve the errors above and rerun the script.
    exit /b 1
)
