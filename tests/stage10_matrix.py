#!/usr/bin/env python3
"""TrustScore Stage 10 — Trust Network contract test matrix.
Covers: public provider registry (honest MOCK_LIVE/PLANNED), membership
consent lifecycle (join mints NETWORK consent; pause withdraws it and stops
edges counting for BOTH endpoints), interaction proposals (L2+ both sides,
self/unknown/duplicate/quota/edge-cap gates, 7-day lazy expiry), mutual
accept/decline/revoke lifecycle with score wiring (edges feed the SAME
Verified Reputation component; revoke/pause recompute), shared signals
(mint on human-confirmed flag, k-anonymized count in member safety checks,
retract on overturned appeal), DSR trustNetwork section, audit PII
discipline, activity feed, rate limits, deterministic cleanup."""
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
    email = f"stage10_{tag}_{stamp}@example.com"
    s, b = callr(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1",
        "displayName": "Stage Ten", "handle": f"s10_{tag}_{stamp}",
        "acceptTerms": True,
    })
    assert s == 201, f"register failed {s} {b}"
    return email, f"s10_{tag}_{stamp}"

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

def rep_component(op):
    s, b = call(op, "GET", "/api/v1/passport/me")
    comps = {c["key"]: c for c in b.get("score", {}).get("components", [])}
    return {
        "value": comps.get("verifiedReputation", {}).get("value"),
        "note": comps.get("verifiedReputation", {}).get("note", ""),
        "trigger": b.get("score", {}).get("trigger"),
        "explanation": b.get("score", {}).get("explanation", []),
    }

def flag_body(handle, category="FRAUD"):
    return {
        "subjectHandle": handle,
        "category": category,
        "description": ("Bought a phone on a marketplace listing, paid by transfer and the seller "
                        "went silent. Chat logs and the transfer receipt are available."),
        "evidence": [
            {"kind": "TEXT", "content": "Marketplace order #77231, chat export with timestamps."},
            {"kind": "LINK", "content": "https://chat.example/threads/77231"},
        ],
    }

def join(op):
    s, b = callr(op, "POST", "/api/v1/network/membership", {"status": "ACTIVE"})
    assert s == 200, f"join failed {s} {b}"

# ---------------------------------------------------------------------------
print("== Setup: u1/u2/u4 L2 members, u3 L1, u5 L0, u6 L2 member + safety consent, reviewer ==")
u1 = client(); u1_email, u1_handle = register(u1, "u1")
u2 = client(); u2_email, u2_handle = register(u2, "u2")
u3 = client(); u3_email, u3_handle = register(u3, "u3")
u4 = client(); u4_email, u4_handle = register(u4, "u4")
u5 = client(); u5_email, u5_handle = register(u5, "u5")
u6 = client(); u6_email, u6_handle = register(u6, "u6")
u7 = client(); u7_email, u7_handle = register(u7, "u7")

RUN = int(time.time() * 1000) % 10_000_000
for op in (u1, u2, u3, u4, u6, u7):
    verify_identity(op)
verify_phone(u1, f"0803 777 {RUN % 10000:04d}")
verify_phone(u2, f"0805 777 {(RUN + 1) % 10000:04d}")
verify_phone(u4, f"0806 777 {(RUN + 2) % 10000:04d}")
verify_phone(u6, f"0807 777 {(RUN + 3) % 10000:04d}")
verify_phone(u7, f"0808 777 {(RUN + 4) % 10000:04d}")
# u3 stays L1 (identity only); u5 stays L0 (no identity)

s, b = callr(u6, "POST", "/api/v1/safety/settings", {
    "enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": True,
})
assert s == 200, f"u6 safety settings {s} {b}"
# u7 needs standing safety consent too (non-member network-block check in §11)
s, b = callr(u7, "POST", "/api/v1/safety/settings", {
    "enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": True,
})
assert s == 200, f"u7 safety settings {s} {b}"

for op in (u1, u2, u4, u6):
    join(op)
join(u3)  # L1 member — joins fine, cannot attest
join(u5)  # L0 member — joins fine, cannot attest

promote_reviewer(u4_email)

