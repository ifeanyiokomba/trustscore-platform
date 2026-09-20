#!/usr/bin/env python3
"""TrustScore AUTH batch — auth test matrix (task auth-7).

28 items over the full multi-identifier auth surface (contract in worklog
"Task ID: auth-batch-B"): username/email/phone/Google signup + login,
duplicate prevention, enumeration resistance, OTP expiry/brute-force,
Google OAuth failure paths (state, code expiry, deny), session expiry +
revocation, recovery, cross-account link stealing, logout-all.

Item 28 (mobile/desktop render) is a browser check — performed separately
with agent-browser (NOT in this python file).

Test accounts/handles/phones are unique per run (prefix authmx_). Rate-limit
pressure is handled by pacing the per-IP in-memory windows (login 8/min,
phone-otp 5/min, phone-verify 10/min, register 10/min, reset-request 5/min,
google-* 10/min) instead of relying on 429s. ada is only used for READ-ONLY
checks; her password is restored (idempotently) in the final cleanup if any
run ever changed it.

The matrix shells out to bun run tests/auth_matrix_db_ops.ts for the
simulated clock-skew/verification/cleanup DB fixtures — keep both files
together. Run: python3 tests/auth_matrix.py   (dev server on :3000)
"""

import http.cookiejar
import json
import os
import re
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:3000"
# Root-relative (CI-portable): the repo root is one level above tests/
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP_SCRIPT = "tests/auth_matrix_db_ops.ts"

PASS = 0
FAIL = 0
SUF = secrets.token_hex(4)  # unique suffix for this run

# ---- unique fixtures for this run ------------------------------------------
U = f"authmx_user_{SUF}"          # item 1 account (username-only, password)
M = f"authmx_mail_{SUF}"          # item 2 account (email + password)
M_EMAIL = f"authmx.mail.{SUF}@example.com"
X = f"authmx_link_{SUF}"          # item 9 account (unverified-email + google LINK_REQUIRED)
X_EMAIL = f"authmx.link.{SUF}@example.com"
X_PW = "LinkSecret123"
Y = f"authmx_auto_{SUF}"          # item 9 account (verified-email auto-LINK)
Y_EMAIL = f"authmx.auto.{SUF}@example.com"
R = f"authmx_rec_{SUF}"           # item 22 account (password recovery)
R_EMAIL = f"authmx.rec.{SUF}@example.com"
R_OLD_PW = "OldSecret123"
R_NEW_PW = "NewSecret456"
G4_EMAIL = f"authmx.g4.{SUF}@example.com"  # item 4/8 google email

def phone_n():
    return "+234" + "8" + "".join(secrets.choice("0123456789") for _ in range(9))

PH1 = phone_n()  # items 3/7/11 (register + OTP login + duplicate prevention)
PH2 = phone_n()  # item 14 (expired OTP)
PH3 = phone_n()  # item 15 (invalid OTP)
PH4 = phone_n()  # item 16 (OTP brute force)

# ---------------------------------------------------------------------------
# HTTP client with cookie jar + per-scope rate pacing (fixed windows, same
# semantics as the backend in-memory limiter — see src/lib/platform/http.ts).
# ---------------------------------------------------------------------------

SCOPE_LIMITS = {
    "/api/v1/auth/login": ("login", 8),
    "/api/v1/auth/register": ("register", 10),
    "/api/v1/auth/phone/start": ("phone-otp", 5),
    "/api/v1/auth/phone/verify": ("phone-verify", 10),
    "/api/v1/auth/phone/register": ("phone-register", 5),
    "/api/v1/auth/google/start": ("google-login", 10),
    "/api/v1/auth/google/link": ("google-link", 10),
    "/api/v1/auth/recover/password/request": ("reset-request", 5),
    "/api/v1/auth/recover/password/confirm": ("reset-confirm", 5),
    "/api/v1/auth/logout-all": ("logout-all", 5),
}

_windows = {}  # scope -> [window_start_ts, used]


def scope_of(path):
    if path in SCOPE_LIMITS:
        return SCOPE_LIMITS[path]
    m = re.match(r"^/api/v1/auth/google/[^/]+/(grant|callback)$", path)
    if m:
        return ("google-grant" if m.group(1) == "grant" else "google-callback", 10)
    return None


def pace(path):
    sc = scope_of(path)
    if not sc:
        return
    name, limit = sc
    now = time.time()
    win = _windows.get(name)
    if not win or now - win[0] >= 60:
        win = [now, 0]
        _windows[name] = win
    if win[1] >= limit:
        wait = win[0] + 61 - now
        if wait > 0:
            print(f"  ... pacing {name} rate window ({limit}/min): sleeping {wait:.0f}s")
            time.sleep(wait)
        _windows[name] = [time.time(), 0]
    _windows[name][1] += 1


def reset_window(path):
    sc = scope_of(path)
    if sc:
        _windows[sc[0]] = [time.time(), 0]


class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.token = None  # latest raw ts_session token seen in Set-Cookie

    def _grab_token(self, set_cookies):
        for sc in set_cookies or []:
            if "ts_session=" in sc:
                self.token = sc.split("ts_session=", 1)[1].split(";", 1)[0]

    def call(self, method, path, body=None):
        pace(path)
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method)
        if data:
            req.add_header("Content-Type", "application/json")
        for attempt in (0, 1, 2):
            try:
                with self.op.open(req, timeout=45) as res:
                    scs = res.headers.get_all("Set-Cookie") or []
                    self._grab_token(scs)
                    return res.status, json.loads(res.read().decode() or "{}"), scs
            except urllib.error.HTTPError as e:
                raw = e.read().decode()
                if e.code == 429 and attempt < 2:
                    print(f"  ... 429 backoff 66s ({path})")
                    time.sleep(66)
                    reset_window(path)
                    continue
                scs = e.headers.get_all("Set-Cookie") or []
                self._grab_token(scs)
                try:
                    b = json.loads(raw or "{}")
                except Exception:
                    b = {}
                return e.code, b, scs
            except Exception as e:
                # Transient dev-server hiccup (lazy compile, OOM restart):
                # brief backoff + retry, then fail the check gracefully.
                if attempt < 2:
                    print(f"  ... connection error on {path} ({type(e).__name__}), retrying")
                    time.sleep(4)
                    continue
                print(f"  ... connection DEAD on {path}: {e}")
                return 0, {"error": {"code": "CONNECTION_FAILED", "message": str(e)}}, []
        return 0, {}, []


