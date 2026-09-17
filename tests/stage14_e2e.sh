#!/usr/bin/env bash
# TrustScore Stage 14 — browser E2E (single-call pattern per worklog quirk).
# Journey: (1) logged-out landing shows the Stage 14 roadmap entry. (2) A
# fresh ADMIN signs in → Trust Engine tab → the transport observability card
# renders under the provider console (threshold control, Snapshot now, three
# history rows, MOCK honesty note). (3) "Snapshot now" increments the visible
# snapshot count; the threshold control saves 30s and the card reflects it.
# (4) API-driven failure drill: loopback + fault 5xx trips the ninauth circuit,
# the 6s sustained threshold elapses, an evaluation pass raises the alert →
# the browser reload shows the red "Sustained-open alert" banner + the OPEN
# transition in the log. (5) Recovery: fault cleared, half-open probe
# succeeds → reload shows the CLOSED transition, banner gone, recovery note
# visible in the notification feed. (6) State restored (mock, 45s, circuits
# reset). (7) Mobile 390 + dark mode, console [] and devlog clean.
set -u
cd /home/z/my-project

bash tests/restart-dev.sh
echo "=== server warm ==="
bash mini-services/provider-simulator/start.sh
bash mini-services/webhook-worker/start.sh

AB="agent-browser"
$AB close --all >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1

STAMP=$(( $(date +%s) % 100000000 ))
A_EMAIL="e2es14_${STAMP}@example.com"
COOKIEJAR="/tmp/s14e2e_cookies.txt"
# Test-window start (Prisma 'YYYY-MM-DDTHH:MM:SS.mmmZ' format) for cleanup.
TEST_START=$(python3 -c "from datetime import datetime, timezone; print(datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z'))")

# --- API setup: fresh ADMIN + normalize stale state -------------------------
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

# clear prior e2es14 users + stale transport settings (idempotent entry)
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM UserAccount WHERE email LIKE 'e2es14_%@example.com'")
con.execute("DELETE FROM PlatformSetting WHERE key IN ('providers.posture','transport.alert.sustainedMs','transport.alerts')")
con.commit(); con.close()

a_email = f"e2es14_{stamp}@example.com"
a = client()
s, b = call(a, "POST", "/api/v1/auth/register", {
    "email": a_email, "password": "SuperSecret1", "displayName": "Stage Fourteen E2E",
    "handle": f"e2es14{stamp}", "acceptTerms": True})
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

# API helper driving the admin session through the SAME browser cookies.
api() { # METHOD PATH [JSON_BODY]
  local METHOD="$1" PATH_="$2" BODY_="${3:-}"
  if [ -n "$BODY_" ]; then
    $AB eval "fetch('${PATH_}', { method: '${METHOD}', headers: {'Content-Type':'application/json'}, body: JSON.stringify(${BODY_}) }).then(r => r.json().then(j => JSON.stringify({status: r.status, body: j})))" 2>/dev/null | tail -1
  else
    $AB eval "fetch('${PATH_}', { method: '${METHOD}' }).then(r => r.json().then(j => JSON.stringify({status: r.status, body: j})))" 2>/dev/null | tail -1
  fi
}

countcheck() { # NAME EXPECTED ACTUAL
  if [ "$3" = "$2" ]; then PASS=$((PASS+1)); echo "  [PASS] $1 ($3)";
  else FAIL=$((FAIL+1)); echo "  [FAIL] $1 (want $2 got $3)"; fi
}

PASS=0; FAIL=0
check() {
  if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1";
  else FAIL=$((FAIL+1)); echo "  [FAIL] $1 ($2)"; fi
}

