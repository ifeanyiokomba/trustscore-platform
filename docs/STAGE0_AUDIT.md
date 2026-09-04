# TrustScore — Stage 0 Audit, Gap Analysis & Staged Implementation Blueprint

**Date:** 2026-09 (audit cycle 1)
**Scope:** `github.com/ifeanyiokomba/trustscore` audited against the *NIN-First TrustScore Architecture* (v2026-09 directive).
**Mode:** Research + validation only. **No product implementation performed in this document** — Stage 1 implementation follows *after* this audit is accepted, per directive.

---

## 1. Executive Summary

| Question | Finding |
|---|---|
| Does the repo implement the NIN-First architecture? | **No.** It is a bank/phone-first KYC-style demo with mock providers. |
| Does the repo integrate NINAuth? | **No.** NIMC exists only as a mock adapter label. No OAuth/OIDC/PKCE, no verification sessions, no consent-scoped flows. |
| Does the repo have real users/authentication? | **No.** "Onboarding" is an unauthenticated form that creates a `Person` row. No accounts, no sessions, no security model. |
| Does the repo follow stage discipline? | **No.** The repo's own `worklog.md` records that everything (Stage 1→9 equivalents) was built in a single pass with mocks, skipping the directive's stage gates. |
| Is the strategic direction salvageable? | **Yes — strongly.** The evidence-graph thinking, explainability, flag/resolution lifecycle, compliance mindset and "never claim live integration" honesty are high-quality foundations. The repo is a **design prototype**, not the NIN-First product. |
| Recommended action | Treat the repo as a **reference prototype**. Rebuild the product stage-by-stage on the NIN-First architecture (this repository, fresh Stage 1), lifting proven patterns (evidence graph, trust bands, flag lifecycle) rather than porting code wholesale. |

---

## 2. NINAuth Research & Validation (primary sources, fetched live)

### 2.1 What was verified (official NIMC / NINAuth sources)

| Item | Validated fact | Source |
|---|---|---|
| Ownership | NINAuth is the official identity **consent gateway owned and operated by NIMC** | `ninauth.nimc.gov.ng/about-nin-auth` |
| Access model (enterprises) | A private org operating in Nigeria connects to NIMC verification services **only through an approved identity Verification Partner** (mandated) | `ninauth.nimc.gov.ng/enterprises` |
| Access model (partners) | Verification Partners connect through a **designated Aggregator**; NIMC charges Aggregators on **transaction volumes**; Aggregator invoices the partner; Enterprise ↔ Partner pricing is a **private commercial agreement** | `ninauth.nimc.gov.ng/verification-partner` |
| Eligibility criteria | NDPA compliance; **physical Nigerian presence** subject to Nigerian civil/criminal law; access via approved partner only; **informed consent** for NINAuth matching; **purpose-limited use**; infosec + access controls with **logging & monitoring**; **compliance reporting**; **independent audits** | both pages above, identical criteria lists |
| Onboarding timeline | 5–7 business days (partner terms + contract with aggregator/partner) + 5–7 business days (connection establishment) | both pages above |
| Public pricing | **None published.** NIMC→Aggregator volume fees are private; costs flow Aggregator → Partner → Enterprise. Budget must be obtained via partner engagement. | `verification-partner`, `enterprises` |
| Verification methods | (1) **QR scan** — org displays QR, user scans with NINAuth app; (2) **Share code** — user-generated, **time-limited**, shareable online/in-person; (3) **Online verification** (remote, digital onboarding); (4) **In-person verification**; (5) **Raw-NIN matching** — for orgs that *already securely possess* a raw NIN; NINAuth explicitly **does not collect raw NINs from users** | `ninauth.nimc.gov.ng/get-started`, dev guide |
| No raw NIN exposure | "The NINAuth flow enables identity verification through user-driven, consent-based interactions, **with no need to expose the raw NIN**" | `ninauth.nimc.gov.ng/developers-guide` |
| Security/protocol stack | OAuth 2.0, OpenID Connect v1.0, FIDO UAF, WebAuthn; W3C **DID v1.0 / VC v1.1**, DIDComm v2, Decentralized Web Nodes; PKI (ECC where feasible, NPKI with NITDA); NTP timestamping; **permissioned DLT backup of verification-transaction metadata only (no PII on ledger)**; OSIA; 2D barcode symbology | `about-nin-auth`, `standards-adopted` |
| Wallet architecture | NINAuth Digital ID Wallet holds: PII, **verified credentials** (gov-issued), **trusted third-party credentials**, **self-declared credentials**; roles = Issuers, Wallet Users, Wallet Service Providers | `ninauth.nimc.gov.ng/wallet` |
| Consent UX | On QR-scan consent the app shows: requesting organization, **specific data fields**, **purpose of usage**; user can approve/deny in real time | privacy policy + `get-started` |
| Retention & custody | Verification logs, consent records, system transactions are **archived after 90 days**; **no permanent deletion** (audit-trail preservation); **"NINAuth does not independently store or own user identity data — all verified and archived records remain within NIMC's authorized infrastructure"** | `ninauth.nimc.gov.ng/legal/privacy-policy` (last updated 27/11/2025) |
| Data subject rights | Access, rectification, consent withdrawal, complaints → `dpo@nimc.gov.ng`, **30-day** response commitment | privacy policy |
| Law-enforcement disclosure | May be required without consent when legally mandated | privacy-and-security |
| Partner registry | Public searchable registry of approved enterprises/verification partners exists | `ninauth.nimc.gov.ng/approved-partners` |

