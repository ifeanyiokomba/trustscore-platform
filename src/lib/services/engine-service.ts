// TrustScore Stage 8 — Trust Engine lifecycle service.
//
// Owns the snapshot STATE machine and the DPIA-gated automated-decision
// switch (audit §4.2):
//   ACTIVE  → the fresh, canonical snapshot (still gated by 24h TTL + hash)
//   FROZEN  → an appeal on a confirmed flag is PENDING → the score stops
//             moving (both up and down) until the human decision lands; the
//             passport clearly labels this. Fair-process guarantee.
//   STALE   → TTL lapsed (display state — computed on read, never persisted
//             as a mutation of the row's meaning; getEngineMe derives it)
//   RETIRED → superseded by a newer snapshot (kept for history/DSR)
//
// Freeze semantics: freezeScoresFor(userId, reason) marks the latest
// snapshot FROZEN. While a freeze is in force, getScoreSnapshot returns the
// frozen row as-is (no recompute, no new snapshots, hash changes ignored).
// unfreeze + recompute happen on appeal decision via markMaterialChange.
//
// The automated-decision gate: engine.automatedSignificantDecisions platform
// setting — default FALSE, DPIA-gated. While false, every surface that could
// act on scores says "human review required" instead of acting. This is the
// NDPC-guidance gate the Stage 0 audit demanded before any automated
// significant decision ships.

import { db } from "@/lib/db";
import { getActivePolicy, policyRulesHash } from "@/lib/services/policy-service";
import { markMaterialChange } from "@/lib/services/trustscore-service";

export type SnapshotState = "ACTIVE" | "STALE" | "FROZEN" | "RETIRED";

export const AUTOMATED_DECISIONS_KEY = "engine.automatedSignificantDecisions";

// ---------------------------------------------------------------------------
// Automated-decision gate (DPIA)
// ---------------------------------------------------------------------------

export async function isAutomatedDecisionsEnabled(): Promise<boolean> {
  const row = await db.platformSetting.findUnique({
    where: { key: AUTOMATED_DECISIONS_KEY },
  });
  if (!row) return false;
  try {
    const v = JSON.parse(row.value) as { enabled?: boolean };
    return v.enabled === true;
  } catch {
    return false;
  }
}

export async function getEngineGate() {
  const [enabled, policy] = await Promise.all([
    isAutomatedDecisionsEnabled(),
    getActivePolicy(),
  ]);
  return {
    automatedSignificantDecisions: enabled,
    gateNote: enabled
      ? "Automated significant decisions are ENABLED under a completed DPIA. Every decision remains explainable and appealable (NDPA §37)."
      : "Automated significant decisions are DISABLED by policy — the DPIA gate (NDPC guidance) is closed. Scores are presented for transparency and every adverse path routes to human review.",
    activePolicy: policy,
  };
}

export async function setAutomatedDecisions(enabled: boolean): Promise<void> {
  await db.platformSetting.upsert({
    where: { key: AUTOMATED_DECISIONS_KEY },
    create: {
      key: AUTOMATED_DECISIONS_KEY,
      value: JSON.stringify({
        enabled,
        note: enabled
          ? "Enabled under a completed DPIA covering the active scoring policy."
          : "DPIA-gated — disabled by default; requires a completed DPIA and an explicit governance decision.",
      }),
    },
    update: {
      value: JSON.stringify({
        enabled,
        note: enabled
          ? "Enabled under a completed DPIA covering the active scoring policy."
          : "DPIA-gated — disabled by default; requires a completed DPIA and an explicit governance decision.",
      }),
    },
  });
}

// ---------------------------------------------------------------------------
// Freeze-on-appeal
// ---------------------------------------------------------------------------

export type FreezeResult = "FROZEN" | "ALREADY_FROZEN" | "NO_SNAPSHOT";

