// GET /api/v1/identity/me — the caller's TrustIdentity + consent history +
// latest verification session timeline + Stage 4 trust signals (phone /
// biometric bindings + cross-signal consistency), sanitized, masked refs only.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getIdentityForUser } from "@/lib/services/identity-service";
import { getSignalsForUser } from "@/lib/services/signal-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const signals = await getSignalsForUser(user.id);
  const result = await getIdentityForUser(user.id, {
    consistent: signals.crossSignal.consistent,
  });
  return jsonOk({ ...result, signals });
}
