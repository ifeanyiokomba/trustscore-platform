# PRIVACY AUDIT — Batch 0

**Scope:** data minimization, NIN-handling, consent provenance, NDPA alignment, subject rights. Directive §14–§16, §50–§52.

---

## 1. The raw-identifier invariant — PASS (strongest control in the system)

- **Schema:** no field anywhere stores a raw NIN/BVN. `IdentityIdentifier.valueHash` holds a peppered sha256 fingerprint; display hints are masked (`NINAUTH-****-AB12`, `+234••••789`).
- **Runtime tripwire:** `scope-guard.ts` blocks any provider payload carrying a `nin`/`bvn`/`national_id`-family key — nothing from that payload persists; a SYSTEM audit event records the blocked key *names* only.
- **Research note (2026-09-17):** the official `pii-fields` catalog **includes `nin`** among 50+ paths — enterprises can request it. Our tripwire therefore stays **permanently mandatory**; TrustScore must never request that field, and must refuse it if a provider ever sends it unrequested.
- **Exposure surfaces:** no NIN in URLs, QR payloads (TrustScore QR carries a share token), logs (audits store masked refs), analytics (none exists client-side beyond none), API paths, or browser storage (auth uses httpOnly cookies only).

## 2. Keyed-hash strategy (directive §15) — PASS

Phone/email identifiers use a peppered hash (`SIGNAL_PEPPER`), not ordinary unsalted hashing — precomputation/rainbow-table resistance. Pepper is env-based, documented as must-rotate-in-production. Raw NIN is never input by the user at all (no manual NIN entry — removed by design in the V1 decision).

## 3. Consent provenance — PASS (first-class)

`Consent` records carry: requester, purpose, requested scopes, granted scopes, policy version, provider, session linkage, timestamps, withdrawal state. Both identity verification and authentication flows create real consent records; withdrawal endpoints exist and are honored (attributes hidden, checks become UNAVAILABLE). The B2B check receipt names the business to the subject.

**Finding PR1 (P2):** the consent purpose vocabulary is TrustScore-internal (`SELF_IDENTITY_VERIFICATION`, `NINAUTH_AUTHENTICATION`, Safety/Network purposes). The official enterprise contract uses a 39-key `request-reasons` catalog — when LIVE integration arrives, map our purposes to partner request reasons in the adapter (never expose raw catalog values to users without our consent screen). Documented in the contract matrix.

## 4. Data-subject rights (NDPA §37-class) — PASS

DSR self-service: access (export), rectification (display name), erasure (account + identity data cascade), portability (JSON export), consent withdrawal, human review (appeals). Retention: score snapshots capped at a rolling 50; safety checks capped at 50; receipts retained for provenance with masked data only.

## 5. Minimal storage pipeline — PASS

Provider responses are never persisted wholesale. `SanitizedAssertion` = masked subject + verified flag + whitelisted profile keys. The ID token itself is validated then discarded; no token is stored.

## 6. No bank data, no credit bureau claims (directive §50–51) — PASS

No bank/account fields exist. No creditworthiness claims anywhere in copy or engine outputs. Engine outputs are band/status/signals with the NDPA note on the B2B surface ("assessment surface, not an automated-decision surface").

## 7. FraudNet posture (directive §52) — PASS

Shared signals are band-level and k-anonymized; no public blacklist; source/evidence/confidence/status/expiry/resolution all modeled on `SharedSignal`.

## 8. Privacy findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| PR1 | P2 | Purpose↔requestReason mapping for LIVE | Adapter-mapping doc when partner contract lands |
| PR2 | P3 | DSR export completeness test (erasure cascade) exists for core paths; add a periodic invariant test | Batch 2 test add |
| PR3 | P3 | No data-retention schedule doc for audits/notifications | Batch 12 (production infra) policy doc |
