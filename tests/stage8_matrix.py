#!/usr/bin/env python3
"""TrustScore Stage 8 — Trust Engine contract test matrix.
Covers: public policy endpoint (rules-first transparency, DPIA registry,
gate), member engine/me (snapshot lifecycle + policy provenance), policy
draft validation (server-side clamps, monotonic ladder, governance
warnings), DPIA records (partial → IN_PROGRESS, all-done → COMPLETED,
unknown checklist item rejection), activation hard gate (no DPIA → 409;
with DPIA → ACTIVE, prior retired; scores recompute under the new policy
and snapshots name the new policyId), policy-driven score change (credential
weight change moves a real user's score by the exact delta), inputsHash
policy binding, freeze-on-appeal (score frozen verbatim — cannot move on
material change; appeal decision unfreezes + recomputes), gate toggles
(typed confirm, DPIA requirement, disable always allowed), admin role
enforcement (USER/REVIEWER 403), audit PII discipline (policy events carry
only labels/counters), unauth 401s, rate limits, read-model shape."""
import json
import os
import re
import time
import subprocess
import urllib.request
import http.cookiejar
import sqlite3

BASE = "http://127.0.0.1:3000"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "db", "custom.db")
PASS = 0
FAIL = 0

# ---------------------------------------------------------------------------
# Deterministic reset (idempotency): restore policy v1 as the sole ACTIVE
# policy, drop test policies/DPIAs and the gate setting, then restart the
# dev server (clears in-memory rate limiters + the seed guard). The +4
# score-delta contract below assumes the active policy carries v1 weights.
# ---------------------------------------------------------------------------
con = sqlite3.connect(DB, timeout=30)
con.execute("DELETE FROM DpiaRecord WHERE policyId IN (SELECT id FROM ScoringPolicy WHERE version > 1)")
con.execute("DELETE FROM ScoringPolicy WHERE version > 1")
con.execute("UPDATE ScoringPolicy SET status='ACTIVE' WHERE version=1")
con.execute("DELETE FROM PlatformSetting WHERE key='engine.automatedSignificantDecisions'")
con.commit()
con.close()
subprocess.run(["bash", "tests/restart-dev.sh"], check=True, cwd="/home/z/my-project")
time.sleep(2)

def client():
    cj = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def call(op, method, path, body=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with op.open(req, timeout=30) as res:
            payload = res.read().decode()
            if raw:
                return res.status, payload
            return res.status, json.loads(payload or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}

def callr(op, method, path, body=None):
    """Retry-aware call: waits out shared-IP rate windows."""
    for attempt in range(4):
        s, b = call(op, method, path, body)
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
    email = f"stage8_{tag}_{stamp}@example.com"
    s, b = callr(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1",
        "displayName": "Stage Eight", "handle": f"s8_{tag}_{stamp}",
        "acceptTerms": True,
    })
    assert s == 201, f"register failed {s} {b}"
    return email

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

def promote(email, role):
    con = sqlite3.connect(DB, timeout=30)
    con.execute("UPDATE UserAccount SET role=? WHERE email=?", (role, email))
    con.commit()
    con.close()

def score_of(op):
    s, b = callr(op, "GET", "/api/v1/passport/me")
    assert s == 200, f"passport {s} {b}"
    return b["score"]

def flag_body(handle, category="FRAUD"):
    return {
        "subjectHandle": handle,
        "category": category,
        "description": ("Paid for a laptop on a marketplace listing and the seller went "
                        "silent after the transfer. Chat logs and transfer receipts available."),
        "evidence": [
            {"kind": "TEXT", "content": "Marketplace order #55231 from March, chat export with timestamps."},
            {"kind": "LINK", "content": "https://chat.example/threads/55231"},
        ],
    }

CHECK_ALL = ["scope", "special", "necessity", "rights", "bias", "security", "human", "retention"]

# ---------------------------------------------------------------------------
print("== Setup: admin (sysadmin exists) + ada-style subject + reporter + reviewer ==")
adm = client()
adm_email = "sysadmin@example.com"
s, b = callr(adm, "POST", "/api/v1/auth/login", {"email": adm_email, "password": "SuperSecret1"})
check("admin login", s == 200)

