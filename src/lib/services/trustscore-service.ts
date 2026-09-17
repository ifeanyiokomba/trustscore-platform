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
import { notifyUser } from "@/lib/services/notification-service";
import {
  getActivePolicy,
  policyRulesHash,
  validateRules,
  type PolicyRules,
} from "@/lib/services/policy-service";

export const SCORE_VERSION = 1;
// Stage 16 — the retention horizon is now 50 snapshots (was 20): a deeper
// explainable history, still bounded. The insights read model pages through
// it (20 per page) so the surface stays fast no matter how full the window.
export const SNAPSHOT_RETAIN = 50; // last N snapshots kept per user

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
  // Stage 10 — TrustGraph partners among those verifiers: mutual
  // attestations (ACTIVE edges, both memberships ACTIVE) that were not
  // already counted via a consent-backed check.
  networkInteractions: number;
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
  networkInteractions: number;
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

  // Stage 10 — TrustGraph edges: mutual verified interactions with ACTIVE
  // edges (activated within the window). They join the SAME distinct-verifier
  // set — an edge partner who also ran a check is ONE verifier, never two.
  // Counting requires: both memberships ACTIVE + partner identity live L2+.
  const edges = await db.trustEdge.findMany({
    where: { status: "ACTIVE", OR: [{ aUserId: userId }, { bUserId: userId }] },
    select: { aUserId: true, bUserId: true, activatedAt: true },
  });
  const edgePartnerIds = edges
    .filter((e) => (e.activatedAt?.getTime() ?? 0) >= Date.now() - windowMs)
    .map((e) => (e.aUserId === userId ? e.bUserId : e.aUserId));

  const candidateIds = [...new Set([...verifierIds, ...edgePartnerIds])];
  // The subject's OWN membership gates their edges: a paused member's
  // attestations stop counting immediately (checks still count — consent
  // for those lives in the SAFETY_CHECK consent, not here).
  const subjectMembership = await db.networkMembership.findUnique({
    where: { userId },
    select: { status: true },
  });
  const subjectActive = subjectMembership?.status === "ACTIVE";
  if (candidateIds.length > 0) {
    const [identities, memberships] = await Promise.all([
      db.trustIdentity.findMany({
        where: { userId: { in: candidateIds } },
        select: { userId: true, status: true, assuranceLevel: true, expiresAt: true },
      }),
      db.networkMembership.findMany({
        where: { userId: { in: candidateIds }, status: "ACTIVE" },
        select: { userId: true },
      }),
    ]);
    const now = Date.now();
    const memberIds = new Set(memberships.map((m) => m.userId));
    // An edge counts only when BOTH endpoints hold ACTIVE memberships.
    const countingEdgePartners = new Set(
      subjectActive ? edgePartnerIds.filter((id) => memberIds.has(id)) : []
    );
    let verifiedInteractions = 0;
    let networkInteractions = 0;
    for (const id of identities) {
      const live = id.status === "VERIFIED" && (id.expiresAt?.getTime() ?? 0) > now;
      if (!live || id.assuranceLevel < 2) continue;
      const isCheckVerifier = verifierIds.includes(id.userId);
      const isCountingEdge = countingEdgePartners.has(id.userId);
      if (isCheckVerifier || isCountingEdge) verifiedInteractions += 1;
      if (isCountingEdge && !isCheckVerifier) networkInteractions += 1;
    }
    return { verifiedInteractions, networkInteractions, clearedFlags, confirmedFlags };
  }
  return { verifiedInteractions: 0, networkInteractions: 0, clearedFlags, confirmedFlags };
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
    networkInteractions: reputation.networkInteractions,
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
    r: [inputs.confirmedFlags, inputs.clearedFlags, inputs.verifiedInteractions, inputs.networkInteractions],
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
        ? `Verified Reputation ${reputationValue}/${rules.interactionMax * rules.interactionPoints}: ${inputs.verifiedInteractions} verified interaction${inputs.verifiedInteractions === 1 ? "" : "s"} with distinct verified members (consent-backed checks${inputs.networkInteractions > 0 ? ` plus ${inputs.networkInteractions} mutual Trust Network attestation${inputs.networkInteractions === 1 ? "" : "s"}` : ""} in the last ${rules.interactionWindowDays} days, +${rules.interactionPoints} each, capped at ${rules.interactionMax}).`
        : `Verified Reputation 0/${rules.interactionMax * rules.interactionPoints}: no consent-backed checks or network attestations in the last ${rules.interactionWindowDays} days — an honest zero, not a negative signal.`
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
            ? `${inputs.verifiedInteractions} verified interaction${inputs.verifiedInteractions === 1 ? "" : "s"} (${rules.interactionWindowDays}-day window)${inputs.networkInteractions > 0 ? `, incl. ${inputs.networkInteractions} network attestation${inputs.networkInteractions === 1 ? "" : "s"}` : ""}`
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
  // Stage 12 — material score-drop receipt: the member is notified the
  // moment their score moves materially DOWN (points, band or status),
  // pointed at Score Insights. Never a verdict — a pointer to the record.
  await maybeNotifyScoreDrop(userId, latest ?? null, computed, {
    policyChanged: latest ? latest.policyId !== policy.id : false,
    policyVersion: policy.version,
  });
  const fresh = await db.trustScoreSnapshot.findFirst({
    where: { userId },
    orderBy: { computedAt: "desc" },
  });
  return shapeSnapshot(fresh ?? latest!);
}

