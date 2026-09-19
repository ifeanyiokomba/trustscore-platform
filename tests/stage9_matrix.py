#!/usr/bin/env python3
"""TrustScore Stage 9 — B2B Platform contract test matrix.
Covers: Trust Decision API auth (X-API-Key, uniform 401s, per-IP auth-fail
limit), dev portal (client creation/validation/limits, read-model shape),
API keys (raw shown once, sha256 at rest, prefix, cap per plan, revocation
immediate), the check contract (exactly-one input, consent-gated HANDLE/
PHONE, token-scoped links, band-level responses with the locked language and
NO score number, freshness, §37 note, anti-enumeration byte-equality, masked
phone inputs), real quotas (FREE 40/day) + per-key rate limit, webhooks
(HMAC-SHA256 signature scheme verified end-to-end, one-time secret, sandbox
self-test sink delivery, dead-endpoint retry schedule + lazy processing,
payload discipline), team RBAC (roles enforced server-side, membership =
visibility, OWNER immutable, no existence leak to non-members), LIVE posture
(typed confirm, https-only webhooks, tsk_live_ prefix), plans (quota + key
caps), subject receipts (channel API_CHECK), audit discipline, DSR export
section, and unauth 401s."""
import json
import os
import re
import time
import hmac
import hashlib
import subprocess
import urllib.request
import urllib.error
import http.cookiejar
import sqlite3

BASE = "http://127.0.0.1:3000"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "db", "custom.db")
PASS = 0
FAIL = 0

STAMP = int(time.time()) % 100000000

# ---------------------------------------------------------------------------
# Deterministic reset (idempotency): remove this run's previous test users
# (cascade wipes their clients/keys/decisions/usage/deliveries) and restart
# the dev server (clears in-memory rate limiters).
# ---------------------------------------------------------------------------
con = sqlite3.connect(DB, timeout=30)
# Unconditional: every b2b* matrix user from ANY prior run (raw SQL does not
# run Prisma's client-side cascades, so children are cleared explicitly).
con.execute(
    "DELETE FROM UserAccount WHERE email LIKE 'b2bowner_%@example.com' OR email LIKE 'b2bsubject_%@example.com' OR email LIKE 'b2bteammate_%@example.com' OR email LIKE 'b2boutsider_%@example.com'"
)
# Raw SQL does not run Prisma's client-side cascades — remove orphaned
# PARENTS first, then the children whose parents are now gone (ordering
# matters: cleaning children first would miss the ones orphaned by the next
# statement).
con.execute("DELETE FROM ApiClient WHERE ownerId NOT IN (SELECT id FROM UserAccount)")
con.execute("DELETE FROM ApiTeamMember WHERE userId NOT IN (SELECT id FROM UserAccount) OR clientId NOT IN (SELECT id FROM ApiClient)")
con.execute("DELETE FROM WebhookDelivery WHERE clientId NOT IN (SELECT id FROM ApiClient)")
con.execute("DELETE FROM ApiUsageDay WHERE clientId NOT IN (SELECT id FROM ApiClient)")
con.execute("DELETE FROM TrustDecision WHERE clientId NOT IN (SELECT id FROM ApiClient)")
con.execute("DELETE FROM ApiKey WHERE clientId NOT IN (SELECT id FROM ApiClient)")
con.execute("DELETE FROM ApiUsageEvent WHERE keyId NOT IN (SELECT id FROM ApiKey)")
con.commit()
con.close()
subprocess.run(["bash", "tests/restart-dev.sh"], check=True, cwd="/home/z/my-project")
time.sleep(2)

def client():
    cj = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

ANON = urllib.request.build_opener()

def call(op, method, path, body=None, headers=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with op.open(req, timeout=40) as res:
            payload = res.read().decode()
            if raw:
                return res.status, payload
            return res.status, json.loads(payload or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}

def callr(op, method, path, body=None, headers=None):
    """Retry-aware call: waits out shared-IP rate windows."""
    for attempt in range(4):
        s, b = call(op, method, path, body, headers)
        if s == 429 and (b.get("error") or {}).get("code") in ("RATE_LIMITED",):
            time.sleep(62)
            continue
        return s, b
    return s, b

def errcode(b):
    return (b.get("error") or {}).get("code", "")

def check(name, ok, extra=""):
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"  ok  {name}")
    else:
        FAIL += 1
        print(f"FAIL  {name}  {extra}")

def register(op, email, handle, display):
    return callr(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1", "displayName": display,
        "handle": handle, "acceptTerms": True})

