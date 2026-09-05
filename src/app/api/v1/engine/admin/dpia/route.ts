// POST /api/v1/engine/admin/dpia — record a DPIA assessment for a policy
// (Stage 8, ADMIN). Body: { policyId, summary, residualRisk, checklist:[{id,done}] }.
// The record becomes COMPLETED only when EVERY checklist item is done —
// partial submissions stay IN_PROGRESS. A completed DPIA unlocks policy
// activation (NDPC guidance gate).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { DPIA_CHECKLIST } from "@/lib/services/policy-service";
import { recordAudit } from "@/lib/services/audit-service";
import { db } from "@/lib/db";

const ChecklistItemSchema = z.object({
  id: z.string(),
  done: z.boolean(),
});

const DpiaSchema = z
  .object({
    policyId: z.string().min(1),
    summary: z
      .string()
      .trim()
      .min(60, "Summarize scope, risks and mitigations (at least 60 characters) — this is the public registry entry.")
      .max(4000),
    residualRisk: z.enum(["LOW", "MEDIUM", "HIGH"]),
    checklist: z.array(ChecklistItemSchema).min(1),
  })
  .strict();

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Trust Engine administration is restricted to platform admins.", requestId);
  }
  const rl = rateLimit(`dpia-record:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many DPIA submissions. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = DpiaSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const policy = await db.scoringPolicy.findUnique({ where: { id: parsed.data.policyId } });
  if (!policy) {
    return jsonError(404, "NOT_FOUND", "No such policy version.", requestId);
  }

  // Normalize checklist against the canonical items; unknown ids rejected.
  const known = new Set(DPIA_CHECKLIST.map((c) => c.id));
  const submitted = new Map(parsed.data.checklist.map((c) => [c.id, c.done]));
  for (const id of submitted.keys()) {
    if (!known.has(id)) {
      return jsonError(422, "VALIDATION_ERROR", `Unknown checklist item: ${id}`, requestId);
    }
  }
  const checklist = DPIA_CHECKLIST.map((c) => ({ id: c.id, label: c.label, done: submitted.get(c.id) ?? false }));
  const allDone = checklist.every((c) => c.done);

  const record = await db.dpiaRecord.create({
    data: {
      policyId: policy.id,
      status: allDone ? "COMPLETED" : "IN_PROGRESS",
      summary: parsed.data.summary,
      residualRisk: parsed.data.residualRisk,
      checklist: JSON.stringify(checklist),
      completedAt: allDone ? new Date() : null,
      createdBy: user.id,
    },
  });

  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "DPIA_RECORDED",
    subjectType: "ScoringPolicy",
    subjectId: policy.id,
    metadata: { policyVersion: policy.version, status: record.status, residualRisk: record.residualRisk },
  });

  return jsonOk(
    {
      dpia: {
        id: record.id,
        status: record.status,
        residualRisk: record.residualRisk,
        completedAt: record.completedAt?.toISOString() ?? null,
        checklist,
      },
      policyVersion: policy.version,
      note: allDone
        ? "DPIA completed — this policy can now be activated."
        : "DPIA saved as IN_PROGRESS — every checklist item must be done before it unlocks activation.",
      requestId,
    },
    201
  );
}
