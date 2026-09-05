// GET /api/v1/safety/checks — the verifier's own check history + sent trust
// requests (Stage 6). Assessments are shown as the snapshot the verifier saw
// at check time — history is immutable, like trust receipts.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getChecksByVerifier } from "@/lib/services/safety-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const data = await getChecksByVerifier(user.id);
  return jsonOk(data);
}
