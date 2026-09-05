// TrustScore Stage 5–7 — TrustScore engine (directive §35/§36 score contract).
//
// Formula (directive §36):
//   score = Identity Assurance + Verified Reputation + Verified Credentials
//           + Resolution History − Confirmed Risk
//
// Component budgets (documented, versioned, explained — NDPA §37 requires
// meaningful explanation of automated decisions, which the passport surfaces):
//   identityAssurance   max 60  (L1 20 / L2 34 / L3 47 / L4 60, freshness-scaled)
//   verifiedCredentials max 20  (6 per fresh ACTIVE credential)
//   verifiedReputation  max 15  (Stage 7: verified interactions — +3 per distinct
//                                L2+ verifier who ran a consent-backed check
//                                on the subject in the last 90 days, cap 5)
//   resolutionHistory   max 10  (Stage 7: +2 per human-reviewed cleared flag,
//                                cap 5)
//   confirmedRisk       penalty (−25 per confirmed flag, cap −50; flags arrive
//                                Stage 7, outcomes are HUMAN decisions)
//
// Output contract: Score (0–100) + Confidence (0–100) + Risk Band
// (LOW/MEDIUM/HIGH) + Status (NEW/VERIFIED/ESTABLISHED/CAUTION/HIGH_RISK/
// REVIEW_REQUIRED) + Explanation[] + Freshness (computedAt → expiresAt 24h).
//
// Snapshots are immutable rows: a new one is written when inputs change
// (inputsHash) or the 24h TTL lapses. Old snapshots beyond the latest 20 are
// pruned. The engine NEVER says "this person is safe" (directive §50) — the
// public card language is locked to "No confirmed adverse signals found".

import { db } from "@/lib/db";
import { sha256Hex } from "@/lib/platform/crypto";

export const SCORE_VERSION = 1;
export const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000; // 24h freshness
export const SNAPSHOT_RETAIN = 20; // last N snapshots kept per user

export type ScoreStatus =
  | "NEW"
  | "VERIFIED"
  | "ESTABLISHED"
  | "CAUTION"
  | "HIGH_RISK"
  | "REVIEW_REQUIRED";

export interface ScoreComponent {
  key: string;
  label: string;
  value: number;
  max: number;
  note: string;
}

export interface ComputedScore {
  status: ScoreStatus;
  score: number;
  confidence: number;
  riskBand: "LOW" | "MEDIUM" | "HIGH";
  components: ScoreComponent[];
  explanation: string[];
  inputsHash: string;
  trigger: "INITIAL" | "MATERIAL_CHANGE" | "PERIODIC";
  computedAt: string; // ISO
  expiresAt: string; // ISO
}

const ASSURANCE_BASE: Record<number, number> = { 0: 0, 1: 20, 2: 34, 3: 47, 4: 60 };

interface ScoreInputs {
  identity: {
    status: string;
    assuranceLevel: number;
    govExpiresAt: Date | null;
    verifiedAt: Date | null;
  } | null;
  activeEvidence: {
    id: string;
    type: string;
    status: string;
    confidence: number;
    expiresAt: Date | null;
  }[];
  credentials: {
    id: string;
    type: string;
    status: string;
    expiresAt: Date | null;
    manualRevoked: boolean;
  }[];
  // Stage 7 — reputation inputs (computed here so the engine owns its inputs)
  verifiedInteractions: number; // distinct L2+ verifiers, consent-backed checks, 90d
  clearedFlags: number; // human-reviewed UNFOUNDED / DISMISSED / OVERTURNED
  confirmedFlags: number; // human-confirmed flags (appeals upheld or none)
}

// Verified-interaction horizon: checks older than 90 days stop counting —
// reputation must be earned continuously, not banked once.
const INTERACTION_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

