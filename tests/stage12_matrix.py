#!/usr/bin/env python3
"""TrustScore Stage 12 — Transparency & Alerting contract test matrix.
Covers: the public policy-explainer feed (engine/public read contract for the
landing section), material score-drop receipts (exactly-one SCORE
notification on a material downward move — points, band, or adverse status;
NONE on initial/periodic/small drops/increases; freeze path never notifies;
overturned appeal restores without a receipt), receipt↔history consistency
(the receipt numbers match the score-history change), the notification feed
shape for SCORE type, the internal webhook-tick endpoint (token gate,
method gate, bounded success), the webhook-worker mini-service health, and
deterministic cleanup."""
import json
import os
import re
import time
import urllib.request
import urllib.error
import http.cookiejar
import sqlite3

BASE = "http://127.0.0.1:3000"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "db", "custom.db")
PASS = 0
FAIL = 0

def client():
    cj = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def call(op, method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with op.open(req, timeout=30) as res:
            return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}

def callr(op, method, path, body=None, headers=None):
    """Retry-aware call: waits out shared-IP rate windows."""
    for attempt in range(4):
        s, b = call(op, method, path, body, headers)
        if s == 429 and (b.get("error") or {}).get("code") == "RATE_LIMITED":
            time.sleep(62)
            continue
        return s, b
    return s, b

def raw_call(method, url, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.build_opener().open(req, timeout=15) as res:
            return res.status, json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}
    except (urllib.error.URLError, ConnectionError, OSError):
        return 0, {}

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
    email = f"stage12_{tag}_{stamp}@example.com"
    s, b = callr(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1",
        "displayName": "Stage Twelve", "handle": f"s12_{tag}_{stamp}",
        "acceptTerms": True,
    })
    assert s == 201, f"register failed {s} {b}"
    return email, f"s12_{tag}_{stamp}"

def verify_identity(op):
    s, b = callr(op, "POST", "/api/v1/identity/sessions", {})
    assert s == 201, f"session create {s} {b}"
    sid = b["session"]["id"]
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/consent", {
        "decision": "GRANT", "scopes": ["identity.basic", "identity.nin_status"],
    })
    assert s == 200, f"consent {s} {b}"
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/callback", {
        "code": b["code"], "state": b["state"],
    })
    assert s == 200, f"callback {s} {b}"

def verify_phone(op, phone):
    s, b = callr(op, "POST", "/api/v1/identity/signals/phone/start", {"phone": phone})
    assert s == 201, f"phone start {s} {b}"
    vid = b["verification"]["id"]
    code = extract_code(b["delivery"]["message"])
    s, b = call(op, "POST", "/api/v1/identity/signals/phone/confirm", {
        "verificationId": vid, "code": code,
    })
    assert s == 200, f"phone confirm {s} {b}"

def promote_reviewer(email):
    con = sqlite3.connect(DB, timeout=30)
    con.execute("UPDATE UserAccount SET role='REVIEWER' WHERE email=?", (email,))
    con.commit()
    con.close()

def db_user_id(email):
    con = sqlite3.connect(DB, timeout=30)
    row = con.execute("SELECT id FROM UserAccount WHERE email=?", (email,)).fetchone()
    con.close()
    return row[0] if row else None

def score_state(op):
    s, b = call(op, "GET", "/api/v1/passport/me")
    if s != 200:
        return {}
    sc = b.get("score", {})
    return {"score": sc.get("score"), "status": sc.get("status"), "band": sc.get("riskBand"),
            "state": sc.get("state"), "comps": {c["key"]: c["value"] for c in sc.get("components", [])}}

def score_notifications(op):
    s, b = call(op, "GET", "/api/v1/passport/notifications")
    if s != 200:
        return []
    return [n for n in b.get("notifications", []) if n.get("type") == "SCORE"]

def flag_body(handle):
    return {
        "subjectHandle": handle,
        "category": "FRAUD",
        "description": ("Paid for a laptop on a marketplace listing and the seller went "
                        "silent after the transfer. Chat logs and transfer receipts available."),
        "evidence": [
            {"kind": "TEXT", "content": "Marketplace order #71231 from March, chat export with timestamps."},
            {"kind": "LINK", "content": "https://chat.example/threads/71231"},
        ],
    }

