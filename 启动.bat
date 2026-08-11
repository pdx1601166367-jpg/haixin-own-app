@echo off
cd /d "%~dp0"
set "NODE=node"
where node >nul 2>nul || set "NODE=C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" (
  echo 未找到 Node.js，请先安装 Node.js 22 或更高版本。
  pause
  exit /b 1
)
start "" /min "%NODE%" server.js
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4567"
