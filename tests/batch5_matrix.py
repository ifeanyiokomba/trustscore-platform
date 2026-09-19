#!/usr/bin/env python3
"""TrustScore Batch 5 — Trust Passport 2.0 (Task ID: 3) contract test matrix.

Sections (contract in worklog "Task ID: 3"):

  1) Version catalog — /api/health v1.16.0 "Stage 17" + the analytics route
     registered in the /api index (batch1's drift guard walks disk vs index).
  2) Receipts richness — /passport/me receipts carry shareTokenId +
     linked-token status/scopes (join by id; null when the token is gone),
     shown.confidence, and a receiptsStats block (total + per-channel counts
     verified against direct sqlite). Revocation flips linkStatus to REVOKED.
  3) Share-link analytics — GET /api/v1/passport/share/:id/analytics (owner
     only): 200 shape, views/viewsLeft, uniqueViewers == COUNT(DISTINCT
     ipHash) via direct sqlite (hash VALUES never in any response),
     firstViewedAt == earliest receipt viewedAt, opensByChannel,
     firstOpenLatencyMinutes, anti-enumeration 404 (other user + unknown id
     indistinguishable), unauth 401, zero-open state, and the
     SHARE_ANALYTICS_VIEWED audit event with tokenId-only metadata.
  4) Freshness nudges — backdated credential expiresAt through sqlite then
     /passport/me: "Credential expired" / "Credential expiring soon"
     VERIFICATION notifications with LABEL-ONLY bodies (no masked refs, no
     raw values), deduped on the second read; government identity 90-day
     horizon nudge ("Government identity expiring soon").
  5) EMAIL_VERIFIED credential — derived for ada (verified-email fixture)
     with an honest label + masked emailHint, platform issuer, displayed as a
     SUPPORTING credential (not scored — the Verified Credentials component
     counts only the 3 core types, so the stage5 score contract stays
     byte-stable); ABSENT for an identity-verified
     user whose account email is UNVERIFIED (bob); manual revoke sticks and
     is never resurrected by re-sync.
  6) Deterministic cleanup — b5mx_* fixtures removed; ada's EMAIL_VERIFIED
     credential row deleted so the next sync re-issues it ACTIVE (stage5's
     fixture_reset convention).

Rate-limit pressure is PACED (login 8/min, register 10/min, identity-session
5/min, consent/callback 12/min, share-create 10/min) instead of relied upon.
ada is modified only through documented fixture-reset-style cleanup.

Run: python3 tests/batch5_matrix.py   (dev server on :3000)
"""

from datetime import datetime
import http.cookiejar
import os
import json
import secrets
import sqlite3
import sys
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:3000"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "db", "custom.db")
PASS = 0
FAIL = 0
SUF = secrets.token_hex(4)

NU_EMAIL = f"b5mx.nudge.{SUF}@example.com"   # freshness-nudge fixture
BOB_EMAIL = f"b5mx.bob.{SUF}@example.com"    # unverified-email + analytics 404
ADA_EMAIL = "ada@example.com"
ADA_PW = "SuperSecret1"
PW = "Batch5Secret1"
ID_SCOPES = ["identity.basic", "identity.nin_status"]

# ---------------------------------------------------------------------------
# House helpers (batch2_matrix style): cookie-jar client + per-scope pacing
# for the in-memory fixed-window limiter.
# ---------------------------------------------------------------------------

SCOPE_LIMITS = {
    ("/api/v1/auth/login", "POST"): ("login", 8, 60),
    ("/api/v1/auth/register", "POST"): ("register", 10, 60),
    ("/api/v1/identity/sessions", "POST"): ("identity-session", 5, 60),
    ("/api/v1/passport/share", "POST"): ("share-create", 10, 60),
}
_ID_PATH_RE = __import__("re").compile(r"^/api/v1/identity/sessions/[^/]+/(consent|callback)$")

_windows = {}


def scope_of(method, path):
    if (path, method) in SCOPE_LIMITS:
        return SCOPE_LIMITS[(path, method)]
    m = _ID_PATH_RE.match(path)
    if m:
        return ("identity-consent", 12, 60) if m.group(1) == "consent" else ("identity-callback", 12, 60)
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