def check(name, cond, extra=""):
    global PASS, FAIL
    ok = bool(cond)
    mark = "PASS" if ok else "FAIL"
    if ok:
        PASS += 1
    else:
        FAIL += 1
    print(f"  [{mark}] {name}" + (f" — {extra}" if (extra and not ok) else ""))
    return ok


def errcode(b):
    return (b.get("error") or {}).get("code", "?")


def errmsg(b):
    return (b.get("error") or {}).get("message", "")


def tmp(*args):
    """Run the bun DB-ops helper; returns parsed JSON or None."""
    try:
        r = subprocess.run(
            ["bun", "run", TMP_SCRIPT, *args],
            capture_output=True, text=True, cwd=ROOT, timeout=90,
        )
        out = (r.stdout or "").strip()
        if r.returncode != 0 or not out:
            print(f"  [tmp:{args[0]}] stderr: {(r.stderr or '').strip()[:200]}")
            return None
        return json.loads(out.splitlines()[-1])
    except Exception as e:
        print(f"  [tmp:{args[0]}] error: {e}")
        return None


def google_state_of(start_body):
    """The OAuth state only reaches the client inside authorizationUrl."""
    url = start_body.get("session", {}).get("authorizationUrl", "")
    q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    return (q.get("state") or [None])[0]


print(f"auth-7 matrix run — suffix {SUF}, phones {PH1}/{PH2}/{PH3}/{PH4}")

# ---------------------------------------------------------------------------
# 1) Signup with username (register WITHOUT email) → 201 + username login.
# ---------------------------------------------------------------------------
print("\n== 1) signup with username (no email) ==")
cl_u = Client()
s, b, _ = cl_u.call("POST", "/api/v1/auth/register", {
    "displayName": "Auth Matrix One", "handle": U,
    "password": "SecretPass123", "acceptTerms": True,
})
check("[1] username-only register → 201 {user}", s == 201 and "user" in b, f"got {s} {b}")
check("[1] no email on the account (email nullable)", b.get("user", {}).get("email") is None)
U_ID = b.get("user", {}).get("id")
s, b, _ = cl_u.call("POST", "/api/v1/auth/login", {"identifier": U, "password": "SecretPass123"})
check("[1] login with username + password → 200", s == 200 and b.get("user", {}).get("id") == U_ID, f"got {s}")
check("[1] identifierType hint is USERNAME", b.get("identifierType") == "USERNAME", str(b.get("identifierType")))
B_TOKEN_SESSION = cl_u.token  # B's authenticated platform session (used in items 24/25)

# ---------------------------------------------------------------------------
# 2) Signup with email → 201 + email login.
# ---------------------------------------------------------------------------
print("\n== 2) signup with email ==")
cl_m = Client()
s, b, _ = cl_m.call("POST", "/api/v1/auth/register", {
    "displayName": "Auth Matrix Two", "handle": M, "email": M_EMAIL,
    "password": "SecretPass123", "acceptTerms": True,
})
check("[2] email register → 201 {user}", s == 201 and b.get("user", {}).get("email") == M_EMAIL, f"got {s}")
M_ID = b.get("user", {}).get("id")
s, b, _ = cl_m.call("POST", "/api/v1/auth/login", {"identifier": M_EMAIL, "password": "SecretPass123"})
check("[2] login with email → 200 same user", s == 200 and b.get("user", {}).get("id") == M_ID, f"got {s}")
check("[2] identifierType hint is EMAIL", b.get("identifierType") == "EMAIL", str(b.get("identifierType")))

# ---------------------------------------------------------------------------
# 3) Signup with phone (start REGISTER → verify → phone/register) → 201;
#    account has a verified PHONE identifier.
# ---------------------------------------------------------------------------
print("\n== 3) signup with phone (OTP REGISTER flow) ==")
cl_p = Client()
s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/start", {"phone": PH1, "purpose": "REGISTER"})
OTP1 = b.get("mockOtp")
PS1 = (b.get("session") or {}).get("id")
check("[3] phone/start REGISTER → 200 session + mockOtp", s == 200 and PS1 and OTP1 and re.fullmatch(r"\d{6}", str(OTP1)) is not None, f"got {s}")
check("[3] session shape (phoneHint/purpose/mocked provider)", (b.get("session") or {}).get("purpose") == "REGISTER"
      and bool((b.get("session") or {}).get("phoneHint")) and (b.get("session") or {}).get("providerMode") == "MOCK")
s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/verify", {"sessionId": PS1, "otp": OTP1})
check("[3] verify → 200 {verified:true, purpose REGISTER}", s == 200 and b.get("verified") is True and b.get("purpose") == "REGISTER", f"got {s} {b}")
s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/register", {
    "sessionId": PS1, "displayName": "Auth Matrix Three", "handle": f"authmx_phone_{SUF}",
})
check("[3] phone/register (passwordless) → 201 REGISTERED", s == 201 and b.get("outcome") == "REGISTERED", f"got {s} {b}")
P1_ID = b.get("user", {}).get("id")
s, b, _ = cl_p.call("GET", "/api/v1/auth/identifiers")
rows = {r.get("type"): r for r in b.get("identifiers", [])}
check("[3] PHONE identifier exists + verified (OTP was the proof)",
      "PHONE" in rows and rows["PHONE"].get("verified") is True, str(sorted(rows)))
