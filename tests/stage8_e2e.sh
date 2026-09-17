#!/usr/bin/env bash
# TrustScore Stage 8 — browser E2E (single-call pattern per worklog quirk).
# Journey: admin (sysadmin) opens the Trust Engine tab → public policy card
# (v1 rules, DPIA badge, gate) + admin console → drafts a policy THROUGH THE
# UI (rule inputs + summary + live budget preview) → activate w/o DPIA →
# honest rejection toast (DPIA_REQUIRED) → records the DPIA via the dialog
# (checklist, summary, residual) → COMPLETED → activates → policy list shows
# new ACTIVE version + public card updates → gate: typed confirm enables,
# disable returns → ada (regular member): lifecycle card (ACTIVE + policy
# version) → API drives the freeze lifecycle (flag → confirm → appeal) →
# ada's passport score card shows the FROZEN banner + engine/me note →
# overturn via API → freeze lifts → mobile 390 + dark + console + devlog.
set -u
cd /home/z/my-project

bash tests/restart-dev.sh
echo "=== server warm ==="

AB="agent-browser"
$AB close --all >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1

STAMP=$(( $(date +%s) % 100000000 ))

# --- API setup: reset engine to v1 + ensure sysadmin exists ----------------
python3 - "$STAMP" <<'PYEOF'
import json, re, sys, time, urllib.request, http.cookiejar, sqlite3
stamp = sys.argv[1]
BASE = "http://127.0.0.1:3000"
def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(op, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data: req.add_header("Content-Type", "application/json")
    try:
        with op.open(req, timeout=30) as res:
            return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode() or "{}")
        except Exception: return e.code, {}

# Engine reset (same as the matrix): v1 sole ACTIVE policy, no test drafts.
con = sqlite3.connect("/home/z/my-project/db/custom.db", timeout=30)
con.execute("DELETE FROM DpiaRecord WHERE policyId IN (SELECT id FROM ScoringPolicy WHERE version > 1)")
con.execute("DELETE FROM ScoringPolicy WHERE version > 1")
con.execute("UPDATE ScoringPolicy SET status='ACTIVE' WHERE version=1")
con.execute("DELETE FROM PlatformSetting WHERE key='engine.automatedSignificantDecisions'")
con.commit(); con.close()

# sysadmin + reviewer + bob (L2 reporter) for the freeze lifecycle
def register(op, email, handle):
    s, b = call(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1", "displayName": "Stage Eight E2E",
        "handle": handle, "acceptTerms": True})
    assert s in (201, 409), f"register {s} {b}"

adm = client()
register(adm, "sysadmin@example.com", "sysadmin")
con = sqlite3.connect("/home/z/my-project/db/custom.db", timeout=30)
con.execute("UPDATE UserAccount SET role='ADMIN' WHERE email='sysadmin@example.com'")
con.commit(); con.close()

rev = client()
rev_email = f"revs8_{stamp}@example.com"
register(rev, rev_email, f"revs8_{stamp}")
def l2(op, n):
    s, b = call(op, "POST", "/api/v1/identity/sessions", {})
    sid = b["session"]["id"]
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/consent",
                {"decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status"]})
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/callback",
                {"code": b["code"], "state": b["state"]})
    assert s == 200, f"identity {s} {b}"
    s, b = call(op, "POST", "/api/v1/identity/signals/phone/start", {"phone": f"0803 555 {n:04d}"})
    code = re.search(r"\b(\d{6})\b", b["delivery"]["message"]).group(1)
    s, b = call(op, "POST", "/api/v1/identity/signals/phone/confirm",
                {"verificationId": b["verification"]["id"], "code": code})
    assert s == 200, f"phone {s} {b}"
l2(rev, 1000 + int(stamp) % 9000)
con = sqlite3.connect("/home/z/my-project/db/custom.db", timeout=30)
con.execute("UPDATE UserAccount SET role='REVIEWER' WHERE email=?", (rev_email,))
con.commit(); con.close()

bob = client()
bob_email = f"bobs8_{stamp}@example.com"
register(bob, bob_email, f"bobs8_{stamp}")
l2(bob, 2000 + int(stamp) % 9000)
print(f"setup ok — reviewer: {rev_email} bob: {bob_email}")
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

