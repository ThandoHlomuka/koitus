@echo off
echo ========================================
echo   KOITUS REAL-TIME SERVER STARTER
echo ========================================
echo.

cd /d "%~dp0"

echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install

echo.
echo Starting server...
echo.
call npm start

pause