async function collectReputationInputs(userId: string): Promise<{
  verifiedInteractions: number;
  clearedFlags: number;
  confirmedFlags: number;
}> {
  const flags = await db.flag.findMany({
    where: { subjectId: userId },
    select: { status: true },
  });
  const confirmedFlags = flags.filter((f) => f.status === "RESOLVED_CONFIRMED").length;
  const clearedFlags = flags.filter((f) =>
    ["RESOLVED_UNFOUNDED", "RESOLVED_DISMISSED"].includes(f.status)
  ).length;

  // Verified interactions: distinct verifiers who ran a CONSENT-BACKED check
  // (handle / trust link / QR — never the anonymous phone probe) on this
  // member within the window, and who currently hold L2+.
  const checks = await db.safetyCheck.findMany({
    where: {
      subjectId: userId,
      method: { in: ["HANDLE", "TRUST_LINK", "QR"] },
      createdAt: { gte: new Date(Date.now() - INTERACTION_WINDOW_MS) },
    },
    select: { verifierId: true },
  });
  const verifierIds = [...new Set(checks.map((c) => c.verifierId))].filter(
    (id) => id !== userId
  );
  let verifiedInteractions = 0;
  if (verifierIds.length > 0) {
    const identities = await db.trustIdentity.findMany({
      where: { userId: { in: verifierIds } },
      select: { userId: true, status: true, assuranceLevel: true, expiresAt: true },
    });
    const now = Date.now();
    for (const id of identities) {
      const live = id.status === "VERIFIED" && (id.expiresAt?.getTime() ?? 0) > now;
      if (live && id.assuranceLevel >= 2) verifiedInteractions += 1;
    }
  }
  return { verifiedInteractions, clearedFlags, confirmedFlags };
}

async function collectInputs(userId: string): Promise<ScoreInputs> {
  const identity = await db.trustIdentity.findUnique({
    where: { userId },
    select: {
      status: true,
      assuranceLevel: true,
      expiresAt: true,
      verifiedAt: true,
      evidence: {
        where: { status: "ACTIVE" },
        select: { id: true, type: true, confidence: true, expiresAt: true },
      },
    },
  });
  const credentials = await db.credential.findMany({
    where: { userId },
    select: { id: true, type: true, status: true, expiresAt: true, manualRevoked: true },
  });
  const reputation = await collectReputationInputs(userId);
  return {
    identity: identity
      ? {
          status: identity.status,
          assuranceLevel: identity.assuranceLevel,
          govExpiresAt: identity.expiresAt,
          verifiedAt: identity.verifiedAt,
        }
      : null,
    activeEvidence: (identity?.evidence ?? []).map((e) => ({
      id: e.id,
      type: e.type,
      status: "ACTIVE" as const,
      confidence: e.confidence,
      expiresAt: e.expiresAt,
    })),
    credentials,
    verifiedInteractions: reputation.verifiedInteractions,
    clearedFlags: reputation.clearedFlags,
    confirmedFlags: reputation.confirmedFlags,
  };
}

