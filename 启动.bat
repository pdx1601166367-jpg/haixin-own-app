@echo off
setlocal
cd /d "%~dp0"

set "NODE="
if exist "C:\Program Files\nodejs\node.exe" set "NODE=C:\Program Files\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE if exist "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "NODE=C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined NODE set "NODE=node"

"%NODE%" --version >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js 22 or newer.
  pause
  exit /b 1
)

start "" /min "%NODE%" server.js

set /a tries=0
:waitloop
curl.exe -s -o nul http://127.0.0.1:4567/api/health
if not errorlevel 1 goto open
set /a tries+=1
if %tries% geq 20 (
  echo Local service failed to start. Please check the server window.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto waitloop

:open
start "" "http://127.0.0.1:4567"
endlocal
