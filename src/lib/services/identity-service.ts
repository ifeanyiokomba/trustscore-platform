// TrustScore Stage 2 — IdentityService (directive §28 service separation).
// Verification session lifecycle: create → consent (mock NINAuth app) →
// callback (code + PKCE exchange + ID token validation) → TrustIdentity.
// Everything consent-scoped, redacted, audited. No raw identifiers anywhere.

import { db } from "@/lib/db";
import {
  NINAUTH_MODE,
  NINAUTH_PROVIDER_NAME,
  SESSION_TTL_MS,
  IDENTITY_FRESHNESS_DAYS,
  DEFAULT_SCOPES,
  PURPOSE,
  REQUESTER,
  CONSENT_POLICY_VERSION,
  generatePkce,
  generateState,
  generateShareCode,
  authorizationUrlFor,
  issueAuthorizationCode,
  codeMatches,
  mockTokenExchange,
  validateIdToken,
  TokenValidationError,
  maskedSubjectFor,
  consentScreenFor,
  type ConsentScreen,
} from "@/lib/providers/ninauth";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser } from "@/lib/services/notification-service";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CONSENT_DENIED", "EXPIRED"]);

export interface CreateSessionInput {
  purpose?: string;
  scopes?: string[];
  flow?: "QR" | "SHARE_CODE";
}

// ---------------------------------------------------------------------------
// Create a verification session (PKCE generated server-side)
// ---------------------------------------------------------------------------

export async function createVerificationSession(
  userId: string,
  input: CreateSessionInput,
  requestId: string
) {
  const scopes = input.scopes?.length ? input.scopes : DEFAULT_SCOPES;
  const purpose = input.purpose ?? PURPOSE;
  const { verifier, challenge } = generatePkce();
  const state = generateState();
  const shareCode = generateShareCode();

  const session = await db.verificationSession.create({
    data: {
      userId,
      provider: NINAUTH_PROVIDER_NAME,
      providerMode: NINAUTH_MODE,
      flow: input.flow === "SHARE_CODE" ? "SHARE_CODE" : "QR",
      status: "AWAITING_CONSENT",
      state,
      codeVerifier: verifier,
      codeChallenge: challenge,
      scopes: JSON.stringify(scopes),
      purpose,
      policyVersion: CONSENT_POLICY_VERSION,
      shareCode,
      authorizationUrl: authorizationUrlFor(state, challenge),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  await recordEvent(session.id, "SESSION_CREATED", {
    flow: session.flow,
    scope: scopes.join(" "),
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "IDENTITY_SESSION_CREATED",
    subjectType: "VerificationSession",
    subjectId: session.id,
    requestId,
    metadata: { scope: "ninauth_mock", outcome: "created" },
  });

  return session;
}

// ---------------------------------------------------------------------------
// Read a session (with lazy expiry)
// ---------------------------------------------------------------------------

export async function getSessionForUser(userId: string, sessionId: string) {
  const session = await db.verificationSession.findUnique({
    where: { id: sessionId },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  if (!session || session.userId !== userId) return null;

  // Lazy expiry: a non-terminal session past its TTL becomes EXPIRED.
  if (
    !TERMINAL_STATUSES.has(session.status) &&
    session.expiresAt.getTime() < Date.now()
  ) {
    await db.verificationSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED", errorReason: "session_ttl" },
    });
    await recordEvent(session.id, "SESSION_EXPIRED", { reason: "ttl" });
    session.status = "EXPIRED";
    session.errorReason = "session_ttl";
  }

  return session;
}

// ---------------------------------------------------------------------------
// Consent decision — simulates the user acting inside the NINAuth app.
// In LIVE mode this endpoint disappears; the user consents in the real NINAuth
// app and NINAuth redirects to our callback with the authorization code.
// ---------------------------------------------------------------------------

export type ConsentResult =
  | { ok: true; code: string; state: string }
  | { ok: false; code: "SESSION_NOT_FOUND" | "NOT_PENDING" | "EXPIRED" | "DENIED" };

export async function applyConsentDecision(
  userId: string,
  sessionId: string,
  decision: "GRANT" | "DENY",
  requestId: string
): Promise<ConsentResult> {
  const session = await db.verificationSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.userId !== userId) {
    return { ok: false, code: "SESSION_NOT_FOUND" };
  }
  // Idempotent re-deny on an already-denied session is acknowledged…
  if (session.status === "CONSENT_DENIED" && decision === "DENY") {
    return { ok: false, code: "DENIED" };
  }
  // …but a GRANT on a terminal session is never allowed.
  if (session.status !== "AWAITING_CONSENT") {
    return { ok: false, code: "NOT_PENDING" };
  }
  if (session.expiresAt.getTime() < Date.now()) {
    await db.verificationSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED", errorReason: "session_ttl" },
    });
    await recordEvent(session.id, "SESSION_EXPIRED", { reason: "ttl" });
    return { ok: false, code: "EXPIRED" };
  }

  if (decision === "DENY") {
    await db.verificationSession.update({
      where: { id: session.id },
      data: { status: "CONSENT_DENIED", completedAt: new Date() },
    });
    await recordEvent(session.id, "CONSENT_DENIED", { reason: "user_denied" });
    await recordAudit({
      actorType: "USER",
      actorId: userId,
      action: "IDENTITY_CONSENT_DENIED",
      subjectType: "VerificationSession",
      subjectId: session.id,
      requestId,
      metadata: { outcome: "denied" },
    });
    return { ok: false, code: "DENIED" };
  }

  // GRANT: the mock NINAuth app issues a one-time authorization code (60s TTL).
  const { code, codeHash, expiresAt } = issueAuthorizationCode();
  await db.verificationSession.update({
    where: { id: session.id },
    data: {
      status: "CONSENT_GRANTED",
      authorizationCodeHash: codeHash,
      authorizationCodeExp: expiresAt,
    },
  });
  await recordEvent(session.id, "CONSENT_GRANTED", {
    scope: session.scopes,
    policyVersion: session.policyVersion,
  });
  await recordEvent(session.id, "CODE_ISSUED", { reason: "one_time_60s" });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "IDENTITY_CONSENT_GRANTED",
    subjectType: "VerificationSession",
    subjectId: session.id,
    requestId,
    metadata: { outcome: "granted", scope: "ninauth_mock" },
  });

  return { ok: true, code, state: session.state };
}

