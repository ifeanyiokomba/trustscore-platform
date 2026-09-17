// GET /api/v1/identity/signals/phone/inbox — Stage 13 sandbox SMS inbox.
// Loopback posture only: shows the messages the sandbox carrier received for
// the caller's OWN pending verification (filtered to that verification's
// masked hint — nothing cross-user). MOCK posture answers 409 (the code is
// already surfaced in the delivery panel there); LIVE would deliver to real
// handsets and never expose codes.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getSandboxSmsInbox, SignalError } from "@/lib/services/signal-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);

  const rl = rateLimit(clientKey(req, "phone-inbox"), 12, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many inbox reads. Wait a minute.", requestId);
  }

  try {
    const data = await getSandboxSmsInbox(user.id, requestId);
    return jsonOk(data);
  } catch (err) {
    if (err instanceof SignalError) {
      return jsonError(err.httpStatus, err.code, err.message, requestId);
    }
    throw err;
  }
}
