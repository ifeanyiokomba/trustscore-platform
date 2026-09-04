#!/usr/bin/env bash
# TrustScore Stage 2 — browser E2E (fast, single-call)
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

# --- login (ada) ---
$AB find role button click --name "Get started" >/dev/null 2>&1
sleep 1
$AB find role tab click --name "Sign in" >/dev/null 2>&1
sleep 0.6
EMAIL_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Email" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
PW_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Password" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB fill "@${EMAIL_REF}" "ada@example.com" >/dev/null 2>&1
$AB fill "@${PW_REF}" "SuperSecret1" >/dev/null 2>&1
SUBMIT=$($AB snapshot -i 2>/dev/null | grep -E 'tabpanel' -A8 | grep -oE 'button "Sign in" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB click "@${SUBMIT}" >/dev/null 2>&1
sleep 2
echo "--- after login ---"
$AB get text "main" 2>/dev/null | head -2

# --- open consent modal ---
$AB find role button click --name "Continue with NINAuth" >/dev/null 2>&1
sleep 2
echo "--- modal ---"
$AB get text "[role=dialog]" 2>/dev/null | head -6
APPROVE=$($AB snapshot -i 2>/dev/null | grep -oE 'button "Approve" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
echo "approve ref: @${APPROVE}"

# --- approve ---
$AB click "@${APPROVE}" >/dev/null 2>&1
sleep 4
echo "--- dashboard after approve ---"
$AB get text "main" 2>/dev/null | sed -n '/Trust Identity/,/CONSENT RECORDS/p' | head -18
echo "--- identity api state ---"
curl -s http://127.0.0.1:3000/api/v1/identity/me --max-time 10 -b /tmp/e2e_cookie.txt | head -c 200
echo
$AB screenshot /home/z/my-project/research/stage2-verified.png >/dev/null 2>&1
echo "--- dev.log identity trace ---"
grep -E "identity" dev.log | tail -6