TICK = {"x-internal-token": "ts-internal-webhook-tick-v1"}

# ---------------------------------------------------------------------------
print("== 1) public policy explainer feed (landing #scoring data source) ==")
s, b = raw_call("GET", f"{BASE}/api/v1/engine/public")
check("engine/public reachable WITHOUT a session", s == 200)
rules = (b.get("activePolicy") or {}).get("rules") or {}
check("active policy carries rules (v1 budgets)", b.get("activePolicy", {}).get("version") == 1
      and rules.get("assuranceBase") == [0, 20, 34, 47, 60]
      and rules.get("riskPenaltyPer") == 25 and rules.get("snapshotTtlHours") == 24)
check("governance language present (rules-first)", "public by design" in b.get("language", ""))
check("automated significant decisions stay gated OFF",
      b.get("automatedSignificantDecisions") is False)
check("policy history + DPIA registry present",
      len(b.get("policyHistory", [])) >= 1 and len(b.get("dpiRegistry", [])) >= 1)

# ---------------------------------------------------------------------------
print("== 2) setup: victim (L2+phone), reporter (L2), reviewer ==")
victim_op, reporter_op, reviewer_op = client(), client(), client()
victim_email, victim_handle = register(victim_op, "victim")
reporter_email, reporter_handle = register(reporter_op, "reporter")
reviewer_email, _ = register(reviewer_op, "reviewer")
verify_identity(victim_op)
verify_phone(victim_op, "0803 555 0102")
verify_identity(reporter_op)
verify_phone(reporter_op, "0803 555 0103")  # flags require L2 (identity + phone)
promote_reviewer(reviewer_email)
victim_id = db_user_id(victim_email)

# ---------------------------------------------------------------------------
print("== 3) baseline: INITIAL snapshot, NO receipt ==")
sc = score_state(victim_op)
check("victim baseline score 46 (L2 34 + gov id 6 + phone 6)", sc.get("score") == 46, str(sc))
check("baseline status ESTABLISHED / band LOW", sc.get("status") == "ESTABLISHED" and sc.get("band") == "LOW")
check("INITIAL snapshot produced NO score receipt", len(score_notifications(victim_op)) == 0)
s, b = call(victim_op, "GET", "/api/v1/passport/score-history")
check("history: 2 snapshots (post-identity, post-phone), 1 change (34 -> 46)",
      len(b.get("history", [])) == 2 and len(b.get("changes", [])) == 1
      and (b.get("changes") or [{}])[0].get("toScore") == 46)

# ---------------------------------------------------------------------------
print("== 4) material drop receipt: flag -> CONFIRMED (-25) ==")
s, b = callr(reporter_op, "POST", "/api/v1/reputation/flags", flag_body(victim_handle))
check("reporter files flag -> 201", s == 201)
flag_id = b.get("flagId", "")
s, b = callr(victim_op, "POST", f"/api/v1/reputation/flags/{flag_id}/respond", {
    "response": "I never received any payment claim — this order was refunded and I can share the receipt.",
})
check("victim responds -> UNDER_REVIEW", s == 200)
s, b = callr(reviewer_op, "POST", f"/api/v1/reputation/review/{flag_id}/decision", {
    "outcome": "CONFIRMED",
    "rationale": "Transfer receipts and chat logs corroborate the reporter's account of the silent seller.",
})
check("reviewer CONFIRMS -> 200", s == 200 and b.get("outcome") == "DECIDED")

sc = score_state(victim_op)
check("score dropped 46 -> 21", sc.get("score") == 21, str(sc))
check("status/band now adverse (REVIEW_REQUIRED/HIGH)",
      sc.get("status") == "REVIEW_REQUIRED" and sc.get("band") == "HIGH")
receipts = score_notifications(victim_op)
check("exactly ONE SCORE receipt", len(receipts) == 1, str(len(receipts)))
r0 = receipts[0] if receipts else {}
check("receipt title carries from -> to numbers",
      r0.get("title", "") == "TrustScore change: 46 → 21 (−25)", str(r0.get("title")))
