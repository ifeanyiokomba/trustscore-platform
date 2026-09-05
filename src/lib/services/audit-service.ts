// TrustScore Stage 1 — AuditService (directive §28 service separation).
// Redacted audit events for every security-relevant action. No PII in metadata.

import { db } from "@/lib/db";

export type AuditAction =
  | "AUTH_REGISTER"
  | "AUTH_LOGIN"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_LOGOUT"
  | "HEALTH_CHECK"
  | "RATE_LIMITED"
  | "IDENTITY_SESSION_CREATED"
  | "IDENTITY_CONSENT_GRANTED"
  | "IDENTITY_CONSENT_DENIED"
  | "IDENTITY_VERIFIED"
  | "IDENTITY_SESSION_FAILED"
  | "IDENTITY_CONSENT_WITHDRAWN"
  | "SIGNAL_PHONE_STARTED"
  | "SIGNAL_PHONE_RESENT"
  | "SIGNAL_PHONE_VERIFIED"
  | "SIGNAL_PHONE_FAILED"
  | "SIGNAL_LIVENESS_STARTED"
  | "SIGNAL_LIVENESS_PASSED"
  | "SIGNAL_LIVENESS_FAILED"
  // Stage 5 — Trust Passport
  | "SCORE_SNAPSHOT"
  | "CREDENTIAL_ISSUED"
  | "CREDENTIAL_REVOKED"
  | "SHARE_TOKEN_CREATED"
  | "SHARE_TOKEN_VIEWED"
  | "SHARE_TOKEN_REVOKED"
  | "SHARE_TOKEN_BLOCKED" // view rejected: expired / revoked / view limit
  | "SESSION_REVOKED"
  | "DSR_EXPORT_REQUESTED"
  | "DSR_EXPORT_COMPLETED"
  | "DSR_DELETE_REQUESTED"
  | "DSR_DELETE_COMPLETED"
  // Stage 6 — Safety Check + Trust Requests
  | "SAFETY_CHECK_RUN"
  | "SAFETY_SETTINGS_UPDATED"
  | "TRUST_REQUEST_SENT"
  | "TRUST_REQUEST_ACCEPTED"
  | "TRUST_REQUEST_DECLINED"
  // Stage 7 — Reputation (flags, resolutions, appeals)
  | "FLAG_SUBMITTED"
  | "FLAG_WITHDRAWN"
  | "FLAG_RESPONSE"
  | "FLAG_RESOLUTION"
  | "APPEAL_FILED"
  | "APPEAL_DECIDED"
  // Stage 8 — Trust Engine (policy lifecycle, DPIA, gate)
  | "POLICY_DRAFTED"
  | "POLICY_ACTIVATED"
  | "POLICY_SIMULATED"
  | "DPIA_RECORDED"
  | "ENGINE_GATE_TOGGLED"
  // Stage 9 — B2B Platform (developer portal, API keys, webhooks, decisions)
  | "DEV_CLIENT_CREATED"
  | "DEV_CLIENT_LIVE_ENABLED"
  | "DEV_PLAN_CHANGED"
  | "API_KEY_MINTED"
  | "API_KEY_REVOKED"
  | "API_QUOTA_EXCEEDED"
  | "WEBHOOK_CONFIGURED"
  | "WEBHOOK_TEST_SENT"
  | "DEV_TEAM_MEMBER_ADDED"
  | "DEV_TEAM_MEMBER_REMOVED"
  | "TRUST_DECISION_API";

interface AuditInput {
  actorType: "USER" | "SYSTEM" | "ANONYMOUS";
  actorId?: string;
  action: AuditAction;
  subjectType?: string;
  subjectId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

// Explicitly redacted: strip anything that could carry PII before persisting.
const SAFE_METADATA_KEYS = new Set([
  "reason",
  "scope",
  "sessionCount",
  "outcome",
  "code",
  "view",
  "scopes",
  "attributes",
  "revokedAttributes",
  "revokedIdentifiers",
  "identityRevoked",
  // Stage 4 signal keys — all non-PII counters / labels
  "attemptsLeft",
  "simSwap",
  "confidence",
  "liveness",
  "faceMatch",
  "level",
  "providerMode",
  // Stage 5 — non-PII counters / labels / prefixes only
  "score",
  "trigger",
  "type",
  "credentialTypes",
  "ttlHours",
  "maxViews",
  "views",
  "viewsLeft",
  "tokenPrefix",
  "scopeSet",
  "exportBytes",
  "requests",
  "deleted",
  "current",
  // Stage 6 — non-PII labels only
  "method",
  // Stage 7 — non-PII labels / counters only (never flag text or rationale)
  "category",
  "evidenceCount",
  // Stage 8 — trust-engine labels / counters only (never policy rationale text)
  "policyVersion",
  "enabled",
  "residualRisk",
  "status",
  "warnings",
  // Stage 8 simulation — counters only (never member identities)
  "cohort",
  "frozenExcluded",
  "simulated",
  // Stage 9 — B2B labels / counters only (never key material, URLs or inputs)
  "environment",
  "plan",
  "keyPrefix",
  "rotateSecret",
  "event",
  "role",
  "attempts",
  "statusCode",
  "deliveryStatus",
]);

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const safeMeta =
      input.metadata &&
      Object.fromEntries(
        Object.entries(input.metadata).filter(([k]) => SAFE_METADATA_KEYS.has(k))
      );
    await db.auditEvent.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        action: input.action,
        subjectType: input.subjectType ?? null,
        subjectId: input.subjectId ?? null,
        requestId: input.requestId ?? null,
        metadata: safeMeta ? JSON.stringify(safeMeta) : null,
      },
    });
  } catch (err) {
    // Audit failures must never break the request path — log to stderr only.
    console.error("[audit] failed to record event:", (err as Error).message);
  }
}
