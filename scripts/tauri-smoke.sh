#!/bin/zsh
set -euo pipefail
setopt null_glob

APP_GLOB1="src-tauri/target/aarch64-apple-darwin/release/bundle/macos/*.app"
APP_GLOB2="src-tauri/target/release/bundle/macos/*.app"

APPS=($~APP_GLOB1 $~APP_GLOB2)
if [ ${#APPS[@]} -gt 0 ]; then
  APP=$(ls -td -- "${APPS[@]}" | head -1)
else
  APP=""
fi

if [ -z "$APP" ]; then
  echo "ERROR: No .app bundle found at $APP_GLOB1 or $APP_GLOB2"
  echo "Run first: bun run tauri:build"
  exit 1
fi

echo "Launching: $APP"
mkdir -p .sisyphus/evidence
open "$APP"
sleep 5

if pgrep -f "omo-switch" > /dev/null 2>&1; then
  echo "PASS: omo-switch process is running"
  pgrep -f "omo-switch" >> .sisyphus/evidence/task-10-app-smoke.log 2>&1 || true
else
  echo "FAIL: omo-switch process not found after 5 seconds"
  exit 1
fi

pkill -f "omo-switch" 2>/dev/null || true
echo "App terminated cleanly"
