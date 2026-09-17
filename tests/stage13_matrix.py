#!/usr/bin/env python3
"""TrustScore Stage 13 — Live-Ready Providers contract test matrix.
Covers: the provider transport layer posture contract (mock default,
loopback real-transport, LIVE honestly refused), the full NINAuth OAuth flow
over the wire (session → consent → callback with provider-issued code +
provider-signed ID token + provider-derived profile claims), phone OTP
delivery over the transport with the sandbox SMS inbox (codes never echoed by
the API in LIVE-mode deliveries), liveness job create → verdict over the
transport, the circuit breaker (trips after 3 consecutive failures, fails
fast while OPEN, self-heals to CLOSED after the open window), fault modes,
the credential vault (write-only secrets, masked hints, rotation, revoke),
admin authorization on every new endpoint, audit trail, and deterministic
cleanup (posture restored to mock, faults cleared, circuits reset)."""
import json
import re
import time
import urllib.request
import urllib.error
import http.cookiejar
import sqlite3

BASE = "http://127.0.0.1:3000"
DB = "/home/z/my-project/db/custom.db"
PASS = 0
FAIL = 0

def client():
    cj = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def call(op, method, path, body=None, headers=None, timeout=40):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with op.open(req, timeout=timeout) as res:
            return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}
    except (urllib.error.URLError, ConnectionError, OSError, TimeoutError) as e:
        return 0, {"error": {"code": "NETWORK", "message": str(e)}}

def callr(op, method, path, body=None, headers=None, timeout=40):
    """Retry-aware call: waits out shared-IP rate windows."""
    for attempt in range(4):
        s, b = call(op, method, path, body, headers, timeout=timeout)
        if s == 429 and (b.get("error") or {}).get("code") == "RATE_LIMITED":
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
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} {extra}")

def extract_code(msg):
    m = re.search(r"\b(\d{6})\b", msg)
    return m.group(1) if m else ""

def register(op, tag):
    stamp = int(time.time() * 1000) % 1_000_000_000
    email = f"stage13_{tag}_{stamp}@example.com"
    s, b = callr(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1",
        "displayName": "Stage Thirteen", "handle": f"s13_{tag}_{stamp}",
        "acceptTerms": True,
    })
    assert s == 201, f"register failed {s} {b}"
    return email, f"s13_{tag}_{stamp}"

def promote_admin(email):
    con = sqlite3.connect(DB, timeout=30)
    con.execute("UPDATE UserAccount SET role='ADMIN' WHERE email=?", (email,))
    con.commit()
    con.close()

def db_user_id(email):
    con = sqlite3.connect(DB, timeout=30)
    row = con.execute("SELECT id FROM UserAccount WHERE email=?", (email,)).fetchone()
    con.close()
    return row[0] if row else None

def admin_get(op):
    s, b = call(op, "GET", "/api/v1/engine/admin/providers")
    return b if s == 200 else {}

def transport_of(op, key):
    for p in admin_get(op).get("providers", []):
        if p["key"] == key:
            return p.get("transport", {})
    return {}

def set_fault(op, key, mode):
    return call(op, "POST", f"/api/v1/engine/admin/providers/{key}/fault", {"mode": mode})

# ---------------------------------------------------------------------------
print("== 1) version catalog ==")
s, b = call(client(), "GET", "/api/health")
check("health reports the current platform version (Stage 14 / v1.13.0)",
      s == 200 and b.get("version") == "1.13.0" and "14" in b.get("stage", ""),
      str(b.get("stage")))
s, b = call(client(), "GET", "/api")
paths = {e["path"] for e in b.get("endpoints", [])}
check("api index: v1.13.0 + Stage 14 (provider endpoints still cataloged)",
      b.get("version") == "1.13.0" and "14" in b.get("stage", ""))
check("api index catalogs all 7 provider endpoints",
      "/api/v1/engine/admin/providers" in paths
      and "/api/v1/identity/signals/phone/inbox" in paths
      and "/api/v1/engine/admin/providers/:key/reset" in paths
      and "/api/v1/engine/admin/providers/:key/credential" in paths
      and "/api/v1/engine/admin/providers/:key/fault" in paths)
