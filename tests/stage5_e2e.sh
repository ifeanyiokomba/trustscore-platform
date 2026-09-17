#!/usr/bin/env bash
# TrustScore Stage 5 — browser E2E (single-call pattern per worklog quirk).
# Journey: login (ada) → dashboard tabs → Trust Passport tab (score gauge +
# component breakdown + NDPA explanation + honest zeros) → create Trust Link
# (dialog: options → created panel: QR + once-only token; rate-window aware)
# → active link row → public Trust Card viewer (?trust=) → receipts + change
# alert back in the dashboard → second session remote revoke → revoke trust
# link → dead link view → DSR export request → mobile + dark + console.
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

login_ada
echo "--- 1. dashboard tabs ---"
$AB eval "JSON.stringify({h1: document.querySelector('h1')?.textContent, stage5: document.body.textContent.includes('Stage 5 · Trust Passport'), tabs: Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent.trim())})" 2>&1 | tail -1

# --- 2. Trust Passport tab --------------------------------------------------
tab_click "Trust Passport"
sleep 3
echo "--- 2. passport tab ---"
$AB eval "JSON.stringify({gauge: !!document.querySelector('[role=tabpanel][data-state=active] svg circle'), score: document.querySelector('.ts-grad-text')?.textContent, compLabels: document.querySelectorAll('[role=tabpanel][data-state=active] .text-xs.font-semibold').length, honestZero: document.body.textContent.includes('opens next stages'), ndpa: document.body.textContent.includes('NDPA'), credentialsCard: document.body.textContent.includes('Credentials'), trustCardVisual: !!document.querySelector('.ts-trust-card'), shareBtn: !!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Share')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage5-passport-tab.png >/dev/null 2>&1

# --- 3. share dialog: create link (rate-window aware) -----------------------
echo "--- 3. share dialog ---"
$AB find role button click --name "Share" >/dev/null 2>&1
sleep 1.5
$AB eval "JSON.stringify({dialog: !!document.querySelector('[role=dialog]'), title: document.querySelector('[role=dialog] h2')?.textContent, ttl: !!document.querySelector('[role=dialog] [role=combobox]'), scopeToggles: document.querySelectorAll('[role=dialog] [aria-pressed]').length})" 2>&1 | tail -1
# click Create with retry: if the rate window is still hot from a previous
# suite, the fetch 429s and the dialog stays in create-state — wait it out.
CREATED=0
for attempt in 1 2 3; do
  $AB find role button click --name "Create Trust Link" >/dev/null 2>&1
  for i in $(seq 1 15); do
    $AB eval "!!document.querySelector('[data-testid=raw-token]')" 2>/dev/null | grep -q true && CREATED=1 && break
    sleep 0.8
  done
  [ "$CREATED" = "1" ] && break
  echo "  (create attempt $attempt pending — waiting 65s for the rate window)"
  sleep 65
