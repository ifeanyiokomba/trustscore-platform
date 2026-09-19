# MASTER_ROADMAP — Batch Sequencing (post Batch-0)

**Protocol (directive §57–§60):** each batch = research → inspect → plan → implement → test → E2E → security audit → privacy audit → product/UX audit → regression audit → fix → re-test → record → **gate**. A failed batch stops the line. Regression baseline: `bun install && bun run lint && bunx tsc --noEmit` + relevant matrices before/after.

**Status legend:** ✅ done in prior stages · 🔄 this round · ⬜ queued · ⛔ blocked on NINAuth partner contract

---

## Batch 0 — Deep Audit + Research — ✅ DONE (gate: PASS)
Audits (11 docs), research (5 docs incl. contract matrix), architecture (4 docs), this roadmap. Corrections: security headers + CSP (G1), purpose-aware Trust Decision API (G2), brand-compliance CI test (G3). Gate: no P0/P1 open after corrections; full regression green.

## Batch 1 — NINAuth Production Alignment — ✅ **DONE (gate: PASS)**
- ✅ Externalize capability→scope mapping as config (G5/PV2) — `scope-mapping.config.ts`; SCOPE_CATALOG now DERIVED from it; the LIVE posture gate refuses to flip while any `liveScope` is null (`LIVE_SCOPE_MAPPING_UNCONFIRMED`, 422)
- ✅ Tripwire depth-bound regression test (G6/A2) — `tests/batch1_tripwire.ts` (36 checks); **caught + fixed a real bug**: the raw-identifier set stored un-normalized keys, so `nimc_nin`/`voters_number` payloads bypassed the tripwire
- ✅ Purpose↔requestReason adapter mapping stub (G18) — `request-reasons.config.ts`: 37/39 documented keys enumerated (2 honestly unconfirmed), 7/7 purposes mapped with rationale, fail-closed resolver
- ✅ API catalog drift test (AP2) — `tests/batch1_matrix.py` §1 walks disk routes vs the `/api` index both directions (405-guard-stub exclusion rule documented); **found + fixed live drift** (`GET /api/v1/engine/admin/policies` undocumented)
- ✅ G4 LIVE-readiness checklist machine-readable + operator-visible: `live-readiness.config.ts` → `ninauthAlignment` on the admin provider console (collapsible section: scope gaps, request-reason readiness, 16 contract-matrix items)
- Everything else waits on partner credentials; the 20 UNCONFIRMED matrix rows remain the LIVE-readiness checklist (G4) — now surfaced in the admin console