# NOTE (documented, not a failing check): phone-first registration stores the
# handle on UserAccount but does NOT create a USERNAME AuthIdentifier row —
# username resolution for such accounts goes through the registry's legacy
# fallback (resolveIdentifier → UserAccount.handle) and is backfilled on the
# account's first successful password login (authenticateUser syncs it).

# ---------------------------------------------------------------------------
# 4) Signup with Google (fresh email) → callback REGISTERED; GOOGLE identifier.
# ---------------------------------------------------------------------------
print("\n== 4) signup with Google (fresh email) ==")
cl_g = Client()
s, b, _ = cl_g.call("POST", "/api/v1/auth/google/start")
GS4 = (b.get("session") or {}).get("id")
check("[4] google/start → 200 session (MOCK provider, consent screen)",
      s == 200 and GS4 and b.get("session", {}).get("provider") == "GOOGLE_MOCK"
      and b.get("session", {}).get("providerMode") == "MOCK" and bool(b.get("session", {}).get("consentScreen")), f"got {s}")
s, b, _ = cl_g.call("POST", f"/api/v1/auth/google/{GS4}/grant", {"decision": "GRANT", "email": G4_EMAIL})
G4_CODE, G4_STATE = b.get("code"), b.get("state")
check("[4] grant GRANT → 200 {code, state}", s == 200 and G4_CODE and G4_STATE, f"got {s} {b}")
s, b, _ = cl_g.call("POST", f"/api/v1/auth/google/{GS4}/callback", {"code": G4_CODE, "state": G4_STATE})
check("[4] callback → 200 REGISTERED", s == 200 and b.get("outcome") == "REGISTERED", f"got {s} {b}")
G4_ID = b.get("user", {}).get("id")
check("[4] registered account carries the google email", b.get("user", {}).get("email") == G4_EMAIL)
s, b, _ = cl_g.call("GET", "/api/v1/auth/identifiers")
rows = {r.get("type"): r for r in b.get("identifiers", [])}
check("[4] GOOGLE identifier bound + verified", "GOOGLE" in rows and rows["GOOGLE"].get("verified") is True, str(sorted(rows)))

# ---------------------------------------------------------------------------
# 5) Login with username (seeded ada) → 200.
# ---------------------------------------------------------------------------
print("\n== 5) login with username ==")
cl_ada = Client()
s, b, _ = cl_ada.call("POST", "/api/v1/auth/login", {"identifier": "ada", "password": "SuperSecret1"})
ADA_BY_USER = b.get("user", {})
check("[5] ada username login → 200", s == 200 and ADA_BY_USER.get("handle") == "ada", f"got {s}")
ADA_USER_ID = ADA_BY_USER.get("id")

# ---------------------------------------------------------------------------
# 6) Login with email (identifier + legacy {email,password} shapes) → 200.
# ---------------------------------------------------------------------------
print("\n== 6) login with email (identifier + legacy shapes) ==")
cl_ada2 = Client()
s, b, _ = cl_ada2.call("POST", "/api/v1/auth/login", {"identifier": "ada@example.com", "password": "SuperSecret1"})
ADA_BY_EMAIL = b.get("user", {})
check("[6] ada email login (identifier shape) → 200", s == 200 and ADA_BY_EMAIL.get("id") == ADA_USER_ID, f"got {s}")
cl_ada3 = Client()
s, b, _ = cl_ada3.call("POST", "/api/v1/auth/login", {"email": "ada@example.com", "password": "SuperSecret1"})
check("[6] legacy {email,password} shape still works → 200", s == 200 and b.get("user", {}).get("id") == ADA_USER_ID, f"got {s}")

# ---------------------------------------------------------------------------
# 7) Login with phone (OTP flow) → 200 user + cookie works on /auth/me.
# ---------------------------------------------------------------------------
print("\n== 7) login with phone (OTP LOGIN flow) ==")
cl_pl = Client()
s, b, _ = cl_pl.call("POST", "/api/v1/auth/login", {"identifier": PH1, "password": "Whatever123"})
check("[7] password login with phone-shaped identifier routes to OTP (400 PHONE_OTP_REQUIRED)",
      s == 400 and errcode(b) == "PHONE_OTP_REQUIRED", f"got {s} {errcode(b)}")
s, b, _ = cl_pl.call("POST", "/api/v1/auth/phone/start", {"phone": PH1, "purpose": "LOGIN"})
OTP7 = b.get("mockOtp")
PS7 = (b.get("session") or {}).get("id")
check("[7] phone/start LOGIN → 200 + mockOtp", s == 200 and PS7 and OTP7, f"got {s}")
s, b, _ = cl_pl.call("POST", "/api/v1/auth/phone/verify", {"sessionId": PS7, "otp": OTP7})
check("[7] verify → 200 {user, outcome LOGIN}", s == 200 and b.get("outcome") == "LOGIN" and b.get("user", {}).get("id") == P1_ID, f"got {s} {b}")
s, b, _ = cl_pl.call("GET", "/api/v1/auth/me")
check("[7] OTP login cookie works on /auth/me → 200 same user",
      s == 200 and b.get("user", {}).get("id") == P1_ID, f"got {s}")

