#!/usr/bin/env python3
"""TrustScore Stage 11 — Score Insights contract test matrix.
Covers: session-auth on the history + export routes; the snapshot-history
read model (INITIAL → MATERIAL_CHANGE chain, component deltas between
consecutive snapshots, audited window events with fixed labels, policy
provenance chips); summary/spark series; self-service CSV/JSON export
(headers, body shape, invalid-format fallback, SCORE_HISTORY_EXPORTED audit
+ activity-feed surfacing + PII-disciplined metadata); user isolation;
FROZEN/RETIRED lifecycle in history across the appeal freeze-on-appeal flow;
per-user rate limits; DSR integration; deterministic cleanup."""
import json
import os
import re
import time
import urllib.request
import http.cookiejar
import sqlite3

BASE = "http://127.0.0.1:3000"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "db", "custom.db")
PASS = 0
FAIL = 0
RUN = int(time.time() * 1000) % 1_000_000_000

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
            return res.status, res.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def callj(op, method, path, body=None):
    s, raw = call(op, method, path, body)
    try:
        return s, json.loads(raw or "{}")
    except Exception:
        return s, {}

def callr(op, method, path, body=None):
    """Retry-aware call: waits out shared-IP rate windows."""
    for attempt in range(4):
        s, b = callj(op, method, path, body)
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
    email = f"stage11_{tag}_{stamp}@example.com"
    s, b = callr(op, "POST", "/api/v1/auth/register", {
        "email": email,
        "password": "password123",
        "handle": f"s11_{tag}_{stamp}",
        "displayName": f"S11 {tag.title()}",
        "acceptTerms": True,
    })
    assert s == 201, f"register failed {s} {b}"
    return email, f"s11_{tag}_{stamp}"

def db_user_id(email):
    con = sqlite3.connect(DB, timeout=30)
    row = con.execute("SELECT id FROM UserAccount WHERE email=?", (email,)).fetchone()
    con.close()
    return row[0] if row else None

def verify_identity(op, scopes=None):
    body = {"scopes": scopes} if scopes else {}
    s, b = callr(op, "POST", "/api/v1/identity/sessions", body)
    assert s == 201, f"session create {s} {b}"
    sid = b["session"]["id"]
    s, b = callj(op, "POST", f"/api/v1/identity/sessions/{sid}/consent", {
        "decision": "GRANT",
        "scopes": scopes or ["identity.basic", "identity.nin_status"],
    })
    assert s == 200, f"consent {s} {b}"
    s, b = callj(op, "POST", f"/api/v1/identity/sessions/{sid}/callback", {
        "code": b["code"], "state": b["state"],
    })
    assert s == 200, f"callback {s} {b}"

def verify_phone(op, phone):
    s, b = callr(op, "POST", "/api/v1/identity/signals/phone/start", {"phone": phone})
    assert s == 201, f"phone start {s} {b}"
    vid = b["verification"]["id"]
    code = extract_code(b["delivery"]["message"])
    s, b = callj(op, "POST", "/api/v1/identity/signals/phone/confirm", {
        "verificationId": vid, "code": code,
    })
    assert s == 200, f"phone confirm {s} {b}"

HIST_CALLS = {}

def history(op):
    key = id(op)
    HIST_CALLS[key] = HIST_CALLS.get(key, 0) + 1
    s, b = callr(op, "GET", "/api/v1/passport/score-history")
    return s, b

COMPONENT_ORDER = ["identityAssurance", "verifiedCredentials", "verifiedReputation",
                   "resolutionHistory", "confirmedRisk"]

anon = client()

# ----------------------------------------------------------- 0) auth gates
print("== 0) session auth gates ==")
s, b = callj(anon, "GET", "/api/v1/passport/score-history")
check("history without session -> 401 UNAUTHENTICATED", s == 401 and errcode(b) == "UNAUTHENTICATED")
s, raw = call(anon, "GET", "/api/v1/passport/score-history/export?format=csv")
check("export without session -> 401 UNAUTHENTICATED", s == 401 and "UNAUTHENTICATED" in raw)

# --------------------------------------------------- 1) initial snapshot
print("== 1) initial snapshot ==")
u1 = client()
u1_email, u1_handle = register(u1, "u1")
callr(u1, "GET", "/api/v1/passport/me")  # mints the INITIAL snapshot
s, b = history(u1)
check("history -> 200", s == 200)
sm = b.get("summary", {})
check("one snapshot, zero changes", sm.get("snapshotCount") == 1 and sm.get("changeCount") == 0)
check("INITIAL trigger on the first snapshot", b["history"][0].get("trigger") == "INITIAL")
check("snapshot names the active policy version", b["history"][0].get("policyVersion") == 1)
check("snapshot state ACTIVE", b["history"][0].get("state") in ("ACTIVE",))
check("spark mirrors history", [p["score"] for p in b.get("spark", [])] ==
      [h["score"] for h in b.get("history", [])])
