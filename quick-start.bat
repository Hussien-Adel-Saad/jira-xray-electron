@echo off
REM Quick Start Script for Jira/Xray Orchestrator (Windows)

echo =======================================
echo 🚀 Jira/Xray Orchestrator - Quick Start
echo =======================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected
node -v
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed!
    pause
    exit /b 1
)

echo ✅ npm detected
npm -v
echo.

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ package.json not found!
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
echo.

REM Install dependencies
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Installation failed!
    echo.
    echo Common fix for Windows:
    echo 1. Run as Administrator
    echo 2. Install windows-build-tools:
    echo    npm install --global windows-build-tools
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Dependencies installed successfully!
echo.

REM Run type check
echo 🔍 Running TypeScript checks...
call npm run type-check

if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  TypeScript errors found ^(non-critical^)
) else (
    echo ✅ TypeScript checks passed
)

echo.
echo =======================================
echo 🎉 Setup Complete!
echo =======================================
echo.
echo To start the application:
echo.
echo   npm run electron:dev
echo.
echo To build for production:
echo.
echo   npm run electron:build
echo.
echo 📚 Documentation:
echo   - INSTALLATION.md - Installation guide
echo   - DEVELOPMENT.md  - Development guide
echo   - ARCHITECTURE.md - System architecture
echo   - CHECKLIST.md    - Complete file list
echo.
echo Happy coding! 🚀
echo.
pause