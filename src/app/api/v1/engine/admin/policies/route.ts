// GET  /api/v1/engine/admin/policies — list all policy versions (Stage 8, ADMIN).
// POST /api/v1/engine/admin/policies — create a DRAFT policy version from
// proposed rules + a change summary (≥30 chars). Rules are validated and
// clamped server-side (validateRules) — the engine never trusts raw config.
// A draft activates only via /activate, which requires a COMPLETED DPIA.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { createDraft, listPolicies, DEFAULT_RULES } from "@/lib/services/policy-service";
import { recordAudit } from "@/lib/services/audit-service";

const PolicyDraftSchema = z
  .object({
    rules: z.record(z.string(), z.unknown()).optional(), // omitted → defaults (v1 rules)
    changeSummary: z
      .string()
      .trim()
      .min(30, "Describe what changed and why (at least 30 characters) — it will be published.")
      .max(2000),
  })
  .strict();

export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Trust Engine administration is restricted to platform admins.", requestId);
  }
  const policies = await listPolicies();
  return jsonOk({ policies, defaults: DEFAULT_RULES, requestId });
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Trust Engine administration is restricted to platform admins.", requestId);
  }
  const rl = rateLimit(`policy-draft:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many policy drafts. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = PolicyDraftSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await createDraft(user.id, {
    rules: parsed.data.rules ?? DEFAULT_RULES,
    changeSummary: parsed.data.changeSummary,
  });
  if (!result.ok) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid policy rules or change summary.", requestId);
  }
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "POLICY_DRAFTED",
    subjectType: "ScoringPolicy",
    subjectId: result.policy.id,
    metadata: { policyVersion: result.policy.version, warnings: result.warnings.length },
  });
  return jsonOk(
    {
      policy: result.policy,
      warnings: result.warnings,
      note: "Draft created. It becomes ACTIVE only after a completed DPIA record and an explicit activation.",
      requestId,
    },
    201
  );
}