## Batch 2 — Trust Identity Hardening — ✅ **DONE (gate: PASS)**
- ✅ Duplicate-identity handling depth + account recovery flows (G7) — fail-closed IDENTITY_TAKEN guard at the verification callback (same NINAuth subject already VERIFIED on another account → session FAILED, holder notified, claimant routed to recovery; revoked claims release the subject; no holder disclosure)
- ✅ Business/RC model (G8 — schema + UI slot, no provider claims) — BusinessAccount (peppered rcFingerprint + masked hint, raw RC never stored), owner CRUD, honest UNVERIFIED-only labels; no-trust-signal invariant matrix-enforced
- ✅ DSR erasure-cascade invariant test (PR2) — DMMF-driven zero-rows scan over EVERY UserAccount relation + cascade-coverage assertion + surgical-cascade negative control (ada)
- ✅ Bonus: live API-catalog drift fixed (19 undocumented routes — the AUTH batch never registered in the /api index; batch1's drift guard now closes at 107 entries)

## Batch 3 — Web Identity Experience polish — ✅ **DONE (gate: PASS)**
- ✅ Continue-with-NINAuth journey refinements (error states, retry, session expiry UX) — expiry + terminal-error are recovery forks now, not dead ends: amber banners with in-modal "Start a new session"/"Start again" (verification + login journeys, mirroring the Google-modal pattern), error classification (terminal → restart CTA + decisions disabled; retryable → decisions stay live), card-level "Try again" affordance, timeline failure reasons surfaced (event `detail.reason` → friendly labels, failure events only)
- ✅ Consent screen granularity review vs official field-level model — decision documented (`docs/research/CONSENT_GRANULARITY_REVIEW.md`): keep capability-level bundles (small, individually opt-in, LIVE-gated), disclose the underlying official `piiFieldPaths` on-screen ("NINAuth fields: biographicData.firstName, …") via `ConsentField.fieldPaths` — payload + both consent screens
- ✅ Gate evidence: full regression 349/349 (stage2 36, stage9 102, batch0 29, auth 95, batch1 28, batch2 59), tsc 0, eslint clean, browser E2E of every new path (field-path render, TTL-lapse banner + restart, NOT_PENDING terminal error + restart, NINAuth login expiry + restart + passwordless sign-in, timeline reason), 390px no overflow, zero page errors; screenshots docs/screenshots/batch3-*.png

## Batch 4 — Mobile Application — ⛔ gated (ADR-002)
Open when official mobile guidance exists OR pilot-stable web + pinned callbacks. Scope per directive §31.

## Batch 5 — Trust Passport 2.0 — ✅ **DONE (gate: PASS)**
- ✅ Receipts richness — `/passport/me` receipts now carry `shareTokenId` + linked-token `linkStatus`/`linkScopes` (ShareToken join by id; null when the token row is gone), `shown.confidence`, and a `receiptsStats` block (total retained + per-channel counts, pruned to 50 / read window 20); receipts-card renders all 20 with channel badges (TRUST_LINK / SAFETY_CHECK / API_CHECK, icons + colors, `receipt-channel-*`), date-grouped scrollable list (house scrollbar), header totals, and link-provenance chips (live scopes vs "dead link (revoked)") — `receipt-token-chip`
- ✅ Share-link analytics — NEW `GET /api/v1/passport/share/:id/analytics` (session auth, rate-limited, owner-scoped anti-enumeration 404 like revoke; registered in the `/api` index): opens/views-left/unique-viewers (COUNT DISTINCT receipt ipHash — hash VALUES never leave)/opens-by-channel/recent-opens[20]/first-open-latency; `SHARE_ANALYTICS_VIEWED` audit (tokenId-only metadata, allowlisted); TokenRow BarChart3 button → "Link analytics" Dialog (stat tiles, channel mini-bars, timeline, `share-analytics-*`)
- ✅ Freshness nudges — on the `/passport/me` read path, ACTIVE credentials expiring within 14d (or past) and the government-identity 90-day horizon within 14d each emit a VERIFICATION notification ("Credential expiring soon"/"Credential expired"/"Government identity expiring soon", label-only bodies), deduped per (user, title) for 7 days; credentials-card 3-state badge (green active · Nd / amber expiring soon · Nd / destructive expired + "active · no expiry" for horizon-less rows); verification-history evidence `expiresAt` chip ("valid until …"/"expired … ago") — no schema changes, no raw values
- ✅ EMAIL_VERIFIED credential expansion — derived from the AUTH-batch identifier registry (a VERIFIED EMAIL AuthIdentifier), NOT trust-identity evidence; `emailHint` masked only; scored by the existing dynamic 6×-cap-20 component (stage5's contract math is response-derived — stays green; fresh registrations keep unverified emails so stage12/8 exact-score assertions are untouched; issuer "TrustScore Platform", Mail icon, revoke sticks, no resurrection)
- ✅ Gate evidence: `tests/batch5_matrix.py` 41/41 (receipts linkage + channel + confidence + receiptsStats vs direct sqlite; analytics shape + uniqueViewers == COUNT(DISTINCT ipHash) + PII guard + 401/404/anti-enumeration + audit metadata; nudge fire/dedupe via backdated horizons; email credential derive/revoke/no-resurrection/absent-for-unverified); stage5 101/101, stage15 12/12, stage16 matrices green after the catalog bump; tsc 0 errors, eslint clean; version catalog v1.16.0 (health + /api index Stage 17, nav/footer/dashboard/hero badges, qa_regression.sh, package.json)

## Batch 6 — Safety Check 2.0 — ⬜ (design slot now, redemption ⛔)
- G9: "Check by NINAuth share code / dynamic QR" modality — consent model + UX designed against the official Postman contract; redemption blocked on LIVE.

## Batch 7 — Reputation + Resolution 2.0 — ⬜
- G20: reporter reliability, collusion resistance depth, reviewer SLA surfaces.

## Batch 8 — Trust Engine 2.0 — ⬜
- Context-weighted policy variants groundwork (extends G2 purpose-awareness), confidence calibration, freshness policy externalization.

## Batch 9 — B2B Platform 2.0 — ⬜
- OpenAPI spec generation (AP3), sandbox self-service, webhook event catalog docs, billing *plumbing only* (no pricing).

## Batch 10 — Trust Network — ⬜
- G17: verified-interaction depth, anti-collusion scoring, opt-in reciprocity controls.

## Batch 11 — Security Hardening — ⬜
- sameSite=strict eval (S2), privilege-change rotation (S5), dependency audit automation (S4), screen-reader pass (UX2), enumeration re-audit, penetration-style review.

## Batch 12 — Production Infrastructure — ⬜ (evidence-triggered)
- PostgreSQL migration when DATABASE_AUDIT §5 triggers fire (G13); Redis rate limits (S3/G14); queue/workers; backup/restore drills; CD + rollback; observability dashboards; retention-schedule policy doc (PR3).

## Batch 13 — Design Elevation — ⬜
- G11 five-verb packaging + problem-first landing section (Termii-inspired, fence respected); deep-surface display voice; PWA manifest (M3); motion polish.

## Batch 14 — End-to-End Re-Audit — ⬜
Full-system audit vs this Batch-0 baseline + all batch records.

## Batch 15 — Pilot Readiness — ⬜
Metric instrumentation (§9 of product research), pilot cohort selection, runbook, honest LIVE-gate posture.

---

## Standing rules (carried from stages 0–16)

1. After any platform automated commit: `bunx tsc --noEmit` + one matrix (half-landed features have occurred).
2. Mini-services restart after machine reboots (`bash mini-services/*/start.sh`, idempotent).
3. Remote/local git histories unrelated by design — push new commits on top of remote head; never re-orphan.
4. Matrix ordering rules (stage8 policy restore, stage7 runtime >300s, quiet entry for stage2).
5. Turbopack OOM discipline: restart + test in ONE bash call.
6. Never carry a known defect forward to meet a schedule (directive §58).
