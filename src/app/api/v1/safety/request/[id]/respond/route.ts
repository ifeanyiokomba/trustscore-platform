// POST /api/v1/safety/request/:id/respond — subject responds to a Trust
// Request (Stage 6). ACCEPT mints a scoped, receipted trust link (raw token
// returned ONCE — the subject's to keep/share) and runs the named assessment
// for the verifier (recorded in their Safety Check history). DECLINE is
// final for this request; nothing is ever shared on decline.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { respondTrustRequest } from "@/lib/services/safety-service";

const RespondSchema = z.object({
  decision: z.enum(["ACCEPT", "DECLINE"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(`trust-respond:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many responses. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = RespondSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const { id } = await params;
  const result = await respondTrustRequest(user.id, id, parsed.data.decision);

  switch (result.outcome) {
    case "OK":
      return jsonOk({
        outcome: "OK",
        decision: result.decision,
        // Raw token: present ONLY on accept, exactly once.
        ...(result.decision === "ACCEPTED"
          ? { token: result.token, linkPath: result.linkPath }
          : {}),
      });
    case "NOT_FOUND":
      return jsonError(404, "NOT_FOUND", "No such trust request for your account.", requestId);
    case "NOT_PENDING":
      return jsonError(409, "NOT_PENDING", "This trust request was already answered.", requestId);
    case "EXPIRED":
      return jsonError(410, "EXPIRED", "This trust request expired.", requestId);
  }
}
