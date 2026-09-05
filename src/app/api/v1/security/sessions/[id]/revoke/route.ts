// POST /api/v1/security/sessions/:id/revoke — Identity Security Center:
// revoke one of the caller's OTHER active sessions (remote sign-out).
// The current session must be signed out via /api/v1/auth/logout instead.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { revokeSessionById, currentSessionToken } from "@/lib/services/passport-service";
import { notifyUser } from "@/lib/services/notification-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "session-revoke"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many revocations. Wait a minute.", requestId);
  }

  const { id } = await params;
  const result = await revokeSessionById(user.id, id, currentSessionToken(req));
  if (result.outcome === "NOT_FOUND") {
    return jsonError(404, "NOT_FOUND", "Session not found.", requestId);
  }
  if (result.outcome === "IS_CURRENT") {
    return jsonError(
      409,
      "IS_CURRENT",
      "This is your current session — use Sign out instead.",
      requestId
    );
  }
  await notifyUser(
    user.id,
    "SECURITY",
    "A session was revoked",
    "One of your signed-in devices was signed out from the Identity Security Center."
  );
  return jsonOk({ revoked: true, id });
}
