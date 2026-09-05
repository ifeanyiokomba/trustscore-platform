#!/usr/bin/env python3
"""TrustScore Stage 7 — Reputation contract test matrix.
Covers: flags with evidence (anti-gaming: L2 reporter gate, self/unknown/
duplicate, 3-per-7-day quota, mandatory evidence), subject response →
UNDER_REVIEW, reporter withdrawal (OPEN only), human review queue (REVIEWER
role gate), decisions (CONFIRMED/UNFOUNDED/DISMISSED with rationale; score
wiring: −25 confirmed / +2 cleared), appeals (once per flag, 14-day window,
UPHELD keeps, OVERTURNED restores), verified interactions (+3 per distinct
L2+ consented check, 90-day window, PHONE method excluded), masked reporter
in subject view (unmasked in DSR export), audit PII discipline, security-
timeline subject linkage, DSR export inclusion, rate limits."""
import json
import re
import time
import urllib.request
import http.cookiejar
import sqlite3

BASE = "http://127.0.0.1:3000"
DB = "/home/z/my-project/db/custom.db"
PASS = 0
FAIL = 0

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
    email = f"stage7_{tag}_{stamp}@example.com"
    s, b = callr(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1",
        "displayName": "Stage Seven", "handle": f"s7_{tag}_{stamp}",
        "acceptTerms": True,
    })
    assert s == 201, f"register failed {s} {b}"
    return email, f"s7_{tag}_{stamp}"

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

def flag_body(handle, category="FRAUD", desc=None):
    return {
        "subjectHandle": handle,
        "category": category,
        "description": desc or ("Paid for a laptop on a marketplace listing and the seller went "
                                "silent after the transfer. Chat logs and transfer receipts available."),
        "evidence": [
            {"kind": "TEXT", "content": "Marketplace order #55231 from March, chat export with timestamps."},
            {"kind": "LINK", "content": "https://chat.example/threads/55231"},
        ],
    }

def score_components(op):
    s, b = call(op, "GET", "/api/v1/passport/me")
    if s != 200:
        return {}
    comps = {c["key"]: c for c in b.get("score", {}).get("components", [])}
    return {"status": b.get("score", {}).get("status"), "comps": comps,
            "score": b.get("score", {}).get("score")}

# ---------------------------------------------------------------------------
print("== Setup: bob/ada/dave/frank/grace/henry (L2), carol (L1), erin (L0), reviewer promotion ==")
bob = client(); bob_email, bob_handle = register(bob, "bob")
ada = client(); ada_email, ada_handle = register(ada, "ada")
carol = client(); carol_email, carol_handle = register(carol, "car")
dave = client(); dave_email, dave_handle = register(dave, "dave")
erin = client(); erin_email, erin_handle = register(erin, "erin")
frank = client(); frank_email, frank_handle = register(frank, "frank")
grace = client(); grace_email, grace_handle = register(grace, "grace")
henry = client(); henry_email, henry_handle = register(henry, "hen")

RUN = int(time.time() * 1000) % 10_000_000
for op in (bob, ada, dave, frank, grace, henry):
    verify_identity(op)
verify_identity(carol)  # L1 only
# dave files flags later (CONFLICT test) — needs L2 too
verify_phone(bob, f"0803 555 {RUN % 10000:04d}")
verify_phone(ada, f"0805 555 {(RUN + 1) % 10000:04d}")
verify_phone(dave, f"0806 555 {(RUN + 2) % 10000:04d}")
verify_phone(frank, f"0807 555 {(RUN + 3) % 10000:04d}")
verify_phone(grace, f"0808 555 {(RUN + 4) % 10000:04d}")
verify_phone(henry, f"0809 555 {(RUN + 5) % 10000:04d}")

# ada enables standing safety consent (needed for verified interactions later)
s, b = callr(ada, "POST", "/api/v1/safety/settings", {
    "enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": True,
})
assert s == 200, f"ada safety settings {s} {b}"