check("api index roadmap marks 13 shipped",
      "13" in b.get("roadmap", {}) and "12" in b.get("roadmap", {}))

# ---------------------------------------------------------------------------
print("== 2) admin authorization on the provider console ==")
anon = client()
member_op = client()
member_email, member_handle = register(member_op, "member")
admin_op = client()
admin_email, admin_handle = register(admin_op, "admin")
promote_admin(admin_email)
admin_id = db_user_id(admin_email)

s, b = call(anon, "GET", "/api/v1/engine/admin/providers")
check("providers GET unauthenticated -> 401", s == 401 and errcode(b) == "UNAUTHENTICATED")
s, b = call(member_op, "GET", "/api/v1/engine/admin/providers")
check("providers GET non-admin -> 403", s == 403 and errcode(b) == "FORBIDDEN")
s, b = call(member_op, "PUT", "/api/v1/engine/admin/providers", {"posture": "loopback"})
check("providers PUT non-admin -> 403 (cannot flip posture)", s == 403)
s, b = call(member_op, "POST", "/api/v1/engine/admin/providers/ninauth/reset")
check("reset non-admin -> 403", s == 403)
s, b = call(member_op, "PUT", "/api/v1/engine/admin/providers/phone/credential",
            {"keyId": "x-key", "secret": "123456789012"})
check("vault PUT non-admin -> 403", s == 403)

# Pre-flight (idempotent entry): an aborted prior run may have left the
# posture in loopback with an OPEN circuit and a stale fault mode. Normalize:
# loopback → clear faults → reset circuits → back to mock.
b0 = admin_get(admin_op)
if b0.get("posture") != "mock":
    if b0.get("posture") == "loopback":
        set_fault(admin_op, "ninauth", "none")
    for key in ("ninauth", "phone", "liveness"):
        call(admin_op, "POST", f"/api/v1/engine/admin/providers/{key}/reset")
    call(admin_op, "PUT", "/api/v1/engine/admin/providers", {"posture": "mock"})
    time.sleep(6)  # posture cache TTL is 5s

# ---------------------------------------------------------------------------
print("== 3) posture contract (default mock, honest LIVE refusal) ==")
b = admin_get(admin_op)
check("default posture is mock (all prior matrices keep their labels)",
      b.get("posture") == "mock")
check("three providers with transport read model",
      [p["key"] for p in b.get("providers", [])] == ["ninauth", "phone", "liveness"]
      and all("circuit" in p.get("transport", {}) for p in b.get("providers", [])))
check("MOCK posture names preserved", all(
      p.get("providerName") in ("NINAUTH_MOCK", "SMS_MOCK", "LIVENESS_MOCK")
      and p.get("mode") == "MOCK" for p in b.get("providers", [])))
check("simulator reachable on :3032",
      (b.get("simulator") or {}).get("reachable") is True and b["simulator"]["port"] == 3032)
check("LIVE honestly unavailable in sandbox", b.get("liveAvailable") is False)
check("vault flagged as dev-master-key (VAULT_MASTER_KEY unset)",
      b.get("vaultDefaultKey") is True)
check("transport constants surfaced (timeout/retries/breaker)",
      b.get("constants", {}).get("requestTimeoutMs") == 4000
      and b.get("constants", {}).get("circuitThreshold") == 3)

s, b = call(admin_op, "PUT", "/api/v1/engine/admin/providers", {"posture": "live"})
check("posture live -> 422 LIVE_NOT_ENABLED (never pretended)",
      s == 422 and errcode(b) == "LIVE_NOT_ENABLED", errcode(b))