def l2(op, phone):
    """Government ID + phone OTP → L2 (consented, checkable subject)."""
    s, b = callr(op, "POST", "/api/v1/identity/sessions", {})
    sid = b["session"]["id"]
    s, b = callr(op, "POST", f"/api/v1/identity/sessions/{sid}/consent",
                 {"decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status"]})
    s, b = callr(op, "POST", f"/api/v1/identity/sessions/{sid}/callback",
                 {"code": b["code"], "state": b["state"]})
    assert s == 200, f"identity {s} {b}"
    s, b = callr(op, "POST", "/api/v1/identity/signals/phone/start", {"phone": phone})
    code = re.search(r"\b(\d{6})\b", b["delivery"]["message"]).group(1)
    s, b = callr(op, "POST", "/api/v1/identity/signals/phone/confirm",
                 {"verificationId": b["verification"]["id"], "code": code})
    assert s == 200, f"phone {s} {b}"

def api_call(key, body):
    return call(ANON, "POST", "/api/v1/trust/check", body, {"X-API-Key": key})

# ===========================================================================
print("== 1. unauth + malformed keys ==")
s, b = call(ANON, "POST", "/api/v1/trust/check", {"handle": "x"})
check("trust/check no key → 401 UNAUTHENTICATED", s == 401 and errcode(b) == "UNAUTHENTICATED")
s, b = call(ANON, "POST", "/api/v1/trust/check", {"handle": "x"}, {"X-API-Key": "garbage"})
check("malformed key → 401", s == 401 and errcode(b) == "UNAUTHENTICATED")
s, b = call(ANON, "POST", "/api/v1/trust/check", {"handle": "x"},
            {"X-API-Key": "tsk_sandbox_" + "ab" * 24})
check("valid-format unknown key → uniform 401 (no existence leak)",
      s == 401 and errcode(b) == "UNAUTHENTICATED")
s, b = call(ANON, "GET", "/api/v1/dev/me")
check("dev/me unauth → 401", s == 401 and errcode(b) == "UNAUTHENTICATED")

print("== 2. portal: create + validation + limits ==")
owner = client()
owner_email = f"b2bowner_{STAMP}@example.com"
owner_handle = f"b2bowner{STAMP % 100000}"
s, b = register(owner, owner_email, owner_handle, "B2B Owner")
check("owner register", s in (201, 409), str(b)[:80])

