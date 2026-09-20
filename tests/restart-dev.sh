#!/usr/bin/env bash
# TrustScore — dev-server restart helper (single call pattern).
# Turbopack dev accumulates RSS on recompiles and the sandbox OOM-killer
# eventually kills next-server (~2.4GB). Bundling restart + test in ONE
# bash call is the documented workaround (worklog Stage 6+).
set -u
# CI-portable: derive the repo root from this script's location (tests/..)
# instead of hardcoding the sandbox path.
cd "$(dirname "$0")/.."
pkill -f "next-server" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "bun run dev" 2>/dev/null
sleep 1.5
setsid nohup bun run dev </dev/null >./dev.log 2>&1 &
disown
for i in $(seq 1 40); do
  curl -s -o /dev/null http://127.0.0.1:3000 --max-time 3 && exit 0
  sleep 1
done
echo "WARN: server did not warm up in 40s" >&2
exit 1
