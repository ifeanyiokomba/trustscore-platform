// GET /api/v1/identity/sessions/:id — session status + event timeline (owner only).

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getSessionForUser } from "@/lib/services/identity-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const session = await getSessionForUser(user.id, id);
  if (!session) {
    return jsonError(404, "SESSION_NOT_FOUND", "Verification session not found.", requestId);
  }

  const scopes = JSON.parse(session.scopes) as string[];

  return jsonOk({
    session: {
      id: session.id,
      status: session.status,
      provider: session.provider,
      providerMode: session.providerMode,
      flow: session.flow,
      shareCode: session.shareCode,
      authorizationUrl: session.authorizationUrl,
      scopes,
      purpose: session.purpose,
      policyVersion: session.policyVersion,
      errorReason: session.errorReason,
      expiresAt: session.expiresAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      events: session.events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        createdAt: e.createdAt.toISOString(),
      })),
    },
  });
}
