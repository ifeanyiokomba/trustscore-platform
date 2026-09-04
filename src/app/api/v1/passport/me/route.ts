// GET /api/v1/passport/me — the caller's Trust Passport read model:
// profile, TrustScore snapshot (score/confidence/risk band/components/
// explanation/freshness), credentials, share-token metadata (never raw),
// trust receipts, active sessions, notifications, security events.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getPassportForUser, currentSessionToken } from "@/lib/services/passport-service";
import { syncCredentials } from "@/lib/services/trustscore-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  // Keep credentials in lockstep with the evidence spine before reading.
  await syncCredentials(user.id);
  const result = await getPassportForUser(user.id, currentSessionToken(req));
  return jsonOk(result);
}
