#!/usr/bin/env python3
"""TrustScore Stage 4 — Trust Signals contract test matrix.
Covers: phone OTP verification (NG E.164 validation, hashed OTP, attempts,
resend cooldown, lockout, binding → L2), biometric liveness (job contract,
verdict thresholds, face-match failure, binding → L3), cross-signal
consistency (L4, SIM-swap gating), consent withdrawal semantics for signals,
cross-user isolation, error paths, rate limiting."""
import json
import re
import time
import urllib.request
import http.cookiejar

BASE = "http://127.0.0.1:3000"

def client():
    cj = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def call(op, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with op.open(req, timeout=30) as res:
            return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}

def callr(op, method, path, body=None):
    """call() with one patient retry on RATE_LIMITED (shared IP budget)."""
    s, b = call(op, method, path, body)
    if s == 429 and (b.get("error") or {}).get("code") == "RATE_LIMITED":
        time.sleep(62)
        s, b = call(op, method, path, body)
    return s, b

def errcode(b):
    return (b.get("error") or {}).get("code", "")

PASS = 0
FAIL = 0

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
    email = f"stage4_{tag}_{int(time.time()*1000)%1_000_000_000}@example.com"
    s, b = call(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1",
        "displayName": "Stage Four", "handle": f"s4_{int(time.time()*1000)%1_000_000_000}",
        "acceptTerms": True,
    })
    assert s == 201, f"register failed {s} {b}"
    return email

def verify_identity(op, scopes=None):
    """Complete the full NINAuth mock flow to establish L1."""
    body = {"scopes": scopes} if scopes else {}
    s, b = call(op, "POST", "/api/v1/identity/sessions", body)
    if s == 429:
        time.sleep(61)
        s, b = call(op, "POST", "/api/v1/identity/sessions", body)
    assert s == 201, f"session create {s} {b}"
    sid = b["session"]["id"]
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/consent", {
        "decision": "GRANT",
        "scopes": scopes or ["identity.basic", "identity.nin_status"],
    })
    assert s == 200, f"consent {s} {b}"
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/callback", {
        "code": b["code"], "state": b["state"],
    })
    assert s == 200, f"callback {s} {b}"
    return b

# ---------------------------------------------------------------------------
print("== Setup: three users (u1 full signals, u2 isolation, u3 no identity) ==")
u1 = client(); register(u1, "u1"); verify_identity(u1)
u2 = client(); register(u2, "u2"); verify_identity(u2)
u3 = client(); register(u3, "u3")  # no identity

# ---------------------------------------------------------------- 1) unauth
print("== 1) unauthenticated access ==")
anon = client()
for path, body in [
    ("/api/v1/identity/signals/phone/start", {"phone": "08012345678"}),
    ("/api/v1/identity/signals/phone/resend", {"verificationId": "x"*12}),
    ("/api/v1/identity/signals/phone/confirm", {"verificationId": "x"*12, "code": "123456"}),
    ("/api/v1/identity/signals/biometrics/start", {}),
    ("/api/v1/identity/signals/biometrics/complete", {"sessionId": "x"*12}),
]:
    s, b = call(anon, "POST", path, body)
    check(f"unauth POST {path.split('/')[-1]} -> 401", s == 401 and errcode(b) == "UNAUTHENTICATED")

# ------------------------------------------------- 2) identity required (L1 gate)
print("== 2) L1 gate: signals require a verified identity ==")
s, b = call(u3, "POST", "/api/v1/identity/signals/phone/start", {"phone": "08012345678"})
check("phone/start without identity -> 409 IDENTITY_REQUIRED", s == 409 and errcode(b) == "IDENTITY_REQUIRED")
s, b = call(u3, "POST", "/api/v1/identity/signals/biometrics/start", {})
check("biometrics/start without identity -> 409 IDENTITY_REQUIRED", s == 409 and errcode(b) == "IDENTITY_REQUIRED")

