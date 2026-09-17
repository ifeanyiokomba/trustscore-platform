#!/usr/bin/env bash
# webhook-worker launcher — starts the worker detached (setsid + nohup) with a
# process signature that does NOT match the Next dev restart helpers
# (tests/restart-dev.sh pkills "next dev"/"next-server"/"bun run dev"; this
# process runs as `bun --hot index.ts`). The worker SURVIVES dev restarts on
# purpose: it counts connection errors and keeps ticking when the app is down.
set -u
cd /home/z/my-project/mini-services/webhook-worker
if curl -s -o /dev/null --max-time 2 http://127.0.0.1:3031/health; then
  echo "webhook-worker already healthy on :3031"
  exit 0
fi
setsid nohup bun --hot index.ts > worker.log 2>&1 &
disown
for i in $(seq 1 15); do
  curl -s -o /dev/null http://127.0.0.1:3031/health --max-time 2 && break
  sleep 1
done
curl -s http://127.0.0.1:3031/health && echo " (started)"
