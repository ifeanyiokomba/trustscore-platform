// POST /api/v1/engine/admin/gate — toggle the automated-significant-decisions
// gate (Stage 8, ADMIN). Body: { enabled: boolean, confirm: string } — the
// confirm field must be "I UNDERSTAND" (typing it is the deliberate act).
// Enabling additionally requires: a COMPLETED DPIA covering the ACTIVE
// policy. Disabling is always allowed (safe direction is never gated).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { setAutomatedDecisions, isAutomatedDecisionsEnabled } from "@/lib/services/engine-service";
import { getActivePolicy } from "@/lib/services/policy-service";
import { recordAudit } from "@/lib/services/audit-service";
import { db } from "@/lib/db";

const GateSchema = z
  .object({
    enabled: z.boolean(),
    confirm: z.string().trim(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Trust Engine administration is restricted to platform admins.", requestId);
  }
  const rl = rateLimit(`engine-gate:${user.id}`, 3, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many gate toggles. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = GateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid input.", requestId);
  }

  if (parsed.data.enabled) {
    if (parsed.data.confirm !== "I UNDERSTAND") {
      return jsonError(
        422,
        "CONFIRM_REQUIRED",
        'Enabling automated significant decisions requires typing "I UNDERSTAND" in the confirm field.',
        requestId
      );
    }
    const policy = await getActivePolicy();
    if (!policy) {
      return jsonError(409, "NO_ACTIVE_POLICY", "No active scoring policy.", requestId);
    }
    const dpia = await db.dpiaRecord.findFirst({
      where: { policyId: policy.id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    });
    if (!dpia) {
      return jsonError(
        409,
        "DPIA_REQUIRED",
        "A completed DPIA must cover the active policy before automated significant decisions can be enabled (NDPC gate).",
        requestId
      );
    }
  }

  await setAutomatedDecisions(parsed.data.enabled);
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "ENGINE_GATE_TOGGLED",
    subjectType: "PlatformSetting",
    subjectId: "engine.automatedSignificantDecisions",
    metadata: { enabled: parsed.data.enabled },
  });
  const enabled = await isAutomatedDecisionsEnabled();
  return jsonOk({
    automatedSignificantDecisions: enabled,
    note: enabled
      ? "Automated significant decisions are ENABLED under a completed DPIA. Every decision remains explainable and appealable (NDPA §37)."
      : "Automated significant decisions are DISABLED — the DPIA gate stays closed; adverse paths route to human review.",
    requestId,
  });
}