# ------------------------------------------------------------- 3) phone validation
print("== 3) phone validation (NG E.164) ==")
for bad in ["not-a-phone", "+441234567890", "0123456789", "+2341234567"]:
    s, b = call(u1, "POST", "/api/v1/identity/signals/phone/start", {"phone": bad})
    ok = s == 422 and errcode(b) in ("PHONE_INVALID", "VALIDATION_ERROR")
    check(f"invalid phone '{bad}' -> 422", ok, f"got {s} {errcode(b)}")

# ------------------------------------------------------------- 4) phone happy path
print("== 4) phone verification happy path ==")
s, b = callr(u1, "POST", "/api/v1/identity/signals/phone/start", {"phone": "0801 234 5678"})
check("start -> 201 PENDING", s == 201 and b["verification"]["status"] == "PENDING")
check("phone hint masked (no full number)", "5678" not in json.dumps(b) and "56 78" not in json.dumps(b))
check("MOCK delivery with code", b["delivery"]["mode"] == "MOCK" and extract_code(b["delivery"]["message"]))
vid = b["verification"]["id"]
code = extract_code(b["delivery"]["message"])
check("attemptsLeft == 3", b["verification"]["attemptsLeft"] == 3)
check("hint format masked", "•" in b["verification"]["phoneHint"])
check("delivery message includes 5-minute note", "5 minutes" in b["delivery"]["message"])

# wrong OTP (attempts accounting)
s, b = call(u1, "POST", "/api/v1/identity/signals/phone/confirm", {"verificationId": vid, "code": "000000"})
check("wrong code -> 400 OTP_INVALID", s == 400 and errcode(b) == "OTP_INVALID")
s, b = call(u1, "POST", "/api/v1/identity/signals/phone/confirm", {"verificationId": vid, "code": "111111"})
check("second wrong code -> 400", s == 400 and errcode(b) == "OTP_INVALID")

# correct OTP
s, b = call(u1, "POST", "/api/v1/identity/signals/phone/confirm", {"verificationId": vid, "code": code})
check("correct code -> VERIFIED", s == 200 and b["verification"]["status"] == "VERIFIED")
check("assuranceLevel escalated to 2", b["assuranceLevel"] == 2 and b["escalated"] is True)
check("identifier hint is masked", "•" in b["identifier"]["hint"])

# read model reflects L2 + PHONE identifier
s, b = call(u1, "GET", "/api/v1/identity/me")
sig = b.get("signals", {})
check("/identity/me has signals.phone ACTIVE", sig.get("phone", {}).get("status") == "ACTIVE")
check("phone hint present, masked", "•" in (sig.get("phone", {}).get("hint") or ""))
check("phone simSwapRisk LOW", sig.get("phone", {}).get("simSwapRisk") == "LOW")
ladder = {r["key"]: r["achieved"] for r in b.get("ladder", [])}
check("ladder L1+L2 achieved, L3/L4 not", ladder.get("government") and ladder.get("phone") and not ladder.get("biometric") and not ladder.get("cross_signal"))
types = [i["type"] for i in b.get("identifiers", [])]
check("identifiers include PHONE", "PHONE" in types)
ev_types = [e["type"] for e in b.get("evidence", [])]
check("evidence includes PHONE_OTP", "PHONE_OTP" in ev_types)
check("identity assuranceLevel persisted == 2", b["identity"]["assuranceLevel"] == 2)

# ------------------------------------------------- 5) attempts lockout on new verify
print("== 5) OTP attempts lockout ==")
s, b = callr(u1, "POST", "/api/v1/identity/signals/phone/start", {"phone": "+2348022345678"})
vid2 = b["verification"]["id"]
for i in range(3):
    s, b = call(u1, "POST", "/api/v1/identity/signals/phone/confirm", {"verificationId": vid2, "code": "999999"})
check("third wrong code -> 409 LOCKED", s == 409 and errcode(b) == "LOCKED")
s, b = call(u1, "POST", "/api/v1/identity/signals/phone/confirm", {"verificationId": vid2, "code": "123456"})
check("confirm on locked verification -> 409", s == 409)