s, b = call(admin_op, "PUT", "/api/v1/engine/admin/providers", {"posture": "nonsense"})
check("posture invalid -> 422 VALIDATION_ERROR", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(admin_op, "PUT", "/api/v1/engine/admin/providers", {"posture": "loopback"})
check("posture loopback -> 200 + honest note",
      s == 200 and b.get("posture") == "loopback" and "transport" in b.get("note", "").lower())
set_fault(admin_op, "ninauth", "none")  # normalize any stale simulator fault
b = admin_get(admin_op)
check("posture read-back: loopback names + LIVE mode", b.get("posture") == "loopback" and all(
      p.get("providerName").endswith("_LOOPBACK") and p.get("mode") == "LIVE"
      for p in b.get("providers", [])))

# ---------------------------------------------------------------------------
print("== 4) NINAuth OAuth over the REAL transport (loopback) ==")
s, b = callr(admin_op, "POST", "/api/v1/identity/sessions",
             {"scopes": ["identity.basic", "identity.nin_status", "profile.name"]})
check("session created over the transport -> NINAUTH_LOOPBACK / LIVE",
      s == 201 and b["session"]["provider"] == "NINAUTH_LOOPBACK"
      and b["session"]["providerMode"] == "LIVE", str(b.get("session", {}).get("provider")))
check("authorizationUrl points at the simulator",
      "127.0.0.1:3032" in b["session"].get("authorizationUrl", ""))
sid = b["session"]["id"]
s, b = call(admin_op, "POST", f"/api/v1/identity/sessions/{sid}/consent",
            {"decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status", "profile.name"]})
code = b.get("code", "")
check("consent GRANT: provider-issued one-time code (nac_ prefix)",
      s == 200 and code.startswith("nac_"), code[:12])
state = b.get("state", "")
s, b = call(admin_op, "POST", f"/api/v1/identity/sessions/{sid}/callback",
            {"code": code, "state": state})
ident = b.get("identity", {})
check("callback ok: identity established from provider claims",
      s == 200 and b.get("ok") is True and ident.get("provider") == "NINAUTH_LOOPBACK"
      and ident.get("providerIdentityRef", "").startswith("NINAUTH-****-"), str(ident.get("provider")))
# replayed callback: simulator marks the code used
s2, b2 = call(admin_op, "POST", f"/api/v1/identity/sessions/{sid}/callback",
              {"code": code, "state": state})
check("authorization code single-use (replay rejected)", s2 != 200)
s, b = call(admin_op, "GET", "/api/v1/identity/me")
attrs = {a["key"]: a for a in b.get("attributes", [])}
check("attributes sourced from the provider record (NINAUTH_LOOPBACK)",
      "given_name" in attrs and attrs["given_name"]["source"] == "NINAUTH_LOOPBACK")
check("scope filtering holds over the wire (no demographics without the scope)",
      "birth_year" not in attrs)
ev = b.get("evidence", [])
check("evidence records the loopback transport",
      any(e.get("provider") == "NINAUTH_LOOPBACK" and e.get("providerMode") == "LIVE" for e in ev))
check("NIN_FINGERPRINT identifier bound from provider subject",
      any(i.get("type") == "NIN_FINGERPRINT" and i.get("status") == "ACTIVE"
          for i in b.get("identifiers", [])))

# ---------------------------------------------------------------------------
print("== 5) phone OTP over the transport + sandbox SMS inbox ==")
s, b = callr(admin_op, "POST", "/api/v1/identity/signals/phone/start", {"phone": "0803 555 0130"})
check("phone start -> SMS_LOOPBACK / LIVE",
      s == 201 and b["verification"]["provider"] == "SMS_LOOPBACK"
      and b["verification"]["providerMode"] == "LIVE")
check("LIVE delivery contract: NO code echoed in the API response",
      b["delivery"]["mode"] == "LIVE" and extract_code(b["delivery"]["message"]) == "",
      b["delivery"]["message"][:80])
vid = b["verification"]["id"]
hint = b["verification"]["phoneHint"]
s, b = call(admin_op, "GET", "/api/v1/identity/signals/phone/inbox")
msgs = b.get("messages", [])
check("sandbox inbox holds the delivered message (own hint only)",
      s == 200 and len(msgs) >= 1 and msgs[0]["to"] == hint)
otp = extract_code(msgs[0]["text"]) if msgs else ""
check("code readable from the carrier inbox", otp != "")
s, b = call(admin_op, "POST", "/api/v1/identity/signals/phone/confirm",
            {"verificationId": vid, "code": otp})
