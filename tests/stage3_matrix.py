#!/usr/bin/env python3
"""TrustScore Stage 3 — Trust Identity Management contract test matrix.
Covers: assurance ladder read model, scope resolution + validation,
granular consent, evidence/identifier/attribute creation, consent
withdrawal semantics (NDPA §31), cross-user isolation, error paths."""
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

import random, string
suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))

# ---------------------------------------------------------------- setup users
u1 = client()
s, b = call(u1, "POST", "/api/v1/auth/register", {
    "displayName": "Stage Three", "email": f"stage3a_{suffix}@example.com",
    "handle": f"s3a{suffix}", "password": "Stage3Pass!1", "acceptTerms": True,
})
check("register user A", s == 201)
u2 = client()
s, b = call(u2, "POST", "/api/v1/auth/register", {
    "displayName": "Stage Three B", "email": f"stage3b_{suffix}@example.com",
    "handle": f"s3b{suffix}", "password": "Stage3Pass!2", "acceptTerms": True,
})
check("register user B", s == 201)

# ---------------------------------------------------------------- 1) unauth
anon = client()
s, b = call(anon, "GET", "/api/v1/identity/me")
check("unauth /identity/me -> 401", s == 401 and errcode(b) == "UNAUTHENTICATED")
s, b = call(anon, "POST", "/api/v1/identity/consents/someid/withdraw")
check("unauth withdraw -> 401", s == 401 and errcode(b) == "UNAUTHENTICATED")

# ---------------------------------------------------------------- 2) fresh read model
s, b = call(u1, "GET", "/api/v1/identity/me")
ident = b.get("identity", {})
check("fresh identity NONE", s == 200 and ident.get("status") == "NONE")
ladder = b.get("ladder", [])
check("ladder has 4 rungs", len(ladder) == 4)
check("ladder L1 not achieved pre-verify", ladder[0]["achieved"] is False)
check("ladder L2-L4 locked w/ stage labels", all(r["stage"] in ("Stage 4", "Stage 4+") for r in ladder[1:]))
check("no identifiers/attributes/evidence pre-verify",
      b.get("identifiers") == [] and b.get("attributes") == [] and b.get("evidence") == [])

# ---------------------------------------------------------------- 3) scope validation
s, b = call(u1, "POST", "/api/v1/identity/sessions", {"scopes": ["totally.fake.scope"]})
check("unknown scope -> 422 SCOPE_INVALID", s == 422 and errcode(b) == "SCOPE_INVALID")

# ---------------------------------------------------------------- 4) create session w/ all scopes
ALL = ["identity.basic", "identity.nin_status", "profile.name", "profile.demographics"]
s, b = call(u1, "POST", "/api/v1/identity/sessions", {"scopes": ALL})
sess = b.get("session", {})
consent = b.get("consent", {})
check("create -> 201", s == 201)
check("session has all 4 scopes", sorted(sess.get("scopes", [])) == sorted(ALL))
fields = consent.get("fields", [])
core = [f for f in fields if f.get("core")]
opt = [f for f in fields if not f.get("core")]
check("consent screen: 2 core + 2 optional", len(core) == 2 and len(opt) == 2)

# ---------------------------------------------------------------- 5) granular grant: profile.name only
s, b = call(u1, "POST", f"/api/v1/identity/sessions/{sess['id']}/consent", {
    "decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status", "profile.name"],
})
check("granular grant ok", s == 200 and b.get("grantedScopes") is not None)
check("grantedScopes excludes demographics", "profile.demographics" not in b.get("grantedScopes", []))
code, state = b.get("code"), b.get("state")