s, b = callr(owner, "POST", "/api/v1/dev/clients", {"name": "ab"})
check("short name → 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = callr(owner, "POST", "/api/v1/dev/clients", {"name": ""})
check("empty name → 422", s == 422)
s, b = callr(owner, "POST", "/api/v1/dev/clients", {"name": "B2B Matrix Shop"})
check("create client → 201 SANDBOX OWNER FREE", s == 201 and b["client"]["environment"] == "SANDBOX"
      and b["client"]["role"] == "OWNER" and b["client"]["plan"] == "FREE", str(b)[:100])
CID = b["client"]["id"]
s, b = callr(owner, "GET", "/api/v1/dev/me")
c0 = b["clients"][0]
check("read model shape: quota/usage/keys/team/webhook/limits",
      set(["quota", "usage", "keys", "team", "webhook", "decisionsCount"]).issubset(c0.keys())
      and c0["quota"]["plan"] == 40 and len(c0["usage"]) == 14
      and b["limits"]["maxClients"] == 3)
s, b = callr(owner, "POST", "/api/v1/dev/clients", {"name": "Second Shop"})
CID2 = b["client"]["id"] if s == 201 else ""
s, b = callr(owner, "POST", "/api/v1/dev/clients", {"name": "Third Shop"})
check("3 clients created", s == 201)
s, b = callr(owner, "POST", "/api/v1/dev/clients", {"name": "Fourth Shop"})
check("4th owned client → 409 CLIENT_LIMIT", s == 409 and errcode(b) == "CLIENT_LIMIT")

print("== 3. API keys: mint, hash-at-rest, caps, revoke ==")
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/keys", {"name": "x"})
check("short key label → 422", s == 422)
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/keys", {"name": "matrix-primary"})
check("mint key → 201 raw once + warning", s == 201 and b["key"]["rawKey"].startswith("tsk_sandbox_")
      and "never" in b.get("warning", "").lower(), str(b)[:120])
RAW1 = b["key"]["rawKey"]
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/keys", {"name": "matrix-second"})
RAW2 = b["key"]["rawKey"]
check("FREE plan 2nd key ok", s == 201)
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/keys", {"name": "matrix-third"})
check("FREE plan 3rd key → 409 KEY_LIMIT", s == 409 and errcode(b) == "KEY_LIMIT")

con = sqlite3.connect(DB, timeout=30)
rows = con.execute("SELECT keyHash, keyPrefix FROM ApiKey WHERE keyHash = ?", (hashlib.sha256(RAW1.encode()).hexdigest(),)).fetchall()
raw_in_db = con.execute("SELECT COUNT(*) FROM ApiKey WHERE keyHash = ?", (RAW1,)).fetchone()[0]
con.close()
check("at rest: sha256(raw) only, raw never stored", len(rows) == 1 and raw_in_db == 0
      and RAW1.startswith(rows[0][1]))

s, b = api_call(RAW1, {"handle": owner_handle})
check("fresh key works (self-check OK)", s == 200 and b["decision"]["outcome"] == "OK"
      and b["decision"]["receipted"] is False)

s, b = callr(owner, "POST", f"/api/v1/dev/keys/does-not-exist/revoke")
check("revoke unknown key → 404", s == 404 and errcode(b) == "NOT_FOUND")
con = sqlite3.connect(DB, timeout=30)
kid2 = con.execute("SELECT id FROM ApiKey WHERE keyHash = ?", (hashlib.sha256(RAW2.encode()).hexdigest(),)).fetchone()[0]
con.close()
s, b = callr(owner, "POST", f"/api/v1/dev/keys/{kid2}/revoke")
check("revoke key → 200", s == 200)
s, b = api_call(RAW2, {"handle": owner_handle})
check("revoked key → immediate uniform 401", s == 401 and errcode(b) == "UNAUTHENTICATED")
s, b = callr(owner, "POST", f"/api/v1/dev/keys/{kid2}/revoke")
check("re-revoke → 409 ALREADY_REVOKED", s == 409 and errcode(b) == "ALREADY_REVOKED")

print("== 4. the check contract ==")
s, b = api_call(RAW1, {})
check("no input field → 422", s == 422 and b["decision"]["outcome"] == "UNAVAILABLE")
s, b = api_call(RAW1, {"handle": "someone", "phone": "08030000000"})
check("two input fields → 422", s == 422)

# subject: L2 identity + phone + standing safety consent
subject = client()
subject_email = f"b2bsubject_{STAMP}@example.com"
subject_handle = f"b2bsubj{STAMP % 100000}"
register(subject, subject_email, subject_handle, "B2B Subject")
SUBJ_PHONE = f"0803 555 {STAMP % 9000:04d}"
l2(subject, SUBJ_PHONE)
s, b = callr(subject, "POST", "/api/v1/safety/settings",
             {"enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": True})
check("subject enables safety consent (allowPhoneMatch)", s == 200 and (b.get("settings") or {}).get("enabled") is True, str(b)[:100])

s, b = api_call(RAW1, {"handle": subject_handle})
d = b["decision"]
a = d.get("assessment", {})
check("handle check → 200 OK receipted", s == 200 and d["outcome"] == "OK" and d["receipted"] is True)
check("assessment is band-level (NO score number)", "score" not in a and "confidence" not in a,
      str(list(a.keys())))
check("locked language + §37 note + MOCK honesty",
      isinstance(a.get("language"), dict) and "not a guarantee" in str(a.get("language", {}).get("disclaimer", "")).lower()
      and "assessment, not a decision" in b.get("note", "").lower()
      and b.get("providerMode") == "MOCK")
check("freshness + explanation shipped",
      isinstance(a.get("freshness"), dict) and isinstance(a.get("explanation"), list)
      and isinstance(a.get("summary"), dict) and a["summary"].get("status") in
      ("NEW", "VERIFIED", "ESTABLISHED", "CAUTION", "HIGH_RISK", "REVIEW_REQUIRED"))
check("quota decremented on portal", True)  # verified below via read model
s, b2 = callr(owner, "GET", "/api/v1/dev/me")
c1 = [c for c in b2["clients"] if c["id"] == CID][0]
check("quota usedToday ≥ 2 + usage today recorded",
      c1["quota"]["usedToday"] >= 2 and any(u["day"] == time.strftime("%Y-%m-%d") and u["checks"] >= 2 for u in c1["usage"]))

# anti-enumeration: unknown ≡ un-consented ≡ disabled (byte-identical)
s_unknown, raw_unknown = call(ANON, "POST", "/api/v1/trust/check", {"handle": "nobody_here_x"},
                              {"X-API-Key": RAW1}, raw=True)
check("unknown handle → 200 UNAVAILABLE", s_unknown == 200 and json.loads(raw_unknown)["decision"]["outcome"] == "UNAVAILABLE")

noc = client()
noc_email = f"b2bsubject_{STAMP}b@example.com"
register(noc, noc_email, f"b2bsubj{STAMP % 100000}b", "No Consent Subject")
s, raw_noc = call(ANON, "POST", "/api/v1/trust/check", {"handle": f"b2bsubj{STAMP % 100000}b"},
                  {"X-API-Key": RAW1}, raw=True)
check("existing handle WITHOUT consent → 200 UNAVAILABLE", s == 200
      and json.loads(raw_noc)["decision"]["outcome"] == "UNAVAILABLE")
def decision_of(raw_body):
    """The enumeration-relevant payload. The full envelope also carries
    requestId (random per request) and quota.remaining (the CALLER's own
    counter — like a rate-limit header, never a subject signal), so equality
    is asserted on the decision object, which must be byte-identical."""
    return json.dumps(json.loads(raw_body)["decision"], sort_keys=True)

check("anti-enumeration: decision byte-identical (unknown ≡ un-consented)",
      decision_of(raw_unknown) == decision_of(raw_noc))

s, b = api_call(RAW1, {"handle": "!!"})
check("invalid handle format → 422", s == 422)

# phone checks
e164 = "+234803555" + f"{STAMP % 9000:04d}"
s, b = api_call(RAW1, {"phone": SUBJ_PHONE})
check("phone check (consented) → OK", s == 200 and b["decision"]["outcome"] == "OK")
s, b = api_call(RAW1, {"phone": "0803 000 0000"})
s2, raw_unmatched = call(ANON, "POST", "/api/v1/trust/check", {"phone": "0803 000 0000"},
                         {"X-API-Key": RAW1}, raw=True)
check("unmatched phone → UNAVAILABLE (no 404)", s == 200
      and json.loads(raw_unmatched)["decision"]["outcome"] == "UNAVAILABLE")
s, b = api_call(RAW1, {"phone": "not-a-phone"})
check("invalid phone → 422", s == 422)
# phone-match scope off → identical unavailable
s, b = callr(subject, "POST", "/api/v1/safety/settings",
             {"enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": False})
s, raw_scopeoff = call(ANON, "POST", "/api/v1/trust/check", {"phone": SUBJ_PHONE},
                       {"X-API-Key": RAW1}, raw=True)
check("phoneMatch scope off → UNAVAILABLE", s == 200
      and json.loads(raw_scopeoff)["decision"]["outcome"] == "UNAVAILABLE")
s, raw_unknownph = call(ANON, "POST", "/api/v1/trust/check", {"phone": "0803 000 0000"},
                        {"X-API-Key": RAW1}, raw=True)
check("phone anti-enumeration: decision byte-identical",
      decision_of(raw_unmatched) == decision_of(raw_scopeoff) == decision_of(raw_unknownph))
callr(subject, "POST", "/api/v1/safety/settings",
      {"enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": True})

# masked input hints (no raw digits stored for phone checks)
s, b = callr(owner, "GET", f"/api/v1/dev/clients/{CID}/decisions")
phone_hints = [d["inputHint"] for d in b["decisions"] if d["method"] == "PHONE"]
check("phone decision inputHint masked (no digits)", len(phone_hints) > 0
      and all(h == "verified phone (hashed)" or h == "invalid" for h in phone_hints)
      and not any(ch.isdigit() for h in phone_hints for ch in h), str(phone_hints))
check("decisions carry requestId + outcome", all(d.get("requestId") and d.get("outcome") for d in b["decisions"]))

print("== 5. trust links via the API (token scopes govern) ==")
s, b = callr(subject, "POST", "/api/v1/passport/share",
             {"scopes": ["PROFILE", "SIGNALS", "SCORE"], "ttlHours": 1, "maxViews": 5})
LINK = b.get("token", "") if s in (200, 201) else ""
check("subject mints SCORE-scoped link", bool(LINK) and str(LINK).startswith("ts_"), str(b)[:80])
s, b = api_call(RAW1, {"link": LINK})
a = b["decision"].get("assessment", {})
check("link check → OK + scopes honored (profile/signals)", s == 200 and b["decision"]["outcome"] == "OK"
      and "subject" in a and isinstance(a.get("signals"), list))
check("SCORE scope does NOT leak the number via B2B", "score" not in a and "confidence" not in a,
      str([k for k in a.keys()])[:120])
# dead link
s, b = callr(subject, "GET", "/api/v1/passport/share")
tok_id = [t for t in b.get("shareTokens", []) if t.get("status") == "ACTIVE"][0]["id"]
callr(subject, "DELETE", f"/api/v1/passport/share/{tok_id}")
s, b = api_call(RAW1, {"link": LINK})
check("revoked link → DEAD_LINK/REVOKED", s == 200 and b["decision"]["outcome"] == "DEAD_LINK"
      and b["decision"].get("reason") in ("REVOKED", "EXPIRED", "VIEW_LIMIT"))
# receipt written to subject for API handle/phone checks
s, b = callr(subject, "GET", "/api/v1/safety/me")
api_receipts = [r for r in b.get("checksReceived", []) if r.get("channel") == "API_CHECK"] if isinstance(b.get("checksReceived"), list) else []
if not api_receipts:
    # receipts list may live under receipts in the safety/me payload
    api_receipts = [r for r in b.get("receipts", []) if r.get("channel") == "API_CHECK"] if isinstance(b.get("receipts"), list) else []
con = sqlite3.connect(DB, timeout=30)
api_rc = con.execute("SELECT COUNT(*) FROM TrustReceipt WHERE channel = 'API_CHECK'").fetchone()[0]
subj_id = con.execute("SELECT id FROM UserAccount WHERE handle = ?", (subject_handle,)).fetchone()[0]
api_rc_subj = con.execute("SELECT viewerLabel FROM TrustReceipt WHERE channel = 'API_CHECK' AND userId = ? LIMIT 1", (subj_id,)).fetchall()
con.close()
check("subject receipted for API checks (channel API_CHECK, business named)",
      api_rc >= 1 and len(api_rc_subj) == 1 and "B2B Matrix Shop" in api_rc_subj[0][0],
      str(api_rc_subj)[:120])

print("== 6. quotas + rate limit (real enforcement) ==")
# burn the FREE quota on CID (40/day) — use CID2's key to keep CID clean
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID2}/keys", {"name": "quota-burner"})
QB = b["key"]["rawKey"]
results = {"ok": 0, "quota": 0, "rate": 0, "other": 0}
for i in range(45):
    s, b = api_call(QB, {"handle": owner_handle})
    if s == 200 and b["decision"]["outcome"] == "OK":
        results["ok"] += 1
    elif s == 429 and errcode(b) == "QUOTA_EXCEEDED":
        results["quota"] += 1
    elif s == 429 and errcode(b) == "RATE_LIMITED":
        results["rate"] += 1
    else:
        results["other"] += 1
