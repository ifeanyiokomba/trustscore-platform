# PRODUCT AUDIT — Batch 0

**Scope:** product thesis, user journeys, copy honesty, B2B proposition vs directive §1–§33 and the research in `docs/research/`.

---

## 1. Thesis integrity — PASS

The central separation (IDENTITY / EVIDENCE / REPUTATION / RISK / TRUST DECISION) is not violated anywhere:
- No surface claims "NIN verified = trustworthy". The engine requires evidence breadth; identity verification alone yields a modest score with a NEW-status explanation.
- The public policy is published; every result carries signals + freshness + policy version.

## 2. Consumer journey vs directive §66 — PASS with one gap

```
Open → Sign in → Continue with NINAuth → consent → identity verified →
Trust Passport created → score explanation → share (QR/link) → check someone → safer decision
```
All steps exist and are tested (stage16 E2E drives the NINAuth journey end-to-end). 

**Finding P1 (P1):** `/api/v1/trust/check` (B2B) accepts `{handle|phone|link|qr}` but **no `purpose`** — directive §22 requires transaction-specific trust (marketplace / employment / rental / high-value…). The consumer Safety Check is purpose-bound by consent design, but the B2B surface can't label *why* it checked. Fix: optional `purpose` enum, echoed in the subject receipt ("A business checked your profile for **rental screening**"), stored on the TrustDecision, surfaced in check history. Backward-compatible.

## 3. Safety Check language (directive §21) — PASS (verified in code)

`SAFETY_LANGUAGE` locked constants; `headlineForStatus` never returns "safe"; disclaimer on every card; states map to evidence statements. "No confirmed adverse signals found" / "New profile — …" / "Under review — proceed with care" — exactly the mandated vocabulary.

## 4. New-user fairness (directive §24) — PASS

Status enum includes NEW; absence of reputation ≠ negative reputation (NEW is neutral, scoring gives no negative for empty history; empty states use "You're verified. Your reputation is just beginning."-class copy).

## 5. Trust Passport vs directive §19 — PASS, strong

Score / band / status / freshness / credentials / QR Trust Card / scoped expiring share tokens with max-views / receipts / revocation / share history — all present with provenance internally.

## 6. NINAuth Share Code vs TrustScore Share Token (directive §12) — PARTIAL

The codebase correctly keeps them distinct (ShareToken model is TrustScore's own artifact; NINAuth share codes are not implemented). 

**Finding P2 (P2):** the official Postman contract documents a real enterprise **share-code verify** flow (`POST /api/v1/…/sharecode/verify/{Enterprise_ID}` with `requestReason` from a 39-key catalog) and **dynamic QR sessions** (2-minute time-bound JWTs). TrustScore should eventually accept a *user-presented NINAuth share code* as a Safety Check input modality (user consents at NINAuth, business redeems). This is a Batch 6 candidate — blocked on LIVE credentials for real redemption, but the UX slot and consent model can be designed now.

## 7. Business identity (directive §53) — GAP (P2)

No Person/Business/Authorized-Representative distinction. NINAuth business sign-in (RC number) is UNCONFIRMED in official docs, so: **model now, integrate later**. Schema addition (Business + representative binding) is a Batch 2 candidate; no invented provider claims.

## 8. B2B platform (directive §33) — PASS, strong

Developer portal, organizations, API keys, team RBAC, usage/quota, webhooks, decisions log, docs surface — all present with tenant isolation server-side (caller scoping in `trustdecision-service`).

## 9. Monetization (directive §49) — correctly unimplemented

No pricing invented. Quota/plan plumbing exists for future metering. Competitor research confirms per-call KYC commoditization ($0.04–0.80); TrustScore's defensible pricing unit is the *trust decision / passport network*, not raw lookup — pricing must wait for provider cost + willingness-to-pay evidence (pilot metrics, Batch 15).

## 10. Termii-inspired product packaging (research finding) — actionable

Research (`TERMII_DESIGN_RESEARCH.md`) recommends: five outcome verbs (VERIFY / CHECK / SHARE / PROTECT / RESOLVE) each with proof-chip + outcome headline + one mechanism sentence; problem-first landing section; metrics only where measurable. Current landing is strong but leads with architecture; Batch 13 can adopt the five-verb framing without cloning anything (hard fence list respected).

## 11. Anti-abuse posture (directive §27) — PASS for V1 surface

L2 reporter gate, 3-per-7-day flag quota, one open flag per pair, mandatory evidence, appeal freeze, anti-enumeration (identical UNAVAILABLE on missing consent), rate limits on sensitive endpoints. Collusion/score-farming depth is documented as future work (Trust Network anti-collusion rules).

## 12. Ranked findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| P1 | P1 | B2B trust/check lacks `purpose` | **Fix in Batch 0** |
| P2 | P2 | NINAuth share-code check modality unbuilt | Batch 6 design slot |
| P3 | P2 | Business/RC identity model absent | Batch 2 (model now, integrate later) |
| P4 | P3 | Landing packaging could adopt five-verb framing | Batch 13 (design elevation) |
