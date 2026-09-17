// TrustScore Batch 1 — Purpose↔requestReason adapter mapping stub (G18 / PRIVACY_AUDIT PR1).
//
// Directive §15/§16 + the NINAuth Postman collection: every NINAuth
// enterprise verification call carries a `requestReason` drawn from a FIXED
// catalog served by GET /api/v1/integration/enterprise/request-reasons —
// "39 keys". The collection description enumerates them in abbreviated brace
// notation; 37 expand unambiguously from the documented text. The remaining 2
// are UNCONFIRMED until the live catalog endpoint is reachable — recorded
// honestly below, never invented.
//
// TrustScore's own Trust Decision API carries an optional `purpose` (Batch 0,
// G2 — marketplace_transaction | employment | … ). When TrustScore itself
// redeems a NINAuth enterprise verification (Batch 6's share-code / dynamic-QR
// modality), it must translate its purpose into the partner's requestReason.
// This module is that adapter as a STUB:
//
//   - every mapping row carries a rationale + a `confirmed: false` flag,
//   - resolveRequestReason() fails closed on unknown purposes,
//   - assertRequestReasonInCatalog() validates a mapped key against the
//     DOCUMENTED catalog (and, in LIVE, against the served catalog),
//   - the LIVE posture readiness report surfaces the unconfirmed count.
//
// Nothing here is used by MOCK/LOOPBACK flows today — by design. It exists so
// the LIVE flip has the adapter ready, with every assumption labeled.

import type { CheckPurpose } from "@/lib/services/trustdecision-service";

// ---------------------------------------------------------------------------
// The documented request-reason catalog (37 of the officially counted 39)
// ---------------------------------------------------------------------------

export const REQUEST_REASON_CATALOG_VERSION = "request-reasons-2026.09-batch1";

/** Officially documented count (Postman collection: "39 keys"). */
export const REQUEST_REASON_OFFICIAL_COUNT = 39;

/**
 * The 37 keys that expand unambiguously from the documented collection text
 * (docs/research/NINAUTH_RESEARCH.md §5.3). Group labels are ours; the keys
 * are verbatim from the source.
 */
export const REQUEST_REASON_CATALOG: ReadonlyArray<{
  key: string;
  group: string;
}> = [
  // Taxation family
  { key: "taxationEnrollment", group: "taxation" },
  { key: "taxationAssessment", group: "taxation" },
  { key: "taxationEnforcement", group: "taxation" },
  // Education family
  { key: "educationExam", group: "education" },
  { key: "educationAdmission", group: "education" },
  { key: "educationPromotion", group: "education" },
  // Employment family
  { key: "employmentRecruitment", group: "employment" },
  { key: "employmentEnrollment", group: "employment" },
  { key: "employmentDismissal", group: "employment" },
  // Corporate affairs family
  { key: "corporateAffairsDirector", group: "corporateAffairs" },
  { key: "corporateAffairsShareholder", group: "corporateAffairs" },
  { key: "corporateAffairsTrustee", group: "corporateAffairs" },
  // Transport modes
  { key: "aviationTransport", group: "transport" },
  { key: "roadTransport", group: "transport" },
  { key: "maritimeTransport", group: "transport" },
  { key: "railwayTransport", group: "transport" },
  // Financial / screening
  { key: "creditBackgroundCheck", group: "screening" },
  { key: "financialProducts", group: "financial" },
  { key: "insurance", group: "financial" },
  { key: "pensionEnrollment", group: "financial" },
  // Government / security
  { key: "defence", group: "government" },
  { key: "leaCheck", group: "government" },
  { key: "efccCheck", group: "government" },
  { key: "nyscCheck", group: "government" },
  { key: "passportImmigration", group: "government" },
  { key: "blacklistPolitical", group: "government" },
  { key: "blacklistSocial", group: "government" },
  { key: "crimePrisonIncarceration", group: "government" },
  { key: "legalCourts", group: "government" },
  { key: "clearanceForPoliticalOffice", group: "government" },
  // Access
  { key: "physicalAccess", group: "access" },
  { key: "logicalVirtualAccess", group: "access" },
  // Telecommunication
  { key: "telecommunicationSimReg", group: "telecommunication" },
  { key: "telecommunicationIotReg", group: "telecommunication" },
  // Other
  { key: "medical", group: "other" },
  { key: "entertainment", group: "other" },
  { key: "socioCulturalEnrollment", group: "other" },
] as const;

const CATALOG_KEYS = new Set(REQUEST_REASON_CATALOG.map((r) => r.key));

/**
 * 39 documented − 37 enumerated = 2 keys the collection text abbreviates
 * without expanding. NEVER guessed — resolved against the served catalog at
 * LIVE time.
 */
