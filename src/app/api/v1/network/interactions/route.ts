// POST /api/v1/network/interactions — propose a mutual verified interaction
// (Stage 10). Body: { handle }.
// Gates (anti-gaming, mirroring the flag layer): both sides must be ACTIVE
// network members at L2+, one open lifecycle per pair, 3 proposals per 7
// days, 50-active-edge caps. The invited member is notified; the proposal
// expires after 7 days.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { proposeInteraction } from "@/lib/services/network-service";

const ProposeSchema = z
  .object({ handle: z.string().trim().min(1).max(64) })
  .strict();

const CODE_MESSAGES: Record<string, [number, string, string]> = {
  NOT_A_MEMBER: [409, "NOT_A_MEMBER", "Join the Trust Network before proposing interactions (it is opt-in)."],
  TARGET_NOT_MEMBER: [404, "TARGET_NOT_MEMBER", "That member has not joined the Trust Network."],
  UNKNOWN_HANDLE: [404, "UNKNOWN_HANDLE", "No member with that handle."],
  SELF: [422, "SELF", "You cannot attest an interaction with yourself."],
  LEVEL_GATE: [403, "LEVEL_GATE", "Verified interactions require your identity at L2+ (phone or biometric signal verified)."],
  TARGET_LEVEL_GATE: [404, "TARGET_LEVEL_GATE", "That member is not currently L2+ — they cannot join attestations."],
  QUOTA: [429, "QUOTA", "Proposal quota reached (3 per 7 days) — attestation quality over quantity."],
  OPEN_LIFECYCLE: [409, "OPEN_LIFECYCLE", "You already have an open or active interaction with that member."],
  EDGE_CAP: [409, "EDGE_CAP", "You reached the 50 active-interaction cap — revoke one to propose another."],
  TARGET_EDGE_CAP: [409, "TARGET_EDGE_CAP", "That member reached their active-interaction cap."],
};

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(`network-propose:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many proposals. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = ProposeSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await proposeInteraction(user.id, parsed.data.handle);
  if (!result.ok) {
    const [status, code, message] = CODE_MESSAGES[result.code];
    return jsonError(status, code, message, requestId);
  }

  return jsonOk(
    {
      outcome: "PROPOSED",
      edgeId: result.edgeId,
      expiresAt: result.expiresAt,
      note: "Proposal sent — it counts only if the other member accepts (mutual attestation). It expires in 7 days.",
    },
    201
  );
}