### 2.2 What is NOT publicly documented (open items — must be closed via partner engagement)

| Open item | Why it matters | How to close |
|---|---|---|
| **Scope catalog** (exact OAuth/OIDC scope strings per data field) | Drives our consent screen, token validation, and `verification_sessions.scopes` design | During partner application; request the scope catalog + sandbox credentials |
| **ID-token claims / response field list** | Drives the `Evidence` normalizer + `identity_attributes` model | Same — request field-level response spec |
| **Commercial cost per verification** | Unit economics of the B2B Trust API; pricing model design | Direct quote from Verification Partner (aggregator-inclusive) |
| **OAuth endpoint URLs / PKCE parameter specifics** | Stage 2 implementation details (authorize/token/introspection/JWKS) | Partner sandbox docs |
| **Permitted-purpose enumeration** | Purpose-limited access is contractual; our `consents.purpose` vocabulary must match the granted purpose list | Written into the partner agreement |
| **Webhook/callback contract** | Stage 2 callback handling | Partner sandbox docs |
| **Per-verification SLAs / rate limits** | Capacity planning + queue design | Partner agreement |

> **Validated conclusion for the architecture:** the directive's assumptions about NINAuth (approved verification partners, informed consent, scoped access, OAuth/PKCE-style backend token handling, compliance/audit obligations, NIMC custody of identity records) are **accurate**. The directive's claim of "QR/share-code and digital-wallet direction" is **accurate**. The **"OAuth/PKCE with backend token exchange"** description matches NINAuth's published OAuth 2.0/OIDC stack, but **exact endpoints, scopes and claims are not public** and must be captured at partner onboarding. Until then, every NINAuth-touching surface in TrustScore remains **contract-first, mock-provider-second**, exactly as the repo's honesty principle requires.

### 2.3 Market context (validated)

| Vendor | Positioning | Public price signal |
|---|---|---|
| **Dojah** | KYC orchestration (NIN/BVN/CAC/phone), fraud, PAYG | from ~$0.04–$0.06/call, ~$0.12 standard |
| **Smile ID** | Pan-African KYC, biometric + document | doc ~$0.10–0.30, biometric KYC ~$0.30–1.00, AML ~$0.05 |
| **Youverify** | KYC/AML/address/fraud workflows | enterprise-only, not public |
| **didit.me** (reference) | KYC/KYB/AML | ~$0.33 full KYC, $0.15 doc check |

