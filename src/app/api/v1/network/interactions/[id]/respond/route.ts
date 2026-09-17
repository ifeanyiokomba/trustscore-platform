// POST /api/v1/network/interactions/:id/respond — the invited member responds
// to a PENDING proposal (Stage 10). Body: { decision: "ACCEPT" | "DECLINE" }.
// ACCEPT activates the mutual attestation (both endpoints' scores recompute);
// DECLINE is recorded honestly for the proposer's list and neither side is
// scored. Either party can revoke later.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { respondToInteraction } from "@/lib/services/network-service";

const RespondSchema = z
  .object({ decision: z.enum(["ACCEPT", "DECLINE"]) })
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

  const rl = rateLimit(`network-respond:${user.id}`, 20, 60_000);
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

  const result = await respondToInteraction(user.id, id, parsed.data.decision);
  if (!result.ok) {
    switch (result.code) {
    case "NOT_FOUND":
      return jsonError(404, "NOT_FOUND", "No such interaction proposal.", requestId);
    case "NOT_INVITED":
      return jsonError(403, "NOT_INVITED", "This proposal was not sent to you.", requestId);
    case "NOT_PENDING":
      return jsonError(409, "NOT_PENDING", "This proposal was already responded to.", requestId);
    case "EXPIRED":
      return jsonError(409, "EXPIRED", "This proposal expired (7-day window).", requestId);
    }
  }

  return jsonOk({
    status: result.status,
    note:
      result.status === "ACTIVE"
        ? "Mutual attestation active — it counts toward Verified Reputation for both of you (policy-capped) and either side can revoke it at any time."
        : "Declined — nothing changes for either side's score.",
  });
}
