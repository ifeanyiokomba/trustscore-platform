// TrustScore Batch 1 — NINAuth LIVE-readiness checklist (G4).
//
// The 33-row NINAUTH_CONTRACT_MATRIX (docs/research/) reconciles every
// official NINAuth capability against our MOCK implementation. This module
// encodes the actionable half — every UNCONFIRMED row and every PARTIAL row's
// missing piece — as a machine-readable checklist, aggregated with the
// scope-mapping and request-reason gaps into one readiness report surfaced in
// the admin provider console.
//
// Rules (non-negotiable):
//   - Nothing in this file is guessed; each item cites its matrix row.
//   - The LIVE posture gate consults the scope-mapping half (the parts that
//     map to code we own). The rest is the sandbox-verification agenda for
//     when partner credentials arrive — the honest LIVE-gate posture.
//   - Resolving an item happens by EDITING the matrix + this checklist with
//     the confirmed fact and its source; never by deleting the row.

import {
  SCOPE_MAPPING_CONFIG_VERSION,
  CAPABILITIES,
  liveScopeGaps,
} from "@/lib/providers/scope-mapping.config";
import {
  requestReasonReadiness,
} from "@/lib/providers/request-reasons.config";

export const LIVE_READINESS_VERSION = "live-readiness-2026.09-batch1";

// ---------------------------------------------------------------------------
// The checklist (matrix rows → actionable items)
// ---------------------------------------------------------------------------

export interface ReadinessItem {
  id: string;
  area: string;
  /** UNCONFIRMED = absent from all official sources; PARTIAL = described but incomplete. */
  status: "UNCONFIRMED" | "PARTIAL";
  /** The specific missing fact. */
  missing: string;
  /** What TrustScore does today (honest posture). */
  posture: string;
  /** How to resolve it when partner access exists. */
  resolution: string;
}

