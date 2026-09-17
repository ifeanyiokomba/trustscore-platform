// GET /api/v1/engine/me — the member's Trust Engine state (Stage 8):
// snapshot lifecycle (ACTIVE/STALE/FROZEN), the policy that produced it,
// the DPIA/automated-decision gate, and the freeze note when an appeal is
// pending. Session required.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getEngineMe } from "@/lib/services/engine-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const data = await getEngineMe(user.id);
  return jsonOk({ ...data, requestId });
}
