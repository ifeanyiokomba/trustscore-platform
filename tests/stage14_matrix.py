#!/usr/bin/env python3
"""TrustScore Stage 14 — Transport observability contract test matrix.
Covers: the persisted transport snapshot history (per provider, written by the
internal tick and the admin "snapshot now" action), the circuit transition
audit trail (trip / half-open / re-trip / recovered / reset with reason
codes), sustained-open alerting (admin-tunable threshold, one alert per
episode, dedupe, recovery notifications, MOCK-posture honesty guard), admin
authorization on every new endpoint, the internal tick's observability leg,
audit trail coverage, and deterministic cleanup (posture/fault/threshold
restored, test-window rows removed)."""
import json
import os
import time
import urllib.request
import urllib.error
import http.cookiejar
import sqlite3
from datetime import datetime, timezone

BASE = "http://127.0.0.1:3000"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "db", "custom.db")
PASS = 0
FAIL = 0
# Prisma stores SQLite DateTime as 'YYYY-MM-DDTHH:MM:SS.mmmZ' — match exactly
# so string comparisons in cleanup are correct.
TEST_START = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

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

def register(op, tag):
    stamp = int(time.time() * 1000) % 1_000_000_000
    email = f"stage14_{tag}_{stamp}@example.com"
    s, b = callr(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1",
        "displayName": "Stage Fourteen", "handle": f"s14_{tag}_{stamp}",
        "acceptTerms": True,
    })
    assert s == 201, f"register failed {s} {b}"
    return email, f"s14_{tag}_{stamp}"

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

def history_of(op):
    s, b = call(op, "GET", "/api/v1/engine/admin/providers/history")
    return b if s == 200 else {}

def provider_history(op, key):
    for p in history_of(op).get("providers", []):
        if p["key"] == key:
            return p
    return {}

def latest_snapshot_at(op, key):
    """Newest snapshot timestamp for a provider (history is capped at 60 —
    the COUNT plateaus, so series advancement is checked by timestamp)."""
    snaps = provider_history(op, key).get("snapshots", [])
    return snaps[-1]["createdAt"] if snaps else ""

def set_fault(op, key, mode):
    return call(op, "POST", f"/api/v1/engine/admin/providers/{key}/fault", {"mode": mode})

def set_posture(op, posture):
    return call(op, "PUT", "/api/v1/engine/admin/providers", {"posture": posture})

def set_threshold(op, ms):
    return call(op, "PUT", "/api/v1/engine/admin/providers/alerting", {"sustainedMs": ms})

def snapshot_now(op):
    return call(op, "POST", "/api/v1/engine/admin/providers/history")

def db_count(sql, args=()):
    con = sqlite3.connect(DB, timeout=30)
    n = con.execute(sql, args).fetchone()[0]
    con.close()
    return n

def db_rows(sql, args=()):
    con = sqlite3.connect(DB, timeout=30)
    rows = con.execute(sql, args).fetchall()
    con.close()
    return rows

# ---------------------------------------------------------------------------
print("== 1) version catalog ==")
s, b = call(client(), "GET", "/api/health")
check("health reports Stage 15 / v1.14.0",
      s == 200 and b.get("version") == "1.14.0" and "15" in b.get("stage", ""),
      str(b.get("stage")))
s, b = call(client(), "GET", "/api")
paths = {(e["method"], e["path"]) for e in b.get("endpoints", [])}
check("api index: v1.14.0 + Stage 15", b.get("version") == "1.14.0" and "15" in b.get("stage", ""))
check("api index catalogs the 4 observability endpoints",
      ("GET", "/api/v1/engine/admin/providers/history") in paths
      and ("POST", "/api/v1/engine/admin/providers/history") in paths
      and ("GET", "/api/v1/engine/admin/providers/alerting") in paths
      and ("PUT", "/api/v1/engine/admin/providers/alerting") in paths)
check("api index roadmap marks 14 shipped",
      "14" in b.get("roadmap", {}) and "13" in b.get("roadmap", {}))

