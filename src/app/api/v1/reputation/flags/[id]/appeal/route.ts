// POST /api/v1/reputation/flags/:id/appeal — the SUBJECT appeals a CONFIRMED
// resolution (Stage 7, NDPA §37 redress). One appeal per flag, within 14 days
// of the reviewer's decision. The appeal goes to a fresh human review.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { fileAppeal } from "@/lib/services/reputation-service";

const AppealSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(20, "Explain your appeal in at least 20 characters — the reviewer needs your grounds.")
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

  const rl = rateLimit(`flag-appeal:${user.id}`, 3, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many appeals. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = AppealSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await fileAppeal(user.id, id, parsed.data);
  if (!result.ok) {
    switch (result.code) {
    case "NOT_FOUND":
      return jsonError(404, "NOT_FOUND", "No such flag.", requestId);
    case "NOT_SUBJECT":
      return jsonError(403, "NOT_SUBJECT", "Only the flagged member can appeal this flag.", requestId);
    case "NOT_CONFIRMED":
      return jsonError(
        409,
        "NOT_CONFIRMED",
        "Only confirmed flags can be appealed. This flag was cleared or withdrawn — nothing to appeal.",
        requestId
      );
    case "ALREADY_APPEALED":
      return jsonError(
        409,
        "ALREADY_APPEALED",
        "You already appealed this flag — each flag gets exactly one appeal.",
        requestId
      );
    case "WINDOW_CLOSED":
      return jsonError(
        409,
        "WINDOW_CLOSED",
        "The 14-day appeal window for this decision has closed.",
        requestId
      );
    }
  }
  return jsonOk({
    outcome: "APPEALED",
    appealId: result.appealId,
    note: "Your appeal is queued for a fresh human review. You will be notified when it is decided.",
  });
}