function inputsHashFor(inputs: ScoreInputs): string {
  const canonical = JSON.stringify({
    i: inputs.identity
      ? [inputs.identity.status, inputs.identity.assuranceLevel, inputs.identity.govExpiresAt?.getTime() ?? null]
      : null,
    e: inputs.activeEvidence
      .map((e) => [e.id, e.status ?? "ACTIVE", e.expiresAt?.getTime() ?? null])
      .sort(),
    c: inputs.credentials.map((c) => [c.type, c.status, c.manualRevoked]).sort(),
    r: [inputs.confirmedFlags, inputs.clearedFlags, inputs.verifiedInteractions],
  });
  return sha256Hex(canonical);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function computeScoreFromInputs(
  inputs: ScoreInputs,
  trigger: ComputedScore["trigger"]
): ComputedScore {
  const now = Date.now();
  const identityLive =
    inputs.identity !== null &&
    inputs.identity.status === "VERIFIED" &&
    (inputs.identity.govExpiresAt?.getTime() ?? 0) > now;
  const identityStale =
    inputs.identity !== null &&
    inputs.identity.status === "VERIFIED" &&
    (inputs.identity.govExpiresAt?.getTime() ?? 0) <= now;
  const level = identityLive ? inputs.identity!.assuranceLevel : 0;

  // --- Identity Assurance (max 60) -----------------------------------------
  const govDaysLeft = identityLive
    ? Math.max(0, (inputs.identity!.govExpiresAt!.getTime() - now) / 86_400_000)
    : 0;
  const freshnessFactor = !identityLive ? 0 : govDaysLeft >= 15 ? 1 : govDaysLeft >= 1 ? 0.9 : 0.75;
  const assuranceValue = Math.round((ASSURANCE_BASE[clamp(level, 0, 4)] ?? 0) * freshnessFactor);

  // --- Verified Credentials (max 20) ---------------------------------------
  const freshCredentials = inputs.credentials.filter(
    (c) => c.status === "ACTIVE" && (c.expiresAt?.getTime() ?? Infinity) > now
  );
  const credentialValue = clamp(freshCredentials.length * 6, 0, 20);

  // --- Verified Reputation (max 15) / Resolution History (max 10) ----------
  // Stage 7: both components are REAL platform data (no provider involved).
  // Verified interactions: distinct L2+ members who ran consent-backed
  // checks on the subject in the last 90 days (+3 each, cap 5). Cleared
  // flags: human-reviewed UNFOUNDED/DISMISSED (+2 each, cap 5).
  const reputationValue = Math.min(5, inputs.verifiedInteractions) * 3;
  const resolutionValue = Math.min(5, inputs.clearedFlags) * 2;

  // --- Confirmed Risk (penalty) — human-confirmed flags (Stage 7) ---------
  const riskPenalty = Math.min(2, inputs.confirmedFlags) * 25;

  const score = clamp(
    assuranceValue + credentialValue + reputationValue + resolutionValue - riskPenalty,
    0,
    100
  );

  // --- Confidence -----------------------------------------------------------
  const freshEvidence = inputs.activeEvidence.filter(
    (e) => (e.expiresAt?.getTime() ?? Infinity) > now
  );
  const allFresh =
    freshEvidence.length === inputs.activeEvidence.length && identityLive;
  const confidence = !inputs.identity
    ? 15
    : clamp(40 + Math.min(40, freshEvidence.length * 10) + (allFresh ? 20 : 0), 0, 100);

  // --- Status + risk band ---------------------------------------------------
  let status: ScoreStatus;
  let riskBand: "LOW" | "MEDIUM" | "HIGH";
  if (inputs.confirmedFlags > 0) {
    status = inputs.confirmedFlags >= 2 ? "HIGH_RISK" : "REVIEW_REQUIRED";
    riskBand = "HIGH";
  } else if (identityStale) {
    status = "CAUTION";
    riskBand = "MEDIUM";
  } else if (!inputs.identity || inputs.identity.status === "NONE" || level === 0) {
    status = "NEW";
    riskBand = "MEDIUM";
  } else if (level >= 2) {
    status = "ESTABLISHED";
    riskBand = "LOW";
  } else {
    status = "VERIFIED";
    riskBand = "LOW";
  }

  // --- Explanation (NDPA §37 — meaningful, per-component) -------------------
  const explanation: string[] = [];
  if (!inputs.identity) {
    explanation.push(
      "No Trust Identity yet — this account is unverified, so the score starts at zero."
    );
  } else {
    explanation.push(
      `Identity Assurance ${assuranceValue}/60: government record ${identityLive ? "verified" : identityStale ? "past its freshness horizon" : inputs.identity.status.toLowerCase()}, assurance level L${level}${identityLive ? `, ${Math.round(govDaysLeft)} days of freshness left` : ""}.`
    );
    explanation.push(
      freshCredentials.length > 0
        ? `Verified Credentials ${credentialValue}/20: ${freshCredentials.length} active credential${freshCredentials.length === 1 ? "" : "s"} backed by live evidence (${freshCredentials.map((c) => c.type.replace("_VERIFIED", "").replace(/_/g, " ").toLowerCase()).join(", ")}).`
        : "Verified Credentials 0/20: no active credentials — verify signals to earn them."
    );
    explanation.push(
      inputs.verifiedInteractions > 0
        ? `Verified Reputation ${reputationValue}/15: ${inputs.verifiedInteractions} verified interaction${inputs.verifiedInteractions === 1 ? "" : "s"} with distinct verified members (consent-backed checks in the last 90 days, +3 each, capped at 5).`
        : "Verified Reputation 0/15: no consent-backed checks by verified members in the last 90 days — an honest zero, not a negative signal."
    );
    explanation.push(
      inputs.clearedFlags > 0
        ? `Resolution History ${resolutionValue}/10: ${inputs.clearedFlags} flag${inputs.clearedFlags === 1 ? " was" : "s were"} raised against you and cleared by human review (+2 each, capped at 5).`
        : "Resolution History 0/10: no human-reviewed flag resolutions on record yet — an honest zero, not a negative signal."
    );
    explanation.push(
      riskPenalty > 0
        ? `Confirmed Risk −${riskPenalty}: ${inputs.confirmedFlags} confirmed flag${inputs.confirmedFlags === 1 ? "" : "s"} on record after human review. You can appeal a confirmation for 14 days.`
        : "Confirmed Risk −0: no confirmed adverse signals found. This is a statement about recorded evidence only — never a guarantee that a person is safe to deal with."
    );
    explanation.push(
      `Confidence ${confidence}/100: based on ${freshEvidence.length} fresh evidence record${freshEvidence.length === 1 ? "" : "s"}${allFresh ? " with all signals inside their freshness horizons" : " (some signals are stale)"}.`
    );
  }
  explanation.push(
    "Under NDPA §37 you can request human review of this decision; confirmed flags can be appealed for 14 days after the reviewer's decision."
  );

  return {
    status,
    score,
    confidence,
    riskBand,
    components: [
      {
        key: "identityAssurance",
        label: "Identity Assurance",
        value: assuranceValue,
        max: 60,
        note: identityLive
          ? `Government-verified, L${level}${freshnessFactor < 1 ? ", freshness-scaled" : ""}`
          : "No live government verification",
      },
      {
        key: "verifiedCredentials",
        label: "Verified Credentials",
        value: credentialValue,
        max: 20,
        note: `${freshCredentials.length} active, evidence-backed`,
      },
      {
        key: "verifiedReputation",
        label: "Verified Reputation",
        value: reputationValue,
        max: 15,
        note:
          inputs.verifiedInteractions > 0
            ? `${inputs.verifiedInteractions} verified interaction${inputs.verifiedInteractions === 1 ? "" : "s"} (90-day window)`
            : "No verified interactions in the last 90 days",
      },
      {
        key: "resolutionHistory",
        label: "Resolution History",
        value: resolutionValue,
        max: 10,
        note:
          inputs.clearedFlags > 0
            ? `${inputs.clearedFlags} flag${inputs.clearedFlags === 1 ? "" : "s"} cleared by human review`
            : "No cleared flags on record yet",
      },
      {
        key: "confirmedRisk",
        label: "Confirmed Risk",
        value: -riskPenalty,
        max: 0,
        note:
          inputs.confirmedFlags > 0
            ? `${inputs.confirmedFlags} confirmed flag${inputs.confirmedFlags === 1 ? "" : "s"} (human-reviewed, appealable)`
            : "No confirmed flags on record",
      },
    ],
    explanation,
    inputsHash: inputsHashFor(inputs),
    trigger,
    computedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SNAPSHOT_TTL_MS).toISOString(),
  };
}

