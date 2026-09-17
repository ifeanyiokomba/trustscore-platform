// POST /api/v1/engine/admin/policies/:id/activate — activate a DRAFT policy
// (Stage 8, ADMIN). HARD GATE: a COMPLETED DPIA record must cover the policy
// (NDPC guidance — "DPIA before enabling automated significant decisions").
// Activation retires the current ACTIVE policy; every member's next read
// recomputes under the new rules (policy hash is part of the inputsHash) and
// new snapshots name the new policyId.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { activatePolicy } from "@/lib/services/policy-service";
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
  const rl = rateLimit(`policy-activate:${user.id}`, 3, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many activations. Wait a minute.", requestId);
  }

  const result = await activatePolicy(id, user.id);
  if (!result.ok) {
    switch (result.code) {
      case "NOT_FOUND":
        return jsonError(404, "NOT_FOUND", "No such policy version.", requestId);
      case "ALREADY_ACTIVE":
        return jsonError(409, "NOT_DRAFT", "This policy is already active or retired.", requestId);
      case "DPIA_REQUIRED":
        return jsonError(
          409,
          "DPIA_REQUIRED",
          "A completed DPIA record must cover this policy before activation (NDPC gate). Record the DPIA first.",
          requestId
        );
    }
  }

  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "POLICY_ACTIVATED",
    subjectType: "ScoringPolicy",
    subjectId: result.policy.id,
    metadata: { policyVersion: result.policy.version },
  });
  return jsonOk({
    policy: result.policy,
    note: "Policy activated. The previous version is retired; members' scores recompute under the new rules on their next read, and every snapshot names the policy that produced it.",
    requestId,
  });
}