# ---------------------------------------------------------------------------
print("== 2) admin authorization on the observability endpoints ==")
anon = client()
member_op = client()
member_email, member_handle = register(member_op, "member")
admin_op = client()
admin_email, admin_handle = register(admin_op, "admin")
promote_admin(admin_email)
admin_id = db_user_id(admin_email)

s, b = call(anon, "GET", "/api/v1/engine/admin/providers/history")
check("history GET unauthenticated -> 401", s == 401 and errcode(b) == "UNAUTHENTICATED")
s, b = call(anon, "POST", "/api/v1/engine/admin/providers/history")
check("history POST unauthenticated -> 401", s == 401 and errcode(b) == "UNAUTHENTICATED")
s, b = call(member_op, "GET", "/api/v1/engine/admin/providers/history")
check("history GET non-admin -> 403", s == 403 and errcode(b) == "FORBIDDEN")
s, b = call(member_op, "POST", "/api/v1/engine/admin/providers/history")
check("history POST non-admin -> 403 (cannot force snapshots)", s == 403)
s, b = call(member_op, "PUT", "/api/v1/engine/admin/providers/alerting", {"sustainedMs": 30000})
check("alerting PUT non-admin -> 403 (cannot tune alerts)", s == 403)
s, b = call(admin_op, "GET", "/api/v1/engine/admin/providers/alerting")
check("alerting GET admin -> 200 with bounds",
      s == 200 and b.get("minSustainedMs") == 5000 and b.get("maxSustainedMs") == 600000)

# Pre-flight (idempotent entry): normalize posture/faults/circuits/threshold.
b0 = admin_get(admin_op)
if b0.get("posture") != "mock":
    if b0.get("posture") == "loopback":
        set_fault(admin_op, "ninauth", "none")
    for key in ("ninauth", "phone", "liveness"):
        call(admin_op, "POST", f"/api/v1/engine/admin/providers/{key}/reset")
    set_posture(admin_op, "mock")
    time.sleep(6)  # posture cache TTL is 5s
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM PlatformSetting WHERE key IN ('transport.alert.sustainedMs','transport.alerts')")
con.commit()
con.close()

# ---------------------------------------------------------------------------
print("== 3) history read model shape ==")
b = history_of(admin_op)
check("history: 3 providers with snapshot/event arrays",
      [p["key"] for p in b.get("providers", [])] == ["ninauth", "phone", "liveness"]
      and all("snapshots" in p and "events" in p and "alert" in p for p in b.get("providers", [])))
check("history: default threshold 45s + posture echoed",
      b.get("sustainedMs") == 45000 and b.get("defaultSustainedMs") == 45000
      and b.get("posture") == "mock")
latest_before = latest_snapshot_at(admin_op, "ninauth")

# ---------------------------------------------------------------------------
print("== 4) snapshot persistence (admin action + audit) ==")
s, b = snapshot_now(admin_op)
check("POST history -> tick result with 3 snapshots",
      s == 200 and (b.get("tick") or {}).get("snapshotsPersisted") == 3, str(b.get("tick")))
latest_after = latest_snapshot_at(admin_op, "ninauth")
check("ninauth snapshot series advances (timestamp, not the capped count)",
      latest_after > latest_before, f"{latest_before} -> {latest_after}")
n = db_count("SELECT COUNT(*) FROM TransportSnapshot WHERE provider='ninauth'")
check("TransportSnapshot rows persisted in the DB", n >= 1, str(n))
actions = {r[0] for r in db_rows(
    "SELECT action FROM AuditEvent WHERE actorId=? ORDER BY createdAt DESC LIMIT 20", (admin_id,))}
check("audit records TRANSPORT_SNAPSHOT_TAKEN", "TRANSPORT_SNAPSHOT_TAKEN" in actions)

