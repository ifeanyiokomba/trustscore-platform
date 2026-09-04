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
  CORE_SCOPES,
  DEFAULT_SCOPES,
  SCOPE_CATALOG,
  attributeKeysForScopes,
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
  mockProfileFor,
  identifierFingerprint,
  consentScreenFor,
  type ConsentScreen,
  type ProfileClaims,
} from "@/lib/providers/ninauth";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser } from "@/lib/services/notification-service";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CONSENT_DENIED", "EXPIRED"]);

// Assurance ladder (directive §30): L1 government (NINAuth, Stage 2–3),
// L2 phone, L3 biometric, L4 cross-signal consistency — L2–L4 live in Stage 4.
// Cumulative by design: a signal never skips a rung, and L4 requires ALL
// signals to agree (including no SIM-swap flags and a consistent face match).
export const ASSURANCE_LADDER = [
  {
    level: 1,
    key: "government",
    title: "Government identity",
    detail: "NINAuth-verified record with masked reference and 90-day freshness",
    stage: "Live now",
  },
  {
    level: 2,
    key: "phone",
    title: "Verified phone",
    detail: "Phone number bound via OTP to the same identity — stored as a fingerprint only",
    stage: "Live now",
  },
  {
    level: 3,
    key: "biometric",
    title: "Biometric liveness",
    detail: "Selfie liveness check consistent with the government record",
    stage: "Live now",
  },
  {
    level: 4,
    key: "cross_signal",
    title: "Cross-signal consistency",
    detail: "All verified signals agree — no SIM-swap flags, face match holds, freshness intact",
    stage: "Live now",
  },
] as const;

export function computeAssuranceLadder(input: {
  identityVerified: boolean;
  activeIdentifierTypes: string[];
  crossSignalConsistent?: boolean;
}): Array<{
  level: number;
  key: string;
  title: string;
  detail: string;
  stage: string;
  achieved: boolean;
}> {
  const hasPhone = input.activeIdentifierTypes.includes("PHONE");
  const hasBiometric = input.activeIdentifierTypes.includes("BIOMETRIC");
  const l2 = input.identityVerified && hasPhone;
  const l3 = l2 && hasBiometric;
  const l4 = l3 && (input.crossSignalConsistent ?? false);
  return ASSURANCE_LADDER.map((r) => ({
    ...r,
    achieved:
      r.level === 1
        ? input.identityVerified
        : r.level === 2
          ? l2
          : r.level === 3
            ? l3
            : l4,
  }));
}

export interface CreateSessionInput {
  purpose?: string;
  scopes?: string[];
  flow?: "QR" | "SHARE_CODE";
}

// Resolve requested scopes: CORE always included (verification requires it),
// known optional scopes opt-in, unknown scopes rejected (purpose limitation).
export function resolveRequestedScopes(requested?: string[]): {
  scopes: string[];
  rejected: string[];
} {
  if (!requested?.length) return { scopes: [...DEFAULT_SCOPES], rejected: [] };
  const set = new Set<string>(CORE_SCOPES);
  const rejected: string[] = [];
  for (const s of requested) {
    if (SCOPE_CATALOG[s] && !CORE_SCOPES.includes(s)) set.add(s);
    else if (!SCOPE_CATALOG[s]) rejected.push(s);
  }
  return { scopes: [...set], rejected };
}

// ---------------------------------------------------------------------------
// Create a verification session (PKCE generated server-side)
// ---------------------------------------------------------------------------

