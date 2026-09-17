// TrustScore Stage 8 — Trust Engine policy layer (audit §4.2).
//
// Rules-first: every number the engine uses lives in a versioned ScoringPolicy
// row (append-only). The DEFAULT_RULES below are policy v1 — the exact
// §36/directive budgets shipped in Stage 5–7, now made explicit and
// configurable. The engine NEVER trusts un-validated config: all writes go
// through validateRules() which clamps/normalizes every field.
//
// Lifecycle: DRAFT → ACTIVE → RETIRED. Activating a new version retires the
// previous one; snapshots name the policyId that produced them, so every
// historical score stays explainable forever. A policy may only activate when
// a COMPLETED DPIA record covers it (NDPC guidance gate — see
// dpia-service.ts / engine-gate).
//
// Admin surface is an OPERATIONAL grant (ADMIN role), like the Stage 7
// reviewer grant: never self-service, always audited.

import { db } from "@/lib/db";
import { sha256Hex } from "@/lib/platform/crypto";

// ---------------------------------------------------------------------------
// Policy rules shape — the ONLY configuration the engine reads.
// ---------------------------------------------------------------------------

export interface PolicyRules {
  // Identity Assurance (max = sum of the L4 base)
  assuranceBase: [number, number, number, number, number]; // L0..L4
  freshnessFullDays: number; // ≥ this many days left → factor 1
  freshnessMinFactor: number; // factor floor as gov record approaches expiry
  // Verified Credentials
  credentialPoints: number; // per fresh ACTIVE credential
  credentialMax: number;
  // Verified Reputation
  interactionPoints: number; // per distinct L2+ consented verifier (90d)
  interactionWindowDays: number;
  interactionMax: number; // cap (in interactions)
  // Resolution History
  clearedPoints: number; // per human-reviewed cleared flag
  clearedMax: number; // cap (in flags)
  // Confirmed Risk
  riskPenaltyPer: number; // per confirmed flag
  riskMaxPenalty: number;
  riskHighAt: number; // confirmed flags ≥ this → HIGH_RISK
  // Freshness TTL for snapshots
  snapshotTtlHours: number;
  // Status thresholds (score bands shown in the passport)
  establishedMinLevel: number; // L ≥ this → ESTABLISHED
}

export const DEFAULT_RULES: PolicyRules = {
  assuranceBase: [0, 20, 34, 47, 60],
  freshnessFullDays: 15,
  freshnessMinFactor: 0.75,
  credentialPoints: 6,
  credentialMax: 20,
  interactionPoints: 3,
  interactionWindowDays: 90,
  interactionMax: 5,
  clearedPoints: 2,
  clearedMax: 5,
  riskPenaltyPer: 25,
  riskMaxPenalty: 50,
  riskHighAt: 2,
  snapshotTtlHours: 24,
  establishedMinLevel: 2,
};

export const POLICY_V1_SUMMARY =
  "Policy v1 — the directive §36 budgets as shipped through Stage 7: Identity Assurance max 60 (L1 20 / L2 34 / L3 47 / L4 60, freshness-scaled), Credentials 6 per fresh credential (max 20), Reputation +3 per distinct consented L2+ verifier in 90 days (max 5), Resolution +2 per cleared flag (max 5), Confirmed Risk −25 per human-confirmed flag (cap −50), 24h snapshot freshness.";

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.max(min, Math.min(max, v));
}

function clampFactor(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, v));
}

