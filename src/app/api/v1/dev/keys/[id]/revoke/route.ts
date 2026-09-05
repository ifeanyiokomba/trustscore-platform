// POST /api/v1/dev/keys/:id/revoke — revoke an API key (Stage 9).
// OWNER/DEVELOPER role. Revocation is immediate: the very next
// X-API-Key request gets a uniform 401. Members without visibility of the
// key's client get a uniform 404 (no existence leak).

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { revokeApiKey } from "@/lib/services/devportal-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  const rl = rateLimit(`dev-revoke:${user.id}`, 10, 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED", "Too many key operations. Wait a minute.", requestId);

  const result = await revokeApiKey(user.id, id);
  if (!result.ok) {
    switch (result.code) {
      case "NOT_FOUND":
        return jsonError(404, "NOT_FOUND", "No such API key.", requestId);
      case "FORBIDDEN":
        return jsonError(403, "FORBIDDEN", "Your team role does not allow revoking keys.", requestId);
      case "ALREADY_REVOKED":
        return jsonError(409, "ALREADY_REVOKED", "This key is already revoked.", requestId);
    }
  }
  return jsonOk({ revoked: true, keyId: id, requestId });
}