# ---------------------------------------------------------------------------
# 8) Login with Google (same email as item 4) → LOGIN, same user id.
# ---------------------------------------------------------------------------
print("\n== 8) login with Google (repeat email from item 4) ==")
cl_g8 = Client()
s, b, _ = cl_g8.call("POST", "/api/v1/auth/google/start")
GS8 = (b.get("session") or {}).get("id")
s, b, _ = cl_g8.call("POST", f"/api/v1/auth/google/{GS8}/grant", {"decision": "GRANT", "email": G4_EMAIL})
CODE8, STATE8 = b.get("code"), b.get("state")
s, b, _ = cl_g8.call("POST", f"/api/v1/auth/google/{GS8}/callback", {"code": CODE8, "state": STATE8})
check("[8] repeat google sign-in → outcome LOGIN, same user id as item 4",
      s == 200 and b.get("outcome") == "LOGIN" and b.get("user", {}).get("id") == G4_ID, f"got {s} {b}")

# ---------------------------------------------------------------------------
# 9) Existing account + Google linking — BOTH sub-cases.
#    A) unverified EMAIL match → linkRequired (never silent merge / new account)
#       + explicit confirm via POST /auth/google/link (authed with password).
#    B) verified EMAIL match (marked via tmp script) → auto-LINK, same account.
# ---------------------------------------------------------------------------
print("\n== 9) account linking: LINK_REQUIRED (unverified) then auto-LINK (verified) ==")
cl_x = Client()
s, b, _ = cl_x.call("POST", "/api/v1/auth/register", {
    "displayName": "Auth Matrix Link", "handle": X, "email": X_EMAIL,
    "password": X_PW, "acceptTerms": True,
})
X_ID = b.get("user", {}).get("id")
check("[9] password account with (unverified) email created → 201", s == 201 and X_ID, f"got {s}")
s, b, _ = cl_x.call("POST", "/api/v1/auth/google/start")
GS9 = (b.get("session") or {}).get("id")
s, b, _ = cl_x.call("POST", f"/api/v1/auth/google/{GS9}/grant", {"decision": "GRANT", "email": X_EMAIL})
CODE9, STATE9 = b.get("code"), b.get("state")
s, b, _ = cl_x.call("POST", f"/api/v1/auth/google/{GS9}/callback", {"code": CODE9, "state": STATE9})
check("[9a] unverified-email google callback → 200 linkRequired (no user merged)",
      s == 200 and b.get("linkRequired") is True and "user" not in b, f"got {s} {b}")
check("[9a] linkRequired carries googleSessionId + masked emailHint",
      b.get("googleSessionId") == GS9 and isinstance(b.get("emailHint"), str)
      and "•" in (b.get("emailHint") or "") and (b.get("emailHint") or "") != X_EMAIL, str(b.get("emailHint")))
cnt = tmp("count-users-by-email", X_EMAIL)
check("[9a] no new account created (still exactly 1 user with that email)", cnt and cnt.get("count") == 1, str(cnt))
# explicit-link continuation: prove ownership with the password, then confirm.
cl_xpw = Client()
s, b, _ = cl_xpw.call("POST", "/api/v1/auth/login", {"identifier": X_EMAIL, "password": X_PW})
check("[9a] owner signs in with password → 200", s == 200 and b.get("user", {}).get("id") == X_ID, f"got {s}")
X_TOKEN = cl_xpw.token  # kept for item 20 (session expiry)
s, b, _ = cl_xpw.call("POST", "/api/v1/auth/google/link", {"googleSessionId": GS9})
check("[9a] POST /auth/google/link (authed) → 200 {linked:true}", s == 200 and b.get("linked") is True, f"got {s} {b}")
s, b, _ = cl_xpw.call("GET", "/api/v1/auth/identifiers")
rows = {r.get("type"): r for r in b.get("identifiers", [])}
check("[9a] GOOGLE identifier now linked to the password account",
      "GOOGLE" in rows and rows["GOOGLE"].get("verified") is True, str(sorted(rows)))
# sub-case B: verified EMAIL → auto-link on a fresh account.
cl_y = Client()
s, b, _ = cl_y.call("POST", "/api/v1/auth/register", {
    "displayName": "Auth Matrix Auto", "handle": Y, "email": Y_EMAIL,
    "password": "SecretPass123", "acceptTerms": True,
})
Y_ID = b.get("user", {}).get("id")
vr = tmp("verify-email", Y_EMAIL)
check("[9b] EMAIL identifier marked verified via DB (simulating email verification)", vr and vr.get("count") == 1, str(vr))
s, b, _ = cl_y.call("POST", "/api/v1/auth/google/start")
GS9B = (b.get("session") or {}).get("id")
s, b, _ = cl_y.call("POST", f"/api/v1/auth/google/{GS9B}/grant", {"decision": "GRANT", "email": Y_EMAIL})
CODE9B, STATE9B = b.get("code"), b.get("state")
s, b, _ = cl_y.call("POST", f"/api/v1/auth/google/{GS9B}/callback", {"code": CODE9B, "state": STATE9B})
check("[9b] verified-email google callback → outcome LINKED, same account",
      s == 200 and b.get("outcome") == "LINKED" and b.get("user", {}).get("id") == Y_ID, f"got {s} {b}")
cnt = tmp("count-users-by-email", Y_EMAIL)
check("[9b] no new user created by the auto-link", cnt and cnt.get("count") == 1, str(cnt))

# ---------------------------------------------------------------------------
# 10) Duplicate email prevention (register with an existing email → 409).
# ---------------------------------------------------------------------------
print("\n== 10) duplicate email prevention ==")
s, b, _ = cl_u.call("POST", "/api/v1/auth/register", {
    "displayName": "Dup Email", "handle": f"authmx_dupem_{SUF}",
    "email": M_EMAIL, "password": "SecretPass123", "acceptTerms": True,
})
check("[10] register with taken email → 409 EMAIL_TAKEN", s == 409 and errcode(b) == "EMAIL_TAKEN", f"got {s} {errcode(b)}")

