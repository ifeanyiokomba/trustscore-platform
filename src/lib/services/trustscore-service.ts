// TrustScore Stage 5–8 — TrustScore engine (directive §35/§36 score contract).
//
// Formula (directive §36):
//   score = Identity Assurance + Verified Reputation + Verified Credentials
//           + Resolution History − Confirmed Risk
//
// Stage 8 (Trust Engine): every budget/threshold/window now lives in a
// versioned ScoringPolicy row (rules-first, append-only). This module keeps
// the §36 math but reads its numbers from the ACTIVE policy — policy v1 is
// byte-for-byte the budgets shipped in Stage 5–7, so scores are unchanged
// until a new policy version is deliberately activated.
//
// Output contract: Score (0–100) + Confidence (0–100) + Risk Band
// (LOW/MEDIUM/HIGH) + Status (NEW/VERIFIED/ESTABLISHED/CAUTION/HIGH_RISK/
// REVIEW_REQUIRED) + Explanation[] + Freshness (computedAt → expiresAt) +
// State (ACTIVE/STALE/FROZEN/RETIRED) + policy version.
//
// Snapshots are immutable rows: a new one is written when inputs change
// (inputsHash incl. policy hash) or the TTL lapses. Old snapshots beyond the
// latest 20 are pruned. The engine NEVER says "this person is safe"
// (directive §50) — the public card language is locked to "No confirmed
// adverse signals found".
// While the latest snapshot is FROZEN (appeal pending), getScoreSnapshot
// serves it verbatim — no recompute, no new rows (fairness guarantee).

import { db } from "@/lib/db";
import { sha256Hex } from "@/lib/platform/crypto";
import { getActivePolicy, policyRulesHash, type PolicyRules } from "@/lib/services/policy-service";

export const SCORE_VERSION = 1;
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
  policyVersion: number; // Stage 8: the rules that produced this score
}

const ASSURANCE_BASE: Record<number, number> = { 0: 0, 1: 20, 2: 34, 3: 47, 4: 60 };

// Legacy constant kept for imports elsewhere (Stage 5–7 tests/docs) — the
// live TTL now comes from the ACTIVE policy's snapshotTtlHours.
export const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;

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

// Verified-interaction horizon: checks older than the policy window stop
// counting — reputation must be earned continuously, not banked once.
const INTERACTION_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