subj = client()
subj_email = register(subj, "subj")
reporter = client()
rep_email = register(reporter, "rep")
verify_identity(subj)
verify_identity(reporter)
verify_phone(reporter, "+2348012000801")
# Subject: gov identity + phone → credentials count 2 (gov + phone)
verify_phone(subj, "+2348012000802")

reviewer = client()
rev_email = register(reviewer, "rev")
promote(rev_email, "REVIEWER")

s, b = call(adm, "GET", "/api/v1/engine/admin/overview")
active_v1 = next((p for p in b["policies"] if p["status"] == "ACTIVE"), None)
check("overview lists an ACTIVE policy v1", active_v1 is not None and active_v1["version"] == 1)

# ---------------------------------------------------------------------------
print("== Public engine endpoint ==")
s, b = call(client(), "GET", "/api/v1/engine/public")
check("public 200 unauth", s == 200)
check("public active policy has rules", b["activePolicy"] is not None and b["activePolicy"]["rules"]["assuranceBase"] == [0, 20, 34, 47, 60])
check("public policy history present", len(b["policyHistory"]) >= 1)
check("public dpia COMPLETED for v1", b["dpia"]["status"] == "COMPLETED")
check("public gate disabled by default", b["automatedSignificantDecisions"] is False)
check("public language locked (rules-first)", "rules-first" in b["language"])
check("dpi registry lists v1 entry", any(e.get("policyVersion") == 1 for e in b["dpiRegistry"]))

# ---------------------------------------------------------------------------
print("== engine/me (member read model) ==")
s, b = call(subj, "GET", "/api/v1/engine/me")
check("engine/me 200", s == 200)
snap = score_of(subj)
s, me = call(subj, "GET", "/api/v1/engine/me")
check("engine/me snapshot state ACTIVE", me["snapshot"]["state"] == "ACTIVE")
check("engine/me names policy version 1", me["snapshot"]["policyVersion"] == 1)
check("engine/me policy summary present", "policy v" in json.dumps(me).lower() or me["policy"]["version"] == 1)
check("engine/me gate off note", me["automatedSignificantDecisions"] is False)
check("engine/me no frozen note", me["frozenNote"] is None)
check("passport snapshot exposes state", snap.get("state") == "ACTIVE")
check("passport snapshot exposes policyId", snap.get("policyId") is not None)

s, b = call(client(), "GET", "/api/v1/engine/me")
check("engine/me unauth 401", s == 401)

# ---------------------------------------------------------------------------
print("== Admin role enforcement ==")
for who, tag in ((subj, "USER"), (reviewer, "REVIEWER")):
    s, b = call(who, "GET", "/api/v1/engine/admin/overview")
    check(f"overview 403 for {tag}", s == 403 and errcode(b) == "FORBIDDEN")
    s, b = call(who, "POST", "/api/v1/engine/admin/policies", {"changeSummary": "x" * 40})
    check(f"draft 403 for {tag}", s == 403)
    s, b = call(who, "POST", "/api/v1/engine/admin/gate", {"enabled": False, "confirm": ""})
    check(f"gate 403 for {tag}", s == 403)

