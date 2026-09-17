#!/usr/bin/env bash
# TrustScore Stage 11 — browser E2E (single-call pattern per worklog quirk).
# Journey: alex is seeded with a 3-snapshot history via the API (INITIAL →
# +government ID → +phone) → signs in through the UI → opens the Trust
# Passport tab → sees the Score Insights card: snapshot count badge, CSV/JSON
# export anchors, sparkline with hover zones, summary strip, latest-change
# component breakdown, change timeline with window events, honest NDPA note
# → hovers a spark point (tooltip) → mini-trend under the score gauge →
# mobile 390 + dark + console [] + devlog clean.
set -u
cd /home/z/my-project

bash tests/restart-dev.sh
echo "=== server warm ==="

AB="agent-browser"
$AB close --all >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1

STAMP=$(( $(date +%s) % 100000000 ))
ALEX_EMAIL="e2es11_${STAMP}@example.com"
ALEX_HANDLE="e2es11${STAMP}"

# --- API setup: 3 snapshots via real material changes ----------------------
python3 - "$STAMP" <<'PYEOF'
import json, re, sys, urllib.request, http.cookiejar, sqlite3
stamp = sys.argv[1]
BASE = "http://127.0.0.1:3000"
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

con = sqlite3.connect("/home/z/my-project/db/custom.db", timeout=30)
con.execute("DELETE FROM UserAccount WHERE email LIKE 'e2es11_%@example.com'")
con.commit(); con.close()

alex = client()
s, b = call(alex, "POST", "/api/v1/auth/register", {
    "email": f"e2es11_{stamp}@example.com", "password": "SuperSecret1",
    "displayName": "Stage Eleven E2E", "handle": f"e2es11{stamp}", "acceptTerms": True})
assert s == 201, f"register {s} {b}"
call(alex, "GET", "/api/v1/passport/me")  # snapshot 1: INITIAL
s, b = call(alex, "POST", "/api/v1/identity/sessions", {})
sid = b["session"]["id"]
s, b = call(alex, "POST", f"/api/v1/identity/sessions/{sid}/consent",
            {"decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status"]})
s, b = call(alex, "POST", f"/api/v1/identity/sessions/{sid}/callback",
            {"code": b["code"], "state": b["state"]})
call(alex, "GET", "/api/v1/passport/me")  # snapshot 2: +government ID
phone = f"0803 555 {int(stamp) % 9000:04d}"
s, b = call(alex, "POST", "/api/v1/identity/signals/phone/start", {"phone": phone})
code = re.search(r"\b(\d{6})\b", b["delivery"]["message"]).group(1)
s, b = call(alex, "POST", "/api/v1/identity/signals/phone/confirm",
            {"verificationId": b["verification"]["id"], "code": code})
assert s == 200, f"phone {s} {b}"
s, b = call(alex, "GET", "/api/v1/passport/me")  # snapshot 3: +phone
print(f"setup ok — alex score {b['score']['score']} (3 snapshots)")
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
  for i in $(seq 1 12); do
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
# 1) ALEX — Passport tab: the Score Insights card
# ===========================================================================
login_user "$ALEX_EMAIL"
tab_click "Trust Passport"
sleep 2.5
echo "--- 1. score insights card surface ---"
R=$($AB eval "JSON.stringify({
  cardTitle: document.body.textContent.includes('Why did my score change?'),
  snapshotBadge: document.body.textContent.includes('3 snapshots'),
  csvLink: !!document.querySelector('a[href*=\"score-history/export?format=csv\"]'),
  jsonLink: !!document.querySelector('a[href*=\"score-history/export?format=json\"]'),
  sparkline: !!document.querySelector('[aria-label^=\"Score trend chart\"]'),
  hoverZones: document.querySelectorAll('button[aria-label^=\"Snapshot \"]').length,
  summaryStrip: document.body.textContent.includes('Since first') && document.body.textContent.includes('Range'),
  latestChange: document.body.textContent.includes('Latest change'),
  identityBreakdown: document.body.textContent.includes('Identity Assurance'),
  timeline: document.body.textContent.includes('Change timeline'),
  profileChangeChip: document.body.textContent.includes('profile change'),
  policyChip: document.body.textContent.includes('policy v1'),
  windowEvents: document.body.textContent.includes('Recorded between these snapshots'),
  phoneEvent: document.body.textContent.includes('Phone number verified'),
  honestNote: document.body.textContent.includes('correlated context, not a causal verdict'),
  miniTrend: !!document.querySelector('[aria-label^=\"Score trend over\"]'),
  gaugescore: document.body.textContent.includes('/ 100'),
})" 2>/dev/null | tail -1)
echo "$R" | python3 -c "
import json,sys
d = json.loads(json.load(sys.stdin))
ok = True
for k, v in d.items():
    print(('  [PASS] ' if v else '  [FAIL] ') + k)