promote_reviewer(dave_email)
promote_reviewer(erin_email)

# ---------------------------------------------------------------- 1) unauth
print("== 1) unauthenticated access ==")
anon = client()
for path, body in [
    ("/api/v1/reputation/flags", flag_body(ada_handle)),
    ("/api/v1/reputation/flags/xyz/respond", {"response": "x" * 30}),
    ("/api/v1/reputation/flags/xyz/withdraw", {}),
    ("/api/v1/reputation/flags/xyz/appeal", {"reason": "x" * 30}),
    ("/api/v1/reputation/review/xyz/decision", {"outcome": "CONFIRMED", "rationale": "x" * 30}),
    ("/api/v1/reputation/appeals/xyz/decision", {"outcome": "UPHELD", "note": "x" * 30}),
]:
    s, b = call(anon, "POST", path, body)
    check(f"unauth POST {path} -> 401", s == 401 and errcode(b) == "UNAUTHENTICATED")
for path in ["/api/v1/reputation/me", "/api/v1/reputation/review"]:
    s, b = call(anon, "GET", path)
    check(f"unauth GET {path} -> 401", s == 401 and errcode(b) == "UNAUTHENTICATED")

# ------------------------------------------------------- 2) zod / input contract
# (zod runs BEFORE the L2 gate; calls are spread across users to respect the
# 3/min per-user route brake)
print("== 2) input validation ==")
s, b = call(bob, "POST", "/api/v1/reputation/flags", flag_body(ada_handle) | {"evidence": []})
check("no evidence -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(bob, "POST", "/api/v1/reputation/flags", flag_body(ada_handle) | {"description": "too short"})
check("short description -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(carol, "POST", "/api/v1/reputation/flags", flag_body(ada_handle) | {"category": "SPYING"})
check("unknown category -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(carol, "POST", "/api/v1/reputation/flags", flag_body(ada_handle) | {"extra": 1})
check("unknown key -> 422 (strict)", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(dave, "POST", "/api/v1/reputation/flags", flag_body(ada_handle) | {"evidence": [{"kind": "TEXT", "content": "hi"}]})
check("short evidence content -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(dave, "POST", "/api/v1/reputation/flags", flag_body("bad handle!"))
check("bad handle chars -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")

# ------------------------------------------------------------ 3) anti-gaming gates
print("== 3) anti-gaming: L2 gate / self / unknown / duplicate ==")
s, b = call(carol, "POST", "/api/v1/reputation/flags", flag_body(ada_handle))
check("L1 reporter -> 403 ASSURANCE_REQUIRED", s == 403 and errcode(b) == "ASSURANCE_REQUIRED")
check("L2 gate message explains the why", "verified identity" in (b.get("error") or {}).get("message", ""))
s, b = call(dave, "POST", "/api/v1/reputation/flags", flag_body(dave_handle))
check("self-flag -> 422 SELF_FLAG", s == 422 and errcode(b) == "SELF_FLAG")
s, b = call(grace, "POST", "/api/v1/reputation/flags", flag_body("no_such_user_42"))
check("unknown handle -> 404 SUBJECT_NOT_FOUND", s == 404 and errcode(b) == "SUBJECT_NOT_FOUND")

s, b = callr(bob, "POST", "/api/v1/reputation/flags", flag_body(ada_handle))
check("L2 reporter files flag -> 201", s == 201 and b.get("outcome") == "FILED")
flag_ada_id = b.get("flagId", "")
check("flagId returned", bool(flag_ada_id))
check("honesty note (human decides)", "human reviewer" in b.get("note", "").lower())
# callr absorbs the per-user route window if needed (duplicate is bob's next call)
s, b = callr(bob, "POST", "/api/v1/reputation/flags", flag_body(ada_handle))
check("duplicate open flag per pair -> 409 DUPLICATE_OPEN", s == 409 and errcode(b) == "DUPLICATE_OPEN")

# ------------------------------------------------------------ 4) subject read model
print("== 4) subject read model (masked reporter, respond eligibility) ==")
s, b = call(ada, "GET", "/api/v1/reputation/me")
check("reputation/me -> 200", s == 200)
me = b
check("role USER", me.get("role") == "USER")
check("ada canFileFlags (L2)", me.get("canFileFlags") is True)
fa = me.get("flagsAgainstMe", [])
check("one flag against ada", len(fa) == 1)
f0 = fa[0] if fa else {}
masked = f0.get("reporter", {}).get("maskedHandle", "")
check("reporter masked (no raw handle in subject view)",
      bool(masked) and bob_handle not in json.dumps(f0.get("reporter", {})))
check("masked reporter looks masked", "*" in masked)
check("category label present", f0.get("categoryLabel") == "Fraud or deception")
check("canRespond true while OPEN", f0.get("canRespond") is True)
check("evidence rows present (2)", len(f0.get("evidence", [])) == 2)
check("stats.openAgainstMe 1", me.get("stats", {}).get("openAgainstMe") == 1)

s, b = call(bob, "GET", "/api/v1/reputation/me")
mine = b.get("flagsFiledByMe", [])
check("reporter sees own filed flag with subject handle",
      len(mine) == 1 and mine[0].get("subjectHandle") == ada_handle)
check("reporter flag evidenceCount 2", mine[0].get("evidenceCount") == 2)

# ada got notified
s, b = call(ada, "GET", "/api/v1/passport/notifications")
titles = [n["title"] for n in b.get("notifications", [])]
check("subject notified of flag", any("filed a flag against your profile" in t for t in titles))

# ------------------------------------------------------------ 5) respond flow
print("== 5) subject response -> UNDER_REVIEW ==")
s, b = call(bob, "POST", f"/api/v1/reputation/flags/{flag_ada_id}/respond", {"response": "x" * 30})
check("non-subject respond -> 403 NOT_SUBJECT", s == 403 and errcode(b) == "NOT_SUBJECT")
s, b = call(ada, "POST", f"/api/v1/reputation/flags/xyz/respond", {"response": "x" * 30})
check("respond unknown flag -> 404", s == 404 and errcode(b) == "NOT_FOUND")
s, b = call(ada, "POST", f"/api/v1/reputation/flags/{flag_ada_id}/respond", {"response": "short"})
check("short response -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = callr(ada, "POST", f"/api/v1/reputation/flags/{flag_ada_id}/respond", {
    "response": "I never received any payment claim — this order was refunded on the platform and I can share the refund receipt.",
    "evidence": [{"kind": "LINK", "content": "https://platform.example/refunds/88231"}],
})
check("subject responds -> 200", s == 200 and b.get("outcome") == "SUBMITTED")
s, b = call(ada, "POST", f"/api/v1/reputation/flags/{flag_ada_id}/respond", {"response": "x" * 40})
check("second respond -> 409 ALREADY_RESPONDED", s == 409 and errcode(b) == "ALREADY_RESPONDED")

s, b = call(ada, "GET", "/api/v1/reputation/me")
f0 = [f for f in b.get("flagsAgainstMe", []) if f["id"] == flag_ada_id][0]
check("flag now UNDER_REVIEW", f0.get("status") == "UNDER_REVIEW")
check("myResponse stored", bool(f0.get("myResponse", {}).get("content")))
check("canRespond false after responding", f0.get("canRespond") is False)

# reporter notified that the case is under review
s, b = call(bob, "GET", "/api/v1/passport/notifications")
titles = [n["title"] for n in b.get("notifications", [])]
check("reporter notified case entered review", any("under human review" in t for t in titles))

# ------------------------------------------------------------ 6) withdrawal
print("== 6) reporter withdrawal (OPEN only) ==")
s, b = callr(bob, "POST", "/api/v1/reputation/flags", flag_body(erin_handle))
flag_erin_id = b.get("flagId", "")
check("bob files flag vs erin (erin L0, OPEN)", s == 201)
s, b = call(ada, "POST", f"/api/v1/reputation/flags/{flag_erin_id}/withdraw", {})
check("non-reporter withdraw -> 403 NOT_REPORTER", s == 403 and errcode(b) == "NOT_REPORTER")
s, b = call(bob, "POST", f"/api/v1/reputation/flags/{flag_ada_id}/withdraw", {})
check("withdraw UNDER_REVIEW flag -> 409 NOT_WITHDRAWABLE", s == 409 and errcode(b) == "NOT_WITHDRAWABLE")
s, b = call(bob, "POST", f"/api/v1/reputation/flags/{flag_erin_id}/withdraw", {})
check("withdraw OPEN flag -> 200", s == 200 and b.get("outcome") == "WITHDRAWN")
s, b = call(erin, "GET", "/api/v1/reputation/me")
check("withdrawn flag visible to subject as WITHDRAWN",
      any(f.get("status") == "WITHDRAWN" for f in b.get("flagsAgainstMe", [])))

# ------------------------------------------------------------ 7) weekly quota
print("== 7) weekly flag quota (3 per 7 days, incl. withdrawn) ==")
s, b = callr(bob, "POST", "/api/v1/reputation/flags", flag_body(frank_handle))
flag_frank_bob_id = b.get("flagId", "")
check("bob's 3rd flag in window -> 201 (vs frank)", s == 201)
# route limiter (3/min per user) will 429 a rapid 4th — sleep past it, then the
# service-level 7-day quota must fire instead
time.sleep(62)
s, b = callr(bob, "POST", "/api/v1/reputation/flags", flag_body(grace_handle))
check("4th flag in 7-day window -> 429 FLAG_WINDOW", s == 429 and errcode(b) == "FLAG_WINDOW")
check("quota message cites flag wars", "flag wars" in (b.get("error") or {}).get("message", ""))

# ------------------------------------------------------------ 8) reviewer queue + role gate
print("== 8) human review queue (REVIEWER role gate) ==")
s, b = call(ada, "GET", "/api/v1/reputation/review")
check("non-reviewer queue -> 403 FORBIDDEN", s == 403 and errcode(b) == "FORBIDDEN")
s, b = call(dave, "GET", "/api/v1/reputation/review")
check("reviewer queue -> 200", s == 200)
queue_ids = [f["id"] for f in b.get("queue", [])]
check("ada's flag in queue (UNDER_REVIEW)", flag_ada_id in queue_ids)
check("withdrawn flag NOT in queue", flag_erin_id not in queue_ids)
q0 = [f for f in b.get("queue", []) if f["id"] == flag_ada_id][0]
check("reviewer sees FULL reporter handle (unmasked)",
      q0.get("reporter", {}).get("handle") == bob_handle)
check("reviewer sees subject handle", q0.get("subject", {}).get("handle") == ada_handle)
check("queue row carries both sides' evidence",
      any(e.get("role") == "REPORTER" for e in q0.get("evidence", [])) and
      any(e.get("role") == "SUBJECT" for e in q0.get("evidence", [])))

s, b = call(ada, "POST", f"/api/v1/reputation/review/{flag_ada_id}/decision",
            {"outcome": "CONFIRMED", "rationale": "x" * 30})
check("non-reviewer decision -> 403 FORBIDDEN", s == 403 and errcode(b) == "FORBIDDEN")
s, b = call(dave, "POST", f"/api/v1/reputation/review/{flag_ada_id}/decision",
            {"outcome": "MAYBE", "rationale": "x" * 30})
check("invalid outcome -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")

# ------------------------------------------------------------ 9) decisions + score wiring
print("== 9) decision: UNFOUNDED (ada) + score wiring ==")
sc = score_components(ada)
check("pre-decision: resolutionHistory 0", sc["comps"].get("resolutionHistory", {}).get("value") == 0)
s, b = callr(dave, "POST", f"/api/v1/reputation/review/{flag_ada_id}/decision", {
    "outcome": "UNFOUNDED",
    "rationale": "Refund receipt corroborates the subject's account; the reporter's transfer claim does not match the platform records.",
})
check("UNFOUNDED decision -> 200", s == 200 and b.get("outcome") == "DECIDED")
check("decision note explains score effect", "resolution history" in b.get("note", ""))
sc = score_components(ada)
check("resolutionHistory +2 after clearing", sc["comps"].get("resolutionHistory", {}).get("value") == 2)
check("ada status ESTABLISHED (L2, no confirmed)", sc.get("status") == "ESTABLISHED")
s, b = call(ada, "GET", "/api/v1/reputation/me")
f0 = [f for f in b.get("flagsAgainstMe", []) if f["id"] == flag_ada_id][0]
check("flag RESOLVED_UNFOUNDED", f0.get("status") == "RESOLVED_UNFOUNDED")
check("published rationale visible to subject", "Refund receipt" in f0.get("resolution", {}).get("rationale", ""))
check("canAppeal false for unfounded", f0.get("canAppeal") is False)

# both parties notified
s, b = call(ada, "GET", "/api/v1/passport/notifications")
titles = [n["title"] for n in b.get("notifications", [])]
check("subject notified flag cleared", any("cleared" in t for t in titles))
s, b = call(bob, "GET", "/api/v1/passport/notifications")
titles = [n["title"] for n in b.get("notifications", [])]
check("reporter notified of outcome", any("reviewed: unfounded" in t for t in titles))

print("== 10) decision: CONFIRMED (frank) + risk wiring ==")
# frank responds first so the case is properly under review
s, b = callr(frank, "POST", f"/api/v1/reputation/flags/{flag_frank_bob_id}/respond", {
    "response": "The transaction completed on my side with delivery confirmation from the courier.",
})
assert s == 200, f"frank respond {s} {b}"
sc = score_components(frank)
check("pre-confirm: confirmedRisk 0", sc["comps"].get("confirmedRisk", {}).get("value") == 0)
s, b = callr(dave, "POST", f"/api/v1/reputation/review/{flag_frank_bob_id}/decision", {
    "outcome": "CONFIRMED",
    "rationale": "Courier record contradicts the subject's claim; two independent receipts support the reporter.",
})
check("CONFIRMED decision -> 200", s == 200 and b.get("outcome") == "DECIDED")
sc = score_components(frank)
check("confirmedRisk −25 after confirm", sc["comps"].get("confirmedRisk", {}).get("value") == -25)
check("frank status REVIEW_REQUIRED (1 confirmed)", sc.get("status") == "REVIEW_REQUIRED")
s, b = call(frank, "GET", "/api/v1/reputation/me")
f0 = [f for f in b.get("flagsAgainstMe", []) if f["id"] == flag_frank_bob_id][0]
check("flag RESOLVED_CONFIRMED", f0.get("status") == "RESOLVED_CONFIRMED")
check("canAppeal true within window", f0.get("canAppeal") is True)
check("appealWindowEndsAt ~14d out", bool(f0.get("appealWindowEndsAt")))
s, b = callr(dave, "POST", f"/api/v1/reputation/review/{flag_frank_bob_id}/decision",
             {"outcome": "UNFOUNDED", "rationale": "x" * 40})
check("re-decide resolved flag -> 409 NOT_DECIDABLE", s == 409 and errcode(b) == "NOT_DECIDABLE")

print("== 11) reviewer conflict of interest ==")
# dave files a flag vs ada; he must not be allowed to decide it
s, b = callr(dave, "POST", "/api/v1/reputation/flags", flag_body(ada_handle, category="SCAM"))
flag_dave_ada_id = b.get("flagId", "")
check("reviewer-as-reporter can file (L2)", s == 201)
s, b = call(dave, "POST", f"/api/v1/reputation/review/{flag_dave_ada_id}/decision",
            {"outcome": "CONFIRMED", "rationale": "x" * 40})
check("reviewer deciding own filed flag -> 403 CONFLICT", s == 403 and errcode(b) == "CONFLICT")
# ada files a flag vs dave; dave must not decide a case about himself
s, b = callr(ada, "POST", "/api/v1/reputation/flags", flag_body(dave_handle, category="HARASSMENT"))
flag_ada_dave_id = b.get("flagId", "")
check("subject-side member files flag vs reviewer", s == 201)
s, b = call(dave, "POST", f"/api/v1/reputation/review/{flag_ada_dave_id}/decision",
            {"outcome": "DISMISSED", "rationale": "x" * 40})
check("reviewer deciding case about self -> 403 CONFLICT", s == 403 and errcode(b) == "CONFLICT")

print("== 12) appeals (one per flag, window, UPHELD) ==")
s, b = call(frank, "POST", f"/api/v1/reputation/flags/{flag_frank_bob_id}/appeal", {"reason": "short"})
check("short appeal reason -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(bob, "POST", f"/api/v1/reputation/flags/{flag_frank_bob_id}/appeal", {"reason": "x" * 40})
check("non-subject appeal -> 403 NOT_SUBJECT", s == 403 and errcode(b) == "NOT_SUBJECT")
s, b = call(ada, "POST", f"/api/v1/reputation/flags/{flag_ada_id}/appeal", {"reason": "x" * 40})
check("appeal on cleared flag -> 409 NOT_CONFIRMED", s == 409 and errcode(b) == "NOT_CONFIRMED")
s, b = callr(frank, "POST", f"/api/v1/reputation/flags/{flag_frank_bob_id}/appeal", {
    "reason": "The courier record cited was for a different order number — the reviewer missed that.",
})
check("frank appeals -> 200", s == 200 and b.get("outcome") == "APPEALED")
s, b = call(frank, "POST", f"/api/v1/reputation/flags/{flag_frank_bob_id}/appeal", {"reason": "x" * 40})
check("second appeal -> 409 ALREADY_APPEALED", s == 409 and errcode(b) == "ALREADY_APPEALED")

# dave decides the appeal UPHELD
s, b = call(ada, "POST", "/api/v1/reputation/appeals/xyz/decision", {"outcome": "UPHELD", "note": "x" * 30})
check("non-reviewer appeal decision -> 403", s == 403 and errcode(b) == "FORBIDDEN")
s, b = call(dave, "GET", "/api/v1/reputation/review")
appeal_ids = [a["id"] for a in b.get("appeals", [])]
check("pending appeal in reviewer queue", len(appeal_ids) >= 1)
ap = b.get("appeals", [{}])[0]
check("appeal queue row carries original case + grounds",
      bool(ap.get("reason")) and bool(ap.get("flag", {}).get("resolution", {}).get("rationale")))
s, b = callr(dave, "POST", f"/api/v1/reputation/appeals/{appeal_ids[0]}/decision",
             {"outcome": "UPHELD", "note": "Re-examined: the order numbers match on the raw receipts."})
check("appeal UPHELD -> 200", s == 200 and b.get("appealStatus") == "UPHELD")
sc = score_components(frank)
check("UPHELD keeps confirmed risk (−25)", sc["comps"].get("confirmedRisk", {}).get("value") == -25)

print("== 13) appeal OVERTURNED restores the score ==")
# dave files vs frank; erin (2nd reviewer) decides it CONFIRMED; frank appeals;
# erin overturns → risk removed, resolution history counts it
s, b = callr(dave, "POST", "/api/v1/reputation/flags", flag_body(frank_handle, category="NON_PAYMENT"))
flag_dave_frank_id = b.get("flagId", "")
check("dave files vs frank", s == 201)
s, b = callr(erin, "POST", f"/api/v1/reputation/review/{flag_dave_frank_id}/decision", {
    "outcome": "CONFIRMED",
    "rationale": "Payment platform logs show the transfer was reversed after goods were delivered.",
})
check("erin (2nd reviewer) CONFIRMS dave's flag", s == 200)
sc = score_components(frank)
check("frank risk now capped at −50 (2 confirmed)", sc["comps"].get("confirmedRisk", {}).get("value") == -50)
check("frank status HIGH_RISK (2 confirmed)", sc.get("status") == "HIGH_RISK")
s, b = callr(frank, "POST", f"/api/v1/reputation/flags/{flag_dave_frank_id}/appeal", {
    "reason": "The reversal was initiated by the buyer's bank as fraud on THEIR side, not by me.",
})
check("frank appeals 2nd confirmation", s == 200)
s, b = call(erin, "GET", "/api/v1/reputation/review")
target = [a for a in b.get("appeals", []) if a.get("flag", {}).get("id") == flag_dave_frank_id]
check("2nd appeal visible in queue", len(target) == 1)
s, b = callr(erin, "POST", f"/api/v1/reputation/appeals/{target[0]['id']}/decision",
             {"outcome": "OVERTURNED", "note": "Bank correspondence supports the appellant — the reversal originated from the reporter's account dispute."})
check("appeal OVERTURNED -> 200", s == 200 and b.get("appealStatus") == "OVERTURNED")
sc = score_components(frank)
check("risk back to −25 after overturn", sc["comps"].get("confirmedRisk", {}).get("value") == -25)
check("overturned flag counts toward resolution history (1 cleared → +2)",
      sc["comps"].get("resolutionHistory", {}).get("value") == 2)
check("frank status back to REVIEW_REQUIRED", sc.get("status") == "REVIEW_REQUIRED")
s, b = call(frank, "GET", "/api/v1/reputation/me")
f0 = [f for f in b.get("flagsAgainstMe", []) if f["id"] == flag_dave_frank_id][0]
check("flag reads RESOLVED_UNFOUNDED after overturn", f0.get("status") == "RESOLVED_UNFOUNDED")
check("appeal state OVERTURNED with note", (f0.get("appeal") or {}).get("status") == "OVERTURNED")

print("== 14) appeal window (14 days) ==")
s, b = callr(grace, "POST", "/api/v1/reputation/flags", flag_body(frank_handle, category="OTHER"))
flag_grace_frank_id = b.get("flagId", "")
check("grace files vs frank", s == 201)
s, b = callr(dave, "POST", f"/api/v1/reputation/review/{flag_grace_frank_id}/decision", {
    "outcome": "CONFIRMED", "rationale": "Third-party affidavit on file corroborates the reporter's account.",
})
check("grace's flag confirmed by dave", s == 200)
con = sqlite3.connect(DB, timeout=30)
con.execute("UPDATE FlagResolution SET decidedAt = datetime('now', '-15 days') WHERE flagId=?", (flag_grace_frank_id,))
con.commit()
con.close()
s, b = call(frank, "POST", f"/api/v1/reputation/flags/{flag_grace_frank_id}/appeal", {"reason": "x" * 40})
check("appeal after 14-day window -> 409 WINDOW_CLOSED", s == 409 and errcode(b) == "WINDOW_CLOSED")

print("== 15) verified interactions (+3 per distinct L2 consented check) ==")
# bob (L2) runs a consented HANDLE check on ada → 1 verified interaction
s, b = callr(bob, "POST", "/api/v1/safety/check", {"handle": ada_handle})
check("bob runs handle check on ada (consented)", s == 200 and b.get("outcome") == "OK")
sc = score_components(ada)
check("verifiedReputation +3 (1 interaction)", sc["comps"].get("verifiedReputation", {}).get("value") == 3)
# grace (L2) runs a PHONE-method check on ada — probe, NOT an interaction
s, b = callr(grace, "POST", "/api/v1/safety/check", {"phone": f"+234805555{(RUN + 1) % 10000:04d}"})
check("grace runs phone-match check on ada", s == 200 and b.get("outcome") in ("OK", "SELF"))
sc = score_components(ada)
check("PHONE method does NOT count as interaction (still 3)",
      sc["comps"].get("verifiedReputation", {}).get("value") == 3)

print("== 16) audit PII discipline + subject-linkage + activity ==")
bob_id = db_user_id(bob_email)
con = sqlite3.connect(DB, timeout=30)
rows = con.execute("SELECT metadata FROM AuditEvent WHERE action='FLAG_SUBMITTED' AND actorId=?", (bob_id,)).fetchall()
con.close()
metas = [json.loads(r[0] or "{}") for r in rows]
check("audit has FLAG_SUBMITTED rows for bob", len(metas) >= 3)
check("audit metadata: category + evidenceCount only (no description text)",
      all(("category" in m and "evidenceCount" in m) for m in metas) and
      not any("laptop" in json.dumps(m) for m in metas))
s, b = call(bob, "GET", "/api/v1/auth/activity")
actions = [e["action"] for e in b.get("events", [])]
check("bob activity feed includes FLAG_* events",
      any(a.startswith("FLAG_") for a in actions))
# security timeline subject-linkage (ada sees flag milestones)
s, b = call(ada, "GET", "/api/v1/passport/me")
sec_actions = [e["action"] for e in b.get("securityEvents", [])]
check("ada security timeline: FLAG_SUBMITTED + FLAG_RESOLUTION subject-linked",
      "FLAG_SUBMITTED" in sec_actions and "FLAG_RESOLUTION" in sec_actions)

print("== 17) DSR export: full reputation record, reporter unmasked ==")
s, b = callr(ada, "POST", "/api/v1/passport/dsr", {"type": "EXPORT"})
check("DSR export created", s == 201 and b.get("downloadPath", "").startswith("/api/v1/passport/dsr/"))
s, b = call(ada, "GET", b.get("downloadPath", "/api/v1/passport/dsr/x/export"))
payload = json.dumps(b)
check("export includes reputation section", '"reputation"' in payload)
check("export unmasked reporter handle (NDPA access right)", bob_handle in payload)
check("export includes flag description", "laptop" in payload)
check("export includes appeal/resolution records where present", '"resolution"' in payload)

print("== 18) route rate limit (flag create 3/min per user) ==")
s, b = call(henry, "POST", "/api/v1/reputation/flags", flag_body(carol_handle))
check("henry flag 1 -> 201", s == 201)
s, b = call(henry, "POST", "/api/v1/reputation/flags", flag_body(erin_handle))
check("henry flag 2 -> 201", s == 201)
s, b = call(henry, "POST", "/api/v1/reputation/flags", flag_body(dave_handle))
check("henry flag 3 -> 201", s == 201)
s, b = call(henry, "POST", "/api/v1/reputation/flags", flag_body(grace_handle))
check("henry 4th rapid flag -> 429 RATE_LIMITED (route brake)", s == 429 and errcode(b) == "RATE_LIMITED")

print("== 19) final read-model shape ==")
s, b = call(frank, "GET", "/api/v1/reputation/me")
me = b
check("frank stats: 2 confirmed, 1 cleared", me.get("stats", {}).get("confirmedAgainstMe") == 2
      and me.get("stats", {}).get("clearedAgainstMe") == 1)
check("frank flags include appeal states", any((f.get("appeal") or {}).get("status") in ("UPHELD", "OVERTURNED")
      for f in me.get("flagsAgainstMe", [])))
s, b = call(dave, "GET", "/api/v1/reputation/me")
check("dave reads role REVIEWER", b.get("role") == "REVIEWER")
check("mask note explains the retaliation shield + DSR path", "retaliation" in b.get("maskNote", ""))

print(f"\n===== RESULT: {PASS} pass / {FAIL} fail =====")
if FAIL:
    raise SystemExit(1)