**Strategic implication (validated):** the identity-verification layer is commoditized. The directive's positioning — *"We turn verified identity into reusable trust"* (Trust Passport + Safety Check + Trust Decision API), **not** "we verify NIN better" — is the correct differentiation and does **not** collide with Dojah/Smile/Youverify's core business; they become candidate **Verification Partners/adapters** in our provider router.

### 2.4 Compliance obligations inventory (NDPA / NDPC / NINAuth-partner)

1. **NDPA data-subject rights**: access, rectification, objection, erasure, portability; Section 37 — solely-automated decisions with legal/similarly-significant effect require safeguards (human review, explanation, contest).
2. **NDPC guidance**: scoring/profiling, significant automated decisions, sensitive data → **DPIA consideration required** before launch of the scoring engine (Stage 8 gate).
3. **NINAuth partner obligations** (contractual): informed consent, purpose limitation, security/access controls, logging+monitoring, compliance reporting, independent audits.
4. **NINAuth custody model**: raw identity records stay in NIMC infrastructure → TrustScore must hold **verified evidence + references, not raw NIN** (aligns with directive §59).
5. **Retention**: NINAuth archives its logs/consents (90-day cycle, no permanent deletion, NIMC custody). TrustScore's **own** retention policy must be defined per evidence type with expiry + DSR handling (repo already has `expiresAt` — good foundation).
6. **B2B API consumers**: consent provenance must be demonstrable for every identity data point we expose (Trust Receipts, §16).

---

## 3. Repository Audit — `ifeanyiokomba/trustscore` (157 files)

### 3.1 What the repo IS

- **Stack:** Next.js 16 (App Router) + TypeScript 5 + Tailwind v4 + shadcn/ui (New York) + Prisma/SQLite + Framer Motion + Recharts + Zustand. Single user-visible route `/` (sectioned SPA). *No FastAPI, no PostgreSQL, no Redis, no Flutter.*
- **Self-description:** "Trust infrastructure for transactions, identity and reputation across Africa. Nigeria-first… **Mock-provider sandbox**." Every verification result is simulated; providers are labeled MOCK in UI and API responses.
- **Built:** created 2026-08-19, one execution pass (its `worklog.md` shows a single-session build of all sections at once).

### 3.2 What the repo HAS (asset inventory)

| Asset | Quality | Reusable in NIN-First build? |
|---|---|---|
| Evidence-graph domain model (`Person/Phone/BankAccount/IdentityReference → Verification → Evidence`) with hashed identifiers | High | **Yes** — pattern lifts directly into `trust_identities`/`evidence` |
| Explainable Trust Decision Engine (5 dimensions, 300–1000, UNKNOWN band, policy versioning) | High | Yes — Stage 8 core |
| Flag → Resolution lifecycle + human review + FraudSignal on confirm | High | Yes — Stage 7 core |
| Provider router (PRIMARY→SECONDARY→FALLBACK→manual) + mock sandbox with failure simulation | High | Yes — Stage 2/4 adapter pattern |
| Compliance section: living NDPA/NDPC matrix, data inventory, unresolved-legal-questions register | High | Yes — Stage-gate artifact |
| API surface: 20+ routes incl. apikeys, webhooks, audit, safety-check, profile/[handle] | Medium | Contract ideas only — re-specified as `/v1/*` per blueprint |
| B2B dashboard + API explorer | Medium | UI patterns |
| `platform.ts`: requestId, idempotency, API-key hashing (sha256), rate limit, redacted audit | High | Yes — platform middleware |
| Honest MOCK labeling discipline | High | **Keep as cultural invariant** |

### 3.3 GAP ANALYSIS — repo vs NIN-First architecture

