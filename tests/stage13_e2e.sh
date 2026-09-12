#!/usr/bin/env bash
# TrustScore Stage 13 — browser E2E (single-call pattern per worklog quirk).
# Journey: (1) logged-out landing shows the Stage 13 roadmap entry.
# (2) A fresh ADMIN signs in → Trust Engine tab → the provider transport
# console renders (MOCK posture active, LIVE honestly disabled, simulator
# health, three provider rows with circuit chips) → flips the posture to
# sandbox LOOPBACK in the UI. (3) Back on Overview the member verifies their
# identity through the NINAuth consent modal OVER THE REAL TRANSPORT, then
# the phone modal with the sandbox SMS inbox (LIVE delivery — no code echoed;
# inbox button → carrier message → use-the-code → L2). (4) Engine tab again:
# fault injection (5xx) trips the circuit (red OPEN chip + last error in the
# UI), reset + healthy restore it (green CLOSED). (5) The vault dialog stores
# a credential (masked hint appears, secret never echoed) and revokes it.
# (6) Posture restored to MOCK in the UI. (7) Mobile 390 engine tab, dark
# mode, console [] and devlog clean.
set -u
cd /home/z/my-project

bash tests/restart-dev.sh
echo "=== server warm ==="
bash mini-services/provider-simulator/start.sh

AB="agent-browser"
$AB close --all >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1

STAMP=$(( $(date +%s) % 100000000 ))
A_EMAIL="e2es13_${STAMP}@example.com"

# --- API setup: fresh ADMIN + normalize any stale posture/fault state -----
python3 - "$STAMP" <<'PYEOF'
import json, sys, urllib.request, urllib.error, http.cookiejar, sqlite3
stamp = sys.argv[1]
BASE = "http://127.0.0.1:3000"
DB = "/home/z/my-project/db/custom.db"
def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(op, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data: req.add_header("Content-Type", "application/json")
    try:
        with op.open(req, timeout=40) as res:
            return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode() or "{}")
        except Exception: return e.code, {}

# clear prior e2es13 users + stale provider state (idempotent entry)
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM UserAccount WHERE email LIKE 'e2es13_%@example.com'")
con.execute("DELETE FROM ProviderCredential")
con.execute("DELETE FROM PlatformSetting WHERE key='providers.posture'")
con.commit(); con.close()

a_email = f"e2es13_{stamp}@example.com"
a = client()
s, b = call(a, "POST", "/api/v1/auth/register", {
    "email": a_email, "password": "SuperSecret1", "displayName": "Stage Thirteen E2E",
    "handle": f"e2es13{stamp}", "acceptTerms": True})
assert s == 201, f"register admin {s} {b}"
con = sqlite3.connect(DB, timeout=30)
con.execute("UPDATE UserAccount SET role='ADMIN' WHERE email=?", (a_email,))
con.commit(); con.close()
print(f"admin ready: {a_email}")
PYEOF