# ---------------------------------------------------------------------------
print("== 5) internal tick carries the observability leg ==")
s, b = call(client(), "POST", "/api/v1/internal/webhook-tick", {})
check("tick without token -> 403", s == 403)
s, b = call(client(), "POST", "/api/v1/internal/webhook-tick",
            None, {"x-internal-token": "wrong-token"})
check("tick with bad token -> 403", s == 403)
s, b = call(client(), "POST", "/api/v1/internal/webhook-tick",
            None, {"x-internal-token": "ts-internal-webhook-tick-v1"})
check("tick with token -> observability shape (snapshots/events/alerts/recoveries)",
      s == 200 and "observability" in b
      and set(b["observability"].keys()) >= {"snapshotsPersisted", "eventsPersisted", "alertsRaised", "recoveriesSent"},
      str(b.get("observability")))

# ---------------------------------------------------------------------------
print("== 6) circuit trip -> transition audit trail (loopback) ==")
set_threshold(admin_op, 6000)  # fast threshold for the test
s, b = set_posture(admin_op, "loopback")
check("posture -> loopback", s == 200 and b.get("posture") == "loopback")
set_fault(admin_op, "ninauth", "error")
trip_codes = []
for i in range(3):
    s, b = callr(admin_op, "POST", "/api/v1/identity/sessions", {"scopes": ["identity.basic"]})
    trip_codes.append(errcode(b) if s != 201 else "OK")
check("3 faulted starts -> honest 503 PROVIDER_UNAVAILABLE each",
      trip_codes == ["PROVIDER_UNAVAILABLE"] * 3, str(trip_codes))
t = transport_of(admin_op, "ninauth")
check("ninauth circuit OPEN with episode start tracked",
      t.get("circuit") == "OPEN" and isinstance(t.get("firstTripAt"), (int, float)))
trip_epoch = t.get("firstTripAt")
s, b = callr(admin_op, "POST", "/api/v1/identity/sessions", {"scopes": ["identity.basic"]})
check("fail-fast while OPEN (no wire wait)",
      s in (503, 429) and (errcode(b) == "PROVIDER_UNAVAILABLE" or errcode(b) == "RATE_LIMITED"))
if errcode(b) == "RATE_LIMITED":
    time.sleep(62)
    s, b = callr(admin_op, "POST", "/api/v1/identity/sessions", {"scopes": ["identity.basic"]})
    check("fail-fast after rate window (CIRCUIT_OPEN surfaced)",
          s == 503 and errcode(b) == "PROVIDER_UNAVAILABLE")
snapshot_now(admin_op)  # drain transitions -> CircuitEvent rows
rows = db_rows(
    "SELECT fromState, toState, reason FROM CircuitEvent WHERE provider='ninauth' "
    "AND toState='OPEN' ORDER BY createdAt DESC LIMIT 3")
check("CircuitEvent rows: CLOSED -> OPEN with the transport error code",
      any(r[0] == "CLOSED" and r[1] == "OPEN" and r[2] in ("PROVIDER_HTTP_ERROR", "RETRIES_EXHAUSTED")
          for r in rows), str(rows))

# ---------------------------------------------------------------------------
print("== 7) sustained-open alert + dedupe ==")
wait_ms = 7000 - min(7000, int(time.time() * 1000 - trip_epoch))
time.sleep(max(1.5, wait_ms / 1000) + 0.5)
s, b = snapshot_now(admin_op)  # evaluate (worker tick may have done it first — DB is truth)
episode = provider_history(admin_op, "ninauth").get("alert") or {}
check("alert episode recorded with alertedAt set (>= 6s sustained)",
      episode.get("alertedAt") is not None and episode.get("firstTripAt") is not None,
      str(episode))
n_alert = db_count(
    "SELECT COUNT(*) FROM Notification WHERE type='SYSTEM' "
    "AND title='Provider circuit sustained open — ninauth'")
check("sustained-open SYSTEM notification created for admins", n_alert >= 1, str(n_alert))
s, b = snapshot_now(admin_op)
n_alert2 = db_count(
    "SELECT COUNT(*) FROM Notification WHERE type='SYSTEM' "
    "AND title='Provider circuit sustained open — ninauth'")