async function collectReputationInputs(
  userId: string,
  interactionWindowDays?: number
): Promise<{
  verifiedInteractions: number;
  clearedFlags: number;
  confirmedFlags: number;
}> {
  const windowMs =
    interactionWindowDays && interactionWindowDays > 0
      ? interactionWindowDays * 24 * 60 * 60 * 1000
      : INTERACTION_WINDOW_MS;
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
      createdAt: { gte: new Date(Date.now() - windowMs) },
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

async function collectInputs(
  userId: string,
  interactionWindowDays?: number
): Promise<ScoreInputs> {
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
  const reputation = await collectReputationInputs(userId, interactionWindowDays);
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
  trigger: ComputedScore["trigger"],
  rules: PolicyRules,
  ttlMs: number
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
  const ASSURANCE = { 0: rules.assuranceBase[0], 1: rules.assuranceBase[1], 2: rules.assuranceBase[2], 3: rules.assuranceBase[3], 4: rules.assuranceBase[4] };

  // --- Identity Assurance (budget: assuranceBase[4]) ----------------------
  const govDaysLeft = identityLive
    ? Math.max(0, (inputs.identity!.govExpiresAt!.getTime() - now) / 86_400_000)
    : 0;
  const freshnessFactor = !identityLive
    ? 0
    : govDaysLeft >= rules.freshnessFullDays
      ? 1
      : govDaysLeft >= 1
        ? Math.max(rules.freshnessMinFactor, 0.9)
        : rules.freshnessMinFactor;
  const assuranceValue = Math.round((ASSURANCE[clamp(level, 0, 4)] ?? 0) * freshnessFactor);

  // --- Verified Credentials (policy: credentialPoints/credentialMax) ------
  const freshCredentials = inputs.credentials.filter(
    (c) => c.status === "ACTIVE" && (c.expiresAt?.getTime() ?? Infinity) > now
  );
  const credentialValue = clamp(freshCredentials.length * rules.credentialPoints, 0, rules.credentialMax);

  // --- Verified Reputation / Resolution History (policy-driven) ----------
  const reputationValue = Math.min(rules.interactionMax, inputs.verifiedInteractions) * rules.interactionPoints;
  const resolutionValue = Math.min(rules.clearedMax, inputs.clearedFlags) * rules.clearedPoints;

  // --- Confirmed Risk (policy: riskPenaltyPer/riskMaxPenalty) ------------
  const riskPenalty = Math.min(
    Math.floor(rules.riskMaxPenalty / Math.max(1, rules.riskPenaltyPer)),
    inputs.confirmedFlags
  ) * rules.riskPenaltyPer;

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
    status = inputs.confirmedFlags >= rules.riskHighAt ? "HIGH_RISK" : "REVIEW_REQUIRED";
    riskBand = "HIGH";
  } else if (identityStale) {
    status = "CAUTION";
    riskBand = "MEDIUM";
  } else if (!inputs.identity || inputs.identity.status === "NONE" || level === 0) {
    status = "NEW";
    riskBand = "MEDIUM";
  } else if (level >= rules.establishedMinLevel) {
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
      `Identity Assurance ${assuranceValue}/${ASSURANCE[4]}: government record ${identityLive ? "verified" : identityStale ? "past its freshness horizon" : inputs.identity.status.toLowerCase()}, assurance level L${level}${identityLive ? `, ${Math.round(govDaysLeft)} days of freshness left` : ""}.`
    );
    explanation.push(
      freshCredentials.length > 0
        ? `Verified Credentials ${credentialValue}/${rules.credentialMax}: ${freshCredentials.length} active credential${freshCredentials.length === 1 ? "" : "s"} backed by live evidence (${freshCredentials.map((c) => c.type.replace("_VERIFIED", "").replace(/_/g, " ").toLowerCase()).join(", ")}).`
        : `Verified Credentials 0/${rules.credentialMax}: no active credentials — verify signals to earn them.`
    );
    explanation.push(
      inputs.verifiedInteractions > 0
        ? `Verified Reputation ${reputationValue}/${rules.interactionMax * rules.interactionPoints}: ${inputs.verifiedInteractions} verified interaction${inputs.verifiedInteractions === 1 ? "" : "s"} with distinct verified members (consent-backed checks in the last ${rules.interactionWindowDays} days, +${rules.interactionPoints} each, capped at ${rules.interactionMax}).`
        : `Verified Reputation 0/${rules.interactionMax * rules.interactionPoints}: no consent-backed checks by verified members in the last ${rules.interactionWindowDays} days — an honest zero, not a negative signal.`
    );
    explanation.push(
      inputs.clearedFlags > 0
        ? `Resolution History ${resolutionValue}/${rules.clearedMax * rules.clearedPoints}: ${inputs.clearedFlags} flag${inputs.clearedFlags === 1 ? " was" : "s were"} raised against you and cleared by human review (+${rules.clearedPoints} each, capped at ${rules.clearedMax}).`
        : `Resolution History 0/${rules.clearedMax * rules.clearedPoints}: no human-reviewed flag resolutions on record yet — an honest zero, not a negative signal.`
    );
    explanation.push(
      riskPenalty > 0
        ? `Confirmed Risk −${riskPenalty}: ${inputs.confirmedFlags} confirmed flag${inputs.confirmedFlags === 1 ? "" : "s"} on record after human review. You can appeal a confirmation for 14 days — while an appeal is pending, your score is frozen so it cannot move against you.`
        : `Confirmed Risk −0: no confirmed adverse signals found. This is a statement about recorded evidence only — never a guarantee that a person is safe to deal with.`
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
        max: ASSURANCE[4],
        note: identityLive
          ? `Government-verified, L${level}${freshnessFactor < 1 ? ", freshness-scaled" : ""}`
          : "No live government verification",
      },
      {
        key: "verifiedCredentials",
        label: "Verified Credentials",
        value: credentialValue,
        max: rules.credentialMax,
        note: `${freshCredentials.length} active, evidence-backed (+${rules.credentialPoints} each)`,
      },
      {
        key: "verifiedReputation",
        label: "Verified Reputation",
        value: reputationValue,
        max: rules.interactionMax * rules.interactionPoints,
        note:
          inputs.verifiedInteractions > 0
            ? `${inputs.verifiedInteractions} verified interaction${inputs.verifiedInteractions === 1 ? "" : "s"} (${rules.interactionWindowDays}-day window)`
            : `No verified interactions in the last ${rules.interactionWindowDays} days`,
      },
      {
        key: "resolutionHistory",
        label: "Resolution History",
        value: resolutionValue,
        max: rules.clearedMax * rules.clearedPoints,
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
            ? `${inputs.confirmedFlags} confirmed flag${inputs.confirmedFlags === 1 ? "" : "s"} (human-reviewed, appealable; −${rules.riskPenaltyPer} each, cap −${rules.riskMaxPenalty})`
            : `No confirmed flags on record (−${rules.riskPenaltyPer} each when confirmed)`,
      },
    ],
    explanation,
    // Combined hash: inputs + the policy rules that interpreted them —
    // a policy change invalidates every cached snapshot (Stage 8).
    inputsHash: sha256Hex(inputsHashFor(inputs) + policyRulesHash(rules)),
    trigger,
    computedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    policyVersion: 0, // filled by the caller (persistSnapshot path)
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
  state?: string | null;
  policyId?: string | null;
  frozenAt?: Date | null;
  frozenReason?: string | null;
}) {
  const state =
    row.state === "FROZEN"
      ? "FROZEN"
      : row.state === "RETIRED"
        ? "RETIRED"
        : row.expiresAt.getTime() > Date.now()
          ? "ACTIVE"
          : "STALE";
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
    // Stage 8 — lifecycle + policy provenance
    state,
    policyId: row.policyId ?? null,
    frozenAt: row.frozenAt?.toISOString() ?? null,
    frozenReason: row.frozenReason ?? null,
  };
}

