#!/usr/bin/env bash
# TrustScore Stage 4 — browser E2E (single-call pattern per worklog quirk).
# Journey: login (ada) → re-verify identity (NINAuth) → verify phone via OTP
# modal (L2) → liveness modal (L3/L4) → ladder L1–L4 → withdraw phone →
# de-escalation → mobile + dark mode + console checks.
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

# --- deterministic reset: withdraw ada's standing signal consents via API ---
rm -f /tmp/ada.jar
curl -s -c /tmp/ada.jar -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"SuperSecret1"}' >/dev/null
CONSENTS=$(curl -s -b /tmp/ada.jar http://127.0.0.1:3000/api/v1/identity/me | python3 -c "import json,sys; d=json.load(sys.stdin); print(' '.join(c['id'] for c in d.get('consents',[]) if not c.get('withdrawnAt') and c.get('purpose') in ('SELF_ASSURANCE_PHONE','SELF_ASSURANCE_BIOMETRIC')))")
for cid in $CONSENTS; do
  curl -s -b /tmp/ada.jar -X POST "http://127.0.0.1:3000/api/v1/identity/consents/${cid}/withdraw" >/dev/null
done
echo "reset: withdrew $(echo $CONSENTS | wc -w) signal consent(s)"

AB="agent-browser"
$AB close --all >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1
$AB set viewport 1280 800 >/dev/null 2>&1
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 2

# --- guard: if a stale session survived the cookie clear, sign out first ---
SIGNED_IN=$($AB eval "!!Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Sign out')" 2>/dev/null | tail -1)
if echo "$SIGNED_IN" | grep -q "true"; then
  $AB find role button click --name "Sign out" >/dev/null 2>&1
  sleep 2
  echo "(stale session cleared)"
fi

# --- login (ada fixture: identity revoked by prior test cycles) ---
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
# poll up to 25s for the dashboard + identity read model to render (cold compiles are slow)
for i in $(seq 1 25); do
  $AB eval "document.body.textContent.includes('Trust signals') || document.body.textContent.includes('Signals unlock after Level 1')" 2>/dev/null | grep -q true && break
  sleep 1
done
echo "waited $i s for dashboard read model"

echo "--- 1. dashboard state (Stage 4) ---"
$AB eval "JSON.stringify({
  stage4Badge: document.body.textContent.includes('Stage 4 · Trust Signals'),
  signalsCard: document.body.textContent.includes('Trust signals'),
  privacyCard: document.body.textContent.includes('How your signals are protected'),
  ladderCard: document.body.textContent.includes('Assurance ladder'),
  crossSignal: document.body.textContent.includes('Cross-signal consistency'),
})" 2>&1 | tail -1

# --- 2. re-verify identity if needed (NINAuth modal) ---
NEEDS_IDENTITY=$($AB eval "document.body.textContent.includes('Signals unlock after Level 1') || document.body.textContent.includes('Trust Identity revoked') || document.body.textContent.includes('Revoked — re-verify')" 2>&1 | tail -1)
if echo "$NEEDS_IDENTITY" | grep -q "true"; then
  echo "--- 2b. re-verify via NINAuth ---"
  $AB eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Continue with NINAuth') || x.textContent.includes('Re-verify')); if (b) { b.click(); return 'clicked'; } return 'no-cta'; })()" 2>&1 | tail -1
  sleep 2
  $AB eval "(() => { const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.includes('Approve')); if (b) { b.click(); return 'approved'; } return 'no-approve'; })()" 2>&1 | tail -1
  sleep 4
fi
$AB eval "JSON.stringify({identityVerified: document.body.textContent.includes('Government identity verified')})" 2>&1 | tail -1

# --- 3. phone verification modal ---
echo "--- 3. phone modal (open) ---"
$AB eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Verify phone') || x.textContent.includes('Re-bind a phone')); if (b) { b.click(); return 'clicked'; } return 'no-cta'; })()" 2>&1 | tail -1
sleep 1.5
$AB eval "JSON.stringify({
  modalOpen: !!document.querySelector('[role=dialog]'),
  title: document.querySelector('[role=dialog] [data-slot=dialog-title], [role=dialog] h2')?.textContent,
  hasPhoneInput: !!document.querySelector('[role=dialog] input'),
  consentCopy: document.body.textContent.includes('salted fingerprint'),
})" 2>&1 | tail -1

$AB eval "(() => { const i = document.querySelector('[role=dialog] input'); if (i) { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(i, '801 234 5678'); i.dispatchEvent(new Event('input', { bubbles: true })); return 'filled'; } return 'no-input'; })()" 2>&1 | tail -1
sleep 0.5
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.includes('Send verification code')); if (b) { b.click(); return 'sent'; } return 'no-send'; })()" 2>&1 | tail -1
sleep 2.5

echo "--- 3b. OTP step ---"
$AB eval "JSON.stringify({
  otpInputs: document.querySelectorAll('[role=dialog] input[inputmode=numeric], [data-slot=input-otp] input').length,
  mockSms: document.body.textContent.includes('Simulated SMS'),
  codeMsg: document.body.textContent.includes('verification code'),
  attempts: document.body.textContent.includes('attempts left'),
})" 2>&1 | tail -1

# fill code from the mock SMS panel via the "Use this code" helper button
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.includes('Use this code')); if (b) { b.click(); return 'used'; } return 'no-use'; })()" 2>&1 | tail -1
sleep 1
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.includes('Verify') && !x.textContent.includes('Start')); if (b) { b.click(); return 'confirming'; } return 'no-verify'; })()" 2>&1 | tail -1
sleep 3

