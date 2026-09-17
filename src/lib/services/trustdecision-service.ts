// TrustScore Stage 9 — TrustDecisionService (the B2B Trust Decision API).
// POST /api/v1/trust/check — authenticated with an API key, NOT a session.
//
// What this endpoint IS: a consent-gated, band-level assessment surface for
// integrated businesses — the B2B twin of the member Safety Check. Subjects
// control API checks through the SAME standing SAFETY_CHECK consent; every
// completed check is receipted to the subject with the BUSINESS's name and
// generates a notification; responses carry the locked language (directive
// §50 — NEVER "this person is safe").
//
// What it is NOT: an automated significant decision. The response says so
// explicitly: TrustScore never auto-approves or auto-rejects a person; a
// business's significant decisions need their own human review (NDPA §37).
// That is why this endpoint works regardless of the engine's automated-
// decision gate — it provides information, not decisions.
//
// Red lines carried over from the member surface:
//   * band-level only — the score NUMBER is never returned here (SCORE-scoped
//     trust links are the only path to the number, and they stay member-owned)
//   * anti-enumeration: unknown handle ≡ disabled ≡ un-consented — byte-
//     identical UNAVAILABLE responses; no subject rows written for probes
//   * raw phone is hashed server-side and discarded — never stored, echoed
//     or logged (directive §38)
//   * rate limits per key + real daily plan quotas; auth failures are
//     rate-limited per IP (key-guessing resistance)

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sha256Hex } from "@/lib/platform/crypto";
import { rateLimit, clientKey } from "@/lib/platform/http";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser } from "@/lib/services/notification-service";
import { buildAssessment, getSafetySettings } from "@/lib/services/safety-service";
import { viewPublicCard } from "@/lib/services/passport-service";
import { normalizePhoneE164, phoneFingerprint } from "@/lib/providers/phone-provider";
import { recordUsage, getDailyQuotaState, DAILY_QUOTA } from "@/lib/services/devportal-service";
import { enqueueDelivery, processDueDeliveries } from "@/lib/services/webhook-service";

const RATE_LIMIT_PER_KEY_PER_MIN = 60;
const AUTH_FAILS_PER_IP_PER_MIN = 10;

export const DECISION_NOTE =
  "This endpoint returns an assessment, not a decision: TrustScore never auto-approves or auto-rejects a person. Use it to inform your own review — significant decisions about a person require human judgment (NDPA §37).";

export const API_HONESTY_NOTE =
  "SANDBOX/LIVE labels describe integration posture. Underlying identity providers remain contract-first MOCK until partner credentials exist — no live government, MNO or biometric integration is claimed.";

// ---------------------------------------------------------------------------
// Transaction context (directive §22 — transaction-specific trust).
// The SAME identity may need different evidence for a marketplace sale vs a
// rental application; the purpose labels the check end-to-end: it is stored
// on the TrustDecision, shown to the subject on the receipt + notification,
// and echoed in the webhook payload. Optional + backward-compatible — checks
// without a purpose behave exactly as before (general screening).
// ---------------------------------------------------------------------------

export const PURPOSE_OPTIONS = [
  "marketplace_transaction",
  "employment",
  "rental",
  "professional_engagement",
  "high_value_transaction",
  "b2b_onboarding",
  "general_screening",
] as const;

export type CheckPurpose = (typeof PURPOSE_OPTIONS)[number];

const PURPOSE_LABELS: Record<CheckPurpose, string> = {
  marketplace_transaction: "a marketplace transaction",
  employment: "employment screening",
  rental: "rental screening",
  professional_engagement: "a professional engagement",
  high_value_transaction: "a high-value transaction",
  b2b_onboarding: "business onboarding",
  general_screening: "general screening",
};

export function purposeLabel(purpose?: string | null): string {
  return PURPOSE_LABELS[(purpose ?? "general_screening") as CheckPurpose] ?? PURPOSE_LABELS.general_screening;
}

// ---------------------------------------------------------------------------
// API-key authentication (raw key exists only in the caller's header)
// ---------------------------------------------------------------------------

export interface ApiCaller {
  keyId: string;
  clientId: string;
  clientName: string;
  clientStatus: string;
  environment: string;
  plan: string;
  scope: string;
}

export type AuthResult =
  | { ok: true; caller: ApiCaller }
  | { ok: false; code: "UNAUTHENTICATED" | "RATE_LIMITED" | "QUOTA_EXCEEDED"; message: string };