| # | Architecture requirement (directive §) | Repo state | Gap severity |
|---|---|---|---|
| 1 | **NIN-first identity spine**: NINAuth → Trust Identity → Passport (§23, §30) | Bank/phone-first; NIMC is one mock label among five providers | **Critical** — the entire product thesis |
| 2 | **TrustIdentity** first-class entity with assurance levels (§29, §30) | `Person` is a demo handle, no assurance levels, no status lifecycle | **Critical** |
| 3 | **User ≠ Trust Identity ≠ NIN ≠ Phone** separation (§29) | `Person` conflates user+identity; no accounts at all | **Critical** |
| 4 | **Authentication** (Stage 1 §40: "authentication") | **None.** No accounts, sessions, or secrets | **Critical** — Stage 1 blocker |
| 5 | NINAuth OAuth/OIDC + PKCE + backend token validation + consent callback (§32, §41) | Absent | **Critical** (Stage 2, blocked on partner scope anyway) |
| 6 | Consent architecture: who/why/scopes/granted/when/provider/policy-version (§31) | `Consent` = purpose + timestamps only; no scopes, no requester, no policy version | **High** |
| 7 | Trust Passport (flagship §A, §5) | Absent | **High** (Stage 5) |
| 8 | Trust Link `trustscore.ng/@username` viral loop (§3) | `@handle` public profiles exist (`/api/profile/[handle]`) — closest match | **Medium** — concept present, mechanics (share tokens, QR cards) absent |
| 9 | QR Trust Card + share codes (§4) | QR renders on profile (visual only, no verification semantics) | Medium |
| 10 | Safety Check "Check Before You Deal" (§2, §46) | `/api/safety-check` + phone/account/identity/face verify exist but as **direct KYC checks**, not trust assessment of a shared Trust Identity | Medium (wrong layer) |
| 11 | "No confirmed adverse signals found" language discipline (§2) | Bands use Approve/Decline language (KYC-decision flavored) | Medium — language refactor needed |
| 12 | Verification freshness / continuous verification (§14) | `expiresAt` on Evidence/IdentityReference exists; **freshness UX absent** | Medium |
| 13 | Identity Security Center + change alerts (§15) | Absent | Medium (Stage 5+) |
| 14 | Trust Receipts (§16), Trust History (§17) | SafetyCheck log ≈ history-lite; no receipts | Medium |
| 15 | Credentials with issuer + provenance (§6, wallet alignment) | Absent | High (Stage 5/10) |
| 16 | Trust References anti-collusion (§19) | Absent | Later-stage |
| 17 | Transaction-specific trust decisions (§12) | Single universal score | Medium (Stage 8+) |
| 18 | Score states NEW/VERIFIED/ESTABLISHED/CAUTION/HIGH_RISK/REVIEW_REQUIRED (§35) | Risk bands only (VERY_LOW…CRITICAL/UNKNOWN); no "NEW not penalized" principle | Medium |
| 19 | Appeals + human review (§33) | Resolution lifecycle exists incl. human review; formal appeal SLA absent | Medium |
| 20 | DSR endpoints: access/rectification/erasure/portability (§33) | Documented as compliance matrix rows; **not implemented** | High (NDPA) |
| 21 | Domain services separation (§28: IdentityService, ConsentService, …) | All logic in 5 lib files + routes (workable but not domain-service-shaped) | Low-Medium (refactor during rebuild) |
| 22 | B2B Trust Decision API `POST /v1/trust/check` (§49) | `/api/trust` exists unversioned; API-key infra exists | Medium |
| 23 | Flutter mobile app (§24A) | Absent | **Critical for product, N/A for web sandbox** — blueprint only until Flutter environment exists |
| 24 | FastAPI + PostgreSQL + Redis + queue backend (§27) | Absent (Next.js API routes + SQLite) | **Critical for production infra; adapted deliberately in sandbox** (see §4.1) |
| 25 | Stage discipline + per-stage testing/re-audit | Violated — everything built at once | **Critical (process)** — this audit resets it |
| 26 | No NIN in URLs/logs/analytics/frontend state (§38) | Followed (hashed refs, redacted logs) — good | Closed |
| 27 | Rate limiting, idempotency, requestId, audit | Present | Closed (carry forward) |

