#!/usr/bin/env python3
"""TrustScore Stage 16 — Surface Elevation + NINAuth Auth + Paginated Insights.

Contract test matrix. Covers:
  1. Version catalog (v1.15.0 / Stage 16).
  2. NINAuth passwordless authentication ("Continue with NINAuth"):
     start (PKCE S256, consent screen), approve (one-time code), callback
     (REGISTERED / LOGIN / LINKED outcomes), replay protection, deny path,
     scope validation, and the audit trail.
  3. Cursor-paginated score history: pagination block, limit clamping and
     validation, before-cursor paging, unknown-cursor rejection, and the
     full-window summary/spark stability across pages.
  4. Landing SSR wiring for the new surfaces (toggle, tab intro markers).

Run: python3 tests/stage16_matrix.py   (dev server on :3000)
"""

import json
import re
import sys
import urllib.request
import urllib.error
import uuid

BASE = "http://127.0.0.1:3000"
PASS = 0
FAIL = 0


def call(method, path, body=None, cookie=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if cookie:
        req.add_header("Cookie", cookie)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=30) as r:
            return r.status, r.read().decode(), r.headers.get("Set-Cookie")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(), e.headers.get("Set-Cookie")


def check(name, ok, detail=""):
    global PASS, FAIL
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {name}" + (f" — {detail}" if (detail and not ok) else ""))
    if ok:
        PASS += 1
    else:
        FAIL += 1


def jbody(raw):
    try:
        return json.loads(raw)
    except Exception:
        return {}


print("== 1) version catalog ==")
s, raw, _ = call("GET", "/api/health")
b = jbody(raw)
check("health reports Stage 16 / v1.15.0",
      s == 200 and b.get("version") == "1.15.0" and "16" in b.get("stage", ""),
      str(b.get("stage")))
s, raw, _ = call("GET", "/api")
b = jbody(raw)
check("api index: v1.15.0 + Stage 16", b.get("version") == "1.15.0" and "16" in b.get("stage", ""))
check("api index documents the NINAuth auth endpoints",
      "/api/v1/auth/ninauth/start" in raw and "/api/v1/auth/ninauth/:id/callback" in raw)
check("api index documents the paginated score-history contract",
      "cursor-paginated" in raw and "before=" in raw)

# ---------------------------------------------------------------------------
print("== 2) NINAuth passwordless authentication ==")

EMAIL = f"s16-{uuid.uuid4().hex[:10]}@example.com"

# 2.1 start
s, raw, _ = call("POST", "/api/v1/auth/ninauth/start")
b = jbody(raw)
sess = b.get("session", {})
check("start returns AWAITING_APPROVAL + MOCK mode",
      s == 200 and sess.get("status") == "AWAITING_APPROVAL" and sess.get("providerMode") == "MOCK",
      raw[:160])
check("authorize URL carries S256 PKCE + state",
      "code_challenge_method=S256" in sess.get("authorizationUrl", "")
      and "state=" in sess.get("authorizationUrl", ""))
check("PKCE verifier never leaves the server",
      "codeVerifier" not in raw and "verifier" not in raw.lower())
consent = b.get("consentScreen", {})
check("consent screen: requester, purpose, policy, scoped fields",
      consent.get("requester") == "TrustScore"
      and consent.get("purpose") == "NINAUTH_AUTHENTICATION"
      and any(f.get("scope") == "identity.basic" and f.get("core") for f in consent.get("fields", []))
      and any(f.get("scope") == "profile.name" and not f.get("core") for f in consent.get("fields", [])))
SID = sess.get("id", "")

# 2.2 approve — invalid scopes rejected
s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/approve",
                 {"decision": "GRANT", "email": EMAIL,
                  "grantedScopes": ["identity.basic", "profile.demographics"]})
check("approve rejects non-allowed scopes (purpose limitation)",
      s == 422 and jbody(raw).get("error", {}).get("code") == "SCOPE_INVALID")

s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/approve",
                 {"decision": "GRANT", "email": EMAIL,
                  "grantedScopes": ["identity.basic", "identity.nin_status", "profile.name"]})
b = jbody(raw)
check("approve issues one-time code + state", s == 200 and len(b.get("code", "")) >= 16 and b.get("state"))
CODE, STATE = b.get("code", ""), b.get("state", "")

