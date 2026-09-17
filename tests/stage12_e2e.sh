#!/usr/bin/env bash
# TrustScore Stage 12 — browser E2E (single-call pattern per worklog quirk).
# Journey: (1) logged-out landing — the public #scoring policy explainer
# renders the LIVE policy (v1 badge, DPIA, gated decisions, five component
# budgets with real numbers, thresholds, governance, rights) + the Scoring
# nav link works. (2) A victim is seeded via the API with a REAL material
# drop (flag → CONFIRMED, −25) → signs in → Privacy & Security shows the
# amber SCORE receipt with its "View in Score Insights" link → clicking it
# deep-links to the Trust Passport tab → the score-history card shows the
# amber material-drop chip, ring markers, legend and the Material-only
# filter (toggles). (3) Mobile 390 + dark + console [] + devlog clean.
set -u
cd /home/z/my-project

bash tests/restart-dev.sh
echo "=== server warm ==="

AB="agent-browser"
$AB close --all >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1

STAMP=$(( $(date +%s) % 100000000 ))
V_EMAIL="e2es12_${STAMP}@example.com"
V_HANDLE="e2es12${STAMP}"

# --- API setup: victim with a REAL material drop (flag -> CONFIRMED) -------
python3 - "$STAMP" <<'PYEOF'
import json, re, sys, time, urllib.request, urllib.error, http.cookiejar, sqlite3
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

# clear any prior e2es12 users
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM UserAccount WHERE email LIKE 'e2es12_%@example.com'")
con.commit(); con.close()

vic, rep, rev = client(), client(), client()
def register(op, tag):
    email = f"e2es12_{tag}_{stamp}@example.com"
    s, b = call(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1", "displayName": "Stage Twelve E2E",
        "handle": f"e2es12{tag}{stamp}", "acceptTerms": True})
    assert s == 201, f"register {tag} {s} {b}"
    return email
def verify(op, phone):
    s, b = call(op, "POST", "/api/v1/identity/sessions", {})
    sid = b["session"]["id"]
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/consent",
                {"decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status"]})
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/callback",
                {"code": b["code"], "state": b["state"]})
    assert s == 200, f"identity {s} {b}"
    s, b = call(op, "POST", "/api/v1/identity/signals/phone/start", {"phone": phone})
    code = re.search(r"\b(\d{6})\b", b["delivery"]["message"]).group(1)
    s, b = call(op, "POST", "/api/v1/identity/signals/phone/confirm",
                {"verificationId": b["verification"]["id"], "code": code})
    assert s == 200, f"phone {s} {b}"

v_email = f"e2es12_{stamp}@example.com"  # exact match for the shell V_EMAIL
s, b = call(vic, "POST", "/api/v1/auth/register", {
    "email": v_email, "password": "SuperSecret1", "displayName": "Stage Twelve E2E",
    "handle": f"e2es12{stamp}", "acceptTerms": True})
assert s == 201, f"register victim {s} {b}"
register(rep, "r")
register(rev, "w")
verify(vic, f"0803 555 {int(stamp) % 9000:04d}")
verify(rep, "0803 555 0007")
con = sqlite3.connect(DB, timeout=30)
con.execute("UPDATE UserAccount SET role='REVIEWER' WHERE email=?", (f"e2es12_w_{stamp}@example.com",))
con.commit(); con.close()

s, b = call(vic, "GET", "/api/v1/passport/me")
print(f"victim baseline: {b['score']['score']}")
s, b = call(rep, "POST", "/api/v1/reputation/flags", {
    "subjectHandle": f"e2es12{stamp}", "category": "FRAUD",
    "description": ("Paid for a laptop on a marketplace listing and the seller went "
                    "silent after the transfer. Chat logs and transfer receipts available."),
    "evidence": [{"kind": "TEXT", "content": "Marketplace order #81231 chat export."}]})
assert s == 201, f"flag {s} {b}"
flag_id = b["flagId"]
call(vic, "POST", f"/api/v1/reputation/flags/{flag_id}/respond", {
    "response": "The order was refunded in full — the refund receipt is attached to my appeal."})
s, b = call(rev, "POST", f"/api/v1/reputation/review/{flag_id}/decision", {
    "outcome": "CONFIRMED",
    "rationale": "Reporter's transfer receipts and chat logs corroborate the claim."})