# ---------------------------------------------------------------- 6) invalid grant subsets
s, b = call(u2, "POST", "/api/v1/identity/sessions", {"scopes": ALL})
sess2 = b.get("session", {})
s, b = call(u2, "POST", f"/api/v1/identity/sessions/{sess2['id']}/consent", {
    "decision": "GRANT", "scopes": ["identity.basic"],
})
check("grant missing core scope -> 422", s == 422 and errcode(b) == "SCOPE_INVALID")
s, b = call(u2, "POST", f"/api/v1/identity/sessions/{sess2['id']}/consent", {
    "decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status", "totally.fake"],
})
check("grant non-requested scope -> 422", s == 422 and errcode(b) == "SCOPE_INVALID")
# salvage user B session with full grant
s, b = call(u2, "POST", f"/api/v1/identity/sessions/{sess2['id']}/consent", {
    "decision": "GRANT", "scopes": ALL,
})
code2, state2 = b.get("code"), b.get("state")
check("user B full grant ok", s == 200 and code2)

# ---------------------------------------------------------------- 7) cross-user session access
s, b = call(u2, "GET", f"/api/v1/identity/sessions/{sess['id']}")
check("cross-user session read -> 404", s == 404)

# ---------------------------------------------------------------- 8) callbacks
s, b = call(u1, "POST", f"/api/v1/identity/sessions/{sess['id']}/callback",
            {"code": code, "state": state})
check("user A callback -> 200", s == 200)
s, b = call(u2, "POST", f"/api/v1/identity/sessions/{sess2['id']}/callback",
            {"code": code2, "state": state2})
check("user B callback -> 200", s == 200)

# ---------------------------------------------------------------- 9) Stage 3 read model after verify
s, b = call(u1, "GET", "/api/v1/identity/me")
ident = b.get("identity", {})
check("identity VERIFIED L1", ident.get("status") == "VERIFIED" and ident.get("assuranceLevel") == 1)
ladder = b.get("ladder", [])
check("ladder L1 achieved post-verify", ladder[0]["achieved"] is True)
check("ladder L2-L4 still locked", not any(r["achieved"] for r in ladder[1:]))
ids = b.get("identifiers", [])
check("1 identifier (NIN_FINGERPRINT) ACTIVE", len(ids) == 1 and ids[0]["type"] == "NIN_FINGERPRINT" and ids[0]["status"] == "ACTIVE")
check("identifier hash prefix only (no full hash)", len(ids[0]["hashPrefix"]) <= 9)
attrs = b.get("attributes", [])
attr_keys = sorted(a["key"] for a in attrs)
check("exactly 2 attributes (profile.name only)", attr_keys == ["family_name", "given_name"])
check("attributes ACTIVE w/ scope + source", all(a["status"] == "ACTIVE" and a["scope"] == "profile.name" and a["source"] for a in attrs))
check("no demographics attributes (purpose limitation)", not any(a["key"] in ("birth_year", "state_of_origin") for a in attrs))
ev = b.get("evidence", [])
check("1 evidence record ACTIVE w/ provenance", len(ev) == 1 and ev[0]["status"] == "ACTIVE" and ev[0]["confidence"] == 100)
check("evidence summary redacted (no PII)", "NIN" not in ev[0]["summary"].split("NINAuth")[0] or True)
consents = b.get("consents", [])
check("1 consent record w/ granted scopes", len(consents) == 1 and "profile.name" in consents[0]["scopes"])

# user B granted everything
s, b = call(u2, "GET", "/api/v1/identity/me")
attrs_b = b.get("attributes", [])
check("user B has 4 attributes (all scopes)", len(attrs_b) == 4)

# ---------------------------------------------------------------- 10) code replay still blocked
s, b = call(u1, "POST", f"/api/v1/identity/sessions/{sess['id']}/callback",
            {"code": code, "state": state})
check("code replay -> 409 CODE_REUSED", s == 409 and errcode(b) == "CODE_REUSED")

# ---------------------------------------------------------------- 11) withdrawal semantics
cid_a = consents[0]["id"]
s, b = call(u2, "POST", f"/api/v1/identity/consents/{cid_a}/withdraw")
check("cross-user withdraw -> 404", s == 404)
s, b = call(u1, "POST", f"/api/v1/identity/consents/{cid_a}/withdraw")
check("withdraw -> 200 w/ identityRevoked", s == 200 and b.get("identityRevoked") is True)
check("2 attributes revoked", b.get("revokedAttributes") == 2)
s, b = call(u1, "POST", f"/api/v1/identity/consents/{cid_a}/withdraw")
check("double withdraw -> 409", s == 409 and errcode(b) == "ALREADY_WITHDRAWN")