# ---------------------------------------------------------------- 1) unauth
print("== 1) unauthenticated access ==")
anon = client()
for path, body, method in [
    ("/api/v1/network/me", None, "GET"),
    ("/api/v1/network/membership", {"status": "ACTIVE"}, "POST"),
    ("/api/v1/network/interactions", {"handle": "u2"}, "POST"),
    ("/api/v1/network/interactions/xyz/respond", {"decision": "ACCEPT"}, "POST"),
    ("/api/v1/network/interactions/xyz/revoke", {}, "POST"),
]:
    s, b = call(anon, method, path, body)
    check(f"unauth {method} {path.split('/api/v1')[1]} -> 401", s == 401, f"s={s}")

# ------------------------------------------------------------- 2) providers
print("== 2) public provider registry (pan-African, honest) ==")
s, b = call(anon, "GET", "/api/v1/network/providers")
check("GET /network/providers (no session) -> 200", s == 200)
provs = b.get("providers", [])
check("registry lists 8 corridors", len(provs) == 8, f"got={len(provs)}")
ng = next((p for p in provs if p["code"] == "NG"), {})
check("NG is the only MOCK_LIVE corridor", ng.get("mode") == "MOCK_LIVE" and
      sum(1 for p in provs if p["mode"] == "MOCK_LIVE") == 1)
check("NG depth 3/3/3", ng.get("depths") == {"gov": 3, "phone": 3, "liveness": 3})
check("non-NG corridors are PLANNED", all(p["mode"] == "PLANNED" for p in provs if p["code"] != "NG"))
check("every corridor carries a note", all(p.get("note") for p in provs))
check("honesty note present", "PLANNED" in b.get("honesty", ""))
payload = json.dumps(b)
check("registry carries no PII", "@s10_" not in payload)

# ------------------------------------------------------- 3) non-member shape
print("== 3) non-member / read-model shape ==")
s, b = call(u7, "GET", "/api/v1/network/me")  # u7: registered, L2, NOT a network member
check("GET /network/me -> 200", s == 200)
check("membership default not joined", b.get("membership", {}).get("joined") is False)
check("graph empty", b.get("graph", {}).get("nodes") == [] and b.get("graph", {}).get("edges") == [])
check("k-anonymity contract (minK=3, 90d)", b.get("kAnonymity", {}).get("minK") == 3 and
      b.get("kAnonymity", {}).get("windowDays") == 90)
check("honesty labels MOCK", "MOCK" in b.get("honesty", {}).get("note", ""))
check("quota present (3/7d)", b.get("standing", {}).get("quota", {}).get("max") == 3)
s, b = call(u5, "GET", "/api/v1/network/me")
check("L0 member read model fine (joined, degree 0)", b.get("membership", {}).get("joined") is True and
      b.get("standing", {}).get("degree") == 0)

# ------------------------------------------------------------- 4) membership
print("== 4) membership consent lifecycle ==")
u8 = client(); u8_email, u8_handle = register(u8, "u8")
verify_identity(u8); verify_phone(u8, f"0809 777 {(RUN + 5) % 10000:04d}")
s, b = callr(u8, "POST", "/api/v1/network/membership", {"status": "ACTIVE"})
check("join -> 200 ACTIVE", s == 200 and b.get("status") == "ACTIVE")
u8_id = db_user_id(u8_email)
con = sqlite3.connect(DB, timeout=30)
cons = con.execute("SELECT scopes, withdrawnAt FROM Consent WHERE userId=? AND requester LIKE '%Trust Network%'", (u8_id,)).fetchall()
con.close()
check("join mints a standing NETWORK consent", len(cons) == 1 and
      "NETWORK" in json.loads(cons[0][0] or "[]") and cons[0][1] is None)