# 2.3 callback — wrong state fails closed
s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/callback",
                 {"code": CODE, "state": "forged-state-123"})
check("callback with forged state is rejected",
      s == 400 and jbody(raw).get("error", {}).get("code") == "BAD_STATE")

# session is now FAILED → the real code can no longer be used
s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/callback",
                 {"code": CODE, "state": STATE})
check("callback after state failure is terminal (session invalidated)",
      s in (400, 409, 404))

# 2.4 full happy path → REGISTERED
s, raw, _ = call("POST", "/api/v1/auth/ninauth/start")
SID = jbody(raw).get("session", {}).get("id", "")
s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/approve",
                 {"decision": "GRANT", "email": EMAIL,
                  "grantedScopes": ["identity.basic", "identity.nin_status", "profile.name"]})
b = jbody(raw)
CODE, STATE = b.get("code", ""), b.get("state", "")
s, raw, set_cookie = call("POST", f"/api/v1/auth/ninauth/{SID}/callback",
                          {"code": CODE, "state": STATE})
b = jbody(raw)
check("callback REGISTERED creates a passwordless account",
      s == 200 and b.get("outcome") == "REGISTERED" and b.get("user", {}).get("email") == EMAIL,
      raw[:200])
check("callback sets the session cookie",
      bool(set_cookie) and "ts_session" in (set_cookie or ""))
check("no ID token or code verifier leaks in the response",
      "id_token" not in raw and "idToken" not in raw and "verifier" not in raw.lower())
COOKIE = set_cookie.split(";")[0] if set_cookie else ""
USER_ID = b.get("user", {}).get("id", "")

# 2.5 me works with the NINAuth-issued session
s, raw, _ = call("GET", "/api/v1/auth/me", cookie=COOKIE)
check("/auth/me resolves the NINAuth session", s == 200 and jbody(raw).get("user", {}).get("id") == USER_ID)

# 2.6 code replay
s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/callback",
                 {"code": CODE, "state": STATE})
check("code replay rejected", s == 409 and jbody(raw).get("error", {}).get("code") == "CODE_REUSED")

# 2.7 returning identity → LOGIN
s, raw, _ = call("POST", "/api/v1/auth/ninauth/start")
SID = jbody(raw).get("session", {}).get("id", "")
s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/approve",
                 {"decision": "GRANT", "email": EMAIL})
b = jbody(raw)
s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/callback",
                 {"code": b.get("code"), "state": b.get("state")})
check("same identity signs in again → LOGIN",
      s == 200 and jbody(raw).get("outcome") == "LOGIN")

# 2.8 link to an existing email account → LINKED
LINK_EMAIL = f"s16-link-{uuid.uuid4().hex[:8]}@example.com"
s, raw, _ = call("POST", "/api/v1/auth/register",
                 {"email": LINK_EMAIL, "password": "SuperSecret1",
                  "displayName": "Stage Sixteen", "handle": f"s16link{uuid.uuid4().hex[:6]}",
                  "acceptTerms": True})
check("seed: register a password account to link", s == 201, raw[:160])
s, raw, _ = call("POST", "/api/v1/auth/ninauth/start")
SID = jbody(raw).get("session", {}).get("id", "")
s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/approve",
                 {"decision": "GRANT", "email": LINK_EMAIL})
b = jbody(raw)
s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/callback",
                 {"code": b.get("code"), "state": b.get("state")})
check("existing email binds to NINAuth → LINKED",
      s == 200 and jbody(raw).get("outcome") == "LINKED")

# 2.9 deny path
s, raw, _ = call("POST", "/api/v1/auth/ninauth/start")
SID = jbody(raw).get("session", {}).get("id", "")
s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/approve",
                 {"decision": "DENY", "email": "deny@example.com"})
check("deny is recorded", s == 409 and jbody(raw).get("error", {}).get("code") == "DENIED")
s, raw, _ = call("POST", f"/api/v1/auth/ninauth/{SID}/callback",
                 {"code": "x" * 32, "state": "y" * 16})
check("callback on a denied session cannot sign anyone in", s in (400, 409))

