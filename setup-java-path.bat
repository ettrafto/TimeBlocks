@echo off
echo Setting up Java PATH...
echo.

REM Set JAVA_HOME permanently (system-wide)
setx JAVA_HOME "C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot" /M 2>nul
if %ERRORLEVEL% neq 0 (
    echo Note: Admin rights needed for system-wide setup. Setting for current user only...
    setx JAVA_HOME "C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot"
)

REM Add Java to PATH permanently
setx PATH "%PATH%;C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot\bin" 2>nul

echo.
echo ===================================
echo Java PATH Setup Complete!
echo ===================================
echo.
echo IMPORTANT: Close this terminal and open a NEW one for changes to take effect.
echo.
echo Then verify by running:
echo   java -version
echo.
pause

