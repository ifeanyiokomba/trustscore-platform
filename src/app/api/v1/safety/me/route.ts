// GET /api/v1/safety/me — subject-side Safety Check surface (Stage 6):
// standing-consent settings, check statistics, checks RECEIVED (named
// verifiers), trust requests received, locked card language.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getSafetyMe } from "@/lib/services/safety-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const data = await getSafetyMe(user.id);
  return jsonOk(data);
}
