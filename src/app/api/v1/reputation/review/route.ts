// GET /api/v1/reputation/review — the HUMAN review queue (Stage 7).
// REVIEWER role only (operational grant — never self-service). Returns the
// decision queue (UNDER_REVIEW first, then OPEN cases) and pending appeals,
// with full party identities, evidence and responses. Role gate is 403
// (FORBIDDEN) — honest, not hidden: the queue is reviewer-only by design.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getReviewQueue } from "@/lib/services/reputation-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const queue = await getReviewQueue({ id: user.id, role: user.role });
  if (!queue) {
    return jsonError(
      403,
      "FORBIDDEN",
      "The review queue is restricted to TrustScore reviewers. Reviewer access is an operational grant, never a self-service setting.",
      requestId
    );
  }
  return jsonOk(queue);
}