// ---------------------------------------------------------------------------
// Callback — the OAuth contract: validate state, exchange code (PKCE),
// validate ID token, establish the TrustIdentity + consent record.
// ---------------------------------------------------------------------------

export type CallbackResult =
  | {
      ok: true;
      identity: TrustIdentityInfo;
    }
  | {
      ok: false;
      code:
        | "SESSION_NOT_FOUND"
        | "BAD_STATE"
        | "NOT_GRANTED"
        | "CODE_REUSED"
        | "EXCHANGE_FAILED"
        | "TOKEN_INVALID";
      reason?: string;
    };

export async function completeCallback(
  userId: string,
  sessionId: string,
  input: { code: string; state: string },
  requestId: string
): Promise<CallbackResult> {
  const session = await db.verificationSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.userId !== userId) {
    return { ok: false, code: "SESSION_NOT_FOUND" };
  }

  // State must match exactly (anti-CSRF). Also rejects replayed callbacks on
  // completed sessions because the stored state row is already terminal.
  if (session.state !== input.state) {
    await failSession(session.id, "state_mismatch", userId, requestId);
    return { ok: false, code: "BAD_STATE" };
  }
  if (session.status === "COMPLETED") {
    return { ok: false, code: "CODE_REUSED" };
  }
  if (session.status !== "CONSENT_GRANTED" || !session.authorizationCodeHash) {
    return { ok: false, code: "NOT_GRANTED" };
  }

  // Code must match the stored hash (timing-safe).
  if (!codeMatches(session.authorizationCodeHash, input.code)) {
    await failSession(session.id, "code_mismatch", userId, requestId);
    return { ok: false, code: "EXCHANGE_FAILED", reason: "code" };
  }

  // Token exchange (PKCE verified inside) + ID token validation.
  const scopes = JSON.parse(session.scopes) as string[];
  let idToken: string;
  try {
    const tokens = mockTokenExchange({
      code: input.code,
      storedCodeHash: session.authorizationCodeHash,
      codeExpiresAt: session.authorizationCodeExp ?? new Date(0),
      codeVerifier: session.codeVerifier,
      codeChallenge: session.codeChallenge,
      nonce: session.state,
      maskedSubject: maskedSubjectFor(userId),
      scopes,
    });
    idToken = tokens.id_token;
  } catch (err) {
    const reason = err instanceof TokenValidationError ? err.code : "exchange_error";
    await failSession(session.id, reason, userId, requestId);
    return { ok: false, code: "EXCHANGE_FAILED", reason };
  }

  await recordEvent(session.id, "CODE_EXCHANGED", { reason: "pkce_ok" });

  let claims;
  try {
    claims = validateIdToken(idToken, session.state);
  } catch (err) {
    const reason = err instanceof TokenValidationError ? err.code : "validation_error";
    await failSession(session.id, `token_${reason}`, userId, requestId);
    return { ok: false, code: "TOKEN_INVALID", reason };
  }

  await recordEvent(session.id, "TOKEN_VALIDATED", { reason: "signature_iss_aud_exp_nonce" });

  // Consent record (directive §31): who / why / what / when / provider / policy.
  const consent = await db.consent.create({
    data: {
      userId,
      sessionId: session.id,
      requester: REQUESTER,
      purpose: session.purpose,
      scopes: session.scopes,
      policyVersion: session.policyVersion,
    },
  });

  // TrustIdentity: evidence + masked reference only, with a freshness horizon.
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + IDENTITY_FRESHNESS_DAYS * 24 * 60 * 60 * 1000
  );
  const identity = await db.trustIdentity.upsert({
    where: { userId },
    create: {
      userId,
      status: "VERIFIED",
      assuranceLevel: 1,
      provider: NINAUTH_PROVIDER_NAME,
      providerMode: NINAUTH_MODE,
      providerIdentityRef: claims.sub,
      verifiedAt: now,
      expiresAt,
    },
    update: {
      status: "VERIFIED",
      assuranceLevel: 1,
      provider: NINAUTH_PROVIDER_NAME,
      providerMode: NINAUTH_MODE,
      providerIdentityRef: claims.sub,
      verifiedAt: now,
      expiresAt,
    },
  });

  await db.verificationSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", completedAt: now, consentId: consent.id },
  });

  await recordEvent(session.id, "IDENTITY_VERIFIED", {
    scope: "level_1_government",
    policyVersion: session.policyVersion,
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "IDENTITY_VERIFIED",
    subjectType: "TrustIdentity",
    subjectId: identity.id,
    requestId,
    metadata: { outcome: "level_1", scope: "ninauth_mock" },
  });
  await notifyUser(
    userId,
    "VERIFICATION",
    "Trust Identity established",
    "Your government identity was verified through NINAuth (mock provider). Assurance Level 1, valid for 90 days. A consent record has been added to your history."
  );

  return { ok: true, identity: shapeIdentity(identity) };
}

