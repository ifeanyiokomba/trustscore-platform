#!/usr/bin/env bash
# provider-simulator launcher — starts the simulator detached (setsid + nohup)
# with a process signature that does NOT match the Next dev restart helpers
# (tests/restart-dev.sh pkills "next dev"/"next-server"/"bun run dev"). The
# simulator SURVIVES dev restarts on purpose: transport calls fail honestly
# (circuit breakers count it) while the app is down and recover after.
set -u
cd /home/z/my-project/mini-services/provider-simulator
if curl -s -o /dev/null --max-time 2 http://127.0.0.1:3032/health; then
  echo "provider-simulator already healthy on :3032"
  exit 0
fi
setsid nohup bun --hot index.ts > simulator.log 2>&1 &
disown
for i in $(seq 1 15); do
  curl -s -o /dev/null http://127.0.0.1:3032/health --max-time 2 && break
  sleep 1
done
curl -s http://127.0.0.1:3032/health && echo " (started)"