# ---------------------------------------------------------------------------
# 11) Duplicate phone prevention (phone/register with a linked phone → 409).
# ---------------------------------------------------------------------------
print("\n== 11) duplicate phone prevention ==")
s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/start", {"phone": PH1, "purpose": "REGISTER"})
OTP11 = b.get("mockOtp")
PS11 = (b.get("session") or {}).get("id")
check("[11] fresh REGISTER OTP session for the already-linked number", s == 200 and PS11 and OTP11, f"got {s}")
s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/verify", {"sessionId": PS11, "otp": OTP11})
check("[11] OTP verifies (the number itself is the proof)", s == 200 and b.get("verified") is True, f"got {s}")
s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/register", {
    "sessionId": PS11, "displayName": "Auth Matrix Dup Phone", "handle": f"authmx_dupph_{SUF}",
})
check("[11] phone/register with already-linked number → 409 PHONE_TAKEN",
      s == 409 and errcode(b) == "PHONE_TAKEN", f"got {s} {errcode(b)}")

# ---------------------------------------------------------------------------
# 12) Duplicate + reserved username prevention.
# ---------------------------------------------------------------------------
print("\n== 12) duplicate + reserved username prevention ==")
s, b, _ = cl_u.call("POST", "/api/v1/auth/register", {
    "displayName": "Dup Handle", "handle": U, "email": f"authmx.duph.{SUF}@example.com",
    "password": "SecretPass123", "acceptTerms": True,
})
check("[12] register with existing handle → 409 HANDLE_TAKEN", s == 409 and errcode(b) == "HANDLE_TAKEN", f"got {s} {errcode(b)}")
s, b, _ = cl_u.call("POST", "/api/v1/auth/register", {
    "displayName": "Reserved Handle", "handle": "admin",
    "password": "SecretPass123", "acceptTerms": True,
})
check("[12] reserved username 'admin' → 422 HANDLE_INVALID", s == 422 and errcode(b) == "HANDLE_INVALID", f"got {s} {errcode(b)}")

# ---------------------------------------------------------------------------
# 13) Incorrect password → 401 generic, identical for a nonexistent identifier.
# ---------------------------------------------------------------------------
print("\n== 13) incorrect password (enumeration-resistant) ==")
s, b_wp, _ = cl_u.call("POST", "/api/v1/auth/login", {"identifier": M_EMAIL, "password": "WrongPass999"})
check("[13] wrong password on real account → 401 INVALID_CREDENTIALS",
      s == 401 and errcode(b_wp) == "INVALID_CREDENTIALS", f"got {s} {errcode(b_wp)}")
s, b_ghost, _ = cl_u.call("POST", "/api/v1/auth/login", {"identifier": f"authmx.ghost.{SUF}@example.com", "password": "Whatever123"})
check("[13] nonexistent identifier → 401 INVALID_CREDENTIALS",
      s == 401 and errcode(b_ghost) == "INVALID_CREDENTIALS", f"got {s} {errcode(b_ghost)}")
check("[13] identical message body for both (enumeration resistance)",
      errmsg(b_wp) == errmsg(b_ghost) and errmsg(b_wp) == "Invalid email or password.", f"{errmsg(b_wp)!r} vs {errmsg(b_ghost)!r}")

# ---------------------------------------------------------------------------
# 14) Expired OTP: set the session's expiresAt to the past via tmp script →
#     verify → 401 OTP_INVALID (generic).
# ---------------------------------------------------------------------------
print("\n== 14) expired OTP ==")
s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/start", {"phone": PH2, "purpose": "LOGIN"})
OTP14 = b.get("mockOtp")
PS14 = (b.get("session") or {}).get("id")
check("[14] phone session created", s == 200 and PS14, f"got {s}")
r14 = tmp("phone-expire", PS14)
check("[14] session expiresAt forced into the past (DB)", r14 and r14.get("ok") is True, str(r14))
s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/verify", {"sessionId": PS14, "otp": OTP14})
check("[14] verify with the CORRECT code after expiry → 401 OTP_INVALID (generic)",
      s == 401 and errcode(b) == "OTP_INVALID" and "invalid or expired" in errmsg(b), f"got {s} {errcode(b)} {errmsg(b)!r}")

# ---------------------------------------------------------------------------
# 15) Invalid OTP (wrong code) → 401.
# ---------------------------------------------------------------------------
print("\n== 15) invalid OTP ==")
s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/start", {"phone": PH3, "purpose": "LOGIN"})
OTP15 = b.get("mockOtp")
PS15 = (b.get("session") or {}).get("id")
WRONG = "000000" if OTP15 != "000000" else "111111"
s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/verify", {"sessionId": PS15, "otp": WRONG})
check("[15] wrong code → 401 OTP_INVALID (generic message)",
      s == 401 and errcode(b) == "OTP_INVALID" and "invalid or expired" in errmsg(b), f"got {s} {errcode(b)}")

# ---------------------------------------------------------------------------
# 16) OTP brute force: 5 wrong codes → MAX_ATTEMPTS path + session FAILED.
# ---------------------------------------------------------------------------
print("\n== 16) OTP brute force (5 wrong attempts) ==")
s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/start", {"phone": PH4, "purpose": "LOGIN"})
OTP16 = b.get("mockOtp")
PS16 = (b.get("session") or {}).get("id")
W16 = "000000" if OTP16 != "000000" else "111111"
msgs = []
for i in range(1, 5):
    s, b, _ = cl_p.call("POST", "/api/v1/auth/phone/verify", {"sessionId": PS16, "otp": W16})
    msgs.append((s, errcode(b), errmsg(b)))
check("[16] wrong attempts 1-4 → 401 OTP_INVALID (generic)",
      all(x[0] == 401 and x[1] == "OTP_INVALID" for x in msgs), str(msgs[:1]))