export async function authenticateApiKey(
  req: NextRequest,
  requestId: string
): Promise<AuthResult> {
  const raw = req.headers.get("x-api-key")?.trim() ?? "";
  // Auth-failure rate limit (per IP) — applies to EVERY failure mode
  // (malformed, unknown, revoked, suspended) so key-probing is bounded.
  const failLimit = () => rateLimit(clientKey(req, "trust-api-auth"), AUTH_FAILS_PER_IP_PER_MIN, 60_000);
  const authRejected = (message: string): AuthResult => {
    const rl = failLimit();
    if (!rl.allowed) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: "Too many failed API-key attempts from this address — retry shortly.",
      };
    }
    return { ok: false, code: "UNAUTHENTICATED", message };
  };
  if (!raw || !/^tsk_(live|sandbox)_[a-f0-9]{48}$/.test(raw)) {
    // Uniform 401 — never reveal whether a key exists (guessing resistance).
    return authRejected("Missing or malformed API key. Pass it in the X-API-Key header.");
  }
  const key = await db.apiKey.findUnique({
    where: { keyHash: sha256Hex(raw) },
    include: { client: true },
  });
  if (!key || key.status !== "ACTIVE" || key.scope !== "TRUST_CHECK") {
    return authRejected("This API key is not valid or is revoked.");
  }
  if (key.client.status !== "ACTIVE") {
    return authRejected("This API client is suspended.");
  }
  // Per-key rate limit.
  const rl = rateLimit(`trust-check:${key.id}`, RATE_LIMIT_PER_KEY_PER_MIN, 60_000);
  if (!rl.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Trust Decision API rate limit reached (60/min per key).",
    };
  }
  // Real daily plan quota.
  const remaining = await getDailyQuotaState(key.clientId, key.client.plan);
  if (remaining <= 0) {
    await recordAudit({
      actorType: "SYSTEM",
      action: "API_QUOTA_EXCEEDED",
      subjectType: "ApiClient",
      subjectId: key.clientId,
      metadata: { plan: key.client.plan },
    });
    return {
      ok: false,
      code: "QUOTA_EXCEEDED",
      message: `Daily quota exhausted for the ${key.client.plan} plan (${DAILY_QUOTA[key.client.plan] ?? 0} checks/day). Upgrade the plan or wait for the UTC daily reset.`,
    };
  }
  void requestId; // audit events carry their own request ids where needed
  return {
    ok: true,
    caller: {
      keyId: key.id,
      clientId: key.clientId,
      clientName: key.client.name,
      clientStatus: key.client.status,
      environment: key.client.environment,
      plan: key.client.plan,
      scope: key.scope,
    },
  };
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

export interface DecisionInput {
  handle?: string;
  phone?: string;
  link?: string;
  qr?: string;
  purpose?: CheckPurpose; // transaction context (directive §22) — receipt-labeled
}

export interface DecisionResponse {
  decision:
    | {
        outcome: "OK";
        checkId: string;
        receipted: boolean;
        assessment: Record<string, unknown>;
      }
    | { outcome: "UNAVAILABLE"; message: string } // anti-enumeration: identical shape
    | { outcome: "DEAD_LINK"; reason: "EXPIRED" | "REVOKED" | "VIEW_LIMIT" };
  environment: string;
  providerMode: "MOCK";
  quota: { plan: string; limit: number; remaining: number };
  note: string;
  honesty: string;
  requestId: string;
}

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