export async function createVerificationSession(
  userId: string,
  input: CreateSessionInput,
  requestId: string
) {
  const { scopes, rejected } = resolveRequestedScopes(input.scopes);
  if (rejected.length > 0) {
    throw new ScopeValidationError(rejected);
  }
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

export class ScopeValidationError extends Error {
  constructor(public rejected: string[]) {
    super("scope_invalid");
    this.name = "ScopeValidationError";
  }
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
  | { ok: true; code: string; state: string; grantedScopes: string[] }
  | { ok: false; code: "SESSION_NOT_FOUND" | "NOT_PENDING" | "EXPIRED" | "DENIED" | "SCOPE_INVALID" };

export async function applyConsentDecision(
  userId: string,
  sessionId: string,
  decision: "GRANT" | "DENY",
  requestId: string,
  grantedScopes?: string[]
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

  // Stage 3 — granular consent: the user approves a SUBSET of the requested
  // scopes. Core scopes are mandatory; optional scopes are opt-in. The
  // session binds the granted set; token + attributes follow exactly it.
  const requested = JSON.parse(session.scopes) as string[];
  let finalScopes = requested;
  if (grantedScopes) {
    const valid =
      grantedScopes.every((s) => requested.includes(s)) &&
      CORE_SCOPES.every((c) => grantedScopes.includes(c));
    if (!valid) {
      return { ok: false, code: "SCOPE_INVALID" };
    }
    finalScopes = grantedScopes;
  }

  // GRANT: the mock NINAuth app issues a one-time authorization code (60s TTL).
  const { code, codeHash, expiresAt } = issueAuthorizationCode();
  await db.verificationSession.update({
    where: { id: session.id },
    data: {
      status: "CONSENT_GRANTED",
      scopes: JSON.stringify(finalScopes),
      authorizationCodeHash: codeHash,
      authorizationCodeExp: expiresAt,
    },
  });
  await recordEvent(session.id, "CONSENT_GRANTED", {
    scope: finalScopes.join(" "),
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
    metadata: { outcome: "granted", scope: "ninauth_mock", scopes: finalScopes.length },
  });

  return { ok: true, code, state: session.state, grantedScopes: finalScopes };
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
  const profileClaims: ProfileClaims = mockProfileFor(userId);
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
      profile: profileClaims,
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
      establishingConsentId: consent.id,
      verifiedAt: now,
      expiresAt,
    },
    update: {
      status: "VERIFIED",
      assuranceLevel: 1,
      provider: NINAUTH_PROVIDER_NAME,
      providerMode: NINAUTH_MODE,
      providerIdentityRef: claims.sub,
      establishingConsentId: consent.id,
      verifiedAt: now,
      expiresAt,
    },
  });

  // Stage 3 — Evidence record: provenance chain (session + consent + provider)
  // with confidence and freshness. Redacted summary — no PII (directive §38).
  await db.evidence.create({
    data: {
      userId,
      trustIdentityId: identity.id,
      sessionId: session.id,
      consentId: consent.id,
      type: "NINAUTH_ID_TOKEN",
      provider: NINAUTH_PROVIDER_NAME,
      providerMode: NINAUTH_MODE,
      summary: "Government identity verified via NINAuth ID token (signature, issuer, audience, nonce validated).",
      confidence: 100,
      status: "ACTIVE",
      collectedAt: now,
      expiresAt,
    },
  });

  // Stage 3 — Hashed identifier fingerprint (never a raw identifier).
  await db.identityIdentifier.upsert({
    where: { trustIdentityId_type: { trustIdentityId: identity.id, type: "NIN_FINGERPRINT" } },
    create: {
      trustIdentityId: identity.id,
      type: "NIN_FINGERPRINT",
      hash: identifierFingerprint(claims.sub),
      hint: "Government ID · NINAuth subject (masked)",
      status: "ACTIVE",
      verifiedAt: now,
      expiresAt,
      consentId: consent.id,
    },
    update: {
      hash: identifierFingerprint(claims.sub),
      status: "ACTIVE",
      verifiedAt: now,
      expiresAt,
      consentId: consent.id,
    },
  });

  // Stage 3 — Consent-scoped identity attributes: only for granted profile
  // scopes; each carries the consent as provenance so withdrawal revokes it.
  const attributeKeys = attributeKeysForScopes(scopes);
  for (const key of attributeKeys) {
    const value = claims.profile?.[key as keyof ProfileClaims];
    if (!value) continue;
    await db.identityAttribute.upsert({
      where: { trustIdentityId_key: { trustIdentityId: identity.id, key } },
      create: {
        trustIdentityId: identity.id,
        key,
        value,
        scope: key === "given_name" || key === "family_name" ? "profile.name" : "profile.demographics",
        consentId: consent.id,
        status: "ACTIVE",
        source: NINAUTH_PROVIDER_NAME,
        assertedAt: now,
        expiresAt,
      },
      update: {
        value,
        scope: key === "given_name" || key === "family_name" ? "profile.name" : "profile.demographics",
        consentId: consent.id,
        status: "ACTIVE",
        assertedAt: now,
        expiresAt,
      },
    });
  }

  await db.verificationSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", completedAt: now, consentId: consent.id },
  });

  const attributeCount = attributeKeys.length;
  await recordEvent(session.id, "IDENTITY_VERIFIED", {
    scope: "level_1_government",
    policyVersion: session.policyVersion,
    attributes: attributeCount,
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "IDENTITY_VERIFIED",
    subjectType: "TrustIdentity",
    subjectId: identity.id,
    requestId,
    metadata: { outcome: "level_1", scope: "ninauth_mock", attributes: attributeCount },
  });
  await notifyUser(
    userId,
    "VERIFICATION",
    "Trust Identity established",
    attributeCount > 0
      ? `Your government identity was verified through NINAuth (mock provider). Assurance Level 1, valid for 90 days — ${attributeCount} consent-scoped attributes added to your profile.`
      : "Your government identity was verified through NINAuth (mock provider). Assurance Level 1, valid for 90 days. A consent record has been added to your history."
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
// Stage 3 — Consent withdrawal (NDPA §31 data-subject right).
// Withdrawing a consent revokes every attribute it produced. Withdrawing the
// consent that ESTABLISHED the TrustIdentity revokes the identity, its
// identifier fingerprints and its evidence (re-verify to re-establish).
// ---------------------------------------------------------------------------

export type WithdrawResult =
  | { ok: true; revokedAttributes: number; revokedIdentifiers: number; identityRevoked: boolean }
  | { ok: false; code: "NOT_FOUND" | "ALREADY_WITHDRAWN" };

export async function withdrawConsent(
  userId: string,
  consentId: string,
  requestId: string
): Promise<WithdrawResult> {
  const consent = await db.consent.findUnique({ where: { id: consentId } });
  if (!consent || consent.userId !== userId) {
    return { ok: false, code: "NOT_FOUND" };
  }
  if (consent.withdrawnAt) {
    return { ok: false, code: "ALREADY_WITHDRAWN" };
  }

  const now = new Date();
  await db.consent.update({
    where: { id: consent.id },
    data: { withdrawnAt: now },
  });

  // Revoke attributes sourced from this consent.
  const revokedAttrs = await db.identityAttribute.updateMany({
    where: { consentId: consent.id, status: "ACTIVE" },
    data: { status: "REVOKED" },
  });

  // Stage 4 — revoke identifiers SOURCED from this consent (phone / biometric
  // signal bindings). Withdrawing the signal consent unbinds the signal and
  // de-escalates the ladder — the identifier never outlives its consent.
  const revokedIdentifiers = await db.identityIdentifier.updateMany({
    where: { consentId: consent.id, status: "ACTIVE" },
    data: { status: "REVOKED" },
  });

  // If this consent established the current TrustIdentity, revoke the spine.
  const identity = await db.trustIdentity.findUnique({ where: { userId } });
  let identityRevoked = false;
  if (identity && identity.establishingConsentId === consent.id && identity.status !== "REVOKED") {
    await db.trustIdentity.update({
      where: { id: identity.id },
      data: { status: "REVOKED", assuranceLevel: 0, updatedAt: now },
    });
    await db.identityIdentifier.updateMany({
      where: { trustIdentityId: identity.id, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });
    await db.evidence.updateMany({
      where: { trustIdentityId: identity.id, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });
    identityRevoked = true;
  } else {
    // Non-establishing consent: revoke its own evidence records.
    await db.evidence.updateMany({
      where: { consentId: consent.id, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });
    // De-escalate the ladder for the surviving identity (Stage 4).
    if (identity && identity.status !== "REVOKED") {
      const { recomputeAssuranceLevel } = await import("@/lib/services/signal-service");
      await recomputeAssuranceLevel(userId);
    }
  }

  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "IDENTITY_CONSENT_WITHDRAWN",
    subjectType: "Consent",
    subjectId: consent.id,
    requestId,
    metadata: {
      outcome: "withdrawn",
      revokedAttributes: revokedAttrs.count,
      revokedIdentifiers: revokedIdentifiers.count,
      identityRevoked,
    },
  });
  await notifyUser(
    userId,
    "SECURITY",
    "Consent withdrawn",
    identityRevoked
      ? `You withdrew the consent that established your Trust Identity. Your identity, its identifiers, attributes and evidence have been revoked. You can re-verify anytime.`
      : `You withdrew a consent. ${revokedAttrs.count + revokedIdentifiers.count} bound item${revokedAttrs.count + revokedIdentifiers.count === 1 ? "" : "s"} (attributes / signals) sourced from it ${revokedAttrs.count + revokedIdentifiers.count === 1 ? "was" : "were"} revoked.`
  );

  return { ok: true, revokedAttributes: revokedAttrs.count, revokedIdentifiers: revokedIdentifiers.count, identityRevoked };
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

export function shapeIdentity(
  identity: {
    status: string;
    assuranceLevel: number;
    provider: string;
    providerMode: string;
    providerIdentityRef: string | null;
    verifiedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  },
  statusOverride?: string
): TrustIdentityInfo {
  return {
    status: (statusOverride ?? identity.status) as TrustIdentityInfo["status"],
    assuranceLevel: identity.assuranceLevel,
    provider: identity.provider,
    providerMode: identity.providerMode,
    providerIdentityRef: identity.providerIdentityRef,
    verifiedAt: identity.verifiedAt?.toISOString() ?? null,
    expiresAt: identity.expiresAt?.toISOString() ?? null,
    createdAt: identity.createdAt.toISOString(),
  };
}

export async function getIdentityForUser(
  userId: string,
  crossSignal?: { consistent: boolean }
) {
  const identity = await db.trustIdentity.findUnique({
    where: { userId },
    include: {
      identifiers: { orderBy: { verifiedAt: "desc" } },
      attributes: { orderBy: { key: "asc" } },
      evidence: { orderBy: { collectedAt: "desc" }, take: 10 },
    },
  });
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

  // Lazy freshness: an identity past its horizon reads as EXPIRED (L1 lost
  // until re-verification) — the read model stays honest without a cron job.
  const isStale =
    identity !== null &&
    identity.status === "VERIFIED" &&
    identity.expiresAt !== null &&
    identity.expiresAt.getTime() < Date.now();

  const activeIdentifierTypes = (identity?.identifiers ?? [])
    .filter((i) => i.status === "ACTIVE" && (i.expiresAt?.getTime() ?? Infinity) > Date.now())
    .map((i) => i.type);

  const ladder = computeAssuranceLadder({
    identityVerified: identity?.status === "VERIFIED" && !isStale,
    activeIdentifierTypes,
    crossSignalConsistent: crossSignal?.consistent ?? false,
  });

  return {
    identity: identity
      ? shapeIdentity(identity, isStale ? "EXPIRED" : undefined)
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
    ladder,
    identifiers: (identity?.identifiers ?? []).map((i) => ({
      id: i.id,
      type: i.type,
      hint: i.hint,
      status: i.status,
      verifiedAt: i.verifiedAt.toISOString(),
      expiresAt: i.expiresAt?.toISOString() ?? null,
      hashPrefix: `${i.hash.slice(0, 8)}…`, // display-only prefix, never the full hash
    })),
    attributes: (identity?.attributes ?? []).map((a) => ({
      id: a.id,
      key: a.key,
      value: a.status === "ACTIVE" ? a.value : "—",
      scope: a.scope,
      status: a.status,
      source: a.source,
      assertedAt: a.assertedAt.toISOString(),
      expiresAt: a.expiresAt?.toISOString() ?? null,
      consentId: a.consentId,
    })),
    evidence: (identity?.evidence ?? []).map((e) => ({
      id: e.id,
      type: e.type,
      provider: e.provider,
      providerMode: e.providerMode,
      summary: e.summary,
      confidence: e.confidence,
      status: e.status,
      collectedAt: e.collectedAt.toISOString(),
      expiresAt: e.expiresAt?.toISOString() ?? null,
    })),
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
