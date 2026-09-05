// TrustScore Stage 4 — SignalService (directive §28 service separation).
// Phone (OTP) + biometric (liveness) verification bound to the Trust Identity
// spine, with assurance escalation when signals agree (L2–L4) and
// cross-signal consistency (directive §30).
//
// Disciplines carried forward:
//   - A signal can only be bound to a VERIFIED, FRESH government identity
//     (L1 first — a phone or selfie alone never establishes identity).
//   - Every verification is consent-backed (NDPA §31) — withdrawal revokes
//     the sourced identifier and de-escalates the ladder.
//   - Raw phone numbers are stored ONLY as peppered fingerprints + masked
//     hints; no biometric templates are ever stored.
//   - Every action is audited (redacted metadata — directive §38).

import { db } from "@/lib/db";
import {
  PHONE_PROVIDER_NAME,
  PHONE_MODE,
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
  MAX_RESENDS,
  RESEND_COOLDOWN_MS,
  PHONE_FRESHNESS_DAYS,
  normalizePhoneE164,
  maskPhoneHint,
  phoneFingerprint,
  issueOtp,
  otpMatches,
  simSwapRiskFor,
  mockDelivery,
  confidenceForSimSwap,
  type SimSwapRisk,
  type DeliveryInfo,
} from "@/lib/providers/phone-provider";
import {
  LIVENESS_PROVIDER_NAME,
  LIVENESS_MODE,
  LIVENESS_TTL_MS,
  LIVENESS_FRESHNESS_DAYS,
  createLivenessJob,
  evaluateLiveness,
  biometricFingerprint,
  captureInstructions,
  type LivenessVerdict,
  type LivenessSimulate,
} from "@/lib/providers/liveness-provider";
import { CONSENT_POLICY_VERSION } from "@/lib/providers/ninauth";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser } from "@/lib/services/notification-service";
import { markMaterialChange } from "@/lib/services/trustscore-service";

// ---------------------------------------------------------------------------
// Errors → mapped to HTTP by the routes
// ---------------------------------------------------------------------------

export class SignalError extends Error {
  constructor(
    public code:
      | "IDENTITY_REQUIRED"
      | "PHONE_INVALID"
      | "NOT_FOUND"
      | "NOT_PENDING"
      | "EXPIRED"
      | "LOCKED"
      | "COOLDOWN"
      | "RESEND_LIMIT"
      | "OTP_INVALID"
      | "REASON_INVALID",
    public httpStatus: number,
    message: string,
    public extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SignalError";
  }
}

const PHONE_CONSENT_PURPOSE = "SELF_ASSURANCE_PHONE";
const PHONE_CONSENT_SCOPES = ["phone.otp_verify"];
const LIVENESS_CONSENT_PURPOSE = "SELF_ASSURANCE_BIOMETRIC";
const LIVENESS_CONSENT_SCOPES = ["biometric.liveness"];

// ---------------------------------------------------------------------------
// Shared: the identity spine a signal binds to (L1 gate)
// ---------------------------------------------------------------------------

async function requireFreshIdentity(userId: string) {
  const identity = await db.trustIdentity.findUnique({ where: { userId } });
  const fresh =
    identity !== null &&
    identity.status === "VERIFIED" &&
    identity.providerIdentityRef !== null &&
    (identity.expiresAt?.getTime() ?? 0) > Date.now();
  if (!fresh || !identity) {
    throw new SignalError(
      "IDENTITY_REQUIRED",
      409,
      "Verify your government identity (Level 1) before binding additional signals.",
      { requiredLevel: 1 }
    );
  }
  return identity;
}

// ---------------------------------------------------------------------------
// Assurance escalation (directive §30): L1 government → L2 +phone →
// L3 +biometric → L4 when all signals agree (cross-signal consistency).
// Cumulative by design: a single signal never skips a rung.
// ---------------------------------------------------------------------------

export interface CrossSignalCheck {
  key: string;
  label: string;
  ok: boolean;
}

export interface CrossSignalState {
  consistent: boolean;
  checks: CrossSignalCheck[];
  eligibleLevel: number;
}

