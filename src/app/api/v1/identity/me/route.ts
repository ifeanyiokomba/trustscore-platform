// GET /api/v1/identity/me — the caller's TrustIdentity + consent history +
// latest verification session timeline (sanitized, masked references only).

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getIdentityForUser } from "@/lib/services/identity-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const result = await getIdentityForUser(user.id);
  return jsonOk(result);
}