class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def call(self, method, path, body=None, pace_it=True, raw=False):
        if pace_it:
            pace(method, path)
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method)
        if data:
            req.add_header("Content-Type", "application/json")
        try:
            with self.op.open(req, timeout=60) as res:
                txt = res.read().decode()
                if raw:
                    return res.status, txt
                return res.status, _jload(txt)
        except urllib.error.HTTPError as e:
            txt = e.read().decode()
            if raw:
                return e.code, txt
            return e.code, _jload(txt)
        except Exception as e:
            return 0, {"error": {"code": "CONNECTION_FAILED", "message": str(e)}}


def _jload(txt):
    try:
        return json.loads(txt or "{}")
    except Exception:
        return {}


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


def db_exec(fn):
    con = sqlite3.connect(DB, timeout=30)
    try:
        return fn(con)
    finally:
        con.commit()
        con.close()


def db_user_id(email):
    return db_exec(lambda con: (
        lambda row: row[0] if row else None
    )(con.execute("SELECT id FROM UserAccount WHERE email=?", (email,)).fetchone()))


def register(op, email, handle, name):
    s, b = op.call("POST", "/api/v1/auth/register", {
        "email": email, "password": PW, "displayName": name,
        "handle": handle, "acceptTerms": True,
    })
    assert s == 201, f"register failed {s} {b}"
    return b.get("user") or {}


def verify_identity(op):
    s, b = op.call("POST", "/api/v1/identity/sessions", {"scopes": ID_SCOPES})
    assert s == 201, f"session create {s} {b}"
    sid = (b.get("session") or {}).get("id")
    s, b = op.call("POST", f"/api/v1/identity/sessions/{sid}/consent", {"decision": "GRANT"})
    code, state = b.get("code"), b.get("state")
    assert s == 200 and code and state, f"consent {s} {b}"
    s, b = op.call("POST", f"/api/v1/identity/sessions/{sid}/callback", {"code": code, "state": state})
    assert s == 200, f"callback {s} {b}"


def iso_ms(iso):
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000.0
    except Exception:
        return None


def notes_of(op, title):
    s, b = op.call("GET", "/api/v1/passport/notifications", pace_it=False)
    if s != 200:
        return []
    return [n for n in b.get("notifications", []) if n.get("title") == title]


# ---------------------------------------------------------------------------
print("== 1) version catalog + route registration ==")
ADA = Client()
s, b = ADA.call("POST", "/api/v1/auth/login", {"email": ADA_EMAIL, "password": ADA_PW})
assert s == 200, f"ada login failed {s} {b}"
s, h = ADA.call("GET", "/api/health", pace_it=False)
check("health: v1.16.0 + Stage 17", s == 200 and h.get("version") == "1.16.0"
      and "17" in h.get("stage", "") and "Passport 2.0" in h.get("stage", ""), str(h)[:120])
s, idx = ADA.call("GET", "/api", pace_it=False)
check("api index: analytics route registered (disk↔index closed)",
      s == 200 and any(e.get("path") == "/api/v1/passport/share/:id/analytics" for e in idx.get("endpoints", [])))

# ---------------------------------------------------------------------------
print("== 2) receipts richness (shareTokenId + linkage + channel + confidence) ==")
s, tok = ADA.call("POST", "/api/v1/passport/share", {
    "ttlHours": 1, "maxViews": 3, "scopes": ["PROFILE", "SCORE"],
})
assert s == 201, f"share create {s} {tok}"
raw_token, tok_id = tok.get("token", ""), tok.get("id", "")

ANON = Client()
s, _ = ANON.call("GET", f"/api/v1/passport/public/{raw_token}", pace_it=False)
assert s == 200, f"public open 1 failed {s}"
s, _ = ANON.call("GET", f"/api/v1/passport/public/{raw_token}", pace_it=False)
assert s == 200, f"public open 2 failed {s}"

ada_id = db_user_id(ADA_EMAIL)
s, p = ADA.call("GET", "/api/v1/passport/me", pace_it=False)
check("/passport/me 200 with receipts", s == 200 and isinstance(p.get("receipts"), list))
receipts = p.get("receipts", [])
check("every receipt carries shareTokenId/linkStatus/linkScopes (additive)",
      receipts and all(("shareTokenId" in r and "linkStatus" in r and "linkScopes" in r) for r in receipts))
