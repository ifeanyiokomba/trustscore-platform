// DELETE /api/v1/passport/share/:id — revoke a Trust Link immediately.
// Subsequent public views of the revoked token return 410.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { revokeShareToken } from "@/lib/services/passport-service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "share-revoke"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many revocations. Wait a minute.", requestId);
  }

  const { id } = await params;
  const outcome = await revokeShareToken(user.id, id);
  if (outcome === "NOT_FOUND") {
    return jsonError(404, "NOT_FOUND", "Trust link not found.", requestId);
  }
  if (outcome === "ALREADY") {
    return jsonError(409, "ALREADY_REVOKED", "This trust link is already revoked.", requestId);
  }
  return jsonOk({ revoked: true, id });
}
