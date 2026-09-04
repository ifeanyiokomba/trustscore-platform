// POST /api/v1/identity/signals/biometrics/start — Stage 4 liveness session.
// Creates a Smile-ID-class job (MOCK transport), records consent (NDPA §31),
// opens a 10-minute capture window. Requires a VERIFIED, fresh L1 identity.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { startLiveness, SignalError } from "@/lib/services/signal-service";

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "liveness-start"), 3, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many liveness checks. Wait a minute.", requestId);
  }

  try {
    const result = await startLiveness(user.id, undefined, requestId);
    return jsonOk(result, 201);
  } catch (err) {
    if (err instanceof SignalError) {
      return jsonError(err.httpStatus, err.code, err.message, requestId);
    }
    throw err;
  }
}
