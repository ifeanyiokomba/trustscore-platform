// POST /api/v1/passport/credentials/:id/revoke — manually revoke a passport
// credential (NDPA-style control: the assertion leaves the Trust Card until
// the underlying signal is re-verified). Manual revocation sticks.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { revokeCredential } from "@/lib/services/passport-service";
import { markMaterialChange } from "@/lib/services/trustscore-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "cred-revoke"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many revocations. Wait a minute.", requestId);
  }

  const { id } = await params;
  const outcome = await revokeCredential(user.id, id);
  if (outcome === "NOT_FOUND") {
    return jsonError(404, "NOT_FOUND", "Credential not found.", requestId);
  }
  if (outcome === "ALREADY") {
    return jsonError(409, "ALREADY_REVOKED", "Credential is already revoked.", requestId);
  }
  await markMaterialChange(user.id, "CREDENTIAL_REVOKED");
  return jsonOk({ revoked: true, id });
}
