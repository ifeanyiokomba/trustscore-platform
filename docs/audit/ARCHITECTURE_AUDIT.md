# ARCHITECTURE AUDIT — Batch 0

**Scope:** `src/lib/**`, `src/app/api/**`, `mini-services/**`, `prisma/schema.prisma`, `next.config.ts`

---

## 1. Layering (actual, as built)

```
Browser (single / route: landing + dashboard shells)
   │  fetch /api/v1/* (relative paths only; XTransformPort for mini-services)
   ▼
Next.js Route Handlers (src/app/api/v1/**) — auth, zod validation, rate limits
   │
   ▼
Service layer (src/lib/services/*) — 18 services, business logic, consent enforcement
   │
   ▼
Provider layer (src/lib/providers/*) — ninauth, phone, liveness, transport, posture, vault, scope-guard
   │
   ▼
Prisma (39 models) — SQLite          Mini-services: webhook-worker :3031, provider-simulator :3032
```

**Verdict: correct and disciplined.** Route handlers stay thin (zod → service → jsonOk/jsonError with requestId); services own invariants; providers own external truth. The scope-guard is a genuine architectural control point (code-review blocker by policy).

## 2. The NINAuth adapter pattern (directive §10) — PASS

- `IdentityProvider` behavior is realized as: MOCK (in-process, contract-first) / LOOPBACK (real HTTP transport to :3032 simulator, HMAC-signed, its own issuer + signing key) / LIVE (refused without vault credentials + base URLs + `PROVIDER_LIVE_ENABLED`)
- Application services never import `NINAUTH_MOCK`-specific functions for policy decisions; they consume `IdTokenClaims` / `SanitizedAssertion` / `TokenResponse` normalized shapes
- Posture is a runtime `PlatformSetting` with 5s cache, admin-flippable, honestly surfaced in every consent screen (`provider: NINAUTH_MOCK|NINAUTH_LOOPBACK`)

**Finding A1 (P2):** the LIVE adapter still needs the *real* partner contract (base URL, token auth method, scope strings — all UNCONFIRMED, see `docs/research/NINAUTH_CONTRACT_MATRIX.md`). The architecture is ready; the contract is the blocker. Sandbox-verification checklist = the 20 UNCONFIRMED matrix rows.

## 3. Data-flow invariant (directive: granted scopes → allowed attributes → minimal storage) — PASS, enforced

`enforceScopePipeline(claims, grantedScopes)` runs before **every** NINAuth-derived write (verification callback + auth callback). The raw-identifier tripwire blocks the whole payload if any `nin`/`bvn`-family key appears at depth ≤ 4, records a SYSTEM audit event with key names (never values). Tests exercise the tripwire.

**Finding A2 (P3):** `findRawIdentifierKeys` depth bound of 4 is fine for current payloads; add a regression test asserting the bound when a new claim shape is introduced. Document as a policy note in the provider README.

## 4. Session & account security

- Sessions: httpOnly cookie, sha256-at-rest, revocable, UA + hashed IP recorded, 30-day TTL, status-checked on read — PASS
- NINAuth login sessions: own PKCE + one-time code lifecycle in `NinAuthLoginSession` — PASS
- API keys: `tsk_<env>_<hex>`, hashed at rest, revocable, team RBAC — PASS

**Finding A3 (P1):** `next.config.ts` defines **no security headers** (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS). This is the largest single hardening gap. Fix in Batch 0 corrections.

## 5. Transport & reliability (directive §46/§34E) — PASS

`src/lib/providers/transport.ts`: HMAC-SHA256 signing (`t=…,v1=…`), 4s AbortController timeouts, idempotency keys, retries only on 5xx/network (2×, 150/600ms), 401/403 → AUTH_REJECTED (an answer, never retried), per-provider circuit breaker (3 fails → OPEN 20s → HALF_OPEN), p50/p95 metrics, admin reset. Posture gates block LIVE honestly. Matches the fallback philosophy: primary → retry → degraded → honest UNKNOWN; never fabricate a positive.

## 6. Webhooks

`webhook-worker` (:3031): signed deliveries with retries, dead-letter handling, admin sink for dev testing. NINAuth *inbound* events are UNCONFIRMED in official docs (dashboard mentions webhook URL + RSA crypto-keys) — worker is the correct slot; do not invent the event contract.

## 7. Single-route constraint (sandbox)

All UX lives on `/` (landing ↔ auth ↔ dashboard ↔ public viewer composed client-side). Production would split into real routes (`/passport`, `/check`, `/developers`, …). 

**Finding A4 (P3, accepted risk):** one route means one client bundle per state machine; the app mitigates with code-split views per tab. Documented in `ADR_WEB_MOBILE.md`; no change justified now.

## 8. Concurrency & state

Provider transport state, rate limits, and posture cache use `globalThis`-stable in-memory singletons — correct for single-instance dev; production needs Redis-backed rate limiting (documented in `TARGET_ARCHITECTURE.md` §deployment).

**Finding A5 (P2):** rate-limit state is in-memory per process — a multi-instance production deployment would under-count. Production prerequisite, not a sandbox defect.

## 9. Prisma/SQLite

39 models, coherent domain (see `DATABASE_AUDIT.md`). SQLite is correct for the current stage per directive §44 (no traffic evidence justifying migration complexity yet). `db:push` discipline with accept-data-loss is dev-only.

## 10. Ranked findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| A3 | P1 | No security headers/CSP | **Fix in Batch 0** |
| A1 | P2 | LIVE contract unknowns (20 UNCONFIRMED) | Blocked on partner; checklist ready |
| A5 | P2 | In-memory rate limits (multi-instance) | Production prereq; document |
| A2 | P3 | Tripwire depth-bound regression test | Batch 1 test add |
| A4 | P3 | Single-route bundle concentration | Accepted; documented in ADR |