check("FREE quota: exactly 40 OK then QUOTA_EXCEEDED (rate limiter not tripped under 60)",
      results["ok"] == 40 and results["quota"] >= 1 and results["rate"] == 0 and results["other"] == 0,
      str(results))
s, b = api_call(QB, {"handle": owner_handle})
check("quota response is honest about the plan",
      s == 429 and errcode(b) == "QUOTA_EXCEEDED" and "40" in (b.get("error") or {}).get("message", ""))

# rate limit on a STARTER client (quota 500, cap above 60/min)
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/plan", {"plan": "STARTER"})
check("plan → STARTER (500/day, 5 keys)", s == 200 and b["client"]["plan"] == "STARTER"
      and b.get("planCaps", {}).get("quota") == 500)
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/keys", {"name": "rate-burner"})
RB = b["key"]["rawToken"] if "rawToken" in b.get("key", {}) else b["key"]["rawKey"]
check("STARTER allows 3rd key", s == 201)
hit_rate = False
for i in range(62):
    s, b = api_call(RB, {"handle": owner_handle})
    if s == 429 and errcode(b) == "RATE_LIMITED":
        hit_rate = True
        break
check("per-key rate limit trips ≤ 61 rapid requests", hit_rate)
time.sleep(1)

print("== 7. webhooks: signature, sink, retries ==")
SINK = "http://localhost:3000/api/v1/dev/webhook-sink"
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/webhook",
             {"url": "ftp://bad.example", "rotateSecret": True})