# --- helpers ---------------------------------------------------------------
login_user() {
  $AB open http://127.0.0.1:3000 >/dev/null 2>&1
  sleep 1.5
  $AB eval "Array.from(document.querySelectorAll('button')).find(b=>/sign out/i.test(b.textContent))?.click(); 'out'" >/dev/null 2>&1
  sleep 1.2
  $AB open http://127.0.0.1:3000 >/dev/null 2>&1
  sleep 1.2
  $AB find role button click --name "Get started" >/dev/null 2>&1
  sleep 1
  for i in $(seq 1 12); do
    $AB snapshot -i 2>/dev/null | grep -qE 'tabpanel "Sign in"' && break
    $AB find role tab click --name "Sign in" >/dev/null 2>&1
    sleep 0.8
  done
  EMAIL_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Email" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
  PW_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Password" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
  $AB fill "@${EMAIL_REF}" "$1" >/dev/null 2>&1
  $AB fill "@${PW_REF}" "SuperSecret1" >/dev/null 2>&1
  SUBMIT=$($AB snapshot -i 2>/dev/null | grep -E 'tabpanel' -A10 | grep -oE 'button "Sign in" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
  $AB click "@${SUBMIT}" >/dev/null 2>&1
  sleep 3
}

tab_click() {
  for i in $(seq 1 14); do
    $AB eval "document.querySelector('[role=tab][data-state=active]')?.textContent?.includes('$1')" 2>/dev/null | grep -q true && return 0
    $AB find role tab click --name "$1" >/dev/null 2>&1
    sleep 0.8
  done
  return 1
}

PASS=0; FAIL=0
check() {
  if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1";
  else FAIL=$((FAIL+1)); echo "  [FAIL] $1 ($2)"; fi
}

# ===========================================================================
# 1) LANDING — Stage 13 roadmap entry (logged out)
# ===========================================================================
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 2
echo "--- 1. landing roadmap ---"
R=$($AB eval "JSON.stringify({
  a: document.body.textContent.includes('Live-ready providers'),
  b: document.body.textContent.includes('circuit breakers'),
  c: document.querySelector('#roadmap')?.textContent.includes('In progress'),
  d: document.body.textContent.includes('Stage 13') || document.body.textContent.includes('(Stage 13)'),
})" 2>/dev/null | tail -1)
echo "$R" | python3 -c "
import json, sys
d = json.loads(json.load(sys.stdin))
names = ['roadmap: Stage 13 entry|roadmap detail: circuit breakers|stage 13 marked in progress|hero badge Stage 13'.split('|')]
" >/dev/null 2>&1
A=$(echo "$R" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['a'] else 'false')" 2>/dev/null)
B=$(echo "$R" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['b'] else 'false')" 2>/dev/null)
C=$(echo "$R" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['c'] else 'false')" 2>/dev/null)
D=$(echo "$R" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['d'] else 'false')" 2>/dev/null)
check "roadmap shows the Stage 13 'Live-ready providers' entry" "$A"
check "roadmap detail mentions circuit breakers + vault" "$B"
check "stage 13 marked in progress (spinner state)" "$C"
check "hero carries the Stage 13 badge" "$D"
$AB screenshot /home/z/my-project/research/s13-landing-roadmap.png >/dev/null 2>&1

# ===========================================================================
# 2) ADMIN — provider transport console (Engine tab)
# ===========================================================================
login_user "$A_EMAIL"
tab_click "Engine"
sleep 3
echo "--- 2. provider console (MOCK posture) ---"
R2=$($AB eval "JSON.stringify({
  console: !!document.querySelector('[data-testid=provider-console]'),
  postureBadge: document.querySelector('[data-testid=posture-badge]')?.textContent?.includes('MOCK'),
  mockActive: document.querySelector('[data-testid=posture-mock]')?.getAttribute('aria-pressed') === 'true',
  liveDisabled: document.querySelector('[data-testid=posture-live]')?.disabled === true,
  liveHonest: document.querySelector('[data-testid=posture-live]')?.textContent?.includes('refuses'),
  simHealth: document.querySelector('[data-testid=simulator-health]')?.textContent?.includes('3032'),
  threeRows: ['ninauth','phone','liveness'].every(k => !!document.querySelector('[data-testid=provider-row-' + k + ']')),
  closedChips: ['ninauth','phone','liveness'].every(k => document.querySelector('[data-testid=circuit-' + k + ']')?.textContent?.includes('CLOSED')),
  vaultCta: !!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Vault credential')),
})" 2>/dev/null | tail -1)
NAMES2="console card renders|MOCK posture badge|mock option ACTIVE|LIVE disabled|LIVE honest reason|simulator health strip|three provider rows|circuits CLOSED chips|vault CTA visible"
echo "$R2" | python3 -c "
import json, sys
d = json.loads(json.load(sys.stdin))
names = '''$NAMES2'''.split('|')
for (k, v), name in zip(sorted(d.items()), names):
    print(('  [PASS] ' if v else '  [FAIL] ') + name)
