// TrustScore Batch 1 — Externalized capability→scope mapping (G5 / PROVIDER_AUDIT PV2).
//
// Directive §11: the capability→production-scope mapping must be CONFIG, not
// code. Until the NINAuth partner contract publishes a scope vocabulary, every
// scope string in this platform is mock-contract-only (NINAUTH_CONTRACT_MATRIX
// row "scopes": UNCONFIRMED — zero scope names published in any official
// source). This file is the single place where that mapping lives:
//
//   TrustScore capability (canonical, stable)
//     → consent UX copy (label + description)
//     → attribute keys (the profile claims it may unlock)
//     → MOCK scope string (what MOCK/LOOPBACK postures use today)
//     → LIVE scope string (null = UNCONFIRMED until the partner publishes)
//     → official pii-fields paths (the documented `dataRequested[]` catalog —
//        what a LIVE enterprise-verification call would request instead)
//
// The LIVE posture gate (provider-posture.ts) refuses to flip until every
// capability carries a non-null liveScope — the mapping is ENFORCED, not
// aspirational. When partner credentials arrive, filling in the liveScope
// column + confirming the piiFieldPaths is the entire scope-side change; no
// runtime logic changes.
//
// Sources (fetched 2026-09-17, docs/research/NINAUTH_RESEARCH.md §5.1/§5.2):
//   - "No scope strings/names are published anywhere in the fetched sources."
//   - pii-fields catalog: GET /api/v1/integration/enterprise/pii-fields —
//     50+ paths incl. `biographicData.firstName`, `contactData.phone1`, …
//     (and `nin` — which TrustScore NEVER requests; the scope-guard tripwire
//     stays mandatory for exactly that reason).

export const SCOPE_MAPPING_CONFIG_VERSION = "scope-mapping-2026.09-batch1";

export type ProviderPostureKind = "MOCK" | "LOOPBACK" | "LIVE";

export interface CapabilityDefinition {
  /** Canonical, stable TrustScore capability key (never renegotiated). */
  capability: string;
  /** Consent-screen label shown to the user. */
  label: string;
  /** Consent-screen description shown to the user. */
  description: string;
  /** Core capabilities are always required for verification. */
  core?: boolean;
  /** Profile claim keys this capability may unlock (scope-guard whitelist). */
  attributeKeys: string[];
  /** Scope string used in MOCK and LOOPBACK postures (our mock contract). */
  mockScope: string;
  /**
   * Scope string the LIVE partner actually uses. null = UNCONFIRMED — no
   * official scope name is published. The LIVE posture gate refuses to
   * activate while ANY capability here is null.
   */
  liveScope: string | null;
  /**
   * Official `dataRequested[]` pii-fields paths a LIVE enterprise-verification
   * call would carry for this capability (documented catalog paths). The
   * paths are DOCUMENTED; the capability→path grouping is TrustScore's.
   */
  piiFieldPaths: string[];
}

// ---------------------------------------------------------------------------
// The mapping (single source of truth — ninauth.ts derives its catalogs here)
// ---------------------------------------------------------------------------

export const CAPABILITIES: CapabilityDefinition[] = [
  {
    capability: "identity.basic",
    label: "Basic identity",
    description: "Verification status and masked identity reference only",
    core: true,
    attributeKeys: [],
    mockScope: "identity.basic",
    liveScope: null, // UNCONFIRMED — no official scope name published
    piiFieldPaths: [], // status-only; no pii-fields request needed
  },
  {
    capability: "identity.nin_status",
    label: "NIN verification status",
    description: "Whether your government identity record is verified — never the NIN itself",
    core: true,
    attributeKeys: [],
    mockScope: "identity.nin_status",
    liveScope: null, // UNCONFIRMED
    piiFieldPaths: [], // status-only; never `nin` (raw-identifier tripwire is permanent)
  },
  {
    capability: "profile.name",
    label: "Name details",
    description: "Given name and family name as held on your NIN record",
    attributeKeys: ["given_name", "family_name"],
    mockScope: "profile.name",
    liveScope: null, // UNCONFIRMED
    piiFieldPaths: ["biographicData.firstName", "biographicData.lastName"],
  },
  {
    capability: "profile.demographics",
    label: "Demographics",
    description: "Birth year and state of origin as held on your NIN record",
    attributeKeys: ["birth_year", "state_of_origin"],
    mockScope: "profile.demographics",
    liveScope: null, // UNCONFIRMED
    piiFieldPaths: ["biographicData.dateOfBirth", "biographicData.origin.state"],
  },
  {
    capability: "identity.phone_status",
    label: "Phone binding status",
    description: "Whether a phone number is bound to the identity (Stage 4)",
    attributeKeys: [],
    mockScope: "identity.phone_status",
    liveScope: null, // UNCONFIRMED
    piiFieldPaths: ["contactData.phone1"],
  },
];

// ---------------------------------------------------------------------------
// Derived catalogs (what ninauth.ts re-exports — identical runtime behavior)
// ---------------------------------------------------------------------------

/** Scope-string catalog for the given posture (MOCK/LOOPBACK → mockScope). */
export function scopeCatalogForPosture(posture: ProviderPostureKind): Record<
  string,
  { label: string; description: string; core?: boolean; attributeKeys?: string[]; capability: string }
> {
  const useLive = posture === "LIVE";
  const catalog: Record<
    string,
    { label: string; description: string; core?: boolean; attributeKeys?: string[]; capability: string }
  > = {};
  for (const c of CAPABILITIES) {
    const scope = useLive ? c.liveScope : c.mockScope;
    if (!scope) continue; // LIVE with an UNCONFIRMED scope — unreachable while the gate holds
    catalog[scope] = {
      label: c.label,
      description: c.description,
      core: c.core,
      attributeKeys: c.attributeKeys.length ? c.attributeKeys : undefined,
      capability: c.capability,
    };
  }
  return catalog;
}

export const CORE_CAPABILITIES = CAPABILITIES.filter((c) => c.core).map((c) => c.capability);
export const OPTIONAL_CAPABILITIES = CAPABILITIES.filter(
  (c) => !c.core && c.attributeKeys.length > 0
).map((c) => c.capability);

/** Capabilities still missing a confirmed LIVE scope string. */
export function liveScopeGaps(): CapabilityDefinition[] {
  return CAPABILITIES.filter((c) => c.liveScope === null);
}

/**
 * LIVE gate helper — throws when the scope mapping is incomplete. Wired into
 * setProviderPosture("live"): the platform refuses to flip until every
 * capability's liveScope is filled in from the partner contract.
 */
export function assertLiveScopeConfigComplete(): void {
  const gaps = liveScopeGaps();
  if (gaps.length > 0) {
    throw new Error(
      `NINAuth LIVE scope mapping incomplete: ${gaps
        .map((c) => c.capability)
        .join(", ")} have no confirmed partner scope string (zero scope names are published officially — fill the liveScope column of scope-mapping.config.ts from the partner contract first).`
    );
  }
}

/** Reverse lookup: which capability does a granted scope string belong to. */
export function capabilityForScope(scope: string, posture: ProviderPostureKind): string | null {
  const useLive = posture === "LIVE";
  for (const c of CAPABILITIES) {
    const s = useLive ? c.liveScope : c.mockScope;
    if (s === scope) return c.capability;
  }
  return null;
}