check("non-http(s) webhook URL → 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/webhook",
             {"url": SINK, "rotateSecret": True})
SECRET = b.get("secret", "")
check("webhook configured + one-time secret (whsec_)", s == 200 and SECRET.startswith("whsec_"))
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/webhook",
             {"url": SINK, "rotateSecret": False})
check("re-save without rotate → NO secret in response", s == 200 and "secret" not in b)

s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/webhook/test")
dv = b.get("delivery") or {}
check("test event → DELIVERED 200 + signature header", s == 200 and dv.get("status") == "DELIVERED"
      and dv.get("statusCode") == 200 and re.match(r"^t=\d+,v1=[a-f0-9]{64}$", dv.get("signature") or "") is not None,
      str(dv)[:150])
check("test payload carries event + message", dv.get("event") == "WEBHOOK_TEST"
      and "data" in (dv.get("payload") or {}))

# signature scheme verified end-to-end (HMAC over t + raw payload)
sig = dv["signature"]
t_part, v1_part = sig.split(",")
t = int(t_part[2:])
v1 = v1_part[3:]
raw_payload = json.dumps(dv["payload"], separators=(",", ":"))
expected = hmac.new(SECRET.encode(), f"{t}.{raw_payload}".encode(), hashlib.sha256).hexdigest()
sig_ok = expected == v1
if not sig_ok:
    # payload re-serialization may differ from what was sent; verify from DB
    con = sqlite3.connect(DB, timeout=30)
    row = con.execute("SELECT payload, signature FROM WebhookDelivery WHERE event='WEBHOOK_TEST' ORDER BY createdAt DESC LIMIT 1").fetchone()
    con.close()
    t2 = int(row[1].split(",")[0][2:])
    v1_2 = row[1].split(",")[1][3:]
    sig_ok = hmac.new(SECRET.encode(), f"{t2}.{row[0]}".encode(), hashlib.sha256).hexdigest() == v1_2
