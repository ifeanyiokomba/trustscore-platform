// GET /api/v1/passport/share/:id/analytics — Batch 5: owner-only analytics
// for one Trust Link. Derived entirely from the link's TrustReceipts (counts
// + receipt labels only — no raw tokens, no IP hashes, no viewer PII).
// Owner-scoped with the same anti-enumeration 404 as the revoke route; the
// SHARE_ANALYTICS_VIEWED audit is recorded inside the service (owner-resolved
// links only).

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getShareAnalytics } from "@/lib/services/passport-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "share-analytics"), 30, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many analytics requests. Wait a minute.", requestId);
  }

  const { id } = await params;
  const analytics = await getShareAnalytics(user.id, id);
  if (!analytics) {
    // Anti-enumeration: another user's link, a malformed id and a
    // nonexistent id are all indistinguishable.
    return jsonError(404, "NOT_FOUND", "Trust link not found.", requestId);
  }

  return jsonOk({ analytics });
}