# ===========================================================================
# 1) ADMIN — the Trust Engine tab: public card + admin console
# ===========================================================================
login_user "sysadmin@example.com"
tab_click "Trust Engine"
sleep 2
echo "--- 1. admin engine tab ---"
$AB eval "JSON.stringify({
  lifecycleCard: document.body.textContent.includes(\"My score's lifecycle\"),
  publicRules: document.body.textContent.includes('The scoring rules — public by design'),
  dpiaBadge: document.body.textContent.includes('DPIA completed'),
  gateDisabled: document.body.textContent.includes('Automated significant decisions'),
  adminConsole: document.body.textContent.includes('Engine administration'),
  snapshotStates: document.body.textContent.includes('Snapshot lifecycle distribution'),
  rail: !!document.querySelector('.ts-rail-identity'),
  policyVersions: document.body.textContent.includes('Policy versions'),
  gateInput: !!document.getElementById('gate-confirm'),
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage8-e2e-admin.png >/dev/null 2>&1

# ===========================================================================
# 2) ADMIN — draft a policy THROUGH THE UI
# ===========================================================================
echo "--- 2. draft policy via UI form ---"
$AB find role button click --name "New policy draft" >/dev/null 2>&1
sleep 1.5
# fill credential points + cap (8 / 24) — React controlled inputs need the
# native value setter (direct el.value assignment is swallowed by React's
# value tracker, and the draft would silently keep v1 rules).
$AB eval "
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set('rule-credentialPoints', '8'); set('rule-credentialMax', '24');
  'rules-set'" >/dev/null 2>&1
sleep 0.6
SUMMARY_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'textbox "Change summary[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
[ -z "$SUMMARY_REF" ] && SUMMARY_REF=$($AB eval "JSON.stringify(Array.from(document.querySelectorAll('[id=policy-summary]')).map(x=>'found'))" >/dev/null 2>&1; echo "")
$AB eval "
  const ta = document.getElementById('policy-summary');
  if (ta) { const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set; setter.call(ta, 'Raise Verified Credentials weight from 6 to 8 per credential (cap 24) to reward evidence-backed signals more strongly — E2E-driven change, honest and specific.');
  ta.dispatchEvent(new Event('input', {bubbles: true})); }
  'summary-set'" >/dev/null 2>&1
sleep 0.5
# budget preview visible before submit
$AB eval "JSON.stringify({budget: document.body.textContent.includes('Projected budget')})" 2>&1 | tail -1
$AB find role button click --name "Create draft" >/dev/null 2>&1
sleep 2.5
$AB eval "JSON.stringify({
  draftListed: !!Array.from(document.querySelectorAll('[data-testid=engine-admin] li')).find(li => li.textContent.includes('awaiting DPIA + activation')),
  budgetPreview: document.body.textContent.includes('Projected budget'),
  simulateBtn: !!document.querySelector('[data-testid=simulate-btn]'),
  diffTrigger: Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Diff vs active')),
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage8-e2e-draft.png >/dev/null 2>&1

# 2b) ADMIN — policy diff (pure client-side) + impact simulation dry-run
echo "--- 2b. policy diff + simulate impact via UI ---"
$AB find role button click --name "Diff vs active" >/dev/null 2>&1
sleep 1.2
$AB eval "JSON.stringify({diffRows: document.querySelectorAll('[data-testid=policy-diff] li').length})" 2>&1 | tail -1
$AB eval "document.querySelector('[data-testid=simulate-btn]')?.click()" >/dev/null 2>&1
sleep 4
$AB eval "JSON.stringify({
  simDialog: !!document.querySelector('[data-testid=simulate-dialog]'),
  simStats: document.querySelectorAll('[data-testid=sim-stats] > div').length,
  simBuckets: document.querySelectorAll('[data-testid=sim-buckets] > div').length,
  simMovers: document.querySelectorAll('[data-testid=sim-movers] tr').length,
  simNote: !!document.querySelector('[data-testid=sim-note]'),
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage8-e2e-simulate.png >/dev/null 2>&1
$AB press Escape >/dev/null 2>&1
sleep 1

# ===========================================================================
# 3) ADMIN — activate w/o DPIA → honest rejection; then record DPIA; activate
# ===========================================================================
echo "--- 3. activate-without-DPIA rejection + DPIA + activate ---"
# Activate the draft directly (no DPIA yet) → confirm the AlertDialog → the
# server must reject with DPIA_REQUIRED (honest toast).
$AB eval "
  (() => {
    const rows = Array.from(document.querySelectorAll('[data-testid=engine-admin] li'));
    const draft = rows.find(li => li.textContent.includes('awaiting DPIA + activation'));
    const act = draft ? Array.from(draft.querySelectorAll('button')).find(b => /Activate/.test(b.textContent)) : null;
    act?.click(); return act ? 'activate-clicked' : 'no-draft';
  })()" >/dev/null 2>&1
sleep 1.5
$AB eval "
  (() => {
    const act = Array.from(document.querySelectorAll('[role=alertdialog] button')).find(b => /^Activate v/.test(b.textContent));
    act?.click(); return act ? 'confirmed' : 'no-dialog';
  })()" >/dev/null 2>&1
sleep 3.5
$AB eval "JSON.stringify({
  rejected: document.body.textContent.includes('DPIA record must cover this policy') || document.body.textContent.includes('Record the DPIA first'),
})" 2>&1 | tail -1

