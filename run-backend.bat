@echo off
echo Starting TimeBlocks Backend...
echo.

REM Verify Java works
echo Checking Java...
java -version
if %ERRORLEVEL% neq 0 (
    echo ERROR: Java not found or not on PATH. Install Java 17+ or set JAVA_HOME.
    pause
    exit /b 1
)

echo.
echo Java OK! Selecting port and starting backend...
echo.

REM Determine port: use first arg or default 8080; if busy, find next free up to 8099
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8080"

setlocal enabledelayedexpansion
set "CHOSEN_PORT="
for /l %%P in (%PORT%,1,8099) do (
    rem Check if port %%P is LISTENING
    netstat -ano -p tcp | findstr /R ":%%P\s" | findstr /I LISTENING >nul
    if errorlevel 1 (
        set "CHOSEN_PORT=%%P"
        goto :found_port
    )
)

:found_port
if "%CHOSEN_PORT%"=="" (
    echo ERROR: No free TCP port found in range %PORT%-8099
    exit /b 1
)

echo Using port %CHOSEN_PORT%
echo.

REM Navigate to backend directory relative to this script and run
cd /d "%~dp0backend"
call gradlew.bat bootRun --args="--spring.profiles.active=dev --server.port=%CHOSEN_PORT%"
echo.
echo Backend started (or starting). If you don't see errors above, visit:
echo   http://localhost:%CHOSEN_PORT%/api/health

