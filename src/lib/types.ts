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
// Stage 2 — NINAuth identity types (mirror /api/v1/identity/* responses)
// ---------------------------------------------------------------------------

export interface ConsentField {
  scope: string;
  label: string;
  description: string;
}

export interface ConsentScreenInfo {
  requester: string;
  purpose: string;
  fields: ConsentField[];
  policyVersion: string;
  provider: string;
  mode: "MOCK" | "LIVE";
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

export interface VerificationTimelineEvent {
  id: string;
  eventType: string;
  createdAt: string;
}

export interface IdentityMe {
  identity: TrustIdentityInfo;
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