// ---------------------------------------------------------------------------
// Stage 12 — material score-drop receipts (notification layer)
// ---------------------------------------------------------------------------

// A drop is "material" when it reaches this many points, OR the risk band
// worsens, OR the status enters an adverse state (CAUTION / REVIEW_REQUIRED /
// HIGH_RISK). Anything smaller is visible in Score Insights but does not
// interrupt the member.
export const MATERIAL_DROP_POINTS = 10;

const BAND_RANK: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
// Adverse statuses: CAUTION (identity stale), REVIEW_REQUIRED (confirmed flag
// below the HIGH_RISK threshold), HIGH_RISK. Entering ANY of these from a
// clean state is material — the member hears about it immediately.
const ADVERSE_STATUSES = new Set(["CAUTION", "REVIEW_REQUIRED", "HIGH_RISK"]);

interface DropReceiptContext {
  drop: number;
  bandWorsened: boolean;
  enteredAdverse: boolean;
  policyChanged: boolean;
}

function assessDrop(
  prev: { score: number; riskBand: string; status: string },
  next: { score: number; riskBand: string; status: string },
  policyChanged: boolean
): (DropReceiptContext & { material: boolean }) {
  const drop = prev.score - next.score;
  const bandWorsened = (BAND_RANK[next.riskBand] ?? 0) > (BAND_RANK[prev.riskBand] ?? 0);
  const enteredAdverse = !ADVERSE_STATUSES.has(prev.status) && ADVERSE_STATUSES.has(next.status);
  return {
    drop,
    bandWorsened,
    enteredAdverse,
    policyChanged,
    material: drop >= MATERIAL_DROP_POINTS || bandWorsened || enteredAdverse,
  };
}

// maybeNotifyScoreDrop — fires ONE notification per material downward move.
// Increases, flat refreshes and INITIAL snapshots never notify (the history
// card already shows those). The frozen path never reaches here (no write
// happens while FROZEN — fairness guarantee), so a receipt can only follow a
// real recompute, including the first one after an appeal decision lands.
async function maybeNotifyScoreDrop(
  userId: string,
  prev: { score: number; riskBand: string; status: string } | null,
  next: ComputedScore,
  provenance: { policyChanged: boolean; policyVersion: number }
): Promise<void> {
  if (!prev) return; // INITIAL — nothing to compare against
  const ctx = assessDrop(prev, next, provenance.policyChanged);
  if (!ctx.material) return;

  const reasons: string[] = [];
  if (ctx.drop >= MATERIAL_DROP_POINTS) reasons.push(`down ${ctx.drop} points`);
  if (ctx.bandWorsened) reasons.push("risk band moved up");
  if (ctx.enteredAdverse) reasons.push("status entered an adverse state");

  const title = `TrustScore change: ${prev.score} → ${next.score} (${next.score - prev.score >= 0 ? "+" : "−"}${Math.abs(next.score - prev.score)})`;
  const body =
    `A material change to your TrustScore was recorded (${reasons.join(", ")}). ` +
    `Every component delta and the audited events in this window are explained in Score Insights ` +
    `(Trust Passport → Score history)${ctx.policyChanged ? `, under policy v${provenance.policyVersion}` : ""}. ` +
    `Confirmed flags are human-reviewed and appealable — adverse findings always carry a reason.`;
  await notifyUser(userId, "SCORE", title, body);
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

// ---------------------------------------------------------------------------
// Stage 8 — Policy impact simulation (read-only dry-run, ADMIN-only)
//
// Governance affordance: before a draft policy is activated (which is
// DPIA-gated), an admin can dry-run it against the live scored cohort.
// Nothing is written — no snapshots, no state changes. The engine simply
// recomputes every member's score in memory under BOTH the active rules
// ("before") and the draft rules ("after") and reports the deltas.
//
// FROZEN members (appeal pending) are EXCLUDED from the delta cohort and
// counted separately — their scores cannot move until the human decision
// lands (freeze guarantee), and they recompute under whatever policy is
// active when the freeze lifts. The report says so honestly.
// ---------------------------------------------------------------------------

export interface SimulationMover {
  label: string; // masked email — governance sees trends, not identities
  before: number;
  after: number;
  delta: number;
  statusBefore: string;
  statusAfter: string;
}

export interface SimulationBucket {
  label: string;
  before: number;
  after: number;
}

export interface SimulationTransition {
  from: string;
  to: string;
  count: number;
}

export type SimulationResult =
  | {
      ok: true;
      draftVersion: number;
      activeVersion: number | null;
      cohort: number; // members simulated (frozen excluded)
      frozenExcluded: number; // members under appeal freeze right now
      moved: number;
      avgBefore: number;
      avgAfter: number;
      avgDelta: number;
      maxUp: number;
      maxDown: number;
      buckets: SimulationBucket[];
      transitions: SimulationTransition[];
      movers: SimulationMover[]; // top movers by |delta|
      note: string;
    }
  | { ok: false; code: "NOT_FOUND" | "NOT_DRAFT" | "NO_ACTIVE" };

const SIMULATION_NOTE =
  "Read-only dry-run — no snapshot was written and no member's score changed. Real movement happens only on activation (DPIA-gated): each member's next read then recomputes under the new rules. Frozen members (appeal pending) are excluded and recompute when their freeze lifts.";

// Mask an email for governance reporting: keep the first two characters of
// the local part + domain. Trends visible, identities shielded.
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "member";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const head = local.slice(0, 2);
  return `${head}${local.length > 2 ? "••" : ""}${domain}`;
}

