// DELETE /api/v1/dev/clients/:id/team/:memberId — remove a team member
// (Stage 9, OWNER only). The OWNER row itself is immutable (transfer of
// ownership is a deliberate governance flow, not a self-service button).

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { removeTeamMember, PortalError } from "@/lib/services/devportal-service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const requestId = newRequestId();
  const { id, memberId } = await params;
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  const rl = rateLimit(`dev-team:${user.id}`, 10, 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED", "Too many team changes. Wait a minute.", requestId);

  try {
    const result = await removeTeamMember(user.id, id, memberId);
    if (!result.ok) {
      switch (result.code) {
        case "NOT_FOUND":
          return jsonError(404, "NOT_FOUND", "No such team member on this client.", requestId);
        case "FORBIDDEN":
          return jsonError(403, "FORBIDDEN", "Only the client OWNER manages the team.", requestId);
        case "OWNER_IMMUTABLE":
          return jsonError(409, "OWNER_IMMUTABLE", "The OWNER membership cannot be removed.", requestId);
      }
    }
    return jsonOk({ client: result.client, requestId });
  } catch (e) {
    if (e instanceof PortalError) {
      return jsonError(e.code === "NOT_FOUND" ? 404 : 403, e.code, e.message, requestId);
    }
    throw e;
  }
}