assert s == 200, f"decision {s} {b}"
s, b = call(vic, "GET", "/api/v1/passport/me")
print(f"victim after confirm: {b['score']['score']} (receipt expected)")
s, b = call(vic, "GET", "/api/v1/passport/notifications")
score_notes = [n for n in b.get("notifications", []) if n.get("type") == "SCORE"]
assert len(score_notes) == 1, f"expected 1 receipt, got {len(score_notes)}"
print(f"receipt title: {score_notes[0]['title']}")
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
# 1) LANDING (logged out) — the public policy explainer
# ===========================================================================
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
$AB wait --load networkidle >/dev/null 2>&1
sleep 2
echo "--- 1. public #scoring section ---"
R=$($AB eval "JSON.stringify({
  a: !!document.getElementById('scoring') && (document.getElementById('scoring-heading')?.textContent || '').includes('No mystery numbers'),
  b: document.body.textContent.includes('Policy v1 · ACTIVE') && document.body.textContent.includes('DPIA COMPLETED') && document.body.textContent.includes('automated decisions gated OFF'),
  c: ['Identity Assurance','Verified Credentials','Verified Reputation','Resolution History','Confirmed Risk'].every(x=>document.body.textContent.includes(x)),
  d: ['max +60','max +20','max +15','max +10','max −50'].every(x=>document.body.textContent.includes(x)),
  e: document.body.textContent.includes('L2·34') && document.body.textContent.includes('15 days from expiry'),
  f: document.body.textContent.includes('ESTABLISHED requires identity level L2+') && document.body.textContent.includes('Snapshots stay fresh for 24h'),
  g: document.body.textContent.includes('How the policy changes') && document.body.textContent.includes('Material drops notify you'),
  h: Array.from(document.querySelectorAll('header nav a')).some(a=>a.getAttribute('href')==='#scoring'),
})" 2>/dev/null | tail -1)
NAMES="scoring section+heading|policy/DPIA/gate badges|five component cards|live budgets|max/ladder/freshness|thresholds+TTL|governance+rights|nav Scoring link"
echo "$R" | python3 -c "
import json, sys
d = json.loads(json.load(sys.stdin))
names = '''$NAMES'''.split('|')
for k, name in zip(sorted(d.keys()), names):
    print(('  [PASS] ' if d[k] else '  [FAIL] ') + name)