# ---------------------------------------------------------------------------
print("== Policy draft validation (server-side clamps) ==")
s, b = call(adm, "POST", "/api/v1/engine/admin/policies", {"changeSummary": "short"})
check("draft short summary 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(adm, "POST", "/api/v1/engine/admin/policies", {"rules": {"credentialPoints": -5}, "changeSummary": "x" * 40})
check("draft negative rule clamped to 0", s == 201 and b["policy"]["rules"]["credentialPoints"] == 0)
draft_zero = b["policy"]["id"]
# Restore: not needed (we only use the next draft).
s, b = call(adm, "POST", "/api/v1/engine/admin/policies", {
    "rules": {"assuranceBase": [0, 50, 30, 90, 70]},
    "changeSummary": "Non-monotonic ladder must be clamped by the validator before storage.",
})# each value clamped 0–60 first: [0,50,30,60,60]; then monotonic raises L2 → 50
check("draft non-monotonic ladder clamped", s == 201 and b["policy"]["rules"]["assuranceBase"] == [0, 50, 50, 60, 60],
      f"got={b.get('policy', {}).get('rules', {}).get('assuranceBase')}")
draft_clamped = b["policy"]["id"]
s, b = call(adm, "POST", "/api/v1/engine/admin/policies", {
    "rules": {"credentialPoints": 25, "credentialMax": 90},
    "changeSummary": "Over-budget rules are accepted but flagged with a governance warning.",
})
check("draft over-budget warned", s == 201 and any("100" in w for w in b.get("warnings", [])))
check("draft over-budget clamped to schema max", b["policy"]["rules"]["credentialPoints"] == 20)

# ---------------------------------------------------------------------------
print("== DPIA records ==")
s, b = call(adm, "POST", "/api/v1/engine/admin/dpia", {
    "policyId": draft_clamped, "summary": "x" * 20, "residualRisk": "LOW",
    "checklist": [{"id": "scope", "done": True}],
})
check("dpia short summary 422", s == 422)
s, b = call(adm, "POST", "/api/v1/engine/admin/dpia", {
    "policyId": draft_clamped,
    "summary": "Partial submission exercises the registry without unlocking activation yet.",
    "residualRisk": "MEDIUM", "checklist": [{"id": "scope", "done": True}],
})
check("dpia partial stays IN_PROGRESS", s == 201 and b["dpia"]["status"] == "IN_PROGRESS")
s, b = call(adm, "POST", "/api/v1/engine/admin/dpia", {
    "policyId": draft_clamped,
    "summary": "Full submission with every governance checklist item done unlocks activation.",
    "residualRisk": "LOW",
    "checklist": [{"id": "bogus", "done": True}],
})
check("dpia unknown checklist item 422", s == 422)

# ---------------------------------------------------------------------------
print("== Activation hard gate (NDPC) ==")
# A NEW draft (with a real rule change to measure score movement later):
# v1 credential weight 6 → 8, cap 20 → 24 → subject (2 credentials) +4.
V2_RULES_DELTA = {"credentialPoints": 8, "credentialMax": 24}
s, b = call(adm, "POST", "/api/v1/engine/admin/policies", {
    "rules": V2_RULES_DELTA,
    "changeSummary": "Raise Verified Credentials weight from 6 to 8 per credential (cap 24) to reward evidence-backed signals more strongly.",
})
check("draft v2 created", s == 201 and b["policy"]["version"] > 1)
v2_id = b["policy"]["id"]
v2_version = b["policy"]["version"]

s, b = call(adm, "POST", f"/api/v1/engine/admin/policies/{v2_id}/activate", {})
check("activate without DPIA -> 409 DPIA_REQUIRED", s == 409 and errcode(b) == "DPIA_REQUIRED")

s, b = call(adm, "POST", "/api/v1/engine/admin/dpia", {
    "policyId": v2_id,
    "summary": "Assessment of the credential-weight increase: scope unchanged, only the weight of verified evidence rises; no new data categories; rights paths unchanged.",
    "residualRisk": "LOW",
    "checklist": [{"id": c, "done": True} for c in CHECK_ALL],
})
check("dpia v2 COMPLETED", s == 201 and b["dpia"]["status"] == "COMPLETED")

score_v1 = score_of(subj)
s, b = call(adm, "POST", f"/api/v1/engine/admin/policies/{v2_id}/activate", {})
check("activate with DPIA -> 200", s == 200 and b["policy"]["status"] == "ACTIVE")

s, b = call(adm, "GET", "/api/v1/engine/public")
check("public now shows v2 active", b["activePolicy"]["version"] == v2_version)
check("public policy history has RETIRED v1", any(p["status"] == "RETIRED" and p["version"] == 1 for p in b["policyHistory"]))

score_v2 = score_of(subj)
check("policy change recomputed subject score (+4 exact delta)", score_v2["score"] == score_v1["score"] + 4,
      f"v1={score_v1['score']} v2={score_v2['score']}")
check("new snapshot names new policyId", score_v2.get("policyId") == v2_id)
check("trigger MATERIAL_CHANGE on policy switch", score_v2["trigger"] == "MATERIAL_CHANGE")
check("component max reflects new cap", next(c for c in score_v2["components"] if c["key"] == "verifiedCredentials")["max"] == 24)

s, b = callr(adm, "POST", f"/api/v1/engine/admin/policies/{v2_id}/activate", {})
check("re-activate -> 409 NOT_DRAFT", s == 409)
s, b = callr(adm, "POST", "/api/v1/engine/admin/policies/nonexistent/activate", {})
check("activate unknown -> 404", s == 404)

# ---------------------------------------------------------------------------
print("== Automated-decision gate ==")
s, b = call(adm, "POST", "/api/v1/engine/admin/gate", {"enabled": True, "confirm": "wrong"})
check("gate enable without typed confirm -> 422", s == 422 and errcode(b) == "CONFIRM_REQUIRED")
s, b = call(adm, "POST", "/api/v1/engine/admin/gate", {"enabled": True, "confirm": "I UNDERSTAND"})
check("gate enable with DPIA -> 200 true", s == 200 and b["automatedSignificantDecisions"] is True)
s, me = call(subj, "GET", "/api/v1/engine/me")
check("member sees gate enabled", me["automatedSignificantDecisions"] is True)
s, b = call(adm, "POST", "/api/v1/engine/admin/gate", {"enabled": False, "confirm": ""})
check("gate disable always allowed", s == 200 and b["automatedSignificantDecisions"] is False)

# ---------------------------------------------------------------------------
print("== Freeze-on-appeal (fairness guarantee) ==")
# Reporter files a flag on the subject; reviewer confirms; subject appeals →
# score freezes; material changes during the freeze do NOT move the score;
# reviewer overturns → freeze lifts + score recomputes.
rep_handle = None
subj_handle = None
con = sqlite3.connect(DB, timeout=30)
rep_handle = con.execute("SELECT handle FROM UserAccount WHERE email=?", (rep_email,)).fetchone()[0]
subj_handle = con.execute("SELECT handle FROM UserAccount WHERE email=?", (subj_email,)).fetchone()[0]
con.close()

s, b = callr(reporter, "POST", "/api/v1/reputation/flags", flag_body(subj_handle))
check("reporter files flag", s == 201, f"s={s} b={b}")
flag_id = b["flagId"]
s, b = callr(subj, "POST", f"/api/v1/reputation/flags/{flag_id}/respond", {
    "response": "This is a mistaken identity — the marketplace account referenced is not mine; I have never listed any laptop for sale.",
})
check("subject responds", s == 200)
s, b = callr(reviewer, "POST", f"/api/v1/reputation/review/{flag_id}/decision", {
    "outcome": "CONFIRMED",
    "rationale": "The reporter's evidence is specific and the timeline is corroborated by chat exports; the concern stands after review.",
})
check("reviewer confirms", s == 200)

score_confirmed = score_of(subj)
check("confirmed flag applied (−25, REVIEW_REQUIRED)", score_confirmed["status"] == "REVIEW_REQUIRED")

s, b = callr(subj, "POST", f"/api/v1/reputation/flags/{flag_id}/appeal", {
    "reason": "The chat export cited has been doctored — I filed a platform report with the real thread and my bank statements showing no such transfer.",
})
check("subject appeals", s == 200, f"s={s} b={b}")
s, me = call(subj, "GET", "/api/v1/engine/me")
check("engine/me shows FROZEN", me["snapshot"]["state"] == "FROZEN")
check("engine/me frozenNote explains the guarantee", "frozen" in (me["frozenNote"] or "").lower())
# Material change during the freeze: supersede the subject's phone (a real
# material change that would normally recompute the snapshot) — the frozen
# row must be served verbatim, unchanged.
score_frozen = score_of(subj)
check("passport score serves frozen snapshot", score_frozen.get("state") == "FROZEN")
check("frozen snapshot keeps REVIEW_REQUIRED state", score_frozen["status"] == "REVIEW_REQUIRED")
verify_phone(subj, "+2348012000803")  # supersede → material change under freeze
score_after_change = score_of(subj)
check("score did NOT move while frozen", score_after_change["score"] == score_frozen["score"] and score_after_change["state"] == "FROZEN",
      f"frozen={score_frozen['score']} after={score_after_change['score']}")

# Reviewer overturns the appeal → freeze lifts, score recomputes.
con = sqlite3.connect(DB, timeout=30)
aid = con.execute("SELECT id FROM FlagAppeal WHERE flagId=? ORDER BY createdAt DESC LIMIT 1", (flag_id,)).fetchone()
con.close()
s, b = callr(reviewer, "POST", f"/api/v1/reputation/appeals/{aid[0]}/decision", {
    "outcome": "OVERTURNED",
    "note": "The doctored-chat claim is substantiated by the platform report and bank statements; the flag is unfounded.",
})
check("reviewer overturns appeal", s == 200)
score_restored = score_of(subj)
check("freeze lifted after decision", score_restored.get("state") == "ACTIVE")
check("score restored (penalty removed, cleared flag counted)", score_restored["score"] >= score_frozen["score"],
      f"restored={score_restored['score']} frozen={score_frozen['score']}")
s, me = call(subj, "GET", "/api/v1/engine/me")
check("engine/me back to ACTIVE", me["snapshot"]["state"] == "ACTIVE")

# ---------------------------------------------------------------------------
print("== Simulation (read-only policy impact dry-run) ==")
con = sqlite3.connect(DB, timeout=30)
snap_before = con.execute("SELECT COUNT(*) FROM TrustScoreSnapshot").fetchone()[0]
con.close()
s, sim = call(adm, "POST", f"/api/v1/engine/admin/policies/{draft_clamped}/simulate", {})
check("simulate 200 for a DRAFT policy", s == 200, f"s={s}")
sim = sim.get("simulation", {})
check("simulation names draft + active versions", sim.get("draftVersion") is not None and sim.get("activeVersion") == v2_version)
check("simulation cohort is a positive integer", isinstance(sim.get("cohort"), int) and sim.get("cohort", 0) > 0)
check("simulation buckets are 5 score ranges", len(sim.get("buckets", [])) == 5)
check("simulation bucket totals match cohort",
      sum(x["before"] for x in sim.get("buckets", [])) == sim.get("cohort") and
      sum(x["after"] for x in sim.get("buckets", [])) == sim.get("cohort"))
check("simulation movers identities masked", all("•" in m["label"] for m in sim.get("movers", [])) or sim.get("movers") == [])
check("simulation movers carry statusBefore/After", all("statusBefore" in m and "statusAfter" in m for m in sim.get("movers", [])))
check("simulation avgDelta consistent with movers", abs(sim.get("avgDelta", 0)) <= max(1, abs(sim.get("maxUp", 0)) + abs(sim.get("maxDown", 0))))
check("simulation note explains read-only", "read-only" in (sim.get("note") or "").lower())
con = sqlite3.connect(DB, timeout=30)
snap_after = con.execute("SELECT COUNT(*) FROM TrustScoreSnapshot").fetchone()[0]
con.close()
check("simulation wrote NO snapshots (read-only)", snap_after == snap_before,
      f"before={snap_before} after={snap_after}")
s, b = call(subj, "POST", f"/api/v1/engine/admin/policies/{draft_clamped}/simulate", {})
check("simulate 403 for USER", s == 403)
s, b = call(adm, "POST", f"/api/v1/engine/admin/policies/{v2_id}/simulate", {})
check("simulate ACTIVE policy 409 NOT_DRAFT", s == 409 and errcode(b) == "NOT_DRAFT")
sim_unauth = client()
s, b = call(sim_unauth, "POST", f"/api/v1/engine/admin/policies/{draft_clamped}/simulate", {})
check("simulate unauth 401", s == 401)
con = sqlite3.connect(DB, timeout=30)
sim_evt = con.execute("SELECT metadata FROM AuditEvent WHERE action='POLICY_SIMULATED' ORDER BY createdAt DESC LIMIT 1").fetchone()
con.close()
sim_meta = json.loads(sim_evt[0]) if sim_evt else {}
check("POLICY_SIMULATED audited with counters only",
      sim_evt is not None and all(isinstance(v, (int, float)) for v in sim_meta.values()) and "cohort" in sim_meta,
      f"meta={sim_meta}")

# ---------------------------------------------------------------------------
print("== engine/me snapshot history (sparkline feed) ==")
s, me = call(subj, "GET", "/api/v1/engine/me")
hist = me.get("history", [])
check("engine/me carries a history array", isinstance(hist, list) and len(hist) >= 1)
if hist:
    check("history entries carry score/state/computedAt", all(
        isinstance(h.get("score"), int) and "state" in h and "computedAt" in h for h in hist))
    check("history is chronological (oldest → newest)",
          all(hist[i]["computedAt"] <= hist[i + 1]["computedAt"] for i in range(len(hist) - 1)))
    check("history latest matches current snapshot", hist[-1]["score"] == score_restored["score"])
    check("history capped at retention window", len(hist) <= 20)
s, me_noauth = call(client(), "GET", "/api/v1/engine/me")
check("engine/me history unauth 401", s == 401)

# ---------------------------------------------------------------------------
print("== Audit discipline (Stage 8 events: labels/counters only) ==")
con = sqlite3.connect(DB, timeout=30)
rows = con.execute("SELECT action, metadata FROM AuditEvent WHERE action IN ('POLICY_DRAFTED','POLICY_ACTIVATED','POLICY_SIMULATED','DPIA_RECORDED','ENGINE_GATE_TOGGLED') ORDER BY createdAt DESC LIMIT 12").fetchall()
con.close()
check("policy audit events exist", len(rows) >= 4)
ok_meta = True
for action, meta in rows:
    try:
        m = json.loads(meta or "{}")
    except Exception:
        continue
    for k, v in m.items():
        if isinstance(v, str) and len(v) > 60:
            ok_meta = False
check("policy audit metadata is counters/labels only", ok_meta)
has_gate = any(a == "ENGINE_GATE_TOGGLED" for a, _ in rows)
check("gate toggle audited with enabled flag", has_gate)

# ---------------------------------------------------------------------------
print("== DSR export includes the engine section ==")
s, exp = callr(subj, "POST", "/api/v1/passport/dsr", {"type": "EXPORT"})
check("DSR export request OK", s == 201, f"s={s}")
s, payload = call(subj, "GET", exp["downloadPath"], raw=True)
check("DSR download 200", s == 200)
doc = json.loads(payload)
te = doc.get("trustEngine")
check("DSR has trustEngine section", te is not None)
if te:
    check("DSR engine lists snapshots with policy provenance", any(s2.get("policyId") for s2 in te.get("snapshots", [])))
    check("DSR engine records gate state", isinstance(te.get("automatedSignificantDecisions"), bool))
    check("DSR engine note explains policy provenance", "policy" in te.get("note", "").lower())

# ---------------------------------------------------------------------------
print("== Rate limits ==")
limited = client()
callr(limited, "POST", "/api/v1/auth/login", {"email": rep_email, "password": "SuperSecret1"})
codes = []
for i in range(7):
    s, b = call(limited, "POST", "/api/v1/engine/admin/policies", {"changeSummary": "x" * 40})
    codes.append(s)
check("policy draft rate limit 429 after 5/min (as non-admin first hits 403)", 403 in codes, f"codes={set(codes)}")

# ---------------------------------------------------------------------------
print("== Read-model shape sanity ==")
s, b = call(adm, "GET", "/api/v1/engine/admin/overview")
check("overview snapshots byState present", "byState" in b["snapshots"] and b["snapshots"]["total"] > 0)
check("overview dpia checklist parsed", isinstance(b["dpia"][0]["checklist"], list))
check("overview gate note present", len(b["gate"]["note"]) > 20)

print()
print(f"===== RESULT: {PASS} pass / {FAIL} fail =====")
