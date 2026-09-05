#!/usr/bin/env bash
# TrustScore Stage 9 — browser E2E (single-call pattern per worklog quirk).
# Journey: b2b owner (API-seeded client + key + webhook→sink) opens the
# Developers tab → honesty banner + client card (quota meter, usage bars,
# stats) → mints an API key THROUGH THE UI (native-setter React fills) →
# one-time reveal with copy → webhook config via UI (URL + secret reveal +
# test event → DELIVERED delivery log with expandable payload + signature)
# → decision history expands (masked inputs) → team add via UI → LIVE
# dialog: wrong confirm rejected, typed confirm switches the badge →
# subject-side receipt check (API: channel API_CHECK) → mobile 390 + dark +
# console [] + devlog clean.
set -u
cd /home/z/my-project

bash tests/restart-dev.sh
echo "=== server warm ==="

AB="agent-browser"
$AB close --all >/dev/null 2>&1
$AB cookies clear >/dev/null 2>&1

STAMP=$(( $(date +%s) % 100000000 ))
OWNER_EMAIL="e2eb2b_${STAMP}@example.com"
OWNER_HANDLE="e2eb2b${STAMP}"
SUBJ_EMAIL="e2esubj_${STAMP}@example.com"
SUBJ_HANDLE="e2esubj${STAMP}"
MATE_EMAIL="e2emate_${STAMP}@example.com"
MATE_HANDLE="e2emate${STAMP}"

# --- API setup: reset b2b leftovers, seed owner+subject+client+key+webhook --
python3 - "$STAMP" <<'PYEOF'
import json, re, sys, time, urllib.request, http.cookiejar, sqlite3
stamp = sys.argv[1]
BASE = "http://127.0.0.1:3000"
def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(op, method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data: req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items(): req.add_header(k, v)
    try:
        with op.open(req, timeout=40) as res:
            return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode() or "{}")
        except Exception: return e.code, {}

con = sqlite3.connect("/home/z/my-project/db/custom.db", timeout=30)
con.execute("DELETE FROM UserAccount WHERE email LIKE 'e2eb2b_%@example.com' OR email LIKE 'e2esubj_%@example.com' OR email LIKE 'e2emate_%@example.com'")
con.execute("DELETE FROM ApiClient WHERE ownerId NOT IN (SELECT id FROM UserAccount)")
for t in ("WebhookDelivery", "ApiUsageDay", "TrustDecision", "ApiKey"):
    con.execute(f"DELETE FROM {t} WHERE clientId NOT IN (SELECT id FROM ApiClient)")
con.execute("DELETE FROM ApiUsageEvent WHERE keyId NOT IN (SELECT id FROM ApiKey)")
con.commit(); con.close()

owner_email, owner_handle = f"e2eb2b_{stamp}@example.com", f"e2eb2b{stamp}"
subj_email, subj_handle = f"e2esubj_{stamp}@example.com", f"e2esubj{stamp}"
mate_email, mate_handle = f"e2emate_{stamp}@example.com", f"e2emate{stamp}"

def register(op, email, handle):
    s, b = call(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1", "displayName": "Stage Nine E2E",
        "handle": handle, "acceptTerms": True})
    assert s in (201, 409), f"register {s} {b}"

owner = client()
register(owner, owner_email, owner_handle)
subject = client()
register(subject, subj_email, subj_handle)
mate = client()
register(mate, mate_email, mate_handle)

# subject: L2 identity + phone + standing consent (incl. phone match)
s, b = call(subject, "POST", "/api/v1/identity/sessions", {})
sid = b["session"]["id"]
s, b = call(subject, "POST", f"/api/v1/identity/sessions/{sid}/consent",
            {"decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status"]})
s, b = call(subject, "POST", f"/api/v1/identity/sessions/{sid}/callback",
            {"code": b["code"], "state": b["state"]})
phone = f"0803 555 {int(stamp) % 9000:04d}"
s, b = call(subject, "POST", "/api/v1/identity/signals/phone/start", {"phone": phone})
code = re.search(r"\b(\d{6})\b", b["delivery"]["message"]).group(1)
s, b = call(subject, "POST", "/api/v1/identity/signals/phone/confirm",
            {"verificationId": b["verification"]["id"], "code": code})
assert s == 200
s, b = call(subject, "POST", "/api/v1/safety/settings",
            {"enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": True})
assert s == 200

# owner: client + key + webhook → sink
s, b = call(owner, "POST", "/api/v1/dev/clients", {"name": "E2E Marketplace"})
assert s == 201, f"{s} {b}"
cid = b["client"]["id"]
s, b = call(owner, "POST", f"/api/v1/dev/clients/{cid}/keys", {"name": "seed-key"})
raw_key = b["key"]["rawKey"]
s, b = call(owner, "POST", f"/api/v1/dev/clients/{cid}/webhook",
            {"url": "http://localhost:3000/api/v1/dev/webhook-sink", "rotateSecret": True})