export function activeIdentifierTypesFor(identity: {
  status: string;
  expiresAt: Date | null;
  identifiers: Array<{ type: string; status: string; expiresAt: Date | null }>;
}): string[] {
  if (identity.status !== "VERIFIED") return [];
  if ((identity.expiresAt?.getTime() ?? 0) <= Date.now()) return [];
  return identity.identifiers
    .filter((i) => i.status === "ACTIVE" && (i.expiresAt?.getTime() ?? Infinity) > Date.now())
    .map((i) => i.type);
}

export async function computeCrossSignalState(userId: string): Promise<CrossSignalState> {
  const identity = await db.trustIdentity.findUnique({
    where: { userId },
    include: { identifiers: true },
  });
  const phoneRow = await db.phoneVerification.findFirst({
    where: { userId, status: "VERIFIED" },
    orderBy: { verifiedAt: "desc" },
  });
  const livenessRow = await db.livenessSession.findFirst({
    where: { userId, status: "PASSED" },
    orderBy: { completedAt: "desc" },
  });

  const identityFresh =
    identity !== null &&
    identity.status === "VERIFIED" &&
    (identity.expiresAt?.getTime() ?? 0) > Date.now();
  const types = identity ? activeIdentifierTypesFor(identity) : [];
  const hasPhone = types.includes("PHONE");
  const hasBiometric = types.includes("BIOMETRIC");

  let livenessConsistent = false;
  if (livenessRow?.result) {
    try {
      const verdict = JSON.parse(livenessRow.result) as { consistent?: boolean };
      livenessConsistent = verdict.consistent === true;
    } catch {
      livenessConsistent = false;
    }
  }
  const simSwapRisk = phoneRow?.simSwapRisk as SimSwapRisk | undefined;

  const checks: CrossSignalCheck[] = [
    {
      key: "government",
      label: "Government identity verified & fresh",
      ok: identityFresh,
    },
    {
      key: "phone",
      label: hasPhone ? "Phone bound via OTP & fresh" : "Phone not bound",
      ok: hasPhone,
    },
    {
      key: "sim_swap",
      label:
        simSwapRisk === "HIGH"
          ? "SIM-swap risk detected on the bound line"
          : simSwapRisk === "MEDIUM"
            ? "Moderate SIM-swap risk on the bound line"
            : hasPhone
              ? "No SIM-swap signals on the bound line"
              : "No SIM-swap signal (phone not bound)",
      ok: hasPhone && simSwapRisk !== "HIGH",
    },
    {
      key: "biometric",
      label: hasBiometric
        ? "Biometric liveness passed & fresh"
        : "Biometric liveness not completed",
      ok: hasBiometric,
    },
    {
      key: "face_match",
      label: livenessRow
        ? livenessConsistent
          ? "Selfie consistent with the government record"
          : "Selfie not established as consistent"
        : "No biometric comparison yet",
      ok: hasBiometric && livenessConsistent,
    },
  ];

  const consistent =
    identityFresh && hasPhone && hasBiometric && livenessConsistent && simSwapRisk !== "HIGH";

  const eligibleLevel = identityFresh
    ? hasPhone
      ? hasBiometric
        ? consistent
          ? 4
          : 3
        : 2
      : 1
    : 0;

  return { consistent, checks, eligibleLevel };
}

// Recompute and persist the assurance level after any signal change.
export async function recomputeAssuranceLevel(userId: string): Promise<number> {
  const state = await computeCrossSignalState(userId);
  const identity = await db.trustIdentity.findUnique({ where: { userId } });
  if (!identity) return 0;
  if (identity.assuranceLevel !== state.eligibleLevel) {
    await db.trustIdentity.update({
      where: { id: identity.id },
      data: { assuranceLevel: state.eligibleLevel, updatedAt: new Date() },
    });
  }
  return state.eligibleLevel;
}

// ---------------------------------------------------------------------------
// Phone verification — start
// ---------------------------------------------------------------------------

