#!/bin/bash
# Keep dev server alive - restarts if it crashes
cd /home/z/my-project
while true; do
  bun run dev > /dev/null 2>&1
  sleep 2
done