// freezeScoresFor — called when a subject files an appeal on a confirmed
// flag. Marks their latest snapshot FROZEN (reason APPEAL_PENDING). While
// frozen, getScoreSnapshot serves the frozen row verbatim.
export async function freezeScoresFor(userId: string, reason: string): Promise<FreezeResult> {
  const latest = await db.trustScoreSnapshot.findFirst({
    where: { userId },
    orderBy: { computedAt: "desc" },
  });
  if (!latest) return "NO_SNAPSHOT";
  if (latest.state === "FROZEN") return "ALREADY_FROZEN";
  await db.trustScoreSnapshot.update({
    where: { id: latest.id },
    data: { state: "FROZEN", frozenAt: new Date(), frozenReason: reason },
  });
  return "FROZEN";
}

// unfreezeScoresFor — on appeal decision: retire the frozen row (it stays in
// history) and let markMaterialChange recompute a fresh ACTIVE snapshot.
export async function unfreezeScoresFor(userId: string): Promise<void> {
  const frozen = await db.trustScoreSnapshot.findFirst({
    where: { userId, state: "FROZEN" },
    orderBy: { computedAt: "desc" },
  });
  if (frozen) {
    await db.trustScoreSnapshot.update({
      where: { id: frozen.id },
      data: { state: "RETIRED" },
    });
  }
  await markMaterialChange(userId, "APPEAL_RESOLVED");
}

// isFrozen — does the user currently have a FROZEN latest snapshot?
export async function isFrozen(userId: string): Promise<boolean> {
  const latest = await db.trustScoreSnapshot.findFirst({
    where: { userId },
    orderBy: { computedAt: "desc" },
  });
  return latest?.state === "FROZEN";
}

// deriveState — the display state: FROZEN if frozen; STALE if TTL lapsed;
// else ACTIVE.
export function deriveState(row: { state: string; expiresAt: Date }): SnapshotState {
  if (row.state === "FROZEN") return "FROZEN";
  if (row.state === "RETIRED") return "RETIRED";
  return row.expiresAt.getTime() > Date.now() ? "ACTIVE" : "STALE";
}

// ---------------------------------------------------------------------------
// Public engine read model — GET /api/v1/engine/me
// ---------------------------------------------------------------------------

export async function getEngineMe(userId: string) {
  const [snapshot, gate, policy, historyRows, policyRows] = await Promise.all([
    db.trustScoreSnapshot.findFirst({
      where: { userId },
      orderBy: { computedAt: "desc" },
    }),
    isAutomatedDecisionsEnabled(),
    getActivePolicy(),
    // Stage 8 — snapshot history (immutable rows, latest 20 retained):
    // feeds the member's score-over-time sparkline + lifecycle log.
    db.trustScoreSnapshot.findMany({
      where: { userId },
      orderBy: { computedAt: "desc" },
      take: 20,
    }),
    db.scoringPolicy.findMany({ select: { id: true, version: true } }),
  ]);
  const versionById = new Map(policyRows.map((p) => [p.id, p.version]));
  const state = snapshot ? deriveState(snapshot) : null;
  const history = historyRows
    .slice()
    .reverse() // chronological — oldest → newest
    .map((row) => ({
      score: row.score,
      status: row.status,
      state: deriveState(row),
      trigger: row.trigger,
      computedAt: row.computedAt.toISOString(),
      policyVersion: row.policyId ? versionById.get(row.policyId) ?? null : null,
    }));
  return {
    snapshot: snapshot
      ? {
          state,
          frozenReason: snapshot.state === "FROZEN" ? snapshot.frozenReason : null,
          frozenAt: snapshot.frozenAt?.toISOString() ?? null,
          policyVersion: policy?.version ?? null,
          computedAt: snapshot.computedAt.toISOString(),
          expiresAt: snapshot.expiresAt.toISOString(),
          trigger: snapshot.trigger,
        }
      : null,
    policy: policy
      ? {
          version: policy.version,
          changeSummary: policy.changeSummary,
          activatedAt: policy.activatedAt,
        }
      : null,
    automatedSignificantDecisions: gate,
    history,
    frozenNote:
      state === "FROZEN"
        ? "Your TrustScore is frozen while an appeal is under human review — it cannot move up or down until the reviewer decides. This is a fairness guarantee (NDPA §37)."
        : null,
  };
}