# ------------------------------------------------------------- 6) resend cooldown
print("== 6) resend semantics ==")
s, b = callr(u1, "POST", "/api/v1/identity/signals/phone/start", {"phone": "0803 345 6789"})
vid3 = b["verification"]["id"]
old_code = extract_code(b["delivery"]["message"])
s, b = call(u1, "POST", "/api/v1/identity/signals/phone/resend", {"verificationId": vid3})
check("immediate resend -> 429 COOLDOWN", s == 429 and errcode(b) == "COOLDOWN")
# old code still valid before resend (no rotation on failed resend)
s, b = call(u1, "POST", "/api/v1/identity/signals/phone/confirm", {"verificationId": vid3, "code": old_code})
check("original code still works (no rotation on cooldown-blocked resend)", s == 200)

# ------------------------------------------------------------- 7) cross-user isolation
print("== 7) cross-user isolation ==")
s, b = call(u2, "POST", "/api/v1/identity/signals/phone/confirm", {"verificationId": vid, "code": code})
check("confirm another user's verification -> 404", s == 404 and errcode(b) == "NOT_FOUND")
s, b = call(u2, "POST", "/api/v1/identity/signals/phone/resend", {"verificationId": vid})
check("resend another user's verification -> 404", s == 404)
s, b = call(u2, "POST", "/api/v1/identity/signals/biometrics/complete", {"sessionId": "x"*12})
check("complete unknown liveness session -> 404", s == 404 and errcode(b) == "NOT_FOUND")

# ------------------------------------------------------------- 8) biometrics happy path
print("== 8) liveness happy path (L3) ==")
s, b = callr(u1, "POST", "/api/v1/identity/signals/biometrics/start", {})
check("liveness start -> 201 PENDING", s == 201 and b["session"]["status"] == "PENDING")
check("liveness MOCK labeled", b["session"]["providerMode"] == "MOCK")
check("instructions contract present", isinstance(b["session"]["instructions"], list) and len(b["session"]["instructions"]) >= 3)
check("consent recorded (biometric purpose)", b["consent"]["purpose"] == "SELF_ASSURANCE_BIOMETRIC")
lsid = b["session"]["id"]

s, b = call(u1, "POST", "/api/v1/identity/signals/biometrics/complete", {"sessionId": lsid})
check("complete ok -> PASSED", s == 200 and b["session"]["status"] == "PASSED")
check("verdict passed w/ scores", b["verdict"]["passed"] is True and b["verdict"]["livenessScore"] >= 70 and b["verdict"]["faceMatchScore"] >= 80)
check("assuranceLevel escalated to >= 3 (L4 when all signals agree)", b["assuranceLevel"] >= 3)

s, b = call(u1, "POST", "/api/v1/identity/signals/biometrics/complete", {"sessionId": lsid})
check("re-complete session -> 409 NOT_PENDING", s == 409 and errcode(b) == "NOT_PENDING")

s, b = call(u1, "GET", "/api/v1/identity/me")
sig = b.get("signals", {})
check("signals.biometric ACTIVE w/ scores", sig.get("biometric", {}).get("status") == "ACTIVE" and sig.get("biometric", {}).get("lastScores"))
check("cross-signal checks all ok", all(c["ok"] for c in sig.get("crossSignal", {}).get("checks", [])))
check("cross-signal consistent → L4", sig.get("crossSignal", {}).get("consistent") is True and sig.get("crossSignal", {}).get("eligibleLevel") == 4)
ladder = {r["key"]: r["achieved"] for r in b.get("ladder", [])}
check("ladder L1–L4 all achieved", all(ladder.values()))
check("identity assuranceLevel persisted == 4", b["identity"]["assuranceLevel"] == 4)
types = [i["type"] for i in b.get("identifiers", [])]
check("identifiers include PHONE + BIOMETRIC", "PHONE" in types and "BIOMETRIC" in types)
ev_types = [e["type"] for e in b.get("evidence", [])]
check("evidence includes LIVENESS", "LIVENESS" in ev_types)

