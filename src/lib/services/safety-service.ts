// TrustScore Stage 6 — SafetyService (directive §2/§46 "Check Before You Deal").
//
// The VERIFIER-side product: a signed-in member runs a sanitized assessment
// on a counterparty before dealing with them. Four entry methods:
//   HANDLE        — @handle lookup, gated by the subject's standing
//                   SAFETY_CHECK consent (anti-enumeration: unknown handle
//                   and disabled checks return byte-identical responses)
//   PHONE         — consent-gated peppered-hash identifier match: the raw
//                   phone is fingerprinted server-side and discarded; it is
//                   never stored, logged or echoed (directive §38/§50)
//   TRUST_LINK/QR — an active Stage 5 share token (token scopes govern; the
//                   view is counted + receipted with the verifier's NAME)
//
// Every completed check is: consent-backed (per-check consent), receipted to
// the subject (TrustReceipt with a named viewer label), notified, audited,
// and snapshotted into SafetyCheck.assessment — exactly what was shown.
//
// Trust Requests: when a handle is not checkable, the verifier may ASK once
// (7-day expiry, one pending per pair). ACCEPT mints a scoped trust link and
// runs the assessment for the verifier; the subject keeps the link (their
// token, their control). DECLINE is final for that request.
//
// Red lines (directive §50/§59): the assessment NEVER says "this person is
// safe" — the locked language is "No confirmed adverse signals found" plus
// the not-a-guarantee disclaimer. No raw identifiers in any response, audit
// event, receipt or stored assessment.

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { sha256Hex, hashIp } from "@/lib/platform/crypto";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser } from "@/lib/services/notification-service";
import { getScoreSnapshot, getCredentialsForUser } from "@/lib/services/trustscore-service";
import { viewPublicCard } from "@/lib/services/passport-service";
import { buildNetworkBlockFor } from "@/lib/services/network-service";
import { normalizePhoneE164, phoneFingerprint } from "@/lib/providers/phone-provider";
import { CONSENT_POLICY_VERSION } from "@/lib/providers/ninauth";

const SAFETY_REQUESTER = "TrustScore Safety Check";
const SAFETY_PURPOSE =
  "Allow verified TrustScore members to run a safety check on your handle or verified phone before dealing with you. Every check is receipted to you.";
export const SAFETY_SCOPE_KEYS = {
  status: "safety.status",
  profile: "safety.profile",
  signals: "safety.signals",
  phoneMatch: "safety.phone_match",
} as const;

export const TRUST_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CHECKS_RETAIN = 50;
const TOKEN_MAX_VIEWS = 10;

// Locked card language — shared with the Stage 5 public viewer.
export const SAFETY_LANGUAGE = {
  adverse: "No confirmed adverse signals found",
  disclaimer:
    "A TrustScore summarizes recorded verification evidence. It is not a guarantee that a person is safe to deal with.",
} as const;

// Status-derived headline. NEVER "safe" — only statements about evidence.
function headlineForStatus(status: string): string {
  switch (status) {
    case "HIGH_RISK":
      return "Confirmed risk signals on record — proceed only with human review";
    case "REVIEW_REQUIRED":
      return "Under review — proceed with care";
    case "CAUTION":
      return "Identity freshness has lapsed — proceed with care";
    case "ESTABLISHED":
    case "VERIFIED":
      return SAFETY_LANGUAGE.adverse;
    default:
      return "New profile — no confirmed adverse signals found";
  }
}

export interface SafetySettings {
  enabled: boolean;
  includeProfile: boolean;
  includeSignals: boolean;
  allowPhoneMatch: boolean;
  consentId: string | null;
  grantedAt: string | null;
}

// ---------------------------------------------------------------------------
// Standing SAFETY_CHECK consent (subject-side settings)
// ---------------------------------------------------------------------------

interface SafetySettingsInput {
  enabled: boolean;
  includeProfile: boolean;
  includeSignals: boolean;
  allowPhoneMatch: boolean;
}

async function findActiveSafetyConsent(userId: string) {
  const rows = await db.consent.findMany({
    where: { userId, requester: SAFETY_REQUESTER, withdrawnAt: null },
    orderBy: { grantedAt: "desc" },
  });
  return rows[0] ?? null;
}