# 2.10 audit trail (own events visible in activity)
s, raw, _ = call("GET", "/api/v1/auth/activity", cookie=COOKIE)
acts = [e.get("action") for e in jbody(raw).get("events", [])]
check("audit trail carries the NINAuth auth actions",
      "AUTH_NINAUTH_REGISTERED" in acts or "AUTH_NINAUTH_LOGIN" in acts,
      str(acts[:6]))

# ---------------------------------------------------------------------------
print("== 3) cursor-paginated score history ==")

s, raw, _ = call("GET", "/api/v1/passport/score-history")
check("unauthenticated history read is 401", s == 401)

s, raw, _ = call("GET", "/api/v1/passport/score-history?limit=99", cookie=COOKIE)
check("limit above the page max is rejected", s == 422 and jbody(raw).get("error", {}).get("code") == "BAD_LIMIT")
s, raw, _ = call("GET", "/api/v1/passport/score-history?limit=2", cookie=COOKIE)
check("limit below the page min is rejected", s == 422)
s, raw, _ = call("GET", "/api/v1/passport/score-history?before=not-a-cursor!!", cookie=COOKIE)
check("malformed cursor is rejected", s == 422 and jbody(raw).get("error", {}).get("code") == "BAD_CURSOR")

s, raw, _ = call("GET", "/api/v1/passport/score-history?limit=5", cookie=COOKIE)
b = jbody(raw)
p = b.get("pagination", {})
check("pagination block present with the retention horizon",
      p.get("pageSize") == 5 and p.get("retainedMax") == 50 and isinstance(p.get("hasMore"), bool))
check("history is a bounded page, summary spans the full window",
      len(b.get("history", [])) <= 5
      and b.get("summary", {}).get("snapshotCount", 0) >= len(b.get("history", []))
      and len(b.get("spark", [])) == b.get("summary", {}).get("snapshotCount", -1))
NEXT = p.get("nextBefore")
if p.get("hasMore") and NEXT:
    s2, raw2, _ = call("GET", f"/api/v1/passport/score-history?before={NEXT}", cookie=COOKIE)
    b2 = jbody(raw2)
    older_ids = [h["id"] for h in b2.get("history", [])]
    check("before-cursor pages strictly older snapshots",
          s2 == 200 and NEXT not in older_ids
          and all(h["id"] != b["history"][-1]["id"] for h in b2.get("history", [])))
    check("summary + spark stay stable across pages",
          b2.get("summary") == b.get("summary") and b2.get("spark") == b.get("spark"))
else:
    check("before-cursor pages strictly older snapshots",
          not p.get("hasMore"), "single page — hasMore false is consistent")

s, raw, _ = call("GET", "/api/v1/passport/score-history?before=c" * 1 + "0" * 30, cookie=COOKIE)
check("unknown (well-formed) cursor is rejected without probing",
      s == 422 and jbody(raw).get("error", {}).get("code") == "BAD_CURSOR")

# export still carries the FULL window
s, raw, _ = call("GET", "/api/v1/passport/score-history/export?format=json", cookie=COOKIE)
try:
    ex = json.loads(raw)
    lines = len(ex.get("history", []))
except Exception:
    ex, lines = {}, -1
check("JSON export carries the full retained window",
      s == 200 and lines >= len(b.get("history", [])) and "50 most recent" in ex.get("note", ""))

# ---------------------------------------------------------------------------
print("== 4) landing SSR wiring for the Stage 16 surfaces ==")
s, html, _ = call("GET", "/")
check("landing renders 200", s == 200)
check("policy explainer toggle is server-rendered (plain default)",
      "Plain language" in html and "Technical" in html and 'data-testid="policy-view-toggle"' in html)
check("technical sheet is NOT rendered in the default SSR (client-only view)",
      'data-testid="policy-technical-sheet"' not in html)
check("governance strip badges render in SSR",
      "DPIA" in html and "automated decisions" in html)
check("policy skeleton renders in SSR (live values load client-side)",
      'aria-label="Loading the live scoring policy"' in html or "Loading the live policy" in html)
check("roadmap carries the Stage 16 'Surface elevation' entry",
      "Surface elevation" in html)

print()
print(f"RESULT: {PASS} passed, {FAIL} failed, {PASS + FAIL} total")
sys.exit(1 if FAIL else 0)