check("dedupe: re-evaluation does NOT re-alert the same episode",
      (b.get("tick") or {}).get("alertsRaised") == [] and n_alert2 == n_alert,
      f"tick={b.get('tick')} {n_alert}->{n_alert2}")

# ---------------------------------------------------------------------------
print("== 8) recovery: half-open probe succeeds -> recovery note ==")
set_fault(admin_op, "ninauth", "none")
elapsed = time.time() * 1000 - trip_epoch
if elapsed < 21500:
    time.sleep((21500 - elapsed) / 1000 + 0.5)
s, b = callr(admin_op, "POST", "/api/v1/identity/sessions", {"scopes": ["identity.basic"]})
check("half-open probe succeeds after the fault clears",
      s == 201 and b["session"]["provider"] == "NINAUTH_LOOPBACK")
t = transport_of(admin_op, "ninauth")
check("circuit CLOSED after the successful probe", t.get("circuit") == "CLOSED")
snapshot_now(admin_op)
rows = db_rows(
    "SELECT fromState, toState, reason FROM CircuitEvent WHERE provider='ninauth' "
    "AND toState='CLOSED' ORDER BY createdAt DESC LIMIT 2")
check("CircuitEvent row: OPEN -> CLOSED reason SUCCESS",
      any(r[0] in ("OPEN", "HALF_OPEN") and r[1] == "CLOSED" and r[2] == "SUCCESS" for r in rows),
      str(rows))
n_rec = db_count(
    "SELECT COUNT(*) FROM Notification WHERE type='SYSTEM' "
    "AND title='Provider circuit recovered — ninauth'")
check("recovery SYSTEM notification created", n_rec >= 1, str(n_rec))
episode = provider_history(admin_op, "ninauth").get("alert")
check("alert episode cleared after recovery", episode is None, str(episode))

# ---------------------------------------------------------------------------
print("== 9) MOCK honesty: an open circuit never alerts in mock posture ==")
# Second episode: trip in loopback, flip to mock BEFORE the threshold elapses.
set_fault(admin_op, "ninauth", "error")
time.sleep(62)  # identity-session rate window (5/60s, shared IP)
codes = []
for i in range(3):
    s, b = callr(admin_op, "POST", "/api/v1/identity/sessions", {"scopes": ["identity.basic"]})
    codes.append(errcode(b) if s != 201 else "OK")
check("second trip: 3 faulted starts -> 503 each", codes == ["PROVIDER_UNAVAILABLE"] * 3, str(codes))
t = transport_of(admin_op, "ninauth")
trip2 = t.get("firstTripAt")
set_posture(admin_op, "mock")
time.sleep(6)  # posture cache TTL
time.sleep(7.5)  # past the 6s threshold — but posture is mock now
snapshot_now(admin_op)
episode = provider_history(admin_op, "ninauth").get("alert") or {}
check("episode tracked but NOT alerted in mock posture (no wire traffic to be unhealthy)",
      episode.get("alertedAt") is None and episode.get("firstTripAt") is not None, str(episode))
n_alert_b = db_count(
    "SELECT COUNT(*) FROM Notification WHERE type='SYSTEM' "
    "AND title='Provider circuit sustained open — ninauth'")
check("no second alert notification created for the mock episode",
      n_alert_b == n_alert2, f"{n_alert2} -> {n_alert_b}")
s, b = call(admin_op, "POST", "/api/v1/engine/admin/providers/ninauth/reset")
check("reset works from mock posture (circuit normalized)",
      s == 200 and b.get("transport", {}).get("circuit") == "CLOSED")
snapshot_now(admin_op)
episode = provider_history(admin_op, "ninauth").get("alert")
check("un-alerted episode cleared quietly on reset (no recovery note)",
      episode is None, str(episode))
