// POST /api/v1/identity/consents/:id/withdraw — Stage 3, NDPA §31 consent
// withdrawal. Revokes the consent + attributes it produced; if it established
// the TrustIdentity, revokes the identity spine (re-verify to re-establish).

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { withdrawConsent } from "@/lib/services/identity-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "consent-withdraw"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many requests. Please wait a minute.", requestId);
  }

  const { id } = await params;
  if (!id || id.length > 64) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid consent id.", requestId);
  }

  const result = await withdrawConsent(user.id, id, requestId);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return jsonError(404, "NOT_FOUND", "Consent not found.", requestId);
    }
    return jsonError(409, "ALREADY_WITHDRAWN", "This consent was already withdrawn.", requestId);
  }

  return jsonOk({
    withdrawn: true,
    revokedAttributes: result.revokedAttributes,
    identityRevoked: result.identityRevoked,
  });
}
