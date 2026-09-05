#!/usr/bin/env bash
# TrustScore Stage 10 — browser E2E (single-call pattern per worklog quirk).
# Journey: alex (L2, not yet a member) opens the Trust Network tab → 8-tab
# surface + not-joined graph empty state → joins THROUGH THE UI (consent
# language + ACTIVE badge) → proposes a verified interaction to bella via
# the UI (native-setter React fill) → outgoing request visible → bella
# accepts via API → alex's graph shows the node (SVG), degree + counting
# partners = 1 → reputation component note mentions the network attestation
# (API cross-check) → signals empty state + k-anonymity explainer →
# provider registry (8 corridors, NG MOCK_LIVE) → node click detail →
# mobile 390 + dark + console [] + devlog clean.
set -u
cd /home/z/my-project

bash tests/restart-dev.sh
echo "=== server warm ==="

AB="agent-browser"
$AB close --all >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1

STAMP=$(( $(date +%s) % 100000000 ))
ALEX_EMAIL="e2enet_a_${STAMP}@example.com"
ALEX_HANDLE="e2eneta${STAMP}"
BELLA_EMAIL="e2enet_b_${STAMP}@example.com"
BELLA_HANDLE="e2enetb${STAMP}"

# --- API setup: register + L2 both; bella pre-joins (the UI tests alex) ----
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
con.execute("DELETE FROM UserAccount WHERE email LIKE 'e2enet_%@example.com'")
con.commit(); con.close()

def register(op, email, handle):
    s, b = call(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1", "displayName": "Stage Ten E2E",
        "handle": handle, "acceptTerms": True})
    assert s in (201, 409), f"register {s} {b}"

def l2(op, n):
    s, b = call(op, "POST", "/api/v1/identity/sessions", {})
    sid = b["session"]["id"]
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/consent",
                {"decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status"]})
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/callback",
                {"code": b["code"], "state": b["state"]})
    phone = f"0803 {555 + n} {int(stamp) % 9000:04d}"
    s, b = call(op, "POST", "/api/v1/identity/signals/phone/start", {"phone": phone})
    code = re.search(r"\b(\d{6})\b", b["delivery"]["message"]).group(1)
    s, b = call(op, "POST", "/api/v1/identity/signals/phone/confirm",
                {"verificationId": b["verification"]["id"], "code": code})
    assert s == 200, f"phone {s} {b}"

alex = client()
register(alex, f"e2enet_a_{stamp}@example.com", f"e2eneta{stamp}")
l2(alex, 1)
# alex enables standing safety consent so bella's check in §7 succeeds
s, b = call(alex, "POST", "/api/v1/safety/settings",
            {"enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": True})
assert s == 200, f"alex safety settings {s} {b}"
bella = client()
register(bella, f"e2enet_b_{stamp}@example.com", f"e2enetb{stamp}")
l2(bella, 2)
# bella joins the network via API (the target side); alex joins via the UI
s, b = call(bella, "POST", "/api/v1/network/membership", {"status": "ACTIVE"})
assert s == 200, f"bella join {s} {b}"
print(f"setup ok — alex: e2enet_a_{stamp}@example.com bella: e2enet_b_{stamp}@example.com")
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

fill_native() { # React controlled inputs need the native-setter pattern (by id)
  $AB eval "
    (function(){
      const el = document.getElementById('$1');
      if (!el) return 'missing';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '$2');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return 'filled';
    })()" 2>/dev/null | tail -1
}

# ===========================================================================
# 1) ALEX — the Trust Network tab surface (not yet a member)
# ===========================================================================
login_user "$ALEX_EMAIL"
tab_click "Trust Network"
sleep 2
echo "--- 1. network tab surface (not a member) ---"
$AB eval "JSON.stringify({
  tabs: Array.from(document.querySelectorAll('[role=tab]')).length,
  stageBadge: document.body.textContent.includes('Stage 10 · Trust Network'),
  membershipCard: document.body.textContent.includes('Network membership'),
  notJoined: document.body.textContent.includes('Opt-in — you are not a member yet'),
  joinCta: document.body.textContent.includes('Join the network to build your graph'),
  proposeDisabled: !!document.getElementById('net-propose-handle')?.disabled,
  providersCard: document.body.textContent.includes('Pan-African provider registry'),
  providerCount: document.querySelectorAll('[data-testid=net-providers-list] > li').length,
  ngMockLive: document.body.textContent.includes('MOCK_LIVE'),
  kAnonymity: document.body.textContent.includes('How checkers see signals — k-anonymity'),
  quotaMeter: document.body.textContent.includes('Proposal quota'),
})" 2>&1 | tail -1