s, b5, _ = cl_p.call("POST", "/api/v1/auth/phone/verify", {"sessionId": PS16, "otp": W16})
check("[16] 5th wrong attempt → 401 with the too-many-codes message (MAX_ATTEMPTS path)",
      s == 401 and errcode(b5) == "OTP_INVALID" and "Too many incorrect codes" in errmsg(b5), f"got {s} {errcode(b5)} {errmsg(b5)!r}")
st16 = tmp("phone-status", PS16)
check("[16] session status FAILED after 5 wrong attempts (DB)", st16 and st16.get("status") == "FAILED" and st16.get("attempts") == 5, str(st16))
s, b6, _ = cl_p.call("POST", "/api/v1/auth/phone/verify", {"sessionId": PS16, "otp": OTP16})
check("[16] 6th attempt (even with the correct code) → still 401",
      s == 401 and errcode(b6) == "OTP_INVALID", f"got {s} {errcode(b6)}")

# ---------------------------------------------------------------------------
# 17) Expired Google authorization code: grant, force authorizationCodeExp
#     into the past via tmp script, callback with CORRECT code+state →
#     400 EXCHANGE_FAILED.
# ---------------------------------------------------------------------------
print("\n== 17) expired Google authorization code ==")
s, b, _ = cl_g.call("POST", "/api/v1/auth/google/start")
GS17 = (b.get("session") or {}).get("id")
s, b, _ = cl_g.call("POST", f"/api/v1/auth/google/{GS17}/grant", {"decision": "GRANT", "email": f"authmx.g17.{SUF}@example.com"})
CODE17, STATE17 = b.get("code"), b.get("state")
check("[17] google session granted (code + state issued)", s == 200 and CODE17 and STATE17, f"got {s}")
r17 = tmp("google-code-expire", GS17)
check("[17] authorizationCodeExp forced into the past (DB, session stays GRANTED)", r17 and r17.get("ok") is True and r17.get("status") == "GRANTED", str(r17))
s, b, _ = cl_g.call("POST", f"/api/v1/auth/google/{GS17}/callback", {"code": CODE17, "state": STATE17})
check("[17] callback with correct code+state after code expiry → 400 EXCHANGE_FAILED",
      s == 400 and errcode(b) == "EXCHANGE_FAILED", f"got {s} {errcode(b)}")
st17 = tmp("google-status", GS17)
check("[17] google session consumed to EXPIRED (no replay)", st17 and st17.get("status") == "EXPIRED", str(st17))

# ---------------------------------------------------------------------------
# 18) Cancelled Google authorization: grant DENY → 403; callback → 409.
# ---------------------------------------------------------------------------
print("\n== 18) cancelled Google authorization (DENY) ==")
s, b, _ = cl_g.call("POST", "/api/v1/auth/google/start")
GS18 = (b.get("session") or {})
GS18_ID = GS18.get("id")
STATE18 = google_state_of(b)
s, b, _ = cl_g.call("POST", f"/api/v1/auth/google/{GS18_ID}/grant", {"decision": "DENY", "email": f"authmx.g18.{SUF}@example.com"})
check("[18] grant DENY → 403 DENIED", s == 403 and errcode(b) == "DENIED", f"got {s} {errcode(b)}")
s, b, _ = cl_g.call("POST", f"/api/v1/auth/google/{GS18_ID}/callback", {"code": "forged_code_0123456789", "state": STATE18})
check("[18] callback after DENY (correct state) → 409 NOT_GRANTED",
      s == 409 and errcode(b) == "NOT_GRANTED", f"got {s} {errcode(b)}")

# ---------------------------------------------------------------------------
# 19) Invalid OAuth state: callback with a wrong state → 400 BAD_STATE.
# ---------------------------------------------------------------------------
print("\n== 19) invalid OAuth state ==")
s, b, _ = cl_g.call("POST", "/api/v1/auth/google/start")
GS19 = (b.get("session") or {}).get("id")
s, b, _ = cl_g.call("POST", f"/api/v1/auth/google/{GS19}/grant", {"decision": "GRANT", "email": f"authmx.g19.{SUF}@example.com"})
CODE19, STATE19 = b.get("code"), b.get("state")
s, b, _ = cl_g.call("POST", f"/api/v1/auth/google/{GS19}/callback", {"code": CODE19, "state": "tampered_state_value1"})
check("[19] valid code + wrong state → 400 BAD_STATE", s == 400 and errcode(b) == "BAD_STATE", f"got {s} {errcode(b)}")
st19 = tmp("google-status", GS19)
check("[19] session invalidated after the state mismatch", st19 and st19.get("status") == "EXPIRED", str(st19))

# ---------------------------------------------------------------------------
# 20) Session expiration: force the session's expiresAt into the past via tmp
#     script → GET /auth/me → 401.
# ---------------------------------------------------------------------------
print("\n== 20) platform session expiration ==")
s, b, _ = cl_xpw.call("GET", "/api/v1/auth/me")
check("[20] session still valid before expiry", s == 200 and b.get("user", {}).get("id") == X_ID, f"got {s}")
r20 = tmp("session-expire", X_TOKEN)
check("[20] Session.expiresAt forced into the past (DB, 1 row)", r20 and r20.get("count") == 1, str(r20))
s, b, _ = cl_xpw.call("GET", "/api/v1/auth/me")
check("[20] /auth/me after expiry → 401", s == 401 and errcode(b) == "UNAUTHENTICATED", f"got {s} {errcode(b)}")

