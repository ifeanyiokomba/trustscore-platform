#!/usr/bin/env python3
"""TrustScore Batch 2 — test matrix (task batch2-matrix).

Sections (contract in worklog "Task ID: batch2-A"):

  A) G7  — duplicate-identity guard: a NINAuth subject already VERIFIED on a
           DIFFERENT account must be refused at the callback (409
           IDENTITY_TAKEN), fail the session (errorReason identity_taken),
           create NO TrustIdentity, notify the HOLDING account, leave an
           IDENTITY_DUPLICATE_BLOCKED audit event, and never disclose the
           holder's identity. The LIVE condition is DB-seeded (MOCK subjects
           are userId-derived, so duplicates never occur naturally). Negative
           control: releasing the holder's claim (REVOKED) lets the claimant
           verify normally.
  B) G8  — business profiles: normalization (RC/BN/IT/bare-digit), masked
           rcHint honesty, owner-scoped duplicate (409 DUPLICATE) vs
           cross-account ALLOWED (no provider = no adjudication), malformed
           (422 RC_MALFORMED), 5-profile cap (409 LIMIT_REACHED), rename/
           delete + foreign-id 404s, the business-create rate limiter
           (10/min — 11th rapid create is 429), and the NO-TRUST-SIGNAL
           invariant: no score/band/level/trust keys and no raw RC digits in
           ANY /api/v1/businesses* response.
  C) PR2 — DSR erasure-cascade INVARIANT: after POST /api/v1/passport/dsr
           {type:"DELETE", password} a Prisma-DMMF-driven scan must find ZERO
           rows for the user in EVERY model holding a UserAccount relation
           (whatever the FK field is called — future models cannot silently
           escape). AuditEvent tombstones survive BY DESIGN; DsrRequest rows
           (incl. the final export snapshot) cascade with the account. ada is
           the untouched negative control (counts before == after).
  D) regressions — stage2_matrix -> sleep 75 (shared-IP rate-window rule) ->
           batch1_matrix (API catalog drift guard) -> tsc -> eslint. Run with
           `--with-regressions` (after A-C) or `--regressions-only` (D alone);
           the default run prints a SKIP note (auth-7 item-28 convention).

Test accounts are unique per run (prefix b2mx_ + random suffix) and fully
self-cleaning via `bunx tsx tests/batch2_db_ops.ts cleanup-b2mx`. Rate-limit
pressure is PACED (login 8/min, register 10/min, identity-session 5/min,
identity-consent/callback 12/min, business-create 10/min, dsr 3/5min) instead
of relied upon, except the one deliberate business-create burst. ada is only
read via DB counts (never modified).

Run: python3 tests/batch2_matrix.py [--with-regressions | --regressions-only]
(dev server on :3000; DB helper: bunx tsx tests/batch2_db_ops.ts)
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
import urllib.request

BASE = "http://127.0.0.1:3000"
# Root-relative (CI-portable): the repo root is one level above tests/
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP_SCRIPT = "tests/batch2_db_ops.ts"

PASS = 0
FAIL = 0
SUF = secrets.token_hex(4)  # unique suffix for this run

WITH_REG = "--with-regressions" in sys.argv
REG_ONLY = "--regressions-only" in sys.argv

# ---- unique fixtures for this run ------------------------------------------
A_HANDLE = f"b2mx_a_{SUF}"          # G7 claimant (A's subject is held by B)
B_HANDLE = f"b2mx_b_{SUF}"          # G7 holder (seeded VERIFIED duplicate)
C_HANDLE = f"b2mx_c_{SUF}"          # PR2 DSR erasure-cascade fixture
A_EMAIL = f"b2mx.a.{SUF}@example.com"
B_EMAIL = f"b2mx.b.{SUF}@example.com"
C_EMAIL = f"b2mx.c.{SUF}@example.com"
A_NAME = "Batch2 Matrix Alpha"
B_NAME = "Batch2 Matrix Beta"
C_NAME = "Batch2 Matrix Cascade"
C_PW = "DsrSecret123"
SCOPES = ["identity.basic", "identity.nin_status", "profile.name", "profile.demographics"]

# ---------------------------------------------------------------------------
# HTTP client with cookie jar + per-scope rate pacing (fixed windows, same
# semantics as the backend in-memory limiter — src/lib/platform/http.ts).
# ---------------------------------------------------------------------------

SCOPE_LIMITS = {
    ("/api/v1/auth/login", None): ("login", 8, 60),
    ("/api/v1/auth/register", None): ("register", 10, 60),
    ("/api/v1/identity/sessions", "POST"): ("identity-session", 5, 60),
    ("/api/v1/businesses", "POST"): ("business-create", 10, 60),
    ("/api/v1/businesses", "PATCH"): ("business-update", 10, 60),
    ("/api/v1/passport/dsr", "POST"): ("dsr", 3, 300),
}

_windows = {}  # scope -> [window_start_ts, used]

_ID_PATH_RE = re.compile(r"^/api/v1/identity/sessions/[^/]+/(consent|callback)$")


def scope_of(method, path):
    if (path, method) in SCOPE_LIMITS:
        return SCOPE_LIMITS[(path, method)]
    m = _ID_PATH_RE.match(path)
    if m:
        return (("identity-consent", 12, 60) if m.group(1) == "consent"
                else ("identity-callback", 12, 60))
    return None


def pace(method, path):
    sc = scope_of(method, path)
    if not sc:
        return
    name, limit, window = sc
    now = time.time()
    win = _windows.get(name)
    if not win or now - win[0] >= window:
        win = [now, 0]
        _windows[name] = win
    if win[1] >= limit:
        wait = win[0] + window + 1 - now
        if wait > 0:
            print(f"  ... pacing {name} rate window ({limit}/{window}s): sleeping {wait:.0f}s")
            time.sleep(wait)
        _windows[name] = [time.time(), 0]
    _windows[name][1] += 1


def reset_window(method, path):
    sc = scope_of(method, path)
    if sc:
        _windows[sc[0]] = [time.time(), 0]


# Every /api/v1/businesses* response is recorded for the NO-TRUST-SIGNAL
# invariant in section B (parsed body + raw text).
BIZ_REC = []


class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.token = None
        self.last_raw = ""  # most recent response body text

    def _grab_token(self, set_cookies):
        for sc in set_cookies or []:
            if "ts_session=" in sc:
                self.token = sc.split("ts_session=", 1)[1].split(";", 1)[0]

    def _record(self, method, path, status, raw, parsed):
        self.last_raw = raw
        if path.startswith("/api/v1/businesses"):
            BIZ_REC.append((method, path, status, raw, parsed))

    def call(self, method, path, body=None, pace_it=True, retry_429=True):
        if pace_it:
            pace(method, path)
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method)
        if data:
            req.add_header("Content-Type", "application/json")
        for attempt in (0, 1, 2):
            try:
                with self.op.open(req, timeout=60) as res:
                    raw = res.read().decode()
                    scs = res.headers.get_all("Set-Cookie") or []
                    self._grab_token(scs)
                    try:
                        parsed = json.loads(raw or "{}")
                    except Exception:
                        parsed = {}
                    self._record(method, path, res.status, raw, parsed)
                    return res.status, parsed, scs
            except urllib.error.HTTPError as e:
                raw = e.read().decode()
                if e.code == 429 and retry_429 and attempt < 2:
                    print(f"  ... 429 backoff 66s ({path})")
                    time.sleep(66)
                    reset_window(method, path)
                    continue
                scs = e.headers.get_all("Set-Cookie") or []
                self._grab_token(scs)
                try:
                    b = json.loads(raw or "{}")
                except Exception:
                    b = {}
                self._record(method, path, e.code, raw, b)
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
            ["bunx", "tsx", TMP_SCRIPT, *args],
            capture_output=True, text=True, cwd=ROOT, timeout=120,
        )
        out = (r.stdout or "").strip()
        if r.returncode != 0 or not out:
            print(f"  [tmp:{args[0]}] stderr: {(r.stderr or '').strip()[:200]}")
            return None
        return json.loads(out.splitlines()[-1])
    except Exception as e:
        print(f"  [tmp:{args[0]}] error: {e}")
        return None


def run_verification(cl):
    """Full NINAuth MOCK verification flow: session -> consent GRANT -> callback.
    Returns (session_id, code, state, callback_status, callback_body)."""
    s, b, _ = cl.call("POST", "/api/v1/identity/sessions", {"scopes": SCOPES})
    sid = (b.get("session") or {}).get("id")
    if s != 201 or not sid:
        return None, None, None, s, b
    s, b, _ = cl.call("POST", f"/api/v1/identity/sessions/{sid}/consent", {"decision": "GRANT"})
    code, state = b.get("code"), b.get("state")
    if s != 200 or not code or not state:
        return sid, None, None, s, b
    s, b, _ = cl.call("POST", f"/api/v1/identity/sessions/{sid}/callback", {"code": code, "state": state})
    return sid, code, state, s, b


print(f"batch2-matrix run — suffix {SUF} (fixtures {A_HANDLE}/{B_HANDLE}/{C_HANDLE})")

if REG_ONLY:
    # Section D alone (documented regression ordering, no fixture state).
    pass
else:

    # =====================================================================
    print("\n== A) G7 — duplicate-identity guard (IDENTITY_TAKEN) ==")
    # =====================================================================
    cl_a = Client()
    s, b, _ = cl_a.call("POST", "/api/v1/auth/register", {
        "displayName": A_NAME, "handle": A_HANDLE, "email": A_EMAIL,
        "password": "AlphaSecret123", "acceptTerms": True,
    })
    A_ID = (b.get("user") or {}).get("id")
    check("[A1] fixture A registered via the real API → 201 {user}",
          s == 201 and bool(A_ID), f"got {s} {b}")

    cl_b = Client()
    s, b, _ = cl_b.call("POST", "/api/v1/auth/register", {
        "displayName": B_NAME, "handle": B_HANDLE, "email": B_EMAIL,
        "password": "BetaSecret123", "acceptTerms": True,
    })
    B_ID = (b.get("user") or {}).get("id")
    check("[A2] fixture B registered → 201 {user}", s == 201 and bool(B_ID), f"got {s}")

    # DB-seed the LIVE condition: B's account holds A's NINAuth subject,
    # VERIFIED (MOCK subjects are userId-derived — this never occurs naturally).
    r = tmp("seed-duplicate", B_ID, A_ID)
    SUBJECT = (r or {}).get("subject")
    check("[A3] seeded LIVE duplicate (B VERIFIED holding maskedSubjectFor(A))",
          r and r.get("ok") is True and bool(r.get("trustIdentityId"))
          and bool(SUBJECT) and SUBJECT.startswith("NINAUTH-****-"), str(r))

    # A runs the full verification flow — the callback must be REFUSED.
    SID1, CODE1, STATE1, s, b = run_verification(cl_a)
    check("[A4] A's flow starts (201 session, consent GRANT, code+state)",
          bool(SID1) and bool(CODE1) and bool(STATE1), f"sid={SID1} s={s}")
    check("[A5] callback REFUSED → 409 IDENTITY_TAKEN",
          s == 409 and errcode(b) == "IDENTITY_TAKEN", f"got {s} {errcode(b)}")
    msg = errmsg(b).lower()
    check("[A6] the refusal routes to account recovery (sign in / recover / forgot)",
          ("sign in" in msg or "sign-in" in msg) and ("recover" in msg or "forgot" in msg), msg[:100])

    # DB consequences: fail-closed, no second TrustIdentity, holder notified.
    r = tmp("session-status", SID1)
    check("[A7] A's session FAILED with errorReason identity_taken",
          r and r.get("status") == "FAILED" and r.get("errorReason") == "identity_taken", str(r))
    r = tmp("trust-identity", A_ID)
    check("[A8] A has NO TrustIdentity row (guard fired before creation)",
          r is not None and r.get("found") is False, str(r))
    r = tmp("notifications", B_ID)
    sec = [n for n in (r or []) if n.get("type") == "SECURITY"]
    check("[A9] holder B got a SECURITY notification ('used elsewhere')",
          any("used elsewhere" in (n.get("title") or "").lower()
              or "government identity" in (n.get("title") or "").lower() for n in sec),
          str([n.get("title") for n in (r or [])][:4]))
    r = tmp("audit-count", A_ID, "IDENTITY_DUPLICATE_BLOCKED")
    sample = (r or {}).get("sample") or {}
    meta = sample.get("metadata")
    if isinstance(meta, str):  # the Json column stores a JSON-encoded string
        try:
            meta = json.loads(meta)
        except Exception:
            meta = {}
    check("[A10] audit IDENTITY_DUPLICATE_BLOCKED exists (holderIdentity metadata)",
          r and r.get("count", 0) >= 1 and bool((meta or {}).get("holderIdentity")),
          str(r))

    # Anti-disclosure: the 409 body must never identify the HOLDER (B).
    raw409 = cl_a.last_raw
    leaked = [x for x in (B_HANDLE, B_EMAIL, B_ID, B_NAME, SUBJECT) if x and x in raw409]
    check("[A11] 409 body discloses NOTHING about the holder (handle/email/userId/name/subject)",
          s == 409 and not leaked, f"leaked: {leaked}")

    # Negative control: release B's claim (REVOKED — the guard only blocks on
    # VERIFIED) → A's re-run must complete normally.
    r = tmp("clear-duplicate", B_ID)
    check("[A12] B's seeded TrustIdentity set REVOKED (claim released)",
          r and r.get("ok") is True and r.get("revoked") == 1, str(r))

    SID2, CODE2, STATE2, s, b = run_verification(cl_a)
    check("[A13] A re-runs the full flow → 200 VERIFIED (normal verification regression)",
          s == 200 and (b.get("identity") or {}).get("status") == "VERIFIED", f"got {s} {b}")
    r = tmp("trust-identity", A_ID)
    check("[A14] A's TrustIdentity now exists (VERIFIED, L1, subject == maskedSubjectFor(A))",
          r and r.get("found") is True and r.get("status") == "VERIFIED"
          and r.get("assuranceLevel") == 1 and r.get("providerIdentityRef") == SUBJECT, str(r))

    # Same-user re-verification is never blocked (the userId: {not} filter).
    SIDB, CODEB, STATEB, s, b = run_verification(cl_b)
    check("[A15] B (the holder) re-verifies own identity → 200 (same-user never blocked)",
          s == 200 and (b.get("identity") or {}).get("status") == "VERIFIED", f"got {s} {errcode(b)}")
    r = tmp("trust-identity", B_ID)
    check("[A16] B's TrustIdentity re-verified (REVOKED → VERIFIED, own subject, not A's)",
          r and r.get("status") == "VERIFIED" and r.get("found") is True
          and r.get("providerIdentityRef") != SUBJECT, str(r))
    r = tmp("notifications", B_ID)
    sec2 = [n for n in (r or []) if n.get("type") == "SECURITY"]
    check("[A17] B's SECURITY notification persists (history is not undone)",
          any("used elsewhere" in (n.get("title") or "").lower()
              or "government identity" in (n.get("title") or "").lower() for n in sec2))

    # =====================================================================
    print("\n== B) G8 — business profiles (honest UNVERIFIED labels) ==")
    # =====================================================================
    anon = Client()
    s, b, _ = anon.call("GET", "/api/v1/businesses")
    check("[B1] unauthenticated GET /businesses → 401 UNAUTHENTICATED",
          s == 401 and errcode(b) == "UNAUTHENTICATED", f"got {s} {errcode(b)}")
    # pace_it=False: the 401 fires BEFORE the route's rate limiter, so the
    # server never counts this call — the local window must not either.
    s, b, _ = anon.call("POST", "/api/v1/businesses", {"name": "Ghost Co", "rcNumber": "RC 1234567"},
                        pace_it=False)
    check("[B2] unauthenticated POST /businesses → 401 (auth check precedes the limiter)",
          s == 401 and errcode(b) == "UNAUTHENTICATED", f"got {s} {errcode(b)}")

    RC_A, RC_BN, RC_BARE, RC_IT = "RC 1234567", "bn-98765", "4477119", "IT 4567821"
    # Every full digit string submitted as (part of) an RC number this run —
    # none may ever appear in a 2xx /api/v1/businesses* response body.
    RAW_DIGITS = ["1234567", "98765", "4477119", "4567821", "5550001", "5550002", "7770001"]

    s, b, _ = cl_a.call("POST", "/api/v1/businesses", {"name": "Alpha RC Ltd", "rcNumber": RC_A})
    prof_a1 = (b.get("profile") or {})
    check("[B3] create 'RC 1234567' → 201 {profile} status UNVERIFIED",
          s == 201 and prof_a1.get("status") == "UNVERIFIED", f"got {s} {b}")
    check("[B4] masked rcHint (registry prefix + bullets)",
          bool(prof_a1.get("rcHint")) and prof_a1["rcHint"].startswith("RC ") and "•" in prof_a1["rcHint"],
          str(prof_a1.get("rcHint")))
    s, b, _ = cl_a.call("POST", "/api/v1/businesses", {"name": "Alpha BN Ltd", "rcNumber": RC_BN})
    check("[B5] create 'bn-98765' → 201 (dash/case-insensitive BN normalization)",
          s == 201 and (b.get("profile") or {}).get("rcHint", "").startswith("BN "),
          f"got {s} {b.get('profile')}")
    s, b, _ = cl_a.call("POST", "/api/v1/businesses", {"name": "Alpha Bare Ltd", "rcNumber": RC_BARE})
    check("[B6] bare '4477119' → 201 with the RC default registry",
          s == 201 and (b.get("profile") or {}).get("rcHint", "").startswith("RC "),
          f"got {s} {b.get('profile')}")
    s, b, _ = cl_a.call("POST", "/api/v1/businesses", {"name": "Alpha IT Ltd", "rcNumber": RC_IT})
    check("[B7] create 'IT 4567821' → 201 (IT series)",
          s == 201 and (b.get("profile") or {}).get("rcHint", "").startswith("IT "),
          f"got {s} {b.get('profile')}")

    s, b, _ = cl_a.call("POST", "/api/v1/businesses", {"name": "Alpha Dup", "rcNumber": "rc 1234567"})
    check("[B8] same normalization collision ('rc 1234567' after 'RC 1234567') → 409 DUPLICATE",
          s == 409 and errcode(b) == "DUPLICATE", f"got {s} {errcode(b)}")

    s, b, _ = cl_a.call("POST", "/api/v1/businesses", {"name": "Alpha Bad", "rcNumber": "RC AB"})
    check("[B9] malformed RC (no digit in tail) → 422 RC_MALFORMED",
          s == 422 and errcode(b) == "RC_MALFORMED", f"got {s} {errcode(b)}")
    s, b, _ = cl_a.call("POST", "/api/v1/businesses", {"name": "   ", "rcNumber": "RC 5550009"})
    check("[B10] empty name → 422 (validation)",
          s == 422 and errcode(b) in ("VALIDATION_ERROR", "NAME_INVALID"), f"got {s} {errcode(b)}")

    s, b, _ = cl_b.call("POST", "/api/v1/businesses", {"name": "Beta Cross Ltd", "rcNumber": RC_A})
    check("[B11] cross-account same RC ALLOWED → 201 (no provider = no adjudication)",
          s == 201 and (b.get("profile") or {}).get("status") == "UNVERIFIED", f"got {s} {b}")

    s, b, _ = cl_a.call("POST", "/api/v1/businesses", {"name": "Alpha Five", "rcNumber": "RC 5550001"})
    check("[B12] 5th profile → 201 (cap boundary)",
          s == 201, f"got {s} {errcode(b)}")
    s, b, _ = cl_a.call("POST", "/api/v1/businesses", {"name": "Alpha Six", "rcNumber": "RC 5550002"})
    check("[B13] 6th profile → 409 LIMIT_REACHED (cap 5)",
          s == 409 and errcode(b) == "LIMIT_REACHED", f"got {s} {errcode(b)}")

    s, b, _ = cl_a.call("PATCH", f"/api/v1/businesses/{prof_a1.get('id')}", {"name": "Alpha Renamed Ltd"})
    check("[B14] rename own profile → 200 {profile} with the new name",
          s == 200 and (b.get("profile") or {}).get("name") == "Alpha Renamed Ltd", f"got {s} {b}")
    s, b, _ = cl_b.call("PATCH", f"/api/v1/businesses/{prof_a1.get('id')}", {"name": "Stolen Name"})
    check("[B15] B renaming A's profile → 404 NOT_FOUND (owner-scoped)",
          s == 404 and errcode(b) == "NOT_FOUND", f"got {s} {errcode(b)}")
    s, b, _ = cl_b.call("DELETE", f"/api/v1/businesses/{prof_a1.get('id')}")
    check("[B16] B deleting A's profile → 404 NOT_FOUND",
          s == 404 and errcode(b) == "NOT_FOUND", f"got {s} {errcode(b)}")
    s, b, _ = cl_a.call("DELETE", f"/api/v1/businesses/{prof_a1.get('id')}")
    check("[B17] A deletes own profile → 200 {deleted:true}",
          s == 200 and b.get("deleted") is True, f"got {s} {b}")

    s, b, _ = cl_a.call("GET", "/api/v1/businesses")
    check("[B18] GET /businesses → 200 with A's remaining 4 profiles (masked)",
          s == 200 and len(b.get("profiles") or []) == 4, f"got {s} n={len(b.get('profiles') or [])}")

    # ---- NO-TRUST-SIGNAL invariant (the core honesty contract) -------------
    # Defined here, EXECUTED after section C so the sweep covers EVERY
    # /api/v1/businesses* response of the run (incl. the DSR fixture's create).
    def walk_keys(o):
        if isinstance(o, dict):
            for k, v in o.items():
                yield k
                yield from walk_keys(v)
        elif isinstance(o, list):
            for it in o:
                yield from walk_keys(it)

    def sweep_biz_invariant():
        print("\n== B-INV) G8 no-trust-signal invariant (sweep over EVERY businesses response) ==")
        BAD_KEY_SUBSTR = ("score", "band", "level", "trust")
        key_violations = []
        for meth, path, st, raw, parsed in BIZ_REC:
            for k in walk_keys(parsed):
                if any(sub in k.lower() for sub in BAD_KEY_SUBSTR):
                    key_violations.append((path, k))
        check("[B19] NO-TRUST-SIGNAL: no score/band/level/trust keys in ANY businesses response",
              not key_violations, str(key_violations[:6]))
        check("[B20] no rcFingerprint (or any fingerprint field) in any businesses response",
              all("fingerprint" not in (raw or "").lower() for _, _, _, raw, _ in BIZ_REC))

        # Raw RC digits may appear ONLY inside request payloads — never in a
        # 2xx response body (error bodies legitimately quote the app's own
        # example string, e.g. RC_MALFORMED guidance "e.g. RC 1234567").
        digit_hits = []
        for meth, path, st, raw, _parsed in BIZ_REC:
            if 200 <= st < 300:
                for d in RAW_DIGITS + BURST_DIGITS:
                    if d in (raw or ""):
                        digit_hits.append((path, st, d))
        check("[B21] no raw RC digit string in any 2xx businesses response (masked hint only)",
              not digit_hits, str(digit_hits[:6]))

        status_viol = []
        for meth, path, st, raw, parsed in BIZ_REC:
            if not (200 <= st < 300):
                continue
            profiles = ([parsed.get("profile")] if isinstance(parsed.get("profile"), dict) else []) \
                + (parsed.get("profiles") or [])
            for p in profiles:
                if p.get("status") != "UNVERIFIED":
                    status_viol.append((path, p.get("status")))
        check("[B22] every profile in every 2xx response is status UNVERIFIED (honesty by type)",
              not status_viol, str(status_viol[:4]))

    BURST_DIGITS = []

    # ---- rate limiter: 11 rapid creates in a FRESH window ------------------
    print("  ... sleeping 61s for a fresh business-create window (10/min limiter)")
    time.sleep(61)
    burst = []
    for i in range(11):
        rcn = f"99000{i:02d}"
        BURST_DIGITS.append(rcn)
        s, b, _ = cl_a.call("POST", "/api/v1/businesses",
                            {"name": f"Alpha Burst {i}", "rcNumber": rcn},
                            pace_it=False, retry_429=False)
        burst.append((s, errcode(b)))
    check("[B23] 11 rapid creates: the first ten pass the limiter (201/409, never 429)",
          all(s != 429 for s, _ in burst[:10]), str(burst))
    check("[B24] the 11th rapid create → 429 RATE_LIMITED (mirrors business-create 10/min)",
          burst[10][0] == 429 and burst[10][1] == "RATE_LIMITED", str(burst[10]))
    # "then pace the rest of the suite or sleep 60s once" — section C still
    # needs one business create for its DSR fixture.
    print("  ... sleeping 61s once (contract: pace the rest of the suite after the burst)")
    time.sleep(61)

    # =====================================================================
    print("\n== C) PR2 — DSR erasure-cascade invariant ==")
    # =====================================================================
    cl_c = Client()
    s, b, _ = cl_c.call("POST", "/api/v1/auth/register", {
        "displayName": C_NAME, "handle": C_HANDLE, "email": C_EMAIL,
        "password": C_PW, "acceptTerms": True,
    })
    C_ID = (b.get("user") or {}).get("id")
    check("[C1] fixture C registered → 201 {user}", s == 201 and bool(C_ID), f"got {s}")

    # Give C data across the identity spine: full verification + a business profile.
    sidc, codec, statec, s, b = run_verification(cl_c)
    check("[C2] C completes a full identity verification → 200 VERIFIED",
          s == 200 and (b.get("identity") or {}).get("status") == "VERIFIED", f"got {s} {errcode(b)}")
    s, b, _ = cl_c.call("POST", "/api/v1/businesses", {"name": "Cascade Ltd", "rcNumber": "RC 7770001"})
    check("[C3] C creates a business profile → 201 UNVERIFIED",
          s == 201 and (b.get("profile") or {}).get("status") == "UNVERIFIED", f"got {s}")

    # Now that every businesses response of the run has been recorded (B's
    # CRUD + burst + C's create), run the G8 honesty sweep.
    sweep_biz_invariant()

    r_pre = tmp("dsr-scan", C_ID)
    pre_rel = (r_pre or {}).get("byRelation") or {}
    check("[C4] pre-DSR: C actually HAS rows to cascade (identity + business + auth spine)",
          (r_pre or {}).get("userExists") is True
          and pre_rel.get("TrustIdentity") == 1
          and pre_rel.get("BusinessAccount") == 1
          and pre_rel.get("AuthIdentifier", 0) >= 2
          and pre_rel.get("Session", 0) >= 1
          and pre_rel.get("VerificationSession", 0) >= 1
          and pre_rel.get("Consent", 0) >= 1
          and pre_rel.get("Evidence", 0) >= 1
          and pre_rel.get("Notification", 0) >= 1,
          str({k: pre_rel.get(k) for k in ("TrustIdentity", "BusinessAccount", "AuthIdentifier",
                                           "Session", "VerificationSession", "Consent",
                                           "Evidence", "Notification")}))

    ada_before = tmp("ada-counts")
    check("[C5] negative-control baseline captured (ada present, untouched)",
          ada_before and ada_before.get("found") is True and bool(ada_before.get("userId")))

    s, b, _ = cl_c.call("POST", "/api/v1/passport/dsr", {"type": "EXPORT"})
    check("[C6] DSR EXPORT → 201 {requestId, bytes, expiresAt, downloadPath}",
          s == 201 and bool(b.get("requestId")) and (b.get("bytes") or 0) > 0
          and bool(b.get("expiresAt")) and bool(b.get("downloadPath")), f"got {s} {b}")
    check("[C6b] the EXPORT row is retained (DsrRequest count ≥ 1 pre-delete)",
          (tmp("dsr-scan", C_ID) or {}).get("byRelation", {}).get("DsrRequest", 0) >= 1)

    s, b, _ = cl_c.call("POST", "/api/v1/passport/dsr", {"type": "DELETE", "password": C_PW})
    check("[C7] DSR DELETE (password-confirmed) → 200 {deleted:true}",
          s == 200 and b.get("deleted") is True and bool(b.get("finalExport")), f"got {s} {b}")

    s, b, _ = cl_c.call("GET", "/api/v1/auth/me")
    check("[C8] C's session is dead after deletion → /auth/me 401",
          s == 401 and errcode(b) == "UNAUTHENTICATED", f"got {s} {errcode(b)}")

    # The INVARIANT: DMMF-driven zero-rows scan.
    r_post = tmp("dsr-scan", C_ID)
    post_rel = (r_post or {}).get("byRelation") or {}
    post_fn = (r_post or {}).get("byFieldName") or {}
    check("[C9] DMMF invariant (letter): every model with a `userId` field has 0 rows for C",
          all(v == 0 for v in post_fn.values()) and (r_post or {}).get("userIdFieldModels", 0) >= 17,
          str({k: v for k, v in post_fn.items() if v}))
    check("[C10] DMMF invariant (stronger): every UserAccount relation (ANY FK field name) has 0 rows",
          all(v == 0 for v in post_rel.values()) and (r_post or {}).get("userRelationModels", 0) >= 26,
          str({k: v for k, v in post_rel.items() if v}))
    check("[C11] the UserAccount row itself is gone",
          (r_post or {}).get("userExists") is False, str(r_post.get("userExists")))
    check("[C12] DsrRequest rows (incl. the DELETE flow's final export snapshot) cascade to 0",
          post_rel.get("DsrRequest") == 0, str(post_rel.get("DsrRequest")))
    check("[C13] AuditEvent tombstones survive by design (DSR_DELETE_COMPLETED exists for C)",
          (r_post or {}).get("tombstone", 0) >= 1 and (r_post or {}).get("auditEvents", 0) >= 1,
          str({k: (r_post or {}).get(k) for k in ("tombstone", "auditEvents")}))
    check("[C13b] every UserAccount relation in the schema is onDelete: Cascade (no silent survivors)",
          (r_post or {}).get("nonCascadeUserRelations") == [], str(r_post.get("nonCascadeUserRelations")))

    ada_after = tmp("ada-counts")
    same = (
        ada_before and ada_after
        and ada_before.get("userId") == ada_after.get("userId")
        and ada_before.get("byFieldName") == ada_after.get("byFieldName")
        and ada_before.get("byRelation") == ada_after.get("byRelation")
    )
    check("[C14] surgical cascade: ada's per-model row counts unchanged (before == after)", same,
          f"delta: { {k: v for k, v in (ada_after or {}).get('byRelation', {}).items() if (ada_before or {}).get('byRelation', {}).get(k) != v} }")

    # =====================================================================
    print("\n== cleanup ==")
    # =====================================================================
    r = tmp("cleanup-b2mx", C_ID)
    check("[cleanup] b2mx_* fixtures + C's audit tombstones deleted (best-effort)",
          r is not None and r.get("ok") is True, str(r))
    print(f"  [cleanup] handles deleted: {(r or {}).get('handles')}")
    print(f"  [cleanup] purged user ids: {len((r or {}).get('purgedUserIds') or [])}")
    residue = all(
        (lambda x: x and x.get("userExists") is False and all(v == 0 for v in (x.get("byRelation") or {}).values())
         and (x.get("auditEvents") or 0) == 0)(tmp("dsr-scan", uid))
        for uid in (A_ID, B_ID, C_ID) if uid
    )
    check("[cleanup] zero residue for A, B and C (all relation scans + audit rows empty)", residue)

    if not WITH_REG:
        print("\n== D) regressions (NOT in this run — ordering documented below) ==")
        print("  [SKIP] run `python3 tests/batch2_matrix.py --regressions-only` (or --with-regressions)")
        print("         for: stage2_matrix → sleep 75 → batch1_matrix → tsc → eslint.")

if REG_ONLY or WITH_REG:

    # =====================================================================
    print("\n== D) regressions (ordered; shared-IP rate windows) ==")
    # =====================================================================

    def run_cmd(cmd, timeout=900):
        print(f"  ... $ {' '.join(cmd)}")
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT, timeout=timeout)
        except subprocess.TimeoutExpired:
            print("      TIMEOUT")
            return 1, "", ""
        out = (r.stdout or "") + "\n" + (r.stderr or "")
        lines = [ln for ln in out.strip().splitlines() if ln.strip()]
        last = lines[-1] if lines else ""
        print(f"      exit={r.returncode}  last: {last[:110]}")
        if r.returncode != 0:
            for ln in (r.stderr or "").strip().splitlines()[:6]:
                print(f"      | {ln[:150]}")
        return r.returncode, last, out

    def result_counts(out):
        m = re.search(r"RESULT:\s*(\d+)\s*passed,\s*(\d+)\s*failed", out)
        m2 = re.search(r"(\d+)\s*passed,\s*(\d+)\s*failed", out)
        mm = m or m2
        return (int(mm.group(1)), int(mm.group(2))) if mm else (None, None)

    rc, last, out = run_cmd(["python3", "tests/stage2_matrix.py"], timeout=600)
    p, f = result_counts(out)
    check("[D1] stage2_matrix regression → exit 0, 0 failed (≥36 checks)", rc == 0 and f == 0 and (p or 0) >= 36,
          f"exit={rc} counts={p}/{f}")

    print("  ... sleeping 75s (documented shared-IP rate-window collision rule)")
    time.sleep(75)

    rc, last, out = run_cmd(["python3", "tests/batch1_matrix.py"], timeout=600)
    p, f = result_counts(out)
    check("[D2] batch1_matrix regression (API catalog drift guard) → exit 0, 0 failed",
          rc == 0 and f == 0 and (p or 0) >= 25, f"exit={rc} counts={p}/{f}")

    rc, _, _ = run_cmd(["bunx", "tsc", "--noEmit"], timeout=600)
    check("[D3] bunx tsc --noEmit → 0 errors", rc == 0, f"exit={rc}")

    rc, _, _ = run_cmd(["bun", "run", "lint"], timeout=600)
    check("[D4] bun run lint (eslint .) → clean", rc == 0, f"exit={rc}")

print(f"\n===== RESULT: {PASS} passed, {FAIL} failed =====")
sys.exit(1 if FAIL else 0)
