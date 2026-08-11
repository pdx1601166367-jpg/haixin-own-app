#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js，请先安装 Node.js 22 或更高版本。"
  exit 1
fi
node server.js >/dev/null 2>&1 &
sleep 1
open "http://127.0.0.1:4567"