newest = next((r for r in receipts if r.get("shareTokenId") == tok_id), None)
check("newest TRUST_LINK receipt links the token (viewerLabel + channel)",
      newest is not None and newest.get("channel") == "TRUST_LINK"
      and newest.get("viewerLabel") == "Trust link viewer", str(newest)[:160])
check("linked token live: linkStatus ACTIVE + scopes disclosed",
      newest is not None and newest.get("linkStatus") == "ACTIVE"
      and sorted(newest.get("linkScopes") or []) == ["PROFILE", "SCORE"])
check("receipt shows the confidence the viewer saw",
      newest is not None and isinstance((newest.get("shown") or {}).get("confidence"), int))
stats = p.get("receiptsStats") or {}
sq_total, sq_channels = db_exec(lambda con: (
    con.execute("SELECT COUNT(*) FROM TrustReceipt WHERE userId=?", (ada_id,)).fetchone()[0],
    {row[0]: row[1] for row in con.execute(
        "SELECT channel, COUNT(*) FROM TrustReceipt WHERE userId=? GROUP BY channel", (ada_id,)).fetchall()},
))
check("receiptsStats.total == sqlite count", stats.get("total") == sq_total,
      f"got={stats.get('total')} want={sq_total}")
check("receiptsStats.byChannel == sqlite group-by", (stats.get("byChannel") or {}) == sq_channels,
      f"got={stats.get('byChannel')} want={sq_channels}")

s, _ = ADA.call("DELETE", f"/api/v1/passport/share/{tok_id}", pace_it=False)
assert s == 200, f"revoke failed {s}"
s, p = ADA.call("GET", "/api/v1/passport/me", pace_it=False)
dead = next((r for r in p.get("receipts", []) if r.get("shareTokenId") == tok_id), None)
check("revoked link flips the receipt linkStatus to REVOKED",
      dead is not None and dead.get("linkStatus") == "REVOKED")

# ---------------------------------------------------------------------------
print("== 3) share-link analytics (owner-only, receipts-derived) ==")
s, tok2 = ADA.call("POST", "/api/v1/passport/share", {
    "ttlHours": 1, "maxViews": 4, "scopes": ["PROFILE", "SCORE", "SIGNALS"],
})
assert s == 201, f"share create 2 failed {s} {tok2}"
s, _ = ANON.call("GET", f"/api/v1/passport/public/{tok2.get('token', '')}", pace_it=False)
assert s == 200, f"public open (tok2) failed {s}"
s, _ = ANON.call("GET", f"/api/v1/passport/public/{tok2.get('token', '')}", pace_it=False)
assert s == 200, f"public open 2 (tok2) failed {s}"

s, body = ADA.call("GET", f"/api/v1/passport/share/{tok2.get('id', '')}/analytics", pace_it=False)
a = (body or {}).get("analytics") or {}
SHAPE = ("tokenId", "scopes", "status", "maxViews", "views", "viewsLeft", "lastViewedAt",
         "createdAt", "expiresAt", "revokedAt", "firstViewedAt", "uniqueViewers",
         "opensByChannel", "recentOpens", "firstOpenLatencyMinutes")
check("analytics 200 + full shape", s == 200 and all(k in a for k in SHAPE),
      f"s={s} keys={sorted(a.keys())}")
check("views/derived viewsLeft correct", a.get("views") == 2 and a.get("viewsLeft") == 2
      and a.get("maxViews") == 4, str({k: a.get(k) for k in ('views', 'viewsLeft', 'maxViews')}))

sq = db_exec(lambda con: (
    con.execute("SELECT COUNT(DISTINCT ipHash) FROM TrustReceipt WHERE shareTokenId=?", (tok2.get("id", ""),)).fetchone()[0],
    con.execute("SELECT MIN(viewedAt) FROM TrustReceipt WHERE shareTokenId=?", (tok2.get("id", ""),)).fetchone()[0],
    [r[0] for r in con.execute("SELECT DISTINCT ipHash FROM TrustReceipt WHERE shareTokenId=?", (tok2.get("id", ""),)).fetchall()],
))
uniq_sql, min_viewed, hashes = sq
check("uniqueViewers == COUNT(DISTINCT ipHash) (direct sqlite)",
      a.get("uniqueViewers") == uniq_sql and uniq_sql >= 1,
      f"got={a.get('uniqueViewers')} want={uniq_sql}")