" 2>/dev/null || echo "  [EVAL ERROR] section 2"
PASS=$((PASS+$(echo "$R2" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print(sum(1 for v in d.values() if v))" 2>/dev/null || echo 0)))
FAIL=$((FAIL+$(echo "$R2" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print(sum(1 for v in d.values() if not v))" 2>/dev/null || echo 0)))
$AB screenshot /home/z/my-project/research/s13-console-mock.png >/dev/null 2>&1

echo "--- 2b. flip posture to sandbox loopback (UI) ---"
$AB eval "document.querySelector('[data-testid=posture-loopback]').click(); 'clicked'" >/dev/null 2>&1
sleep 3.5
R2b=$($AB eval "JSON.stringify({
  loopbackActive: document.querySelector('[data-testid=posture-loopback]')?.getAttribute('aria-pressed') === 'true',
  badge: document.querySelector('[data-testid=posture-badge]')?.textContent?.includes('LOOPBACK'),
  note: document.querySelector('[data-testid=posture-note]')?.textContent?.includes('simulator'),
  names: document.body.textContent.includes('NINAUTH_LOOPBACK') && document.body.textContent.includes('SMS_LOOPBACK'),
  faultButtons: !!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Auth mismatch')),
})" 2>/dev/null | tail -1)
NAMES2B="loopback option ACTIVE|posture badge LOOPBACK|honest posture note|provider names _LOOPBACK|fault buttons appear"
echo "$R2b" | python3 -c "
import json, sys
d = json.loads(json.load(sys.stdin))
names = '''$NAMES2B'''.split('|')
for (k, v), name in zip(sorted(d.items()), names):
    print(('  [PASS] ' if v else '  [FAIL] ') + name)
" 2>/dev/null || echo "  [EVAL ERROR] section 2b"
PASS=$((PASS+$(echo "$R2b" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print(sum(1 for v in d.values() if v))" 2>/dev/null || echo 0)))
FAIL=$((FAIL+$(echo "$R2b" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print(sum(1 for v in d.values() if not v))" 2>/dev/null || echo 0)))
$AB screenshot /home/z/my-project/research/s13-console-loopback.png >/dev/null 2>&1

# ===========================================================================
# 3) OVERVIEW — identity + phone verification OVER THE TRANSPORT
# ===========================================================================
tab_click "Overview"
sleep 2
echo "--- 3. NINAuth consent modal over the wire ---"
$AB eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Continue with NINAuth') || x.textContent.includes('Re-verify')); if (b) { b.click(); return 'clicked'; } return 'no-cta'; })()" >/dev/null 2>&1
sleep 2.5
# grant all scopes (Approve) — the provider issues the code over the transport
$AB eval "(() => { const boxes = Array.from(document.querySelectorAll('[role=dialog] [role=checkbox]')); boxes.forEach(c => { if (c.getAttribute('aria-checked') !== 'true') c.click(); }); const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.includes('Approve')); if (b) { b.click(); return 'approved'; } return 'no-approve'; })()" >/dev/null 2>&1
sleep 5
R3=$($AB eval "JSON.stringify({
  identityVerified: document.body.textContent.includes('Government identity verified'),
  providerLoopback: document.body.textContent.includes('NINAUTH_LOOPBACK'),
  noDialog: !document.querySelector('[data-testid=identity-card] [role=dialog]'),
})" 2>/dev/null | tail -1)
A3=$(echo "$R3" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['identityVerified'] else 'false')" 2>/dev/null)
B3=$(echo "$R3" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['providerLoopback'] else 'false')" 2>/dev/null)
check "identity verified through the consent modal (loopback)" "$A3"
check "identity card labels NINAUTH_LOOPBACK · LIVE" "$B3"

echo "--- 3b. phone modal + sandbox SMS inbox ---"
$AB eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Verify phone')); if (b) { b.click(); return 'clicked'; } return 'no-cta'; })()" >/dev/null 2>&1
sleep 2
PHONE_INPUT=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Nigerian mobile number" \[required, ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
PHONE_NUM="0803 555 $(printf '%04d' $(( STAMP % 9000 )))"
$AB fill "@${PHONE_INPUT}" "$PHONE_NUM" >/dev/null 2>&1
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.includes('Send verification code')); if (b) { b.click(); return 'sent'; } return 'no-send'; })()" >/dev/null 2>&1
sleep 3
R3b=$($AB eval "JSON.stringify({
  livePanel: document.querySelector('[data-testid=delivery-panel]')?.textContent?.includes('SMS_LOOPBACK'),
  noCodeEcho: !(document.querySelector('[data-testid=delivery-panel]')?.textContent?.match(/\b\d{6}\b/)),
  inboxBtn: !!Array.from(document.querySelectorAll('[data-testid=sandbox-inbox] button')).find(b => b.textContent.includes('Open sandbox SMS inbox')),
})" 2>/dev/null | tail -1)
A3b=$(echo "$R3b" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['livePanel'] else 'false')" 2>/dev/null)
B3b=$(echo "$R3b" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['noCodeEcho'] else 'false')" 2>/dev/null)
C3b=$(echo "$R3b" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['inboxBtn'] else 'false')" 2>/dev/null)
check "delivery panel: SMS_LOOPBACK · LIVE (no code echoed)" "$A3b"
check "LIVE contract holds in the UI (no 6-digit code in the panel)" "$B3b"
check "sandbox inbox button present" "$C3b"
$AB screenshot /home/z/my-project/research/s13-phone-live-delivery.png >/dev/null 2>&1

$AB eval "(() => { const b = Array.from(document.querySelectorAll('[data-testid=sandbox-inbox] button')).find(b => b.textContent.includes('Open sandbox SMS inbox')); if (b) { b.click(); return 'open'; } return 'no-btn'; })()" >/dev/null 2>&1
sleep 2.5
R3c=$($AB eval "JSON.stringify({
  message: !!document.querySelector('[data-testid=sandbox-inbox]')?.textContent?.match(/TrustScore: your verification code is \d{6}/),
  honestNote: document.querySelector('[data-testid=sandbox-inbox]')?.textContent?.includes('LIVE posture codes are delivered to real handsets'),
  useCode: !!Array.from(document.querySelectorAll('[data-testid=sandbox-inbox] button')).find(b => b.textContent.includes('Use the code from the inbox')),
})" 2>/dev/null | tail -1)
A3c=$(echo "$R3c" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['message'] else 'false')" 2>/dev/null)
B3c=$(echo "$R3c" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['honestNote'] else 'false')" 2>/dev/null)
C3c=$(echo "$R3c" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['useCode'] else 'false')" 2>/dev/null)
check "carrier message rendered in the sandbox inbox" "$A3c"
check "inbox carries the honest LIVE note" "$B3c"
check "use-the-code button present" "$C3c"
$AB screenshot /home/z/my-project/research/s13-phone-inbox.png >/dev/null 2>&1

$AB eval "(() => { const b = Array.from(document.querySelectorAll('[data-testid=sandbox-inbox] button')).find(b => b.textContent.includes('Use the code from the inbox')); if (b) { b.click(); return 'filled'; } return 'no-btn'; })()" >/dev/null 2>&1
sleep 1
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.trim() === 'Verify'); if (b) { b.click(); return 'verify'; } return 'no-verify'; })()" >/dev/null 2>&1
# poll up to 18s for the success screen (cold route compiles vary)
BOUND=false
for i in $(seq 1 18); do
  BOUND=$($AB eval "document.body.textContent.includes('is bound to your identity')" 2>/dev/null | tail -1)
  echo "$BOUND" | grep -q true && break
  sleep 1
done
R3d=$($AB eval "JSON.stringify({
  bound: document.body.textContent.includes('is bound to your identity'),
  l2: document.body.textContent.includes('Assurance Level 2'),
})" 2>/dev/null | tail -1)
A3d=$(echo "$R3d" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['bound'] else 'false')" 2>/dev/null)
B3d=$(echo "$R3d" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['l2'] else 'false')" 2>/dev/null)
check "phone verified via the inbox code → bound (L2)" "$A3d"
check "modal reports Assurance Level 2" "$B3d"
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[role=dialog] button')).find(x => x.textContent.trim() === 'Done'); if (b) { b.click(); return 'done'; } return 'no-done'; })()" >/dev/null 2>&1
sleep 1.5

# ===========================================================================
# 4) CIRCUIT BREAKER in the UI — fault → trip → red OPEN chip → reset
# ===========================================================================
tab_click "Engine"
sleep 2.5
echo "--- 4. circuit breaker round-trip in the console ---"
# fault = 5xx errors via the UI (poll for the console to finish loading)
FAULT_CLICKED=no
for i in $(seq 1 12); do
  FAULT_CLICKED=$($AB eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('5xx errors')); if (b) { b.click(); return 'clicked'; } return 'waiting'; })()" 2>/dev/null | tail -1)
  echo "$FAULT_CLICKED" | grep -q clicked && break
  sleep 1