# ===========================================================================
# 2) join through the UI
# ===========================================================================
echo "--- 2. join via UI ---"
$AB find role button click --name "Join the Trust Network" >/dev/null 2>&1
sleep 2.5
$AB eval "JSON.stringify({
  activeBadge: document.body.textContent.includes('Active — opt-in consent standing'),
  pauseBtn: !!Array.from(document.querySelectorAll('button')).find(b=>/pause membership/i.test(b.textContent)),
  memberSince: document.body.textContent.includes('Member since'),
  toast: !!document.querySelector('[role=status]') || document.body.textContent.includes('You joined the Trust Network'),
  proposeEnabled: !document.getElementById('net-propose-handle')?.disabled,
})" 2>&1 | tail -1

# ===========================================================================
# 3) propose via UI (native-setter fill) → outgoing visible
# ===========================================================================
echo "--- 3. propose via UI ---"
fill_native "net-propose-handle" "$BELLA_HANDLE"
sleep 0.4
$AB find role button click --name "Propose" >/dev/null 2>&1
sleep 2.5
$AB eval "JSON.stringify({
  outgoing: document.body.textContent.includes('Sent — awaiting response'),
  bellaListed: document.body.textContent.includes('@${BELLA_HANDLE}'),
  cancelBtn: !!Array.from(document.querySelectorAll('button')).find(b=>/cancel/i.test(b.textContent)),
  quotaUsed: (document.body.textContent.match(/(\d)\/3/) || [])[1],
})" 2>&1 | tail -1

# ===========================================================================
# 4) bella accepts (API) → graph shows the node
# ===========================================================================
echo "--- 4. bella accepts (API) → graph renders ---"
BELLA_JAR=/tmp/bella10.jar
curl -s -c $BELLA_JAR -X POST http://127.0.0.1:3000/api/v1/auth/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$BELLA_EMAIL\",\"password\":\"SuperSecret1\"}" >/dev/null
EDGE_ID=$(curl -s -b $BELLA_JAR http://127.0.0.1:3000/api/v1/network/me | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['interactions']['incoming'][0]['id'])")
curl -s -b $BELLA_JAR -X POST "http://127.0.0.1:3000/api/v1/network/interactions/$EDGE_ID/respond" \
  -H "Content-Type: application/json" -d '{"decision":"ACCEPT"}' | head -c 120; echo
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
sleep 2
tab_click "Trust Network"
sleep 2.5
$AB eval "JSON.stringify({
  graphSvg: !!document.querySelector('svg[role=img]'),
  nodeButtons: document.querySelectorAll('svg[role=img] g[role=button]').length,
  degree: document.querySelector('[data-testid=net-standing-degree]')?.textContent,
  counting: document.body.textContent.includes('1 partners'),
  edgeLegend: document.body.textContent.includes('counting edge'),
})" 2>&1 | tail -1

# ===========================================================================
# 5) score wiring cross-check (API): reputation note mentions the attestation
# ===========================================================================
echo "--- 5. score wiring (API cross-check) ---"
ALEX_JAR=/tmp/alex10.jar
curl -s -c $ALEX_JAR -X POST http://127.0.0.1:3000/api/v1/auth/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$ALEX_EMAIL\",\"password\":\"SuperSecret1\"}" >/dev/null
curl -s -b $ALEX_JAR http://127.0.0.1:3000/api/v1/passport/me | python3 -c "
import json, sys
d = json.load(sys.stdin)
comp = {c['key']: c for c in d['score']['components']}
rep = comp['verifiedReputation']
print(json.dumps({
  'repValue': rep['value'],
  'noteMentionsNetwork': 'network attestation' in rep['note'],
  'explanationMentionsAttestation': any('Trust Network attestation' in l for l in d['score']['explanation']),
}))"

# ===========================================================================
# 6) node click → detail panel (name, since, revoke)
# ===========================================================================
echo "--- 6. node click → detail ---"
$AB eval "document.querySelector('svg[role=img] g[role=button]')?.dispatchEvent(new MouseEvent('click',{bubbles:true})); 'clicked'" >/dev/null 2>&1
sleep 1
$AB eval "JSON.stringify({
  detailName: document.body.textContent.includes('Stage Ten E2E'),
  detailHandle: document.body.textContent.includes('@${BELLA_HANDLE}'),
  countingNote: document.body.textContent.includes('counting toward Verified Reputation'),
  revokeBtn: !!Array.from(document.querySelectorAll('button')).find(b=>/revoke attestation/i.test(b.textContent)),
})" 2>&1 | tail -1