s, b = callr(u8, "POST", "/api/v1/network/membership", {"status": "ACTIVE"})
check("re-join while active -> 409 ALREADY_JOINED", s == 409 and errcode(b) == "ALREADY_JOINED")
s, b = callr(u8, "POST", "/api/v1/network/membership", {"status": "PAUSED"})
check("pause -> 200 PAUSED", s == 200 and b.get("status") == "PAUSED")
con = sqlite3.connect(DB, timeout=30)
cons = con.execute("SELECT withdrawnAt FROM Consent WHERE userId=? AND requester LIKE '%Trust Network%'", (u8_id,)).fetchall()
con.close()
check("pause withdraws the consent", cons and cons[0][0] is not None)
s, b = callr(u8, "POST", "/api/v1/network/membership", {"status": "ACTIVE"})
check("re-join after pause -> 200 (fresh consent)", s == 200 and b.get("status") == "ACTIVE")
con = sqlite3.connect(DB, timeout=30)
rows = con.execute("SELECT action FROM AuditEvent WHERE actorId=? ORDER BY createdAt", (u8_id,)).fetchall()
con.close()
acts = [r[0] for r in rows]
check("audit: NETWORK_JOINED + NETWORK_PAUSED recorded", "NETWORK_JOINED" in acts and "NETWORK_PAUSED" in acts)
s, b = call(u8, "GET", "/api/v1/auth/activity")
check("activity feed surfaces NETWORK_JOINED", any(e["action"].startswith("NETWORK_") for e in b.get("events", [])))

# ---------------------------------------------------- 5) proposal validation
print("== 5) proposal gates (anti-gaming) ==")
s, b = callr(u7, "POST", "/api/v1/network/interactions", {"handle": u1_handle})
check("non-member proposer -> 409 NOT_A_MEMBER", s == 409 and errcode(b) == "NOT_A_MEMBER")
s, b = callr(u1, "POST", "/api/v1/network/interactions", {"handle": u1_handle})
check("self proposal -> 422 SELF", s == 422 and errcode(b) == "SELF")
s, b = callr(u1, "POST", "/api/v1/network/interactions", {"handle": "no_such_member_42"})
check("unknown handle -> 404 UNKNOWN_HANDLE", s == 404 and errcode(b) == "UNKNOWN_HANDLE")
s, b = callr(u1, "POST", "/api/v1/network/interactions", {"handle": u5_handle})
check("L0 target -> 404 TARGET_LEVEL_GATE", s == 404 and errcode(b) == "TARGET_LEVEL_GATE")
s, b = callr(u3, "POST", "/api/v1/network/interactions", {"handle": u1_handle})
check("L1 proposer -> 403 LEVEL_GATE", s == 403 and errcode(b) == "LEVEL_GATE")
s, b = callr(u5, "POST", "/api/v1/network/interactions", {"handle": u1_handle})
check("L0 proposer -> 403 LEVEL_GATE", s == 403 and errcode(b) == "LEVEL_GATE")

# ----------------------------------------------------------- 6) happy flow
print("== 6) propose -> respond -> active (mutual) ==")
rep_u2_before = rep_component(u2)
s, b = callr(u1, "POST", "/api/v1/network/interactions", {"handle": u2_handle})
check("u1 proposes u2 -> 201 PENDING", s == 201 and b.get("outcome") == "PROPOSED")
edge1 = b.get("edgeId")
check("proposal carries 7-day expiry", "expiresAt" in b)
con = sqlite3.connect(DB, timeout=30)
rows = con.execute("SELECT title FROM Notification WHERE userId=? ORDER BY createdAt DESC LIMIT 1", (db_user_id(u2_email),)).fetchall()
con.close()
check("u2 notified of the proposal", rows and "proposed a verified interaction" in rows[0][0])
s, b = call(u2, "GET", "/api/v1/network/me")
incoming = b.get("interactions", {}).get("incoming", [])
check("u2 sees the incoming request with requester identity",
      len(incoming) == 1 and incoming[0]["from"]["handle"] == u1_handle)
check("incoming request carries expiry", "expiresAt" in incoming[0])
s, b = call(u1, "GET", "/api/v1/network/me")
check("u1 sees it as outgoing", len(b.get("interactions", {}).get("outgoing", [])) == 1)

# decline first — a declined lifecycle must not block a fresh proposal
s, b = callr(u2, "POST", f"/api/v1/network/interactions/{incoming[0]['id']}/respond", {"decision": "DECLINE"})
check("u2 declines -> 200 DECLINED", s == 200 and b.get("status") == "DECLINED")
s, b = call(u1, "GET", "/api/v1/network/me")
hist = b.get("interactions", {}).get("history", [])
check("decline lands in u1's history", any(h["status"] == "DECLINED" for h in hist))
check("decline leaves reputation untouched", rep_component(u2)["value"] == rep_u2_before["value"])

