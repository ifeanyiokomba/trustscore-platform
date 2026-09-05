// GET  /api/v1/passport/notifications — the caller's notifications feed.
// POST /api/v1/passport/notifications — mark read: {id} or {all: true}.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { listNotifications, markNotificationsRead } from "@/lib/services/passport-service";

const MarkSchema = z.object({
  id: z.string().min(1).optional(),
  all: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }
  return jsonOk(await listNotifications(user.id));
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "notif-read"), 30, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many updates. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = MarkSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }
  if (!parsed.data.id && !parsed.data.all) {
    return jsonError(422, "VALIDATION_ERROR", "Provide {id} or {all: true}.", requestId);
  }

  const marked = await markNotificationsRead(
    user.id,
    parsed.data.id ?? (parsed.data.all ? undefined : "")
  );
  return jsonOk({ marked });
}
