// POST /api/v1/network/interactions/:id/revoke — cancel your own PENDING
// proposal or revoke an ACTIVE attestation (Stage 10). Either participant
// may revoke an active edge; only the proposer may cancel a pending one.
// Revocation is immediate: the edge stops counting for both endpoints and
// both scores recompute.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { revokeInteraction } from "@/lib/services/network-service";

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

  const rl = rateLimit(`network-revoke:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many revocations. Wait a minute.", requestId);
  }

  const result = await revokeInteraction(user.id, id);
  if (!result.ok) {
    switch (result.code) {
    case "NOT_FOUND":
      return jsonError(404, "NOT_FOUND", "No such interaction.", requestId);
    case "NOT_PARTICIPANT":
      return jsonError(403, "NOT_PARTICIPANT", "You are not part of this interaction.", requestId);
    case "NOT_OPEN":
      return jsonError(409, "NOT_OPEN", "Only pending or active interactions can be revoked.", requestId);
    case "ONLY_REQUESTER_CANCELS":
      return jsonError(403, "ONLY_REQUESTER_CANCELS", "Only the proposer can cancel a pending proposal — decline it instead if you were invited.", requestId);
    }
  }

  return jsonOk({
    status: result.status,
    note: "Revoked — the interaction no longer counts toward Verified Reputation for either side. The row is kept in your audit history.",
  });
}
