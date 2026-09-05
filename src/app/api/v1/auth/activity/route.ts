// GET /api/v1/auth/activity — recent audited auth events for the signed-in user
// (Security Center preview). Redacted: actions + timestamps only.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { recentAuditForUser } from "@/lib/services/account-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const events = await recentAuditForUser(user.id, 12);
  return jsonOk({
    events: events.map((e) => ({
      id: e.id,
      action: e.action,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