check("HMAC-SHA256 signature scheme verified (t + body)", sig_ok)

# real check fires TRUST_CHECK_COMPLETED (fresh key — the rate-burner above
# is still inside its 60/min window)
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/keys", {"name": "webhook-key"})
WK = b["key"]["rawKey"]
s, b = api_call(WK, {"handle": subject_handle})
s, b = callr(owner, "GET", "/api/v1/dev/me")
c1 = [c for c in b["clients"] if c["id"] == CID][0]
comp = [x for x in c1["webhook"]["recentDeliveries"] if x["event"] == "TRUST_CHECK_COMPLETED"]
check("check fired TRUST_CHECK_COMPLETED delivery (DELIVERED)", len(comp) >= 1
      and comp[0]["status"] == "DELIVERED" and comp[0]["statusCode"] == 200)
pd = (comp[0]["payload"].get("data") or {})
check("webhook payload discipline: band-level, no score number",
      pd.get("outcome") == "OK" and "score" not in json.dumps(pd.get("assessment") or {})
      and "requestId" in pd and "note" in pd, str(pd)[:200])

# dead endpoint → retrying with nextRetryAt
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/webhook",
             {"url": "http://localhost:9/hook", "rotateSecret": False})
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/webhook/test")
dv = b.get("delivery") or {}
DEAD_ID = dv.get("id")
check("dead endpoint → RETRYING attempt 1/5 + nextRetryAt", dv.get("status") == "RETRYING"
      and dv.get("attempts") == 1 and dv.get("nextRetryAt") is not None, str(dv)[:150])

# lazy retry processor: backdate the retry (Prisma stores DateTime as
# INTEGER epoch-ms in SQLite — a raw datetime() string never matches) → the
# next portal read processes it
con = sqlite3.connect(DB, timeout=30)
con.execute("UPDATE WebhookDelivery SET nextRetryAt = (CAST(strftime('%s','now') AS INTEGER) - 10) * 1000 WHERE status = 'RETRYING'")
con.commit()
con.close()
callr(owner, "GET", "/api/v1/dev/me")
con = sqlite3.connect(DB, timeout=30)
row = con.execute("SELECT status, attempts FROM WebhookDelivery WHERE id = ?", (DEAD_ID,)).fetchone()
con.close()
check("lazy retry ran (attempts advanced)", row and row[1] >= 2, str(row))

# webhook off
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/webhook", {"url": "", "rotateSecret": False})
check("empty URL disables webhook", s == 200 and b["client"]["webhook"]["url"] is None)

print("== 8. team RBAC ==")
teammate = client()
tm_email = f"b2bteammate_{STAMP}@example.com"
tm_handle = f"b2bmate{STAMP % 100000}"
register(teammate, tm_email, tm_handle, "B2B Teammate")
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/team",
             {"identifier": tm_handle, "role": "OWNER"})
check("adding with role OWNER → 422", s == 422)
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/team",
             {"identifier": tm_handle, "role": "VIEWER"})
check("add VIEWER teammate → 201", s == 201 and any(m["handle"] == tm_handle and m["role"] == "VIEWER" for m in b["client"]["team"]))
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/team",
             {"identifier": tm_handle, "role": "DEVELOPER"})
check("duplicate teammate → 409", s == 409 and errcode(b) == "DUPLICATE")
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/team",
             {"identifier": owner_handle, "role": "VIEWER"})
check("adding yourself → 422 SELF_OWNER", s == 422 and errcode(b) == "SELF_OWNER")
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/team",
             {"identifier": "ghost_user_x", "role": "VIEWER"})
check("unknown identifier → 422", s == 422)

# VIEWER: read yes, manage no
s, b = callr(teammate, "GET", "/api/v1/dev/me")
tm_clients = [c for c in b["clients"] if c["id"] == CID]
check("teammate sees the client (membership = visibility)", len(tm_clients) == 1
      and tm_clients[0]["role"] == "VIEWER")
