// POST /api/v1/reputation/review/:flagId/decision — a REVIEWER decides a flag
// (Stage 7). Body: { outcome: CONFIRMED | UNFOUNDED | DISMISSED, rationale }.
// Human decision only (directive §33 — no automated significant decisions).
// CONFIRMED feeds Confirmed Risk (−25) via the score engine after an explicit
// markMaterialChange; both parties are notified. Conflict-of-interest guard:
// a reviewer cannot decide a case they filed or that is about them.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { decideFlag } from "@/lib/services/reputation-service";
import { markMaterialChange } from "@/lib/services/trustscore-service";

const DecisionSchema = z
  .object({
    outcome: z.enum(["CONFIRMED", "UNFOUNDED", "DISMISSED"]),
    rationale: z
      .string()
      .trim()
      .min(20, "Publish a rationale of at least 20 characters — both parties will read it.")
      .max(2000),
  })
  .strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ flagId: string }> }
) {
  const requestId = newRequestId();
  const { flagId } = await params;

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(`flag-decision:${user.id}`, 10, 60_000);
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

  const parsed = DecisionSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await decideFlag({ id: user.id, role: user.role }, flagId, parsed.data);
  if (!result.ok) {
    switch (result.code) {
    case "NOT_REVIEWER":
      return jsonError(
        403,
        "FORBIDDEN",
        "Flag decisions are restricted to TrustScore reviewers. This is a human-review surface by design.",
        requestId
      );
    case "NOT_FOUND":
      return jsonError(404, "NOT_FOUND", "No such flag.", requestId);
    case "NOT_DECIDABLE":
      return jsonError(
        409,
        "NOT_DECIDABLE",
        "This flag is already resolved or withdrawn.",
        requestId
      );
    case "CONFLICT":
      return jsonError(
        403,
        "CONFLICT",
        "You cannot decide a case you filed or that is about you (conflict of interest).",
        requestId
      );
    }
  }
  // The subject's score must reflect the human decision immediately.
  await markMaterialChange(result.subjectId, "FLAG_RESOLUTION");
  return jsonOk({
    outcome: "DECIDED",
    flagStatus: result.outcome,
    note:
      parsed.data.outcome === "CONFIRMED"
        ? "The flag is confirmed. The subject's TrustScore now carries a confirmed risk signal (−25) and they can appeal for 14 days."
        : "The flag is cleared. It contributes to the subject's resolution history (+2, capped at 10).",
  });
}
