#!/usr/bin/env bash
# TrustScore Stage 3 — browser E2E (single-call pattern per worklog quirk)
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
$AB set viewport 1280 800 >/dev/null 2>&1
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 1

SIGNED_IN=$($AB eval "!!Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Sign out')" 2>/dev/null | tail -1)
if echo "$SIGNED_IN" | grep -q "true"; then
  $AB find role button click --name "Sign out" >/dev/null 2>&1
  sleep 2
  echo "(stale session cleared)"
fi

# --- login (ada: identity revoked by prior API tests) ---
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
sleep 3

echo "--- 1. revoked state UI ---"
$AB eval "JSON.stringify({
  stage3Badge: document.body.textContent.includes('Stage 3'),
  revoked: document.body.textContent.includes('Trust Identity revoked') || document.body.textContent.includes('Revoked — re-verify'),
  ladderCard: document.body.textContent.includes('Assurance ladder'),
  attributesCard: document.body.textContent.includes('Verified attributes'),
  evidenceCard: document.body.textContent.includes('Verification evidence'),
  l1NotAchieved: document.body.textContent.includes('L1 Government identity'),
})" 2>&1 | tail -1

# --- 2. re-verify with attributes (works from revoked OR verified state) ---
CTA="no-cta"
for i in $(seq 1 10); do
  CTA=$($AB eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Continue with NINAuth') || x.textContent.includes('Re-verify')); if (b) { b.click(); return 'clicked: ' + b.textContent.trim().split('\n')[0]; } return 'no-cta'; })()" 2>&1 | tail -1)
  echo "$CTA" | grep -q "clicked" && break
  sleep 1
done
echo "$CTA"
sleep 2
echo "--- 2b. consent modal with scope opt-ins ---"
$AB eval "JSON.stringify({
  requiredBadge: document.body.textContent.includes('Required'),
  optionalHint: document.body.textContent.includes('Optional — opt in'),
  checkboxes: document.querySelectorAll('[role=checkbox]').length,
})" 2>&1 | tail -1

# toggle both optional scopes (a11y refs may include state: [unchecked, ref=eN])
NAME_CB=$($AB snapshot -i 2>/dev/null | grep -oE 'checkbox "Share Name details"\s*\[[^]]*ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
DEMO_CB=$($AB snapshot -i 2>/dev/null | grep -oE 'checkbox "Share Demographics"\s*\[[^]]*ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
echo "checkbox refs: ${NAME_CB} / ${DEMO_CB}"
$AB click "@${NAME_CB}" >/dev/null 2>&1
sleep 0.4
$AB click "@${DEMO_CB}" >/dev/null 2>&1
sleep 0.6
$AB eval "JSON.stringify({approveLabel: Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Approve'))?.textContent.trim()})" 2>&1 | tail -1
APPROVE=$($AB snapshot -i 2>/dev/null | grep -oE 'button "Approve[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB click "@${APPROVE}" >/dev/null 2>&1
sleep 4

echo "--- 3. dashboard after verify (full Stage 3 read model) ---"
$AB eval "JSON.stringify({
  verified: document.body.textContent.includes('Government identity verified'),
  fingerprints: document.body.textContent.includes('Identity fingerprints'),
  sha256: document.body.textContent.includes('sha256'),
  ladderL1: !!document.querySelector('[aria-current=step]'),
  l1Badge: document.body.textContent.includes('L1 / L4'),
  attrCount: (document.body.textContent.match(/(Given name|Family name|Birth year|State of origin)/g) || []).length,
  evidence100: document.body.textContent.includes('100%'),
  fresh: document.body.textContent.includes('Fresh · 90d'),
  attributesPanel: document.body.textContent.includes('Consent-scoped fields'),
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage3-verified.png >/dev/null 2>&1

# --- 4. withdraw the ESTABLISHING (newest) consent via UI (with confirm) ---
# After a fresh verify, the newest consent is the establishing one; the first
# [data-consent-id] button in DOM belongs to the newest consent row.
echo "--- 4. open confirm dialog ---"
$AB eval "(() => { const b = document.querySelector('[data-consent-id]'); if (!b) return 'no-button'; b.click(); return 'opened:' + b.dataset.consentId.slice(-6); })()" 2>&1 | tail -1
sleep 1.5
echo "--- 4b. confirm dialog ---"
$AB eval "JSON.stringify({open: !!document.querySelector('[role=alertdialog]'), title: document.querySelector('[role=alertdialog] h2')?.textContent})" 2>&1 | tail -1
$AB eval "(() => { const dlg = document.querySelector('[role=alertdialog]'); if (!dlg) return 'no-dialog'; const b = Array.from(dlg.querySelectorAll('button')).find(x => x.textContent.includes('Withdraw consent')); if (!b) return 'no-confirm'; b.click(); return 'confirmed'; })()" 2>&1 | tail -1
sleep 3
echo "--- 4c. state after withdraw ---"
$AB eval "JSON.stringify({
  revokedHeading: document.body.textContent.includes('Trust Identity revoked'),
  reverifyCta: !!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue with NINAuth')),
  revokedAttrs: document.body.textContent.includes('revoked attribute'),
  activityWithdraw: document.body.textContent.includes('Consent withdrawn (NDPA right)'),
})" 2>&1 | tail -1

# --- 5. mobile 390 ---
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1
echo "--- 5. mobile 390 ---"
$AB eval "JSON.stringify({hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage3-mobile.png >/dev/null 2>&1

# --- 6. dark mode ---
$AB set viewport 1280 800 >/dev/null 2>&1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1
sleep 1
echo "--- 6. dark ---"
$AB eval "JSON.stringify({dark: document.documentElement.classList.contains('dark')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage3-dark.png >/dev/null 2>&1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1

echo "--- 7. console errors ---"
$AB eval "JSON.stringify((window.__consoleErrors ?? []))" 2>&1 | tail -1

echo "--- 8. dev.log ---"
grep -iE "error|fail" dev.log | grep -vE "favicon|IDENTITY_SESSION_FAILED|errorReason" | tail -5 || echo "dev.log clean"
echo "=== E2E DONE ==="