# ===========================================================================
# 1) LANDING — Stage 14 roadmap entry (logged out)
# ===========================================================================
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 2
echo "--- 1. landing roadmap ---"
R=$($AB eval "JSON.stringify({
  a: document.body.textContent.includes('Transport observability'),
  b: document.body.textContent.includes('sustained threshold alerts every admin'),
  c: document.querySelector('#roadmap')?.textContent.includes('In progress'),
  d: document.body.textContent.includes('(Stage 14)'),
})" 2>/dev/null | tail -1)
A=$(echo "$R" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['a'] else 'false')" 2>/dev/null)
B=$(echo "$R" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['b'] else 'false')" 2>/dev/null)
C=$(echo "$R" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['c'] else 'false')" 2>/dev/null)
D=$(echo "$R" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['d'] else 'false')" 2>/dev/null)
check "roadmap shows the Stage 14 'Transport observability' entry" "$A"
check "roadmap detail mentions admin alerts" "$B"
check "stage 14 marked in progress (spinner state)" "$C"
check "hero carries the Stage 14 badge" "$D"
$AB screenshot /home/z/my-project/research/s14-landing-roadmap.png >/dev/null 2>&1

# ===========================================================================
# 2) ADMIN — transport observability card (Engine tab)
# ===========================================================================
login_user "$A_EMAIL"
tab_click "Engine"
sleep 3.5
echo "--- 2. observability card (MOCK posture) ---"
R2=$($AB eval "JSON.stringify({
  card: !!document.querySelector('[data-testid=transport-history]'),
  badge: document.querySelector('[data-testid=history-posture-badge]')?.textContent?.includes('MOCK'),
  threeRows: ['ninauth','phone','liveness'].every(k => !!document.querySelector('[data-testid=history-row-' + k + ']')),
  thresholdInput: !!document.querySelector('[data-testid=threshold-input]'),
  snapshotBtn: !!document.querySelector('[data-testid=snapshot-now]'),
  defaultThreshold: document.querySelector('[data-testid=threshold-input]')?.value === '45',
  mockHonesty: document.body.textContent.includes('MOCK posture never alerts'),
  workerNote: document.body.textContent.includes(':3031) persists a snapshot per provider every 60s'),
})" 2>/dev/null | tail -1)
NAMES2="observability card renders|MOCK honesty badge|three history rows|threshold input|Snapshot now button|default 45s threshold|MOCK never-alerts note|worker tick note"
echo "$R2" | python3 -c "
import json, sys
d = json.loads(json.load(sys.stdin))
names = '''$NAMES2'''.split('|')
for (k, v), name in zip(sorted(d.items()), names):
    print(('  [PASS] ' if v else '  [FAIL] ') + name)
