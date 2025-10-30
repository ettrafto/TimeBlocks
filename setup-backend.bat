@echo off
echo ================================================
echo   TimeBlocks Backend Setup Script (Windows)
echo ================================================
echo.

REM Check Java version
echo Checking Java installation...
java -version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Java not found. Please install Java 21 or higher.
    exit /b 1
)

for /f "tokens=3" %%g in ('java -version 2^>^&1 ^| findstr /i "version"') do (
    set JAVA_VERSION=%%g
)
echo    Java detected: %JAVA_VERSION%
echo.

REM Initialize Gradle wrapper if not exists
echo Checking Gradle wrapper...
cd backend

if not exist "gradle\wrapper\gradle-wrapper.jar" (
    echo    Gradle wrapper not initialized. Attempting to initialize...
    gradle wrapper >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo ERROR: Gradle not found. Please install Gradle 8.5+ and run: gradle wrapper
        echo    Or download from: https://gradle.org/releases/
        exit /b 1
    )
    echo    Gradle wrapper initialized
) else (
    echo    Gradle wrapper already initialized
)
echo.

REM Build the project
echo Building backend (this may take a minute on first run)...
call gradlew.bat build --no-daemon

if %ERRORLEVEL% equ 0 (
    echo    Build successful
    echo.
    echo ================================================
    echo   Setup Complete!
    echo ================================================
    echo.
    echo To start the backend, run:
    echo   cd backend
    echo   gradlew.bat bootRun --args="--spring.profiles.active=dev"
    echo.
    echo The backend will be available at:
    echo   http://localhost:8080
    echo.
    echo Test it with:
    echo   curl http://localhost:8080/api/health
    echo.
) else (
    echo ERROR: Build failed. Please check the error messages above.
    exit /b 1
)