export async function runTrustDecision(
  caller: ApiCaller,
  input: DecisionInput,
  requestId: string
): Promise<{ status: number; body: DecisionResponse }> {
  const started = Date.now();
  const provided = [input.handle, input.phone, input.link, input.qr].filter(
    (v) => v !== undefined && v !== ""
  ).length;
  const purpose = input.purpose ?? "general_screening";
  const purposeText = purposeLabel(purpose);

  const client = await db.apiClient.findUnique({ where: { id: caller.clientId } });

  const finish = async (
    status: number,
    decision: DecisionResponse["decision"],
    extra?: {
      subjectId?: string | null;
      method?: string;
      inputHint?: string;
      assessment?: Record<string, unknown> | null;
      consentId?: string | null;
      shareTokenId?: string | null;
    }
  ): Promise<{ status: number; body: DecisionResponse }> => {
    const outcome =
      decision.outcome === "OK" ? "OK" : decision.outcome === "UNAVAILABLE" ? "UNAVAILABLE" : "DEAD_LINK";
    await db.trustDecision.create({
      data: {
        clientId: caller.clientId,
        keyId: caller.keyId,
        subjectId: extra?.subjectId ?? null,
        method: extra?.method ?? "HANDLE",
        purpose,
        inputHint: extra?.inputHint ?? "invalid",
        outcome,
        assessment: extra?.assessment ? JSON.stringify(extra.assessment) : null,
        consentId: extra?.consentId ?? null,
        shareTokenId: extra?.shareTokenId ?? null,
        requestId,
      },
    });
    await recordUsage(caller.keyId, caller.clientId, "/api/v1/trust/check", status, outcome, Date.now() - started);
    // Receipt to the subject for HANDLE/PHONE checks (link checks are already
    // receipted inside viewPublicCard with the business named). The receipt is
    // the who-checked-you log: channel API_CHECK, band-level cardShown only.
    if (outcome === "OK" && extra?.subjectId && (extra?.method === "HANDLE" || extra?.method === "PHONE")) {
      const summary = (extra?.assessment?.summary ?? {}) as Record<string, unknown>;
      await db.trustReceipt.create({
        data: {
          userId: extra.subjectId,
          viewerLabel: `Trust API check by ${caller.clientName} — ${purposeText}`,
          channel: "API_CHECK",
          cardShown: JSON.stringify({
            status: summary.status ?? null,
            riskBand: summary.riskBand ?? null,
          }),
        },
      });
      const stale = await db.trustReceipt.findMany({
        where: { userId: extra.subjectId },
        orderBy: { viewedAt: "desc" },
        skip: 50,
        select: { id: true },
      });
      if (stale.length > 0) {
        await db.trustReceipt.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
      }
    }
    await recordAudit({
      actorType: "USER", // the business acts through its owner's account
      actorId: client?.ownerId,
      action: "TRUST_DECISION_API",
      subjectType: "ApiClient",
      subjectId: caller.clientId,
      metadata: { method: extra?.method ?? "none", purpose, outcome, environment: caller.environment },
    });
    // Fire the webhook (attempt #1 synchronous; response does not depend on it).
    // The `subject` field follows the SAME profile-scope rule as the assessment:
    // phone checks never echo a handle the business did not provide.
    if (client?.webhookUrl && client.webhookSecret) {
      const assessmentSubject = (extra?.assessment?.subject ?? null) as
        | { handle?: string; displayName?: string }
        | null;
      await enqueueDelivery(client, "TRUST_CHECK_COMPLETED", {
        requestId,
        decisionId: requestId,
        outcome,
        method: extra?.method ?? null,
        purpose,
        subject: assessmentSubject?.handle ? `@${assessmentSubject.handle}` : null,
        assessment:
          extra?.assessment && outcome === "OK"
            ? {
                headline: extra.assessment.headline,
                status: (extra.assessment.summary as Record<string, unknown> | undefined)?.status ?? null,
                riskBand: (extra.assessment.summary as Record<string, unknown> | undefined)?.riskBand ?? null,
                freshness: extra.assessment.freshness ?? null,
              }
            : null,
        note: DECISION_NOTE,
      });
    }
    const quotaRemaining = await getDailyQuotaState(caller.clientId, caller.plan);
    return {
      status,
      body: {
        decision,
        environment: caller.environment,
        providerMode: "MOCK",
        quota: {
          plan: caller.plan,
          limit: DAILY_QUOTA[caller.plan] ?? 0,
          remaining: Math.max(0, quotaRemaining),
        },
        note: DECISION_NOTE,
        honesty: API_HONESTY_NOTE,
        requestId,
      },
    };
  };

  if (provided !== 1) {
    return finish(422, { outcome: "UNAVAILABLE", message: "Provide exactly one of: handle, phone, link or qr." });
  }

  await processDueDeliveries(caller.clientId);

  // ----- TRUST_LINK / QR (token scopes govern; counted + receipted) --------
  if (input.link !== undefined || input.qr !== undefined) {
    const method = input.qr !== undefined ? "QR" : "TRUST_LINK";
    const raw = extractToken((input.qr ?? input.link) as string);
    // The business acts as the NAMED viewer — receipts say which business
    // checked (channel API_CHECK), never a forged member handle.
    const view = await viewPublicCard(raw, undefined, {
      id: `client:${caller.clientId}`,
      displayName: caller.clientName,
      handle: `app:${caller.clientName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20)}`,
      kind: "API_CLIENT",
    });
    if (view.outcome !== "OK") {
      const reason = view.outcome === "EXPIRED" ? view.reason : "REVOKED";
      return finish(200, { outcome: "DEAD_LINK", reason }, { method, inputHint: "trust link" });
    }
    const assessment = await buildAssessment(view.subject, {
      method,
      includeProfile: view.scopes.includes("PROFILE"),
      includeSignals: view.scopes.includes("SIGNALS"),
      includeScore: false, // score number stays member-only (SCORE scope does NOT leak via B2B)
      attributes: view.attributes,
    });
    // B2B checks never include the score number even for SCORE-scoped links —
    // strip to band-level (business surface policy, documented in the portal).
    await notifyUser(
      view.subject.id,
      "SECURITY",
      "A business ran a trust check on you",
      `${caller.clientName} (an integrated business) checked your Trust Card via the Trust Decision API using ${method === "QR" ? "a QR Trust Card scan" : "a trust link"}, for ${purposeText}. The assessment they saw is recorded in your receipts.`
    );
    return finish(
      200,
      { outcome: "OK", checkId: requestId, receipted: true, assessment },
      {
        subjectId: view.subject.id,
        method,
        inputHint: "trust link",
        assessment,
        shareTokenId: view.shareTokenId,
      }
    );
  }

  // ----- PHONE (consent-gated peppered-hash match; raw digits discarded) ----
  if (input.phone !== undefined) {
    const e164 = normalizePhoneE164(input.phone);
    if (!e164) {
      return finish(422, { outcome: "UNAVAILABLE", message: "Enter a valid Nigerian mobile number." }, { method: "PHONE", inputHint: "invalid" });
    }
    const fingerprint = phoneFingerprint(e164); // raw phone discarded here
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
    const unavailable = {
      outcome: "UNAVAILABLE" as const,
      message: "No trust profile is available for this number.",
    };
    if (!subject) {
      return finish(200, unavailable, { method: "PHONE", inputHint: "verified phone (hashed)" });
    }
    const settings = await getSafetySettings(subject.id);
    if (!settings.enabled || !settings.allowPhoneMatch) {
      return finish(200, unavailable, { method: "PHONE", inputHint: "verified phone (hashed)" });
    }
    const assessment = await buildAssessment(
      { id: subject.id, displayName: subject.displayName, handle: subject.handle },
      { method: "PHONE", includeProfile: settings.includeProfile, includeSignals: settings.includeSignals }
    );
    await notifyUser(
      subject.id,
      "SECURITY",
      "A business ran a trust check on you",
      `${caller.clientName} (an integrated business) ran a trust check using your verified phone number via the Trust Decision API, for ${purposeText}. The assessment they saw is recorded in your receipts.`
    );
    return finish(
      200,
      { outcome: "OK", checkId: requestId, receipted: true, assessment },
      {
        subjectId: subject.id,
        method: "PHONE",
        inputHint: "verified phone (hashed)",
        assessment,
        consentId: settings.consentId,
      }
    );
  }

  // ----- HANDLE (subject's standing consent governs) -------------------------
  const handle = (input.handle ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
    return finish(
      422,
      { outcome: "UNAVAILABLE", message: "Enter a valid handle (3–24 characters: a–z, 0–9, _)." },
      { method: "HANDLE", inputHint: "invalid" }
    );
  }
  const subject = await db.userAccount.findUnique({
    where: { handle },
    select: { id: true, displayName: true, handle: true, status: true },
  });

  const unavailable = {
    outcome: "UNAVAILABLE" as const,
    message: "No trust profile is available for this handle.",
  };

  // Owner self-check: the owner already holds this data via their passport —
  // allow it (useful for integration smoke tests), no receipt, no notification.
  if (subject && subject.id === client?.ownerId) {
    const assessment = await buildAssessment(subject, {
      method: "HANDLE",
      includeProfile: true,
      includeSignals: true,
    });
    return finish(
      200,
      { outcome: "OK", checkId: requestId, receipted: false, assessment },
      {
        subjectId: subject.id,
        method: "HANDLE",
        inputHint: `@${handle} (self)`,
        assessment,
      }
    );
  }

  if (!subject || subject.status !== "ACTIVE") {
    return finish(200, unavailable, { method: "HANDLE", inputHint: `@${handle}` });
  }
  const settings = await getSafetySettings(subject.id);
  if (!settings.enabled) {
    return finish(200, unavailable, { method: "HANDLE", inputHint: `@${handle}` });
  }
  const assessment = await buildAssessment(subject, {
    method: "HANDLE",
    includeProfile: settings.includeProfile,
    includeSignals: settings.includeSignals,
  });
  await notifyUser(
    subject.id,
    "SECURITY",
    "A business ran a trust check on you",
    `${caller.clientName} (an integrated business) ran a trust check on your handle via the Trust Decision API, for ${purposeText}. The assessment they saw is recorded in your receipts.`
  );
  return finish(
    200,
    { outcome: "OK", checkId: requestId, receipted: true, assessment },
    {
      subjectId: subject.id,
      method: "HANDLE",
      inputHint: `@${handle}`,
      assessment,
      consentId: settings.consentId,
    }
  );
}