check("summary min=max=first=latest, net 0",
      sm.get("minScore") == sm.get("maxScore") == sm.get("firstScore") == sm.get("latestScore")
      and sm.get("netChange") == 0)
check("snapshot carries the five components", [c["key"] for c in b["history"][0]["components"]] == COMPONENT_ORDER)
check("snapshot has no PII fields", set(b["history"][0].keys()) ==
      {"id", "version", "score", "confidence", "status", "riskBand", "trigger",
       "computedAt", "state", "policyVersion", "components"})

# ------------------------------------- 2) identity change -> first delta
print("== 2) identity change -> first change record ==")
verify_identity(u1)
callr(u1, "GET", "/api/v1/passport/me")
s, b = history(u1)
sm = b.get("summary", {})
check("two snapshots, one change", sm.get("snapshotCount") == 2 and sm.get("changeCount") == 1)
ch = b["changes"][0]
check("change delta positive", ch.get("delta", 0) > 0)
check("change trigger MATERIAL_CHANGE", ch.get("trigger") == "MATERIAL_CHANGE")
check("policyChanged false within v1", ch.get("policyChanged") is False)
check("both policies named v1", ch.get("fromPolicy") == 1 and ch.get("toPolicy") == 1)
comps = {d["key"]: d for d in ch.get("componentDeltas", [])}
check("componentDeltas in engine order", [d["key"] for d in ch["componentDeltas"]] == COMPONENT_ORDER)
check("identityAssurance moved (0 -> 20)", comps["identityAssurance"]["from"] == 0
      and comps["identityAssurance"]["to"] == 20)
check("verifiedCredentials moved (0 -> 6)", comps["verifiedCredentials"]["from"] == 0
      and comps["verifiedCredentials"]["to"] == 6)
evs = ch.get("events", [])
check("window events recorded (3)", ch.get("eventCount") == 3)
check("IDENTITY_VERIFIED in window", any(e["action"] == "IDENTITY_VERIFIED" for e in evs))
check("event labels are fixed strings (no raw identifiers)",
      all(isinstance(e.get("label"), str) and "@" not in e["label"] for e in evs))
check("IDENTITY_VERIFIED maps to identityAssurance",
      any(e["action"] == "IDENTITY_VERIFIED" and e["componentKey"] == "identityAssurance" for e in evs))
check("change has no PII beyond fixed fields", set(ch.keys()) >= {"id", "fromScore", "toScore", "delta"}
      and all(k in {"id", "computedAt", "fromScore", "toScore", "delta", "fromConfidence",
                    "toConfidence", "trigger", "fromPolicy", "toPolicy", "policyChanged",
                    "state", "componentDeltas", "events", "eventCount"} for k in ch.keys()))
raw = json.dumps(b)
check("payload carries no email or handle", u1_email not in raw and u1_handle not in raw)

# -------------------------------------- 3) phone change -> second delta
print("== 3) phone change -> second change record ==")
verify_phone(u1, f"0803 555 {RUN % 10000:04d}")
callr(u1, "GET", "/api/v1/passport/me")
s, b = history(u1)
sm = b.get("summary", {})
check("three snapshots, two changes", sm.get("snapshotCount") == 3 and sm.get("changeCount") == 2)
ch2 = b["changes"][1]
evs2 = ch2.get("events", [])
check("SIGNAL_PHONE_VERIFIED in second window only",
      any(e["action"] == "SIGNAL_PHONE_VERIFIED" for e in evs2)
      and not any(e["action"] == "SIGNAL_PHONE_VERIFIED" for e in b["changes"][0]["events"]))
check("SIGNAL_PHONE_VERIFIED maps to verifiedCredentials",
      any(e["action"] == "SIGNAL_PHONE_VERIFIED" and e["componentKey"] == "verifiedCredentials" for e in evs2))
check("identityAssurance 20 -> 34 after phone",
      {d["key"]: d for d in ch2["componentDeltas"]}["identityAssurance"]["from"] == 20
      and {d["key"]: d for d in ch2["componentDeltas"]}["identityAssurance"]["to"] == 34)
check("summary net = latest - first", sm.get("netChange") == sm.get("latestScore", 0) - sm.get("firstScore", 0))
check("two up-changes counted", sm.get("upChanges") == 2 and sm.get("downChanges") == 0)
check("summary min/max across series", sm.get("minScore") == 0 and sm.get("maxScore") == sm.get("latestScore"))
check("changes chronological (oldest first)",
      b["changes"][0]["computedAt"] <= b["changes"][1]["computedAt"])