export async function startPhoneVerification(
  userId: string,
  input: { phone: string; simSwapRisk?: SimSwapRisk },
  requestId: string
) {
  const identity = await requireFreshIdentity(userId);

  const e164 = normalizePhoneE164(input.phone);
  if (!e164) {
    throw new SignalError(
      "PHONE_INVALID",
      422,
      "Enter a valid Nigerian mobile number (e.g. 0801 234 5678)."
    );
  }

  const consent = await db.consent.create({
    data: {
      userId,
      requester: "TrustScore (you)",
      purpose: PHONE_CONSENT_PURPOSE,
      scopes: JSON.stringify(PHONE_CONSENT_SCOPES),
      policyVersion: CONSENT_POLICY_VERSION,
    },
  });

  const { code, otpHash } = issueOtp();
  const fingerprint = phoneFingerprint(e164);
  const risk = simSwapRiskFor(fingerprint, input.simSwapRisk);

  const verification = await db.phoneVerification.create({
    data: {
      userId,
      phoneHash: fingerprint,
      phoneHint: maskPhoneHint(e164),
      status: "PENDING",
      otpHash,
      simSwapRisk: risk,
      consentId: consent.id,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "SIGNAL_PHONE_STARTED",
    subjectType: "PhoneVerification",
    subjectId: verification.id,
    requestId,
    metadata: { outcome: "started", scope: "phone_otp", providerMode: PHONE_MODE },
  });

  const delivery: DeliveryInfo = mockDelivery(code);

  return {
    verification: {
      id: verification.id,
      phoneHint: verification.phoneHint,
      status: verification.status,
      attemptsLeft: MAX_OTP_ATTEMPTS,
      resendsLeft: MAX_RESENDS,
      expiresAt: verification.expiresAt.toISOString(),
      provider: PHONE_PROVIDER_NAME,
      providerMode: PHONE_MODE,
    },
    consent: { id: consent.id, purpose: PHONE_CONSENT_PURPOSE },
    delivery, // MOCK: includes the code for sandbox testing (honestly labeled)
  };
}

// ---------------------------------------------------------------------------
// Phone verification — resend (cooldown + capped)
// ---------------------------------------------------------------------------

export async function resendPhoneOtp(
  userId: string,
  input: { verificationId: string; simSwapRisk?: SimSwapRisk },
  requestId: string
) {
  const row = await db.phoneVerification.findUnique({
    where: { id: input.verificationId },
  });
  if (!row || row.userId !== userId) {
    throw new SignalError("NOT_FOUND", 404, "Verification not found.");
  }
  if (row.status !== "PENDING") {
    throw new SignalError("NOT_PENDING", 409, `Verification is ${row.status.toLowerCase()}.`);
  }

  const sinceUpdate = Date.now() - row.updatedAt.getTime();
  if (sinceUpdate < RESEND_COOLDOWN_MS) {
    throw new SignalError("COOLDOWN", 429, "Please wait before requesting a new code.", {
      retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - sinceUpdate) / 1000),
    });
  }
  if (row.resends >= MAX_RESENDS) {
    throw new SignalError("RESEND_LIMIT", 409, "Resend limit reached. Start a new verification.");
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await db.phoneVerification.update({
      where: { id: row.id },
      data: { status: "EXPIRED" },
    });
    throw new SignalError("EXPIRED", 409, "This verification expired. Start a new one.");
  }

  const { code, otpHash } = issueOtp();
  await db.phoneVerification.update({
    where: { id: row.id },
    data: {
      otpHash,
      attempts: 0, // fresh code → fresh attempt budget
      resends: row.resends + 1,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "SIGNAL_PHONE_RESENT",
    subjectType: "PhoneVerification",
    subjectId: row.id,
    requestId,
    metadata: { outcome: "resent", scope: "phone_otp" },
  });

  return {
    verification: {
      id: row.id,
      phoneHint: row.phoneHint,
      status: "PENDING" as const,
      attemptsLeft: MAX_OTP_ATTEMPTS,
      resendsLeft: MAX_RESENDS - (row.resends + 1),
      expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      provider: PHONE_PROVIDER_NAME,
      providerMode: PHONE_MODE,
    },
    delivery: mockDelivery(code),
  };
}

// ---------------------------------------------------------------------------
// Phone verification — confirm (timing-safe OTP check, capped attempts)
// ---------------------------------------------------------------------------