# Record DPIA via the UI dialog (Record DPIA button in the draft row)
$AB eval "
  const rows = Array.from(document.querySelectorAll('[data-testid=engine-admin] li'));
  const draft = rows.find(li => li.textContent.includes('awaiting DPIA + activation'));
  const btns = draft ? Array.from(draft.querySelectorAll('button')) : [];
  const dpi = btns.find(b => /Record DPIA/.test(b.textContent));
  dpi?.click(); dpi ? 'dpi-open' : 'no-dpi'" >/dev/null 2>&1
sleep 1.5
# Set the summary with VERIFICATION + retry (occasional race between the
# dialog mount and the programmatic set; the read-back makes it deterministic)
SUMMARY_SET=""
for i in $(seq 1 6); do
  SUMMARY_SET=$($AB eval "
  (() => {
    const ta = document.getElementById('dpia-summary');
    if (!ta) return 'no-ta';
    if (ta.value.length >= 60) return 'already-set';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, 'E2E assessment: the credential-weight increase keeps scope unchanged; only the weight of already-verified evidence rises; no new data categories and rights paths are verified.');
    ta.dispatchEvent(new Event('input', {bubbles: true}));
    return ta.value.length >= 60 ? 'set-ok' : 'set-failed:' + ta.value.length;
  })()" 2>/dev/null | tail -1)
  echo "$SUMMARY_SET" | grep -qE "set-ok|already-set" && break
  sleep 0.8
done
echo "--- dpia summary: $SUMMARY_SET ---"
sleep 0.4
# tick all checklist boxes (with the same retry-hardening)
for i in $(seq 1 4); do
  $AB eval "
  (() => {
    let n = 0;
    ['scope','special','necessity','rights','bias','security','human','retention'].forEach(id => {
      const cb = document.getElementById('chk-' + id);
      if (cb && cb.getAttribute('data-state') !== 'checked') { cb.click(); n++; }
    });
    return 'ticked-' + n;
  })()" >/dev/null 2>&1
  sleep 0.6
  TICKED=$($AB eval "(() => {
    const ids = ['scope','special','necessity','rights','bias','security','human','retention'];
    return ids.filter(id => document.getElementById('chk-' + id)?.getAttribute('data-state') === 'checked').length;
  })()" 2>/dev/null | tail -1)
  echo "$TICKED" | grep -q 8 && break
  sleep 0.5
done
echo "--- checklist ticked: $TICKED/8 ---"
$AB find role button click --name "Save assessment" >/dev/null 2>&1
# wait for the dialog to actually close (server round-trip + state update)
DPIA_CLOSED=""
for i in $(seq 1 10); do
  DPIA_CLOSED=$($AB eval "!document.querySelector('[role=dialog]')" 2>/dev/null | tail -1)
  echo "$DPIA_CLOSED" | grep -q true && break
  # retry the save click once at i=4 in case the first click raced a disabled button
  if [ "$i" = "4" ]; then
    $AB find role button click --name "Save assessment" >/dev/null 2>&1
  fi
  sleep 0.8
done
echo "--- dpi dialog closed: $DPIA_CLOSED ---"
sleep 1
$AB eval "JSON.stringify({
  dpiaCompleted: document.body.textContent.includes('DPIA registry'),
  completedEntry: !!Array.from(document.querySelectorAll('li')).find(li => li.textContent.includes('residual LOW') || li.textContent.includes('residual MEDIUM')),
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage8-e2e-dpia.png >/dev/null 2>&1

# Activate the draft (now covered by the DPIA)
$AB eval "
  const rows = Array.from(document.querySelectorAll('[data-testid=engine-admin] li'));
  const draft = rows.find(li => li.textContent.includes('awaiting DPIA + activation'));
  const act = draft ? Array.from(draft.querySelectorAll('button')).find(b => /Activate/.test(b.textContent)) : null;
  act?.click(); act ? 'activate-clicked' : 'no-draft'" >/dev/null 2>&1
