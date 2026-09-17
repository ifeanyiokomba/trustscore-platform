# ADR-001: NIN-First Identity Architecture

**Status:** ACCEPTED (supersedes the "rebuild" framing of earlier audits; reaffirmed by Batch 0 research 2026-09-17)
**Context:** directive §1–§15; NINAuth official developer material; competitive research.

---

## Decision

TrustScore's identity rail is **NINAuth (NIMC)** — the government consent gateway — and nothing else in V1. All identity verification enters through the NINAuth contract (OAuth 2.0 + PKCE authorization-code; enterprise share-code/QR redemption when LIVE); TrustScore's proprietary value is built strictly **above** that rail: evidence, reputation, contextual trust decisions, portable consent-driven sharing.

## Rationale (evidence-based)

1. **Official capability:** NINAuth provides biometric-bound identity assurance at app enrolment, consent-scoped field sharing (50+ `pii-fields` catalog), signed assertions, and enterprise verification endpoints (share codes, dynamic/static QR) — the strongest identity anchor available in Nigeria.
2. **Commoditization below us:** Dojah $0.04–0.06/call, Smile ID est. $0.10–1.00, Veriff $0.80 global — per-call KYC lookup is COGS with no moat. Nobody sells the *portable trust layer* (consent-scoped passports, reputation with due process, freshness-honest decisions, receipts, verifier-network effects).
3. **Regulatory alignment:** NINAuth's model (informed consent, purpose limitation, NDPA duties, intermediary gating) matches our consent-first architecture — adopting it is strategically and legally coherent.

## Consequences

### We do
- Store only masked provider subjects + peppered fingerprints; scope-guard tripwire permanent (the official catalog *includes* `nin` — we refuse it always)
- Model consent as first-class; granted scopes authoritative; purpose recorded everywhere
- Keep MOCK/LOOPBACK/LIVE honesty gates; LIVE blocked until partner credentials + IP allow-listing
- Distinguish NINAuth Share Codes (theirs, redemption input) from TrustScore Share Tokens (ours, sharing artifact)
- Treat NINAuth's identity assurance as sufficient for V1 (no forced second biometric flow; liveness is an *additional optional signal*, not a gate)

### We do not
- Collect or input raw NINs; run a raw-NIN lookup site; build bank-data or credit-bureau features
- Invent production scope names, endpoints, or error codes (20 UNCONFIRMED matrix rows are the LIVE checklist)
- Imply NIMC endorsement ("integration is not endorsement" — official positioning)
- Penalize new users for lacking history (NEW is neutral)

## Verification of adherence

Stage matrices 2–16 + the Batch-0 audits (`docs/audit/`) — scope-guard tests, masked-subject assertions, consent-record checks, tripwire tests, honest-posture tests.