export async function confirmPhoneOtp(
  userId: string,
  input: { verificationId: string; code: string },
  requestId: string
) {
  const row = await db.phoneVerification.findUnique({
    where: { id: input.verificationId },
  });
  if (!row || row.userId !== userId) {
    throw new SignalError("NOT_FOUND", 404, "Verification not found.");
  }

  // Lazy state transitions first — the row must be a live, pending check.
  if (row.status === "EXPIRED" || row.expiresAt.getTime() < Date.now()) {
    if (row.status === "PENDING") {
      await db.phoneVerification.update({
        where: { id: row.id },
        data: { status: "EXPIRED" },
      });
    }
    throw new SignalError("EXPIRED", 409, "This verification expired. Start a new one.");
  }
  if (row.status !== "PENDING") {
    throw new SignalError("LOCKED", 409, `Verification is ${row.status.toLowerCase()} — start a new one.`);
  }

  if (!/^\d{6}$/.test(input.code)) {
    throw new SignalError("OTP_INVALID", 422, "Enter the 6-digit code from the SMS.");
  }

  if (!otpMatches(row.otpHash, input.code)) {
    const attempts = row.attempts + 1;
    const locked = attempts >= MAX_OTP_ATTEMPTS;
    await db.phoneVerification.update({
      where: { id: row.id },
      data: { attempts, status: locked ? "FAILED" : "PENDING" },
    });
    await recordAudit({
      actorType: "USER",
      actorId: userId,
      action: "SIGNAL_PHONE_FAILED",
      subjectType: "PhoneVerification",
      subjectId: row.id,
      requestId,
      metadata: { outcome: locked ? "locked" : "wrong_code", attemptsLeft: MAX_OTP_ATTEMPTS - attempts },
    });
    if (locked) {
      await notifyUser(
        userId,
        "SECURITY",
        "Phone verification locked",
        "Too many wrong codes. For your security this verification was locked — start a new one if this was you."
      );
    }
    throw new SignalError(
      locked ? "LOCKED" : "OTP_INVALID",
      locked ? 409 : 400,
      locked
        ? "Too many wrong attempts — verification locked. Start a new one."
        : "That code is not correct.",
      { attemptsLeft: Math.max(0, MAX_OTP_ATTEMPTS - attempts) }
    );
  }

  // Correct code: bind the phone to the identity spine.
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PHONE_FRESHNESS_DAYS * 24 * 60 * 60 * 1000);
  const identity = await db.trustIdentity.findUnique({ where: { userId } });
  if (!identity || identity.status !== "VERIFIED") {
    throw new SignalError("IDENTITY_REQUIRED", 409, "Government identity is no longer active.");
  }

  await db.phoneVerification.update({
    where: { id: row.id },
    data: { status: "VERIFIED", verifiedAt: now },
  });

  // Stage 6 — hash-lookup unambiguity: a phone number belongs to exactly one
  // verified identity at a time. If another identity holds an ACTIVE
  // identifier with this fingerprint (number re-verified by its new owner,
  // or a sandbox duplicate), the older binding is SUPERSEDED — its evidence
  // lapses and the ladder de-escalates for that user.
  const collisions = await db.identityIdentifier.findMany({
    where: {
      type: "PHONE",
      hash: row.phoneHash,
      status: "ACTIVE",
      NOT: { trustIdentityId: identity.id },
    },
    select: { id: true, trustIdentityId: true },
  });
  for (const c of collisions) {
    await db.identityIdentifier.update({
      where: { id: c.id },
      data: { status: "SUPERSEDED" },
    });
    await db.evidence.updateMany({
      where: { trustIdentityId: c.trustIdentityId, type: "PHONE_OTP", status: "ACTIVE" },
      data: { status: "REVOKED" },
    });
    const oldIdentity = await db.trustIdentity.findUnique({
      where: { id: c.trustIdentityId },
      select: { userId: true },
    });
    if (oldIdentity) {
      await recomputeAssuranceLevel(oldIdentity.userId);
      await markMaterialChange(oldIdentity.userId, "PHONE_SUPERSEDED");
      await notifyUser(
        oldIdentity.userId,
        "SECURITY",
        "Phone number re-verified elsewhere",
        "The phone number linked to your identity was just verified by a different TrustScore account, so your phone signal was superseded. If this wasn't you, contact support immediately."
      );
    }
  }

  await db.identityIdentifier.upsert({
    where: { trustIdentityId_type: { trustIdentityId: identity.id, type: "PHONE" } },
    create: {
      trustIdentityId: identity.id,
      type: "PHONE",
      hash: row.phoneHash,
      hint: `Phone · ${row.phoneHint} (OTP-verified)`,
      status: "ACTIVE",
      verifiedAt: now,
      expiresAt,
      consentId: row.consentId,
    },
    update: {
      hash: row.phoneHash,
      hint: `Phone · ${row.phoneHint} (OTP-verified)`,
      status: "ACTIVE",
      verifiedAt: now,
      expiresAt,
      consentId: row.consentId,
    },
  });

  const risk = row.simSwapRisk as SimSwapRisk;
  await db.evidence.create({
    data: {
      userId,
      trustIdentityId: identity.id,
      sessionId: row.id,
      consentId: row.consentId,
      type: "PHONE_OTP",
      provider: PHONE_PROVIDER_NAME,
      providerMode: PHONE_MODE,
      summary: `Phone bound to identity via SMS OTP (${PHONE_MODE} provider). SIM-swap risk: ${risk}.`,
      confidence: confidenceForSimSwap(risk),
      status: "ACTIVE",
      collectedAt: now,
      expiresAt,
    },
  });

  const level = await recomputeAssuranceLevel(userId);
  const escalated = level >= 2;

  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "SIGNAL_PHONE_VERIFIED",
    subjectType: "IdentityIdentifier",
    subjectId: identity.id,
    requestId,
    metadata: { outcome: "verified", level, simSwap: risk, providerMode: PHONE_MODE },
  });
  await notifyUser(
    userId,
    "VERIFICATION",
    "Phone verified",
    escalated
      ? `Your phone ${row.phoneHint} is now bound to your Trust Identity — Assurance Level ${level} (valid 90 days). You can withdraw this consent anytime.`
      : `Your phone ${row.phoneHint} was verified, but the assurance ladder could not escalate yet — check that your government identity is still fresh.`
  );
  // Stage 5: material change — a new signal moved the read model.
  await markMaterialChange(userId, "PHONE_VERIFIED");

  return {
    verification: { id: row.id, status: "VERIFIED" as const, phoneHint: row.phoneHint },
    identifier: {
      type: "PHONE",
      hint: `Phone · ${row.phoneHint} (OTP-verified)`,
      status: "ACTIVE" as const,
      expiresAt: expiresAt.toISOString(),
    },
    assuranceLevel: level,
    escalated,
    simSwapRisk: risk,
  };
}

