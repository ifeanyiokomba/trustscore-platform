#!/usr/bin/env python3
"""TrustScore Stage 2 — OAuth contract test matrix (python, robust)."""
import json
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

PASS = 0
FAIL = 0

def check(name, cond, extra=""):
    global PASS, FAIL
    mark = "PASS" if cond else "FAIL"
    if cond:
        PASS += 1
    else:
        FAIL += 1
    print(f"  [{mark}] {name}" + (f" — {extra}" if extra else ""))

def errcode(body):
    return body.get("error", {}).get("code", "?")

# ---------------------------------------------------------------- login
chidi = client()
ada = client()
s, _ = call(chidi, "POST", "/api/v1/auth/login", {"email": "chidi@example.com", "password": "TrustMe123!"})
check("login chidi", s == 200)
s, _ = call(ada, "POST", "/api/v1/auth/login", {"email": "ada@example.com", "password": "SuperSecret1"})
check("login ada", s == 200)

# ---------------------------------------------------------------- 1) unauth
anon = client()
s, b = call(anon, "POST", "/api/v1/identity/sessions", {})
check("unauth create -> 401", s == 401 and errcode(b) == "UNAUTHENTICATED")

# ---------------------------------------------------------------- 2) create
s, b = call(chidi, "POST", "/api/v1/identity/sessions", {})
sess = b.get("session", {})
consent = b.get("consent", {})
check("auth create -> 201", s == 201, f"status={sess.get('status')}")
check("session AWAITING_CONSENT", sess.get("status") == "AWAITING_CONSENT")
check("provider mode MOCK (honesty)", sess.get("providerMode") == "MOCK" and consent.get("mode") == "MOCK")
check("share code format", sess.get("shareCode", "").startswith("TS-"))
check("consent screen contract", consent.get("requester") == "TrustScore" and len(consent.get("fields", [])) >= 2
      and consent.get("policyVersion", "").startswith("consent-policy"))
check("authorizationUrl shape", "authorize" in sess.get("authorizationUrl", "") and "code_challenge" in sess.get("authorizationUrl", ""))
SID = sess.get("id", "")
check("PKCE challenge in URL uses S256", "code_challenge_method=S256" in sess.get("authorizationUrl", ""))
check("verifier never leaked to client", "codeVerifier" not in json.dumps(b) and "verifier" not in json.dumps(b).lower().replace("code_challenge","").replace("code_verifier",""))

# ---------------------------------------------------------------- 3) timeline
s, b = call(chidi, "GET", f"/api/v1/identity/sessions/{SID}")
check("session GET -> 200", s == 200)
check("timeline has SESSION_CREATED", any(e["eventType"] == "SESSION_CREATED" for e in b["session"]["events"]))

# ---------------------------------------------------------------- 4) other user
s, b = call(ada, "GET", f"/api/v1/identity/sessions/{SID}")
check("cross-user session access -> 404", s == 404 and errcode(b) == "SESSION_NOT_FOUND")

# ---------------------------------------------------------------- 5) grant
s, b = call(chidi, "POST", f"/api/v1/identity/sessions/{SID}/consent", {"decision": "GRANT"})
check("consent GRANT -> 200", s == 200, f"got {s} {b}")
CODE = b.get("code", "")
STATE = b.get("state", "")
check("authorization code issued", CODE.startswith("nac_"))
check("state returned", len(STATE) >= 10)

# ---------------------------------------------------------------- 6) wrong state
s, b = call(chidi, "POST", f"/api/v1/identity/sessions/{SID}/callback", {"code": CODE, "state": "tampered_state_value1"})
check("wrong state -> 400 BAD_STATE", s == 400 and errcode(b) == "BAD_STATE", f"got {s} {errcode(b)}")
s, b = call(chidi, "GET", f"/api/v1/identity/sessions/{SID}")
check("session FAILED after state mismatch", b["session"]["status"] == "FAILED")

# ---------------------------------------------------------------- 7) happy path
s, b = call(chidi, "POST", "/api/v1/identity/sessions", {})
SID2 = b["session"]["id"]
s, b = call(chidi, "POST", f"/api/v1/identity/sessions/{SID2}/consent", {"decision": "GRANT"})
CODE2, STATE2 = b["code"], b["state"]
s, b = call(chidi, "POST", f"/api/v1/identity/sessions/{SID2}/callback", {"code": CODE2, "state": STATE2})
ident = b.get("identity", {})
check("callback -> 200 VERIFIED", s == 200 and ident.get("status") == "VERIFIED", f"got {s} {b}")
check("assurance level 1", ident.get("assuranceLevel") == 1)
check("masked subject ref (no raw NIN)", str(ident.get("providerIdentityRef", "")).startswith("NINAUTH-****-"))
check("freshness expiry set (90d)", ident.get("expiresAt") is not None)
check("ID token NOT leaked to client", "id_token" not in json.dumps(b) and "access_token" not in json.dumps(b))