sleep 1.5
$AB eval "
  const act = Array.from(document.querySelectorAll('[role=alertdialog] button')).find(b => /^Activate v/.test(b.textContent));
  act?.click(); act ? 'confirmed' : 'no-dialog'" >/dev/null 2>&1
sleep 3
$AB eval "JSON.stringify({
  newActive: !!Array.from(document.querySelectorAll('[data-testid=engine-admin] li')).find(li => /v\d/.test(li.textContent) && li.textContent.includes('ACTIVE') && !li.textContent.includes('awaiting')),
  publicCardVersion: document.body.textContent.includes('activated') ,
  historyRetired: document.body.textContent.includes('Policy history'),
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage8-e2e-activated.png >/dev/null 2>&1

# ===========================================================================
# 4) ADMIN — gate: typed confirm enables; disable returns
# ===========================================================================
echo "--- 4. gate toggle ---"
$AB eval "
  const inp = document.getElementById('gate-confirm');
  if (inp) { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, 'I UNDERSTAND'); inp.dispatchEvent(new Event('input', {bubbles: true})); }
  'typed'" >/dev/null 2>&1
sleep 0.4
$AB find role button click --name "Enable under DPIA" >/dev/null 2>&1
ENABLED=""
for i in $(seq 1 10); do
  ENABLED=$($AB eval "document.body.textContent.includes('Automated significant decisions: ENABLED')" 2>/dev/null | tail -1)
  echo "$ENABLED" | grep -q true && break
  sleep 1
  # if the click missed a disabled button, re-type and re-click once
  if [ "$i" = "3" ]; then
    $AB eval "
  const inp = document.getElementById('gate-confirm');
  if (inp) { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, 'I UNDERSTAND'); inp.dispatchEvent(new Event('input', {bubbles: true})); }
  'retyped'" >/dev/null 2>&1
    sleep 0.5
    $AB find role button click --name "Enable under DPIA" >/dev/null 2>&1
  fi
done
echo "gate-enabled: $ENABLED"
$AB screenshot /home/z/my-project/research/stage8-e2e-gate-on.png >/dev/null 2>&1
$AB find role button click --name "Disable (always allowed)" >/dev/null 2>&1
DISABLED=""
for i in $(seq 1 10); do
  DISABLED=$($AB eval "document.body.textContent.includes('Automated significant decisions: DISABLED')" 2>/dev/null | tail -1)
  echo "$DISABLED" | grep -q true && break
  sleep 1
done
echo "gate-disabled: $DISABLED"

# ===========================================================================
# 5) ADA — member lifecycle card; then freeze via API → FROZEN banner → lift
# ===========================================================================
echo "--- 5. ada lifecycle + freeze banner ---"
login_user "ada@example.com"
tab_click "Trust Engine"
sleep 2
$AB eval "JSON.stringify({
  lifecycle: document.body.textContent.includes(\"My score's lifecycle\"),
  active: document.body.textContent.includes('Active') || document.body.textContent.includes('Stale'),
  policyNote: document.body.textContent.includes('Scored under policy'),
  noAdmin: !document.body.textContent.includes('Engine administration'),
  sparkline: !!document.querySelector('[data-testid=score-sparkline] svg'),
  sparkDots: document.querySelectorAll('[data-testid=score-sparkline] circle').length,
  lifecycleLog: !!document.querySelector('[data-testid=lifecycle-log]'),
  logRows: document.querySelectorAll('[data-testid=lifecycle-log] li').length,
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage8-e2e-member.png >/dev/null 2>&1

# Freeze lifecycle via API: bob flags ada → reviewer confirms → ada appeals
python3 - "$STAMP" <<'PYEOF'
import json, re, sys, time, urllib.request, http.cookiejar, sqlite3
stamp = sys.argv[1]
BASE = "http://127.0.0.1:3000"
def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(op, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data: req.add_header("Content-Type", "application/json")
    try:
        with op.open(req, timeout=30) as res: return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode() or "{}")
        except Exception: return e.code, {}

bob_email = f"bobs8_{stamp}@example.com"
rev_email = f"revs8_{stamp}@example.com"
bob, rev, ada = client(), client(), client()
call(bob, "POST", "/api/v1/auth/login", {"email": bob_email, "password": "SuperSecret1"})
call(rev, "POST", "/api/v1/auth/login", {"email": rev_email, "password": "SuperSecret1"})
call(ada, "POST", "/api/v1/auth/login", {"email": "ada@example.com", "password": "SuperSecret1"})
s, b = call(bob, "POST", "/api/v1/reputation/flags", {
    "subjectHandle": "ada", "category": "FRAUD",
    "description": "E2E freeze check: paid for a generator listing and the seller went silent after transfer; receipts and chat available.",
    "evidence": [
        {"kind": "TEXT", "content": "Marketplace thread #77189 with timestamps and transfer receipt."},
        {"kind": "LINK", "content": "https://chat.example/threads/77189"},
    ]})
assert s == 201, f"flag {s} {b}"
flag_id = b["flagId"]
s, b = call(ada, "POST", f"/api/v1/reputation/flags/{flag_id}/respond",
            {"response": "Mistaken identity — that listing is not mine and I have proof I was elsewhere that week."})
assert s == 200, f"respond {s} {b}"
s, b = call(rev, "POST", f"/api/v1/reputation/review/{flag_id}/decision",
            {"outcome": "CONFIRMED", "rationale": "Evidence is specific and corroborated; the concern stands after review."})
assert s == 200, f"confirm {s} {b}"
s, b = call(ada, "POST", f"/api/v1/reputation/flags/{flag_id}/appeal",
            {"reason": "The cited chat export is doctored; I have the genuine thread and bank statements showing no such transfer."})
assert s == 200, f"appeal {s} {b}"
print("freeze driven via API")
PYEOF

# ada reloads → passport tab shows the FROZEN banner; engine tab shows FROZEN
$AB open http://127.0.0.1:3000 >/dev/null 2>&1
sleep 2.5
tab_click "Trust Passport"
sleep 2
echo "--- passport FROZEN banner ---"
$AB eval "JSON.stringify({
  frozenBanner: document.body.textContent.includes('Frozen while an appeal is under human review'),
  reviewRequired: document.body.textContent.includes('Review required'),
  fairness: document.body.textContent.includes('fairness guarantee'),
})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage8-e2e-frozen.png >/dev/null 2>&1
tab_click "Trust Engine"
sleep 2
$AB eval "JSON.stringify({
  stateFrozen: document.body.textContent.includes('Frozen') && document.body.textContent.includes('appeal is under human review'),
  frozenNote: document.body.textContent.includes('cannot move up or down'),
})" 2>&1 | tail -1

