@echo off
setlocal
cd /d "%~dp0backend"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS, then open this file again.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 (
  echo Please install Node.js 24 LTS before continuing.
  pause
  exit /b 1
)
echo Installing required packages. Internet is needed the first time.
call npm ci --omit=dev --ignore-scripts
if errorlevel 1 (
  echo Package installation failed. Check your internet connection and retry.
  pause
  exit /b 1
)
node start-local.js
pause
