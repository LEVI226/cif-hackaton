#!/bin/bash
# Dev server keepalive script
cd "$(dirname "$0")"
while true; do
  echo "[$(date)] Starting dev server..."
  bun run dev > /dev/null 2>&1
  echo "[$(date)] Dev server exited, restarting in 3s..."
  sleep 3
done
