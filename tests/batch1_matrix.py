#!/usr/bin/env python3
"""TrustScore Batch 1 — NINAuth Production Alignment contract matrix.

Covers the four Batch-1 deliverables (docs/audit/MASTER_GAP_MATRIX.md):

  1. AP2 — API catalog drift guard: every (method, path) implemented under
     src/app/api/**/route.ts must be documented in the GET /api index, and
     every documented entry must exist on disk. Excludes the index route
     itself and 405 METHOD_NOT_ALLOWED guard stubs (documented rule). This
     is the test that would have caught the lost webhook/test route of
     Stage 15.
  2. G5/PV2 — the capability→scope mapping is externalized config
     (scope-mapping.config.ts) yet drives the SAME runtime surface: the
     consent screen fields, core/optional scope validation, and the
     SCOPE_INVALID refusal for unknown scopes.
  3. G4/G18 — the admin LIVE-alignment surface: scope-mapping gaps, the
     request-reason catalog readiness (37 enumerated of 39 official — the
     delta never guessed), and the contract-matrix checklist counts.
  4. LIVE gate honesty — the posture flip to LIVE still refuses (422) and
     the platform posture is unchanged after the attempt.

Run: python3 tests/batch1_matrix.py   (dev server on :3000)
"""

import json
import os
import re
import sqlite3
import sys
import time
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:3000"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "db", "custom.db")
PASS = 0
FAIL = 0