check("firstViewedAt == earliest receipt viewedAt",
      a.get("firstViewedAt") is not None and min_viewed is not None
      and iso_ms(a["firstViewedAt"]) is not None
      and abs(iso_ms(a["firstViewedAt"]) - min_viewed) < 2000,
      f"got={a.get('firstViewedAt')} want={min_viewed}")
check("opensByChannel counts the two link opens",
      (a.get("opensByChannel") or {}).get("TRUST_LINK") == 2, str(a.get("opensByChannel")))
check("recentOpens[20] carries viewedAt/channel/viewerLabel",
      isinstance(a.get("recentOpens"), list) and len(a["recentOpens"]) == 2
      and all(set(("viewedAt", "channel", "viewerLabel")) <= set(o) for o in a["recentOpens"]))
check("firstOpenLatencyMinutes is a non-negative int",
      isinstance(a.get("firstOpenLatencyMinutes"), int) and a["firstOpenLatencyMinutes"] >= 0)
check("status derived (ACTIVE while views < max and TTL live)", a.get("status") == "ACTIVE")

s, a_raw = ADA.call("GET", f"/api/v1/passport/share/{tok2.get('id', '')}/analytics", pace_it=False, raw=True)
check("ipHash VALUES never appear in the analytics response",
      all((h or "") not in a_raw for h in hashes) and "ipHash" not in a_raw)

BOB = Client()
register(BOB, BOB_EMAIL, f"b5mx_bob_{SUF}", "Batch5 Matrix Bob")
verify_identity(BOB)
s, b = BOB.call("GET", f"/api/v1/passport/share/{tok2.get('id', '')}/analytics", pace_it=False)
check("other user's link -> 404 NOT_FOUND (anti-enumeration)",
      s == 404 and (b.get("error") or {}).get("code") == "NOT_FOUND", f"s={s}")
s, b = Client().call("GET", f"/api/v1/passport/share/{tok2.get('id', '')}/analytics", pace_it=False)
check("analytics unauthenticated -> 401", s == 401, f"s={s}")
s, b = ADA.call("GET", "/api/v1/passport/share/cmunknownid12345/analytics", pace_it=False)
check("unknown id -> 404 (indistinguishable)", s == 404, f"s={s}")

aud = db_exec(lambda con: con.execute(
    "SELECT metadata FROM AuditEvent WHERE action='SHARE_ANALYTICS_VIEWED' AND subjectId=? ORDER BY createdAt DESC LIMIT 1",
    (tok2.get("id", ""),)).fetchone())
aud_meta = _jload(aud[0]) if aud else {}
check("audit SHARE_ANALYTICS_VIEWED with tokenId-only metadata",
      aud is not None and aud_meta.get("tokenId") == tok2.get("id"), str(aud_meta))

s, b = BOB.call("POST", "/api/v1/passport/share", {"ttlHours": 1, "maxViews": 2})
zero_id = (b.get("id") if s == 201 else "")
s, z_body = BOB.call("GET", f"/api/v1/passport/share/{zero_id}/analytics", pace_it=False)
z = (z_body or {}).get("analytics") or {}
check("zero-open analytics: nulls + empty collections",
      s == 200 and z.get("views") == 0 and z.get("uniqueViewers") == 0
      and z.get("firstViewedAt") is None and z.get("firstOpenLatencyMinutes") is None
      and z.get("recentOpens") == [], str(z)[:120])

# ---------------------------------------------------------------------------
print("== 4) freshness nudges (backdated horizons through sqlite) ==")
NU = Client()
register(NU, NU_EMAIL, f"b5mx_nu_{SUF}", "Batch5 Matrix Nudge")
verify_identity(NU)
nu_id = db_user_id(NU_EMAIL)