### 3.4 Root-cause assessment

The repo optimized for **breadth demo** (all sections, mock everything) instead of **staged product** (real foundation → real identity spine → real passport). The directive's core complaint — "before the AI agent writes another significant amount of code, audit first" — is precisely about this pattern. The gap analysis therefore recommends: **keep the repo as reference; rebuild in this repository with stage gates.**

---

## 4. Staged Implementation Blueprint (Web + Flutter + FastAPI)

### 4.1 Environment reconciliation (honest constraint statement)

| Blueprint target (directive) | This execution environment | Reconciliation |
|---|---|---|
| FastAPI + PostgreSQL + Redis + queue | **Next.js 16 App Router API routes + Prisma/SQLite (sandbox-fixed)** | Stage 1–2 implement the **same API contracts** (`/api/v1/…` ↔ `/v1/…`) and the same **domain-service separation** (service modules per §28) so the backend can be lifted to FastAPI later with contract parity. A FastAPI mirror is **blueprint-only** until Python infra is attached. |
| Flutter mobile app | Not runnable here | **Blueprint + screen specs only.** Deep-link + QR contracts are defined in Stage 1 so Flutter can consume them from day one. |
| `trustscore.ng/@username` public routes | Single `/` route constraint (sandbox) | Public profile *views* render inside `/` as a section in sandbox; the routing scheme is documented for production. |

### 4.2 Stage plan (each stage: build → **test completely** → **re-audit** → gate)

**Stage 0 — Discovery (this document).** Exit: this audit accepted; open items (§2.2) assigned to business track.

**Stage 1 — Platform Foundation (IMPLEMENTED NEXT, ONLY THIS ONE)**
- Web (this repo): design system (NIN-First trust palette, dark mode, responsive, sticky footer), landing experience (Trust Passport concept, Check Before You Deal, Trust Link, QR Trust Card, Why-trust explainability, security & privacy posture), **real authentication** (accounts, sessions, httpOnly cookies, scrypt password hashing, rate limiting, zod validation, audit events), platform APIs (`/api/health`, `/api/v1/auth/*`), Prisma foundation schema (`UserAccount`, `Session`, `AuditEvent`, + handle reservation), notification/audit plumbing.
- Backend-for-production (FastAPI blueprint): project skeleton spec, config/secrets, structured logging, health endpoints, migration tooling — documented contract so the Next.js implementation is a reference implementation of the same contract.
- Mobile (Flutter blueprint): app shell, secure storage, deep-link scheme `trustscore://` + universal links, auth screens consuming the same `/v1/auth` contract.
- **Test gate:** lint clean; dev.log error-free; agent-browser E2E covering register → login → me → logout → health; auth negative cases (bad password, dupe email/handle, validation); rate limit; mobile viewport + sticky footer.
- **Re-audit gate:** schema matches §29 foundations; no raw-identity storage; audit events emitted for all auth actions; MOCK/live discipline preserved; worklog updated. **STOP. Do not start Stage 2.**

**Stage 2 — NINAuth Identity (blocked on partner scope until sandbox creds exist; build behind adapter interface)**
- `POST /v1/identity/sessions`, `GET /v1/identity/sessions/:id`, `GET /v1/identity/me`; OAuth/OIDC + PKCE authorization-code flow, backend-only client secret, ID-token validation (signature via partner JWKS), consent callback, scopes recording; `verification_sessions`, `verification_events`, `consents` (requester/purpose/scopes/granted/policyVersion) fully populated; **NINAuth-mock provider** that simulates QR + share-code + consent screens with the exact contract the partner spec will define.

**Stage 3 — Trust Identity:** `trust_identities`, `identity_identifiers` (hashed), `identity_attributes` (consent-scoped), assurance levels L1–L4, evidence records with provenance + freshness.

