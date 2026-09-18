// GET /api/v1/auth/identifiers — the caller's authentication identifiers
// (masked view model — raw phones and Google subjects never leave the server)
// + a phone-link OTP can be started via /auth/phone/start (purpose LINK).

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { listIdentifiers } from "@/lib/services/auth-identifier-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const identifiers = await listIdentifiers(user.id);
  return jsonOk({ identifiers, requestId });
}