" 2>/dev/null || echo "  [EVAL ERROR] section 2"
PASS=$((PASS+$(echo "$R2" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print(sum(1 for v in d.values() if v))" 2>/dev/null || echo 0)))
FAIL=$((FAIL+$(echo "$R2" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print(sum(1 for v in d.values() if not v))" 2>/dev/null || echo 0)))
$AB screenshot /home/z/my-project/research/s14-card-mock.png >/dev/null 2>&1

echo "--- 2b. Snapshot now increments the visible count ---"
SNAPS_BEFORE=$($AB eval "(() => { const m = document.querySelector('[data-testid=history-row-ninauth]')?.textContent.match(/(\d+) snapshot/); return m ? m[1] : 'none'; })()" 2>/dev/null | tail -1 | tr -d '"')
$AB eval "document.querySelector('[data-testid=snapshot-now]').click(); 'clicked'" >/dev/null 2>&1
sleep 3
SNAPS_AFTER=$($AB eval "(() => { const m = document.querySelector('[data-testid=history-row-ninauth]')?.textContent.match(/(\d+) snapshot/); return m ? m[1] : 'none'; })()" 2>/dev/null | tail -1 | tr -d '"')
if [ "$SNAPS_AFTER" != "none" ] && [ "$SNAPS_BEFORE" != "none" ] && [ "$SNAPS_AFTER" -gt "$SNAPS_BEFORE" ]; then
  PASS=$((PASS+1)); echo "  [PASS] Snapshot now grows ninauth snapshot count ($SNAPS_BEFORE -> $SNAPS_AFTER)"
else
  FAIL=$((FAIL+1)); echo "  [FAIL] Snapshot now grows ninauth snapshot count ($SNAPS_BEFORE -> $SNAPS_AFTER)"
fi

echo "--- 2c. threshold save (30s) ---"
$AB eval "(() => { const i = document.querySelector('[data-testid=threshold-input]'); i.value = ''; return 'cleared'; })()" >/dev/null 2>&1
$AB find label "Sustained-open alert threshold in seconds" fill "30" >/dev/null 2>&1
$AB eval "(() => { const b = Array.from(document.querySelectorAll('[data-testid=observability-controls] button')).find(x => x.textContent.includes('Save')); if (b) { b.click(); return 'saved'; } return 'no-save'; })()" >/dev/null 2>&1
sleep 3.5
R2c=$($AB eval "JSON.stringify({
  current30: document.querySelector('[data-testid=observability-controls]')?.textContent?.includes('current 30s'),
  input30: document.querySelector('[data-testid=threshold-input]')?.value === '30',
})" 2>/dev/null | tail -1)
A2c=$(echo "$R2c" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['current30'] else 'false')" 2>/dev/null)
B2c=$(echo "$R2c" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['input30'] else 'false')" 2>/dev/null)
check "card reflects the tuned threshold (current 30s)" "$A2c"
check "threshold input holds 30" "$B2c"

# ===========================================================================
# 3) FAILURE DRILL — trip, alert, banner (API-driven, browser reloaded)
# ===========================================================================
echo "--- 3. failure drill: loopback + fault + sustained alert ---"
api PUT "/api/v1/engine/admin/providers" '{"posture":"loopback"}' >/dev/null
sleep 6  # posture cache TTL
api POST "/api/v1/engine/admin/providers/ninauth/fault" '{"mode":"error"}' >/dev/null
for i in 1 2 3; do
  api POST "/api/v1/identity/sessions" '{"scopes":["identity.basic"]}' >/dev/null
  sleep 1
done
TRIP_JSON=$(api GET "/api/v1/engine/admin/providers")
CIRCUIT=$(echo "$TRIP_JSON" | python3 -c "
import json, sys
d = json.loads(json.load(sys.stdin))
prov = [p for p in d['body']['providers'] if p['key'] == 'ninauth'][0]
print(prov['transport']['circuit'])" 2>/dev/null)
countcheck "ninauth circuit OPEN after 3 faulted starts (API)" "OPEN" "$CIRCUIT"
api PUT "/api/v1/engine/admin/providers/alerting" '{"sustainedMs":6000}' >/dev/null
sleep 8  # past the 6s threshold
EVAL_JSON=$(api POST "/api/v1/engine/admin/providers/history")
ALERTS=$(echo "$EVAL_JSON" | python3 -c "
import json, sys
d = json.loads(json.load(sys.stdin))
print(','.join(d['body'].get('tick', {}).get('alertsRaised', ['NONE'])))" 2>/dev/null)
countcheck "evaluation raised the sustained-open alert" "ninauth" "$ALERTS"
# reload the engine tab — the banner + OPEN transition must be visible
$AB reload >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 3.5
tab_click "Engine"
sleep 3.5
R3=$($AB eval "JSON.stringify({
  banner: document.querySelector('[data-testid=alert-banner-ninauth]')?.textContent?.includes('Sustained-open alert sent to admins'),
  openChip: !!document.querySelector('[data-testid=history-row-ninauth] [data-testid=circuit-events]')?.textContent?.includes('OPEN'),
  tripReason: document.querySelector('[data-testid=history-row-ninauth] [data-testid=circuit-events]')?.textContent?.includes('PROVIDER_HTTP_ERROR'),
  sparkline: !!document.querySelector('[data-testid=history-row-ninauth] svg'),
})" 2>/dev/null | tail -1)
A3=$(echo "$R3" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['banner'] else 'false')" 2>/dev/null)
B3=$(echo "$R3" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['openChip'] else 'false')" 2>/dev/null)
C3=$(echo "$R3" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['tripReason'] else 'false')" 2>/dev/null)
D3=$(echo "$R3" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['sparkline'] else 'false')" 2>/dev/null)
check "red sustained-open alert banner visible" "$A3"
check "transition log shows the OPEN trip" "$B3"
check "trip carries the PROVIDER_HTTP_ERROR reason" "$C3"
check "error-rate sparkline svg renders" "$D3"
$AB screenshot /home/z/my-project/research/s14-alert-banner.png >/dev/null 2>&1

# ===========================================================================
# 4) RECOVERY — clear fault, half-open probe, banner gone + note in feed
# ===========================================================================
echo "--- 4. recovery ---"
api POST "/api/v1/engine/admin/providers/ninauth/fault" '{"mode":"none"}' >/dev/null
sleep 22  # open window (20s) -> HALF_OPEN
api POST "/api/v1/identity/sessions" '{"scopes":["identity.basic"]}' >/dev/null
sleep 1
REC_JSON=$(api POST "/api/v1/engine/admin/providers/history")
RECOVERED=$(echo "$REC_JSON" | python3 -c "
import json, sys
d = json.loads(json.load(sys.stdin))
tick = d['body'].get('tick', {})
rec = tick.get('recoveriesSent', [])
ninauth_hist = [p for p in d['body']['providers'] if p['key'] == 'ninauth'][0]
print('yes' if ('ninauth' in rec or ninauth_hist.get('alert') is None) else 'no')" 2>/dev/null)
countcheck "recovery evaluated (episode cleared)" "yes" "$RECOVERED"
# notification feed shows the alert + recovery notes (SYSTEM)
FEED=$($AB eval "fetch('/api/v1/passport/notifications').then(r => r.json()).then(j => JSON.stringify(j.notifications.filter(n => n.type === 'SYSTEM').map(n => n.title)))" 2>/dev/null | tail -1)
HAD_ALERT=$(echo "$FEED" | python3 -c "import json,sys; a=json.loads(json.load(sys.stdin)); print('true' if any('sustained open' in t for t in a) else 'false')" 2>/dev/null)
HAD_REC=$(echo "$FEED" | python3 -c "import json,sys; a=json.loads(json.load(sys.stdin)); print('true' if any('recovered' in t for t in a) else 'false')" 2>/dev/null)
check "admin notification feed carries the sustained-open note" "$HAD_ALERT"
check "admin notification feed carries the recovery note" "$HAD_REC"
$AB reload >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 3
tab_click "Engine"
sleep 3.5
R4=$($AB eval "JSON.stringify({
  bannerGone: !document.querySelector('[data-testid=alert-banner-ninauth]'),
  closedEvent: document.querySelector('[data-testid=history-row-ninauth] [data-testid=circuit-events]')?.textContent?.includes('SUCCESS'),
})" 2>/dev/null | tail -1)
A4=$(echo "$R4" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['bannerGone'] else 'false')" 2>/dev/null)
B4=$(echo "$R4" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['closedEvent'] else 'false')" 2>/dev/null)
check "alert banner gone after recovery" "$A4"
check "transition log shows the SUCCESS recovery" "$B4"
$AB screenshot /home/z/my-project/research/s14-recovered.png >/dev/null 2>&1

# ===========================================================================
# 5) restore + mobile + dark
# ===========================================================================
echo "--- 5. restore + responsive + dark ---"
api POST "/api/v1/engine/admin/providers/ninauth/reset" >/dev/null
api PUT "/api/v1/engine/admin/providers" '{"posture":"mock"}' >/dev/null
api PUT "/api/v1/engine/admin/providers/alerting" '{"sustainedMs":45000}' >/dev/null
$AB set viewport 390 844 >/dev/null 2>&1
$AB reload >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 3
tab_click "Engine"
sleep 3.5
R5=$($AB eval "JSON.stringify({
  card: !!document.querySelector('[data-testid=transport-history]'),
  controlsStack: (() => { const c = document.querySelector('[data-testid=observability-controls]'); return c ? getComputedStyle(c).flexDirection === 'column' : false; })(),
  noHScroll: document.documentElement.scrollWidth <= 391,
})" 2>/dev/null | tail -1)
A5=$(echo "$R5" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['card'] else 'false')" 2>/dev/null)
B5=$(echo "$R5" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['controlsStack'] else 'false')" 2>/dev/null)
C5=$(echo "$R5" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['noHScroll'] else 'false')" 2>/dev/null)
check "mobile 390: observability card renders" "$A5"
check "mobile 390: controls stack vertically" "$B5"
check "mobile 390: no horizontal scroll" "$C5"
$AB screenshot /home/z/my-project/research/s14-mobile.png >/dev/null 2>&1

$AB set viewport 1280 800 >/dev/null 2>&1
# class-based dark mode (next-themes attribute="class") — persist the choice
# the way the UI toggle does, so it survives the reload.
$AB eval "localStorage.setItem('theme', 'dark'); document.documentElement.classList.add('dark'); 'dark'" >/dev/null 2>&1
$AB reload >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 3
tab_click "Engine"
sleep 3.5
R5d=$($AB eval "JSON.stringify({
  darkCard: !!document.querySelector('[data-testid=transport-history]'),
  darkScheme: document.documentElement.classList.contains('dark'),
})" 2>/dev/null | tail -1)
A5d=$(echo "$R5d" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['darkCard'] else 'false')" 2>/dev/null)
B5d=$(echo "$R5d" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['darkScheme'] else 'false')" 2>/dev/null)
check "dark mode: card renders" "$A5d"
check "dark mode: scheme applied" "$B5d"
$AB screenshot /home/z/my-project/research/s14-dark.png >/dev/null 2>&1
$AB eval "localStorage.setItem('theme', 'light'); document.documentElement.classList.remove('dark'); 'light'" >/dev/null 2>&1

# ===========================================================================
# 6) cleanup + console/devlog
# ===========================================================================
echo "--- 6. cleanup + console ---"
CONSOLE=$($AB console 2>/dev/null | grep -ciE "error|unhandled" || true)
countcheck "browser console clean" "0" "$CONSOLE"
$AB close >/dev/null 2>&1

python3 - "$STAMP" "$TEST_START" <<'PYEOF'
import sqlite3, sys
stamp = sys.argv[1]
start = sys.argv[2]
DB = "/home/z/my-project/db/custom.db"
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM PlatformSetting WHERE key IN ('transport.alert.sustainedMs','transport.alerts')")
con.execute("DELETE FROM Notification WHERE title LIKE 'Provider circuit%' AND createdAt >= ?", (start,))
con.execute("DELETE FROM TransportSnapshot WHERE createdAt >= ?", (start,))
con.execute("DELETE FROM CircuitEvent WHERE createdAt >= ?", (start,))
email = f"e2es14_{stamp}@example.com"
uid = con.execute("SELECT id FROM UserAccount WHERE email=?", (email,)).fetchone()
if uid:
    uid = uid[0]
    con.execute("DELETE FROM AuditEvent WHERE actorId=? OR subjectId=?", (uid, uid))
    con.execute("DELETE FROM Notification WHERE userId=?", (uid,))
    con.execute("DELETE FROM Session WHERE userId=?", (uid,))
    con.execute("DELETE FROM VerificationSession WHERE userId=?", (uid,))
    con.execute("DELETE FROM TrustIdentity WHERE userId=?", (uid,))
    con.execute("DELETE FROM UserAccount WHERE id=?", (uid,))
con.commit(); con.close()
print("cleanup done")
PYEOF

DEVLOG_ERRS=$(tail -120 /home/z/my-project/dev.log | grep -ciE "⨯|Error:" || true)
countcheck "devlog clean (no runtime errors)" "0" "$DEVLOG_ERRS"

echo ""
echo "===== RESULT: $PASS pass / $FAIL fail ====="
if [ "$FAIL" -gt 0 ]; then exit 1; fi