check("receipt body points at Score Insights + appeal rights",
      "Score Insights" in r0.get("body", "") and "appealable" in r0.get("body", "")
      and "down 25 points" in r0.get("body", ""))
check("receipt body notes band/status reason too",
      "risk band moved up" in r0.get("body", "") and "adverse state" in r0.get("body", ""))

s, b = call(victim_op, "GET", "/api/v1/passport/score-history")
chg = (b.get("changes") or [{}])[-1]
check("history latest change matches receipt (46 -> 21)",
      chg.get("fromScore") == 46 and chg.get("toScore") == 21 and chg.get("delta") == -25)
comp = [d for d in chg.get("componentDeltas", []) if d.get("key") == "confirmedRisk"]
check("component delta: confirmedRisk -25", comp and comp[0].get("delta") == -25)

# periodic re-read with unchanged inputs -> still exactly one receipt
score_state(victim_op)
score_state(victim_op)
check("periodic re-reads do NOT duplicate receipts", len(score_notifications(victim_op)) == 1)

# ---------------------------------------------------------------------------
print("== 5) freeze path: appeal -> FROZEN verbatim, no receipts while frozen ==")
s, b = callr(victim_op, "POST", f"/api/v1/reputation/flags/{flag_id}/appeal", {
    "reason": "The refund receipt proves the order never went silent — the reporter's claim is mistaken.",
})
check("victim appeals -> 200", s == 200 and b.get("outcome") == "APPEALED")
sc = score_state(victim_op)
check("snapshot served FROZEN verbatim (score 21)", sc.get("state") == "FROZEN" and sc.get("score") == 21)
check("no receipt minted while frozen", len(score_notifications(victim_op)) == 1)

s, b = call(reviewer_op, "GET", "/api/v1/reputation/review")
appeals = [a for a in b.get("appeals", []) if a.get("flag", {}).get("id") == flag_id]
check("appeal lands in reviewer queue", len(appeals) == 1)

# ---------------------------------------------------------------------------
print("== 6) overturned appeal: score restored, NO receipt (increase) ==")
s, b = callr(reviewer_op, "POST", f"/api/v1/reputation/appeals/{appeals[0]['id']}/decision", {
    "outcome": "OVERTURNED",
    "note": "Refund correspondence supports the appellant — the reversal originated from a reporter-side account dispute.",
})
check("appeal OVERTURNED -> 200", s == 200 and b.get("appealStatus") == "OVERTURNED")
sc = score_state(victim_op)
check("score restored 48 (risk removed, +2 cleared)", sc.get("score") == 48, str(sc))
check("restored band/status LOW/ESTABLISHED", sc.get("band") == "LOW" and sc.get("status") == "ESTABLISHED")
check("recovery (increase) does NOT notify", len(score_notifications(victim_op)) == 1)

# ---------------------------------------------------------------------------
print("== 7) small drop (credential lapse -6) does NOT notify ==")
# Simulate exactly what syncCredentials does when the phone source lapses:
# the identifier expiry passes and the shadow credential is REVOKED (the
# hash tracks [type, status, manualRevoked] — status drives the recompute).
con = sqlite3.connect(DB, timeout=30)
con.execute("UPDATE IdentityIdentifier SET expiresAt = (CAST(strftime('%s','now') AS INTEGER) - 1000) * 1000 "
            "WHERE trustIdentityId IN (SELECT id FROM TrustIdentity WHERE userId=?) AND type='PHONE'", (victim_id,))
con.execute("UPDATE Credential SET status='REVOKED', revokedAt=(CAST(strftime('%s','now') AS INTEGER) * 1000) "
            "WHERE userId=? AND type='PHONE_VERIFIED'", (victim_id,))
con.commit()
con.close()
sc = score_state(victim_op)
check("phone lapse drops score -6 (42)", sc.get("score") == 42, str(sc))
check("sub-material drop (-6) does NOT notify", len(score_notifications(victim_op)) == 1)
s, b = call(victim_op, "GET", "/api/v1/passport/score-history")
chg = (b.get("changes") or [{}])[-1]
check("history records the small drop (48 -> 42)", chg.get("fromScore") == 48 and chg.get("toScore") == 42)