// validateRules — normalize/clamp EVERYTHING. The engine never sees wild
// config: budgets stay non-negative, caps can't exceed their slot, the
// assurance ladder stays monotonic, total stays inside 0–100.
export function validateRules(input: unknown): { rules: PolicyRules; warnings: string[] } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const warnings: string[] = [];

  let base = DEFAULT_RULES.assuranceBase.map((x) => x);
  if (Array.isArray(raw.assuranceBase)) {
    base = (raw.assuranceBase as unknown[]).slice(0, 5).map((x) => clampInt(x, 0, 60, 0));
  }
  while (base.length < 5) base.push(0);
  // Monotonic non-decreasing ladder
  for (let i = 1; i < 5; i++) {
    if (base[i] < base[i - 1]) {
      base[i] = base[i - 1];
      warnings.push(`assuranceBase L${i} raised to L${i - 1}'s value (ladder must be monotonic).`);
    }
  }
  const assuranceMax = base[4];
  if (assuranceMax > 60) warnings.push("Identity Assurance budget exceeds 60 — clamped at write time by schema contract.");

  const rules: PolicyRules = {
    assuranceBase: base as PolicyRules["assuranceBase"],
    freshnessFullDays: clampInt(raw.freshnessFullDays, 1, 365, DEFAULT_RULES.freshnessFullDays),
    freshnessMinFactor: clampFactor(raw.freshnessMinFactor, 0.1, 1, DEFAULT_RULES.freshnessMinFactor),
    credentialPoints: clampInt(raw.credentialPoints, 0, 20, DEFAULT_RULES.credentialPoints),
    credentialMax: clampInt(raw.credentialMax, 0, 40, DEFAULT_RULES.credentialMax),
    interactionPoints: clampInt(raw.interactionPoints, 0, 10, DEFAULT_RULES.interactionPoints),
    interactionWindowDays: clampInt(raw.interactionWindowDays, 1, 365, DEFAULT_RULES.interactionWindowDays),
    interactionMax: clampInt(raw.interactionMax, 1, 20, DEFAULT_RULES.interactionMax),
    clearedPoints: clampInt(raw.clearedPoints, 0, 10, DEFAULT_RULES.clearedPoints),
    clearedMax: clampInt(raw.clearedMax, 1, 20, DEFAULT_RULES.clearedMax),
    riskPenaltyPer: clampInt(raw.riskPenaltyPer, 0, 50, DEFAULT_RULES.riskPenaltyPer),
    riskMaxPenalty: clampInt(raw.riskMaxPenalty, 0, 100, DEFAULT_RULES.riskMaxPenalty),
    riskHighAt: clampInt(raw.riskHighAt, 1, 10, DEFAULT_RULES.riskHighAt),
    snapshotTtlHours: clampInt(raw.snapshotTtlHours, 1, 168, DEFAULT_RULES.snapshotTtlHours),
    establishedMinLevel: clampInt(raw.establishedMinLevel, 1, 4, DEFAULT_RULES.establishedMinLevel),
  };

  // Structural sanity warnings (governance surface — not silent clamps)
  const totalMax =
    rules.assuranceBase[4] + rules.credentialMax + rules.interactionMax * rules.interactionPoints +
    rules.clearedMax * rules.clearedPoints;
  if (totalMax > 100) {
    warnings.push(
      `Component budgets sum to ${totalMax} > 100 — the engine clamps final scores to 0–100, but budgets should be re-balanced.`
    );
  }
  return { rules, warnings };
}

// ---------------------------------------------------------------------------
// Seed + resolution
// ---------------------------------------------------------------------------

// ensurePoliciesSeeded — idempotent: creates policy v1 (ACTIVE) + the v1
// DPIA record (COMPLETED, covering the shipped rules) on first call, plus
// the automated-decision gate setting. Called by the engine read path and
// the admin routes. Guarded against concurrent double-seeding via an
// in-flight promise + unique-constraint tolerance.
const globalForSeed = globalThis as unknown as { __tsPolicySeed?: Promise<void> };

export async function ensurePoliciesSeeded(): Promise<void> {
  if (globalForSeed.__tsPolicySeed) return globalForSeed.__tsPolicySeed;
  globalForSeed.__tsPolicySeed = (async () => {
    // Self-healing seed: each piece is idempotent, so a partially-seeded DB
    // (e.g. after a historical race) converges on the complete state.
    let v1 = await db.scoringPolicy.findUnique({ where: { version: 1 } });
    if (!v1) {
      try {
        v1 = await db.scoringPolicy.create({
          data: {
            version: 1,
            status: "ACTIVE",
            rules: JSON.stringify(DEFAULT_RULES),
            changeSummary: POLICY_V1_SUMMARY,
            createdBy: "platform-seed",
            activatedAt: new Date(),
          },
        });
      } catch (e) {
        // P2002 = another worker seeded v1 concurrently.
        if ((e as { code?: string }).code !== "P2002") throw e;
        v1 = await db.scoringPolicy.findUniqueOrThrow({ where: { version: 1 } });
      }
    }
    const dpia = await db.dpiaRecord.findFirst({ where: { policyId: v1.id } });
    if (!dpia) {
      await db.dpiaRecord.create({
        data: {
          policyId: v1.id,
          status: "COMPLETED",
          summary:
            "DPIA for scoring policy v1 (seeded with the platform): profiling scope limited to platform-recorded verification evidence, reputation and human decisions; no special-category data; explanation, human-review and appeal rights per NDPA §37/§31; automated decisions are limited to score presentation (no auto-blocking) — significant-decision automation stays gated.",
          residualRisk: "LOW",
          checklist: JSON.stringify(DPIA_CHECKLIST.map((c) => ({ ...c, done: true }))),
          completedAt: new Date(),
          createdBy: "platform-seed",
        },
      });
    }
    const setting = await db.platformSetting.findUnique({
      where: { key: "engine.automatedSignificantDecisions" },
    });
    if (!setting) {
      await db.platformSetting.create({
        data: {
          key: "engine.automatedSignificantDecisions",
          value: JSON.stringify({ enabled: false, note: "DPIA-gated — NDPC guidance; must stay false until a full DPIA covers the expanded decision surface." }),
        },
      });
    }
  })();
  return globalForSeed.__tsPolicySeed;
}

