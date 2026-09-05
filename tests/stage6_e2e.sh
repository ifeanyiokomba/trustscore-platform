#!/usr/bin/env bash
# TrustScore Stage 6 — browser E2E (single-call pattern per worklog quirk).
# Journey: login (ada) → dashboard 4 tabs + Stage 6 badge → Safety Check tab
# → self handle-check (assessment panel: headline, chips, signals, explanation,
# self note) → history row → UNAVAILABLE handle (bob, checks off) + trust
# request sent (bob's PENDING asserted via API) → passport: create trust link
# → safety console: link check (score via SCORE scope, receipt notice) → QR
# method (URL payload) → Privacy tab: safety consent toggle + scope rows +
# received-checks feed → mobile 390 + dark + console + devlog.
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
echo "=== server warm ==="

AB="agent-browser"
$AB close --all >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1

# --- second user (bob) via API: checks OFF → uncheckable + trust request target
BOB_STAMP=$(( $(date +%s) % 100000000 ))
curl -s -m 30 -c /tmp/bob.jar -X POST http://127.0.0.1:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"bobe2e_${BOB_STAMP}@example.com\",\"password\":\"SuperSecret1\",\"displayName\":\"Bob E2E\",\"handle\":\"bobe2e_${BOB_STAMP}\",\"acceptTerms\":true}" -o /dev/null
BOB_HANDLE="bobe2e_${BOB_STAMP}"
echo "bob handle: $BOB_HANDLE"