check("spark ascending 3 points", [p["score"] for p in b["spark"]] ==
      sorted(p["score"] for p in b["spark"]))

# -------------------------------------------------- 4) user isolation
print("== 4) per-user isolation ==")
u2 = client()
u2_email, u2_handle = register(u2, "u2")
callr(u2, "GET", "/api/v1/passport/me")
s, b2 = history(u2)
check("u2 sees only its own single snapshot", b2["summary"].get("snapshotCount") == 1)
raw2 = json.dumps(b2)
check("u1's identifiers never leak into u2's history", u1_email not in raw2 and u1_handle not in raw2)

# -------------------------------------------------- 5) exports
print("== 5) CSV / JSON export ==")
s, raw = call(u1, "GET", "/api/v1/passport/score-history/export?format=csv")
lines = raw.strip().split("\n")
check("CSV -> 200 with 4 lines (header + 3 snapshots)", s == 200 and len(lines) == 4)
check("CSV header exact", lines[0] ==
      "computedAt,score,confidence,status,riskBand,trigger,state,policyVersion,"
      "identityAssurance,verifiedCredentials,verifiedReputation,resolutionHistory,confirmedRisk")
row = lines[1].split(",")
check("CSV first row = INITIAL score 0", row[1] == "0" and row[5] == "INITIAL")
last = lines[3].split(",")
check("CSV last row policy v1 + components", last[7] == "1" and last[9] == "12")
s, raw = call(u1, "GET", "/api/v1/passport/score-history/export?format=xml")
check("invalid format falls back to CSV", s == 200 and raw.startswith("computedAt,"))
s, raw = call(u1, "GET", "/api/v1/passport/score-history/export?format=json")
j = json.loads(raw)
check("JSON export has summary/history/changes", all(k in j for k in ("summary", "history", "changes")))
check("JSON records == 3", j["summary"].get("snapshotCount") == 3)
check("JSON carries the NDPA honesty note", "correlated context" in j.get("note", ""))
u1_id = db_user_id(u1_email)
con = sqlite3.connect(DB, timeout=30)
rows = con.execute("SELECT metadata FROM AuditEvent WHERE actorId=? AND action='SCORE_HISTORY_EXPORTED'",
                   (u1_id,)).fetchall()
con.close()
check("SCORE_HISTORY_EXPORTED audited (2x)", len(rows) >= 2)
metas = [json.loads(r[0] or "{}") for r in rows]
check("audit metadata is PII-disciplined (format/records only)",
      all(set(m.keys()) <= {"format", "records"} for m in metas))
check("audit metadata records == 3", all(m.get("records") == 3 for m in metas))
s, b = callj(u1, "GET", "/api/v1/auth/activity")
check("activity feed surfaces SCORE_HISTORY_EXPORTED",
      any(e["action"] == "SCORE_HISTORY_EXPORTED" for e in b.get("events", [])))

# ------------------------- 6) freeze-on-appeal: FROZEN + RETIRED in history
print("== 6) appeal freeze lifecycle in history ==")
rep = client()
rep_email, rep_handle = register(rep, "rep")
verify_identity(rep)
verify_phone(rep, f"0806 556 {RUN % 10000:04d}")   # L2 reporter gate
rev = client()
rev_email, rev_handle = register(rev, "rev")
con = sqlite3.connect(DB, timeout=30)
con.execute("UPDATE UserAccount SET role='REVIEWER' WHERE email=?", (rev_email,))
con.commit(); con.close()

# subject baseline
s, b = history(u1)
pre_score = b["history"][-1]["score"]
s, b = callr(rep, "POST", "/api/v1/reputation/flags", {
    "subjectHandle": u1_handle,
    "category": "FRAUD",
    "description": ("Paid for a laptop on a marketplace listing and the seller went "
                    "silent after the transfer. Chat logs and transfer receipts available."),
    "evidence": [{"kind": "TEXT", "content": "Transfer receipt TXN-4491 and chat log attached."}],
})
check("reporter files a flag against the subject", s == 201)
flag_id = b.get("flagId", "")
s, b = callr(rev, "POST", f"/api/v1/reputation/review/{flag_id}/decision", {
    "outcome": "CONFIRMED",
    "rationale": "Payment platform logs show the transfer was reversed after goods were delivered.",
})
check("reviewer CONFIRMS (risk lands, score drops)", s == 200)
s, b = callr(u1, "POST", f"/api/v1/reputation/flags/{flag_id}/appeal", {
    "reason": "The courier record cited was for a different order number — the reviewer missed that.",
})
check("subject appeals -> APPEALED", s == 200 and b.get("outcome") == "APPEALED")
s, b = history(u1)
check("frozen snapshot appears in history (state FROZEN)",
      any(h.get("state") == "FROZEN" for h in b["history"]))
