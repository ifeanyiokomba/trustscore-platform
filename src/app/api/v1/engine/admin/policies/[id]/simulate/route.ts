// POST /api/v1/engine/admin/policies/:id/simulate — read-only policy impact
// dry-run (Stage 8, ADMIN). Recomputes every member's score in memory under
// the DRAFT rules vs the ACTIVE rules and reports deltas — cohorts, buckets,
// status transitions, top movers (masked identities). NOTHING is written:
// no snapshots, no state changes. Real movement happens only on activation
// (DPIA-gated). Frozen members (appeal pending) are excluded and counted.
//
// Audit discipline: POLICY_SIMULATED carries counters only (cohort, moved,
// frozenExcluded) — never member identities or mover labels.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { simulatePolicyImpact } from "@/lib/services/trustscore-service";
import { recordAudit } from "@/lib/services/audit-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Trust Engine administration is restricted to platform admins.", requestId);
  }
  const rl = rateLimit(`policy-sim:${user.id}`, 3, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many simulations. Wait a minute.", requestId);
  }

  const result = await simulatePolicyImpact(id);
  if (!result.ok) {
    switch (result.code) {
      case "NOT_FOUND":
        return jsonError(404, "NOT_FOUND", "No such policy version.", requestId);
      case "NOT_DRAFT":
        return jsonError(409, "NOT_DRAFT", "Only DRAFT policies can be simulated.", requestId);
      case "NO_ACTIVE":
        return jsonError(409, "NO_ACTIVE", "No active policy to compare against.", requestId);
    }
  }

  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "POLICY_SIMULATED",
    subjectType: "ScoringPolicy",
    subjectId: id,
    metadata: {
      policyVersion: result.draftVersion,
      simulated: result.cohort,
      cohort: result.cohort,
      frozenExcluded: result.frozenExcluded,
    },
  });

  return jsonOk({
    simulation: {
      draftVersion: result.draftVersion,
      activeVersion: result.activeVersion,
      cohort: result.cohort,
      frozenExcluded: result.frozenExcluded,
      moved: result.moved,
      avgBefore: result.avgBefore,
      avgAfter: result.avgAfter,
      avgDelta: result.avgDelta,
      maxUp: result.maxUp,
      maxDown: result.maxDown,
      buckets: result.buckets,
      transitions: result.transitions,
      movers: result.movers,
      note: result.note,
    },
    requestId,
  });
}
