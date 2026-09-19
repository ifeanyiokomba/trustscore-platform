#!/usr/bin/env bash
# TrustScore Stage 15 — Design Elevation browser E2E (single-call pattern).
# Journey: (1) logged-out landing — the design system is live: Fraunces on
# the H1/H2s (computed style), animated hero stats settle, roadmap shows the
# "Design elevation" entry, badges say Stage 15. (2) Dark mode: the palette
# flips cleanly. (3) Mobile 390: no horizontal overflow, hamburger opens,
# hero badge fits. (4) Signed-in dashboard (ada): Stage 15 badge + display
# heading, tab navigation works, signed out again. (5) Console/devlog clean.
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
# evcheck NAME JS_EXPR — evaluates a JS boolean expression in the page and
# checks it. agent-browser prints quoted JSON; grep -q true handles both.
evcheck() {
  local V
  V=$($AB eval "JSON.stringify(!!($2))" 2>/dev/null | tail -1)
  if echo "$V" | grep -q "true"; then PASS=$((PASS+1)); echo "  [PASS] $1";
  else FAIL=$((FAIL+1)); echo "  [FAIL] $1 ($V)"; fi
}

# ===========================================================================
echo "--- 1) LANDING: design system live ---"
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 3

evcheck "all six sections render" \
  "['product','how-it-works','scoring','architecture','roadmap','security'].every(id=>document.getElementById(id))"
evcheck "seven nav links render" \
  "document.querySelectorAll('header nav a').length === 7"
evcheck "hero H1 renders in the Fraunces display serif" \
  "getComputedStyle(document.querySelector('h1')).fontFamily.includes('Fraunces')"
evcheck "section H2s use the display font (5+ of 6)" \
  "Array.from(document.querySelectorAll('h2')).filter(h=>getComputedStyle(h).fontFamily.includes('Fraunces')).length >= 5"
# Count-up settles: the stats animate when they ENTER the viewport (reveal
# choreography) — scroll them into view first, then poll for the settle.
$AB eval "document.querySelector('dl')?.scrollIntoView({block:'center'})" >/dev/null 2>&1
STATS_OK=false
for i in $(seq 1 10); do
  V=$($AB eval "JSON.stringify(!!(['100M+','100%'].every(v=>document.body.textContent.includes(v))))" 2>/dev/null | tail -1)
  if echo "$V" | grep -q true; then STATS_OK=true; break; fi
  sleep 1
done
check "animated hero stats settle (100M+ / 100%)" "$STATS_OK"
$AB eval "window.scrollTo(0, 0)" >/dev/null 2>&1
evcheck "roadmap shows the Design elevation entry" \
  "document.body.textContent.includes('Design elevation')"
evcheck "hero preview note honest (Stage 17)" \
  "document.body.textContent.includes('(Stage 17)')"
evcheck "nav badge: Stage 17 · Trust Passport 2.0" \
  "document.body.textContent.includes('Stage 17 · Trust Passport 2.0')"
evcheck "footer present" "!!document.querySelector('footer')"

# Scroll choreography — reveal transforms/rails appear after scrolling.
$AB eval "window.scrollTo(0, 1200)" >/dev/null 2>&1
sleep 1.5
evcheck "scroll-reveal styles applied after scrolling" \
  "!!(document.querySelector('.ts-rail') || document.querySelector('[style*=transform]') || document.querySelector('[style*=opacity]'))"

# ===========================================================================
echo "--- 2) DARK MODE ---"
$AB eval "document.documentElement.classList.add('dark')" >/dev/null 2>&1
sleep 1.2
evcheck "dark palette flips (background darkens)" \
  "(() => { const c = getComputedStyle(document.body).backgroundColor; const m = c.match(/-?[\d.]+/); if (!m) return false; let v = parseFloat(m[0]); if (c.startsWith('oklch')) v *= 100; else if (c.startsWith('rgb')) v = v / 2.55; return v < 50; })()"
$AB screenshot research/s15-e2e-dark.png >/dev/null 2>&1
$AB eval "document.documentElement.classList.remove('dark')" >/dev/null 2>&1
sleep 0.8

# ===========================================================================
echo "--- 3) MOBILE 390 ---"
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1.2
evcheck "no horizontal overflow at 390px" \
  "document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"
evcheck "hamburger menu available" \
  "!!Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')==='Open menu')"
evcheck "hero badge fits the mobile viewport" \
  "(document.querySelector('[data-slot=badge]')?.getBoundingClientRect().right ?? 0) <= window.innerWidth"
$AB set viewport 1280 800 >/dev/null 2>&1
sleep 0.8

# ===========================================================================
echo "--- 4) DASHBOARD (ada) ---"
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
sleep 3.5

evcheck "dashboard heading welcomes the user" \
  "(document.querySelector('h1')?.textContent || '').includes('Welcome back')"
evcheck "dashboard H1 uses the display serif" \
  "getComputedStyle(document.querySelector('h1')).fontFamily.includes('Fraunces')"
evcheck "dashboard Stage 17 badge present" \
  "document.body.textContent.includes('Stage 17 · Trust Passport 2.0')"
evcheck "eight dashboard tabs present" \
  "document.querySelectorAll('[role=tab]').length === 8"

# Tab navigation still works with the new design.
for i in $(seq 1 14); do
  $AB eval "document.querySelector('[role=tab][data-state=active]')?.textContent?.includes('Passport')" 2>/dev/null | grep -q true && break
  $AB find role tab click --name "Trust Passport" >/dev/null 2>&1
  sleep 0.8
done
evcheck "Passport tab renders content" \
  "!!(document.querySelector('[data-testid=share-card]') || document.querySelector('[data-testid=passport-username]') || document.querySelector('h3'))"

# Sign out (restore state for the next suite).
$AB find role button click --name "Sign out" >/dev/null 2>&1
sleep 2

# ===========================================================================
echo "--- 5) CONSOLE + DEVLOG ---"
CONSOLE=$($AB eval "JSON.stringify(window.__consoleErrors || [])" 2>/dev/null | tail -1)
check "zero console errors" "$(echo "$CONSOLE" | grep -q '\[\]' && echo true || echo "$CONSOLE")"
LOG_ISSUES=$(grep -iE "error|unhandled|failed to compile" dev.log | grep -v "0 errors" | tail -3)
check "devlog clean" "$( [ -z "$LOG_ISSUES" ] && echo true || echo "$LOG_ISSUES" )"

echo
echo "RESULT: $PASS passed, $FAIL failed"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
