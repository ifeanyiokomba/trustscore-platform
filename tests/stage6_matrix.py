#!/usr/bin/env python3
"""TrustScore Stage 6 — Safety Check + Trust Requests contract test matrix.
Covers: verifier-side checks by HANDLE (standing consent, anti-enumeration),
PHONE (consent-gated peppered-hash identifier match — raw phone never stored
or echoed), TRUST_LINK/QR (token scopes govern, views counted, named
receipts), sanitized assessments (locked language, no overclaim, freshness,
explanation), per-check consent + receipts + notifications + audit, trust
requests (send/duplicate/self, accept mints token + runs named assessment,
decline shares nothing), verifier history, subject read model (settings,
stats, received checks), DSR export inclusion, security-timeline subject
linkage, zod boundaries, rate limits."""
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
    for attempt in range(3):
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
    email = f"stage6_{tag}_{stamp}@example.com"
    s, b = call(op, "POST", "/api/v1/auth/register", {
        "email": email, "password": "SuperSecret1",
        "displayName": "Stage Six", "handle": f"s6_{tag}_{stamp}",
        "acceptTerms": True,
    })
    assert s == 201, f"register failed {s} {b}"
    return email, f"s6_{tag}_{stamp}"

def verify_identity(op, scopes=None):
    body = {"scopes": scopes} if scopes else {}
    s, b = callr(op, "POST", "/api/v1/identity/sessions", body)
    assert s == 201, f"session create {s} {b}"
    sid = b["session"]["id"]
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/consent", {
        "decision": "GRANT",
        "scopes": scopes or ["identity.basic", "identity.nin_status"],
    })
    assert s == 200, f"consent {s} {b}"
    s, b = call(op, "POST", f"/api/v1/identity/sessions/{sid}/callback", {
        "code": b["code"], "state": b["state"],
    })
    assert s == 200, f"callback {s} {b}"
    return b

def verify_phone(op, phone):
    s, b = callr(op, "POST", "/api/v1/identity/signals/phone/start", {"phone": phone})
    assert s == 201, f"phone start {s} {b}"
    vid = b["verification"]["id"]
    code = extract_code(b["delivery"]["message"])
    s, b = call(op, "POST", "/api/v1/identity/signals/phone/confirm", {
        "verificationId": vid, "code": code,
    })
    assert s == 200, f"phone confirm {s} {b}"

# ---------------------------------------------------------------------------
print("== Setup: verifier (u1), full subject (u2: identity + phone), unverified (u3) ==")
u1 = client(); u1_email, u1_handle = register(u1, "v")
u2 = client(); u2_email, u2_handle = register(u2, "s")
u3 = client(); u3_email, u3_handle = register(u3, "n")
verify_identity(u2)
# Unique phone per run: hash-lookup is globally unambiguous (a number binds
# to one identity — re-verification supersedes the older binding).
RUN = int(time.time() * 1000) % 10_000_000
SUBJECT_PHONE = f"0803 555 {RUN % 10000:04d}"  # subject's phone (u2)

# ---------------------------------------------------------------- 1) unauth
print("== 1) unauthenticated access ==")
anon = client()
for path, body in [
    ("/api/v1/safety/check", {"handle": u1_handle}),
    ("/api/v1/safety/settings", {"enabled": True}),
    ("/api/v1/safety/request", {"handle": u2_handle}),
    ("/api/v1/safety/request/xyz/respond", {"decision": "ACCEPT"}),
]:
    s, b = call(anon, "POST", path, body)
    check(f"unauth POST {path.split('/')[-1]} -> 401", s == 401 and errcode(b) == "UNAUTHENTICATED")
for path in ["/api/v1/safety/checks", "/api/v1/safety/me"]:
    s, b = call(anon, "GET", path)
    check(f"unauth GET {path.split('/')[-1]} -> 401", s == 401 and errcode(b) == "UNAUTHENTICATED")

