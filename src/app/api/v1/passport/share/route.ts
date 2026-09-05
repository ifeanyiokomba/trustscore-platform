// POST /api/v1/passport/share — create a Trust Link (share token).
// The RAW token is returned exactly ONCE; at rest only sha256 is kept.
// GET — list the caller's share tokens (metadata only, never raw tokens).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { db } from "@/lib/db";
import { createShareToken, SHARE_SCOPES } from "@/lib/services/passport-service";

const CreateSchema = z.object({
  ttlHours: z.coerce.number().int().min(1).max(168).default(24),
  maxViews: z.coerce.number().int().min(1).max(50).default(5),
  scopes: z
    .array(z.enum(SHARE_SCOPES))
    .min(1)
    .default([...SHARE_SCOPES]),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "share-create"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many trust links created. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await createShareToken(user.id, parsed.data);
  return jsonOk(result, 201);
}

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const now = Date.now();
  const tokens = await db.shareToken.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return jsonOk({
    shareTokens: tokens.map((t) => {
      const expired =
        t.status === "ACTIVE" && (t.expiresAt.getTime() <= now || t.views >= t.maxViews);
      return {
        id: t.id,
        scopes: JSON.parse(t.scopes) as string[],
        maxViews: t.maxViews,
        views: t.views,
        viewsLeft: Math.max(0, t.maxViews - t.views),
        status: t.status === "ACTIVE" && expired ? "EXPIRED" : t.status,
        expiresAt: t.expiresAt.toISOString(),
        revokedAt: t.revokedAt?.toISOString() ?? null,
        lastViewedAt: t.lastViewedAt?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
      };
    }),
  });
}