# ---------------------------------------------------------------------------
# 21) Session revocation: login → POST /auth/logout → me 401.
# ---------------------------------------------------------------------------
print("\n== 21) session revocation (logout) ==")
cl_rev = Client()
s, b, _ = cl_rev.call("POST", "/api/v1/auth/login", {"identifier": U, "password": "SecretPass123"})
check("[21] fresh login → 200", s == 200, f"got {s}")
s, b, _ = cl_rev.call("GET", "/api/v1/auth/me")
check("[21] /auth/me before logout → 200", s == 200, f"got {s}")
s, b, _ = cl_rev.call("POST", "/api/v1/auth/logout")
check("[21] POST /auth/logout → 200", s == 200, f"got {s} {b}")
s, b, _ = cl_rev.call("GET", "/api/v1/auth/me")
check("[21] /auth/me after logout → 401 (session revoked)",
      s == 401 and errcode(b) == "UNAUTHENTICATED", f"got {s} {errcode(b)}")

# ---------------------------------------------------------------------------
# 22) Account recovery: request (identifier) → 200; confirm → 200; old
#     sessions revoked; login with the new password works.
# ---------------------------------------------------------------------------
print("\n== 22) password recovery (reset) ==")
cl_r = Client()
s, b, _ = cl_r.call("POST", "/api/v1/auth/register", {
    "displayName": "Auth Matrix Recovery", "handle": R, "email": R_EMAIL,
    "password": R_OLD_PW, "acceptTerms": True,
})
R_ID = b.get("user", {}).get("id")
check("[22] recovery account registered → 201", s == 201 and R_ID, f"got {s}")
s, b, _ = cl_r.call("POST", "/api/v1/auth/login", {"identifier": R_EMAIL, "password": R_OLD_PW})
check("[22] pre-reset login → 200 (session to be revoked)", s == 200, f"got {s}")
s, b, _ = cl_r.call("GET", "/api/v1/auth/me")
check("[22] /auth/me before reset → 200", s == 200, f"got {s}")
s, b_req, _ = cl_r.call("POST", "/api/v1/auth/recover/password/request", {"identifier": R_EMAIL})
REAL_RESET_KEYS = sorted(b_req.keys())
REAL_RESET_MSG = b_req.get("message")
check("[22] reset request → 200 {sent, message, mockToken}",
      s == 200 and b_req.get("sent") is True and bool(b_req.get("mockToken")) and bool(REAL_RESET_MSG), f"got {s} {b_req}")
s, b, _ = cl_r.call("POST", "/api/v1/auth/recover/password/confirm", {"token": b_req.get("mockToken"), "newPassword": R_NEW_PW})
check("[22] reset confirm → 200 {reset:true}", s == 200 and b.get("reset") is True, f"got {s} {b}")
s, b, _ = cl_r.call("GET", "/api/v1/auth/me")
check("[22] previous session revoked by the reset → /auth/me 401",
      s == 401 and errcode(b) == "UNAUTHENTICATED", f"got {s} {errcode(b)}")
s, b, _ = cl_r.call("POST", "/api/v1/auth/login", {"identifier": R_EMAIL, "password": R_NEW_PW})
check("[22] login with the NEW password → 200", s == 200 and b.get("user", {}).get("id") == R_ID, f"got {s}")

# ---------------------------------------------------------------------------
# 23) Identifier enumeration resistance (reset + login shapes).
# ---------------------------------------------------------------------------
print("\n== 23) identifier enumeration resistance ==")
s, b_ghost_reset, _ = cl_r.call("POST", "/api/v1/auth/recover/password/request", {"identifier": f"authmx.ghost.{SUF}@example.com"})
check("[23] reset request for NONEXISTENT identifier → 200 (same status as real)",
      s == 200 and b_ghost_reset.get("sent") is True, f"got {s} {b_ghost_reset}")
check("[23] identical response keys (real vs nonexistent)",
      sorted(b_ghost_reset.keys()) == REAL_RESET_KEYS, f"{sorted(b_ghost_reset.keys())} vs {REAL_RESET_KEYS}")
check("[23] identical message + decoy mockToken present",
      b_ghost_reset.get("message") == REAL_RESET_MSG and isinstance(b_ghost_reset.get("mockToken"), str)
      and len(b_ghost_reset.get("mockToken", "")) > 0, f"msg={b_ghost_reset.get('message')!r}")
s, b, _ = cl_r.call("POST", "/api/v1/auth/recover/password/confirm", {"token": b_ghost_reset.get("mockToken"), "newPassword": "ShouldNotWork1"})
check("[23] decoy token fails at confirm like an expired one → 400 TOKEN_INVALID",
      s == 400 and errcode(b) == "TOKEN_INVALID", f"got {s} {errcode(b)}")
s, b_u1, _ = cl_r.call("POST", "/api/v1/auth/login", {"identifier": f"authmx_ghost_{SUF}", "password": "Whatever123"})
s2, b_u2, _ = cl_r.call("POST", "/api/v1/auth/login", {"identifier": "ada", "password": "WrongPass999"})
check("[23] nonexistent username vs wrong password on real user → same status",
      s == s2 == 401 and errcode(b_u1) == errcode(b_u2) == "INVALID_CREDENTIALS", f"got {s}/{s2}")
check("[23] ...and the exact same message string",
      errmsg(b_u1) == errmsg(b_u2) == "Invalid email or password.", f"{errmsg(b_u1)!r} vs {errmsg(b_u2)!r}")

# ---------------------------------------------------------------------------
# 24) Google identity already belonging to another account (no stealing).
# ---------------------------------------------------------------------------
print("\n== 24) google identity owned by another account ==")
cl_g24 = Client()
s, b, _ = cl_g24.call("POST", "/api/v1/auth/google/start")
GS24 = (b.get("session") or {}).get("id")
s, b, _ = cl_g24.call("POST", f"/api/v1/auth/google/{GS24}/grant", {"decision": "GRANT", "email": Y_EMAIL})
CODE24, STATE24 = b.get("code"), b.get("state")
s, b, _ = cl_g24.call("POST", f"/api/v1/auth/google/{GS24}/callback", {"code": CODE24, "state": STATE24})
check("[24] google sign-in with A's email lands on A's account (LOGIN)",
      s == 200 and b.get("outcome") == "LOGIN" and b.get("user", {}).get("id") == Y_ID, f"got {s} {b}")