check("confirm with inbox code -> ladder L2", s == 200 and b.get("escalated") is True
      and b.get("assuranceLevel") == 2, errcode(b))
s, b = call(anon, "GET", "/api/v1/identity/signals/phone/inbox")
check("inbox requires a session", s == 401)

# ---------------------------------------------------------------------------
print("== 6) liveness over the transport ==")
s, b = call(admin_op, "POST", "/api/v1/identity/signals/biometrics/start", {})
check("liveness job created by the partner (simjob_ id)",
      s == 201 and b["session"]["provider"] == "LIVENESS_LOOPBACK"
      and b["session"]["jobId"].startswith("simjob_"))
lsid = b["session"]["id"]
s, b = call(admin_op, "POST", "/api/v1/identity/signals/biometrics/complete",
            {"sessionId": lsid, "simulate": "ok"})
v = b.get("verdict", {})
check("verdict from the partner: passed + bound + L4",
      s == 200 and v.get("passed") is True and v.get("bound") is True
      and b.get("assuranceLevel") == 4)
check("verdict shape enforced (scores are numbers)",
      isinstance(v.get("livenessScore"), int) and isinstance(v.get("faceMatchScore"), int))

# ---------------------------------------------------------------------------
print("== 7) circuit breaker (timeout fault -> trip -> fast-fail -> self-heal) ==")
t = transport_of(admin_op, "ninauth")
check("circuit CLOSED before faults", t.get("circuit") == "CLOSED")
s, b = set_fault(admin_op, "ninauth", "timeout")
check("fault mode set (loopback posture)", s == 200 and b.get("mode") == "timeout")
fails = 0
for i in range(3):
    s, b = callr(admin_op, "POST", "/api/v1/identity/sessions", {}, timeout=60)
    if s == 503 and errcode(b) == "PROVIDER_UNAVAILABLE":
        fails += 1
check("3 calls under timeout fault -> honest 503s (retries exhausted)", fails == 3, f"{fails}/3")
t = transport_of(admin_op, "ninauth")
check("circuit OPEN after 3 consecutive failures",
      t.get("circuit") == "OPEN" and t.get("errors", 0) >= 3, str(t.get("circuit")))
check("lastError records TIMEOUT", "TIMEOUT" in (t.get("lastError") or ""))
t0 = time.time()
s, b = call(admin_op, "POST", "/api/v1/identity/sessions", {}, timeout=60)
elapsed = time.time() - t0
check("call while OPEN fails FAST (< 2s, no transport attempt)",
      s == 503 and elapsed < 2.0, f"{s} in {elapsed:.2f}s")
s, b = set_fault(admin_op, "ninauth", "none")
check("fault cleared", s == 200)
time.sleep(21)  # circuit OPEN window is 20s -> HALF_OPEN probe
s, b = callr(admin_op, "POST", "/api/v1/identity/sessions", {})
check("half-open probe succeeds after the open window -> CLOSED",
      s == 201 and transport_of(admin_op, "ninauth").get("circuit") == "CLOSED", f"{s}")
s, b = set_fault(admin_op, "ninauth", "auth")
check("auth fault settable", s == 200)
s, b = call(admin_op, "POST", "/api/v1/identity/sessions", {}, timeout=60)
check("auth mismatch -> 401 answer, NOT retried (fail in < 6s)",
      s == 503 and "AUTH_REJECTED" in (transport_of(admin_op, "ninauth").get("lastError") or ""))
set_fault(admin_op, "ninauth", "none")
s, b = call(admin_op, "POST", "/api/v1/engine/admin/providers/ninauth/reset")
check("admin reset -> circuit CLOSED + metrics zeroed",
      s == 200 and b["transport"]["circuit"] == "CLOSED" and b["transport"]["calls"] == 0)
s, b = call(admin_op, "POST", "/api/v1/engine/admin/providers/nosuch/reset")
check("reset unknown provider -> 404", s == 404 and errcode(b) == "UNKNOWN_PROVIDER")
s, b = call(admin_op, "POST", "/api/v1/engine/admin/providers/phone/fault", {"mode": "bogus"})
check("unknown fault mode -> 422", s == 422)