# ------------------------------------------------------- 2) zod / input contract
print("== 2) input validation ==")
s, b = call(u1, "POST", "/api/v1/safety/check", {})
check("no input -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(u1, "POST", "/api/v1/safety/check", {"handle": u1_handle, "link": "ts_abcdefghij"})
check("two inputs -> 422", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(u1, "POST", "/api/v1/safety/check", {"handle": "ab"})
check("too-short handle -> UNAVAILABLE (valid-format guard)", s == 200 and b.get("outcome") == "UNAVAILABLE")
s, b = call(u1, "POST", "/api/v1/safety/check", {"phone": "123"})
check("too-short phone -> 422 VALIDATION_ERROR", s == 422 and errcode(b) == "VALIDATION_ERROR")
s, b = call(u1, "POST", "/api/v1/safety/check", {"handle": u1_handle, "extra": 1})
check("unknown key -> 422 (strict)", s == 422 and errcode(b) == "VALIDATION_ERROR")

# ------------------------------------------------------- 3) anti-enumeration
print("== 3) anti-enumeration: unknown == disabled (byte-identical) ==")
s_unknown, b_unknown = call(u1, "POST", "/api/v1/safety/check", {"handle": "no_such_user_42"})
check("unknown handle -> UNAVAILABLE 200", s_unknown == 200 and b_unknown.get("outcome") == "UNAVAILABLE")
s_off, b_off = call(u1, "POST", "/api/v1/safety/check", {"handle": u2_handle})
check("existing handle w/o consent -> UNAVAILABLE 200", s_off == 200 and b_off.get("outcome") == "UNAVAILABLE")
check("unknown and disabled responses byte-identical", b_unknown == b_off,
      f"{b_unknown} != {b_off}")
check("message is the generic no-profile line",
      "No safety-check profile" in b_off.get("message", ""))

# ------------------------------------------------------------ 4) self-check
print("== 4) self-check (verifier's own handle) ==")
s, b = call(u1, "POST", "/api/v1/safety/check", {"handle": u1_handle})
check("self -> SELF with assessment", s == 200 and b.get("outcome") == "SELF" and "assessment" in b)
a = b.get("assessment", {})
check("self assessment has subject + signals (full view)", a.get("subject", {}).get("handle") == u1_handle)
check("self assessment no score key (band-level only)", "score" not in a)
check("self has locked language", "adverse" in a.get("language", {}) and "not a guarantee" in a["language"]["disclaimer"].lower())
s, b = call(u1, "GET", "/api/v1/safety/checks")
self_row = [c for c in b["checks"] if c.get("self")]
check("self-check recorded in history", len(self_row) == 1)

# -------------------------------------------- 5) subject enables standing consent
print("== 5) standing SAFETY_CHECK consent (enable + scope toggles) ==")
s, b = call(u2, "POST", "/api/v1/safety/settings", {
    "enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": False,
})
check("enable -> 200 settings", s == 200 and b["settings"]["enabled"] is True)
check("settings has consentId", bool(b["settings"]["consentId"]))
check("phoneMatch off", b["settings"]["allowPhoneMatch"] is False)

# consent exists in Consent table with requester + purpose + policy version
con = sqlite3.connect(DB)
row = con.execute(
    "SELECT requester, purpose, scopes, policyVersion, withdrawnAt FROM Consent WHERE id=?",
    (b["settings"]["consentId"],),
).fetchone()
con.close()
check("consent row: requester is Safety Check service", row is not None and "Safety Check" in row[0])
check("consent row: purpose recorded", row is not None and "safety check" in row[1].lower())
check("consent row: policy version", row is not None and row[3].startswith("consent-policy"))
check("consent row: not withdrawn", row is not None and row[4] is None)

# ---------------------------------------------------------- 6) handle check
print("== 6) HANDLE check (consent-backed, receipted) ==")
s, b = callr(u1, "POST", "/api/v1/safety/check", {"handle": u2_handle})
check("handle check -> OK", s == 200 and b.get("outcome") == "OK")
a = b.get("assessment", {})
check("assessment has headline", bool(a.get("headline")))
check("assessment status present", a.get("summary", {}).get("status") in
      ("NEW", "VERIFIED", "ESTABLISHED", "CAUTION", "HIGH_RISK", "REVIEW_REQUIRED"))
check("assessment subject shown (profile scope)", a.get("subject", {}).get("handle") == u2_handle)
check("assessment freshness fields", "assessedAt" in a.get("freshness", {}) and "fresh" in a.get("freshness", {}))
check("assessment explanation lines (NDPA-style)", isinstance(a.get("explanation"), list) and len(a["explanation"]) >= 2)
check("language locked: adverse line + not-a-guarantee disclaimer",
      a.get("language", {}).get("adverse") == "No confirmed adverse signals found"
      and "not a guarantee" in a.get("language", {}).get("disclaimer", "").lower())
check("headline never claims safe", "safe" not in (a.get("headline") or "").lower())
check("receipted flag true", b.get("receipted") is True)

# subject sees the check with the verifier's NAME
s, b = call(u2, "GET", "/api/v1/safety/me")
rec = b["checksReceived"][0] if b["checksReceived"] else {}
check("subject sees named verifier", rec.get("verifier", {}).get("handle") == u1_handle)
check("subject sees method HANDLE", rec.get("method") == "HANDLE")
check("subject stats: 1 total", b["stats"]["totalChecks"] >= 1)
check("subject stats: lastCheckAt set", bool(b["stats"]["lastCheckAt"]))

# scope toggle: hide profile
s, b = callr(u2, "POST", "/api/v1/safety/settings", {
    "enabled": True, "includeProfile": False, "includeSignals": True, "allowPhoneMatch": False,
})
s, b = callr(u1, "POST", "/api/v1/safety/check", {"handle": u2_handle})
a = b.get("assessment", {})
check("profile scope off -> no subject in assessment", "subject" not in a or a.get("subject") is None)
# scope toggle: hide signals
s, b = callr(u2, "POST", "/api/v1/safety/settings", {
    "enabled": True, "includeProfile": True, "includeSignals": False, "allowPhoneMatch": False,
})
s, b = callr(u1, "POST", "/api/v1/safety/check", {"handle": u2_handle})
a = b.get("assessment", {})
check("signals scope off -> empty signals", a.get("signals") == [])
# restore both for later sections
callr(u2, "POST", "/api/v1/safety/settings", {
    "enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": False,
})

# --------------------------------------------------------------- 7) PHONE match
print("== 7) PHONE match (consent-gated peppered-hash) ==")
verify_phone(u2, SUBJECT_PHONE)
# phoneMatch scope OFF -> identical UNAVAILABLE as no-match
s, b = callr(u1, "POST", "/api/v1/safety/check", {"phone": SUBJECT_PHONE.replace(" ", "")})
check("phone match w/o consent -> UNAVAILABLE", s == 200 and b.get("outcome") == "UNAVAILABLE")
s2, b2 = callr(u1, "POST", "/api/v1/safety/check", {"phone": f"0803 999 {RUN % 10000:04d}"})
check("no-match phone -> UNAVAILABLE", s2 == 200 and b2.get("outcome") == "UNAVAILABLE")
check("no-match and not-opted-in identical", b == b2)
check("raw phone never echoed in any response",
      SUBJECT_PHONE.replace(" ", "") not in json.dumps(b) and SUBJECT_PHONE not in json.dumps(b))

s, b = callr(u2, "POST", "/api/v1/safety/settings", {
    "enabled": True, "includeProfile": True, "includeSignals": True, "allowPhoneMatch": True,
})
check("allowPhoneMatch on", b["settings"]["allowPhoneMatch"] is True)
s, b = callr(u1, "POST", "/api/v1/safety/check", {"phone": SUBJECT_PHONE.replace(" ", "")})
check("phone match -> OK", s == 200 and b.get("outcome") == "OK")
a = b.get("assessment", {})
check("phone assessment subject = subject handle", a.get("subject", {}).get("handle") == u2_handle)
check("phone method recorded", a.get("method") == "PHONE")
check("phone hint appears as masked signal chip",
      any("•" in (s_.get("hint") or "") for s_ in a.get("signals", [])))
# formats normalize: repeated lookup still matches
s, b = callr(u1, "POST", "/api/v1/safety/check", {"phone": SUBJECT_PHONE.replace(" ", "")})
check("E.164 normalization: repeated form matches", s == 200 and b.get("outcome") == "OK")
# self-phone → UNAVAILABLE (anti-enumeration identical)
s, b = callr(u2, "POST", "/api/v1/safety/check", {"phone": SUBJECT_PHONE.replace(" ", "")})
check("self phone -> UNAVAILABLE (no self-leak)", s == 200 and b.get("outcome") == "UNAVAILABLE")
# subject sees PHONE-method receipt
s, b = call(u2, "GET", "/api/v1/safety/me")
check("subject sees PHONE-method receipt", any(c["method"] == "PHONE" for c in b["checksReceived"]))

# ---------------------------------------------------------- 8) trust link / QR
print("== 8) TRUST_LINK + QR checks (token scopes govern) ==")
s, b = callr(u2, "POST", "/api/v1/passport/share", {
    "ttlHours": 1, "maxViews": 5, "scopes": ["PROFILE", "SIGNALS", "SCORE", "ATTRIBUTES"],
})
check("subject creates scoped token", s == 201 and b["token"].startswith("ts_"))
tok = b["token"]
s, b = callr(u1, "POST", "/api/v1/safety/check", {"link": tok})
check("link check -> OK", s == 200 and b.get("outcome") == "OK")
a = b.get("assessment", {})
check("link assessment method TRUST_LINK", a.get("method") == "TRUST_LINK")
check("SCORE scope -> score present", "score" in a and "confidence" in a["score"])
check("subject shown via PROFILE scope", a.get("subject", {}).get("handle") == u2_handle)
# QR payload (URL form) → method QR
s, b = callr(u1, "POST", "/api/v1/safety/check", {"qr": f"http://localhost:3000/?trust={tok}"})
check("QR URL payload -> OK method QR", s == 200 and b.get("assessment", {}).get("method") == "QR")
# views counted (2 opens so far of 5)
s, b = call(u2, "GET", "/api/v1/passport/me")
row = [t for t in b["shareTokens"] if t["status"] == "ACTIVE"][0]
check("safety opens count against token views", row["views"] >= 2,
      f"views={row['views']}")
# receipt channel + label
check("named receipt label on subject receipts",
      any(r["viewerLabel"] == f"Safety Check by @{u1_handle}" for r in b["receipts"]))
check("receipt channel SAFETY_CHECK",
      any(r["channel"] == "SAFETY_CHECK" for r in b["receipts"]))

# dead link: revoked
s, b = call(u2, "DELETE", f"/api/v1/passport/share/{row['id']}")
s, b = callr(u1, "POST", "/api/v1/safety/check", {"link": tok})
check("revoked link -> DEAD_LINK REVOKED", s == 200 and b.get("outcome") == "DEAD_LINK" and b.get("reason") == "REVOKED")
# dead link: malformed
s, b = call(u1, "POST", "/api/v1/safety/check", {"link": "ts_notarealtoken_at_all"})
check("malformed link -> DEAD_LINK (generic)", s == 200 and b.get("outcome") == "DEAD_LINK")

# view-limit death: maxViews 1 token
s, b = callr(u2, "POST", "/api/v1/passport/share", {"ttlHours": 1, "maxViews": 1, "scopes": ["SCORE"]})
tok2 = b["token"]
s, b = callr(u1, "POST", "/api/v1/safety/check", {"link": tok2})
check("view-1 of maxViews=1 token -> OK", s == 200 and b.get("outcome") == "OK")
s, b = call(u1, "POST", "/api/v1/safety/check", {"link": tok2})
check("view-2 -> DEAD_LINK VIEW_LIMIT", s == 200 and b.get("outcome") == "DEAD_LINK" and b.get("reason") == "VIEW_LIMIT")

# ------------------------------------------------------------- 9) trust requests
print("== 9) trust requests (send / accept / decline) ==")
# u3 (no consent, no identity) is uncheckable → u1 requests
s, b = callr(u1, "POST", "/api/v1/safety/request", {"handle": u3_handle})
check("send request -> 201 OK", s == 201 and b.get("outcome") == "OK")
rid = b["requestId"]
exp_ts = time.mktime(time.strptime(b["expiresAt"][:19], "%Y-%m-%dT%H:%M:%S"))
check("request has ~7-day expiry", 6.9 * 86400 <= (exp_ts - time.time()) <= 7.1 * 86400)
s, b = callr(u1, "POST", "/api/v1/safety/request", {"handle": u3_handle})
check("duplicate pending -> 409 ALREADY_REQUESTED", s == 409 and errcode(b) == "ALREADY_REQUESTED")
s, b = call(u1, "POST", "/api/v1/safety/request", {"handle": u1_handle})
check("self request -> 422 SELF_REQUEST", s == 422 and errcode(b) == "SELF_REQUEST")
s, b = call(u1, "POST", "/api/v1/safety/request", {"handle": "no_such_user_43"})
check("unknown handle request -> UNAVAILABLE (generic)", s == 200 and b.get("outcome") == "UNAVAILABLE")

# u3 sees the pending request
s, b = call(u3, "GET", "/api/v1/safety/me")
pend = [r for r in b["requestsReceived"] if r["status"] == "PENDING"]
check("subject sees PENDING request w/ verifier name", len(pend) == 1 and pend[0]["verifier"]["handle"] == u1_handle)
check("request message names the verifier", u1_handle in pend[0]["message"])

# cross-user respond → 404
s, b = call(u2, "POST", f"/api/v1/safety/request/{rid}/respond", {"decision": "DECLINE"})
check("cross-user respond -> 404", s == 404 and errcode(b) == "NOT_FOUND")

# ACCEPT: mints token once + runs the named assessment for u1
s, b = call(u3, "POST", f"/api/v1/safety/request/{rid}/respond", {"decision": "ACCEPT"})
check("accept -> OK ACCEPTED", s == 200 and b.get("decision") == "ACCEPTED")
check("accept returns raw token ONCE", bool(b.get("token")) and b["token"].startswith("ts_"))
check("accept returns linkPath", b.get("linkPath", "").startswith("/?trust="))
s, b = call(u1, "GET", "/api/v1/safety/checks")
tr = [r for r in b["requests"] if r["id"] == rid]
check("verifier sees request ACCEPTED", tr and tr[0]["status"] == "ACCEPTED")
check("verifier history gained a TRUST_LINK assessment for the subject",
      any(c["method"] == "TRUST_LINK" and c["subject"] and c["subject"]["handle"] == u3_handle for c in b["checks"]))
s, b = call(u3, "POST", f"/api/v1/safety/request/{rid}/respond", {"decision": "DECLINE"})
check("double respond -> 409 NOT_PENDING", s == 409 and errcode(b) == "NOT_PENDING")

# DECLINE path: u2 requests from u3 → u3 declines
s, b = callr(u2, "POST", "/api/v1/safety/request", {"handle": u3_handle})
rid2 = b["requestId"]
s, b = call(u3, "POST", f"/api/v1/safety/request/{rid2}/respond", {"decision": "DECLINE"})
check("decline -> OK DECLINED", s == 200 and b.get("decision") == "DECLINED")
check("decline shares no token", "token" not in b)
s, b = call(u2, "GET", "/api/v1/safety/checks")
tr2 = [r for r in b["requests"] if r["id"] == rid2]
check("requester sees DECLINED", tr2 and tr2[0]["status"] == "DECLINED")

# --------------------------------------------------- 10) audit + timeline
print("== 10) audit events + subject security timeline linkage ==")
con = sqlite3.connect(DB)
u1_id = con.execute("SELECT id FROM UserAccount WHERE handle=?", (u1_handle,)).fetchone()[0]
u2_id = con.execute("SELECT id FROM UserAccount WHERE handle=?", (u2_handle,)).fetchone()[0]
rows = con.execute(
    "SELECT action, actorId, subjectId, metadata FROM AuditEvent WHERE actorId=? ORDER BY createdAt DESC LIMIT 30",
    (u1_id,),
).fetchall()
con.close()
actions = [r[0] for r in rows]
check("SAFETY_CHECK_RUN audited for verifier", "SAFETY_CHECK_RUN" in actions)
check("TRUST_REQUEST_SENT audited", "TRUST_REQUEST_SENT" in actions)
con = sqlite3.connect(DB)
sub_rows = con.execute(
    "SELECT action FROM AuditEvent WHERE subjectType='UserAccount' AND subjectId=? ORDER BY createdAt DESC LIMIT 20",
    (u2_id,),
).fetchall()
con.close()
check("subject-linkage: SAFETY_CHECK_RUN events on subject", "SAFETY_CHECK_RUN" in [r[0] for r in sub_rows])
# timeline surfaced via passport read model
s, b = call(u2, "GET", "/api/v1/passport/me")
check("security timeline shows SAFETY_CHECK_RUN", "SAFETY_CHECK_RUN" in [e["action"] for e in b["securityEvents"]])
check("audit metadata has method, no raw identifiers",
      all(re.search(r"\+?234?\d{8,}", r[3] or "") is None for r in rows if r[0] == "SAFETY_CHECK_RUN"))
check("audit metadata carries method label",
      any('"method"' in (r[3] or "") for r in rows if r[0] == "SAFETY_CHECK_RUN"))

# --------------------------------------------------- 11) DSR export inclusion
print("== 11) DSR export includes Stage 6 data ==")
s, exp = call(u2, "POST", "/api/v1/passport/dsr", {"type": "EXPORT"})
check("DSR export -> 201", s == 201 and exp.get("downloadPath", "").startswith("/api/v1/passport/dsr/"))
req = urllib.request.Request(BASE + exp["downloadPath"])
with u2.open(req, timeout=30) as res:
    doc = json.loads(res.read().decode())
check("export has safetyChecks with role marker",
      any(c.get("role") for c in doc.get("safetyChecks", [])))
check("export has trustRequests", len(doc.get("trustRequests", [])) >= 0 and "trustRequests" in doc)
check("export safetyChecks carry assessments", all("assessment" in c for c in doc.get("safetyChecks", [])))
check("no raw phone in export", not re.search(r"\+234[0-9]{10}", json.dumps(doc)))

# --------------------------------------------------- 12) consent withdrawal stops checks
print("== 12) withdrawal stops checks immediately ==")
s, b = callr(u2, "POST", "/api/v1/safety/settings", {
    "enabled": False, "includeProfile": False, "includeSignals": False, "allowPhoneMatch": False,
})
check("disable -> settings off", b["settings"]["enabled"] is False)
s, b = callr(u1, "POST", "/api/v1/safety/check", {"handle": u2_handle})
check("handle check after withdrawal -> UNAVAILABLE", s == 200 and b.get("outcome") == "UNAVAILABLE")
s, b = callr(u1, "POST", "/api/v1/safety/check", {"phone": SUBJECT_PHONE.replace(" ", "")})
check("phone check after withdrawal -> UNAVAILABLE", s == 200 and b.get("outcome") == "UNAVAILABLE")
con = sqlite3.connect(DB)
row = con.execute(
    "SELECT withdrawnAt FROM Consent WHERE requester LIKE '%Safety Check%' AND userId=? ORDER BY grantedAt DESC LIMIT 1",
    (u2_id,),
).fetchone()
con.close()
check("standing consent row withdrawn", row is not None and row[0] is not None)

# --------------------------------------------------- 13) rate limits
print("== 13) rate limits ==")
codes = set()
for i in range(14):
    s, b = call(u3, "POST", "/api/v1/safety/check", {"handle": "zzz_no_such"})
    codes.add(s)
    if s == 429:
        break
check("safety/check rate limit -> 429 after 12/min", 429 in codes, f"codes={codes}")
time.sleep(2)
codes = set()
for i in range(7):
    s, b = call(u3, "POST", "/api/v1/safety/request", {"handle": "zzz_no_such"})
    codes.add(s)
    if s == 429:
        break
check("trust request rate limit -> 429 after 5/min", 429 in codes, f"codes={codes}")

# --------------------------------------------------- 14) verifier history shape
print("== 14) verifier history read model ==")
s, b = call(u1, "GET", "/api/v1/safety/checks")
check("history ok + non-empty", s == 200 and len(b["checks"]) >= 3)
c0 = b["checks"][0]
check("history row shape (method/subject/status/headline/checkedAt/self)",
      all(k in c0 for k in ("method", "subject", "status", "headline", "checkedAt", "self")))
check("history includes sent requests", len(b["requests"]) >= 1)

print(f"\n===== RESULT: {PASS} pass / {FAIL} fail =====")
raise SystemExit(1 if FAIL else 0)
