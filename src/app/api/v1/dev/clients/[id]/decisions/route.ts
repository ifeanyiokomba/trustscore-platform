// GET /api/v1/dev/clients/:id/decisions — the business's own decision
// history (Stage 9). Any team role (VIEWER+). Masked inputs only — a handle
// echo is the business's own request data; phone inputs are "verified phone
// (hashed)". Also opportunistically processes due webhook retries.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getDecisions, PortalError } from "@/lib/services/devportal-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  try {
    const result = await getDecisions(user.id, id, 50);
    if (!result.ok) {
      return jsonError(result.code === "NOT_FOUND" ? 404 : 403, result.code, "No access to this API client.", requestId);
    }
    return jsonOk({ decisions: result.decisions, requestId });
  } catch (e) {
    if (e instanceof PortalError) {
      return jsonError(e.code === "NOT_FOUND" ? 404 : 403, e.code, e.message, requestId);
    }
    throw e;
  }
}
