#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Please install Node.js 22 or newer."
  exit 1
fi

node server.js >/dev/null 2>&1 &

for i in $(seq 1 20); do
  if curl -s -o /dev/null "http://127.0.0.1:4567/api/health"; then
    break
  fi
  sleep 1
done

open "http://127.0.0.1:4567"
