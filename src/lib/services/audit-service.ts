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
  | "DSR_DELETE_COMPLETED";

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