export const REQUEST_REASON_UNCONFIRMED_COUNT =
  REQUEST_REASON_OFFICIAL_COUNT - REQUEST_REASON_CATALOG.length;

// ---------------------------------------------------------------------------
// Purpose → requestReason adapter (stub — every row unconfirmed until LIVE)
// ---------------------------------------------------------------------------

export interface PurposeRequestReasonMapping {
  purpose: CheckPurpose;
  /** Documented catalog key this purpose maps to for NINAuth calls. */
  requestReason: string;
  /** Why this key was chosen (recorded for the partner-contract review). */
  rationale: string;
  /** false until validated against the live-served catalog. */
  confirmed: boolean;
}

export const PURPOSE_TO_REQUEST_REASON: ReadonlyArray<PurposeRequestReasonMapping> = [
  {
    purpose: "marketplace_transaction",
    requestReason: "creditBackgroundCheck",
    rationale:
      "Counterparty screening before a transaction — closest documented background-check reason; no marketplace key exists in the catalog.",
    confirmed: false,
  },
  {
    purpose: "employment",
    requestReason: "employmentRecruitment",
    rationale: "Direct match — the catalog's pre-hire screening reason.",
    confirmed: false,
  },
  {
    purpose: "rental",
    requestReason: "creditBackgroundCheck",
    rationale:
      "Tenant screening is a background check; no housing key exists in the documented catalog.",
    confirmed: false,
  },
  {
    purpose: "professional_engagement",
    requestReason: "employmentRecruitment",
    rationale:
      "Engaging a professional mirrors recruitment screening in the catalog's vocabulary.",
    confirmed: false,
  },
  {
    purpose: "high_value_transaction",
    requestReason: "financialProducts",
    rationale:
      "High-value transaction due diligence sits in the financial family; the closest documented key.",
    confirmed: false,
  },
  {
    purpose: "b2b_onboarding",
    requestReason: "corporateAffairsDirector",
    rationale:
      "Business onboarding verifies the counterparty's principals — the corporate-affairs family is the documented fit.",
    confirmed: false,
  },
  {
    purpose: "general_screening",
    requestReason: "creditBackgroundCheck",
    rationale:
      "The generic background-check reason; used when the caller supplies no purpose.",
    confirmed: false,
  },
] as const;

const PURPOSE_MAP = new Map(PURPOSE_TO_REQUEST_REASON.map((m) => [m.purpose, m]));

/**
 * Resolve a Trust Decision purpose to the NINAuth requestReason for a LIVE
 * enterprise-verification call. Fails CLOSED on unknown purposes — an
 * unmapped purpose must never fall through to a default reason.
 */
export function resolveRequestReason(
  purpose: CheckPurpose
): { requestReason: string; confirmed: boolean; rationale: string } {
  const mapping = PURPOSE_MAP.get(purpose);
  if (!mapping) {
    throw new Error(
      `No requestReason mapping for purpose '${purpose}' — add it to request-reasons.config.ts before enabling this purpose in LIVE.`
    );
  }
  return {
    requestReason: mapping.requestReason,
    confirmed: mapping.confirmed,
    rationale: mapping.rationale,
  };
}

/** Validate a requestReason key against the DOCUMENTED catalog. */
export function assertRequestReasonInCatalog(key: string): void {
  if (!CATALOG_KEYS.has(key)) {
    throw new Error(
      `requestReason '${key}' is not in the documented NINAuth catalog (37 enumerated keys; ${REQUEST_REASON_UNCONFIRMED_COUNT} remain UNCONFIRMED until the live endpoint is reachable).`
    );
  }
}

/** Readiness summary for the LIVE gate + admin console surface. */
export function requestReasonReadiness(): {
  catalogVersion: string;
  enumerated: number;
  officialCount: number;
  unconfirmed: number;
  purposesMapped: number;
  purposeOptions: number;
  allPurposesMapped: boolean;
  mappingsConfirmed: number;
} {
  return {
    catalogVersion: REQUEST_REASON_CATALOG_VERSION,
    enumerated: REQUEST_REASON_CATALOG.length,
    officialCount: REQUEST_REASON_OFFICIAL_COUNT,
    unconfirmed: REQUEST_REASON_UNCONFIRMED_COUNT,
    purposesMapped: PURPOSE_TO_REQUEST_REASON.length,
    purposeOptions: PURPOSE_MAP.size,
    allPurposesMapped: PURPOSE_TO_REQUEST_REASON.every((m) => CATALOG_KEYS.has(m.requestReason)),
    mappingsConfirmed: PURPOSE_TO_REQUEST_REASON.filter((m) => m.confirmed).length,
  };
}
