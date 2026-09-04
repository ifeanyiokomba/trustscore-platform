// TrustScore Stage 1 — shared client-side types (mirrors API contract in /api/v1/*)

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  status: string;
  createdAt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export interface ActivityEvent {
  id: string;
  action: string;
  createdAt: string;
  metadata?: string;
}

export interface HealthStatus {
  status: "ok" | "degraded";
  stage: string;
  version: string;
  db: "up" | "down";
  uptimeSec: number;
  time: string;
}

// ---------------------------------------------------------------------------
// Stage 2–3 — NINAuth identity types (mirror /api/v1/identity/* responses)
// ---------------------------------------------------------------------------

export interface ConsentField {
  scope: string;
  label: string;
  description: string;
  core?: boolean;
}

export interface ConsentScreenInfo {
  requester: string;
  purpose: string;
  fields: ConsentField[];
  policyVersion: string;
  provider: string;
  mode: "MOCK" | "LIVE";
}

// Stage 3 — consent scope metadata (which are core, which optional opt-ins)
export interface ScopeOption {
  scope: string;
  label: string;
  description: string;
  core: boolean;
}

export interface VerificationSessionInfo {
  id: string;
  status:
    | "AWAITING_CONSENT"
    | "CONSENT_GRANTED"
    | "CONSENT_DENIED"
    | "COMPLETED"
    | "FAILED"
    | "EXPIRED";
  provider: string;
  providerMode: string;
  flow: "QR" | "SHARE_CODE";
  shareCode: string;
  authorizationUrl: string;
  scopes: string[];
  purpose: string;
  expiresAt: string;
  createdAt: string;
  ttlMs: number;
}

export interface TrustIdentityInfo {
  status: "PENDING" | "VERIFIED" | "EXPIRED" | "REVOKED" | "NONE";
  assuranceLevel: number;
  provider: string;
  providerMode: string;
  providerIdentityRef: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ConsentRecord {
  id: string;
  requester: string;
  purpose: string;
  scopes: string[];
  policyVersion: string;
  grantedAt: string;
  withdrawnAt: string | null;
}

// ---------------------------------------------------------------------------
// Stage 3 — Trust Identity management (assurance ladder, hashed identifiers,
// consent-scoped attributes, evidence with provenance + freshness)
// ---------------------------------------------------------------------------

export interface AssuranceRung {
  level: number;
  key: string;
  title: string;
  detail: string;
  stage: string;
  achieved: boolean;
}

export interface IdentifierInfo {
  id: string;
  type: string;
  hint: string;
  status: string;
  verifiedAt: string;
  expiresAt: string | null;
  hashPrefix: string;
}

export interface AttributeInfo {
  id: string;
  key: string;
  value: string;
  scope: string;
  status: string;
  source: string;
  assertedAt: string;
  expiresAt: string | null;
  consentId: string;
}

export interface EvidenceInfo {
  id: string;
  type: string;
  provider: string;
  providerMode: string;
  summary: string;
  confidence: number;
  status: string;
  collectedAt: string;
  expiresAt: string | null;
}

export interface IdentityMe {
  identity: TrustIdentityInfo;
  ladder: AssuranceRung[];
  identifiers: IdentifierInfo[];
  attributes: AttributeInfo[];
  evidence: EvidenceInfo[];
  consents: ConsentRecord[];
  lastSession: {
    id: string;
    status: string;
    provider: string;
    providerMode: string;
    flow: string;
    createdAt: string;
    events: VerificationTimelineEvent[];
  } | null;
}

export interface VerificationTimelineEvent {
  id: string;
  eventType: string;
  createdAt: string;
}
