# CURRENT_STATE — TrustScore Repository Audit (Batch 0)

**Audit date:** 2026-09-17 · **Auditor:** Batch 0 deep audit · **Head:** local `main` @ `1c6cd96` · **Remote:** `github.com/ifeanyiokomba/trustscore-platform` @ `309ad02` (orphan snapshot; unrelated local history **by design**)

---

## 1. What this repository is

TrustScore is a **portable trust layer on top of government-verified identity (NINAuth / NIMC, Nigeria)**. Strategic thesis, validated against the official NINAuth developer material and the competitive landscape (see `docs/research/`):

> NINAuth proves the identity. TrustScore builds the portable trust layer around that identity — evidence, reputation, contextual trust decisions, consent-driven sharing.

The three-layer separation (Identity / Evidence / Trust) is implemented, not just documented. `UserAccount ≠ TrustIdentity ≠ NIN ≠ Phone` is enforced in the Prisma schema and the provider layer.

## 2. Platform facts

| Dimension | State |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind v4 + shadcn/ui (New York) |
| Route surface | **Single `/` route** (sandbox constraint) — landing + auth + 8-tab dashboard + public Trust Link viewer, all client-composed |
| API | `/api/v1/*` (~70 route files) mirroring the production `/v1/*` contract |
| Database | Prisma + SQLite — **39 models** (identity, consent, evidence, reputation, B2B, transport, network) |
| Services | Next dev (:3000) + `mini-services/webhook-worker` (:3031, signed webhook retries) + `mini-services/provider-simulator` (:3032, loopback NINAuth/SMS/liveness) |
| Tests | 36 test files; stage matrices (Python) + browser E2E (Playwright-driven shell) + `qa_regression.sh` — **1,041+ automated checks green** at last full run |
| Version catalog | v1.15.0 "Stage 16 — Surface Elevation" |
| Provider posture | MOCK (default) / LOOPBACK (simulator on :3032) / LIVE (honestly refused without credentials + `PROVIDER_LIVE_ENABLED`) |

## 3. Delivered capability inventory (evidence: code + tests + worklog stages 0–16)

**Identity rail (NINAuth):**
- OAuth 2.0 Authorization-Code + PKCE (S256) contract-first implementation; server-held verifier; one-time 60s codes (hashed, timing-safe compare); state binding; nonce in ID tokens
- ID-token validation discipline: signature → issuer → audience → expiry → iat → nonce (never merely decoded)
- Scope-guard pipeline (`src/lib/providers/scope-guard.ts`): raw-identifier tripwire (blocks any `nin`/`bvn`-family key, fail-closed, audited), granted-scope whitelist, minimal-shape construction
- "Continue with NINAuth" passwordless auth (start / approve / callback) with granular consent screen, one-time codes, LINK / LOGIN / REGISTERED outcomes
- Consent first-class: requester, purpose, requested/granted scopes, policy version, provider, session, withdrawal state

**Trust products:**
- Trust Passport: score, band, status, freshness ("verified N days ago"), credentials, QR Trust Card, scoped expiring share tokens (max-views), Trust Receipts, share history, revocation
- Safety Check: "Check before you deal" — handle / phone-fingerprint / trust-link / QR entry; consent-gated; locked language (never "safe"); per-check receipts to the subject; 50-check retention
- Reputation: flags with mandatory evidence, L2 reporter gate, quotas, one-open-flag-per-pair, human review queue (REVIEWER role), subject response, appeals with freeze/recompute, dismissal evidence
- Trust Engine: rules-first, versioned ScoringPolicy (DPIA-gated activation, impact simulation, inputsHash, snapshot reproducibility, public policy explainer with plain ⇄ technical toggle)
- Trust Decision API (B2B): `/api/v1/trust/check` with API keys (hashed), quotas/usage, HMAC-signed webhooks with retries, band-level verdicts only (score never crosses)
- Trust Network (Stage 10): opt-in membership, mutual verified-interaction edges feeding the SAME reputation component, k-anonymized shared signals, country-provider registry
- B2B dev portal: organizations, API clients, keys, team RBAC, plans, usage, webhook sink, decisions log
- Observability: per-provider transport metrics (p50/p95, error rate, circuit breaker events), admin provider console, posture controls, credential vault (AES-256-GCM write-only)

**Design system (Stage 15/16):** Fraunces display + Geist, shared motion vocabulary (`src/lib/motion.tsx`), `MotionConfig reducedMotion="user"`, WCAG-AA emerald palette, count-up numerals, scroll choreography, TabIntro/TabSurface display voice across all 8 dashboard tabs.

## 4. Honest assessment (prototype → production alignment)

**Strong (keep and extend):**
- The NIN-first thesis is correctly implemented: masked subjects, no raw identifiers in DB, salted fingerprints for phones/emails, freshness horizons
- Consent and audit discipline is genuinely first-class
- Provider honesty (MOCK/LOOPBACK/LIVE with hard gates) matches the directive §47 rule
- Explainable, versioned, reproducible scoring with due process (appeals → freeze → review → recompute)
- Test culture: 1,041+ checks with stage gates and regression discipline

**Gaps (see `MASTER_GAP_MATRIX.md` for the full ranked matrix):**
1. **Security headers/CSP absent** (`next.config.ts` has no headers config) — P1
2. **Trust Decision API has no `purpose`/context parameter** (directive §22 transaction-specific trust) — P1
3. **Business identity (RC number) not modeled** — directive §53; NINAuth business sign-in is UNCONFIRMED in official docs, so model now, integrate later — P2
4. **NINAuth QR / Share Code semantics not yet product-mapped** — our QR Trust Card is a TrustScore artifact (correct), but "Check by NINAuth share code" (the 6-char, 2-min dynamic QR flows from the official Postman contract) is unbuilt — P2
5. **No mobile client** — sandbox has no Expo/Flutter runtime; official NINAuth mobile SDK guidance is UNCONFIRMED; strategy must be documented (ADR_WEB_MOBILE) — P2 strategy, P3 execution
6. **SQLite → PostgreSQL migration decision** deferred until traffic evidence exists (directive §44 — do NOT migrate merely on doctrine) — P3
7. **Webhook signature scheme for NINAuth LIVE events UNCONFIRMED** — our worker is the right slot; contract unknown — blocked on partner
8. Minor: `page.tsx` single-route constraint concentrates risk in client bundles; acceptable for sandbox, documented in ADR_WEB_MOBILE

## 5. Baseline verification (this audit round)

- `/api/health` → `v1.15.0`, db up, stage 16
- provider-simulator (:3032) healthy, webhook-worker (:3031) healthy (35 ticks, 1 historical error, recovered)
- `dev.log` clean; git tree clean at `1c6cd96`
- Full regression suite re-run scheduled post-corrections (see Batch 0 report in worklog)

## 6. What Batch 0 corrections are justified (evidence-driven)

Only small, safe, evidence-driven corrections in this batch (per directive §71: "implement the necessary corrections from Batch 0 **only where justified**"):

1. Security headers + CSP in `next.config.ts` (P1, no behavioral risk, testable)
2. `purpose` field on `/api/v1/trust/check` with honest purpose-labeled receipts (P1, additive, backward-compatible: optional field)
3. NINAuth brand-spec compliance sweep (button labels/colors per official spec — verify current implementation matches; fix if drifting)
4. Documentation set (this folder) — the Batch 0 deliverable itself

Everything else is scheduled into the batch roadmap (`docs/roadmap/MASTER_ROADMAP.md`) with gates.