function scopesFor(input: SafetySettingsInput): string[] {
  const scopes: string[] = [SAFETY_SCOPE_KEYS.status];
  if (input.includeProfile) scopes.push(SAFETY_SCOPE_KEYS.profile);
  if (input.includeSignals) scopes.push(SAFETY_SCOPE_KEYS.signals);
  if (input.allowPhoneMatch) scopes.push(SAFETY_SCOPE_KEYS.phoneMatch);
  return scopes;
}

export async function getSafetySettings(userId: string): Promise<SafetySettings> {
  const consent = await findActiveSafetyConsent(userId);
  if (!consent) {
    return {
      enabled: false,
      includeProfile: false,
      includeSignals: false,
      allowPhoneMatch: false,
      consentId: null,
      grantedAt: null,
    };
  }
  const granted = JSON.parse(consent.scopes) as string[];
  return {
    enabled: true,
    includeProfile: granted.includes(SAFETY_SCOPE_KEYS.profile),
    includeSignals: granted.includes(SAFETY_SCOPE_KEYS.signals),
    allowPhoneMatch: granted.includes(SAFETY_SCOPE_KEYS.phoneMatch),
    consentId: consent.id,
    grantedAt: consent.grantedAt.toISOString(),
  };
}

export async function updateSafetySettings(
  userId: string,
  input: SafetySettingsInput
): Promise<SafetySettings> {
  if (!input.enabled) {
    // Withdraw any active standing consent — checks stop immediately.
    const consent = await findActiveSafetyConsent(userId);
    if (consent) {
      await db.consent.update({
        where: { id: consent.id },
        data: { withdrawnAt: new Date() },
      });
      await recordAudit({
        actorType: "USER",
        actorId: userId,
        action: "SAFETY_SETTINGS_UPDATED",
        subjectType: "Consent",
        subjectId: consent.id,
        metadata: { outcome: "disabled" },
      });
      await notifyUser(
        userId,
        "SECURITY",
        "Safety checks turned off",
        "Members can no longer run safety checks on your handle or phone number. The change is effective immediately and audited."
      );
    }
    return getSafetySettings(userId);
  }

  const scopes = scopesFor(input);
  const existing = await findActiveSafetyConsent(userId);
  if (existing) {
    await db.consent.update({
      where: { id: existing.id },
      data: { scopes: JSON.stringify(scopes) },
    });
  } else {
    await db.consent.create({
      data: {
        userId,
        requester: SAFETY_REQUESTER,
        purpose: SAFETY_PURPOSE,
        scopes: JSON.stringify(scopes),
        policyVersion: CONSENT_POLICY_VERSION,
      },
    });
    await notifyUser(
      userId,
      "SECURITY",
      "Safety checks turned on",
      "Verified members can now run a safety check on your handle. You control what they see, every check is receipted, and you can turn this off at any time."
    );
  }
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "SAFETY_SETTINGS_UPDATED",
    subjectType: "Consent",
    metadata: { outcome: "enabled", scopes: scopes.length },
  });
  return getSafetySettings(userId);
}

// ---------------------------------------------------------------------------
// Sanitized assessment builder
// ---------------------------------------------------------------------------

interface AssessmentOptions {
  method: "HANDLE" | "PHONE" | "TRUST_LINK" | "QR";
  includeProfile: boolean;
  includeSignals: boolean;
  includeScore?: boolean; // token checks only (SCORE scope)
  attributes?: { key: string; value: string }[]; // token checks only (ATTRIBUTES scope)
}