assert s == 200
# a first check so the card has usage + a delivery + decisions history
s, b = call(urllib.request.build_opener(), "POST", "/api/v1/trust/check",
            {"handle": subj_handle}, {"X-API-Key": raw_key})
assert s == 200 and b["decision"]["outcome"] == "OK", f"{s} {b}"
print(f"setup ok — owner: {owner_email} subject: {subj_email} mate: {mate_email} key prefix: {raw_key[:14]}")
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

fill_by_expr() { # native-setter fill via a JS element expression (inputs w/o ids)
  $AB eval "
    (function(){
      const el = ($1);
      if (!el) return 'missing';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '$2');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return 'filled';
    })()" 2>/dev/null | tail -1
}

# ===========================================================================
# 1) OWNER — the Developers tab
# ===========================================================================
login_user "$OWNER_EMAIL"
tab_click "Developers"
sleep 2.5
echo "--- 1. developers tab surface ---"
$AB eval "JSON.stringify({
  banner: document.body.textContent.includes('honest by design'),
  clientCard: document.body.textContent.includes('E2E Marketplace'),
  sandboxBadge: document.body.textContent.includes('SANDBOX'),
  quotaMeter: document.body.textContent.includes(\"Today's quota\"),
  usageBars: !!document.querySelector('[data-testid=usage-bars]'),
  keysListed: document.body.textContent.includes('seed-key'),
  webhookSection: document.body.textContent.includes('Webhook events'),
  teamSection: document.body.textContent.includes('Team') && /\\(\\d+ member/.test(document.body.textContent),
  decisions: document.body.textContent.includes('Decision history'),
  docs: document.body.textContent.includes('POST /api/v1/trust/check'),
})" 2>&1 | tail -1

# 2) mint a key THROUGH the UI (React fill) → one-time reveal
echo "--- 2. mint key via UI ---"
$AB find role button click --name "Mint key" >/dev/null 2>&1
sleep 1.2
fill_native "key-name" "ui-checkout-key"
sleep 0.5
MINT_REF=$($AB snapshot -i 2>/dev/null | grep -oE 'button "Mint once-only key" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
$AB click "@${MINT_REF}" >/dev/null 2>&1
sleep 2
$AB eval "JSON.stringify({
  reveal: !!document.querySelector('[data-testid=minted-key-reveal]'),
  rawShown: document.body.textContent.includes('tsk_sandbox_'),
  onceWarning: document.body.textContent.includes('shown once') || document.body.textContent.includes('Shown once'),
})" 2>&1 | tail -1
$AB find role button click --name "Done — I saved it" >/dev/null 2>&1
sleep 1.5
$AB eval "document.querySelectorAll('[data-testid=keys-list] li').length" 2>&1 | tail -1

# 3) webhook via UI: rotate the secret on save → reveal; test event → log
 echo "--- 3. webhook secret + test event via UI ---"
WH_INPUT=$( $AB eval "document.querySelector('input[id^=wh-url-]').id" 2>/dev/null | tail -1 | tr -d '"' )
fill_native "$WH_INPUT" "http://localhost:3000/api/v1/dev/webhook-sink"
sleep 0.5
# tick "Rotate signing secret on save" (label-wrapped checkbox)
$AB eval "document.querySelector('input[id^=wh-url-]').closest('div').parentElement.querySelector('button[role=checkbox]')?.click(); 'rotated'" >/dev/null 2>&1 || \
  $AB eval "Array.from(document.querySelectorAll('button[role=checkbox]')).find(b=>b.closest('label')?.textContent.includes('Rotate'))?.click(); 'rotated'" >/dev/null 2>&1
sleep 0.5
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Save')?.click(); 'saved'" 2>&1 | tail -1
sleep 2.5
$AB eval "JSON.stringify({secretReveal: !!document.querySelector('[data-testid=wh-secret-reveal]'), secretPrefix: document.body.textContent.includes('whsec_')})" 2>&1 | tail -1
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Send test event'))?.click(); 'sent'" >/dev/null 2>&1
sleep 2.5
$AB eval "JSON.stringify({
  deliveryLog: !!document.querySelector('[data-testid=delivery-log]'),
  delivered: document.body.textContent.includes('Delivered'),
})" 2>&1 | tail -1
# expand payload + signature on the newest delivery
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('payload + signature'))?.click(); 'expanded'" >/dev/null 2>&1
sleep 0.8
$AB eval "JSON.stringify({
  payloadVisible: document.body.textContent.includes('WEBHOOK_TEST'),
  signature: document.body.textContent.includes('X-TrustScore-Signature: t='),
})" 2>&1 | tail -1

