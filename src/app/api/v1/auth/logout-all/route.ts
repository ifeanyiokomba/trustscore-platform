// POST /api/v1/auth/logout-all — sign out from EVERY device: revokes all
// active sessions for the authenticated account (the current one included).
// Audited; a security notification records the event.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser, clearSessionCookie } from "@/lib/platform/session";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser } from "@/lib/services/notification-service";

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "logout-all"), 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many requests. Wait a minute.", requestId);
  }

  const result = await db.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await notifyUser(
    user.id,
    "SECURITY",
    "All sessions signed out",
    `You signed out from all devices (${result.count} session${result.count === 1 ? "" : "s"} ended). If this wasn't you, reset your password immediately.`
  );
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "AUTH_LOGOUT_ALL",
    subjectType: "UserAccount",
    subjectId: user.id,
    requestId,
    metadata: { outcome: "revoked_all", sessions: result.count },
  });

  const res = jsonOk({ signedOut: true, sessionsRevoked: result.count, requestId });
  return clearSessionCookie(res);
}
