# UX AUDIT — Batch 0

**Scope:** landing, auth, dashboard (8 tabs), public Trust Link viewer, empty/loading/error states, motion, accessibility, responsive behavior. Directive §34–§41, §64.

---

## 1. Landing page vs directive §37 structure — PASS, strong

Current: Hero (atmosphere + floating passport card + count-up stats) → product cards → how-it-works (scroll-drawn timeline) → architecture layers → policy explainer (plain ⇄ technical) → security → roadmap → footer. Communicates the product within seconds; the hero card *is* the live-looking passport demonstration.

**Finding UX1 (P3):** research suggests a problem-first section before product ("checked once isn't verified now" honesty framing) and the five-verb packaging (VERIFY/CHECK/SHARE/PROTECT/RESOLVE with proof chips). Batch 13 candidate — no cloning, principles only (see `TERMII_DESIGN_RESEARCH.md` §I fence).

## 2. NINAuth brand compliance (official spec, verified 2026-09-17) — PASS with verification note

Official spec: button white `#FFFFFF` (default) or green `#008643`, label "Continue/Verify with NINAuth" (one word), `aria-label="NIN Auth"` on the logo, ≥44px touch target, and "integration is not endorsement" positioning. Current implementation: white "Continue with NINAuth" primary button with emerald accents, quiet Deny, honestly-labeled mock binding surface. **Batch 0 correction:** add a compliance check to the stage16 matrix asserting the button label + ≥44px target, so drift is caught by CI.

## 3. Verification journey micro-interactions (directive §38) — PASS

Progress → confirmation transitions, count-up score, risk-state transitions, QR creation, share flows, notification arrival — all animated via the shared motion vocabulary; `prefers-reduced-motion` honored product-wide (`MotionConfig reducedMotion="user"` + CSS fallbacks).

## 4. Error UX (directive §40) — PASS

Provider-unavailable, expired, denied, cancelled, invalid-callback, already-linked, timeout, retry-required states exist with human copy; raw provider errors never surface (typed error codes map to safe messages).

## 5. Empty states (directive §41) — PASS

"No TrustScore yet" → onboarding CTA; no-credentials / no-reputation / no-flags / no-history all have purposeful copy in the mandated spirit ("You're verified. Your reputation is just beginning." class).

## 6. Accessibility — PASS (verified by E2E + VLM rounds)

- Semantic landmarks (header/main/footer/nav), aria labels on icon buttons, sr-only text where needed
- WCAG-AA emerald palette (Stage 15 token-level darkening), focus-visible rings
- Keyboard: dialogs/tabs/dropdowns are Radix-based; E2E asserts console-clean interactions

**Finding UX2 (P3):** a formal screen-reader pass (NVDA/VoiceOver scripts) is not automated — Batch 11/13 manual QA item.

## 7. Responsive — PASS

Mobile-first; E2E asserts 390px no-overflow, hamburger nav, visible-CTA targeting; sticky footer via `min-h-screen flex flex-col` + `mt-auto` verified.

## 8. Dense-but-readable dashboards — PASS

8 tabs with TabIntro contracts; long lists use bounded scroll areas (`max-h-*` + custom scrollbars); tables paginate.

## 9. Findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| UX1 | P3 | Five-verb packaging + problem-first section | Batch 13 |
| UX2 | P3 | Screen-reader manual pass | Batch 11/13 QA |
| UX3 | P3 | Brand-compliance CI assertion (44px/label) | **Fix in Batch 0** (test) |