function shapeSnapshot(row: {
  id: string;
  version: number;
  status: string;
  score: number;
  confidence: number;
  riskBand: string;
  components: string;
  explanation: string;
  trigger: string;
  computedAt: Date;
  expiresAt: Date;
}) {
  return {
    id: row.id,
    version: row.version,
    status: row.status as ScoreStatus,
    score: row.score,
    confidence: row.confidence,
    riskBand: row.riskBand as "LOW" | "MEDIUM" | "HIGH",
    components: JSON.parse(row.components) as ScoreComponent[],
    explanation: JSON.parse(row.explanation) as string[],
    trigger: row.trigger,
    computedAt: row.computedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    fresh: row.expiresAt.getTime() > Date.now(),
  };
}

async function persistSnapshot(userId: string, computed: ComputedScore) {
  await db.trustScoreSnapshot.create({
    data: {
      userId,
      version: SCORE_VERSION,
      status: computed.status,
      score: computed.score,
      confidence: computed.confidence,
      riskBand: computed.riskBand,
      components: JSON.stringify(computed.components),
      explanation: JSON.stringify(computed.explanation),
      inputsHash: computed.inputsHash,
      trigger: computed.trigger,
      expiresAt: new Date(computed.expiresAt),
    },
  });
  // Prune: keep the latest SNAPSHOT_RETAIN snapshots per user.
  const stale = await db.trustScoreSnapshot.findMany({
    where: { userId },
    orderBy: { computedAt: "desc" },
    skip: SNAPSHOT_RETAIN,
    select: { id: true },
  });
  if (stale.length > 0) {
    await db.trustScoreSnapshot.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }
}

