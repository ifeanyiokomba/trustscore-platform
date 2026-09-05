#!/usr/bin/env bash
# TrustScore — round QA regression (Stage 1+2 surface), single-call pattern
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

# ---------- 1. landing ----------
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 1
echo "--- LANDING ---"
$AB eval "JSON.stringify({
  title: document.title,
  h1: document.querySelector('h1')?.textContent?.slice(0,60),
  sections: ['product','how-it-works','architecture','roadmap','security'].filter(id=>document.getElementById(id)),
  navLinks: document.querySelectorAll('header nav a').length,
  footer: !!document.querySelector('footer'),
  footerStuck: (()=>{const f=document.querySelector('footer');const r=f.getBoundingClientRect();return r.bottom<=window.innerHeight+2})(),
})" 2>&1 | tail -1

SIGNED_IN=$($AB eval "!!Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Sign out')" 2>/dev/null | tail -1)
if echo "$SIGNED_IN" | grep -q "true"; then
  $AB find role button click --name "Sign out" >/dev/null 2>&1
  sleep 2
  echo "(stale session cleared)"
fi

# ---------- 2. sign in (ada — existing verified user) ----------
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
SUBMIT=$($AB snapshot -i 2>/dev/null | grep -E 'tabpanel' -A10 | grep -oE 'button "Sign in" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB click "@${SUBMIT}" >/dev/null 2>&1
sleep 2.5
echo "--- DASHBOARD (signed in) ---"
$AB eval "JSON.stringify({
  heading: document.querySelector('h1')?.textContent,
  identityCard: !!document.querySelector('[data-testid=identity-card], .grid'),
  hasIdentity: document.body.textContent.includes('Government identity verified') || document.body.textContent.includes('Level 1'),
  tabs: Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent.trim()),
  stageBadge: document.body.textContent.includes('Stage 8 · Trust Engine'),
})" 2>&1 | tail -1

# ---------- 3. wrong password ----------
$AB find role button click --name "Sign out" >/dev/null 2>&1 || true
sleep 1.5
if ! $AB get text "main" 2>/dev/null | grep -q "Get started"; then
  # still on dashboard; use nav auth entry
  $AB open http://127.0.0.1:3000 >/dev/null 2>&1
  sleep 1.5
fi
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
$AB fill "@${PW_REF}" "WrongPassword9" >/dev/null 2>&1
SUBMIT=$($AB snapshot -i 2>/dev/null | grep -E 'tabpanel' -A10 | grep -oE 'button "Sign in" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB click "@${SUBMIT}" >/dev/null 2>&1
sleep 2
echo "--- WRONG PASSWORD ---"
$AB eval "JSON.stringify({alert: document.querySelector('[role=alert]')?.textContent?.slice(0,60)})" 2>&1 | tail -1

# ---------- 4. good login again + dark mode ----------
$AB fill "@${PW_REF}" "SuperSecret1" >/dev/null 2>&1
$AB click "@${SUBMIT}" >/dev/null 2>&1
sleep 2.5
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1 || $AB eval "document.querySelector('button[aria-label*=theme i], button[title*=theme i]')?.click(); 'clicked'" >/dev/null 2>&1
sleep 1
echo "--- DARK MODE ---"
$AB eval "JSON.stringify({dark: document.documentElement.classList.contains('dark')})" 2>&1 | tail -1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1 || $AB eval "document.querySelector('button[aria-label*=theme i], button[title*=theme i]')?.click(); 'clicked'" >/dev/null 2>&1
sleep 0.5

# ---------- 5. mobile viewport ----------
$AB eval "window.scrollTo(0,0); 'ok'" >/dev/null 2>&1
echo "--- MOBILE 390x844 ---"
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1
$AB eval "JSON.stringify({
  hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  hamburger: !!document.querySelector('button[aria-label*=menu i], [data-slot=sheet-trigger]'),
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/qa-mobile.png >/dev/null 2>&1
$AB set viewport 1280 800 >/dev/null 2>&1

# ---------- 6. console errors ----------
echo "--- CONSOLE ---"
$AB eval "JSON.stringify((window.__consoleErrors ?? []))" 2>&1 | tail -1

echo "--- DEVLOG ---"
grep -iE "error|warn|fail" dev.log | grep -v "favicon" | tail -8 || echo "dev.log clean"
echo "=== QA DONE ==="
