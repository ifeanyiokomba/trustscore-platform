# PROVIDER AUDIT — Batch 0

**Scope:** `src/lib/providers/**` (ninauth, phone, liveness, transport, provider-posture, credential-vault, scope-guard), `mini-services/provider-simulator`. Directive §9–§11, §46–§48.

---

## 1. Posture system (directive §47) — PASS (exemplary)

`MOCK` / `LOOPBACK` / `LIVE` with runtime switch (PlatformSetting, 5s cache). LIVE is **refused** (422 `LIVE_NOT_ENABLED`) unless `PROVIDER_LIVE_ENABLED` + base URLs + active vault credentials for all three providers exist. The UI says the posture truthfully everywhere (consent screens, admin console, provider names like `NINAUTH_LOOPBACK`). This is the honesty principle the directive demands — preserved and verified by tests (stage13 matrix).

## 2. Transport (directive §46) — PASS

HMAC-SHA256 signing, 4s timeouts, idempotency keys, retry-only-on-5xx/network (2×, 150/600ms), 401/403 → AUTH_REJECTED (never retried), per-provider circuit breakers (3 fails → OPEN 20s → HALF_OPEN), p50/p95 + error-rate metrics with admin reset. No fabricated positives on degradation — honest UNKNOWN.

## 3. Credential vault — PASS

AES-256-GCM, write-only surface (write + activate + list metadata; no read-back of secrets), env-keyed, admin-gated, audited.

## 4. Mock contract honesty (directive §9, §11) — PASS with one standing rule

- Internal scopes (`identity.basic`, `identity.nin_status`, `profile.name`, `profile.demographics`) are **mock-contract-only** — labeled as such in code comments and consent UX, and the official docs publish **zero scope strings** (research 2026-09-17), so nothing pretends to be official vocabulary.
- **Standing rule (PR1/adapter):** production scope mapping must be a configurable table `TrustScore capability → NINAuth production scope/field`, swapped only when the partner contract lands. The contract matrix's 20 UNCONFIRMED rows are the LIVE-readiness checklist.

## 5. Loopback simulator — PASS

The :3032 simulator issues its own ID tokens (own issuer + signing key), enforces HMAC-signed calls, supports fault injection (timeout/5xx/auth-reject) — the LIVE code path is exercised end-to-end in-sandbox (verified by stage13 E2E).

## 6. Future provider landscape (directive §48) — classified

Competitor research (2026-09-17) classifies: **Dojah** (supplier/future adapter, $0.04–0.06/call), **Smile ID** (liveness supplier candidate, est. $0.10–1.00), **QoreID/VerifyMe** (legacy competitor + future adapter), **Youverify** (pivoted to US FRAML), **Prembly** (same commoditized lane). Strategic rule: the KYC layer is COGS behind the NINAuth spine — never the moat.

## 7. Findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| PV1 | P2 | LIVE contract unknowns (base URL, token auth method, scope names, error table, webhook events) | Blocked on partner; UNCONFIRMED checklist ready |
| PV2 | P3 | Scope-mapping table (capability → production scope) not yet externalized as config | Batch 1 (NINAuth production alignment) |
| PV3 | P3 | Phone/liveness fallback-chain orchestration (primary→fallback) is single-provider today | Batch 12+ if a second provider is contracted |