"
PASS=$((PASS+18)); FAIL_EVAL=$(echo "$R" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print(sum(1 for v in d.values() if not v))")
FAIL=$((FAIL+FAIL_EVAL))

# ===========================================================================
# 2) sparkline interaction — tooltip on hover
# ===========================================================================
echo "--- 2. sparkline hover tooltip ---"
ZONE=$($AB snapshot -i 2>/dev/null | grep -oE 'button "Snapshot 2 of 3[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB hover "@${ZONE}" >/dev/null 2>&1
sleep 0.6
TOOLTIP=$($AB eval "document.querySelector('[role=status]')?.textContent || 'none'" 2>/dev/null | tail -1)
check "tooltip shows score 26 on point hover" "$(echo "$TOOLTIP" | grep -q '^\"26' && echo true || echo false)"

# keyboard access: focus the first zone
$AB eval "document.querySelectorAll('button[aria-label^=\"Snapshot \"]')[0].focus(); 'focused'" >/dev/null 2>&1
sleep 0.4
TOOLTIP_K=$($AB eval "document.querySelector('[role=status]')?.textContent || 'none'" 2>/dev/null | tail -1)
check "tooltip visible on keyboard focus" "$(echo "$TOOLTIP_K" | grep -qE '^\"[0-9]+' && echo true || echo false)"

# ===========================================================================
# 3) exports anchors (href + download attribute)
# ===========================================================================
echo "--- 3. export anchors ---"
EXPORTS=$($AB eval "JSON.stringify({
  csvHref: document.querySelector('a[href*=\"format=csv\"]')?.getAttribute('href') || '',
  jsonHref: document.querySelector('a[href*=\"format=json\"]')?.getAttribute('href') || '',
  csvDownload: document.querySelector('a[href*=\"format=csv\"]')?.hasAttribute('download') || false,
})" 2>/dev/null | tail -1)
CSV_OK=$(echo "$EXPORTS" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['csvHref']=='/api/v1/passport/score-history/export?format=csv' and d['jsonHref'].endswith('format=json') and d['csvDownload'] else 'false')")
check "export anchors point at the API with download attr" "$CSV_OK"

# ===========================================================================
# 4) empty state — a brand-new member (one snapshot)
# ===========================================================================
echo "--- 4. single-snapshot empty state ---"
FRESH_EMAIL="e2es11f_${STAMP}@example.com"
python3 - "$STAMP" <<'PYEOF'
import json, sys, urllib.request, http.cookiejar
stamp = sys.argv[1]
BASE = "http://127.0.0.1:3000"
cj = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data: req.add_header("Content-Type", "application/json")
    with op.open(req, timeout=40) as res:
        return res.status, res.read().decode()
call("POST", "/api/v1/auth/register", {
    "email": f"e2es11f_{stamp}@example.com", "password": "SuperSecret1",
    "displayName": "Fresh Eleven", "handle": f"e2es11f{stamp}", "acceptTerms": True})
call("GET", "/api/v1/passport/me")
print("fresh ok")
PYEOF
login_user "$FRESH_EMAIL"
tab_click "Trust Passport"
sleep 2.5
FRESH=$($AB eval "JSON.stringify({
  oneSnapshot: document.body.textContent.includes('1 snapshot'),
  onlyOneMsg: document.body.textContent.includes('Only one snapshot so far'),
  buildsMsg: document.body.textContent.includes('history builds as your evidence changes'),
  noTimeline: !document.body.textContent.includes('Change timeline'),
})" 2>/dev/null | tail -1)
FRESH_OK=$(echo "$FRESH" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if all(d.values()) else 'false')")
check "single-snapshot empty state honest" "$FRESH_OK"

# ===========================================================================
# 5) responsive + dark + console + devlog
# ===========================================================================
echo "--- 5. responsive / dark / console ---"
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1
MOB=$($AB eval "document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 ? 'OK' : 'OVERFLOW'" 2>/dev/null | tail -1)
check "mobile 390 no horizontal overflow" "$(echo "$MOB" | grep -q OK && echo true || echo false)"
$AB set viewport 1440 900 >/dev/null 2>&1
$AB eval "document.documentElement.classList.toggle('dark', true); 'dark'" >/dev/null 2>&1
sleep 0.8
DARK_LEGIBLE=$($AB eval "getComputedStyle(document.querySelector('[aria-label^=\"Score trend chart\"]')).display !== 'none'" 2>/dev/null | tail -1)
check "dark mode sparkline renders" "$DARK_LEGIBLE"
$AB eval "document.documentElement.classList.remove('dark'); 'light'" >/dev/null 2>&1
CONSOLE=$($AB console 2>/dev/null | grep -viE "hmr|fast refresh|devtools|^\[" | head -3)
check "console clean (no app errors)" "$([ -z "$CONSOLE" ] && echo true || echo false)"

# ===========================================================================
# 6) cleanup
# ===========================================================================
python3 - "$STAMP" <<'PYEOF'
import sqlite3, sys
stamp = sys.argv[1]
con = sqlite3.connect("/home/z/my-project/db/custom.db", timeout=30)
rows = con.execute("SELECT id FROM UserAccount WHERE email LIKE 'e2es11%_%@example.com'").fetchall()
ids = [r[0] for r in rows]
if ids:
    q = ",".join("?" for _ in ids)
    con.execute(f"DELETE FROM TrustScoreSnapshot WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM Credential WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM IdentityIdentifier WHERE trustIdentityId IN (SELECT id FROM TrustIdentity WHERE userId IN ({q}))", ids)
    con.execute(f"DELETE FROM IdentityAttribute WHERE trustIdentityId IN (SELECT id FROM TrustIdentity WHERE userId IN ({q}))", ids)
    con.execute(f"DELETE FROM Evidence WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM PhoneVerification WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM VerificationSession WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM Consent WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM Notification WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM Session WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM AuditEvent WHERE actorId IN ({q})", ids)
    con.execute(f"DELETE FROM TrustIdentity WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM UserAccount WHERE id IN ({q})", ids)
    con.commit()
n = con.execute("SELECT COUNT(*) FROM UserAccount WHERE email LIKE 'e2es11%_%@example.com'").fetchone()[0]
con.close()
print("cleanup ok" if n == 0 else "CLEANUP FAILED")
PYEOF

echo "=== DEVLOG ==="
tail -4 /home/z/my-project/dev.log
echo "=== RESULT: $((18+6)) checks — see above for pass/fail lines ==="
[ "$FAIL" -eq 0 ] || { echo "FAILURES: $FAIL"; exit 1; }
echo "STAGE 11 E2E: ALL GREEN"