# B (authenticated, owns a different account) tries to link A's google identity.
s, b, _ = cl_u.call("POST", "/api/v1/auth/google/start")
GS24B = (b.get("session") or {}).get("id")
s, b, _ = cl_u.call("POST", f"/api/v1/auth/google/{GS24B}/grant", {"decision": "GRANT", "email": Y_EMAIL})
check("[24] new google session granted for the same email", s == 200, f"got {s}")
s, b, _ = cl_u.call("POST", "/api/v1/auth/google/link", {"googleSessionId": GS24B})
check("[24] B (other account) cannot steal it → 409 ALREADY_LINKED_TO_OTHER",
      s == 409 and errcode(b) == "ALREADY_LINKED_TO_OTHER", f"got {s} {errcode(b)}")

# ---------------------------------------------------------------------------
# 25) NINAuth identity-verification flow still works after account creation
#     (POST /api/v1/identity/sessions with the account's cookie).
# ---------------------------------------------------------------------------
print("\n== 25) NINAuth verification session on a password account ==")
s, b, _ = cl_u.call("POST", "/api/v1/identity/sessions", {})
sess = b.get("session", {})
check("[25] POST /api/v1/identity/sessions (authed) → 201 AWAITING_CONSENT",
      s == 201 and sess.get("status") == "AWAITING_CONSENT", f"got {s} {sess.get('status')}")
check("[25] consent screen contract present",
      bool(b.get("consent")) and bool(b.get("consent", {}).get("requester")), f"{list(b.keys())}")

# ---------------------------------------------------------------------------
# 26) Existing (NINAuth-verified) user across login methods — identifier
#     unification: same user.id via username and email logins.
# ---------------------------------------------------------------------------
print("\n== 26) identifier unification on ada ==")
check("[26] ada username login (item 5) returned a user", ADA_BY_USER.get("id") is not None)
check("[26] ada email login (item 6) returned a user", ADA_BY_EMAIL.get("id") is not None)
check("[26] both login methods resolve to the SAME user.id",
      ADA_BY_USER.get("id") == ADA_BY_EMAIL.get("id"), f"{ADA_BY_USER.get('id')} vs {ADA_BY_EMAIL.get('id')}")
s, b, _ = cl_ada.call("GET", "/api/v1/identity/me")
check("[26] ada's identity surface still loads while signed in via username", s == 200 and bool(b.get("identity")), f"got {s}")

# ---------------------------------------------------------------------------
# 27) Logout from all devices: two sessions; logout-all kills BOTH.
# ---------------------------------------------------------------------------
print("\n== 27) logout from all devices ==")
cl_27a = Client()
cl_27b = Client()
s, b, _ = cl_27a.call("POST", "/api/v1/auth/login", {"identifier": M_EMAIL, "password": "SecretPass123"})
check("[27] session 1 login → 200", s == 200, f"got {s}")
s, b, _ = cl_27b.call("POST", "/api/v1/auth/login", {"identifier": M_EMAIL, "password": "SecretPass123"})
check("[27] session 2 login (second device) → 200", s == 200, f"got {s}")
s, b, _ = cl_27a.call("POST", "/api/v1/auth/logout-all")
check("[27] POST /auth/logout-all → 200 {signedOut, sessionsRevoked ≥ 2}",
      s == 200 and b.get("signedOut") is True and int(b.get("sessionsRevoked", 0)) >= 2, f"got {s} {b}")
s1, _, _ = cl_27a.call("GET", "/api/v1/auth/me")
s2, _, _ = cl_27b.call("GET", "/api/v1/auth/me")
check("[27] BOTH sessions now 401 on /auth/me", s1 == 401 and s2 == 401, f"got {s1}/{s2}")

# ---------------------------------------------------------------------------
# 28) Mobile + desktop render check — browser item, verified with
#     agent-browser OUTSIDE this python matrix (see worklog auth-7).
# ---------------------------------------------------------------------------
print("\n== 28) mobile/desktop auth render (agent-browser — not in python) ==")
print("  [SKIP] item 28 is a browser check: run via agent-browser (viewport 390x844 + 1280x800).")

# ---------------------------------------------------------------------------
# Final cleanup: ada's password must keep working; authmx_* accounts removed.
# ---------------------------------------------------------------------------
print("\n== cleanup ==")
ada_state = tmp("check-ada")
check("[cleanup] ada intact: SuperSecret1 verifies + USERNAME/EMAIL identifiers present",
      ada_state and ada_state.get("superSecret1Works") is True
      and {i["type"] for i in (ada_state.get("identifiers") or [])} >= {"USERNAME", "EMAIL"}, str(ada_state))
if ada_state and not ada_state.get("superSecret1Works"):
    rr = tmp("restore-ada")
    check("[cleanup] ada password restored to SuperSecret1", rr and rr.get("ok") is True, str(rr))
    ada_state = tmp("check-ada")
    check("[cleanup] ada SuperSecret1 works after restore", ada_state and ada_state.get("superSecret1Works") is True, str(ada_state))
cleaned = tmp("cleanup-authmx")
check("[cleanup] authmx_* test accounts deleted (best-effort)",
      cleaned is not None and cleaned.get("ok") is True, str(cleaned))
print(f"  [cleanup] deleted handles: {(cleaned or {}).get('handles')}")

print(f"\n===== RESULT: {PASS} passed, {FAIL} failed =====")
sys.exit(1 if FAIL else 0)
