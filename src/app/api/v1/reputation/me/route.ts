// GET /api/v1/reputation/me — the member's reputation read model (Stage 7):
// flags against them (masked reporters), flags they filed, response/appeal
// states, anti-gaming eligibility (L2 gate) and standing stats. Reviewers
// additionally learn their role (the review queue is a separate endpoint).

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getReputationMe } from "@/lib/services/reputation-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const data = await getReputationMe(user.id);
  return jsonOk(data);
}
