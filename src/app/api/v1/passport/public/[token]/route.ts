// GET /api/v1/passport/public/:token — PUBLIC trust-card view (no auth).
// The share token is an opaque 192-bit random value — NOT an identifier
// (directive: NIN/PII never in URLs). Anti-enumeration: unknown tokens get
// a generic 404; dead tokens get 410. Every successful open is counted,
// receipted and (on first open) notified to the owner. Rate-limited per IP.

import { NextRequest, NextResponse } from "next/server";
import { jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { viewPublicCard } from "@/lib/services/passport-service";
import { recordAudit } from "@/lib/services/audit-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const requestId = newRequestId();

  const rl = rateLimit(clientKey(req, "public-card"), 30, 60_000);
  if (!rl.allowed) {
    await recordAudit({
      actorType: "ANONYMOUS",
      action: "SHARE_TOKEN_BLOCKED",
      metadata: { reason: "rate-limited" },
    });
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many trust-card checks from this network. Try again shortly.",
      requestId
    );
  }

  const { token } = await params;
  const result = await viewPublicCard(token, req);

  if (result.outcome === "NOT_FOUND") {
    return jsonError(404, "NOT_FOUND", "This trust link is invalid.", requestId);
  }
  if (result.outcome === "EXPIRED") {
    await recordAudit({
      actorType: "ANONYMOUS",
      action: "SHARE_TOKEN_BLOCKED",
      metadata: { reason: result.reason },
    });
    return jsonError(
      410,
      "LINK_DEAD",
      result.reason === "REVOKED"
        ? "This trust link was revoked by its owner."
        : result.reason === "VIEW_LIMIT"
          ? "This trust link reached its view limit."
          : "This trust link expired.",
      requestId
    );
  }
  if (result.outcome === "OK") {
    return NextResponse.json({ card: result.card }, { status: 200 });
  }
  return jsonError(429, "RATE_LIMITED", "Too many checks. Try again shortly.", requestId);
}