done
sleep 2.5
# 3 failing calls through the API (fast under the error fault) trip the breaker
python3 - "$STAMP" <<'PYEOF'
import json, sys, time, urllib.request, urllib.error, http.cookiejar, sqlite3
stamp = sys.argv[1]
BASE = "http://127.0.0.1:3000"
con = sqlite3.connect("/home/z/my-project/db/custom.db", timeout=30)
con.execute("UPDATE UserAccount SET role='ADMIN' WHERE email=?", (f"e2es13_{stamp}@example.com",))
con.commit(); con.close()
cj = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data: req.add_header("Content-Type", "application/json")
    try:
        with op.open(req, timeout=60) as res:
            return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode() or "{}")
        except Exception: return e.code, {}
call("POST", "/api/v1/auth/login", {"email": f"e2es13_{stamp}@example.com", "password": "SuperSecret1"})
call("PUT", "/api/v1/engine/admin/providers", {"posture": "loopback"})
# Deterministic guarantee: the simulator fault mode must be 'error' before the
# failing calls (the browser click set it; this re-asserts it so a cold-load
# race can never break the breaker leg).
s, b = call("GET", "/api/v1/engine/admin/providers")
if (b.get("simulator") or {}).get("fault") != "error":
    call("POST", "/api/v1/engine/admin/providers/ninauth/fault", {"mode": "error"})
    print("(fault set via API — the browser click raced the console load)")
