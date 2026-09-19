#!/usr/bin/env bash
# TrustScore Stage 16 — Surface Elevation + NINAuth Auth browser E2E
# (single-call pattern).
# Journey: (1) logged-out landing #scoring — the plain ⇄ technical toggle
# works: plain cards + 50-snapshot copy, technical sheet with live rule keys,
# back to plain. (2) The flagship sign-in: "Continue with NINAuth" opens the
# simulated NINAuth app, approval creates a passwordless account and lands
# in the dashboard. (3) Tab intros render on every deep surface with the
# display voice. (4) Score Insights shows the pagination contract. (5)
# Mobile 390: the NINAuth button fits, no overflow. (6) Console/devlog clean.
set -u
cd /home/z/my-project

bash tests/restart-dev.sh
echo "=== server warm ==="
bash mini-services/webhook-worker/start.sh
bash mini-services/provider-simulator/start.sh

AB="agent-browser"
$AB close --all >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1

PASS=0; FAIL=0
check() {
  if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1";
  else FAIL=$((FAIL+1)); echo "  [FAIL] $1 ($2)"; fi
}
evcheck() {
  local V
  V=$($AB eval "JSON.stringify(!!($2))" 2>/dev/null | tail -1)
  if echo "$V" | grep -q "true"; then PASS=$((PASS+1)); echo "  [PASS] $1";
  else FAIL=$((FAIL+1)); echo "  [FAIL] $1 ($V)"; fi
}

# ===========================================================================
echo "--- 1) LANDING: the policy explainer toggle ---"
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 3

$AB eval "document.getElementById('scoring')?.scrollIntoView({block:'start'})" >/dev/null 2>&1
sleep 2

evcheck "toggle renders with plain active by default" \
  "!!document.querySelector('[data-testid=policy-view-toggle]') && (document.querySelector('[data-testid=policy-view-toggle] button[aria-pressed=true]')?.textContent ?? '').includes('Plain language')"

PLAIN_OK=false
for i in $(seq 1 10); do
  V=$($AB eval "JSON.stringify(!!(document.body.textContent.includes('Identity Assurance') && document.body.textContent.includes('Confirmed Risk')))" 2>/dev/null | tail -1)
  if echo "$V" | grep -q true; then PLAIN_OK=true; break; fi
  sleep 1
done
check "plain view loads the five live component cards" "$PLAIN_OK"
evcheck "retention copy reflects the 50-snapshot horizon" \
  "document.body.textContent.includes('last 50 are retained')"

# Switch to technical — direct JS click + polled settle (a11y-tree clicks
# proved flaky on the toggle's animated swap).
$AB eval "Array.from(document.querySelectorAll('[data-testid=policy-view-toggle] button')).find(b=>b.textContent.includes('Technical'))?.click(); 'clicked'" >/dev/null 2>&1
TECH_OK=false
for i in $(seq 1 8); do
  V=$($AB eval "JSON.stringify(!!document.querySelector('[data-testid=policy-technical-sheet]'))" 2>/dev/null | tail -1)
  if echo "$V" | grep -q true; then TECH_OK=true; break; fi
  sleep 1
done
check "technical sheet renders the serialized ruleset" "$TECH_OK"
evcheck "technical sheet shows the exact rule keys" \
  "!!document.querySelector('[data-testid=policy-technical-sheet]') && document.querySelector('[data-testid=policy-technical-sheet]').textContent.includes('assuranceBase') && document.querySelector('[data-testid=policy-technical-sheet]').textContent.includes('credentialMax') && document.querySelector('[data-testid=policy-technical-sheet]').textContent.includes('snapshotTtlHours')"
evcheck "technical sheet carries the governance block" \
  "!!document.querySelector('[data-testid=policy-technical-sheet]') && document.querySelector('[data-testid=policy-technical-sheet]').textContent.includes('dpia.status') && document.querySelector('[data-testid=policy-technical-sheet]').textContent.includes('automatedSignificantDecisions')"
evcheck "plain component cards hidden in technical view" \
  "!document.body.textContent.includes('Verified Credentials')"

# Back to plain — direct JS click + poll
$AB eval "Array.from(document.querySelectorAll('[data-testid=policy-view-toggle] button')).find(b=>b.textContent.includes('Plain language'))?.click(); 'clicked'" >/dev/null 2>&1
PLAIN_BACK=false
for i in $(seq 1 8); do
  V=$($AB eval "JSON.stringify(!!(document.body.textContent.includes('Verified Credentials') && !document.querySelector('[data-testid=policy-technical-sheet]')))" 2>/dev/null | tail -1)
  if echo "$V" | grep -q true; then PLAIN_BACK=true; break; fi
  sleep 1
done
check "plain view restores the component cards" "$PLAIN_BACK"

evcheck "roadmap shows the Surface elevation entry" \
  "document.body.textContent.includes('Surface elevation')"
evcheck "nav badge says Stage 17 · Trust Passport 2.0" \
  "document.body.textContent.includes('Stage 17 · Trust Passport 2.0')"

# ===========================================================================
echo "--- 2) SIGN IN WITH NINAUTH (the flagship flow) ---"
$AB find role button click --name "Get started" >/dev/null 2>&1
sleep 2

evcheck "auth view renders with the NINAuth button on top" \
  "!!document.querySelector('[data-testid=ninauth-signin-button]') && document.querySelector('[data-testid=ninauth-signin-button]')?.textContent.includes('Continue with NINAuth')"
evcheck "email fallback still present below the divider" \
  "document.body.textContent.includes('or use email')"

NIN_EMAIL="e2e-ninauth-$(date +%s)@example.com"
$AB find role button click --name "Continue with NINAuth" >/dev/null 2>&1
sleep 2.5