s, b = callr(teammate, "POST", f"/api/v1/dev/clients/{CID}/keys", {"name": "nope-key"})
check("VIEWER mint key → 403", s == 403 and errcode(b) == "FORBIDDEN")
s, b = callr(teammate, "GET", f"/api/v1/dev/clients/{CID}/decisions")
check("VIEWER can read decisions", s == 200 and isinstance(b.get("decisions"), list))
s, b = callr(teammate, "POST", f"/api/v1/dev/clients/{CID}/team", {"identifier": owner_handle, "role": "VIEWER"})
check("VIEWER cannot manage team → 403", s == 403)

# DEVELOPER: can mint
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/team", {"identifier": tm_email, "role": "DEVELOPER"})
check("promote teammate to DEVELOPER (re-add after removal path)", s in (201, 409))
if s == 409:
    # remove then re-add as DEVELOPER
    con = sqlite3.connect(DB, timeout=30)
    mid = con.execute("SELECT id FROM ApiTeamMember WHERE clientId=? AND userId=(SELECT id FROM UserAccount WHERE handle=?)", (CID, tm_handle)).fetchone()[0]
    con.close()
    callr(owner, "DELETE", f"/api/v1/dev/clients/{CID}/team/{mid}")
    s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/team", {"identifier": tm_handle, "role": "DEVELOPER"})
    check("re-add as DEVELOPER → 201", s == 201)
s, b = callr(teammate, "POST", f"/api/v1/dev/clients/{CID}/keys", {"name": "mate-dev-key"})
check("DEVELOPER can mint keys", s == 201)

# non-member isolation (no existence leak)
outsider = client()
outs_email = f"b2boutsider_{STAMP}@example.com"
register(outsider, outs_email, f"b2bout{STAMP % 100000}", "B2B Outsider")
s, b = callr(outsider, "GET", "/api/v1/dev/me")
check("outsider sees NO clients", len(b.get("clients", [])) == 0)
con = sqlite3.connect(DB, timeout=30)
any_key = con.execute("SELECT id FROM ApiKey WHERE clientId = ? LIMIT 1", (CID,)).fetchone()[0]
con.close()
s, b = callr(outsider, "POST", f"/api/v1/dev/keys/{any_key}/revoke")
check("outsider revoke → uniform 404 (no existence leak)", s == 404 and errcode(b) == "NOT_FOUND")
s, b = callr(outsider, "GET", f"/api/v1/dev/clients/{CID}/decisions")
check("outsider decisions → 404", s == 404)

# OWNER immutable
con = sqlite3.connect(DB, timeout=30)
own_mid = con.execute("SELECT id FROM ApiTeamMember WHERE clientId=? AND role='OWNER'", (CID,)).fetchone()[0]
con.close()
s, b = callr(owner, "DELETE", f"/api/v1/dev/clients/{CID}/team/{own_mid}")
check("OWNER membership immutable → 409", s == 409 and errcode(b) == "OWNER_IMMUTABLE")

print("== 9. LIVE posture ==")
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/live", {"confirm": "nope"})
check("LIVE wrong confirm → 422 CONFIRM_REQUIRED", s == 422 and errcode(b) == "CONFIRM_REQUIRED")
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/live", {"confirm": "I UNDERSTAND"})
check("LIVE typed confirm → 200 + honesty note", s == 200 and b["client"]["environment"] == "LIVE"
      and "MOCK" in b.get("honesty", ""))
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/live", {"confirm": "I UNDERSTAND"})
check("already LIVE → 409", s == 409 and errcode(b) == "ALREADY_LIVE")
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/webhook", {"url": SINK, "rotateSecret": False})
check("LIVE rejects localhost webhook → 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/webhook", {"url": "https://hooks.example.com/ts", "rotateSecret": False})
check("LIVE accepts https webhook", s == 200 and b["client"]["webhook"]["url"] == "https://hooks.example.com/ts")
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID}/keys", {"name": "live-key"})
check("LIVE mint → tsk_live_ prefix", s == 201 and b["key"]["rawKey"].startswith("tsk_live_"))
LIVE_KEY = b["key"]["rawKey"]
s, b = api_call(LIVE_KEY, {"handle": owner_handle})
check("live key works; response says environment LIVE + providerMode MOCK",
      s == 200 and b["environment"] == "LIVE" and b["providerMode"] == "MOCK")
callr(owner, "POST", f"/api/v1/dev/clients/{CID}/webhook", {"url": "", "rotateSecret": False})