# ===========================================================================
# 7) signals empty state (honest zero) + safety-check network block (API)
# ===========================================================================
echo "--- 7. signals zero-state + check network block ---"
$AB eval "JSON.stringify({
  emptySignals: document.body.textContent.includes('No shared signals on record'),
  honestZero: document.body.textContent.includes('never raw complaints'),
  mockPartner: document.body.textContent.includes('MOCK demo participants'),
})" 2>&1 | tail -1
# bella runs a safety check on alex (API) — the assessment must carry the block
curl -s -b $BELLA_JAR -X POST http://127.0.0.1:3000/api/v1/safety/check -H "Content-Type: application/json" \
  -d "{\"handle\":\"$ALEX_HANDLE\"}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
net = d.get('assessment', {}).get('network', {})
print(json.dumps({
  'checkOutcome': d.get('outcome'),
  'networkJoined': net.get('joined'),
  'signalCount': (net.get('sharedSignals') or {}).get('count'),
  'notAGuarantee': 'never a guarantee' in net.get('note', ''),
}))"

# ===========================================================================
# 8) mobile 390 + dark + console
# ===========================================================================
echo "--- 8. mobile/dark/console ---"
$AB eval "window.scrollTo(0,0); 'ok'" >/dev/null 2>&1
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1
$AB eval "JSON.stringify({
  hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  tabsWrap: Array.from(document.querySelectorAll('[role=tab]')).length === 8,
})" 2>&1 | tail -1
$AB set viewport 1280 800 >/dev/null 2>&1
sleep 0.6
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1 || $AB eval "document.querySelector('button[aria-label*=theme i]')?.click(); 'clicked'" >/dev/null 2>&1
sleep 1
$AB eval "JSON.stringify({dark: document.documentElement.classList.contains('dark')})" 2>&1 | tail -1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1 || $AB eval "document.querySelector('button[aria-label*=theme i]')?.click(); 'clicked'" >/dev/null 2>&1
sleep 0.5
echo "--- console ---"
$AB eval "JSON.stringify((window.__errs && window.__errs.length) || 0)" 2>&1 | tail -1

echo "--- devlog errors ---"
grep -iE "error|unhandled|⨯" /home/z/my-project/dev.log | grep -v "allowedDevOrigins" | tail -5 || echo "(clean)"

# ===========================================================================
# 9) cleanup
# ===========================================================================
python3 - "$STAMP" <<'PYEOF'
import sqlite3, sys
stamp = sys.argv[1]
con = sqlite3.connect("/home/z/my-project/db/custom.db", timeout=30)
emails = [f"e2enet_a_{stamp}@example.com", f"e2enet_b_{stamp}@example.com"]
ids = [r[0] for r in con.execute("SELECT id FROM UserAccount WHERE email IN (?,?)", emails)]
if ids:
    q = ",".join("?" for _ in ids)
    con.execute(f"DELETE FROM TrustEdge WHERE aUserId IN ({q}) OR bUserId IN ({q})", ids + ids)
    con.execute(f"DELETE FROM SharedSignal WHERE subjectUserId IN ({q})", ids)
    con.execute(f"DELETE FROM NetworkMembership WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM TrustReceipt WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM SafetyCheck WHERE verifierId IN ({q}) OR subjectId IN ({q})", ids + ids)
    con.execute(f"DELETE FROM TrustScoreSnapshot WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM Credential WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM IdentityIdentifier WHERE trustIdentityId IN (SELECT id FROM TrustIdentity WHERE userId IN ({q}))", ids)
    con.execute(f"DELETE FROM Evidence WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM PhoneVerification WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM VerificationSession WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM Consent WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM Notification WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM Session WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM AuditEvent WHERE actorId IN ({q}) OR subjectId IN ({q})", ids + ids)
    con.execute(f"DELETE FROM TrustIdentity WHERE userId IN ({q})", ids)
    con.execute(f"DELETE FROM UserAccount WHERE id IN ({q})", ids)
con.commit(); con.close()
print("cleanup ok")
PYEOF

echo "=== E2E DONE ==="
