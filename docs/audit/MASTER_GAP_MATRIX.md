# MASTER_GAP_MATRIX — Batch 0 Consolidated Gaps

**Legend:** P0 = blocks pilot · P1 = must fix before next batch gate · P2 = scheduled batch work · P3 = backlog/QA. **Status:** OPEN (fix this batch) / SCHEDULED (batch assigned) / BLOCKED (external dependency) / ACCEPTED (documented risk).

| # | Directive § | Gap | Severity | Status | Owner batch | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | §42/§43 | No CSP/security headers in `next.config.ts` | P1 | **CLOSED (Batch 0)** | 0 | SECURITY_AUDIT S1 |
| G2 | §22 | `/v1/trust/check` lacks `purpose` (transaction-specific trust); receipts not purpose-labeled | P1 | **CLOSED (Batch 0)** | 0 | PRODUCT_AUDIT P1, API_AUDIT AP1, DATABASE_AUDIT DB3 |
| G3 | §37/UX | NINAuth brand-compliance CI assertion (label + ≥44px target) missing | P1 | **CLOSED (Batch 0)** (test) | 0 | UX_AUDIT UX3 |
| G4 | §8/§43 | LIVE NINAuth contract unknowns (20 UNCONFIRMED rows: base URL, token auth, scopes, errors, webhooks, nonce semantics) | P2 | **BLOCKED** on partner credentials — checklist now machine-readable + operator-visible (live-readiness.config.ts → admin console, Batch 1) | 1 (checklist ready) | NINAUTH_CONTRACT_MATRIX |
| G5 | §11 | Capability→production-scope mapping not externalized as config | P2 | **CLOSED (Batch 1)** — scope-mapping.config.ts; LIVE gate refuses while any liveScope is null | 1 | PROVIDER_AUDIT PV2 |
| G6 | §2.2/§6 | Tripwire depth-bound regression test for new claim shapes | P3 | **CLOSED (Batch 1)** — tests/batch1_tripwire.ts (36 checks); CAUGHT + FIXED a real tripwire bug (normalized-key set mismatch: `nimc_nin`/`voters_number` unblocked) | 1 | ARCHITECTURE_AUDIT A2 |
| G7 | §13 | Trust Identity duplicate-handling + account-recovery depth (link-identity-to-existing-account flows) | P2 | SCHEDULED | 2 | CURRENT_STATE §4 |
| G8 | §53 | Business/RC-number identity model absent | P2 | SCHEDULED | 2 | DATABASE_AUDIT DB1 (UNCONFIRMED provider flow — model only) |
| G9 | §12 | "Check by NINAuth share code / dynamic QR" modality (official enterprise redemption flows) | P2 | SCHEDULED (design now, integrate on LIVE) | 6 | PRODUCT_AUDIT P2 |
| G10 | §30/§31 | Mobile client (Expo/RN) — no official SDK guidance, no sandbox runtime | P2 | **BLOCKED** (strategy documented) | 4 gated | MOBILE_AUDIT M1/M2, ADR_WEB_MOBILE |
| G11 | §34A | Landing: five-verb packaging + problem-first section (Termii-inspired, no cloning) | P3 | SCHEDULED | 13 | UX_AUDIT UX1, TERMII_DESIGN_RESEARCH |
| G12 | §42 | sameSite=strict evaluation; privilege-change session rotation; dependency-audit automation; SR manual pass | P3 | SCHEDULED | 11 | SECURITY_AUDIT S2/S4/S5, UX_AUDIT UX2 |
| G13 | §44 | SQLite→PostgreSQL migration | P3 | ACCEPTED-DEFER (evidence triggers documented) | 12 | DATABASE_AUDIT §5 |
| G14 | §45/§12 | Multi-instance prerequisites: Redis rate limits, queue, workers, backup/restore, CD/rollback | P3 | SCHEDULED | 12 | ARCHITECTURE_AUDIT A5, TARGET_ARCHITECTURE |
| G15 | §33 | OpenAPI spec for B2B; API-reference drift guard | P3 | SCHEDULED | 9 | API_AUDIT AP2/AP3 |
| G16 | §49 | Pricing | P3 | ACCEPTED-NOT-BUILT (no evidence basis yet) | 15+ | PRODUCT_AUDIT §9 |
| G17 | §52 | Trust Network anti-collusion depth + reporter-reliability weighting | P3 | SCHEDULED | 10 | CURRENT_STATE §3 |
| G18 | §15/§16 | Purpose↔requestReason adapter mapping (39-key catalog) for LIVE | P2 | **STUB READY (Batch 1)** — request-reasons.config.ts (37/39 enumerated, 2 honestly unconfirmed; 7/7 purposes mapped, fail-closed); confirmation still BLOCKED on partner | 1 | PRIVACY_AUDIT PR1 |
| G19 | §56 | Mobile E2E suite | P3 | BLOCKED with G10 | 4 | MOBILE_AUDIT §5 |
| G20 | §26 | Reputation 2.0 depth (reporter reliability scoring, collusion graphs) | P3 | SCHEDULED | 7 | PRODUCT_AUDIT §11 |

## Batch-0 gate decision

With G1–G3 closed by the corrections in this batch (security headers, purpose-aware trust checks, brand-compliance test) and G4/G10/G18 honestly BLOCKED on the NINAuth partner contract, **no P0/P1 remains open after this batch** → Batch 0 PASSES its gate. The roadmap (`docs/roadmap/MASTER_ROADMAP.md`) sequences the remaining batches with the directive's controlled-loop protocol.

## Batch-1 gate decision

Deliverables: G5 CLOSED (scope mapping externalized + LIVE-gate enforced), G6 CLOSED (tripwire depth-bound regression — 36 checks; caught and fixed a real normalization bug where `nimc_nin`/`voters_number` payloads bypassed the tripwire), G18 STUB READY (37/39 catalog keys enumerated + 7/7 purpose mappings, fail-closed; confirmation BLOCKED on partner), AP2 drift guard shipped (`GET /api/v1/engine/admin/policies` drift found and fixed; 405-guard-stub exclusion rule documented). G4's checklist is now machine-readable and operator-visible in the admin console. Regression: tsc 0 errors, ESLint clean, stage2 36/36, stage9 102/102, stage16 38/38, batch0 29/29, batch1 28/28, tripwire 36/36, qa_regression PASS, browser E2E verified. **Batch 1 PASSES its gate** — no P0/P1 open; remaining items BLOCKED on the partner contract are honestly labeled.
