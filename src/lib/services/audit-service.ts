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
  | "IDENTITY_SESSION_FAILED";

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
