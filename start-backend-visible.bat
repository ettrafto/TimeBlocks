@echo off
echo ========================================
echo Starting TimeBlocks Backend (Visible)
echo ========================================
echo.

REM Set Java environment
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

REM Navigate to backend
cd /d "%~dp0backend"

echo Current directory: %CD%
echo.
echo Starting Spring Boot...
echo (This may take 30-60 seconds on first run)
echo.

REM Run gradle with visible output
gradlew.bat bootRun --args="--spring.profiles.active=dev"

pause