export async function simulatePolicyImpact(policyId: string): Promise<SimulationResult> {
  const [draftRow, active] = await Promise.all([
    db.scoringPolicy.findUnique({ where: { id: policyId } }),
    getActivePolicy(),
  ]);
  if (!draftRow) return { ok: false, code: "NOT_FOUND" };
  if (draftRow.status !== "DRAFT") return { ok: false, code: "NOT_DRAFT" };
  if (!active) return { ok: false, code: "NO_ACTIVE" };

  const draftRules = validateRules(JSON.parse(draftRow.rules)).rules;
  const activeTtl = active.rules.snapshotTtlHours * 3_600_000;
  const draftTtl = draftRules.snapshotTtlHours * 3_600_000;

  // Cohort: every member with at least one snapshot, minus frozen members.
  const users = await db.userAccount.findMany({
    where: { status: "ACTIVE", scoreSnapshots: { some: {} } },
    select: { id: true, email: true },
  });

  const frozenIds = new Set(
    (
      await db.trustScoreSnapshot.findMany({
        where: { state: "FROZEN" },
        select: { userId: true },
      })
    ).map((s) => s.userId)
  );

  const bucketLabels = ["0–19", "20–39", "40–59", "60–79", "80–100"];
  const bucketOf = (s: number) => Math.min(4, Math.floor(s / 20));
  const beforeBuckets = [0, 0, 0, 0, 0];
  const afterBuckets = [0, 0, 0, 0, 0];
  const transitions = new Map<string, SimulationTransition>();
  const movers: SimulationMover[] = [];

  let cohort = 0;
  let sumBefore = 0;
  let sumAfter = 0;
  let moved = 0;
  let maxUp = 0;
  let maxDown = 0;

  for (const u of users) {
    if (frozenIds.has(u.id)) continue;
    const inputs = await collectInputs(u.id, active.rules.interactionWindowDays);
    const beforeScore = computeScoreFromInputs(inputs, "PERIODIC", active.rules, activeTtl);
    const afterScore = computeScoreFromInputs(inputs, "PERIODIC", draftRules, draftTtl);
    const delta = afterScore.score - beforeScore.score;

    cohort += 1;
    sumBefore += beforeScore.score;
    sumAfter += afterScore.score;
    beforeBuckets[bucketOf(beforeScore.score)] += 1;
    afterBuckets[bucketOf(afterScore.score)] += 1;

    if (beforeScore.status !== afterScore.status) {
      const key = `${beforeScore.status}→${afterScore.status}`;
      const existing = transitions.get(key);
      if (existing) existing.count += 1;
      else transitions.set(key, { from: beforeScore.status, to: afterScore.status, count: 1 });
    }
    if (delta !== 0) {
      moved += 1;
      maxUp = Math.max(maxUp, delta);
      maxDown = Math.min(maxDown, delta);
      movers.push({
        label: maskEmail(u.email),
        before: beforeScore.score,
        after: afterScore.score,
        delta,
        statusBefore: beforeScore.status,
        statusAfter: afterScore.status,
      });
    }
  }

  movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    ok: true,
    draftVersion: draftRow.version,
    activeVersion: active.version,
    cohort,
    frozenExcluded: users.filter((u) => frozenIds.has(u.id)).length,
    moved,
    avgBefore: cohort > 0 ? Math.round((sumBefore / cohort) * 10) / 10 : 0,
    avgAfter: cohort > 0 ? Math.round((sumAfter / cohort) * 10) / 10 : 0,
    avgDelta: cohort > 0 ? Math.round(((sumAfter - sumBefore) / cohort) * 10) / 10 : 0,
    maxUp,
    maxDown,
    buckets: bucketLabels.map((label, i) => ({
      label,
      before: beforeBuckets[i],
      after: afterBuckets[i],
    })),
    transitions: [...transitions.values()],
    movers: movers.slice(0, 10),
    note: SIMULATION_NOTE,
  };
}