async function failSession(
  sessionId: string,
  reason: string,
  userId: string,
  requestId: string
) {
  await db.verificationSession.update({
    where: { id: sessionId },
    data: { status: "FAILED", errorReason: reason, completedAt: new Date() },
  });
  await recordEvent(sessionId, "SESSION_FAILED", { reason });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "IDENTITY_SESSION_FAILED",
    subjectType: "VerificationSession",
    subjectId: sessionId,
    requestId,
    metadata: { reason },
  });
}

// ---------------------------------------------------------------------------
// Read model
// ---------------------------------------------------------------------------

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

export function shapeIdentity(identity: {
  status: string;
  assuranceLevel: number;
  provider: string;
  providerMode: string;
  providerIdentityRef: string | null;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}): TrustIdentityInfo {
  return {
    status: identity.status as TrustIdentityInfo["status"],
    assuranceLevel: identity.assuranceLevel,
    provider: identity.provider,
    providerMode: identity.providerMode,
    providerIdentityRef: identity.providerIdentityRef,
    verifiedAt: identity.verifiedAt?.toISOString() ?? null,
    expiresAt: identity.expiresAt?.toISOString() ?? null,
    createdAt: identity.createdAt.toISOString(),
  };
}

export async function getIdentityForUser(userId: string) {
  const identity = await db.trustIdentity.findUnique({ where: { userId } });
  const consents = await db.consent.findMany({
    where: { userId },
    orderBy: { grantedAt: "desc" },
    take: 5,
    select: {
      id: true,
      requester: true,
      purpose: true,
      scopes: true,
      policyVersion: true,
      grantedAt: true,
      withdrawnAt: true,
    },
  });
  const lastSession = await db.verificationSession.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      provider: true,
      providerMode: true,
      flow: true,
      createdAt: true,
      events: {
        orderBy: { createdAt: "asc" },
        select: { id: true, eventType: true, createdAt: true },
      },
    },
  });

  return {
    identity: identity
      ? shapeIdentity(identity)
      : ({
          status: "NONE",
          assuranceLevel: 0,
          provider: NINAUTH_PROVIDER_NAME,
          providerMode: NINAUTH_MODE,
          providerIdentityRef: null,
          verifiedAt: null,
          expiresAt: null,
          createdAt: new Date().toISOString(),
        } satisfies TrustIdentityInfo),
    consents: consents.map((c) => ({
      ...c,
      scopes: JSON.parse(c.scopes) as string[],
      grantedAt: c.grantedAt.toISOString(),
      withdrawnAt: c.withdrawnAt?.toISOString() ?? null,
    })),
    lastSession: lastSession
      ? {
          ...lastSession,
          createdAt: lastSession.createdAt.toISOString(),
          events: lastSession.events.map((e) => ({
            ...e,
            createdAt: e.createdAt.toISOString(),
          })),
        }
      : null,
  };
}

export async function recordEvent(
  sessionId: string,
  eventType: string,
  detail?: Record<string, unknown>
) {
  try {
    await db.verificationEvent.create({
      data: {
        sessionId,
        eventType,
        detail: detail ? JSON.stringify(detail) : null,
      },
    });
  } catch (err) {
    console.error("[identity] event record failed:", (err as Error).message);
  }
}

export function consentScreen(scopes: string[]): ConsentScreen {
  return consentScreenFor(scopes);
}
