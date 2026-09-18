// POST /api/v1/auth/identifiers/[type]/unlink — unlink an auth identifier
// (GOOGLE or PHONE) from the caller's account. Guard: an account must keep
// at least one identifier (a passwordless account cannot orphan itself).
// USERNAME/EMAIL identifiers are managed by their dedicated flows (username
// change is its own auditable batch; email change re-verifies).

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { unlinkIdentifier } from "@/lib/services/auth-identifier-service";
import { notifyUser } from "@/lib/services/notification-service";
import { type IdentifierType } from "@/lib/auth/identifiers";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const requestId = newRequestId();
  const { type } = await params;

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "identifier-unlink"), 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many requests. Wait a minute.", requestId);
  }

  if (type !== "GOOGLE" && type !== "PHONE") {
    return jsonError(422, "TYPE_INVALID", "Only Google and phone identifiers can be unlinked here.", requestId);
  }

  // Resolve the caller's identifier row of this type (value never echoed).
  const rows = await db.authIdentifier.findMany({
    where: { userId: user.id, type: type as IdentifierType },
    select: { value: true, isPrimary: true },
  });
  const target = rows.find((r) => !r.isPrimary) ?? rows[0];
  if (!target) {
    return jsonError(404, "NOT_LINKED", `No ${type.toLowerCase()} identifier is linked.`, requestId);
  }

  const result = await unlinkIdentifier(user.id, type as IdentifierType, target.value, requestId);
  if (!result.ok) {
    if (result.code === "LAST_IDENTIFIER") {
      return jsonError(
        409,
        "LAST_IDENTIFIER",
        "This is the only way to sign in to your account — link another method before removing it.",
        requestId
      );
    }
    return jsonError(404, "NOT_LINKED", `No ${type.toLowerCase()} identifier is linked.`, requestId);
  }

  await notifyUser(
    user.id,
    "SECURITY",
    `${type === "GOOGLE" ? "Google account" : "Phone number"} unlinked`,
    "You can no longer sign in with that method. If this wasn't you, secure your account immediately."
  );

  return jsonOk({ unlinked: true, type, requestId });
}