async function persistSnapshot(userId: string, computed: ComputedScore, policyId: string | null) {
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
      state: "ACTIVE",
      policyId,
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

  // Stage 8 — FREEZE (appeal pending): serve the frozen row verbatim.
  // The score cannot move — up or down — until the human decision lands.
  if (latest && latest.state === "FROZEN") {
    return shapeSnapshot(latest);
  }

  // Stage 8 — the ACTIVE policy drives the numbers AND the inputsHash:
  // a policy change recomputes every user (new snapshot names the policy).
  const policy = await getActivePolicy();
  const rules = policy?.rules;
  if (!rules) {
    // Unreachable in practice (seed guarantees v1) — guard for type safety.
    if (latest) return shapeSnapshot(latest);
    throw new Error("No active scoring policy");
  }
  const ttlMs = rules.snapshotTtlHours * 60 * 60 * 1000;
  const inputs = await collectInputs(userId, rules.interactionWindowDays);
  const hash = sha256Hex(inputsHashFor(inputs) + policyRulesHash(rules));

  if (
    latest &&
    latest.inputsHash === hash &&
    latest.expiresAt.getTime() > Date.now() &&
    latest.policyId === policy.id
  ) {
    return shapeSnapshot(latest);
  }

  const trigger =
    latest === undefined || latest === null
      ? "INITIAL"
      : latest.inputsHash !== hash || latest.policyId !== policy.id
        ? "MATERIAL_CHANGE"
        : "PERIODIC";
  const computed = computeScoreFromInputs(inputs, trigger, rules, ttlMs);
  computed.policyVersion = policy.version;
  await persistSnapshot(userId, computed, policy.id);
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