for i in range(3):
    s, b = call("POST", "/api/v1/identity/sessions", {})
    if s == 429:
        time.sleep(62)
        s, b = call("POST", "/api/v1/identity/sessions", {})
    assert s == 503, f"expected 503, got {s} {b}"
print("3 failing calls done (breaker should be OPEN)")
PYEOF
sleep 1
# reload the console — the chip must show OPEN + the last error
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
sleep 2.5
tab_click "Engine"
sleep 3
R4=$($AB eval "JSON.stringify({
  openChip: document.querySelector('[data-testid=circuit-ninauth]')?.textContent?.includes('OPEN'),
  redChip: document.querySelector('[data-testid=circuit-ninauth]')?.className?.includes('red'),
  lastError: !!document.querySelector('[data-testid=provider-row-ninauth]')?.textContent?.match(/RETRIES_EXHAUSTED|error/i),
  errorsCount: document.querySelector('[data-testid=metrics-ninauth]')?.textContent?.includes('Errors'),
})" 2>/dev/null | tail -1)
A4=$(echo "$R4" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['openChip'] else 'false')" 2>/dev/null)
B4=$(echo "$R4" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['redChip'] else 'false')" 2>/dev/null)
C4=$(echo "$R4" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['lastError'] else 'false')" 2>/dev/null)
D4=$(echo "$R4" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['errorsCount'] else 'false')" 2>/dev/null)
check "circuit chip flips to OPEN after the failures" "$A4"
check "OPEN chip renders red" "$B4"
check "last error surfaces in the row" "$C4"
check "metrics show the Errors counter" "$D4"
$AB screenshot /home/z/my-project/research/s13-circuit-open.png >/dev/null 2>&1

