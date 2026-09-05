// POST /api/v1/network/membership — join or pause Trust Network membership
// (Stage 10). Body: { status: "ACTIVE" | "PAUSED" }.
// Joining creates a standing NETWORK consent (NDPA §31); pausing withdraws
// it and stops every edge counting toward Verified Reputation immediately
// (both endpoints recompute). All state changes are audited.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { joinNetwork, pauseNetwork } from "@/lib/services/network-service";

const MembershipSchema = z
  .object({ status: z.enum(["ACTIVE", "PAUSED"]) })
  .strict();

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(`network-membership:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many membership changes. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = MembershipSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result =
    parsed.data.status === "ACTIVE"
      ? await joinNetwork(user.id)
      : await pauseNetwork(user.id);

  if (!result.ok) {
    switch (result.code) {
    case "ALREADY_JOINED":
      return jsonError(409, "ALREADY_JOINED", "You are already an active network member.", requestId);
    case "NOT_A_MEMBER":
      return jsonError(409, "NOT_A_MEMBER", "You have not joined the Trust Network yet.", requestId);
    }
  }

  return jsonOk({
    status: result.status,
    joinedAt: result.joinedAt,
    note:
      result.status === "ACTIVE"
        ? "Membership active — mutual verified interactions can now count toward your Verified Reputation, and band-level shared signals (if any) appear in consented safety checks."
        : "Membership paused — your edges stop counting toward Verified Reputation immediately and no shared signals are returned in checks. Re-join at any time.",
  });
}