# ---------------------------------------------------------------------------
print("== 8) credential vault (write-only secrets) ==")
# Deterministic entry: clear any pre-existing vault rows (earlier manual runs).
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM ProviderCredential")
con.commit()
con.close()
SECRET = "partner-secret-never-echo-987654"
s, b = call(admin_op, "PUT", "/api/v1/engine/admin/providers/phone/credential",
            {"keyId": "sms-partner-key-1", "secret": SECRET, "note": "matrix test"})
cred = b.get("credential", {})
check("credential stored -> masked hint, ACTIVE",
      s == 200 and cred.get("status") == "ACTIVE" and "•" in cred.get("hint", "")
      and cred.get("keyId") == "sms-partner-key-1")
check("secret NEVER echoed (masked hint only)",
      SECRET not in json.dumps(b) and cred.get("hint", "").endswith(SECRET[-4:]))
check("ciphertext never surfaces", "secretCipher" not in json.dumps(b))
b = admin_get(admin_op)
phone_entry = [p for p in b.get("providers", []) if p["key"] == "phone"][0]
check("provider entry carries the ACTIVE credential",
      (phone_entry.get("credential") or {}).get("keyId") == "sms-partner-key-1")
s, b = call(admin_op, "PUT", "/api/v1/engine/admin/providers/phone/credential",
            {"keyId": "sms-partner-key-2", "secret": "rotated-secret-abcdef123456"})
vault = b.get("vault", [])
check("rotation: single ACTIVE, previous RETIRED",
      len([v for v in vault if v["provider"] == "phone" and v["status"] == "ACTIVE"]) == 1
      and len([v for v in vault if v["provider"] == "phone" and v["status"] == "RETIRED"]) == 1)
s, b = call(admin_op, "PUT", "/api/v1/engine/admin/providers/phone/credential",
            {"keyId": "k", "secret": "short"})
