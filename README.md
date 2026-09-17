# TrustScore

**Verify before you deal.** TrustScore turns government-verified identity (NINAuth / NIMC, Nigeria) into **reusable trust** — a Trust Passport you share instead of your NIN, a Safety Check before money changes hands, and an explainable Trust Decision API for business.

> NIN is the identity root. TrustScore's proprietary value sits **above** it: identity assurance, verified credentials, trust profiles, reputation, dispute resolution, and transaction-specific trust decisions.

---

## The three layers

| Layer | Question it answers | Powered by |
| --- | --- | --- |
| **1 — Identity** | *Who are you?* | NIN / NINAuth (government consent gateway) |
| **2 — Evidence** | *What can be established about you?* | Credentials, phone, biometrics, verified interactions, dispute outcomes |
| **3 — Trust** | *What does the evidence imply — here?* | TrustScore's own reputation / risk / decision engine |

That separation is the central architecture principle — it is what makes TrustScore a **trust layer** instead of another KYC vendor.

## What's inside

- **Trust Passport** — one verified identity, reused everywhere. QR Trust Card, scoped expiring share links with receipts, verification freshness ("verified 11 days ago", not just "verified").
- **Safety Check** — "Check before you deal": handle / phone-hash / trust-link / QR assessments with per-check consent. Sanitized verdicts — *"No confirmed adverse signals found"*, never *"safe"*.
- **Reputation** — flags with evidence, human-reviewed resolutions, appeals, verified interactions. Anti-gaming by design (L2+ reporters, quotas, masked identities, freeze-on-appeal).
- **Trust Engine** — rules-first, versioned, **public** scoring policy with NDPA §37 explanations, DPIA-gated changes, impact simulation, snapshot history.
- **B2B platform** — developer portal, API keys (hashed at rest), HMAC-signed webhooks with retries, team RBAC, quotas, consent-gated Trust Decision API.
- **Live-ready providers** — the real transport layer (HMAC-signed calls, timeouts, retries, per-provider circuit breakers, latency metrics) proven against a local loopback simulator, plus an AES-256-GCM write-only credential vault. LIVE partners flip on credentials — nothing else changes.
- **Design system (Stage 15)** — Fraunces display serif over Geist, a shared motion design language (scroll choreography, count-up numerals, micro-interactions), full `prefers-reduced-motion` respect, WCAG-AA emerald palette.

## Honest by design

- **No raw NIN, BVN or phone numbers** in URLs, logs, analytics or the database — identifiers are salted fingerprints.
- **Mock or preview features are always labeled as such** (provider posture: MOCK / LOOPBACK / LIVE — the API refuses a LIVE flip until partner credentials exist).
- **Every trust result explains its signals** — never a mystery number. The live scoring policy is published on the landing page.
- **NDPA-aligned rights**: access, rectification, erasure, portability, consent withdrawal, human review — self-service from day one.

## Architecture (this repository)

```
Next.js 16 (App Router, TypeScript, Tailwind v4 + shadcn/ui)
  ├── /                        — landing · auth · dashboard · public Trust Links (single route)
  └── /api/v1/*                — the platform API (mirrors the production /v1 FastAPI contract)

Prisma + SQLite                 — 30+ models: users, trust identities, evidence, consents,
                                  signals, snapshots, flags, resolutions, policies, API clients…

mini-services/
  ├── webhook-worker/           — timer-driven webhook retry tick (:3031)
  └── provider-simulator/       — NINAuth OAuth/PKCE + SMS + liveness simulator (:3032)

tests/                          — 15 stage contract matrices (Python) + browser E2E suites (Bash)
```

## Stage-by-stage build

Every stage shipped, was tested end-to-end, re-audited, and only then did the next one begin:

| # | Stage | # | Stage |
| --- | --- | --- | --- |
| 0 | Discovery & audit | 8 | Trust engine (public, versioned policy) |
| 1 | Platform foundation | 9 | B2B platform (keys, webhooks, RBAC) |
| 2 | NINAuth identity (OAuth/PKCE) | 10 | Trust network (verified interactions) |
| 3 | Trust Identity (L1–L4 ladder) | 11 | Score insights ("why did it change?") |
| 4 | Phone + biometric signals | 12 | Transparency & alerting |
| 5 | Trust Passport + sharing | 13 | Live-ready providers (vault, circuits) |
| 6 | Safety Check | 14 | Transport observability |
| 7 | Reputation + human review | 15 | Design elevation (this release) |

**Verification:** 1,041 automated stage-matrix checks green (stages 2–15), browser E2E suites, QA regression, TypeScript + ESLint clean, VLM visual QA.

## Getting started

```bash
bun install
cp .env.example .env       # defaults are safe (MOCK posture)
bun run db:push            # create the SQLite schema
bun run dev                # http://localhost:3000

# optional mini-services (webhook retries + provider simulator)
bash mini-services/webhook-worker/start.sh
bash mini-services/provider-simulator/start.sh
```

Demo accounts are not seeded — register, then promote with `bun run admin:make` / `bun run reviewer:make`.

## Testing

```bash
python3 tests/stage15_matrix.py   # any stage's contract matrix
bash tests/stage15_e2e.sh         # browser E2E (agent-browser)
bash tests/qa_regression.sh       # round QA regression
```

## Stack

Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · shadcn/ui · Framer Motion · Prisma 6 (SQLite) · next-themes · zod · Bun

---

© TrustScore. Identity layer powered by NINAuth (NIMC). No raw NIN is ever stored or shared by TrustScore.
