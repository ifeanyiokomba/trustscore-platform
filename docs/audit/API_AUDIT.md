# API AUDIT — Batch 0

**Scope:** ~70 route files under `src/app/api/v1/**` (+ `/api`, `/api/health`). Contract honesty, auth, validation, errors, anti-enumeration, B2B surface.

---

## 1. Surface inventory (by domain)

| Domain | Endpoints (representative) | Auth |
| --- | --- | --- |
| Health/catalog | `GET /api`, `GET /api/health` | public |
| Auth | register, login, logout, me, activity, ninauth/start→approve→callback | public + session |
| Identity | me, sessions (CRUD + consent + callback), consents/withdraw, signals/phone (start/confirm/resend/inbox), signals/biometrics (start/complete) | session |
| Passport | me, share (CRUD), public/[token], credentials/[id]/revoke, score-history (+export), dsr (+export), notifications | session + public token |
| Safety | settings, check, checks, request (+respond), me | session |
| Reputation | me, flags (file), flags/[id] (respond/withdraw/appeal), appeals/[id]/decision, review (+queue decision) | session + REVIEWER |
| Trust | `POST /v1/trust/check` | **API key** |
| Network | me, membership, interactions (+respond/revoke), providers | session |
| Engine | public, me, admin/* (providers, policies, dpia, overview, gate, history, fault, credential, reset, alerting) | public/session/ADMIN |
| Security | sessions/[id]/revoke | session |
| Dev portal | me, clients (+team/plan/keys/webhook/live/decisions), keys/[id]/revoke, webhook-sink | session |
| Internal | webhook-tick | loopback-only guard |

## 2. Contract quality — PASS

- Every route: zod `.strict()` validation → service call → `jsonOk/jsonError` with `requestId` correlation. Uniform error envelope `{error: {code, message, requestId}}`.
- HTTP codes: 400 bad JSON · 401 auth · 404 scoped-miss · 422 shape · 429 rate/quota · 200 for honest business outcomes (UNAVAILABLE/DEAD_LINK are results, not errors).
- B2B surface: band-level verdicts only (score number never crosses), subject receipted + notified + audited + usage-logged + webhook-delivered, NDPA note on every response.

## 3. Anti-enumeration — PASS

Identical outcomes for absent vs consent-withheld subjects; identical cursor errors; login/register errors don't leak existence.

## 4. Findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| AP1 | P1 | `POST /v1/trust/check` lacks `purpose` (directive §22 transaction-specific trust) | **Fix in Batch 0** (optional enum, receipt-labeled, stored, backward-compatible) |
| AP2 | P3 | API index (`/api`) is hand-maintained — drift risk | Add catalog test (exists for version; extend to endpoint list) in Batch 1 |
| AP3 | P3 | OpenAPI spec not generated for B2B surface | Batch 9 (B2B 2.0) deliverable |

## 5. B2B developer experience (directive §67) — PASS, strong

Keys with env namespacing, live/sandbox toggling per client, signed webhooks with retry + sink testing, decisions log, usage/quota, team RBAC. Missing only: generated API reference (AP3) and billing (deliberately unbuilt — directive §49).
