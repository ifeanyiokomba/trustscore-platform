// POST /api/v1/reputation/appeals/:id/decision — a REVIEWER decides a PENDING
// appeal (Stage 7). Body: { outcome: UPHELD | OVERTURNED, note }.
// OVERTURNED flips the flag to RESOLVED_UNFOUNDED: the risk penalty is
// removed and the flag counts toward resolution history (NDPA §37 redress).
// Both parties are notified; the subject's score recomputes immediately.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { decideAppeal } from "@/lib/services/reputation-service";
import { markMaterialChange } from "@/lib/services/trustscore-service";

const AppealDecisionSchema = z
  .object({
    outcome: z.enum(["UPHELD", "OVERTURNED"]),
    note: z
      .string()
      .trim()
      .min(20, "Publish a note of at least 20 characters — the appellant will read it.")
      .max(2000),
  })
  .strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(`appeal-decision:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many decisions. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = AppealDecisionSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await decideAppeal({ id: user.id, role: user.role }, id, parsed.data);
  if (!result.ok) {
    switch (result.code) {
    case "NOT_REVIEWER":
      return jsonError(
        403,
        "FORBIDDEN",
        "Appeal decisions are restricted to TrustScore reviewers.",
        requestId
      );
    case "NOT_FOUND":
      return jsonError(404, "NOT_FOUND", "No such appeal.", requestId);
    case "NOT_PENDING":
      return jsonError(409, "NOT_PENDING", "This appeal was already decided.", requestId);
    case "CONFLICT":
      return jsonError(
        403,
        "CONFLICT",
        "You cannot decide an appeal on a case you filed or that is about you.",
        requestId
      );
    }
  }
  await markMaterialChange(result.appellantId, "APPEAL_DECIDED");
  return jsonOk({
    outcome: "DECIDED",
    appealStatus: result.outcome,
    note:
      result.outcome === "OVERTURNED"
        ? "The confirmation is overturned — the flag now reads as cleared, the risk penalty is removed and it counts toward resolution history."
        : "The decision stands — the flag remains a confirmed risk signal.",
  });
}