# fresh proposal -> accept
s, b = callr(u1, "POST", "/api/v1/network/interactions", {"handle": u2_handle})
check("fresh proposal after decline -> 201", s == 201)
edge2 = b.get("edgeId")
s, b = call(u2, "GET", "/api/v1/network/me")
incoming = b.get("interactions", {}).get("incoming", [])
s, b = callr(u2, "POST", f"/api/v1/network/interactions/{incoming[0]['id']}/respond", {"decision": "ACCEPT"})
check("u2 accepts -> 200 ACTIVE", s == 200 and b.get("status") == "ACTIVE")
s, b = call(u1, "GET", "/api/v1/network/me")
check("u1 graph now shows u2 (degree 1)", b.get("standing", {}).get("degree") == 1)
node = (b.get("graph", {}).get("nodes", []) or [{}])[0]
check("graph node carries identity + level + membership",
      node.get("handle") == u2_handle and node.get("level", 0) >= 2 and node.get("membership") == "ACTIVE")
check("u1 counting partners = 1", b.get("standing", {}).get("countingPartners") == 1)
con = sqlite3.connect(DB, timeout=30)
rows = con.execute("SELECT title FROM Notification WHERE userId=? ORDER BY createdAt DESC LIMIT 1", (db_user_id(u1_email),)).fetchall()
con.close()
check("u1 notified of acceptance", rows and "accepted" in rows[0][0])
s, b = call(u3, "POST", f"/api/v1/network/interactions/{edge2}/respond", {"decision": "ACCEPT"})
check("non-invited member cannot respond -> 403 NOT_INVITED", s == 403 and errcode(b) == "NOT_INVITED")

# ------------------------------------------------------ 7) score wiring
print("== 7) score wiring (same component, explained) ==")
rep_u2_after = rep_component(u2)
check("u2 reputation +3 (one network attestation)", rep_u2_after["value"] == rep_u2_before["value"] + 3,
      f"before={rep_u2_before['value']} after={rep_u2_after['value']}")
check("component note mentions the network attestation", "network attestation" in rep_u2_after["note"])
check("explanation mentions mutual Trust Network attestation",
      any("Trust Network attestation" in l for l in rep_u2_after["explanation"]))
check("recompute recorded as MATERIAL_CHANGE", rep_u2_after["trigger"] == "MATERIAL_CHANGE")
rep_u1_after = rep_component(u1)
check("u1 (the proposer) gains the same +3", rep_u1_after["value"] == 3)

# ------------------------------------------------------- 8) revoke lifecycle
print("== 8) revoke + one-open-lifecycle + quota ==")
s, b = callr(u1, "POST", "/api/v1/network/interactions", {"handle": u2_handle})
check("duplicate propose while ACTIVE -> 409 OPEN_LIFECYCLE", s == 409 and errcode(b) == "OPEN_LIFECYCLE")
s, b = callr(u2, "POST", f"/api/v1/network/interactions/{edge2}/revoke", {})
check("u2 revokes the active edge -> 200 REVOKED", s == 200 and b.get("status") == "REVOKED")
check("u1 reputation drops back after revoke", rep_component(u1)["value"] == 0)
s, b = call(u1, "GET", "/api/v1/network/me")
check("u1 degree back to 0", b.get("standing", {}).get("degree") == 0)
s, b = callr(u1, "POST", "/api/v1/network/interactions", {"handle": u2_handle})
check("re-propose after revoke opens a fresh lifecycle -> 201", s == 201)
edge3 = b.get("edgeId")
s, b = callr(u2, "POST", f"/api/v1/network/interactions/{edge3}/revoke", {})
check("invited member cannot CANCEL a pending proposal (decline instead) -> 403", s == 403 and errcode(b) == "ONLY_REQUESTER_CANCELS")
s, b = callr(u1, "POST", f"/api/v1/network/interactions/{edge3}/revoke", {})
check("proposer cancels own pending -> 200 REVOKED", s == 200 and b.get("status") == "REVOKED")

# quota: u1 has now made 3 proposals in this window (1 declined-path, 1 accepted-path,
# 1 cancelled) — the next one trips the 3-per-7-day quota
s, b = callr(u1, "POST", "/api/v1/network/interactions", {"handle": u2_handle})
check("4th proposal within 7 days -> 429 QUOTA", s == 429 and errcode(b) == "QUOTA", f"s={s} {b.get('error')}")
s, b = call(u1, "GET", "/api/v1/network/me")
check("quota read model shows used=3 / max=3", b.get("standing", {}).get("quota", {}).get("used") == 3)