frozen_score = [h["score"] for h in b["history"] if h.get("state") == "FROZEN"][0]
check("frozen score is the post-confirmation score (moved down from pre-flag)",
      frozen_score < pre_score)
# while frozen: the passport serves the frozen score verbatim (cannot move)
s, b = callr(u1, "GET", "/api/v1/passport/me")
check("passport serves the frozen score verbatim", b["score"]["score"] == frozen_score
      and b["score"]["state"] == "FROZEN")

# reviewer overturns -> freeze lifts, recompute, RETIRED row stays in history
s, b = callr(rev, "GET", "/api/v1/reputation/review")
targets = [a for a in b.get("appeals", []) if a.get("flag", {}).get("id") == flag_id]
check("appeal visible in the reviewer queue", len(targets) == 1)
s, b = callr(rev, "POST", f"/api/v1/reputation/appeals/{targets[0]['id']}/decision", {
    "outcome": "OVERTURNED",
    "note": "Bank correspondence supports the appellant — the reversal originated from the reporter's account dispute.",
})
check("appeal OVERTURNED -> 200", s == 200 and b.get("appealStatus") == "OVERTURNED")
callr(u1, "GET", "/api/v1/passport/me")  # recompute after unfreeze
s, b = history(u1)
states = [h["state"] for h in b["history"]]
check("previously frozen row now RETIRED in history", "RETIRED" in states)
check("latest snapshot ACTIVE again", b["history"][-1]["state"] == "ACTIVE")
check("score restored above the frozen floor", b["history"][-1]["score"] > frozen_score)
last_ch = b["changes"][-1]
check("APPEAL events recorded in the post-unfreeze window",
      any(e["action"] in ("APPEAL_FILED", "APPEAL_DECIDED", "FLAG_RESOLUTION") for e in last_ch["events"]))

# -------------------------------------------------- 7) DSR integration
print("== 7) DSR export integration ==")
s, b = callr(u1, "POST", "/api/v1/passport/dsr", {"type": "EXPORT"})
check("DSR EXPORT -> 201", s == 201)
s, raw = call(u1, "GET", f"/api/v1/passport/dsr/{b.get('requestId', '')}/export")
j = json.loads(raw)
te = j.get("trustEngine", {})
check("DSR trustEngine.snapshots includes the full retained history",
      len(te.get("snapshots", [])) >= 5)
check("DSR snapshots include the RETIRED frozen row",
      any(s.get("state") == "RETIRED" for s in te.get("snapshots", [])))
check("DSR auditEvents include SCORE_HISTORY_EXPORTED",
      any(e.get("action") == "SCORE_HISTORY_EXPORTED" for e in j.get("auditEvents", [])))

# -------------------------------------------------- 8) rate limits
print("== 8) rate limits (per USER) ==")
limited = False
i = -1
for i in range(61):
    s, raw = call(u1, "GET", "/api/v1/passport/score-history")
    if s == 429:
        limited = True
        break
prior = HIST_CALLS.get(id(u1), 0)
check("history rate limit trips at 60/min (incl. matrix's own reads)",
      limited and i == 60 - prior, f"(tripped at loop call {i}, prior reads {prior})")
# fresh user: exports burn 10 then 429
u3 = client()
u3_email, u3_handle = register(u3, "u3")
callr(u3, "GET", "/api/v1/passport/me")
trip = -1
for i in range(12):
    s, raw = call(u3, "GET", "/api/v1/passport/score-history/export?format=csv")
    if s == 429:
        trip = i
        break
check("export rate limit trips at 10/5min", trip == 10, f"(tripped at {trip})")
check("429 body is the platform error shape", raw.startswith('{"error"'))

# ------------------------------------------------------- 9) cleanup
print("== 9) deterministic cleanup ==")
ids = []
for em in (u1_email, u2_email, u3_email, rep_email, rev_email):
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
m = con.execute("SELECT COUNT(*) FROM TrustScoreSnapshot WHERE userId IN (%s)" % qmarks, ids).fetchone()[0]
con.close()
check("test users + score rows removed (orphan-free)", n == 0 and m == 0)

print(f"\n===== RESULT: {PASS} pass / {FAIL} fail =====")
if FAIL:
    raise SystemExit(1)
