# SECURITY AUDIT — Batch 0

**Scope:** directive §42 checklist against the actual code. Method: pattern review of auth/session/crypto/provider/rate-limit implementations + route inventory. (Sandbox-level review; a full penetration pass is Batch 11.)

---

## Checklist verdicts

| Control | Status | Evidence |
| --- | --- | --- |
| Authentication (sessions) | **PASS** | httpOnly cookie; sha256 token hash at rest; revocation; ACTIVE-status check. UA + hashed-IP are **RECORDED** for the audit trail + security-center UI — request-time binding is deliberately NOT enforced (IP binding breaks mobile users); mid-session UA drift is audited as `SESSION_DEVICE_CHANGE` (sec-batch-A) so a stolen cookie leaves a visible trail |
| Authorization | **PASS** | Session-gated routes via `getSessionUser`; role gates (USER/REVIEWER/ADMIN); B2B via hashed API keys with caller scoping; no IDOR found in route params (all IDs re-scoped to caller/subject ownership in services) |
| CSRF | **PASS (sameSite=lax + JSON POST)** | All mutating routes are JSON POST/PATCH with zod validation; lax cookie + no form-encoded mutations. Note: strict `sameSite` would break no current flow — consider tightening in Batch 11 |
| CORS | **PASS (default closed)** | No permissive CORS headers anywhere; same-origin API only |
| CSP | **PASS (sec-batch-A)** | nonce-based `script-src` in production via `src/middleware.ts` (no `unsafe-inline` for scripts in prod; dev keeps it for Turbopack HMR); static security headers in `next.config.ts`. History: absent at Batch 0 (S1) → fixed with headers+static CSP → external review round 2 correctly flagged prod `unsafe-inline` → nonce in sec-batch-A |
| Cookies | **PASS** | httpOnly, path=/, expiry, secure in production |
| Session fixation | **PASS** | Fresh token on every login (register/login/NINAuth callback all call `createSession`) |
| IDOR | **PASS** | Session/identity/flag/appeal/key IDs are ownership-checked in the service layer before reads/writes |
| Rate limiting | **PASS (60 routes)** | In-memory limiter on all sensitive routes (auth, NINAuth start/approve/callback, flags, safety, dev keys). Multi-instance gap noted (ARCHITECTURE_AUDIT A5) |
| Enumeration | **PASS** | Identical `UNAVAILABLE` for no-consent vs no-subject; login errors don't reveal account existence; cursor errors identical for missing/foreign cursors |
| Replay | **PASS** | One-time authorization codes (hash + TTL, single-use flip); nonce in ID tokens; webhook signature includes timestamp with tolerance |
| Input validation | **PASS** | zod `.strict()` schemas on every body; bounded strings; enums |
| Injection (SQL) | **PASS** | Prisma parameterized queries throughout; no raw SQL |
| XSS | **PASS** | React escaping; no `dangerouslySetInnerHTML` in app code; markdown surfaces are authored-content only |
| Open redirects | **PASS** | No user-supplied redirect targets; NINAuth callback URLs are server-constant |
| Webhook signature verification | **PASS** | HMAC-SHA256 over body + timestamp, constant-time compare, retry with jitter, dead-letter after max attempts |
| API key storage | **PASS** | sha256 at rest; prefix for display; revocation; env-separated key namespaces |
| Secret management | **PASS (sandbox-honest)** | `.env` gitignored; vault encrypts provider credentials AES-256-GCM (write-only surface, key from env); `.env.example` documents every var; secret scan of the pushed tree was clean |
| Provider token storage | **PASS** | No refresh tokens exist in MOCK/LOOPBACK (contract has none); access tokens are ephemeral, never persisted; when LIVE refresh appears (UNCONFIRMED), encrypted backend-only storage is the mandated pattern |
| Client-secret hygiene | **PASS** | `NINAUTH_CLIENT_SECRET` only in backend modules; consent screens expose only labels; nothing secret crosses `/api/v1` responses |

## NINAuth-specific security requirements (directive §8/§43)

| Requirement | Status |
| --- | --- |
| Client secret backend-only | PASS — never sent to any client, never in URLs |
| PKCE verifier never exposed to provider authorization URL | PASS — verifier held server-side; only challenge crosses |
| State cryptographically random + server-side transaction binding | PASS — 24-byte hex; session-bound; forged-state fail-closed tested |
| Authorization code one-time, short-lived | PASS — 60s TTL, hashed, single-use |
| ID token server-side validated (not merely decoded) | PASS — signature/iss/aud/exp/iat/nonce chain |
| Granted scope authoritative | PASS — scope-guard whitelist; ungranted keys dropped |
| Refresh token backend-only encrypted (when exists) | N/A-MOCK / documented mandate for LIVE |

## Findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| S1 | P1 | No CSP/security headers | **Fix in Batch 0** (next.config headers; nonce-less strict-ish CSP compatible with Next's inline bootstrap, frame-ancestors none, upgrade-insecure-requests off in dev) |
| S2 | P2 | `sameSite=lax` could be `strict` for this API shape | Batch 11 evaluation |
| S3 | P2 | In-memory rate limiter under-counts multi-instance | Production prereq (Redis) — documented in TARGET_ARCHITECTURE |
| S4 | P3 | No dependency-audit automation (npm/bun advisories) | **Fixed in sec-batch-A** — CI `audit` job (npm audit, HIGH+ gate); the 9 unused-dep CVEs it would have caught were removed the same round |
| S5 | P3 | Session rotation on privilege change (e.g., becoming REVIEWER) not forced | Batch 11 hardening |

No P0 findings. The security culture in this codebase (hashing, fail-closed guards, audit events, honest posture gates) is strong; the one P1 is mechanical and will be closed in this batch.

---

## External review round 2 — sec-batch-A (user-supplied audit)

A direct code read by the repo owner flagged silent hardcoded fallbacks for security-critical secrets plus a set of P1–P3 gaps. Verdicts and dispositions:

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| X0 | **BLOCKING** | `VAULT_MASTER_KEY` / `SIGNAL_PEPPER` / `NINAUTH_CLIENT_SECRET` / `LOOPBACK_SIGNING_SECRET` silently fell back to public dev constants if env unset; `vaultUsesDefaultKey` existed but nothing read it; no boot-time check anywhere | **FIXED** — `src/lib/platform/boot-guard.ts`: all guarded reads route through `guardedSecret()`; production boot THROWS (middleware module scope + every provider import → every request 500s) when any secret is missing / dev-default / `.env.example`-placeholder / <16 chars; dev logs one loud warning; live posture surfaced at `GET /api/v1/admin/security-posture` (ADMIN-only, booleans+labels only). Throw path verified standalone |
| X1 | P1 | CSP `'unsafe-inline'` for scripts in production — blocks almost nothing | **FIXED** — CSP moved to `src/middleware.ts`; production: `script-src 'self' 'nonce-<per-request>' 'strict-dynamic'` (Next.js + React 19 auto-nonce rendered scripts when the policy rides the request headers); dev unchanged for HMR; `TS_FORCE_NONCE_CSP=1` exercises the prod path in dev |
| X2 | P1 | 9 CVEs (5 high) via `@mdxeditor/editor`, `react-syntax-highlighter`, `sharp` — zero imports; plus dead `next-auth`, `z-ai-web-dev-sdk` | **FIXED** — all five removed (`bun remove`); grep-verified zero imports in `src/`; CI `audit` job fails on HIGH+ so they stay gone |
| X3 | P1 | No CI anywhere — "1,041 checks green" was manual and point-in-time (the missing-route and tsc-breaking regressions in the worklog were caught by luck) | **FIXED** — `.github/workflows/ci.yml`: tsc + eslint + prisma + mini-services + dev server + stage2/stage9/batch0/auth matrices in the documented order (with the documented 75s rate-window cooldown) + dependency-audit job |
| X4 | P2 | `typescript.ignoreBuildErrors: true` — production build succeeds with type errors | **FIXED** — flipped to `false` |
| X5 | P2 | Rate limiter trusted leftmost `X-Forwarded-For` — trivially spoofable, no documented proxy boundary | **FIXED** — `clientIp()` keys on the RIGHTMOST hop (`TS_TRUSTED_PROXY_HOPS`, default 1, documented in `.env.example` + code); proxies APPEND, so rightmost = proxy-observed, leftmost = client-controlled. `session.ts` ipHash now uses the same resolver |
| X6 | P2 | Login rate limit per-IP only — distributed stuffing across many IPs vs one account was unlimited beyond scrypt cost | **FIXED** — failure-only per-account window (8 failures / 15 min per identifier hash; enumeration-safe: buckets exist for unknown identifiers too, identical responses). Verified: 9th attempt across 8 spoofed IPs → 429 |
| X7 | P2 | Audit doc overstated "UA + hashed-IP binding" — recorded, never compared | **FIXED (both ways)** — this doc corrected; AND enforcement-lite added: mid-session UA drift on a live cookie audits `SESSION_DEVICE_CHANGE` and refreshes the stored fingerprint (hard binding stays off — mobile reality) |
| X8 | P3 | Per-process IP-hash salt, in-memory limiter, SQLite file — instance-local; zero deployment config in repo | **ACKNOWLEDGED (unchanged)** — G13/G14 deferred as before; now explicitly surfaced in the posture endpoint (`rateLimiting.implementation`) so the single-instance assumption is observable, not implicit |

### sec-batch-A verification evidence

- Boot guard throw path: standalone strict-mode test (unset secrets → REFUSED with actionable message; `.env.example` placeholder flagged weak; strong values pass).
- Dev posture: `[boot-guard] DEV POSTURE — …` warning visible in dev.log on every cold start.
- Per-account throttle: 8 failed logins across 8 distinct spoofed `X-Forwarded-For` values → 9th request `429 RATE_LIMITED` ("Too many failed sign-in attempts for this account") — per-IP rotation does not evade the account budget.
- CSP: production nonce policy emitted by middleware; dev policy byte-identical to the previous behavior (HMR-safe); single CSP header per response (no duplicates).
- `tsc --noEmit` 0 errors; `eslint .` clean after all changes.