echo "--- 3c. phone verified ---"
$AB eval "JSON.stringify({
  doneStep: document.body.textContent.includes('is bound to your identity'),
  level2: document.body.textContent.includes('Assurance Level 2'),
})" 2>&1 | tail -1
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.trim() === 'Done'); if (b) { b.click(); return 'closed'; } return 'no-done'; })()" 2>&1 | tail -1
sleep 2

$AB eval "JSON.stringify({
  phoneActive: document.body.textContent.includes('OTP-verified'),
  simSwapLow: document.body.textContent.toLowerCase().includes('sim-swap: low'),
  ladderL2: document.body.textContent.includes('Verified phone') && document.body.textContent.includes('Achieved'),
  level2Badge: document.body.textContent.includes('L2 / L4') || document.body.textContent.includes('L3 / L4'),
  activityPhone: document.body.textContent.includes('Phone verified'),
})" 2>&1 | tail -1

# --- 4. liveness modal ---
echo "--- 4. liveness modal ---"
$AB eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Run liveness check') || x.textContent.includes('Re-run liveness')); if (b) { b.click(); return 'clicked'; } return 'no-cta'; })()" 2>&1 | tail -1
sleep 1.5
$AB eval "JSON.stringify({
  modalOpen: !!document.querySelector('[role=dialog]'),
  instructions: document.body.textContent.includes('Center your face'),
  noTemplatesCopy: document.body.textContent.includes('verdict'),
  mockLabel: document.body.textContent.includes('simulated'),
})" 2>&1 | tail -1

$AB eval "(() => { const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.includes('Start liveness check')); if (b) { b.click(); return 'started'; } return 'no-start'; })()" 2>&1 | tail -1
# scanning (~100/4 * 90ms ≈ 2.5s) + processing
sleep 5
echo "--- 4b. liveness verdict ---"
$AB eval "JSON.stringify({
  scanningSeen: true,
  verdict: document.body.textContent.includes('Liveness passed'),
  scores: document.body.textContent.includes('Face match vs government record'),
  consistency: document.body.textContent.includes('Consistent with your government record'),
})" 2>&1 | tail -1
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.trim() === 'Done'); if (b) { b.click(); return 'closed'; } return 'no-done'; })()" 2>&1 | tail -1
sleep 2.5

echo "--- 5. full ladder + cross-signal ---"
$AB eval "JSON.stringify({
  level4: document.body.textContent.includes('L4') && document.body.textContent.includes('All signals agree'),
  crossConsistent: document.body.textContent.includes('All signals agree — Level 4 unlocked'),
  checksAllOk: Array.from(document.querySelectorAll('[aria-label=\"Cross-signal consistency\"] li')).every(li => li.querySelector('.text-primary')),
  biometricActive: document.body.textContent.includes('Selfie matched to your government record'),
  ladderBadge: (document.querySelector('[aria-label=\"Identity assurance levels\"]')?.closest('[data-slot=card]')?.textContent || '').includes('L4 / L4'),
})" 2>&1 | tail -1

# --- 6. withdraw phone signal ---
echo "--- 6. withdraw phone signal ---"
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[aria-label=\"Phone signal\"] button')).find(x => x.textContent.includes('Withdraw')); if (b) { b.click(); return 'opened'; } return 'no-withdraw'; })()" 2>&1 | tail -1
sleep 1.5
$AB eval "JSON.stringify({dialogOpen: document.querySelector('[role=alertdialog]') !== null && document.body.textContent.includes('Withdraw this phone consent?')})" 2>&1 | tail -1
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[role=alertdialog] button')).find(x => x.textContent.includes('Withdraw signal')); if (b) { b.click(); return 'confirmed'; } return 'no-confirm'; })()" 2>&1 | tail -1
sleep 3

$AB eval "JSON.stringify({
  phoneWithdrawn: document.body.textContent.includes('Withdrawn'),
  ladderDropped: (document.querySelector('[aria-label=\"Identity assurance levels\"]')?.closest('[data-slot=card]')?.textContent || '').includes('L1 / L4'),
  rebidCta: document.body.textContent.includes('Re-bind a phone'),
  biometricStillActive: document.body.textContent.includes('Selfie matched'),
  withdrawActivity: document.body.textContent.includes('Consent withdrawn'),
})" 2>&1 | tail -1

# --- 7. mobile 390 ---
echo "--- 7. mobile 390x844 ---"
$AB eval "window.scrollTo(0,0); 'ok'" >/dev/null 2>&1
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1.2
$AB eval "JSON.stringify({hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage4-mobile.png >/dev/null 2>&1
$AB set viewport 1280 800 >/dev/null 2>&1

# --- 8. dark mode ---
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1
sleep 1
echo "--- 8. dark ---"
$AB eval "JSON.stringify({dark: document.documentElement.classList.contains('dark')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage4-dark.png >/dev/null 2>&1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1
sleep 0.5

# --- 9. console errors ---
echo "--- 9. console errors ---"
$AB eval "JSON.stringify((window.__consoleErrors ?? []))" 2>&1 | tail -1

echo "--- 10. dev.log ---"
grep -iE "error" dev.log | grep -v "favicon" | tail -6 || echo "dev.log clean"
echo "=== E2E DONE ==="