# Overturn via API → freeze lifts
python3 - "$STAMP" <<'PYEOF'
import json, sys, urllib.request, http.cookiejar, sqlite3
stamp = sys.argv[1]
BASE = "http://127.0.0.1:3000"
rev = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(op, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data: req.add_header("Content-Type", "application/json")
    with op.open(req, timeout=30) as res: return res.status, json.loads(res.read().decode() or "{}")
call(rev, "POST", "/api/v1/auth/login", {"email": f"revs8_{stamp}@example.com", "password": "SuperSecret1"})
con = sqlite3.connect("/home/z/my-project/db/custom.db", timeout=30)
aid = con.execute("SELECT id FROM FlagAppeal ORDER BY createdAt DESC LIMIT 1").fetchone()[0]
con.close()
s, b = call(rev, "POST", f"/api/v1/reputation/appeals/{aid}/decision",
            {"outcome": "OVERTURNED", "note": "The doctored-chat claim is substantiated; the flag is unfounded and the score restores."})
print("overturned:", s)
PYEOF

$AB open http://127.0.0.1:3000 >/dev/null 2>&1
sleep 2.5
tab_click "Trust Passport"
sleep 2
echo "--- freeze lifted after overturn ---"
$AB eval "JSON.stringify({
  noFrozenBanner: !document.body.textContent.includes('Frozen while an appeal'),
  notReviewRequired: !document.body.textContent.includes('Review required'),
})" 2>&1 | tail -1

# ===========================================================================
# 6) Mobile 390 + dark + console + devlog
# ===========================================================================
echo "--- mobile 390 ---"
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1
$AB eval "JSON.stringify({hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage8-e2e-mobile.png >/dev/null 2>&1
$AB set viewport 1280 800 >/dev/null 2>&1
sleep 0.5
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1
sleep 1
echo "--- dark ---"
$AB eval "JSON.stringify({dark: document.documentElement.classList.contains('dark')})" 2>&1 | tail -1
$AB screenshot /home/z/my-project/research/stage8-e2e-dark.png >/dev/null 2>&1
$AB find role button click --name "Toggle dark mode" >/dev/null 2>&1
sleep 0.5

echo "--- CONSOLE ---"
$AB eval "JSON.stringify((window.__consoleErrors ?? []))" 2>&1 | tail -1
echo "--- DEVLOG ---"
grep -iE "error|warn|fail" dev.log | grep -v "favicon" | tail -6 || echo "dev.log clean"
echo "=== STAGE 8 E2E DONE ==="
