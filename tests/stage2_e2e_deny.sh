#!/usr/bin/env bash
# TrustScore Stage 2 — browser E2E: DENY path (fresh user)
set -u
cd /home/z/my-project

pkill -f "next dev" 2>/dev/null
sleep 1
setsid nohup bun run dev </dev/null >/home/z/my-project/dev.log 2>&1 &
disown
for i in $(seq 1 30); do
  curl -s -o /dev/null http://127.0.0.1:3000 --max-time 3 && break
  sleep 1
done
echo "server warm"

AB="agent-browser"
$AB cookies clear >/dev/null 2>&1
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1

# --- register fresh user ---
$AB find role button click --name "Get started" >/dev/null 2>&1
sleep 1
NAME_R=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Full name" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+')
HANDLE_R=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Your Trust handle" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+')
EMAIL_R=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Email" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+')
$AB fill "@${NAME_R}" "Ngozi Ude" >/dev/null 2>&1
$AB fill "@${HANDLE_R}" "ngozi" >/dev/null 2>&1
$AB fill "@${EMAIL_R}" "ngozi@example.com" >/dev/null 2>&1
PW_R=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Password" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+')
CONF_R=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Confirm" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+')
$AB fill "@${PW_R}" "DenyFlow123!" >/dev/null 2>&1
$AB fill "@${CONF_R}" "DenyFlow123!" >/dev/null 2>&1
$AB find role checkbox check --name "I accept the Terms" >/dev/null 2>&1
$AB find role button click --name "Create account" >/dev/null 2>&1
sleep 2.5
echo "--- registered ---"
$AB get text "main" 2>/dev/null | head -2

# --- open modal, DENY ---
$AB find role button click --name "Continue with NINAuth" >/dev/null 2>&1
sleep 2
DENY_R=$($AB snapshot -i 2>/dev/null | grep -oE 'button "Deny" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
echo "deny ref: @${DENY_R}"
$AB click "@${DENY_R}" >/dev/null 2>&1
sleep 2.5
echo "--- after deny (modal should close, no identity) ---"
$AB get text "main" 2>/dev/null | sed -n '/Trust Identity/,/Account activity/p' | head -12
$AB screenshot /home/z/my-project/research/stage2-deny.png >/dev/null 2>&1
echo "--- dev.log ---"
grep -E "identity" dev.log | tail -4