evcheck "the simulated NINAuth app opens with the consent contract" \
  "document.body.textContent.includes('Continue with NINAuth') && document.body.textContent.includes('What TrustScore will receive')"
evcheck "mock posture is honestly labeled" \
  "document.body.textContent.includes('MOCK NINAUTH APP')"
evcheck "core scopes locked + profile.name optional" \
  "document.body.textContent.includes('Required') && document.body.textContent.includes('Optional')"

# Fill the binding email inside the mock NINAuth app
EMAIL_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Your NINAuth identity[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
if [ -n "$EMAIL_REF" ]; then
  $AB fill "@${EMAIL_REF}" "$NIN_EMAIL" >/dev/null 2>&1
  FILLED=true
else
  FILLED=false
fi
check "binding email filled" "$FILLED"

$AB find role button click --name "Approve & continue" >/dev/null 2>&1
sleep 3

DASH_OK=false
for i in $(seq 1 10); do
  V=$($AB eval "JSON.stringify(!!(document.querySelector('h1')?.textContent?.includes('Welcome back')))" 2>/dev/null | tail -1)
  if echo "$V" | grep -q true; then DASH_OK=true; break; fi
  sleep 1
done
check "passwordless sign-in lands in the dashboard" "$DASH_OK"

evcheck "dashboard carries the Stage 17 badge" \
  "document.body.textContent.includes('Stage 17 · Trust Passport 2.0')"
evcheck "eight dashboard tabs present" \
  "document.querySelectorAll('[role=tab]').length === 8"

# ===========================================================================
echo "--- 3) TAB INTROS on every deep surface ---"
open_tab_and_check() {
  local NAME="$1" LABEL="$2" TITLE="$3"
  $AB find role tab click --name "$LABEL" >/dev/null 2>&1
  sleep 2
  evcheck "$NAME tab intro (display voice)" \
    "Array.from(document.querySelectorAll('[role=tabpanel] h2')).some(h=>h.textContent.includes('$TITLE'))"
}
open_tab_and_check "Passport" "Passport" "Your Trust Passport"
open_tab_and_check "Safety" "Safety" "Check before you deal"
open_tab_and_check "Reputation" "Reputation" "Reputation, done fairly"
open_tab_and_check "Engine" "Engine" "The Trust Engine"
open_tab_and_check "Developers" "Developers" "Build on verified trust"
open_tab_and_check "Network" "Network" "The Trust Network"
open_tab_and_check "Privacy" "Privacy" "Privacy & Security"

evcheck "tab intro headings use the display serif" \
  "Array.from(document.querySelectorAll('[role=tabpanel] h2')).filter(h=>getComputedStyle(h).fontFamily.includes('Fraunces')).length >= 1"

# ===========================================================================
echo "--- 4) SCORE INSIGHTS pagination contract ---"
$AB find role tab click --name "Passport" >/dev/null 2>&1
sleep 3
evcheck "score insights card renders" \
  "document.body.textContent.includes('Why did my score change?')"
PAG_OK=false
for i in $(seq 1 8); do
  V=$($AB eval "JSON.stringify(!!(document.querySelector('[data-testid=load-older-snapshots]') || document.querySelector('[data-testid=history-beginning]')))" 2>/dev/null | tail -1)
  if echo "$V" | grep -q true; then PAG_OK=true; break; fi
  sleep 1
done
check "pagination affordance present (load older OR beginning note)" "$PAG_OK"
evcheck "timeline label shows the retained-window count" \
  "document.body.textContent.includes('retained')"

# ===========================================================================
echo "--- 5) MOBILE 390 — the NINAuth button fits ---"
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1.5
evcheck "no horizontal overflow on mobile dashboard" \
  "document.documentElement.scrollWidth <= 390"
# Fresh logged-out landing (the signed-in hero CTA says "Open your
# dashboard", not "Get started" — reset the session first).
$AB cookies clear >/dev/null 2>&1
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 2
evcheck "mobile landing has no overflow" \
  "document.documentElement.scrollWidth <= 390"
# Click the VISIBLE hero CTA (mobile: "Create your account" — the nav's
# "Get started" lives in the hidden desktop bar / closed Sheet).
$AB eval "Array.from(document.querySelectorAll('button')).filter(b=>/^(Create your account|Get started)$/.test(b.textContent.trim()) && b.offsetParent!==null)[0]?.click(); 'clicked'" >/dev/null 2>&1
sleep 2.5
evcheck "auth view renders on mobile with the NINAuth button" \
  "!!document.querySelector('[data-testid=ninauth-signin-button]')"
evcheck "NINAuth button fits on mobile (no overflow)" \
  "document.documentElement.scrollWidth <= 390 && !!document.querySelector('[data-testid=ninauth-signin-button]')"

# ===========================================================================
echo "--- 6) CONSOLE + DEVLOG ---"
CONSOLE=$($AB console 2>/dev/null | grep -ciE "\"?type\"?[: ]+\"?error" || true)
if [ "$CONSOLE" = "0" ]; then check "no console errors captured" true; else check "no console errors captured" "$CONSOLE error(s)"; fi
ERRORS=$(grep -E "Unhandled|✗|TypeError|ReferenceError" /home/z/my-project/dev.log | grep -v "webhook-tick" | tail -3)
if [ -z "$ERRORS" ]; then check "dev.log clean" true; else check "dev.log clean" "$ERRORS"; fi

echo
echo "RESULT: $PASS passed, $FAIL failed"
$AB screenshot /home/z/my-project/research/s16-mobile-auth.png >/dev/null 2>&1
[ "$FAIL" -eq 0 ]