s, p = NU.call("GET", "/api/v1/passport/me", pace_it=False)
nu_creds = p.get("credentials", [])
check("baseline: identity-verified user has GOV credential only (email unverified)",
      [c.get("type") for c in nu_creds] == ["GOV_ID_VERIFIED"]
      and nu_creds[0].get("status") == "ACTIVE", str([c.get("type") for c in nu_creds]))
check("no freshness nudge before any horizon shrinks",
      not notes_of(NU, "Credential expired") and not notes_of(NU, "Credential expiring soon"))

past_ms = int((time.time() - 3 * 86400) * 1000)
db_exec(lambda con: con.execute(
    "UPDATE Credential SET expiresAt=? WHERE userId=? AND type='GOV_ID_VERIFIED'", (past_ms, nu_id)))
s, p = NU.call("GET", "/api/v1/passport/me", pace_it=False)
gov = next((c for c in p.get("credentials", []) if c.get("type") == "GOV_ID_VERIFIED"), {})
check("backdated credential surfaces EXPIRED in the read model",
      gov.get("status") == "EXPIRED", str(gov)[:140])
exp_notes = notes_of(NU, "Credential expired")
check("nudge: 'Credential expired' VERIFICATION notification fires",
      len(exp_notes) == 1 and exp_notes[0].get("type") == "VERIFICATION", str(len(exp_notes)))
check("nudge body is LABEL-ONLY (no masked refs / raw values)",
      bool(exp_notes) and "Government identity verified" in exp_notes[0].get("body", "")
      and "NINAUTH-" not in exp_notes[0].get("body", ""), str(exp_notes[:1])[:140])

s, _ = NU.call("GET", "/api/v1/passport/me", pace_it=False)
s, _ = NU.call("GET", "/api/v1/passport/me", pace_it=False)
check("dedupe: repeated reads do NOT re-issue the same nudge",
      len(notes_of(NU, "Credential expired")) == 1)

soon_ms = int((time.time() + 7 * 86400) * 1000)
db_exec(lambda con: con.execute(
    "UPDATE Credential SET expiresAt=? WHERE userId=? AND type='GOV_ID_VERIFIED'", (soon_ms, nu_id)))
s, _ = NU.call("GET", "/api/v1/passport/me", pace_it=False)
check("nudge: 'Credential expiring soon' (<= 14d horizon)",
      len(notes_of(NU, "Credential expiring soon")) == 1)

gov_soon_ms = int((time.time() + 5 * 86400) * 1000)
db_exec(lambda con: con.execute(
    "UPDATE TrustIdentity SET expiresAt=? WHERE userId=?", (gov_soon_ms, nu_id)))
s, _ = NU.call("GET", "/api/v1/passport/me", pace_it=False)
check("nudge: 'Government identity expiring soon' (90-day horizon inside 14d)",
      len(notes_of(NU, "Government identity expiring soon")) == 1)

# ---------------------------------------------------------------------------
print("== 5) EMAIL_VERIFIED credential (ada has it; unverified-email user does not) ==")
s, p = ADA.call("GET", "/api/v1/passport/me", pace_it=False)
em = next((c for c in p.get("credentials", []) if c.get("type") == "EMAIL_VERIFIED"), None)
check("ada's EMAIL_VERIFIED derived (honest label + platform issuer)",
      em is not None and em.get("label") == "Email address verified"
      and em.get("issuer") == "TrustScore Platform" and em.get("status") == "ACTIVE",
      str(em)[:140])
check("claims carry only the masked emailHint",
      em is not None and "••" in str((em.get("claims") or {}).get("emailHint", ""))
      and ADA_EMAIL not in json.dumps(em.get("claims") or {}), str(em and em.get("claims")))
sc = {c["key"]: c for c in (p.get("score") or {}).get("components", [])}
CORE_TYPES = {"GOV_ID_VERIFIED", "PHONE_VERIFIED", "LIVENESS_VERIFIED"}
n_core = len([c for c in p.get("credentials", [])
              if c.get("status") == "ACTIVE" and c.get("type") in CORE_TYPES])
check("core-only credential math holds with the email row present (6x, cap 20)",
      sc.get("verifiedCredentials", {}).get("value") == min(6 * n_core, 20),
      f"core={n_core} got={sc.get('verifiedCredentials', {}).get('value')}")