// ---------------------------------------------------------------------------
// Liveness — start (job contract, consent, 10-min capture window)
// ---------------------------------------------------------------------------

export async function startLiveness(
  userId: string,
  _input: Record<string, never> | undefined,
  requestId: string
) {
  const identity = await requireFreshIdentity(userId);

  const consent = await db.consent.create({
    data: {
      userId,
      requester: "TrustScore (you)",
      purpose: LIVENESS_CONSENT_PURPOSE,
      scopes: JSON.stringify(LIVENESS_CONSENT_SCOPES),
      policyVersion: CONSENT_POLICY_VERSION,
    },
  });

  const { jobId } = createLivenessJob();
  const session = await db.livenessSession.create({
    data: {
      userId,
      trustIdentityId: identity.id,
      jobId,
      status: "PENDING",
      consentId: consent.id,
      expiresAt: new Date(Date.now() + LIVENESS_TTL_MS),
    },
  });

  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "SIGNAL_LIVENESS_STARTED",
    subjectType: "LivenessSession",
    subjectId: session.id,
    requestId,
    metadata: { outcome: "started", scope: "biometric_liveness", providerMode: LIVENESS_MODE },
  });

  return {
    session: {
      id: session.id,
      jobId: session.jobId,
      status: session.status,
      expiresAt: session.expiresAt.toISOString(),
      provider: LIVENESS_PROVIDER_NAME,
      providerMode: LIVENESS_MODE,
      instructions: captureInstructions(),
    },
    consent: { id: consent.id, purpose: LIVENESS_CONSENT_PURPOSE },
  };
}

// ---------------------------------------------------------------------------
// Liveness — complete (submit verdict; only a pass binds the identifier)
// ---------------------------------------------------------------------------