# ---------------------------------------------------------------------------
print("== 8) notification feed shape for SCORE type ==")
s, b = call(victim_op, "GET", "/api/v1/passport/notifications")
notes = b.get("notifications", [])
check("feed lists the SCORE receipt with unread counter",
      any(n.get("type") == "SCORE" for n in notes) and b.get("unread", 0) >= 1)
score_note = [n for n in notes if n.get("type") == "SCORE"][0]
s, b = call(victim_op, "POST", "/api/v1/passport/notifications", {"id": score_note["id"]})
check("marking the receipt read -> 200", s == 200 and b.get("marked") == 1)
s, b = call(victim_op, "GET", "/api/v1/passport/notifications")
score_note2 = [n for n in b.get("notifications", []) if n.get("type") == "SCORE"][0]
check("receipt readAt set after mark", score_note2.get("readAt") is not None)

# ---------------------------------------------------------------------------
print("== 9) internal webhook-tick endpoint (worker timing source) ==")
s, b = raw_call("POST", f"{BASE}/api/v1/internal/webhook-tick")
check("tick without token -> 403 FORBIDDEN", s == 403 and errcode(b) == "FORBIDDEN")
s, b = raw_call("POST", f"{BASE}/api/v1/internal/webhook-tick", {}, {"x-internal-token": "wrong"})
check("tick with wrong token -> 403", s == 403 and errcode(b) == "FORBIDDEN")
s, b = raw_call("GET", f"{BASE}/api/v1/internal/webhook-tick")
check("GET tick -> 405 METHOD_NOT_ALLOWED", s == 405 and errcode(b) == "METHOD_NOT_ALLOWED")
s, b = raw_call("POST", f"{BASE}/api/v1/internal/webhook-tick", None, TICK)
check("tick with internal token -> 200 bounded result",
      s == 200 and isinstance(b.get("processed"), int) and b.get("processed") >= 0)
s, b = raw_call("GET", "http://127.0.0.1:3031/health")
check("webhook-worker health on :3031", s == 200 and b.get("ok") is True
      and b.get("service") == "webhook-worker" and b.get("ticks", 0) >= 0, str(b)[:120])
if s != 200:
    print("  (worker not reachable — start it: cd mini-services/webhook-worker && bun run dev)")

# ---------------------------------------------------------------------------
print("== 10) deterministic cleanup ==")
ids = []
for em in (victim_email, reporter_email, reviewer_email):
    uid = db_user_id(em)
    if uid:
        ids.append(uid)
qmarks = ",".join("?" for _ in ids)
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM TrustEdge WHERE aUserId IN (%s) OR bUserId IN (%s)" % (qmarks, qmarks), ids + ids)
con.execute("DELETE FROM SharedSignal WHERE subjectUserId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM NetworkMembership WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM TrustReceipt WHERE userId IN (%s)" % qmarks, ids)
con.execute("DELETE FROM SafetyCheck WHERE verifierId IN (%s) OR subjectId IN (%s)" % (qmarks, qmarks), ids + ids)
con.execute("DELETE FROM FlagEvidence WHERE flagId IN (SELECT id FROM Flag WHERE reporterId IN (%s) OR subjectId IN (%s))" % (qmarks, qmarks), ids + ids)
con.execute("DELETE FROM FlagResolution WHERE flagId IN (SELECT id FROM Flag WHERE reporterId IN (%s) OR subjectId IN (%s))" % (qmarks, qmarks), ids + ids)
con.execute("DELETE FROM FlagAppeal WHERE flagId IN (SELECT id FROM Flag WHERE reporterId IN (%s) OR subjectId IN (%s))" % (qmarks, qmarks), ids + ids)
con.execute("DELETE FROM Flag WHERE reporterId IN (%s) OR subjectId IN (%s)" % (qmarks, qmarks), ids + ids)
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
m = con.execute("SELECT COUNT(*) FROM Notification WHERE userId IN (%s)" % qmarks, ids).fetchone()[0]
con.close()
check("test users + notifications removed (orphan-free)", n == 0 and m == 0)

print(f"\n===== RESULT: {PASS} pass / {FAIL} fail =====")
if FAIL:
    raise SystemExit(1)