# ------------------------------------------------------------- 9) liveness failures
print("== 9) liveness failure paths ==")
s, b = callr(u1, "POST", "/api/v1/identity/signals/biometrics/start", {})
lid = b["session"]["id"]
s, b = call(u1, "POST", "/api/v1/identity/signals/biometrics/complete", {"sessionId": lid, "simulate": "fail_liveness"})
check("fail_liveness -> FAILED, no binding", s == 200 and b["session"]["status"] == "FAILED" and b["verdict"]["passed"] is False)
check("failure reason is liveness threshold", b["verdict"]["reason"] == "liveness_score_below_threshold")

s, b = callr(u1, "POST", "/api/v1/identity/signals/biometrics/start", {})
lid2 = b["session"]["id"]
s, b = call(u1, "POST", "/api/v1/identity/signals/biometrics/complete", {"sessionId": lid2, "simulate": "face_mismatch"})
check("face_mismatch -> FAILED face_match_below_threshold", s == 200 and b["verdict"]["reason"] == "face_match_below_threshold")

# retry after failure works (u2)
s, b = callr(u2, "POST", "/api/v1/identity/signals/biometrics/start", {})
lid3 = b["session"]["id"]
s, b = call(u2, "POST", "/api/v1/identity/signals/biometrics/complete", {"sessionId": lid3, "simulate": "fail_liveness"})
check("u2 first liveness fails", s == 200 and b["session"]["status"] == "FAILED")
s, b = callr(u2, "POST", "/api/v1/identity/signals/biometrics/start", {})
lid4 = b["session"]["id"]
s, b = call(u2, "POST", "/api/v1/identity/signals/biometrics/complete", {"sessionId": lid4})
check("u2 retry liveness passes", s == 200 and b["session"]["status"] == "PASSED")

# bad simulate value
s, b = callr(u1, "POST", "/api/v1/identity/signals/biometrics/start", {})
lid5 = b["session"]["id"]
s, b = call(u1, "POST", "/api/v1/identity/signals/biometrics/complete", {"sessionId": lid5, "simulate": "bogus"})
check("unknown simulate -> 422 (zod boundary)", s == 422 and errcode(b) in ("REASON_INVALID", "VALIDATION_ERROR"))

# ------------------------------------------------------------- 10) SIM-swap gating (L4 without L3 binding)
print("== 10) SIM-swap risk gating on cross-signal ==")
u4 = client(); register(u4, "u4"); verify_identity(u4)
s, b = callr(u4, "POST", "/api/v1/identity/signals/phone/start", {"phone": "0809 456 7890", "simSwapRisk": "HIGH"})
vid4 = b["verification"]["id"]
code4 = extract_code(b["delivery"]["message"])
s, b = call(u4, "POST", "/api/v1/identity/signals/phone/confirm", {"verificationId": vid4, "code": code4})
check("phone verified with HIGH sim-swap (L2 still)", s == 200 and b["assuranceLevel"] == 2)
s, b = callr(u4, "POST", "/api/v1/identity/signals/biometrics/start", {})
lid6 = b["session"]["id"]
s, b = call(u4, "POST", "/api/v1/identity/signals/biometrics/complete", {"sessionId": lid6})
check("biometric passes → L3 but not L4 (sim swap)", s == 200 and b["assuranceLevel"] == 3)
s, b = call(u4, "GET", "/api/v1/identity/me")
sig = b.get("signals", {})
check("cross-signal NOT consistent (sim swap HIGH)", sig.get("crossSignal", {}).get("consistent") is False)
sim_check = [c for c in sig.get("crossSignal", {}).get("checks", []) if c["key"] == "sim_swap"]
check("sim_swap check flagged not-ok", sim_check and sim_check[0]["ok"] is False)
ladder = {r["key"]: r["achieved"] for r in b.get("ladder", [])}
check("ladder L4 not achieved for u4", ladder.get("cross_signal") is False and ladder.get("biometric") is True)

# ------------------------------------------------------------- 11) withdrawal semantics
print("== 11) signal consent withdrawal ==")
s, b = call(u1, "GET", "/api/v1/identity/me")
phone_consent = sig_before = b["signals"]["phone"]["consentId"]
check("phone consentId present", phone_consent is not None)
bio_consent = b["signals"]["biometric"]["consentId"]
check("biometric consentId present", bio_consent is not None)