# 4) decision history (lazy load)
echo "--- 4. decision history ---"
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Decision history'))?.click(); 'open'" >/dev/null 2>&1
sleep 2.5
$AB eval "JSON.stringify({
  decisions: document.querySelectorAll('[data-testid=decisions-list] li').length,
  maskedInput: document.body.textContent.includes('@${SUBJ_HANDLE}'),
  okChip: document.body.textContent.includes('OKHANDLE') || document.body.textContent.includes('OK'),
})" 2>&1 | tail -1

# 5) team add via UI (placeholder-located input, JS click on Add)
echo "--- 5. team add via UI ---"
fill_by_expr "Array.from(document.querySelectorAll('input')).find(i=>i.placeholder && i.placeholder.includes('handle or email'))" "$MATE_HANDLE"
sleep 0.6
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Add')?.click(); 'added'" 2>&1 | tail -1
sleep 2.5
$AB eval "document.body.textContent.includes('@${MATE_HANDLE}')" 2>&1 | tail -1

# 6) LIVE upgrade dialog: wrong confirm leaves the button disabled; the
# typed confirmation switches the environment (JS clicks — refs go stale
# while React re-enables the button)
echo "--- 6. LIVE upgrade ---"
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Switch to LIVE'))?.click(); 'open'" >/dev/null 2>&1
sleep 1.2
fill_by_expr "Array.from(document.querySelectorAll('input')).find(i=>i.placeholder==='I UNDERSTAND')" "nope wrong"
sleep 0.6
$AB eval "JSON.stringify({confirmDisabled: Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Confirm switch'))?.disabled})" 2>&1 | tail -1
fill_by_expr "Array.from(document.querySelectorAll('input')).find(i=>i.placeholder==='I UNDERSTAND')" "I UNDERSTAND"
sleep 0.6
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Confirm switch'))?.disabled === false ? (Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Confirm switch'))?.click(), 'clicked') : 'still-disabled'" 2>&1 | tail -1
sleep 3
$AB eval "JSON.stringify({
  livePosture: document.body.textContent.includes('LIVE posture active'),
  httpsOnlyNote: document.body.textContent.includes('https webhooks'),
})" 2>&1 | tail -1

# 7) run a live-key check via API and verify the SUBJECT sees the business-
# named receipt in their Trust Passport (who-checked-you log)
echo "--- 7. subject receipt (API-driven) ---"
python3 - "$STAMP" <<'PYEOF'
import json, sys, urllib.request, http.cookiejar, sqlite3
stamp = sys.argv[1]
BASE = "http://127.0.0.1:3000"
cj = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
req = urllib.request.Request(BASE + "/api/v1/auth/login", data=json.dumps({"email": f"e2esubj_{stamp}@example.com", "password": "SuperSecret1"}).encode(), method="POST")
req.add_header("Content-Type", "application/json")
op.open(req, timeout=30).read()
r = urllib.request.Request(BASE + "/api/v1/passport/me")
with op.open(r, timeout=40) as res:
    b = json.loads(res.read().decode())
blob = json.dumps(b)
receipts = b.get("receipts") or b.get("trustReceipts") or []
api_receipts = [x for x in receipts if (x.get("channel") == "API_CHECK" or "API check" in str(x.get("viewerLabel", "")))]
print(json.dumps({
    "receipt_channel_api_check": len(api_receipts) >= 1,
    "business_named": any("E2E Marketplace" in str(x.get("viewerLabel", "")) for x in api_receipts),
    "receipts_total": len(receipts),
}))
PYEOF

# 8) mobile + dark + console
echo "--- 8. mobile/dark/console ---"
$AB set viewport 390 844 >/dev/null 2>&1
sleep 1
$AB eval "JSON.stringify({hOverflow: document.documentElement.scrollWidth > 391})" 2>&1 | tail -1
$AB set viewport 1280 800 >/dev/null 2>&1
sleep 0.5
$AB eval "Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')?.toLowerCase().includes('dark'))?.click(); 'dark'" >/dev/null 2>&1
sleep 1.2
$AB eval "document.documentElement.classList.contains('dark')" 2>&1 | tail -1
$AB screenshot /tmp/stage9-dark.png >/dev/null 2>&1
$AB eval "JSON.stringify((window.__consoleErrors) ?? [])" 2>&1 | tail -1
$AB set viewport 1280 800 >/dev/null 2>&1

echo "--- devlog errors ---"
tail -c 4000 /home/z/my-project/dev.log | grep -iE "error|⨯" | grep -v "prisma:error" | head -5 || echo "(clean)"

$AB close --all >/dev/null 2>&1
echo "=== STAGE 9 E2E DONE ==="