export async function getScoreSnapshot(userId: string): Promise<ReturnType<typeof shapeSnapshot>> {
  const latest = await db.trustScoreSnapshot.findFirst({
    where: { userId },
    orderBy: { computedAt: "desc" },
  });
  const inputs = await collectInputs(userId);
  const hash = inputsHashFor(inputs);

  if (
    latest &&
    latest.inputsHash === hash &&
    latest.expiresAt.getTime() > Date.now()
  ) {
    return shapeSnapshot(latest);
  }

  const trigger =
    latest === undefined || latest === null
      ? "INITIAL"
      : latest.inputsHash !== hash
        ? "MATERIAL_CHANGE"
        : "PERIODIC";
  const computed = computeScoreFromInputs(inputs, trigger);
  await persistSnapshot(userId, computed);
  const fresh = await db.trustScoreSnapshot.findFirst({
    where: { userId },
    orderBy: { computedAt: "desc" },
  });
  return shapeSnapshot(fresh ?? latest!);
}

// Material-change hook: called by identity/signal services after mutations
// that move the read model. Syncs credentials (so lapsed sources drop out)
// and recomputes the snapshot eagerly — the passport is never stale right
// after an action the user just took.
export async function markMaterialChange(
  userId: string,
  _trigger: string
): Promise<void> {
  await syncCredentials(userId);
  await getScoreSnapshot(userId);
}

// ---------------------------------------------------------------------------
// Credential sync — credentials are platform-issued assertions that shadow
// their source evidence. A credential NEVER outlives its source; a manual
// user revocation sticks even if the source is still live.
// ---------------------------------------------------------------------------

const CREDENTIAL_LABELS: Record<string, string> = {
  GOV_ID_VERIFIED: "Government identity verified",
  PHONE_VERIFIED: "Phone number verified",
  LIVENESS_VERIFIED: "Biometric liveness passed",
};

export function credentialLabel(type: string): string {
  return CREDENTIAL_LABELS[type] ?? type;
}

