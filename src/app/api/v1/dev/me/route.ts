// GET /api/v1/dev/me — the Developer Portal read model (Stage 9).
// Returns every API client the signed-in member can see (as OWNER or team
// member — membership IS visibility), with keys (prefixes only — raw keys
// exist only in the minting response), team, quota state, 14-day usage,
// webhook config + recent deliveries, and plan limits.

import { NextRequest } from "next/server";
import { jsonOk, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getPortalForUser } from "@/lib/services/devportal-service";
import { API_HONESTY_NOTE } from "@/lib/services/trustdecision-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) {
    return jsonOk(
      { error: { code: "UNAUTHENTICATED", message: "No active session.", requestId } },
      401
    );
  }
  const portal = await getPortalForUser(user.id);
  return jsonOk({
    you: { handle: user.handle, displayName: user.displayName },
    clients: portal.clients,
    limits: portal.limits,
    honesty: API_HONESTY_NOTE,
    requestId,
  });
}