# --- helpers ---------------------------------------------------------------
login_ada() {
  $AB open http://127.0.0.1:3000 >/dev/null 2>&1
  sleep 1.5
  $AB find role button click --name "Get started" >/dev/null 2>&1
  sleep 1
  for i in $(seq 1 12); do
    $AB snapshot -i 2>/dev/null | grep -qE 'tabpanel "Sign in"' && break
    $AB find role tab click --name "Sign in" >/dev/null 2>&1
    sleep 0.8
  done
  EMAIL_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Email" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
  PW_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Password" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
  $AB fill "@${EMAIL_REF}" "ada@example.com" >/dev/null 2>&1
  $AB fill "@${PW_REF}" "SuperSecret1" >/dev/null 2>&1
  SUBMIT=$($AB snapshot -i 2>/dev/null | grep -E 'tabpanel' -A10 | grep -oE 'button "Sign in" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
  $AB click "@${SUBMIT}" >/dev/null 2>&1
  sleep 3
}

tab_click() {
  for i in $(seq 1 10); do
    $AB eval "document.querySelector('[role=tab][data-state=active]')?.textContent?.includes('$1')" 2>/dev/null | grep -q true && return 0
    $AB find role tab click --name "$1" >/dev/null 2>&1
    sleep 0.8
  done
  return 1
}

# wait for a NEW result panel (distinct checkid) — assessment OR unavailable
await_result() {
  for i in $(seq 1 25); do
    FOUND=$($AB eval "!!(document.querySelector('[data-testid=safety-assessment]') || document.querySelector('[data-testid=safety-unavailable]') || document.querySelector('[data-testid=safety-dead-link]'))" 2>/dev/null | tail -1)
    echo "$FOUND" | grep -q true && return 0
    sleep 0.8
  done
  return 1
}

fill_safety_input() {
  REF=$($AB snapshot -i 2>/dev/null | grep -oE "textbox \"[^\"]+\" \[ref=e[0-9]+\]" | grep -oE 'e[0-9]+' | head -1)
  $AB fill "@${REF}" "$1" >/dev/null 2>&1
}

run_check() {
  PREV=$($AB eval "document.querySelector('[data-testid=safety-result]')?.getAttribute('data-checkid') || 'none'" 2>/dev/null | tail -1 | tr -d '"')
  $AB find role button click --name "Run safety check" >/dev/null 2>&1
  # wait for a result whose checkid differs from the previous one
  for i in $(seq 1 25); do
    CUR=$($AB eval "document.querySelector('[data-testid=safety-result]')?.getAttribute('data-checkid') || 'absent'" 2>/dev/null | tail -1 | tr -d '"')
    if [ "$CUR" != "absent" ] && [ "$CUR" != "$PREV" ]; then return 0; fi
    sleep 0.8
  done
  # fall back: any panel at all
  await_result
}

login_ada
echo "--- 1. dashboard tabs ---"
$AB eval "JSON.stringify({h1: document.querySelector('h1')?.textContent, stage6: document.body.textContent.includes('Stage 6 · Safety Check'), tabs: Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent.trim())})" 2>&1 | tail -1

# --- 2. Safety Check tab: console + self-check ------------------------------
tab_click "Safety Check"
sleep 2.5
echo "--- 2. safety console ---"
$AB eval "JSON.stringify({title: document.body.textContent.includes('Check before you deal'), methodTabs: document.querySelectorAll('[data-testid^=safety-method-]').length, runBtn: !!document.querySelector('[data-testid=safety-run]'), input: !!document.querySelector('[data-testid=safety-input]'), privacyCopy: document.body.textContent.includes('receipted to them with your name')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage6-console.png >/dev/null 2>&1

fill_safety_input "ada"
run_check
echo "--- 3. self-check assessment ---"
$AB eval "JSON.stringify({panel: !!document.querySelector('[data-testid=safety-assessment]'), headline: document.querySelector('[data-testid=safety-headline]')?.textContent?.slice(0,40), selfNote: document.body.textContent.includes('Your own profile — no receipt is written'), chips: document.querySelectorAll('[data-testid=safety-assessment] [data-slot=badge]').length, dots: document.body.textContent.includes('L'), signals: document.querySelectorAll('[data-testid=safety-signals] li').length, creds: document.body.textContent.includes('active credential'), receiptNotice: document.body.textContent.includes('This check was receipted')})" 2>&1 | tail -1
# explanation collapsible
$AB find role button click --name "Why this assessment? (read the evidence)" >/dev/null 2>&1
sleep 0.8
$AB eval "JSON.stringify({explOpen: document.body.textContent.includes('Identity Assurance'), explHonest: document.body.textContent.includes('honest zero'), disclaimer: document.body.textContent.includes('not a guarantee that a person is safe to deal with')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage6-self-assessment.png >/dev/null 2>&1
# history row
echo "--- 4. history ---"
$AB eval "JSON.stringify({rows: document.querySelectorAll('[data-testid=safety-history-row]').length, selfRow: document.body.textContent.includes('Self-check')})" 2>&1 | tail -1

# --- 5. UNAVAILABLE handle + trust request ----------------------------------
fill_safety_input "$BOB_HANDLE"
run_check
echo "--- 5. unavailable + trust request ---"
$AB eval "JSON.stringify({unavailable: !!document.querySelector('[data-testid=safety-unavailable]'), message: document.body.textContent.includes('No safety-check profile is available'), deliberate: document.body.textContent.includes('never reveals whether a handle exists'), requestCta: !!document.querySelector('[data-testid=safety-request-btn]')})" 2>&1 | tail -1
$AB find role button click --name "Send trust request" >/dev/null 2>&1
for i in $(seq 1 12); do
  $AB eval "!!document.querySelector('[data-testid=safety-request-sent]')" 2>/dev/null | grep -q true && break
  sleep 0.8
done
$AB eval "JSON.stringify({sent: !!document.querySelector('[data-testid=safety-request-sent]'), sentText: document.body.textContent.includes('Request sent — they have 7 days')})" 2>&1 | tail -1
# bob's side: PENDING request from ada (API assertion with bob's session)
sleep 1
curl -s -m 30 -b /tmp/bob.jar http://127.0.0.1:3000/api/v1/safety/me | python3 -c "
import json,sys
d=json.load(sys.stdin)
pend=[r for r in d['requestsReceived'] if r['status']=='PENDING']
print('bob pending from ada:', any(r['verifier'] and r['verifier']['handle']=='ada' for r in pend))
" 2>&1 | tail -1

# --- 6. trust link check (via passport-created token) ------------------------
tab_click "Trust Passport"
sleep 3
CREATED=0
for attempt in 1 2 3; do
  $AB find role button click --name "Share" >/dev/null 2>&1
  sleep 1.5
  $AB find role button click --name "Create Trust Link" >/dev/null 2>&1
  for i in $(seq 1 15); do
    $AB eval "!!document.querySelector('[data-testid=raw-token]')" 2>/dev/null | grep -q true && CREATED=1 && break
    sleep 0.8
  done
  [ "$CREATED" = "1" ] && break
  echo "  (create attempt $attempt pending — waiting 65s for the rate window)"
  sleep 65
done
TOKEN=$($AB eval "document.querySelector('[data-testid=raw-token]')?.textContent" 2>/dev/null | tail -1 | tr -d '"' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
echo "created token-len: ${#TOKEN}"
$AB find role button click --name "Done" >/dev/null 2>&1
sleep 2

tab_click "Safety Check"
sleep 1.5
$AB find role tab click --name "Trust link" >/dev/null 2>&1
sleep 1
fill_safety_input "$TOKEN"
run_check
echo "--- 6. link-check assessment ---"
$AB eval "JSON.stringify({panel: !!document.querySelector('[data-testid=safety-assessment]'), method: document.body.textContent.includes('Trust link'), score: document.body.textContent.includes('Score'), receiptNotice: document.body.textContent.includes('member sees who checked'), subject: document.body.textContent.includes('@ada')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage6-link-assessment.png >/dev/null 2>&1

# --- 7. QR method (URL payload) ----------------------------------------------
$AB find role tab click --name "QR scan" >/dev/null 2>&1
sleep 1
fill_safety_input "http://127.0.0.1:3000/?trust=$TOKEN"
run_check
echo "--- 7. QR-check assessment ---"
$AB eval "JSON.stringify({panel: !!document.querySelector('[data-testid=safety-assessment]'), qrLabel: document.body.textContent.includes('QR scan')})" 2>&1 | tail -1

# --- 8. Privacy tab: safety consent + received checks ------------------------
# deterministic reset: turn ada's safety consent OFF via the browser session,
# then reload so the card mounts with fresh state.
$AB eval "fetch('/api/v1/safety/settings', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({enabled:false, includeProfile:false, includeSignals:false, allowPhoneMatch:false})}).then(r=>r.status)" >/dev/null 2>&1
sleep 1.5
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
sleep 4
tab_click "Privacy & Security"
sleep 2.5
echo "--- 8. safety consent (subject side) ---"
$AB eval "JSON.stringify({consentCard: document.body.textContent.includes('Safety Check consent'), offState: document.body.textContent.includes('Safety checks on your handle are'), toggle: !!document.querySelector('[data-testid=safety-toggle]'), stats: document.body.textContent.includes('Checks received')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage6-privacy-off.png >/dev/null 2>&1
$AB eval "document.querySelector('[data-testid=safety-toggle]')?.click(); 'toggled'" >/dev/null 2>&1
sleep 2.5
$AB eval "JSON.stringify({onState: document.body.textContent.includes('Members can run a receipted safety check'), scopeRows: document.querySelectorAll('[data-testid^=safety-scope-]').length, received: document.querySelectorAll('[data-testid=safety-received-row]').length, namedVerifier: document.body.textContent.includes('@ada')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage6-privacy-on.png >/dev/null 2>&1

# --- 9. mobile + dark + console ----------------------------------------------
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1
echo "--- 9. mobile 390 ---"
$AB eval "JSON.stringify({hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage6-mobile.png >/dev/null 2>&1
$AB set viewport 1280 800 >/dev/null 2>&1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1
sleep 1
echo "--- dark ---"
$AB eval "JSON.stringify({dark: document.documentElement.classList.contains('dark')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage6-dark.png >/dev/null 2>&1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1
sleep 0.5

echo "--- 10. console + devlog ---"
$AB eval "JSON.stringify((window.__consoleErrors ?? []))" 2>&1 | tail -1
grep -iE "error|fail" dev.log | grep -v favicon | tail -6 || echo "dev.log clean"
echo "=== STAGE 6 E2E DONE ==="