def call(method, path, body=None, headers=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=30) as r:
            return r.status, r.read().decode(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(), dict(e.headers)


def check(name, ok, detail=""):
    global PASS, FAIL
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {name}" + (f" — {detail}" if (detail and not ok) else ""))
    if ok:
        PASS += 1
    else:
        FAIL += 1


def jbody(raw):
    try:
        return json.loads(raw)
    except Exception:
        return {}


def session_of(hdrs):
    for k, v in hdrs.items():
        if k.lower() == "set-cookie" and "ts_session=" in v:
            return v.split(";")[0]
    return None


# ---------------------------------------------------------------------------
print("== 1) AP2 — API catalog drift guard (disk routes vs /api index) ==")

METHOD_RE = re.compile(r"export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b")

disk_routes = set()
guard_stubs = set()
for root, dirs, files in os.walk(os.path.join(ROOT, "src", "app", "api")):
    if "route.ts" not in files:
        continue
    full = os.path.join(root, "route.ts")
    rel = os.path.relpath(full, os.path.join(ROOT, "src", "app", "api"))
    d = os.path.dirname(rel)
    api_path = "/api" if d in (".", "") else "/api/" + d.replace(os.sep, "/")
    api_path = re.sub(r"\[(\w+)\]", r":\1", api_path)
    src = open(full, encoding="utf-8").read()

    # Split source into per-handler slices; a handler whose body only answers
    # METHOD_NOT_ALLOWED is a 405 guard stub, not a documented endpoint.
    marks = [(m.start(), m.group(1)) for m in METHOD_RE.finditer(src)]
    for i, (pos, method) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(src)
        body_slice = src[pos:end]
        if "METHOD_NOT_ALLOWED" in body_slice:
            guard_stubs.add((method, api_path))
        else:
            disk_routes.add((method, api_path))

# The index route itself is not an entry in the index.
disk_routes.discard(("GET", "/api"))

status, raw, _ = call("GET", "/api")
idx = jbody(raw)
index_entries = {(e.get("method"), e.get("path")) for e in idx.get("endpoints", [])}

check("GET /api answers 200 with an endpoint catalog", status == 200 and len(index_entries) > 50)
check(
    "every documented (method, path) exists on disk",
    index_entries <= disk_routes,
    f"in index only: {sorted(index_entries - disk_routes)[:5]}",
)
check(
    "every disk route (minus 405 guard stubs) is documented",
    disk_routes <= index_entries,
    f"on disk only: {sorted(disk_routes - index_entries)[:5]}",
)
check(
    "405 guard stubs are excluded by rule, and are exactly the known two",
    guard_stubs == {("GET", "/api/v1/internal/webhook-tick"), ("PUT", "/api/v1/engine/admin/providers/history")},
    str(sorted(guard_stubs)),
)
check(
    "the previously-missing GET /api/v1/engine/admin/policies is now documented (drift fixed this batch)",
    ("GET", "/api/v1/engine/admin/policies") in index_entries,
)
check(
    "every index entry carries auth + description fields",
    all("auth" in e and e.get("description") for e in idx.get("endpoints", [])),
)

# ---------------------------------------------------------------------------
print("== 2) G5 — externalized scope mapping drives the runtime surface ==")

suffix = re.sub(r"[^a-z0-9]", "", os.urandom(5).hex())
email = f"batch1.g5.{suffix}@example.com"
s, raw, hdrs = call("POST", "/api/v1/auth/register", body={
    "email": email, "password": "SuperSecret1",
    "displayName": "Batch One", "handle": f"batch1_g5_{suffix}",
    "acceptTerms": True,
})
cookie = session_of(hdrs)
check("registered a session user for the consent surface", s == 201 and cookie is not None, f"{s}")

# 2.1 — the consent screen fields come from the externalized config labels.
s, raw, _ = call("POST", "/api/v1/identity/sessions", body={
    "scopes": ["identity.basic", "identity.nin_status", "profile.name", "profile.demographics"],
}, headers={"Cookie": cookie})
b = jbody(raw)
consent = b.get("consent", {})
fields = {f.get("scope"): f for f in consent.get("fields", [])}
check("session created (201) with a consent screen", s == 201 and bool(fields), f"{s}")
check(
    "consent field labels match the externalized config (identity.basic)",
    fields.get("identity.basic", {}).get("label") == "Basic identity",
)
check(
    "consent field labels match the externalized config (profile.demographics)",
    fields.get("profile.demographics", {}).get("label") == "Demographics",
)
check(
    "core scopes are flagged core on the consent screen",
    fields.get("identity.nin_status", {}).get("core") is True,
)
check(
    "optional scopes are not flagged core",
    fields.get("profile.name", {}).get("core") is False,
)
check(
    "consent policy version surfaces",
    bool(consent.get("policyVersion")) and consent.get("requester") == "TrustScore",
)

# 2.2 — scope validation still fails closed on unknown scopes (catalog-driven).
s, raw, _ = call("POST", "/api/v1/identity/sessions", body={
    "scopes": ["identity.basic", "profile.sneaky_extra"],
}, headers={"Cookie": cookie})
b = jbody(raw)
check(
    "unknown scope is rejected with SCOPE_INVALID (422)",
    s == 422 and (b.get("error") or {}).get("code") == "SCOPE_INVALID" and "profile.sneaky_extra" in json.dumps(b),
    f"{s} {b}",
)

# ---------------------------------------------------------------------------
print("== 3) G4/G5/G18 — admin LIVE-alignment surface ==")

admin_email = f"batch1.admin.{suffix}@example.com"
s, raw, hdrs = call("POST", "/api/v1/auth/register", body={
    "email": admin_email, "password": "SuperSecret1",
    "displayName": "Batch One Admin", "handle": f"batch1_adm_{suffix}",
    "acceptTerms": True,
})
admin_cookie = session_of(hdrs)
con = sqlite3.connect(DB, timeout=30)
con.execute("UPDATE UserAccount SET role='ADMIN' WHERE email=?", (admin_email,))
con.commit()
con.close()
time.sleep(0.2)

s, raw, _ = call("GET", "/api/v1/engine/admin/providers", headers={"Cookie": admin_cookie})
b = jbody(raw)
al = b.get("ninauthAlignment", {})
check("admin providers response carries ninauthAlignment", s == 200 and bool(al), f"{s}")

sm = al.get("scopeMapping", {})
check(
    "scope mapping: 0/5 live scopes confirmed (all UNCONFIRMED — zero published officially)",
    sm.get("totalCapabilities") == 5 and sm.get("liveScopeConfirmed") == 0,
    str(sm),
)
check(
    "scope mapping: missing live scopes list all five capabilities",
    sorted(sm.get("missingLiveScopes", [])) == [
        "identity.basic", "identity.nin_status", "identity.phone_status",
        "profile.demographics", "profile.name",
    ],
)
check(
    "scope mapping config version surfaces",
    sm.get("configVersion") == "scope-mapping-2026.09-batch1",
)

rr = al.get("requestReasons", {})
check(
    "request reasons: 37 of 39 official keys enumerated, 2 honestly unconfirmed",
    rr.get("enumerated") == 37 and rr.get("officialCount") == 39 and rr.get("unconfirmed") == 2,
    str(rr),
)
check(
    "request reasons: all 7 Trust Decision purposes carry a mapping",
    rr.get("purposesMapped") == 7 and rr.get("purposeOptions") == 7 and rr.get("allPurposesMapped") is True,
)
check(
    "request reasons: 0 mappings confirmed (stubs until the partner sandbox)",
    rr.get("mappingsConfirmed") == 0 and rr.get("catalogVersion") == "request-reasons-2026.09-batch1",
)

ci = al.get("contractItems", {})
check(
    "contract items: 7 UNCONFIRMED + 9 PARTIAL of 33 matrix rows",
    ci.get("unconfirmed") == 7 and ci.get("partial") == 9 and ci.get("documented") == 17,
    str(ci),
)
items = {i.get("id"): i for i in al.get("items", [])}
check("checklist carries 16 actionable items", len(items) == 16, str(len(items)))
check(
    "checklist includes the scope-vocabulary + oauth-base-url + error-codes rows",
    all(k in items for k in ("scope-vocabulary", "oauth-base-url", "error-codes")),
)
check(
    "every checklist item cites status/missing/posture/resolution",
    all(i.get("status") in ("UNCONFIRMED", "PARTIAL") and i.get("missing") and i.get("posture") and i.get("resolution")
        for i in items.values()),
)

gate = al.get("liveGate", {})
check(
    "live gate report: scope mapping incomplete -> flip refused",
    gate.get("scopeMappingComplete") is False and gate.get("requestReasonCatalogComplete") is False,
)

# ---------------------------------------------------------------------------
print("== 4) LIVE gate honesty — the flip still refuses ==")

s, raw, _ = call("PUT", "/api/v1/engine/admin/providers", body={"posture": "live"},
                 headers={"Cookie": admin_cookie})
b = jbody(raw)
check(
    "PUT posture=live is refused (422) with an honest reason",
    s == 422 and (b.get("error") or {}).get("code") in ("LIVE_NOT_ENABLED", "LIVE_SCOPE_MAPPING_UNCONFIRMED"),
    f"{s} {b}",
)
s, raw, _ = call("GET", "/api/v1/engine/admin/providers", headers={"Cookie": admin_cookie})
b = jbody(raw)
check(
    "posture unchanged after the refused flip",
    b.get("posture") in ("mock", "loopback"),
    str(b.get("posture")),
)

# ---------------------------------------------------------------------------
print(f"\nbatch1 matrix: {PASS} passed, {FAIL} failed (of {PASS + FAIL})")
sys.exit(1 if FAIL else 0)
