// GET /api/v1/engine/admin/overview — the admin console read model (Stage 8):
// snapshot-state distribution, policy versions, DPIA registry and the gate.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { listPolicies } from "@/lib/services/policy-service";
import { getEngineGate } from "@/lib/services/engine-service";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Trust Engine administration is restricted to platform admins.", requestId);
  }

  const [gate, policies, dpias, snapshotStates, snapshotTotal] = await Promise.all([
    getEngineGate(),
    listPolicies(),
    db.dpiaRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        policyId: true,
        status: true,
        summary: true,
        residualRisk: true,
        checklist: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    db.trustScoreSnapshot.groupBy({ by: ["state"], _count: { _all: true } }),
    db.trustScoreSnapshot.count(),
  ]);

  const policyVersion = new Map(policies.map((p) => [p.id, p.version]));
  return jsonOk({
    gate: {
      automatedSignificantDecisions: gate.automatedSignificantDecisions,
      note: gate.gateNote,
    },
    policies: policies.map((p) => ({ ...p, rules: p.rules })),
    dpia: dpias.map((d) => ({
      id: d.id,
      policyVersion: policyVersion.get(d.policyId) ?? null,
      status: d.status,
      summary: d.summary,
      residualRisk: d.residualRisk,
      checklist: JSON.parse(d.checklist) as { id: string; label: string; done: boolean }[],
      completedAt: d.completedAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
    snapshots: {
      total: snapshotTotal,
      byState: Object.fromEntries(snapshotStates.map((s) => [s.state, s._count._all])),
    },
    requestId,
  });
}