export const LIVE_READINESS_ITEMS: ReadonlyArray<ReadinessItem> = [
  // --- UNCONFIRMED rows -----------------------------------------------------
  {
    id: "oauth-nonce",
    area: "OAuth",
    status: "UNCONFIRMED",
    missing: "Whether NINAuth issues or honors the OIDC nonce at all.",
    posture:
      "We generate nonce = session.state and validate it inside validateIdToken (OIDC-correct hardening; honestly ours).",
    resolution: "Confirm nonce support in the partner sandbox; if absent, document the deviation and keep ours.",
  },
  {
    id: "refresh-token",
    area: "OAuth",
    status: "UNCONFIRMED",
    missing: "Refresh-token existence, grant shape, rotation, revocation.",
    posture: "Not implemented; sessions are our own cookies.",
    resolution: "Decide refresh policy from the sandbox contract; do not assume one exists.",
  },
  {
    id: "business-signin-rc",
    area: "Identity",
    status: "UNCONFIRMED",
    missing: "Whether any business-identity authentication flow exists (only CAC docs + directors' NINs at enterprise registration are documented).",
    posture: "Business/RC modeled as Batch 2 schema only; no provider claims.",
    resolution: "Confirm with the partner; keep business identity provider-agnostic until then.",
  },
  {
    id: "sdk-web",
    area: "SDKs",
    status: "UNCONFIRMED",
    missing: "Existence of any official web SDK/JS library.",
    posture: "None used; plain OAuth redirect shape in our contract.",
    resolution: "Adopt only if officially published; otherwise keep the redirect contract.",
  },
  {
    id: "sdk-mobile",
    area: "SDKs",
    status: "UNCONFIRMED",
    missing: "Existence of a mobile/Expo/React Native SDK; app-link guidance for native clients.",
    posture: "Web-only integration (ADR-002); mobile gated.",
    resolution: "Un-gate Batch 4 only on official guidance.",
  },
  {
    id: "error-codes",
    area: "Errors",
    status: "UNCONFIRMED",
    missing: "The full LIVE error table — codes, messages, retry semantics.",
    posture: "Our own codes (SCOPE_INVALID, RAW_IDENTIFIER_BLOCKED, state_mismatch, code replay, rate-limit) — clearly ours, never presented as NINAuth's.",
    resolution: "Derive the LIVE error table from the sandbox and map ours onto it.",
  },
  {
    id: "rate-limits",
    area: "Errors",
    status: "UNCONFIRMED",
    missing: "NINAuth's actual rate limits.",
    posture: "Our own limits (start 10/min; approve/callback tighter).",
    resolution: "Read the sandbox headers/docs; align our client-side backoff.",
  },
  // --- PARTIAL rows' missing pieces -----------------------------------------
  {
    id: "oauth-base-url",
    area: "OAuth",
    status: "PARTIAL",
    missing: "The OAuth base URL — /oauth/authorize, /oauth/token, /oauth/userinfo are documented only as RELATIVE paths; no base URL is published anywhere.",
    posture: "MOCK/LOOPBACK endpoints; LIVE refuses to flip without NINAUTH_BASE_URL.",
    resolution: "Obtain the base URL at onboarding; set NINAUTH_BASE_URL.",
  },
  {
    id: "token-auth-shape",
    area: "OAuth",
    status: "PARTIAL",
    missing: "Token-endpoint auth shape (client_secret POST vs Basic) and exact response fields.",
    posture: "Contract-first mock with documented envelope; LIVE shape pending.",
    resolution: "Confirm from the sandbox; adjust the transport call only.",
  },
  {
    id: "id-token-schema",
    area: "Assertion",
    status: "PARTIAL",
    missing: "ID-token schema, signature algorithm, and JWKS mechanism (only assertion CONTENTS are documented).",
    posture: "HMAC-signed mock tokens with full validation discipline (signature/issuer/audience/expiry/nonce).",
    resolution: "Swap validation to the partner's JWKS; keep the validation discipline identical.",
  },
  {
    id: "userinfo-shape",
    area: "Assertion",
    status: "PARTIAL",
    missing: "UserInfo endpoint URL + response schema.",
    posture: "Claims arrive in the ID token; no separate UserInfo call.",
    resolution: "Confirm whether the partner separates them; adapt the transport.",
  },
  {
    id: "scope-vocabulary",
    area: "Scopes",
    status: "PARTIAL",
    missing: "ZERO scope names are published — our identity.*/profile.* strings are mock-contract-only.",
    posture: "Externalized in scope-mapping.config.ts with liveScope=null per capability; the LIVE gate refuses to flip while any is null.",
    resolution: "Fill the liveScope column from the partner contract; re-run the batch1 matrix.",
  },
  {
    id: "crypto-keys-usage",
    area: "Security",
    status: "PARTIAL",
    missing: "How the RSA dashboard keys are applied to verification requests (encrypt which payload, which padding).",
    posture: "Vault stores credentials AES-256-GCM; no RSA request encryption yet.",
    resolution: "Implement request encryption per sandbox samples before LIVE traffic.",
  },
  {
    id: "webhook-events",
    area: "Webhooks",
    status: "PARTIAL",
    missing: "Webhook event names, payloads, and signature scheme (URL support is documented, nothing else).",
    posture: "Our own signed webhook deliveries (ts_ secrets, HMAC) for B2B — never presented as NINAuth's.",
    resolution: "Subscribe to partner events in the sandbox; map their vocabulary.",
  },
  {
    id: "consent-screen-brand",
    area: "Consent",
    status: "PARTIAL",
    missing: "Exact partner-side consent-screen presentation + remaining branding constraints.",
    posture: "Our consent screen follows the documented requester/fields/purpose contract + brand rules (white/green, one-word NINAuth, ≥44px).",
    resolution: "Verify against the live app; adjust copy only where mandated.",
  },
  {
    id: "sso-federation",
    area: "SSO",
    status: "PARTIAL",
    missing: "SSO/session-federation mechanics (only that NINAuth SSOs the dashboard session).",
    posture: "Not relied upon.",
    resolution: "Confirm at onboarding; adopt only if it simplifies the partner dashboard flow.",
  },
] as const;

// ---------------------------------------------------------------------------
// Aggregated report (admin console + LIVE gate context)
// ---------------------------------------------------------------------------

export function liveReadinessReport() {
  const scopeGaps = liveScopeGaps();
  const reasons = requestReasonReadiness();
  const unconfirmed = LIVE_READINESS_ITEMS.filter((i) => i.status === "UNCONFIRMED");
  const partial = LIVE_READINESS_ITEMS.filter((i) => i.status === "PARTIAL");
  return {
    version: LIVE_READINESS_VERSION,
    scopeMapping: {
      configVersion: SCOPE_MAPPING_CONFIG_VERSION,
      totalCapabilities: CAPABILITIES.length,
      liveScopeConfirmed: CAPABILITIES.length - scopeGaps.length,
      missingLiveScopes: scopeGaps.map((c) => c.capability),
    },
    requestReasons: reasons,
    contractItems: {
      total: LIVE_READINESS_ITEMS.length,
      unconfirmed: unconfirmed.length,
      partial: partial.length,
      documented: 33 - unconfirmed.length - partial.length,
    },
    liveGate: {
      // What the LIVE posture flip requires, in order: env flag, base URLs,
      // vault credentials (checked at flip time) + the scope mapping (this
      // batch's addition). The rest of the checklist is the sandbox agenda.
      scopeMappingComplete: scopeGaps.length === 0,
      requestReasonCatalogComplete: reasons.unconfirmed === 0,
    },
    items: LIVE_READINESS_ITEMS,
  };
}