# ------------------------------------------------------------ 9) lazy expiry
print("== 9) pending expiry (7-day, lazy) ==")
s, b = callr(u4, "POST", "/api/v1/network/interactions", {"handle": u2_handle})
edge4 = b.get("edgeId")
con = sqlite3.connect(DB, timeout=30)
con.execute("UPDATE TrustEdge SET expiresAt=? WHERE id=?", (int((time.time() - 1000) * 1000), edge4))
con.commit()
# force expire on read; integer epoch-ms (SQLite DateTime storage)
con.close()
s, b = call(u2, "GET", "/api/v1/network/me")
hist = b.get("interactions", {}).get("history", [])
check("stale pending flips to EXPIRED on read", any(h["status"] == "EXPIRED" for h in hist))
s, b = callr(u2, "POST", f"/api/v1/network/interactions/{edge4}/respond", {"decision": "ACCEPT"})
check("responding to an expired proposal -> 409", s == 409, f"s={s} code={errcode(b)}")

# -------------------------------------------------------- 10) pause semantics
print("== 10) pause stops the edge counting for BOTH endpoints ==")
s, b = callr(u2, "POST", f"/api/v1/network/interactions/{edge3}/revoke", {})  # ensure edge3 closed
s, b = callr(u4, "POST", "/api/v1/network/interactions", {"handle": u2_handle})
# quota burned? u4 has 1 so far (edge4 expired) — allowed
edge5 = b.get("edgeId")
s, b = callr(u2, "POST", f"/api/v1/network/interactions/{edge5}/respond", {"decision": "ACCEPT"})
assert s == 200, f"accept edge5 {s} {b}"
check("u2 reputation +3 again (edge5)", rep_component(u2)["value"] == 3)
s, b = callr(u2, "POST", "/api/v1/network/membership", {"status": "PAUSED"})
check("u2 pauses -> 200", s == 200)
rep_u2_paused = rep_component(u2)
check("u2's OWN edges stop counting on pause (rep 0)", rep_u2_paused["value"] == 0,
      f"got={rep_u2_paused['value']}")
rep_u4_paused = rep_component(u4)
check("u4 (the partner) also loses the counting edge", rep_u4_paused["value"] == 0)
s, b = call(u4, "GET", "/api/v1/network/me")
nodes = b.get("graph", {}).get("nodes", [])
check("u4's graph shows partner PAUSED", any(n.get("membership") == "PAUSED" for n in nodes))
check("u4 counting partners = 0 while partner paused", b.get("standing", {}).get("countingPartners") == 0)
s, b = callr(u2, "POST", "/api/v1/network/membership", {"status": "ACTIVE"})
check("u2 re-joins -> edges count again", s == 200 and rep_component(u2)["value"] == 3)
check("partner's counting restored too", rep_component(u4)["value"] == 3)

# ------------------------------------------ 11) shared signals + checks
print("== 11) shared signals: mint on confirm, k-anonymity in checks, retract on overturn ==")
# u4 (L2 member) flags u6 (L2 member) — reviewer u4? conflict: u4 files, reviewer must differ.
s, b = callr(u7, "POST", "/api/v1/reputation/flags", flag_body(u6_handle))
check("u7 flags u6 -> 201", s == 201)
flag_id = b.get("flagId")
# reviewer (u4 promoted) — conflict of interest only if reporter/subject; u4 is neither
s, b = callr(u4, "POST", f"/api/v1/reputation/review/{flag_id}/decision",
            {"outcome": "CONFIRMED", "rationale": "Transfer receipt and chat log line up; the seller pattern matches prior confirmed cases."})