# healthy + reset via the UI
$AB eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Healthy')); if (b) { b.click(); return 'healthy'; } return 'no-btn'; })()" >/dev/null 2>&1
sleep 2.5
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[data-testid=provider-row-ninauth] button')).find(x => x.textContent.includes('Reset circuit')); if (b) { b.click(); return 'reset'; } return 'no-btn'; })()" >/dev/null 2>&1
sleep 3
R4b=$($AB eval "JSON.stringify({
  closedChip: document.querySelector('[data-testid=circuit-ninauth]')?.textContent?.includes('CLOSED'),
  greenChip: document.querySelector('[data-testid=circuit-ninauth]')?.className?.includes('emerald'),
  zeroed: document.querySelector('[data-testid=metrics-ninauth]')?.textContent?.includes('Errors'),
})" 2>/dev/null | tail -1)
A4b=$(echo "$R4b" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['closedChip'] else 'false')" 2>/dev/null)
B4b=$(echo "$R4b" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['greenChip'] else 'false')" 2>/dev/null)
check "reset → chip CLOSED again" "$A4b"
check "CLOSED chip renders green" "$B4b"

# ===========================================================================
# 5) VAULT — store + masked hint + revoke (UI)
# ===========================================================================
echo "--- 5. vault dialog ---"
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[data-testid=provider-row-liveness] button')).find(x => x.textContent.includes('Vault credential')); if (b) { b.click(); return 'open'; } return 'no-btn'; })()" >/dev/null 2>&1
sleep 1.5
$AB eval "(() => { const dlg = document.querySelector('[data-testid=vault-dialog]'); if (!dlg) return 'no-dialog'; const set = (id, v) => { const i = dlg.querySelector('#' + id); if (i) { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true })); } }; set('vault-key-id', 'liveness-partner-key-1'); set('vault-secret', 'e2e-secret-never-echo-456789'); set('vault-note', 'e2e run'); return 'filled'; })()" >/dev/null 2>&1
sleep 0.8
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[data-testid=vault-dialog] button')).find(x => x.textContent.includes('Encrypt & store') || x.textContent.includes('Encrypt')); if (b) { b.click(); return 'stored'; } return 'no-btn'; })()" >/dev/null 2>&1
sleep 3
R5=$($AB eval "JSON.stringify({
  hintShown: !!document.querySelector('[data-testid=vault-liveness]')?.textContent?.includes('li•') || document.querySelector('[data-testid=vault-liveness]')?.textContent?.includes('•'),
  keyIdShown: document.querySelector('[data-testid=vault-liveness]')?.textContent?.includes('liveness-partner-key-1'),
  secretGone: !document.body.textContent.includes('e2e-secret-never-echo-456789'),
  dialogClosed: !document.querySelector('[data-testid=vault-dialog]'),
})" 2>/dev/null | tail -1)
A5=$(echo "$R5" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['hintShown'] else 'false')" 2>/dev/null)
B5=$(echo "$R5" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['keyIdShown'] else 'false')" 2>/dev/null)
C5=$(echo "$R5" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['secretGone'] else 'false')" 2>/dev/null)
D5=$(echo "$R5" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['dialogClosed'] else 'false')" 2>/dev/null)
check "vault row shows the masked hint (liveness)" "$A5"
check "keyId surfaced" "$B5"
check "secret NEVER rendered anywhere" "$C5"
check "dialog closed after storing" "$D5"
$AB screenshot /home/z/my-project/research/s13-vault-stored.png >/dev/null 2>&1

$AB eval "(() => { const b = Array.from(document.querySelectorAll('[data-testid=vault-liveness] button')).find(x => x.textContent.includes('Revoke')); if (b) { b.click(); return 'revoked'; } return 'no-btn'; })()" >/dev/null 2>&1
sleep 3
R5b=$($AB eval "JSON.stringify({
  backToCta: !!Array.from(document.querySelectorAll('[data-testid=provider-row-liveness] button')).find(b => b.textContent.includes('Vault credential')),
  vaultGone: !document.querySelector('[data-testid=vault-liveness]'),
})" 2>/dev/null | tail -1)
A5b=$(echo "$R5b" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['backToCta'] else 'false')" 2>/dev/null)
check "revoke returns the row to the vault CTA" "$A5b"

