@echo off
echo Starting TimeBlocks Backend...
echo.

REM Set Java environment for this session
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

REM Verify Java works
echo Checking Java...
java -version
if %ERRORLEVEL% neq 0 (
    echo ERROR: Java check failed
    pause
    exit /b 1
)

echo.
echo Java OK! Starting backend...
echo.

REM Navigate to backend directory and run
cd backend
gradlew.bat bootRun --args="--spring.profiles.active=dev"