# ---------------------------------------------------------------- 8) replay
s, b = call(chidi, "POST", f"/api/v1/identity/sessions/{SID2}/callback", {"code": CODE2, "state": STATE2})
check("code replay -> 409 CODE_REUSED", s == 409 and errcode(b) == "CODE_REUSED", f"got {s} {errcode(b)}")

# ---------------------------------------------------------------- 9) identity/me
s, b = call(chidi, "GET", "/api/v1/identity/me")
check("/identity/me -> 200 VERIFIED", s == 200 and b["identity"]["status"] == "VERIFIED")
check("consent record exists", len(b.get("consents", [])) >= 1 and b["consents"][0]["requester"] == "TrustScore")
ev_types = [e["eventType"] for e in b.get("lastSession", {}).get("events", [])]
check("full timeline recorded", "CONSENT_GRANTED" in ev_types and "CODE_EXCHANGED" in ev_types
      and "TOKEN_VALIDATED" in ev_types and "IDENTITY_VERIFIED" in ev_types, str(ev_types))

# ---------------------------------------------------------------- 10) deny path
s, b = call(ada, "POST", "/api/v1/identity/sessions", {})
SID3 = b["session"]["id"]
s, b = call(ada, "POST", f"/api/v1/identity/sessions/{SID3}/consent", {"decision": "DENY"})
check("deny acknowledged", s == 200 and b.get("decision") == "DENY")
s, b = call(ada, "GET", f"/api/v1/identity/sessions/{SID3}")
check("session CONSENT_DENIED", b["session"]["status"] == "CONSENT_DENIED")
s, b = call(ada, "GET", "/api/v1/identity/me")
# Stage 3 note: ada's baseline can now be NONE/REVOKED/VERIFIED depending on
# lifecycle tests. The deny invariant: a denied session must NEVER establish
# (or leave) a VERIFIED identity for this flow — no identity change on DENY.
check("deny never establishes identity", b["identity"]["status"] != "VERIFIED",
      f"status={b['identity']['status']}")

# ---------------------------------------------------------------- 11) consent on denied
s, b = call(ada, "POST", f"/api/v1/identity/sessions/{SID3}/consent", {"decision": "GRANT"})
check("consent on denied session -> 409", s == 409 and errcode(b) == "NOT_PENDING", f"got {s} {errcode(b)}")

# ---------------------------------------------------------------- 12) forged code
s, b = call(ada, "POST", "/api/v1/identity/sessions", {})
SID4 = b["session"]["id"]
call(ada, "POST", f"/api/v1/identity/sessions/{SID4}/consent", {"decision": "GRANT"})
s, b = call(ada, "POST", f"/api/v1/identity/sessions/{SID4}/callback",
            {"code": "nac_totally_forged_code_by_attacker", "state": "placeholder_state_value"})
check("forged code -> EXCHANGE_FAILED or BAD_STATE", errcode(b) in ("EXCHANGE_FAILED", "BAD_STATE"), f"got {s} {errcode(b)}")

# forged code with CORRECT state (fetch real state via consent grant flow)
s, b = call(ada, "POST", f"/api/v1/identity/sessions/{SID4}/consent", {"decision": "GRANT"})
# session already granted — NOT_PENDING. Create new session and grant, then forge code with the real state.
s, b = call(ada, "POST", "/api/v1/identity/sessions", {})
SID5 = b["session"]["id"]
s, b = call(ada, "POST", f"/api/v1/identity/sessions/{SID5}/consent", {"decision": "GRANT"})
STATE5 = b.get("state", "")
s, b = call(ada, "POST", f"/api/v1/identity/sessions/{SID5}/callback",
            {"code": "nac_forged_code_with_valid_state_xx", "state": STATE5})
check("forged code + valid state -> EXCHANGE_FAILED", s == 400 and errcode(b) == "EXCHANGE_FAILED", f"got {s} {errcode(b)}")

# ---------------------------------------------------------------- 13) validation
s, b = call(chidi, "POST", f"/api/v1/identity/sessions/{SID2}/callback", {"code": "short", "state": "short"})
check("short code/state -> 422 VALIDATION_ERROR", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(chidi, "POST", "/api/v1/identity/sessions", {"flow": "INVALID"})
check("invalid flow rejected (422) or rate-limited (429)", s in (422, 429), f"got {s} {errcode(b)}")

print(f"\n===== RESULT: {PASS} passed, {FAIL} failed =====")
exit(1 if FAIL else 0)