done
echo "created-panel: $CREATED"
$AB eval "JSON.stringify({title: document.querySelector('[role=dialog] h2')?.textContent, token: (document.querySelector('[data-testid=raw-token]')?.textContent||'').slice(0,6)+'…', qrSvg: !!document.querySelector('[data-testid=qr-code] svg'), copyLink: !!Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.includes('Copy link')), png: !!Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.includes('QR (.png)')), scopes: document.querySelector('[role=dialog] .ts-trust-card')?.textContent.includes('PROFILE')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage5-share-dialog.png >/dev/null 2>&1
TOKEN=$($AB eval "document.querySelector('[data-testid=raw-token]')?.textContent" 2>/dev/null | tail -1 | tr -d '"' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
echo "token-len: ${#TOKEN}"
$AB find role button click --name "Done" >/dev/null 2>&1
sleep 2

# --- 4. active link row -----------------------------------------------------
echo "--- 4. active link row ---"
$AB eval "JSON.stringify({activeRows: document.querySelectorAll('[data-testid=share-token-row]').length, liveRow: document.body.textContent.includes('live'), opens: document.body.textContent.includes('opens'), revokeBtn: !!Array.from(document.querySelectorAll('[role=tabpanel][data-state=active] button')).find(b=>b.textContent.trim()==='Revoke')})" 2>&1 | tail -1

# --- 5. public trust viewer -------------------------------------------------
echo "--- 5. public viewer ---"
$AB open "http://127.0.0.1:3000/?trust=$TOKEN" >/dev/null 2>&1
sleep 3
$AB eval "JSON.stringify({brand: document.body.textContent.includes('TrustScore'), profile: document.body.textContent.includes('Ada Obi'), handle: document.body.textContent.includes('@ada'), adverse: document.body.textContent.includes('No confirmed adverse signals found'), disclaimer: document.body.textContent.includes('not a guarantee'), receiptNotice: document.body.textContent.includes(\"recorded to the owner's trust receipts\"), signals: document.body.textContent.includes('Verified signals'), credentials: document.body.textContent.includes('Active credentials'), noAuthSurface: !document.body.textContent.includes('Sign out')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage5-public-viewer.png >/dev/null 2>&1

# --- 6. receipts + change alert (back in dashboard) -------------------------
login_ada
tab_click "Privacy & Security"
sleep 3
echo "--- 6. receipts + alerts ---"
$AB eval "JSON.stringify({receipts: document.body.textContent.includes('Trust link viewer'), sawScore: document.body.textContent.includes('saw score'), notifViewed: document.body.textContent.includes('Your Trust Card was viewed'), timelineViewed: document.body.textContent.includes('Trust Card viewed'), dsrCard: document.body.textContent.includes('Your data rights'), sessions: document.body.textContent.includes('Active sessions')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage5-privacy-tab.png >/dev/null 2>&1

# --- 7. remote session revoke (second session via curl login) ---------------
echo "--- 7. remote session revoke ---"
rm -f /tmp/ada2.jar
curl -s -c /tmp/ada2.jar -X POST http://127.0.0.1:3000/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"ada@example.com","password":"SuperSecret1"}' >/dev/null
$AB reload >/dev/null 2>&1
sleep 3
tab_click "Privacy & Security" >/dev/null 2>&1
sleep 2.5
$AB eval "JSON.stringify({sessionRows: document.querySelectorAll('[data-testid=session-row]').length, thisDevice: document.body.textContent.includes('this device')})" 2>&1 | tail -1
$AB eval "(() => { const btns = Array.from(document.querySelectorAll('[data-testid=session-row] button')).filter(b => b.textContent.trim() === 'Revoke'); if (btns[0]) btns[0].click(); return btns.length; })()" 2>&1 | tail -1
sleep 1.5
$AB eval "(() => { const dlg = document.querySelector('[role=alertdialog]'); const act = Array.from(dlg?.querySelectorAll('button') || []).find(b => b.textContent.includes('Revoke session')); if (act) act.click(); return !!dlg; })()" 2>&1 | tail -1
sleep 2.5
$AB eval "JSON.stringify({sessionRowsAfter: document.querySelectorAll('[data-testid=session-row]').length, stillSignedIn: !!document.querySelector('[role=tab]'), revokedEvent: document.body.textContent.includes('A session was revoked')})" 2>&1 | tail -1
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/ada2.jar http://127.0.0.1:3000/api/v1/passport/me)
echo "second-session-after-revoke: $CODE (want 401)"

# --- 8. revoke trust link → dead link ---------------------------------------
echo "--- 8. revoke trust link ---"
tab_click "Trust Passport" >/dev/null 2>&1
sleep 2.5
$AB eval "(() => { const btns = Array.from(document.querySelectorAll('[role=tabpanel][data-state=active] button')).filter(b => b.textContent.trim() === 'Revoke'); if (btns[0]) btns[0].click(); return btns.length; })()" 2>&1 | tail -1
sleep 1.5
$AB eval "(() => { const dlg = document.querySelector('[role=alertdialog]'); const act = Array.from(dlg?.querySelectorAll('button') || []).find(b => b.textContent.includes('Revoke link')); if (act) act.click(); return !!dlg; })()" 2>&1 | tail -1
sleep 2.5
$AB eval "JSON.stringify({historySection: document.body.textContent.includes('revoked')})" 2>&1 | tail -1
$AB open "http://127.0.0.1:3000/?trust=$TOKEN" >/dev/null 2>&1
sleep 3
$AB eval "JSON.stringify({deadTitle: document.body.textContent.includes('Link no longer active'), revokedMsg: document.body.textContent.includes('revoked by its owner')})" 2>&1 | tail -1

# --- 9. DSR export request ---------------------------------------------------
login_ada
tab_click "Privacy & Security" >/dev/null 2>&1
sleep 3
echo "--- 9. DSR export ---"
$AB eval "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().includes('Export')); if (btn) btn.click(); return !!btn; })()" 2>&1 | tail -1
sleep 4
$AB eval "JSON.stringify({exportHistory: document.body.textContent.includes('Data export'), readyNotif: document.body.textContent.includes('data export'), ndpa: document.body.textContent.includes('NDPA')})" 2>&1 | tail -1

# --- 10. mobile + dark + console ---------------------------------------------
echo "--- 10. mobile + dark + console ---"
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1
$AB eval "JSON.stringify({hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage5-mobile.png >/dev/null 2>&1
$AB set viewport 1280 800 >/dev/null 2>&1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1
sleep 1.2
$AB eval "JSON.stringify({dark: document.documentElement.classList.contains('dark')})" 2>&1 | tail -1
tab_click "Trust Passport" >/dev/null 2>&1
sleep 2.5
$AB screenshot /home/z/my-project/research/stage5-dark.png >/dev/null 2>&1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1
sleep 0.5
echo "--- 11. console + devlog ---"
$AB eval "JSON.stringify((window.__consoleErrors ?? []))" 2>&1 | tail -1
grep -iE "⨯|error" dev.log | grep -v favicon | grep -v "Cross origin" | tail -5 || echo "dev.log clean"
echo "=== STAGE 5 E2E DONE ==="