export async function completeLiveness(
  userId: string,
  input: { sessionId: string; simulate?: LivenessSimulate },
  requestId: string
) {
  const row = await db.livenessSession.findUnique({ where: { id: input.sessionId } });
  if (!row || row.userId !== userId) {
    throw new SignalError("NOT_FOUND", 404, "Liveness session not found.");
  }
  if (row.status !== "PENDING") {
    throw new SignalError("NOT_PENDING", 409, `Liveness session is ${row.status.toLowerCase()}.`);
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await db.livenessSession.update({
      where: { id: row.id },
      data: { status: "EXPIRED" },
    });
    throw new SignalError("EXPIRED", 409, "The capture window expired. Start a new check.");
  }
  if (input.simulate && !["ok", "fail_liveness", "face_mismatch"].includes(input.simulate)) {
    throw new SignalError("REASON_INVALID", 422, "Unknown simulation reason.");
  }

  const identity = await db.trustIdentity.findUnique({ where: { userId } });
  if (!identity || identity.status !== "VERIFIED" || !identity.providerIdentityRef) {
    throw new SignalError("IDENTITY_REQUIRED", 409, "Government identity is no longer active.");
  }

  const verdict: LivenessVerdict = evaluateLiveness({
    jobId: row.jobId,
    maskedSubject: identity.providerIdentityRef,
    simulate: input.simulate,
  });

  const now = new Date();
  const resultJson = JSON.stringify({
    passed: verdict.passed,
    livenessScore: verdict.livenessScore,
    faceMatchScore: verdict.faceMatchScore,
    consistent: verdict.consistent,
    reason: verdict.reason,
  });

  await db.livenessSession.update({
    where: { id: row.id },
    data: {
      status: verdict.passed ? "PASSED" : "FAILED",
      result: resultJson,
      confidence: verdict.confidence,
      completedAt: now,
    },
  });

  if (!verdict.passed) {
    await recordAudit({
      actorType: "USER",
      actorId: userId,
      action: "SIGNAL_LIVENESS_FAILED",
      subjectType: "LivenessSession",
      subjectId: row.id,
      requestId,
      metadata: { outcome: "failed", reason: verdict.reason, providerMode: LIVENESS_MODE },
    });
    await notifyUser(
      userId,
      "SECURITY",
      "Liveness check not completed",
      verdict.reason === "face_match_below_threshold"
        ? "The selfie could not be matched to your government record, so no biometric signal was added. You can retry with better lighting."
        : "The liveness check did not pass. No biometric signal was added. You can retry anytime."
    );
    return {
      session: { id: row.id, status: "FAILED" as const },
      verdict: { ...verdict, bound: false },
      assuranceLevel: identity.assuranceLevel,
    };
  }

  // Passed: bind the biometric identifier (fingerprint only — no templates).
  const expiresAt = new Date(now.getTime() + LIVENESS_FRESHNESS_DAYS * 24 * 60 * 60 * 1000);
  await db.identityIdentifier.upsert({
    where: { trustIdentityId_type: { trustIdentityId: identity.id, type: "BIOMETRIC" } },
    create: {
      trustIdentityId: identity.id,
      type: "BIOMETRIC",
      hash: biometricFingerprint(identity.providerIdentityRef),
      hint: "Biometric · liveness + face-match vs government record",
      status: "ACTIVE",
      verifiedAt: now,
      expiresAt,
      consentId: row.consentId,
    },
    update: {
      hash: biometricFingerprint(identity.providerIdentityRef),
      hint: "Biometric · liveness + face-match vs government record",
      status: "ACTIVE",
      verifiedAt: now,
      expiresAt,
      consentId: row.consentId,
    },
  });

  await db.evidence.create({
    data: {
      userId,
      trustIdentityId: identity.id,
      sessionId: row.id,
      consentId: row.consentId,
      type: "LIVENESS",
      provider: LIVENESS_PROVIDER_NAME,
      providerMode: LIVENESS_MODE,
      summary: `Selfie liveness passed and matched the government record (${LIVENESS_MODE} provider). No biometric data stored — verdict only.`,
      confidence: verdict.confidence,
      status: "ACTIVE",
      collectedAt: now,
      expiresAt,
    },
  });

  const level = await recomputeAssuranceLevel(userId);

  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "SIGNAL_LIVENESS_PASSED",
    subjectType: "IdentityIdentifier",
    subjectId: identity.id,
    requestId,
    metadata: {
      outcome: "passed",
      level,
      liveness: verdict.livenessScore,
      faceMatch: verdict.faceMatchScore,
      providerMode: LIVENESS_MODE,
    },
  });
  await notifyUser(
    userId,
    "VERIFICATION",
    "Biometric liveness passed",
    level >= 4
      ? `Liveness passed and all your signals agree — Assurance Level ${level} (cross-signal consistency). Valid 90 days.`
      : `Liveness passed and matched your government record — Assurance Level ${level} (valid 90 days). You can withdraw this consent anytime.`
  );
  // Stage 5: material change — a new signal moved the read model.
  await markMaterialChange(userId, "LIVENESS_PASSED");

  return {
    session: { id: row.id, status: "PASSED" as const },
    verdict: { ...verdict, bound: true },
    assuranceLevel: level,
  };
}