export async function buildAssessment(
  subject: { id: string; displayName: string; handle: string },
  opts: AssessmentOptions
) {
  const [snapshot, identity, credentials] = await Promise.all([
    getScoreSnapshot(subject.id),
    db.trustIdentity.findUnique({
      where: { userId: subject.id },
      include: { identifiers: true },
    }),
    getCredentialsForUser(subject.id),
  ]);

  const now = Date.now();
  const level =
    identity && identity.status === "VERIFIED" && (identity.expiresAt?.getTime() ?? 0) > now
      ? identity.assuranceLevel
      : 0;

  const signals =
    opts.includeSignals && identity
      ? identity.identifiers
          .filter((i) => i.status === "ACTIVE" && (i.expiresAt?.getTime() ?? 0) > now)
          .map((i) => ({
            type: i.type,
            hint: i.hint,
            verifiedAt: i.verifiedAt.toISOString(),
            expiresAt: i.expiresAt?.toISOString() ?? null,
          }))
      : [];

  const assessment: Record<string, unknown> = {
    method: opts.method,
    checkedAt: new Date().toISOString(),
    headline: headlineForStatus(snapshot.status),
    summary: {
      status: snapshot.status,
      riskBand: snapshot.riskBand,
      assuranceLevel: level,
      // Stage 8 — lifecycle honesty: a frozen score is under human appeal
      // review; a stale one is past its horizon. Neither is a negative claim.
      state: (snapshot as { state?: string }).state ?? "ACTIVE",
    },
    signals,
    credentialsCount: credentials.filter(
      (c) => c.status === "ACTIVE" && (c.expiresAt ? Date.parse(c.expiresAt) > now : true)
    ).length,
    freshness: {
      assessedAt: snapshot.computedAt,
      expiresAt: snapshot.expiresAt,
      fresh: Date.parse(snapshot.expiresAt) > now,
    },
    explanation: snapshot.explanation, // already redacted + honest (NDPA §37)
    language: SAFETY_LANGUAGE,
  };
  if (opts.includeProfile) {
    assessment.subject = { displayName: subject.displayName, handle: subject.handle };
  }
  if (opts.includeScore) {
    // Score number only via SCORE-scoped trust links — handle checks stay
    // band-level (no false precision on a counterparty's behalf).
    assessment.score = { score: snapshot.score, confidence: snapshot.confidence };
  }
  if (opts.attributes && opts.attributes.length > 0) {
    assessment.attributes = opts.attributes;
  }
  return assessment;
}

// ---------------------------------------------------------------------------
// Run a safety check — POST /api/v1/safety/check
// ---------------------------------------------------------------------------

export interface SafetyCheckInput {
  handle?: string;
  phone?: string;
  link?: string; // trust link URL or raw token
  qr?: string; // QR payload (trust link URL or raw token)
}

export type SafetyCheckResult =
  | { outcome: "OK"; checkId: string; assessment: Record<string, unknown>; receipted: boolean }
  | {
      outcome: "SELF";
      checkId: string;
      message: string;
      assessment: Record<string, unknown>;
    }
  | { outcome: "UNAVAILABLE"; message: string } // anti-enumeration: identical shape
  | { outcome: "DEAD_LINK"; reason: "EXPIRED" | "REVOKED" | "VIEW_LIMIT" };

function extractToken(input: string): string {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const trust = url.searchParams.get("trust");
    if (trust) return trust;
  } catch {
    /* not a URL — treat as a raw token */
  }
  return trimmed;
}

function verifierIpHash(req: NextRequest): string | null {
  return hashIp(
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")
  );
}

