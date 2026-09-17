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

SIGNED_IN=$($AB eval "!!Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Sign out')" 2>/dev/null | tail -1)
if echo "$SIGNED_IN" | grep -q "true"; then
  $AB find role button click --name "Sign out" >/dev/null 2>&1
  sleep 2
  echo "(stale session cleared)"
fi

# --- login (ada) ---
$AB find role button click --name "Get started" >/dev/null 2>&1
sleep 1
# robust tab switch: retry the native tab click until the Sign-in panel activates
for i in $(seq 1 12); do
  $AB snapshot -i 2>/dev/null | grep -qE 'tabpanel "Sign in"' && break
  $AB find role tab click --name "Sign in" >/dev/null 2>&1
  sleep 0.8
done
EMAIL_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Email" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
PW_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Password" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB fill "@${EMAIL_REF}" "ada@example.com" >/dev/null 2>&1
$AB fill "@${PW_REF}" "SuperSecret1" >/dev/null 2>&1
SUBMIT=$($AB snapshot -i 2>/dev/null | grep -E 'tabpanel' -A8 | grep -oE 'button "Sign in" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB click "@${SUBMIT}" >/dev/null 2>&1
sleep 2
echo "--- after login ---"
$AB get text "main" 2>/dev/null | head -2

# --- open consent modal (CTA differs by identity state) ---
$AB eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Continue with NINAuth') || x.textContent.includes('Re-verify')); if (b) { b.click(); return 'clicked'; } return 'no-cta'; })()" >/dev/null 2>&1
sleep 2
echo "--- modal ---"
$AB get text "[role=dialog]" 2>/dev/null | head -6
APPROVE=$($AB snapshot -i 2>/dev/null | grep -oE 'button "Approve[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
echo "approve ref: @${APPROVE}"

# --- approve ---
$AB click "@${APPROVE}" >/dev/null 2>&1
sleep 4
echo "--- dashboard after approve ---"
$AB get text "main" 2>/dev/null | sed -n '/Trust Identity/,/CONSENT RECORDS/p' | head -18
echo "--- browser identity state ---"
$AB eval "JSON.stringify({verified: document.body.textContent.includes('Government identity verified'), masked: !!document.body.textContent.match(/NINAUTH-\\*\\*\\*\\*/)})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage2-verified.png >/dev/null 2>&1
echo "--- dev.log identity trace ---"
grep -E "identity" dev.log | tail -6