n_rec_b = db_count(
    "SELECT COUNT(*) FROM Notification WHERE type='SYSTEM' "
    "AND title='Provider circuit recovered — ninauth'")
check("no spurious recovery notification for the mock episode", n_rec_b == n_rec, f"{n_rec} -> {n_rec_b}")

# ---------------------------------------------------------------------------
print("== 10) threshold validation contract ==")
s, b = set_threshold(admin_op, 100)
check("threshold below floor -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = set_threshold(admin_op, 700000)
check("threshold above ceiling -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(admin_op, "PUT", "/api/v1/engine/admin/providers/alerting", {"sustainedMs": "fast"})
check("threshold non-integer -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(admin_op, "PUT", "/api/v1/engine/admin/providers/alerting", {"bogus": 1})
check("threshold unknown field -> 422 (strict schema)", s == 422)
s, b = set_threshold(admin_op, 30000)
check("threshold 30s accepted + echoed", s == 200 and b.get("sustainedMs") == 30000)
b = history_of(admin_op)
check("history read model reflects the tuned threshold", b.get("sustainedMs") == 30000)
actions = {r[0] for r in db_rows(
    "SELECT action FROM AuditEvent WHERE actorId=? ORDER BY createdAt DESC LIMIT 20", (admin_id,))}
check("audit records PROVIDER_ALERTING_CHANGED", "PROVIDER_ALERTING_CHANGED" in actions)

# ---------------------------------------------------------------------------
print("== 11) restore mock + labeling revert (regression guard) ==")
set_fault(admin_op, "ninauth", "none")
for key in ("ninauth", "phone", "liveness"):
    call(admin_op, "POST", f"/api/v1/engine/admin/providers/{key}/reset")
s, b = set_posture(admin_op, "mock")
check("posture restored to mock", s == 200 and b.get("posture") == "mock")
b = admin_get(admin_op)
check("MOCK labels preserved (stages 2-4 regression guard)",
      all(p.get("providerName") in ("NINAUTH_MOCK", "SMS_MOCK", "LIVENESS_MOCK")
          and p.get("mode") == "MOCK" for p in b.get("providers", [])))

# ---------------------------------------------------------------------------
print("== 12) deterministic cleanup ==")
# Restore through the API first (cache invalidation), then remove the rows so
# the next read falls back to the honest defaults (45s threshold, no episodes).
set_threshold(admin_op, 45000)
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM PlatformSetting WHERE key IN ('transport.alert.sustainedMs','transport.alerts')")
con.commit()
con.close()
# Test-window observability rows + cross-admin alert notifications.
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM TransportSnapshot WHERE createdAt >= ?", (TEST_START,))
con.execute("DELETE FROM CircuitEvent WHERE createdAt >= ?", (TEST_START,))
con.execute("DELETE FROM Notification WHERE title IN "
            "('Provider circuit sustained open — ninauth','Provider circuit recovered — ninauth') "
            "AND createdAt >= ?", (TEST_START,))
con.commit()
con.close()
# Test users + their data (stage13 pattern).
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
p = con.execute("SELECT COUNT(*) FROM PlatformSetting WHERE key LIKE 'transport.%'").fetchone()[0]
snaps = con.execute("SELECT COUNT(*) FROM TransportSnapshot WHERE createdAt >= ?", (TEST_START,)).fetchone()[0]
evts = con.execute("SELECT COUNT(*) FROM CircuitEvent WHERE createdAt >= ?", (TEST_START,)).fetchone()[0]
notes = con.execute("SELECT COUNT(*) FROM Notification WHERE title LIKE 'Provider circuit%' AND createdAt >= ?", (TEST_START,)).fetchone()[0]
con.close()
check("test users + transport settings + test-window rows removed",
      n == 0 and p == 0 and snaps == 0 and evts == 0 and notes == 0,
      f"users={n} settings={p} snaps={snaps} evts={evts} notes={notes}")

print(f"\n===== RESULT: {PASS} pass / {FAIL} fail =====")
if FAIL:
    raise SystemExit(1)