// ---------------------------------------------------------------------------
// Read model — the signals section of /identity/me
// ---------------------------------------------------------------------------

export async function getSignalsForUser(userId: string) {
  const identity = await db.trustIdentity.findUnique({
    where: { userId },
    include: { identifiers: true },
  });
  const phoneIdentifier = identity?.identifiers.find((i) => i.type === "PHONE") ?? null;
  const biometricIdentifier = identity?.identifiers.find((i) => i.type === "BIOMETRIC") ?? null;

  const pendingPhone = await db.phoneVerification.findFirst({
    where: { userId, status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  const lastPhone = await db.phoneVerification.findFirst({
    where: { userId, status: "VERIFIED" },
    orderBy: { verifiedAt: "desc" },
  });
  const pendingLiveness = await db.livenessSession.findFirst({
    where: { userId, status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  const lastLiveness = await db.livenessSession.findFirst({
    where: { userId, status: "PASSED" },
    orderBy: { completedAt: "desc" },
  });

  const now = Date.now();
  const identifierStatus = (idt: typeof phoneIdentifier): string => {
    if (!idt) return "NONE";
    if (idt.status === "REVOKED") return "REVOKED";
    if ((idt.expiresAt?.getTime() ?? 0) <= now) return "EXPIRED";
    return idt.status; // ACTIVE
  };

  let lastScores: { liveness: number; faceMatch: number; confidence: number } | null = null;
  if (lastLiveness?.result) {
    try {
      const v = JSON.parse(lastLiveness.result) as {
        livenessScore: number;
        faceMatchScore: number;
      };
      lastScores = {
        liveness: v.livenessScore,
        faceMatch: v.faceMatchScore,
        confidence: lastLiveness.confidence ?? 0,
      };
    } catch {
      lastScores = null;
    }
  }

  const crossSignal = await computeCrossSignalState(userId);

  return {
    phone: {
      status: identifierStatus(phoneIdentifier),
      hint: phoneIdentifier?.hint?.replace(/^Phone · /, "") ?? lastPhone?.phoneHint ?? null,
      verifiedAt: phoneIdentifier?.verifiedAt?.toISOString() ?? null,
      expiresAt: phoneIdentifier?.expiresAt?.toISOString() ?? null,
      simSwapRisk: lastPhone?.simSwapRisk ?? null,
      consentId: phoneIdentifier?.consentId ?? null,
      inProgress: pendingPhone
        ? {
            id: pendingPhone.id,
            phoneHint: pendingPhone.phoneHint,
            expiresAt: pendingPhone.expiresAt.toISOString(),
            attemptsLeft: MAX_OTP_ATTEMPTS - pendingPhone.attempts,
            resendsLeft: MAX_RESENDS - pendingPhone.resends,
          }
        : null,
    },
    biometric: {
      status: identifierStatus(biometricIdentifier),
      verifiedAt: biometricIdentifier?.verifiedAt?.toISOString() ?? null,
      expiresAt: biometricIdentifier?.expiresAt?.toISOString() ?? null,
      lastScores,
      consentId: biometricIdentifier?.consentId ?? null,
      inProgress: pendingLiveness
        ? { id: pendingLiveness.id, expiresAt: pendingLiveness.expiresAt.toISOString() }
        : null,
    },
    crossSignal,
    providers: {
      phone: { name: PHONE_PROVIDER_NAME, mode: PHONE_MODE },
      liveness: { name: LIVENESS_PROVIDER_NAME, mode: LIVENESS_MODE },
    },
  };
}