export interface ResolvedPolicy {
  id: string;
  version: number;
  status: string;
  rules: PolicyRules;
  changeSummary: string;
  activatedAt: string | null;
  createdAt: string;
}

export function shapePolicy(row: {
  id: string;
  version: number;
  status: string;
  rules: string;
  changeSummary: string;
  activatedAt: Date | null;
  createdAt: Date;
}): ResolvedPolicy {
  const { rules } = validateRules(JSON.parse(row.rules));
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    rules,
    changeSummary: row.changeSummary,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getActivePolicy(): Promise<ResolvedPolicy | null> {
  await ensurePoliciesSeeded();
  const row = await db.scoringPolicy.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { version: "desc" },
  });
  return row ? shapePolicy(row) : null;
}

export async function listPolicies(): Promise<ResolvedPolicy[]> {
  await ensurePoliciesSeeded();
  const rows = await db.scoringPolicy.findMany({ orderBy: { version: "desc" } });
  return rows.map(shapePolicy);
}

// ---------------------------------------------------------------------------
// Draft / activate / retire (ADMIN-only; routes enforce the role)
// ---------------------------------------------------------------------------

export type DraftResult =
  | { ok: true; policy: ResolvedPolicy; warnings: string[] }
  | { ok: false; code: "VALIDATION" };

export async function createDraft(
  adminId: string,
  input: { rules: unknown; changeSummary: string }
): Promise<DraftResult> {
  const { rules, warnings } = validateRules(input.rules);
  if (typeof input.changeSummary !== "string" || input.changeSummary.trim().length < 30) {
    return { ok: false, code: "VALIDATION" };
  }
  const max = await db.scoringPolicy.aggregate({ _max: { version: true } });
  const row = await db.scoringPolicy.create({
    data: {
      version: (max._max.version ?? 0) + 1,
      status: "DRAFT",
      rules: JSON.stringify(rules),
      changeSummary: input.changeSummary.trim().slice(0, 2000),
      createdBy: adminId,
    },
  });
  return { ok: true, policy: shapePolicy(row), warnings };
}

export type ActivateResult =
  | { ok: true; policy: ResolvedPolicy }
  | { ok: false; code: "NOT_FOUND" | "ALREADY_ACTIVE" | "DPIA_REQUIRED" };

// Activation gate: the draft must have a COMPLETED DPIA. The NDPC-governance
// "DPIA before automated significant decisions" rule is enforced HERE, not
// in the UI.
export async function activatePolicy(policyId: string, adminId: string): Promise<ActivateResult> {
  const draft = await db.scoringPolicy.findUnique({ where: { id: policyId } });
  if (!draft) return { ok: false, code: "NOT_FOUND" };
  if (draft.status !== "DRAFT") return { ok: false, code: "ALREADY_ACTIVE" };

  const dpia = await db.dpiaRecord.findFirst({
    where: { policyId: draft.id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
  if (!dpia) return { ok: false, code: "DPIA_REQUIRED" };

  await db.$transaction(async (tx) => {
    await tx.scoringPolicy.updateMany({ where: { status: "ACTIVE" }, data: { status: "RETIRED" } });
    await tx.scoringPolicy.update({
      where: { id: draft.id },
      data: { status: "ACTIVE", activatedAt: new Date() },
    });
  });
  const row = await db.scoringPolicy.findUnique({ where: { id: draft.id } });
  return { ok: true, policy: shapePolicy(row!) };
}

// policyRulesHash — folded into the engine inputsHash so a policy change
// forces recompute for every user (new snapshot names the new policyId).
export function policyRulesHash(rules: PolicyRules): string {
  return sha256Hex(JSON.stringify(rules)).slice(0, 16);
}

// ---------------------------------------------------------------------------
// DPIA checklist (governance evidence — the same items render in the admin
// console and are stored per-record)
// ---------------------------------------------------------------------------

export const DPIA_CHECKLIST: { id: string; label: string }[] = [
  { id: "scope", label: "Profiling scope mapped (data categories, sources, subjects)" },
  { id: "special", label: "No special-category data processed without legal basis" },
  { id: "necessity", label: "Proportionality & necessity of each score input reviewed" },
  { id: "rights", label: "NDPA rights paths verified (explanation, review, appeal, DSR)" },
  { id: "bias", label: "Bias / disparate-impact review of component weights" },
  { id: "security", label: "Security measures for score data reviewed (access, retention)" },
  { id: "human", label: "Human-in-the-loop for adverse outcomes (flags → reviewer)" },
  { id: "retention", label: "Retention & deletion schedule aligned with DSR cascade" },
];

export const DPIA_CHECKLIST_LABELS = Object.fromEntries(DPIA_CHECKLIST.map((c) => [c.id, c.label]));
