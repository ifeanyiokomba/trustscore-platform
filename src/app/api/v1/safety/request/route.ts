// POST /api/v1/safety/request — send a Trust Request (verifier-side ask,
// Stage 6). Used when a handle is not checkable: the verifier asks the
// member to share their Trust Card. One pending request per pair; 7-day
// expiry; the subject is notified with accept/decline controls.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { sendTrustRequest } from "@/lib/services/safety-service";

const RequestSchema = z.object({
  handle: z.string().trim().min(1).max(64),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(`trust-request:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many trust requests. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await sendTrustRequest(
    { id: user.id, handle: user.handle },
    parsed.data.handle
  );

  switch (result.outcome) {
    case "OK":
      return jsonOk({ outcome: "OK", requestId: result.requestId, expiresAt: result.expiresAt }, 201);
    case "ALREADY_REQUESTED":
      return jsonError(
        409,
        "ALREADY_REQUESTED",
        "You already have a pending trust request with this member.",
        requestId
      );
    case "SELF":
      return jsonError(422, "SELF_REQUEST", result.message, requestId);
    case "UNAVAILABLE":
      return jsonOk({ outcome: "UNAVAILABLE", message: result.message });
  }
}