check("reviewer confirms the flag", s == 200)
con = sqlite3.connect(DB, timeout=30)
sig = con.execute("SELECT id, kind, platform, severity, sourceType, sourceId, retractedAt FROM SharedSignal WHERE subjectUserId=? ORDER BY createdAt DESC LIMIT 1", (db_user_id(u6_email),)).fetchone()
con.close()
check("CONFIRMED flag minted a shared signal", sig is not None and sig[4] == "PLATFORM_RESOLUTION" and sig[5] == flag_id)
check("signal severity HIGH for FRAUD category", sig and sig[3] == "HIGH")
check("signal platform is the sandbox itself", sig and "TrustScore" in sig[2])
s, b = call(u6, "GET", "/api/v1/network/me")
sigs = b.get("signals", [])
check("u6 sees own signal with dispute path", len(sigs) == 1 and "14-day appeal" in json.dumps(sigs[0]))
# member safety check now carries the k-anonymized network block
s, b = callr(u1, "POST", "/api/v1/safety/check", {"handle": u6_handle})
check("check on u6 -> 200", s == 200)
net = (b.get("assessment", {}) or {}).get("network", {})
check("assessment carries a network block", net.get("joined") is True)
ss = net.get("sharedSignals", {})
check("1 live signal is k-anonymized up to the minimum cohort (3)", ss.get("count") == 3,
      f"got={ss.get('count')}")
check("platforms listed band-level", ss.get("platforms") == ["TrustScore (sandbox)"])
check("note stays band-level + not-a-guarantee", "never a guarantee" in net.get("note", ""))
check("businessChecks counter present", isinstance(net.get("businessChecks"), int))
# non-member subject: no network block data
s, b = callr(u1, "POST", "/api/v1/safety/check", {"handle": u7_handle})  # u7 not a network member
net7 = (b.get("assessment", {}) or {}).get("network", {})
check("non-member subject: joined=false, no counts, not adverse",
      net7.get("joined") is False and net7.get("sharedSignals") is None and "not an adverse signal" in net7.get("note", ""))

# appeal -> overturn retracts the signal
s, b = callr(u6, "POST", f"/api/v1/reputation/flags/{flag_id}/appeal", {
    "reason": "I delivered the phone; the chat log continues past the transfer date with delivery confirmation photos."
})
check("u6 appeals the confirmation", s == 200)
appeal_id = b.get("appealId")
s, b = callr(u4, "POST", f"/api/v1/reputation/appeals/{appeal_id}/decision",
            {"outcome": "OVERTURNED", "note": "On re-examination the delivery photos postdate the transfer and match the listing. The flag is overturned."})
check("reviewer overturns the appeal", s == 200)
con = sqlite3.connect(DB, timeout=30)
sig2 = con.execute("SELECT retractedAt FROM SharedSignal WHERE sourceId=?", (flag_id,)).fetchone()
con.close()
check("overturned appeal retracts the shared signal", sig2 and sig2[0] is not None)
s, b = callr(u1, "POST", "/api/v1/safety/check", {"handle": u6_handle})
net = (b.get("assessment", {}) or {}).get("network", {})
check("fresh check: signal count back to 0 + honest zero note",
      net.get("sharedSignals", {}).get("count") == 0 and "No shared signals" in net.get("note", ""))
con = sqlite3.connect(DB, timeout=30)
acts = [r[0] for r in con.execute("SELECT action FROM AuditEvent WHERE action LIKE 'NETWORK_SIGNAL%' ORDER BY createdAt", ()).fetchall()]
con.close()
check("audit: NETWORK_SIGNAL_MINTED + NETWORK_SIGNAL_RETRACTED", "NETWORK_SIGNAL_MINTED" in acts and "NETWORK_SIGNAL_RETRACTED" in acts)

# ---------------------------------------------------------------- 12) DSR
print("== 12) DSR export: trustNetwork section ==")
s, b = callr(u6, "POST", "/api/v1/passport/dsr", {"type": "EXPORT"})
check("DSR export created", s == 201 and b.get("downloadPath", "").startswith("/api/v1/passport/dsr/"))
s, b = call(u6, "GET", b.get("downloadPath", "/x"))
payload = json.dumps(b)
check("export includes trustNetwork section", '"trustNetwork"' in payload)
tn = b.get("trustNetwork", {})
check("export membership + attestations present", tn.get("membership", {}).get("status") == "ACTIVE")
check("export shared signals include the retracted row (full honesty)",
      any(s2.get("retractedAt") for s2 in tn.get("sharedSignals", [])))

# ------------------------------------------------------------ 13) audit PII
print("== 13) audit PII discipline ==")
u1_id = db_user_id(u1_email)
con = sqlite3.connect(DB, timeout=30)
rows = con.execute("SELECT action, metadata FROM AuditEvent WHERE action LIKE 'NETWORK_%' AND actorId=?", (u1_id,)).fetchall()
con.close()
check("NETWORK_* audit rows exist for u1", len(rows) >= 4)
meta_blob = json.dumps([json.loads(r[1] or "{}") for r in rows])
check("network audit metadata carries no partner identity (no handles/emails)",
      u2_handle not in meta_blob and "example.com" not in meta_blob)

