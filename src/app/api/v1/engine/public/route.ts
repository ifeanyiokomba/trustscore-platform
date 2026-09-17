// GET /api/v1/engine/public — PUBLIC trust-engine transparency view (Stage 8).
// Shows every member (and the landing page) the ACTIVE scoring policy —
// rules, budgets, DPIA status and the automated-decision gate state.
// This is the "rules-first, inspectable engine" the audit demands: no
// secrets here by design; the policy IS the public contract.

import { NextRequest } from "next/server";
import { jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { listPolicies, ensurePoliciesSeeded } from "@/lib/services/policy-service";
import { getEngineGate } from "@/lib/services/engine-service";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  const rl = rateLimit(clientKey(req, "engine-public"), 30, 60_000);
  if (!rl.allowed) {
    return jsonOk(
      { error: { code: "RATE_LIMITED", message: "Too many requests — retry shortly.", requestId } },
      429
    );
  }

  await ensurePoliciesSeeded(); // converges seed before reads (DPIA registry)

  const [gate, policies, dpias] = await Promise.all([
    getEngineGate(),
    listPolicies(),
    db.dpiaRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        residualRisk: true,
        summary: true,
        completedAt: true,
        createdAt: true,
        policyId: true,
      },
    }),
  ]);

  const policyMap = new Map(policies.map((p) => [p.id, p.version]));
  const active = gate.activePolicy;
  const activeDpia = dpias.find(
    (d) => d.policyId === active?.id && d.status === "COMPLETED"
  );

  return jsonOk({
    activePolicy: active
      ? {
          version: active.version,
          activatedAt: active.activatedAt,
          changeSummary: active.changeSummary,
          rules: active.rules,
        }
      : null,
    policyHistory: policies.map((p) => ({
      version: p.version,
      status: p.status,
      changeSummary: p.changeSummary,
      activatedAt: p.activatedAt,
    })),
    dpia: {
      status: activeDpia ? "COMPLETED" : "REQUIRED",
      completedAt: activeDpia?.completedAt?.toISOString() ?? null,
      residualRisk: activeDpia?.residualRisk ?? null,
      summary: activeDpia?.summary ?? null,
    },
    dpiRegistry: dpias.map((d) => ({
      status: d.status,
      residualRisk: d.residualRisk,
      policyVersion: policyMap.get(d.policyId) ?? null,
      completedAt: d.completedAt?.toISOString() ?? null,
    })),
    automatedSignificantDecisions: gate.automatedSignificantDecisions,
    gateNote: gate.gateNote,
    language:
      "The scoring policy is public by design (rules-first engine). It changes only through a new versioned policy covered by a completed DPIA — never silently.",
    requestId,
  });
}
