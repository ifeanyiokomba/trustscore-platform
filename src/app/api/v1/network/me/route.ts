// GET /api/v1/network/me — the member's Trust Network state (Stage 10):
// membership + consent, graph (nodes/edges), pending interactions, standing
// (degree, counting partners, quota), own shared signals (with dispute path),
// k-anonymity explainer and the honesty labels. Session required.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getNetworkMe } from "@/lib/services/network-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const data = await getNetworkMe(user.id);
  return jsonOk({ ...data, requestId });
}