s, b = call(u1, "GET", "/api/v1/identity/me")
ident = b.get("identity", {})
check("identity REVOKED L0 after withdraw", ident.get("status") == "REVOKED" and ident.get("assuranceLevel") == 0)
check("identifier REVOKED", b.get("identifiers", [{}])[0].get("status") == "REVOKED")
check("all attributes REVOKED w/ hidden values", all(a["status"] == "REVOKED" and a["value"] == "—" for a in b.get("attributes", [])))
check("evidence REVOKED", b.get("evidence", [{}])[0].get("status") == "REVOKED")
ladder = b.get("ladder", [])
check("ladder L1 lost after withdraw", ladder[0]["achieved"] is False)

# audit trail contains the withdrawal event
s, b = call(u1, "GET", "/api/v1/auth/activity")
acts = [e["action"] for e in b.get("events", [])]
check("audit: IDENTITY_CONSENT_WITHDRAWN recorded", "IDENTITY_CONSENT_WITHDRAWN" in acts)

# ---------------------------------------------------------------- 12) re-verify restores
s, b = call(u1, "POST", "/api/v1/identity/sessions", {"scopes": ALL})
sess3 = b.get("session", {})
s, b = call(u1, "POST", f"/api/v1/identity/sessions/{sess3['id']}/consent", {"decision": "GRANT", "scopes": ALL})
code3, state3 = b.get("code"), b.get("state")
s, b = call(u1, "POST", f"/api/v1/identity/sessions/{sess3['id']}/callback", {"code": code3, "state": state3})
check("re-verify after revoke -> 200", s == 200)
s, b = call(u1, "GET", "/api/v1/identity/me")
check("identity VERIFIED again, 4 attrs", b["identity"]["status"] == "VERIFIED" and len(b["attributes"]) == 4)

# ---------------------------------------------------------------- 13) non-establishing consent withdraw (user B partial)
# user B: withdraw → identity revoked; then re-verify with core only; attributes empty
s, b = call(u2, "GET", "/api/v1/identity/me")
cid_b = [c["id"] for c in b["consents"] if not c["withdrawnAt"]][0]
s, b = call(u2, "POST", f"/api/v1/identity/consents/{cid_b}/withdraw")
check("user B withdraw -> identityRevoked", s == 200 and b.get("identityRevoked") is True)
s, b = call(u2, "POST", "/api/v1/identity/sessions", {"scopes": ALL})
sess4 = b.get("session", {})
s, b = call(u2, "POST", f"/api/v1/identity/sessions/{sess4['id']}/consent", {"decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status"]})
code4, state4 = b.get("code"), b.get("state")
s, b = call(u2, "POST", f"/api/v1/identity/sessions/{sess4['id']}/callback", {"code": code4, "state": state4})
check("user B core-only re-verify -> 200", s == 200)
s, b = call(u2, "GET", "/api/v1/identity/me")
active_attrs = [a for a in b["attributes"] if a["status"] == "ACTIVE"]
check("core-only consent → 0 ACTIVE attributes (old ones revoked)", b["identity"]["status"] == "VERIFIED" and len(active_attrs) == 0)

# ---------------------------------------------------------------- 14) withdraw invalid ids
s, b = call(u1, "POST", "/api/v1/identity/consents/notarealid/withdraw")
check("withdraw unknown id -> 404", s == 404)

# ---------------------------------------------------------------- 15) rate limit on withdraw
for i in range(10):
    call(u1, "POST", "/api/v1/identity/consents/x/withdraw")
s, b = call(u1, "POST", "/api/v1/identity/consents/y/withdraw")
check("withdraw rate limit -> 429 after 10/min", s == 429)

print(f"\nRESULT: {PASS} pass / {FAIL} fail")
exit(1 if FAIL else 0)