**Stage 4 — Phone + Biometric:** phone verification service, selfie/liveness adapter (Smile-ID-class), cross-signal consistency; assurance escalation when signals agree.

**Stage 5 — Trust Passport:** profile, TrustScore snapshot, credentials, **QR trust card**, **share tokens/trust link**, verification history, identity security center, trust receipts, DSR self-service (NDPA).

**Stage 6 — Safety Check:** check-by-QR / trust-link / username; sanitized assessment ("No confirmed adverse signals found"); freshness; explanation; per-check consent + receipts.

**Stage 7 — Reputation (limited):** flags with evidence, resolution + appeal with human review, verified interactions; anti-gaming by design.

**Stage 8 — Trust Engine:** rules-first scoring policy (configurable), score states incl. NEW, confidence + explanation + freshness; **DPIA before enabling automated significant decisions** (NDPC guidance gate).

**Stage 9 — B2B Platform:** developer portal, API keys, webhooks, usage, team/RBAC, billing, `POST /v1/trust/check` Trust Decision API.

**Stage 10 — Trust Network:** verified interactions network, FraudNet-class shared signals, cross-platform trust, pan-African country-provider abstraction.

### 4.3 Stage-1 data model (foundation only — deliberately minimal, extends per stage)

```
UserAccount   id, email(unique), passwordHash, passwordSalt, displayName,
              handle(unique, reserved for trustscore.ng/@handle), status,
              acceptedTermsAt, createdAt, updatedAt
Session       id, userId→UserAccount, tokenHash(unique), expiresAt,
              userAgent, ipHash, createdAt, revokedAt
AuditEvent    id, actorType, actorId, action, subjectType, subjectId,
              requestId, metadata(json), createdAt   (redacted, no PII)
Notification  id, userId, type, title, body, readAt, createdAt   (plumbing only)
```
Later stages append: `trust_identities`, `identity_identifiers`, `identity_attributes`, `identity_credentials`, `consents`, `verification_sessions`, `verification_events`, `evidence`, `trust_signals`, `trust_score_snapshots`, `trust_share_tokens`, `flags`, `flag_evidence`, `resolutions`, `appeals`, `api_clients`, `api_keys` — per directive §29. **User ≠ Trust Identity ≠ NIN ≠ Phone from day one.**

### 4.4 Security model (Stage 1 baseline, carried forward)

- scrypt password hashing (per-user salt, timing-safe verify) — no plaintext, no reversible storage
- Session tokens: 256-bit random, **stored hashed (sha256)**; httpOnly + sameSite=lax + secure cookies; 30-day expiry; revocation on logout
- Rate limiting (in-memory fixed window) on auth endpoints; zod input validation on every route
- Audit events for register / login / login_failed / logout — **no PII in metadata**
- Errors: uniform `{ error: { code, message, requestId } }`; no stack traces to clients
- Threat-model notes (§38) inherited: no raw identifiers in URLs/logs/analytics/frontend state

### 4.5 Business track (parallel to engineering — owner: founder)