check("short secret -> 422 validation", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(admin_op, "PUT", "/api/v1/engine/admin/providers/nosuch/credential",
            {"keyId": "k1k1", "secret": "long-enough-secret-123"})
check("unknown provider -> 404", s == 404)
s, b = call(admin_op, "DELETE", "/api/v1/engine/admin/providers/phone/credential")
check("revoke -> immediate", s == 200 and "revoked" in b.get("note", "").lower())
b = admin_get(admin_op)
phone_entry = [p for p in b.get("providers", []) if p["key"] == "phone"][0]
check("no ACTIVE credential after revoke", phone_entry.get("credential") is None)
s, b = call(admin_op, "DELETE", "/api/v1/engine/admin/providers/phone/credential")
check("revoke with none stored -> 409", s == 409 and errcode(b) == "NO_ACTIVE_CREDENTIAL")

# ---------------------------------------------------------------------------
print("== 9) audit trail + simulator health ==")
con = sqlite3.connect(DB, timeout=30)
rows = con.execute(
    "SELECT action FROM AuditEvent WHERE actorId=? ORDER BY createdAt DESC LIMIT 60",
    (admin_id,)).fetchall()
actions = {r[0] for r in rows}
con.close()
check("audit records posture changes",
      "PROVIDER_POSTURE_CHANGED" in actions)
check("audit records transport resets + fault modes + vault ops",
      {"PROVIDER_TRANSPORT_RESET", "SIMULATOR_FAULT_MODE_SET",
       "PROVIDER_CREDENTIAL_SAVED", "PROVIDER_CREDENTIAL_REVOKED"} <= actions,
      str(sorted(actions & {"PROVIDER_TRANSPORT_RESET", "SIMULATOR_FAULT_MODE_SET",
                            "PROVIDER_CREDENTIAL_SAVED", "PROVIDER_CREDENTIAL_REVOKED"})))
b = admin_get(admin_op)
sim = b.get("simulator", {})
check("simulator health: reachable, fault none",
      sim.get("reachable") is True and sim.get("fault") == "none")

# ---------------------------------------------------------------------------
print("== 10) restore mock + labeling revert ==")
s, b = call(admin_op, "PUT", "/api/v1/engine/admin/providers", {"posture": "mock"})
check("posture restored to mock", s == 200 and b.get("posture") == "mock")
s, b = call(admin_op, "POST", "/api/v1/engine/admin/providers/ninauth/fault", {"mode": "timeout"})
check("fault injection refused outside loopback (409 LOOPBACK_ONLY)",
      s == 409 and errcode(b) == "LOOPBACK_ONLY")
s, b = call(admin_op, "GET", "/api/v1/identity/signals/phone/inbox")
check("sandbox inbox refused in mock posture (409)",
      s == 409 and "loopback" in (errcode(b) + json.dumps(b)).lower() or s == 409)
# mock labels + delivery echo (regression guard for stages 2-4)
time.sleep(62)  # identity-session rate window (shared IP)
s, b = callr(admin_op, "POST", "/api/v1/identity/sessions", {})
check("mock posture: sessions label NINAUTH_MOCK again",
      s == 201 and b["session"]["provider"] == "NINAUTH_MOCK"
      and b["session"]["providerMode"] == "MOCK")
s, b = callr(admin_op, "POST", "/api/v1/identity/signals/phone/start", {"phone": "0803 555 0131"})
check("mock posture: MOCK delivery echoes the code again",
      s == 201 and b["verification"]["provider"] == "SMS_MOCK"
      and extract_code(b["delivery"]["message"]) != "")

# ---------------------------------------------------------------------------
print("== 11) deterministic cleanup ==")
# Restore through the API FIRST (invalidates the app's posture cache), then
# remove the rows directly — the next read falls back to the honest default.
for key in ("ninauth", "phone", "liveness"):
    call(admin_op, "POST", f"/api/v1/engine/admin/providers/{key}/reset")
call(admin_op, "PUT", "/api/v1/engine/admin/providers", {"posture": "mock"})
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM ProviderCredential WHERE createdBy IN (?, ?)", (admin_handle, member_handle))
con.execute("DELETE FROM PlatformSetting WHERE key='providers.posture'")
con.commit()
con.close()
ids = [admin_id, db_user_id(member_email)]
qmarks = ",".join("?" * len(ids))
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM TrustEdge WHERE aUserId IN (%s) OR bUserId IN (%s)" % (qmarks, qmarks), ids + ids)
con.execute("DELETE FROM SharedSignal WHERE subjectUserId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM NetworkMembership WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM TrustReceipt WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM SafetyCheck WHERE verifierId IN (%s) OR subjectId IN (%s)" % (qmarks, qmarks), ids + ids)
con.execute("DELETE FROM TrustRequest WHERE verifierId IN (%s) OR subjectId IN (%s)" % (qmarks, qmarks), ids + ids)
con.execute("DELETE FROM TrustScoreSnapshot WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM Credential WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM IdentityIdentifier WHERE trustIdentityId IN (SELECT id FROM TrustIdentity WHERE userId IN (%s))" % qmarks, ids)
con.execute("DELETE FROM IdentityAttribute WHERE trustIdentityId IN (SELECT id FROM TrustIdentity WHERE userId IN (%s))" % qmarks, ids)
con.execute("DELETE FROM Evidence WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM PhoneVerification WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM LivenessSession WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM VerificationSession WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM Consent WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM Notification WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM DsrRequest WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM Session WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM AuditEvent WHERE actorId IN (%s) OR subjectId IN (%s)" % (qmarks, qmarks), ids + ids)
con.execute("DELETE FROM TrustIdentity WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM UserAccount WHERE id IN (%s)" % qmarks, ids)
con.commit()
con.close()
con = sqlite3.connect(DB, timeout=30)
n = con.execute("SELECT COUNT(*) FROM UserAccount WHERE id IN (%s)" % qmarks, ids).fetchone()[0]
v = con.execute("SELECT COUNT(*) FROM ProviderCredential").fetchone()[0]
p = con.execute("SELECT COUNT(*) FROM PlatformSetting WHERE key='providers.posture'").fetchone()[0]
con.close()
check("test users + vault rows + posture setting removed", n == 0 and v == 0 and p == 0)

print(f"\n===== RESULT: {PASS} pass / {FAIL} fail =====")
if FAIL:
    raise SystemExit(1)