export async function runSafetyCheck(
  verifier: { id: string; displayName: string; handle: string },
  input: SafetyCheckInput,
  req: NextRequest
): Promise<SafetyCheckResult> {
  const provided = [input.handle, input.phone, input.link, input.qr].filter(
    (v) => v !== undefined && v !== ""
  ).length;
  if (provided !== 1) {
    return { outcome: "UNAVAILABLE", message: "Provide exactly one of: handle, phone, link or qr." };
  }

  // ----- TRUST_LINK / QR (token scopes govern; named, receipted, counted) ----
  if (input.link !== undefined || input.qr !== undefined) {
    const method: "TRUST_LINK" | "QR" = input.qr !== undefined ? "QR" : "TRUST_LINK";
    const raw = extractToken((input.qr ?? input.link) as string);
    const view = await viewPublicCard(raw, req, {
      id: verifier.id,
      displayName: verifier.displayName,
      handle: verifier.handle,
    });
    if (view.outcome !== "OK") {
      // Dead links are honest about WHY (the verifier was handed the token by
      // the subject) — mirrors the public viewer's 410 semantics.
      if (view.outcome === "EXPIRED") return { outcome: "DEAD_LINK", reason: view.reason };
      return { outcome: "DEAD_LINK", reason: "REVOKED" };
    }
    const assessment = await buildAssessment(view.subject, {
      method,
      includeProfile: view.scopes.includes("PROFILE"),
      includeSignals: view.scopes.includes("SIGNALS"),
      includeScore: view.scopes.includes("SCORE"),
      attributes: view.attributes,
    });
    // Stage 10 — band-level network signals (counts only, k-anonymized).
    // The B2B Trust Decision API surface (trustdecision-service) is NOT
    // touched: its Stage 9 contract is frozen.
    assessment.network = await buildNetworkBlockFor(view.subject.id);
    const row = await db.safetyCheck.create({
      data: {
        verifierId: verifier.id,
        subjectId: view.subject.id,
        method,
        assessment: JSON.stringify(assessment),
        shareTokenId: view.shareTokenId,
        ipHash: verifierIpHash(req),
      },
    });
    await notifyUser(
      view.subject.id,
      "SECURITY",
      "A member ran a safety check on you",
      `@${verifier.handle} checked your Trust Card via ${method === "QR" ? "a QR Trust Card scan" : "a trust link"}. The assessment they saw is recorded in your safety-check receipts.`
    );
    await recordAudit({
      actorType: "USER",
      actorId: verifier.id,
      action: "SAFETY_CHECK_RUN",
      subjectType: "UserAccount",
      subjectId: view.subject.id,
      metadata: { method, outcome: "completed" },
    });
    return { outcome: "OK", checkId: row.id, assessment, receipted: true };
  }

  // ----- PHONE (consent-gated peppered-hash match) ---------------------------
  if (input.phone !== undefined) {
    const e164 = normalizePhoneE164(input.phone);
    if (!e164) {
      return { outcome: "UNAVAILABLE", message: "Enter a valid Nigerian mobile number." };
    }
    const fingerprint = phoneFingerprint(e164); // raw phone discarded here — never stored
    const identifier = await db.identityIdentifier.findFirst({
      where: { type: "PHONE", hash: fingerprint, status: "ACTIVE" },
      include: { trustIdentity: { include: { user: true } } },
    });
    const subject =
      identifier &&
      (identifier.expiresAt?.getTime() ?? 0) > Date.now() &&
      identifier.trustIdentity.status === "VERIFIED" &&
      identifier.trustIdentity.user.status === "ACTIVE"
        ? identifier.trustIdentity.user
        : null;
    if (!subject || subject.id === verifier.id) {
      // Anti-enumeration: no match, stale match or self — identical response.
      return {
        outcome: "UNAVAILABLE",
        message: "No safety-check profile is available for this number.",
      };
    }
    const settings = await getSafetySettings(subject.id);
    if (!settings.enabled || !settings.allowPhoneMatch) {
      return {
        outcome: "UNAVAILABLE",
        message: "No safety-check profile is available for this number.",
      };
    }
    const assessment = await buildAssessment(
      { id: subject.id, displayName: subject.displayName, handle: subject.handle },
      {
        method: "PHONE",
        includeProfile: settings.includeProfile,
        includeSignals: settings.includeSignals,
      }
    );
    assessment.network = await buildNetworkBlockFor(subject.id);
    const row = await db.safetyCheck.create({
      data: {
        verifierId: verifier.id,
        subjectId: subject.id,
        method: "PHONE",
        assessment: JSON.stringify(assessment),
        consentId: settings.consentId,
        ipHash: verifierIpHash(req),
      },
    });
    await notifyUser(
      subject.id,
      "SECURITY",
      "A member ran a safety check on you",
      `@${verifier.handle} ran a safety check using your verified phone number. The assessment they saw is recorded in your safety-check receipts.`
    );
    await recordAudit({
      actorType: "USER",
      actorId: verifier.id,
      action: "SAFETY_CHECK_RUN",
      subjectType: "UserAccount",
      subjectId: subject.id,
      metadata: { method: "PHONE", outcome: "completed" },
    });
    return { outcome: "OK", checkId: row.id, assessment, receipted: true };
  }

  // ----- HANDLE ----------------------------------------------------------------
  const handle = (input.handle ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
    return {
      outcome: "UNAVAILABLE",
      message: "Enter a valid handle (3–24 characters: a–z, 0–9, _).",
    };
  }
  const subject = await db.userAccount.findUnique({
    where: { handle },
    select: { id: true, displayName: true, handle: true, status: true },
  });

  // Self-check: your own assessment, no standing consent needed (it's you).
  if (subject && subject.id === verifier.id) {
    const assessment = await buildAssessment(subject, {
      method: "HANDLE",
      includeProfile: true,
      includeSignals: true,
    });
    assessment.network = await buildNetworkBlockFor(subject.id);
    const row = await db.safetyCheck.create({
      data: {
        verifierId: verifier.id,
        subjectId: verifier.id,
        method: "HANDLE",
        assessment: JSON.stringify(assessment),
      },
    });
    await recordAudit({
      actorType: "USER",
      actorId: verifier.id,
      action: "SAFETY_CHECK_RUN",
      subjectType: "UserAccount",
      subjectId: verifier.id,
      metadata: { method: "HANDLE", outcome: "self" },
    });
    return {
      outcome: "SELF",
      checkId: row.id,
      message:
        "This is your own profile — the assessment below is what a member would see if you turn on safety checks (subject to your sharing settings).",
      assessment,
    };
  }

  // Anti-enumeration: unknown handle and disabled checks are identical.
  const unavailable = {
    outcome: "UNAVAILABLE" as const,
    message: "No safety-check profile is available for this handle.",
  };

  if (!subject || subject.status !== "ACTIVE") {
    return unavailable;
  }
  const settings = await getSafetySettings(subject.id);
  if (!settings.enabled) {
    return unavailable;
  }
  const assessment = await buildAssessment(subject, {
    method: "HANDLE",
    includeProfile: settings.includeProfile,
    includeSignals: settings.includeSignals,
  });
  assessment.network = await buildNetworkBlockFor(subject.id);
  const row = await db.safetyCheck.create({
    data: {
      verifierId: verifier.id,
      subjectId: subject.id,
      method: "HANDLE",
      assessment: JSON.stringify(assessment),
      consentId: settings.consentId,
      ipHash: verifierIpHash(req),
    },
  });
  await notifyUser(
    subject.id,
    "SECURITY",
    "A member ran a safety check on you",
    `@${verifier.handle} ran a safety check on your handle before dealing with you. The assessment they saw is recorded in your safety-check receipts.`
  );
  await recordAudit({
    actorType: "USER",
    actorId: verifier.id,
    action: "SAFETY_CHECK_RUN",
    subjectType: "UserAccount",
    subjectId: subject.id,
    metadata: { method: "HANDLE", outcome: "completed" },
  });
  await pruneSafetyChecks(subject.id);
  return { outcome: "OK", checkId: row.id, assessment, receipted: true };
}