1. Shortlist NINAuth **approved Verification Partners** from the public registry; obtain: scope catalog, response-field spec, sandbox credentials, pricing quote (aggregator-inclusive), permitted-purpose list, webhook contract.
2. Submit partner/enterprise application (NDPA posture + Nigerian presence + consent/purpose/security/audit commitments — Stage 1's Privacy Center groundwork feeds this).
3. DPIA pre-work before Stage 8.
4. Legal review: credit-bureau/AML classification questions (repo's compliance register already tracks these).

---

## 5. Audit Verdict

**The existing repository is a valuable design prototype but is NOT the NIN-First TrustScore product.** It lacks the identity spine (NINAuth/TrustIdentity), real authentication, consent architecture, and stage discipline. Rebuilding stage-by-stage with hard test gates is the correct path, lifting the repo's proven patterns (evidence graph, explainable bands, flag lifecycle, mock-provider honesty, compliance register).

**Directive for this session: implement Stage 1 only, test completely, re-audit, stop.**

---

## Appendix A — Stage 1 Re-Audit Verdict (post-implementation)

**Re-audit date:** same session, after full test cycle. **Result: PASS — stage gate closed, Stage 2 not started.**

| Gate criterion (§4.2 Stage 1 re-audit gate) | Evidence |
|---|---|
| Schema matches §4.3 foundations | `UserAccount`, `Session`, `AuditEvent`, `Notification` — exactly the specified set; nothing more (no premature Trust Identity tables) |
| No raw-identity storage | No NIN/BVN/phone columns anywhere; passwords scrypt-hashed (N=16384, per-user salt, timing-safe compare); session tokens stored only as sha256; IPs stored as salted hashes |
| Audit events for all auth actions | AUTH_REGISTER / AUTH_LOGIN / AUTH_LOGIN_FAILED / AUTH_LOGOUT all emitted and verified through the activity feed; metadata allowlisted (no PII) |
| MOCK/live discipline preserved | No live integration claimed; Passport/QR/Copy labeled "ships Stage 5"; NINAuth button labeled "Stage 2"; API index states no live government integration |
| Test gate passed | tsc 0 errors; eslint 0 errors; curl matrix (11 cases incl. 401/409/422/429); agent-browser E2E (register→dashboard→logout→login→error path→dark mode→mobile→footer); console clean; dev.log clean; VLM visual check clean |
| STOP honored | Stage 2 identity-session endpoints NOT created; `verification_sessions`/`consents` tables NOT created |

**Deviations (accepted):** custom scrypt session auth instead of NextAuth v4 (deliberate: FastAPI contract parity, Next 16 compatibility); single-route SPA constraint per sandbox; Flutter/FastAPI as blueprint-only per §4.1.

**Verdict:** Stage 1 is complete, tested, and re-audited. Proceed to Stage 2 **only** on explicit user go-ahead (and ideally after NINAuth partner scope items in §2.2 have answers; Stage 2 may be built behind a contract-first mock adapter meanwhile).

---

## Appendix B — Stage 2 Re-Audit Verdict (post-implementation)

**Result: PASS — stage gate closed. Stage 3 not started.**

| Gate criterion (§4.2 Stage 2) | Evidence |
|---|---|
| `POST /v1/identity/sessions` | 201; PKCE S256 generated server-side; consent-screen contract returned; 10-min TTL; rate-limited 5/min |
| `GET /v1/identity/sessions/:id` | Owner-only (cross-user → 404); redacted event timeline; lazy expiry |
| `GET /v1/identity/me` | TrustIdentity + consent history + latest session timeline; masked references only |
| OAuth/OIDC + PKCE, backend-only secrets | Verifier never sent to any client (verified in matrix); mock client secret backend-only; ID tokens HMAC-signed and VALIDATED (signature/iss/aud/exp/iat/nonce) — never merely decoded |
| Consent callback | state/nonce binding (wrong state → 400, session FAILED); one-time 60s codes (timing-safe hash compare); code replay → 409; forged code → EXCHANGE_FAILED |
| Consent recording (§31) | requester/purpose/scopes/policyVersion/grantedAt persisted; consent-screen UX matches NINAuth's published contract (org, fields, purpose) |
| MOCK provider honesty | `providerMode: "MOCK"` in every response; MOCK badges in UI; consent endpoint documented as retired-in-LIVE |
| Test gate | tsc 0 · eslint 0 · 36/36 contract matrix · browser E2E approve + deny + mobile + toasts · dev.log clean · VLM visual QA pass |

**Deviations (accepted):** the mock "NINAuth app" consent decision is an authenticated API endpoint (in LIVE mode this becomes NINAuth's real redirect); sandbox FastAPI/Flutter remain blueprint-only per §4.1.

**Verdict:** Stage 2 complete. Next: Stage 3 (Trust Identity management — assurance levels L1–L4, hashed identifiers, consent-scoped attributes) only on explicit go-ahead.
