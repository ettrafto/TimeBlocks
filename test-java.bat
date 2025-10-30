@echo off
echo Checking Java installation...
echo.

java -version
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Java is not installed or not in PATH
    echo Please install Java 21 from: https://learn.microsoft.com/en-us/java/openjdk/download
    exit /b 1
)

echo.
echo Checking JAVA_HOME...
if defined JAVA_HOME (
    echo JAVA_HOME is set to: %JAVA_HOME%
) else (
    echo WARNING: JAVA_HOME is not set
    echo This may cause issues with Gradle
)

echo.
echo Java setup looks good!
echo You can now run the backend with:
echo   cd backend
echo   gradlew.bat bootRun --args="--spring.profiles.active=dev"