# ----------------------------------------------------------- 14) rate limit
print("== 14) route rate limit (10/min per user) ==")
rl = client()
rl_email, rl_handle = register(rl, "rl")
verify_identity(rl); verify_phone(rl, f"0811 777 {(RUN + 6) % 10000:04d}")
join(rl)
trip = 0
for i in range(11):
    s, b = call(rl, "POST", "/api/v1/network/interactions", {"handle": "zz_unknown_%d" % i})
    if s == 429 and errcode(b) == "RATE_LIMITED":
        trip = i + 1
        break
check("rapid proposals trip the route brake (<=11th call)", trip > 0, f"tripped at call {trip or 'never'}")

# ------------------------------------------------- 15) deterministic cleanup
print("== 15) cleanup (ordered, orphan-free) ==")
emails = [u1_email, u2_email, u3_email, u4_email, u5_email, u6_email, u7_email, u8_email, rl_email]
con = sqlite3.connect(DB, timeout=30)
ids = []
for e in emails:
    row = con.execute("SELECT id FROM UserAccount WHERE email=?", (e,)).fetchone()
    if row:
        ids.append(row[0])
qmarks = ",".join("?" for _ in ids)
con.execute(f"DELETE FROM TrustEdge WHERE aUserId IN ({qmarks}) OR bUserId IN ({qmarks})", ids + ids)
con.execute(f"DELETE FROM SharedSignal WHERE subjectUserId IN ({qmarks})", ids)
con.execute(f"DELETE FROM NetworkMembership WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM TrustReceipt WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM SafetyCheck WHERE verifierId IN ({qmarks}) OR subjectId IN ({qmarks})", ids + ids)
con.execute(f"DELETE FROM FlagEvidence WHERE flagId IN (SELECT id FROM Flag WHERE reporterId IN ({qmarks}) OR subjectId IN ({qmarks}))", ids + ids)
con.execute(f"DELETE FROM FlagResolution WHERE flagId IN (SELECT id FROM Flag WHERE reporterId IN ({qmarks}) OR subjectId IN ({qmarks}))", ids + ids)
con.execute(f"DELETE FROM FlagAppeal WHERE flagId IN (SELECT id FROM Flag WHERE reporterId IN ({qmarks}) OR subjectId IN ({qmarks}))", ids + ids)
con.execute(f"DELETE FROM Flag WHERE reporterId IN ({qmarks}) OR subjectId IN ({qmarks})", ids + ids)
con.execute(f"DELETE FROM TrustScoreSnapshot WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM Credential WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM IdentityIdentifier WHERE trustIdentityId IN (SELECT id FROM TrustIdentity WHERE userId IN ({qmarks}))", ids)
con.execute(f"DELETE FROM IdentityAttribute WHERE trustIdentityId IN (SELECT id FROM TrustIdentity WHERE userId IN ({qmarks}))", ids)
con.execute(f"DELETE FROM Evidence WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM PhoneVerification WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM LivenessSession WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM VerificationSession WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM Consent WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM Notification WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM Session WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM AuditEvent WHERE actorId IN ({qmarks}) OR subjectId IN ({qmarks})", ids + ids)
con.execute(f"DELETE FROM TrustIdentity WHERE userId IN ({qmarks})", ids)
con.execute(f"DELETE FROM UserAccount WHERE id IN ({qmarks})", ids)
con.commit()
con.close()
con = sqlite3.connect(DB, timeout=30)
n = con.execute(f"SELECT COUNT(*) FROM TrustEdge WHERE aUserId IN ({qmarks}) OR bUserId IN ({qmarks})", ids + ids).fetchone()[0]
con.close()
check("test users + network rows removed (orphan-free)", n == 0)

# providers registry stays stable (idempotent seed)
s, b = call(anon, "GET", "/api/v1/network/providers")
check("provider registry stable at 8 after the run", len(b.get("providers", [])) == 8)

print(f"\n===== RESULT: {PASS} pass / {FAIL} fail =====")
if FAIL:
    raise SystemExit(1)