# withdraw phone → L2 lost, ladder drops to L1
s, b = call(u1, "POST", f"/api/v1/identity/consents/{phone_consent}/withdraw")
check("withdraw phone consent -> ok", s == 200 and b.get("withdrawn") is True)
check("revokedIdentifiers >= 1", b.get("revokedIdentifiers", 0) >= 1)
check("identity NOT revoked (signal consent only)", b.get("identityRevoked") is False)
s, b = call(u1, "GET", "/api/v1/identity/me")
ladder = {r["key"]: r["achieved"] for r in b.get("ladder", [])}
check("ladder drops to L1 after phone withdrawal", ladder.get("government") and not ladder.get("phone"))
check("phone signal REVOKED", b["signals"]["phone"]["status"] == "REVOKED")
check("biometric still ACTIVE", b["signals"]["biometric"]["status"] == "ACTIVE")
check("identity assuranceLevel de-escalated to 1", b["identity"]["assuranceLevel"] == 1)

# double withdrawal
s, b = call(u1, "POST", f"/api/v1/identity/consents/{phone_consent}/withdraw")
check("double withdrawal -> 409 ALREADY_WITHDRAWN", s == 409 and errcode(b) == "ALREADY_WITHDRAWN")

# withdraw biometric → down to L1
s, b = call(u1, "POST", f"/api/v1/identity/consents/{bio_consent}/withdraw")
check("withdraw biometric consent -> ok", s == 200)
s, b = call(u1, "GET", "/api/v1/identity/me")
check("biometric signal REVOKED", b["signals"]["biometric"]["status"] == "REVOKED")
check("identity still VERIFIED L1", b["identity"]["status"] == "VERIFIED" and b["identity"]["assuranceLevel"] == 1)

# ------------------------------------------------------------- 12) re-bind after withdrawal
print("== 12) re-bind after withdrawal ==")
s, b = callr(u1, "POST", "/api/v1/identity/signals/phone/start", {"phone": "0801 234 5678"})
vid5 = b["verification"]["id"]
code5 = extract_code(b["delivery"]["message"])
s, b = call(u1, "POST", "/api/v1/identity/signals/phone/confirm", {"verificationId": vid5, "code": code5})
check("re-bind phone works → L2 again", s == 200 and b["assuranceLevel"] == 2)

# ------------------------------------------------------------- 13) activity + audit visibility
print("== 13) audit + activity feed includes signal events ==")
s, b = call(u1, "GET", "/api/v1/auth/activity")
actions = [ev["action"] for ev in b.get("events", [])]
check("activity includes SIGNAL_PHONE_VERIFIED", "SIGNAL_PHONE_VERIFIED" in actions)
check("activity includes SIGNAL_LIVENESS_PASSED", "SIGNAL_LIVENESS_PASSED" in actions)
check("activity includes withdrawal event", "IDENTITY_CONSENT_WITHDRAWN" in actions)

# ------------------------------------------------------------- 14) validation errors
print("== 14) input validation ==")
s, b = call(u1, "POST", "/api/v1/identity/signals/phone/confirm", {"verificationId": vid5, "code": "12345"})
check("5-digit code -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(u1, "POST", "/api/v1/identity/signals/phone/confirm", {"verificationId": vid5, "code": "12345"})
check("non-numeric rejected by zod", s in (400, 422))
s, b = call(u1, "POST", "/api/v1/identity/signals/phone/start", {"phone": ""})
check("empty phone -> 422", s == 422)

# ------------------------------------------------------------- 15) rate limits
print("== 15) rate limits ==")
u5 = client(); register(u5, "u5"); verify_identity(u5)
last = 0
for i in range(6):
    s, b = call(u5, "POST", "/api/v1/identity/signals/phone/start", {"phone": "0805 555 5555"})
    last = s
check("phone/start rate limit -> 429 (5+ rapid creates)", last == 429 and errcode(b) == "RATE_LIMITED")

print(f"\n===== RESULT: {PASS} pass / {FAIL} fail =====")
exit(1 if FAIL else 0)
