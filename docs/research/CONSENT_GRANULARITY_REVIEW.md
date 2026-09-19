# Consent-Screen Granularity Review — Batch 3

**Date:** 2026-09-19
**Scope:** roadmap Batch 3 item — "Consent screen granularity review vs official field-level model"
**Reviewed against:** `docs/research/NINAUTH_RESEARCH.md` §5.1/§5.2 (official enterprise `dataRequested[]` / `pii-fields` contract, fetched 2026-09-17) and `docs/research/NINAUTH_CONTRACT_MATRIX.md` (scope vocabulary: UNCONFIRMED — zero scope names published officially)

## The question

NINAuth's official enterprise contract is **field-level**: a requester names exact
paths from a 50+ entry `pii-fields` catalog (`biographicData.firstName`,
`contactData.phone1`, …) in a `dataRequested[]` array, and the response returns
only those fields. TrustScore's consent screen shows **capability-level** bundles
(`identity.basic`, `identity.nin_status`, `profile.name`, `profile.demographics`)
defined in `src/lib/providers/scope-mapping.config.ts`. Is our coarser granularity
a gap to close, or a decision to keep?

## Findings

1. **The official scope vocabulary doesn't exist yet.** No scope names are
   published in any official source (contract-matrix row "scopes": UNCONFIRMED).
   The only documented request vocabulary IS the field-level `dataRequested[]`.
   Our `liveScope` column is therefore `null` for every capability, and the LIVE
   posture gate (`assertLiveScopeConfigComplete`) refuses to activate until the
   partner publishes the real vocabulary — the granularity question cannot be
   "closed" against a contract that isn't public yet.

2. **Field-level consent UX at 50+ paths would be unusable and over-permissive.**
   The catalog includes `biometricData.image`, next-of-kin fields (×10),
   religion, marital status, physical status. Rendering that as a consent
   checklist would train users to skim-and-approve; TrustScore requests 4
   capabilities, none of which touches the sensitive tail of the catalog.

3. **Our bundles are small, individually opt-in, and fully disclosed.** The two
   optional capabilities bundle at most two fields each
   (`profile.name` → firstName + lastName; `profile.demographics` → dateOfBirth +
   origin.state), each with a separate opt-in checkbox defaulting OFF. Core
   capabilities are status-only — zero pii-fields paths, zero attributes.

4. **The bundling is already machine-auditable.** Every capability carries its
   `piiFieldPaths` (the documented catalog paths it would map to in a LIVE
   `dataRequested[]` call) in the single-source config, and the scope-guard
   tripwire blocks raw identifiers (`nin`, `bvn`, …) regardless of what any
   provider sends.

## Decision

**Keep capability-level granularity; make the field-level mapping visible.**

- The consent granularity the USER needs is "which capability bundles do I
  opt into" — that is what the checkboxes deliver, one per optional bundle.
- The granularity an AUDITOR needs is "which official fields underlie each
  bundle" — that is now disclosed on the consent screen itself: each field
  card renders the underlying `piiFieldPaths` (e.g. "NINAuth fields:
  biographicData.firstName, biographicData.lastName") from the same config.
  The payload change: `ConsentField.fieldPaths` (optional, absent for
  status-only capabilities).
- When the partner publishes the real scope/field vocabulary, the change is
  confined to the `liveScope` + `piiFieldPaths` columns of
  `scope-mapping.config.ts` (the LIVE gate enforces completeness). If the
  partner's own consent UX turns out to be strictly per-field, the same
  config can be flattened to one capability per field with zero runtime
  logic changes.

## What shipped with this review

| Change | File |
|---|---|
| `piiFieldPaths` surfaced through the scope catalog | `src/lib/providers/ninauth.ts` (SCOPE_CATALOG) |
| `fieldPaths` on consent-screen fields (payload) | `ninauth.ts` `consentScreenFor`, `src/lib/types.ts` `ConsentField` |
| Field-path disclosure rendered on both consent screens | `consent-modal.tsx`, `ninauth-modal.tsx` |

Journey error-state/retry/expiry work (the other Batch 3 item) is recorded in
the worklog under `batch3-A`.
