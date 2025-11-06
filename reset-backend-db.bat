@echo off
echo =============================================
echo   Reset TimeBlocks Dev Database (SQLite)
echo =============================================
echo.

REM Navigate to backend directory relative to this script
cd /d "%~dp0backend" || (
    echo ERROR: Could not find the backend directory relative to this script.
    echo        Expected: %~dp0backend
    exit /b 1
)

set "DB=timeblocks-dev.sqlite"

echo Target directory: %CD%
echo Database file   : %DB%
echo.

REM Warn if backend might be holding locks
echo If deletion fails, ensure the backend is stopped before retrying.
echo.

echo Stopping Gradle daemons...
call gradlew.bat --stop >nul 2>&1

echo Terminating any Java processes from this project (if any)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process ^| Where-Object { $_.Name -eq 'java.exe' -and $_.CommandLine -match 'blocks-experiment\\backend' } ^| ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

set "ERR=0"

if exist "%DB%" (
    echo Deleting %DB% ...
    attrib -r "%DB%" >nul 2>&1
    del /q /f "%DB%" >nul 2>&1
    if exist "%DB%" (
        echo ERROR: Could not delete %DB% ^(file may be locked^)
        set "ERR=1"
    )
) else (
    echo No main database file found: %DB%
)

for %%F in ("%DB%-shm" "%DB%-wal") do (
    if exist "%%~F" (
        echo Deleting %%~F ...
        attrib -r "%%~F" >nul 2>&1
        del /q /f "%%~F" >nul 2>&1
        if exist "%%~F" (
            echo WARNING: Could not delete %%~F ^(file may be locked^)
            set "ERR=1"
        )
    ) else (
        echo No WAL/SHM file found: %%~F
    )
)

echo.
if "%ERR%"=="0" (
    echo Reset complete. The database will be recreated on next backend start.
    exit /b 0
) else (
    echo One or more files could not be deleted. Stop the backend and retry.
    exit /b 1
)