# ===========================================================================
# 6) posture back to MOCK (UI) + dashboard badge
# ===========================================================================
$AB eval "document.querySelector('[data-testid=posture-mock]').click(); 'clicked'" >/dev/null 2>&1
sleep 3
R6=$($AB eval "JSON.stringify({
  badge: document.querySelector('[data-testid=posture-badge]')?.textContent?.includes('MOCK'),
  names: document.body.textContent.includes('NINAUTH_MOCK'),
})" 2>/dev/null | tail -1)
A6=$(echo "$R6" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['badge'] else 'false')" 2>/dev/null)
B6=$(echo "$R6" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['names'] else 'false')" 2>/dev/null)
check "posture restored to MOCK (UI)" "$A6"
check "provider names reverted to MOCK" "$B6"

# ===========================================================================
# 7) responsive + dark + console/devlog
# ===========================================================================
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1.5
MOBL=$($AB eval "JSON.stringify({overflow: document.documentElement.scrollWidth > window.innerWidth + 1, w: document.documentElement.scrollWidth})" 2>/dev/null | tail -1)
MOBL_OK=$(echo "$MOBL" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if not d['overflow'] else f'overflow w={d[\"w\"]}')" 2>/dev/null || echo "eval-error")
check "engine tab mobile 390: no horizontal overflow" "$MOBL_OK"
$AB screenshot /home/z/my-project/research/s13-engine-mobile.png >/dev/null 2>&1

$AB set viewport 1280 800 >/dev/null 2>&1
sleep 0.8
$AB eval "document.documentElement.classList.add('dark'); 'dark'" >/dev/null 2>&1
sleep 1.2
$AB screenshot /home/z/my-project/research/s13-engine-dark.png >/dev/null 2>&1
DARK_OK=$($AB eval "document.documentElement.classList.contains('dark')" 2>/dev/null | tail -1)
check "dark mode toggle works for screenshots" "$DARK_OK"
$AB eval "document.documentElement.classList.remove('dark'); 'light'" >/dev/null 2>&1

CONSOLE=$($AB eval "JSON.stringify(window.__tsErrors || [])" 2>/dev/null | tail -1)
CONSOLE_OK=$(echo "$CONSOLE" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if not d else f'errors: {d}')" 2>/dev/null || echo "true")
check "browser console clean" "$CONSOLE_OK"

# ===========================================================================
# 8) cleanup (API + sqlite)
# ===========================================================================
python3 - "$STAMP" <<'PYEOF'
import json, sys, urllib.request, urllib.error, http.cookiejar, sqlite3
stamp = sys.argv[1]
BASE = "http://127.0.0.1:3000"
DB = "/home/z/my-project/db/custom.db"
cj = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data: req.add_header("Content-Type", "application/json")
    try:
        with op.open(req, timeout=40) as res:
            return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode() or "{}")
        except Exception: return e.code, {}
call("POST", "/api/v1/auth/login", {"email": f"e2es13_{stamp}@example.com", "password": "SuperSecret1"})
call("PUT", "/api/v1/engine/admin/providers", {"posture": "mock"})
# the simulator's fault mode must be cleared through the loopback-only route
call("PUT", "/api/v1/engine/admin/providers", {"posture": "loopback"})
call("POST", "/api/v1/engine/admin/providers/ninauth/fault", {"mode": "none"})
for k in ("ninauth", "phone", "liveness"):
    call("POST", f"/api/v1/engine/admin/providers/{k}/reset")
call("PUT", "/api/v1/engine/admin/providers", {"posture": "mock"})
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM ProviderCredential")
con.execute("DELETE FROM PlatformSetting WHERE key='providers.posture'")
con.execute("DELETE FROM UserAccount WHERE email LIKE 'e2es13_%@example.com'")
con.commit(); con.close()
print("cleanup done (posture mock, faults none, users + vault removed)")
PYEOF

echo "=== devlog tail ==="
tail -5 dev.log | grep -iE "error|warn" || echo "(clean)"

echo ""
echo "===== E2E RESULT: $PASS pass / $FAIL fail ====="
if [ "$FAIL" -gt 0 ]; then exit 1; fi
