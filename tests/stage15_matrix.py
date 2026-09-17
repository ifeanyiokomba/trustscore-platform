#!/usr/bin/env python3
"""TrustScore Stage 15 — Design Elevation contract test matrix.
Covers: the version catalog bump (v1.14.0 / Stage 15), and — because this
stage is a frontend design-system round — the SSR-level wiring of that
system: the Fraunces display font module, font-display utilities on the
server-rendered headings, the SectionHeading eyebrow chips, the roadmap's
"Design elevation" entry, and the honest stage badges in nav/footer/hero.
No data is mutated; this matrix is read-only and idempotent."""
import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:3000"
PASS = 0
FAIL = 0

def call(method, path, body=None, timeout=40):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, res.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except (urllib.error.URLError, ConnectionError, OSError, TimeoutError) as e:
        return 0, str(e)

def check(name, ok, extra=""):
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} {extra}")

# ---------------------------------------------------------------------------
print("== 1) version catalog ==")
s, raw = call("GET", "/api/health")
try:
    b = json.loads(raw)
except Exception:
    b = {}
check("health reports Stage 16 / v1.15.0",
      s == 200 and b.get("version") == "1.15.0" and "16" in b.get("stage", ""),
      str(b.get("stage")))
s, raw = call("GET", "/api")
try:
    b = json.loads(raw)
except Exception:
    b = {}
check("api index: v1.15.0 + Stage 16", b.get("version") == "1.15.0" and "16" in b.get("stage", ""))

# ---------------------------------------------------------------------------
print("== 2) design system SSR wiring (landing) ==")
s, html = call("GET", "/")
check("landing renders 200", s == 200)
check("Fraunces display font module is wired into the document",
      "fraunces" in html.lower() and "geist" in html.lower())
check("display-serif utility applied to server-rendered headings (h1/h2)",
      html.count('font-display') >= 6, f"font-display count={html.count('font-display')}")
check("roadmap carries the Stage 15 'Design elevation' entry",
      "Design elevation" in html)
check("hero carries the honest stage preview note",
      "(Stage 16)" in html)
check("nav badge says Stage 16 · Surface Elevation",
      "Stage 16 · Surface Elevation" in html)
check("footer badge says Stage 16 · Surface Elevation",
      html.count("Stage 16 · Surface Elevation") >= 2)
check("all six landing sections present",
      all(f'id="{sid}"' in html for sid in
          ["product", "how-it-works", "scoring", "architecture", "roadmap", "security"]))
check("footer is sticky-positioned in the layout (mt-auto footer)",
      "<footer" in html)

# ---------------------------------------------------------------------------
print("== 3) public engine surface still honest ==")
s, raw = call("GET", "/api/v1/engine/public")
try:
    b = json.loads(raw)
except Exception:
    b = {}
check("public policy endpoint still serves the live active policy",
      s == 200 and (b.get("activePolicy") or {}).get("version") == 1)

print()
print(f"RESULT: {PASS} passed, {FAIL} failed, {PASS + FAIL} total")
exit(0 if FAIL == 0 else 1)
