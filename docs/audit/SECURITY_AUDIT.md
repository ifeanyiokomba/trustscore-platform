# SECURITY AUDIT — Batch 0

**Scope:** directive §42 checklist against the actual code. Method: pattern review of auth/session/crypto/provider/rate-limit implementations + route inventory. (Sandbox-level review; a full penetration pass is Batch 11.)

---

## Checklist verdicts

| Control | Status | Evidence |
| --- | --- | --- |
| Authentication (sessions) | **PASS** | httpOnly cookie; sha256 token hash at rest; revocation; ACTIVE-status check; UA + hashed-IP binding |
| Authorization | **PASS** | Session-gated routes via `getSessionUser`; role gates (USER/REVIEWER/ADMIN); B2B via hashed API keys with caller scoping; no IDOR found in route params (all IDs re-scoped to caller/subject ownership in services) |
| CSRF | **PASS (sameSite=lax + JSON POST)** | All mutating routes are JSON POST/PATCH with zod validation; lax cookie + no form-encoded mutations. Note: strict `sameSite` would break no current flow — consider tightening in Batch 11 |
| CORS | **PASS (default closed)** | No permissive CORS headers anywhere; same-origin API only |
| CSP | **FAIL (absent)** | `next.config.ts` ships no `Content-Security-Policy` — **P1, fix in Batch 0 corrections** (with X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) |
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
| S4 | P3 | No dependency-audit automation (npm/bun advisories) | Batch 11 tooling |
| S5 | P3 | Session rotation on privilege change (e.g., becoming REVIEWER) not forced | Batch 11 hardening |

No P0 findings. The security culture in this codebase (hashing, fail-closed guards, audit events, honest posture gates) is strong; the one P1 is mechanical and will be closed in this batch.