// ---------------------------------------------------------------------------
// Verifier read model — GET /api/v1/safety/checks
// ---------------------------------------------------------------------------

export async function getChecksByVerifier(verifierId: string) {
  const [rows, requests] = await Promise.all([
    db.safetyCheck.findMany({
      where: { verifierId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { subject: { select: { displayName: true, handle: true } } },
    }),
    db.trustRequest.findMany({
      where: { verifierId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { subject: { select: { displayName: true, handle: true } } },
    }),
  ]);
  const now = Date.now();
  return {
    checks: rows.map((r) => {
      let a: Record<string, unknown> = {};
      try {
        a = JSON.parse(r.assessment) as Record<string, unknown>;
      } catch {
        a = {};
      }
      const summary = (a.summary ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        method: r.method,
        subject: r.subject
          ? { displayName: r.subject.displayName, handle: r.subject.handle }
          : null,
        status: summary.status ?? null,
        riskBand: summary.riskBand ?? null,
        headline: (a.headline as string) ?? null,
        checkedAt: r.createdAt.toISOString(),
        self: r.verifierId === r.subjectId,
      };
    }),
    requests: requests.map((r) => ({
      id: r.id,
      subject: r.subject
        ? { displayName: r.subject.displayName, handle: r.subject.handle }
        : null,
      status: r.status === "PENDING" && r.expiresAt.getTime() <= now ? "EXPIRED" : r.status,
      message: r.message,
      respondedAt: r.respondedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------------------
// Subject read model — GET /api/v1/safety/me
// ---------------------------------------------------------------------------

export async function getSafetyMe(userId: string) {
  const [settings, checks, requests] = await Promise.all([
    getSafetySettings(userId),
    db.safetyCheck.findMany({
      where: { subjectId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { verifier: { select: { displayName: true, handle: true } } },
    }),
    db.trustRequest.findMany({
      where: { subjectId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { verifier: { select: { displayName: true, handle: true } } },
    }),
  ]);
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const [total, last7] = await Promise.all([
    db.safetyCheck.count({ where: { subjectId: userId } }),
    db.safetyCheck.count({
      where: { subjectId: userId, createdAt: { gte: new Date(weekAgo) } },
    }),
  ]);
  return {
    settings,
    stats: {
      totalChecks: total,
      last7Days: last7,
      lastCheckAt: checks[0]?.createdAt.toISOString() ?? null,
    },
    checksReceived: checks.map((c) => {
      let shown: Record<string, unknown> = {};
      try {
        shown = JSON.parse(c.assessment) as Record<string, unknown>;
      } catch {
        shown = {};
      }
      return {
        id: c.id,
        verifier: c.verifier
          ? { displayName: c.verifier.displayName, handle: c.verifier.handle }
          : null,
        method: c.method,
        checkedAt: c.createdAt.toISOString(),
        shown: {
          headline: shown.headline ?? null,
          status: (shown.summary as Record<string, unknown> | undefined)?.status ?? null,
          signalsCount: Array.isArray(shown.signals) ? (shown.signals as unknown[]).length : 0,
        },
      };
    }),
    requestsReceived: requests.map((r) => ({
      id: r.id,
      verifier: r.verifier
        ? { displayName: r.verifier.displayName, handle: r.verifier.handle }
        : null,
      status: r.status === "PENDING" && r.expiresAt.getTime() <= now ? "EXPIRED" : r.status,
      message: r.message,
      expiresAt: r.expiresAt.toISOString(),
      respondedAt: r.respondedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    language: SAFETY_LANGUAGE,
  };
}

// ---------------------------------------------------------------------------
// Trust Requests
// ---------------------------------------------------------------------------

const TRUST_REQUEST_MESSAGE =
  "asks you to share your Trust Card before you deal — accept to mint a scoped, receipted trust link.";

export async function sendTrustRequest(
  verifier: { id: string; handle: string },
  handleInput: string
): Promise<
  | { outcome: "OK"; requestId: string; expiresAt: string }
  | { outcome: "UNAVAILABLE"; message: string }
  | { outcome: "ALREADY_REQUESTED"; requestId: string }
  | { outcome: "SELF"; message: string }
> {
  const handle = handleInput.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
    return { outcome: "UNAVAILABLE", message: "Enter a valid handle." };
  }
  const subject = await db.userAccount.findUnique({
    where: { handle },
    select: { id: true, handle: true, displayName: true, status: true },
  });
  if (!subject || subject.status !== "ACTIVE") {
    return { outcome: "UNAVAILABLE", message: "No member found for this handle." };
  }
  if (subject.id === verifier.id) {
    return { outcome: "SELF", message: "That's your own handle — no request needed." };
  }
  const existing = await db.trustRequest.findFirst({
    where: { verifierId: verifier.id, subjectId: subject.id, status: "PENDING" },
  });
  if (existing && existing.expiresAt.getTime() > Date.now()) {
    return { outcome: "ALREADY_REQUESTED", requestId: existing.id };
  }
  const row = await db.trustRequest.create({
    data: {
      verifierId: verifier.id,
      subjectId: subject.id,
      message: `@${verifier.handle} ${TRUST_REQUEST_MESSAGE}`,
      expiresAt: new Date(Date.now() + TRUST_REQUEST_TTL_MS),
    },
  });
  await notifyUser(
    subject.id,
    "SYSTEM",
    "New trust request",
    `@${verifier.handle} asked you to share your Trust Card before you deal. Accept to mint a scoped, receipted trust link — or decline. The request expires in 7 days.`
  );
  await recordAudit({
    actorType: "USER",
    actorId: verifier.id,
    action: "TRUST_REQUEST_SENT",
    subjectType: "UserAccount",
    subjectId: subject.id,
    metadata: { outcome: "sent" },
  });
  return { outcome: "OK", requestId: row.id, expiresAt: row.expiresAt.toISOString() };
}

export type TrustRequestResponse =
  | {
      outcome: "OK";
      decision: "ACCEPTED" | "DECLINED";
      token?: string; // raw token, returned exactly ONCE (the subject's to keep)
      linkPath?: string;
    }
  | { outcome: "NOT_FOUND" }
  | { outcome: "NOT_PENDING" }
  | { outcome: "EXPIRED" };

export async function respondTrustRequest(
  subjectId: string,
  requestId: string,
  decision: "ACCEPT" | "DECLINE"
): Promise<TrustRequestResponse> {
  const row = await db.trustRequest.findUnique({ where: { id: requestId } });
  if (!row || row.subjectId !== subjectId) return { outcome: "NOT_FOUND" };
  if (row.status !== "PENDING") return { outcome: "NOT_PENDING" };
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.trustRequest.update({ where: { id: row.id }, data: { status: "EXPIRED" } });
    return { outcome: "EXPIRED" };
  }

  if (decision === "DECLINE") {
    await db.trustRequest.update({
      where: { id: row.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    await notifyUser(
      row.verifierId,
      "SYSTEM",
      "Trust request declined",
      "The member declined to share their Trust Card. Nothing was shared — no data left their account."
    );
    await recordAudit({
      actorType: "USER",
      actorId: subjectId,
      action: "TRUST_REQUEST_DECLINED",
      subjectType: "TrustRequest",
      subjectId: row.id,
      metadata: { outcome: "declined" },
    });
    return { outcome: "OK", decision: "DECLINED" };
  }

  // ACCEPT: mint a scoped trust link (the subject's token, their control),
  // then run the named assessment FOR the verifier through it — counted,
  // receipted, snapshotted into the verifier's Safety Check history.
  const raw = `ts_${randomBytes(24).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + TRUST_REQUEST_TTL_MS);
  const token = await db.shareToken.create({
    data: {
      userId: subjectId,
      tokenHash: sha256Hex(`share:${raw}`),
      scopes: JSON.stringify(["PROFILE", "SIGNALS", "SCORE"]),
      maxViews: TOKEN_MAX_VIEWS,
      expiresAt,
    },
  });
  await db.trustRequest.update({
    where: { id: row.id },
    data: { status: "ACCEPTED", respondedAt: new Date(), shareTokenId: token.id },
  });
  await recordAudit({
    actorType: "USER",
    actorId: subjectId,
    action: "TRUST_REQUEST_ACCEPTED",
    subjectType: "TrustRequest",
    subjectId: row.id,
    metadata: { outcome: "accepted", maxViews: TOKEN_MAX_VIEWS, scopes: 3 },
  });

  const [subject, verifier] = await Promise.all([
    db.userAccount.findUnique({
      where: { id: subjectId },
      select: { id: true, displayName: true, handle: true },
    }),
    db.userAccount.findUnique({
      where: { id: row.verifierId },
      select: { id: true, displayName: true, handle: true },
    }),
  ]);
  if (subject && verifier) {
    // Named open: counts view #1, writes the receipt, notifies on first open.
    const view = await viewPublicCard(raw, undefined, {
      id: verifier.id,
      displayName: verifier.displayName,
      handle: verifier.handle,
    });
    if (view.outcome === "OK") {
      const assessment = await buildAssessment(view.subject, {
        method: "TRUST_LINK",
        includeProfile: view.scopes.includes("PROFILE"),
        includeSignals: view.scopes.includes("SIGNALS"),
        includeScore: view.scopes.includes("SCORE"),
        attributes: view.attributes,
      });
      await db.safetyCheck.create({
        data: {
          verifierId: verifier.id,
          subjectId: subject.id,
          method: "TRUST_LINK",
          assessment: JSON.stringify(assessment),
          shareTokenId: token.id,
        },
      });
    }
    await notifyUser(
      verifier.id,
      "SYSTEM",
      "Trust request accepted",
      `@${subject.handle} accepted your trust request. Their assessment is ready in your Safety Check history — and the trust link is theirs to share with you directly.`
    );
    await notifyUser(
      subjectId,
      "SECURITY",
      "Trust link minted",
      `A trust link was minted for @${verifier.handle} (10 opens, 7 days). Every open is receipted. Keep the link below — it is shown only once.`
    );
  }
  return { outcome: "OK", decision: "ACCEPTED", token: raw, linkPath: `/?trust=${raw}` };
}

// ---------------------------------------------------------------------------
// Retention — keep the most recent CHECKS_RETAIN checks per subject
// ---------------------------------------------------------------------------

export async function pruneSafetyChecks(userId: string) {
  const stale = await db.safetyCheck.findMany({
    where: { subjectId: userId },
    orderBy: { createdAt: "desc" },
    skip: CHECKS_RETAIN,
    select: { id: true },
  });
  if (stale.length > 0) {
    await db.safetyCheck.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }
}
