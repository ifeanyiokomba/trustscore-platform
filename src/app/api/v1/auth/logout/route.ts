// POST /api/v1/auth/logout — revoke the active session and clear the cookie.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId } from "@/lib/platform/http";
import { revokeSession, clearSessionCookie, getSessionUser } from "@/lib/platform/session";
import { recordAudit } from "@/lib/services/audit-service";

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    // Idempotent: logging out without a session is still a success.
    const res = jsonOk({ ok: true });
    return clearSessionCookie(res);
  }

  await revokeSession(req);
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "AUTH_LOGOUT",
    subjectType: "UserAccount",
    subjectId: user.id,
    requestId,
  });

  const res = jsonOk({ ok: true });
  return clearSessionCookie(res);
}