check("EMAIL_VERIFIED is displayed but NOT scored (supporting)",
      em is not None and em.get("status") == "ACTIVE"
      and sc.get("verifiedCredentials", {}).get("value") == min(6 * n_core, 20)
      and n_core < len([c for c in p.get("credentials", []) if c.get("status") == "ACTIVE"]),
      f"core={n_core}")
check("/passport/me score subset (status/score/riskBand/fresh)",
      all(k in (p.get("score") or {}) for k in ("status", "score", "confidence", "riskBand", "fresh")))

s, b = ADA.call("POST", f"/api/v1/passport/credentials/{(em or {}).get('id', 'x')}/revoke", pace_it=False)
check("EMAIL_VERIFIED manual revoke -> 200", s == 200 and em is not None, f"s={s}")
s, p = ADA.call("GET", "/api/v1/passport/me", pace_it=False)
em2 = next((c for c in p.get("credentials", []) if c.get("type") == "EMAIL_VERIFIED"), {})
check("credential REVOKED + manual flag", em2.get("status") == "REVOKED"
      and em2.get("manualRevoked") is True, str(em2)[:120])
s, _ = ADA.call("GET", "/api/v1/passport/me", pace_it=False)
s, p = ADA.call("GET", "/api/v1/passport/me", pace_it=False)
em3 = next((c for c in p.get("credentials", []) if c.get("type") == "EMAIL_VERIFIED"), {})
check("no resurrection on re-sync (source still live)",
      em3.get("status") == "REVOKED" and em3.get("manualRevoked") is True)

s, bp = BOB.call("GET", "/api/v1/passport/me", pace_it=False)
bob_types = [c.get("type") for c in bp.get("credentials", [])]
check("unverified-email user has NO EMAIL_VERIFIED credential",
      "EMAIL_VERIFIED" not in bob_types, str(bob_types))

# ---------------------------------------------------------------------------
print("== 6) deterministic cleanup ==")
ids = [i for i in (db_user_id(NU_EMAIL), db_user_id(BOB_EMAIL)) if i]
qmarks = ",".join("?" for _ in ids)


def _cleanup(con):
    if ids:
        con.execute(f"DELETE FROM TrustReceipt WHERE userId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM ShareToken WHERE userId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM TrustScoreSnapshot WHERE userId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM Credential WHERE userId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM IdentityIdentifier WHERE trustIdentityId IN (SELECT id FROM TrustIdentity WHERE userId IN ({qmarks}))", ids)
        con.execute(f"DELETE FROM IdentityAttribute WHERE trustIdentityId IN (SELECT id FROM TrustIdentity WHERE userId IN ({qmarks}))", ids)
        con.execute(f"DELETE FROM Evidence WHERE userId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM VerificationSession WHERE userId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM Consent WHERE userId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM AuthIdentifier WHERE userId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM Notification WHERE userId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM Session WHERE userId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM AuditEvent WHERE actorId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM TrustIdentity WHERE userId IN ({qmarks})", ids)
        con.execute(f"DELETE FROM UserAccount WHERE id IN ({qmarks})", ids)
    # ada fixture reset (stage5 convention): drop the EMAIL row so the next
    # sync re-issues it ACTIVE.
    con.execute("DELETE FROM Credential WHERE type='EMAIL_VERIFIED' AND userId=?",
                (db_user_id(ADA_EMAIL) or "",))


db_exec(_cleanup)
left = db_exec(lambda con: con.execute(
    f"SELECT COUNT(*) FROM UserAccount WHERE id IN ({qmarks})", ids).fetchone()[0] if ids else 0)
ada_email_row = db_exec(lambda con: con.execute(
    "SELECT COUNT(*) FROM Credential WHERE type='EMAIL_VERIFIED' AND userId=?",
    (db_user_id(ADA_EMAIL) or "",)).fetchone()[0])
check("b5mx fixtures removed + ada's EMAIL row reset for re-issue",
      left == 0 and ada_email_row == 0, f"users={left} ada_email_row={ada_email_row}")

print(f"\n===== RESULT: {PASS} passed, {FAIL} failed =====")
sys.exit(1 if FAIL else 0)