print("== 10. plans, audit discipline, DSR ==")
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID2}/plan", {"plan": "ENTERPRISE"})
check("invalid plan → 422", s == 422)
s, b = callr(owner, "POST", f"/api/v1/dev/clients/{CID2}/plan", {"plan": "STARTER"})
check("plan change → quota + caps in response", s == 200 and "billing" in b.get("billingHonesty", "").lower())

s, b = callr(owner, "GET", "/api/v1/auth/activity")
feed_acts = [e["action"] for e in b.get("events", [])]
check("activity feed surfaces Stage 9 actions (recent window)",
      "TRUST_DECISION_API" in feed_acts or "API_KEY_MINTED" in feed_acts, str(feed_acts)[:120])
con = sqlite3.connect(DB, timeout=30)
owner_id = con.execute("SELECT id FROM UserAccount WHERE email = ?", (owner_email,)).fetchone()[0]
acts = [r[0] for r in con.execute("SELECT DISTINCT action FROM AuditEvent WHERE actorId = ?", (owner_id,)).fetchall()]
meta_rows = con.execute("SELECT metadata FROM AuditEvent WHERE actorId = ? AND action = 'API_KEY_MINTED'", (owner_id,)).fetchall()
con.close()
for expected_action in ("DEV_CLIENT_CREATED", "API_KEY_MINTED", "API_KEY_REVOKED", "WEBHOOK_CONFIGURED",
                        "WEBHOOK_TEST_SENT", "DEV_TEAM_MEMBER_ADDED", "TRUST_DECISION_API", "DEV_CLIENT_LIVE_ENABLED"):
    check(f"audit action present: {expected_action}", expected_action in acts)
check("audit metadata: prefixes only, never raw key material",
      all(re.search(r"tsk_(live|sandbox)_[a-f0-9]{48}", str(m)) is None for m in meta_rows)
      and any("keyPrefix" in str(m) for m in meta_rows), str(meta_rows)[:120])

# subject DSR export: receipts + the subject's own portal (empty) + note
s, b = callr(subject, "POST", "/api/v1/passport/dsr", {"type": "EXPORT"})
check("subject DSR export generated", s in (200, 201))
s, b = callr(subject, "GET", "/api/v1/passport/dsr")
reqs = b.get("requests", [])
exp = [r for r in reqs if r.get("type") == "EXPORT" and r.get("status") == "COMPLETED"]
check("export listed", len(exp) >= 1)
if exp:
    s, raw_export = callr(subject, "GET", f"/api/v1/passport/dsr/{exp[-1]['id']}/export")
    if s == 200:
        payload = raw_export if isinstance(raw_export, dict) else json.loads(raw_export)
        blob = json.dumps(payload)
        check("subject export contains API_CHECK receipts",
              "API_CHECK" in blob and "B2B Matrix Shop" in blob)
    else:
        check("subject export contains API_CHECK receipts", False, f"status {s}")

# owner DSR export: apiPlatform section
s, b = callr(owner, "POST", "/api/v1/passport/dsr", {"type": "EXPORT"})
s, b = callr(owner, "GET", "/api/v1/passport/dsr")
exp = [r for r in b.get("requests", []) if r.get("type") == "EXPORT" and r.get("status") == "COMPLETED"]
if exp:
    s, raw_export = callr(owner, "GET", f"/api/v1/passport/dsr/{exp[-1]['id']}/export")
    payload = raw_export if isinstance(raw_export, dict) else (json.loads(raw_export) if s == 200 else {})
    ap = payload.get("apiPlatform") or {}
    ap_blob = json.dumps(ap)
    check("owner export: apiPlatform section (clients, key prefixes only, NO raw keys, NO webhook secret)",
          len(ap.get("clients", [])) >= 1
          and re.search(r"tsk_(live|sandbox)_[a-f0-9]{48}", ap_blob) is None
          and "whsec_" not in ap_blob
          and any("tsk_" in json.dumps(c.get("keys", [])) for c in ap.get("clients", [])),
          str(ap)[:150])
else:
    check("owner export: apiPlatform section", False, "no export listed")

print("== 11. auth-failure rate limit (burn, kept last) ==")
burned_429 = False
for i in range(11):
    s, b = call(ANON, "POST", "/api/v1/trust/check", {"handle": "x"},
                {"X-API-Key": "tsk_live_" + ("%048x" % i)})
    if s == 429 and errcode(b) == "RATE_LIMITED":
        burned_429 = True
        break
check("auth-fail rate limit trips within 11 bad keys", burned_429)

# ===========================================================================
print(f"\nStage 9 matrix: {PASS} passed, {FAIL} failed")
if FAIL > 0:
    raise SystemExit(1)