export async function syncCredentials(userId: string): Promise<number> {
  const identity = await db.trustIdentity.findUnique({
    where: { userId },
    include: {
      identifiers: true,
      attributes: true,
      evidence: { where: { status: "ACTIVE" }, orderBy: { collectedAt: "desc" } },
    },
  });
  if (!identity) return 0;

  const now = Date.now();
  const fresh = (d: Date | null) => (d?.getTime() ?? 0) > now;
  const govEvidence = identity.evidence.find((e) => e.type === "NINAUTH_ID_TOKEN" && fresh(e.expiresAt));
  const phoneIdentifier = identity.identifiers.find(
    (i) => i.type === "PHONE" && i.status === "ACTIVE" && fresh(i.expiresAt)
  );
  const biometricIdentifier = identity.identifiers.find(
    (i) => i.type === "BIOMETRIC" && i.status === "ACTIVE" && fresh(i.expiresAt)
  );
  const phoneEvidence = identity.evidence.find((e) => e.type === "PHONE_OTP" && fresh(e.expiresAt));
  const livenessEvidence = identity.evidence.find((e) => e.type === "LIVENESS" && fresh(e.expiresAt));

  const sources: {
    type: string;
    live: boolean;
    evidenceId: string | null;
    expiresAt: Date | null;
    claims: Record<string, unknown>;
  }[] = [
    {
      type: "GOV_ID_VERIFIED",
      live: identity.status === "VERIFIED" && !!govEvidence,
      evidenceId: govEvidence?.id ?? null,
      expiresAt: identity.expiresAt,
      claims: {
        provider: identity.provider,
        providerMode: identity.providerMode,
        maskedRef: identity.providerIdentityRef,
        attributesAsserted: identity.attributes.filter((a) => a.status === "ACTIVE").length,
      },
    },
    {
      type: "PHONE_VERIFIED",
      live: !!phoneIdentifier,
      evidenceId: phoneEvidence?.id ?? null,
      expiresAt: phoneIdentifier?.expiresAt ?? null,
      claims: {
        phoneHint: phoneIdentifier?.hint ?? null,
        simSwapRisk: "checked",
      },
    },
    {
      type: "LIVENESS_VERIFIED",
      live: !!biometricIdentifier,
      evidenceId: livenessEvidence?.id ?? null,
      expiresAt: biometricIdentifier?.expiresAt ?? null,
      claims: {
        verdict: "passed",
        templateStored: false, // honesty: verdict-only, never biometric templates
      },
    },
  ];

  let changed = 0;
  for (const src of sources) {
    const existing = await db.credential.findUnique({
      where: { userId_type: { userId, type: src.type } },
    });
    if (src.live && (!existing || (existing.status !== "ACTIVE" && !existing.manualRevoked))) {
      await db.credential.upsert({
        where: { userId_type: { userId, type: src.type } },
        create: {
          userId,
          trustIdentityId: identity.id,
          type: src.type,
          issuer: "TrustScore Platform",
          issuerMode: "MOCK",
          claims: JSON.stringify(src.claims),
          status: "ACTIVE",
          evidenceId: src.evidenceId,
          expiresAt: src.expiresAt,
          manualRevoked: false,
        },
        update: {
          status: "ACTIVE",
          claims: JSON.stringify(src.claims),
          evidenceId: src.evidenceId,
          expiresAt: src.expiresAt,
          revokedAt: null,
          trustIdentityId: identity.id,
        },
      });
      changed += 1;
    } else if (!src.live && existing && existing.status === "ACTIVE") {
      // Source gone → credential lapses (non-manual revocation).
      await db.credential.update({
        where: { id: existing.id },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      changed += 1;
    }
  }
  return changed;
}

export async function getCredentialsForUser(userId: string) {
  const rows = await db.credential.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
  });
  const now = Date.now();
  return rows.map((c) => {
    const expired = (c.expiresAt?.getTime() ?? Infinity) <= now;
    const status =
      c.status === "ACTIVE" && expired ? "EXPIRED" : c.status;
    return {
      id: c.id,
      type: c.type,
      label: credentialLabel(c.type),
      issuer: c.issuer,
      issuerMode: c.issuerMode,
      claims: JSON.parse(c.claims) as Record<string, unknown>,
      status,
      manualRevoked: c.manualRevoked,
      evidenceId: c.evidenceId,
      issuedAt: c.issuedAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() ?? null,
      revokedAt: c.revokedAt?.toISOString() ?? null,
    };
  });
}