" 2>/dev/null || echo "  [EVAL ERROR] section 1"
PASS=$((PASS+$(echo "$R" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print(sum(1 for v in d.values() if v))" 2>/dev/null || echo 0)))
FAIL=$((FAIL+$(echo "$R" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print(sum(1 for v in d.values() if not v))" 2>/dev/null || echo 0)))

# nav anchor scroll: click Scoring → section lands in view
$AB eval "document.querySelector('header nav a[href=\"#scoring\"]').click(); 'clicked'" >/dev/null 2>&1
sleep 1.2
INVIEW=$($AB eval "(() => { const s = document.getElementById('scoring'); const r = s.getBoundingClientRect(); return r.top >= -40 && r.top < window.innerHeight * 0.5; })()" 2>/dev/null | tail -1)
check "nav Scoring link scrolls the section into view" "$INVIEW"

# landing at mobile 390 — the explainer must not overflow (implicit auto
# grid tracks + nowrap truncate content is the known trap; grid-cols-1 fixes)
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1.2
MOBL=$($AB eval "JSON.stringify({overflow: document.documentElement.scrollWidth > window.innerWidth + 1, w: document.documentElement.scrollWidth})" 2>/dev/null | tail -1)
MOBL_OK=$(echo "$MOBL" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if not d['overflow'] else f'overflow w={d[\"w\"]}')" 2>/dev/null || echo "eval-error")
check "landing mobile 390: no horizontal overflow" "$MOBL_OK"
$AB screenshot /home/z/my-project/research/s12-mobile-scoring.png >/dev/null 2>&1
$AB set viewport 1280 800 >/dev/null 2>&1
sleep 0.8

# ===========================================================================
# 2) VICTIM — the material-drop receipt in Privacy & Security
# ===========================================================================
login_user "$V_EMAIL"
tab_click "Privacy"
sleep 2.5
echo "--- 2. score-drop receipt (Security Center) ---"
R2=$($AB eval "JSON.stringify({
  receiptTitle: document.body.textContent.includes('TrustScore change: 46 → 21 (−25)'),
  receiptBody: document.body.textContent.includes('Score Insights') && document.body.textContent.includes('appealable'),
  insightsLink: Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('View in Score Insights')),
  amberUnread: !!document.querySelector('.ts-pulse.bg-amber-500, .bg-amber-500.ts-pulse'),
})" 2>/dev/null | tail -1)
V2=$(echo "$R2" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if all([d['receiptTitle'], d['receiptBody'], d['insightsLink'], d['amberUnread']]) else str(d))")
check "receipt rendered with numbers, rights + deep-link" "$V2"

# click the deep-link → lands on the Trust Passport tab
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('View in Score Insights'))?.click(); 'clicked'" >/dev/null 2>&1
sleep 2
ONPASSPORT=$($AB eval "document.querySelector('[role=tab][data-state=active]')?.textContent?.includes('Passport') || 'no'" 2>/dev/null | tail -1)
check "deep-link switches to the Trust Passport tab" "$(echo "$ONPASSPORT" | grep -q true && echo true || echo false)"

echo "--- 3. score-history material markers ---"
R3=$($AB eval "JSON.stringify({
  materialChip: document.body.textContent.includes('material drop · you were notified'),
  legend: document.body.textContent.includes('amber ring — material drop'),
  filterChip: Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Material only (±10+)')),
  ringCircles: document.querySelectorAll('svg circle[class*=\"amber\"]').length,
  deltaBadge: document.body.textContent.includes('−25'),
})" 2>/dev/null | tail -1)
V3=$(echo "$R3" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if d['materialChip'] and d['legend'] and d['filterChip'] and d['ringCircles']>=1 and d['deltaBadge'] else str(d))")
check "material chip + ring markers + legend + filter present" "$V3"

# toggle the material-only filter (aria-pressed)
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Material only'))?.click(); 'toggled'" >/dev/null 2>&1
sleep 0.8
PRESSED=$($AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Material only'))?.getAttribute('aria-pressed') || 'missing'" 2>/dev/null | tail -1)
check "material-only filter toggles (aria-pressed)" "$(echo "$PRESSED" | grep -q '\"true\"' && echo true || echo false)"
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Material only'))?.click(); 'untoggled'" >/dev/null 2>&1
sleep 0.6

# ===========================================================================
# 4) dark mode + mobile + console
# ===========================================================================
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1
sleep 0.8
DARK=$($AB eval "document.documentElement.classList.contains('dark')" 2>/dev/null | tail -1)
check "dark mode applies" "$(echo "$DARK" | grep -q true && echo true || echo false)"
$AB screenshot /home/z/my-project/research/s12-dark-passport.png >/dev/null 2>&1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1
sleep 0.5

$AB set viewport 390 844 >/dev/null 2>&1
sleep 1
MOB=$($AB eval "JSON.stringify({hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1})" 2>/dev/null | tail -1)
MOB_OK=$(echo "$MOB" | python3 -c "import json,sys; d=json.loads(json.load(sys.stdin)); print('true' if not d['hOverflow'] else 'h-overflow')" 2>/dev/null || echo "eval-error")
check "mobile 390: no horizontal overflow" "$MOB_OK"
$AB screenshot /home/z/my-project/research/s12-mobile-scoring.png >/dev/null 2>&1
$AB set viewport 1280 800 >/dev/null 2>&1

CONSOLE=$($AB eval "JSON.stringify((window.__consoleErrors ?? []))" 2>/dev/null | tail -1)
check "console errors empty" "$(echo "$CONSOLE" | grep -q '\[\]' && echo true || echo false)"

# ===========================================================================
# 5) cleanup
# ===========================================================================
python3 - "$STAMP" <<'PYEOF'
import sqlite3, sys
stamp = sys.argv[1]
con = sqlite3.connect("/home/z/my-project/db/custom.db", timeout=30)
rows = con.execute("SELECT id FROM UserAccount WHERE email LIKE 'e2es12_%@example.com'").fetchall()
ids = [r[0] for r in rows]
if ids:
    q = ",".join("?" for _ in ids)
    con.execute(f"DELETE FROM FlagEvidence WHERE flagId IN (SELECT id FROM Flag WHERE reporterId IN ({q}) OR subjectId IN ({q}))", ids+ids)
    con.execute(f"DELETE FROM FlagResolution WHERE flagId IN (SELECT id FROM Flag WHERE reporterId IN ({q}) OR subjectId IN ({q}))", ids+ids)
    con.execute(f"DELETE FROM FlagAppeal WHERE flagId IN (SELECT id FROM Flag WHERE reporterId IN ({q}) OR subjectId IN ({q}))", ids+ids)
    con.execute(f"DELETE FROM Flag WHERE reporterId IN ({q}) OR subjectId IN ({q})", ids+ids)
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
    con.execute(f"DELETE FROM AuditEvent WHERE actorId IN ({q}) OR subjectId IN ({q})", ids+ids)
    con.execute(f"DELETE FROM TrustIdentity WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM UserAccount WHERE id IN ({q})", ids)
    con.commit()
n = con.execute("SELECT COUNT(*) FROM UserAccount WHERE email LIKE 'e2es12_%@example.com'").fetchone()[0]
con.close()
print("cleanup ok" if n == 0 else "CLEANUP FAILED")
PYEOF

echo "=== DEVLOG ==="
grep -iE "error|warn|fail" /home/z/my-project/dev.log | grep -v "favicon" | tail -5 || echo "dev.log clean"
echo "=== RESULT: $PASS pass / $FAIL fail ==="
[ "$FAIL" -eq 0 ] || { echo "FAILURES: $FAIL"; exit 1; }
echo "STAGE 12 E2E: ALL GREEN"
