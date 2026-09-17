// POST /api/v1/identity/signals/biometrics/complete — Stage 4. Submits the
// (simulated in sandbox) capture to the liveness provider and stores the
// verdict. Only a PASS binds the BIOMETRIC identifier (fingerprint only,
// no templates) + evidence and escalates the ladder toward L3/L4.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { completeLiveness, SignalError } from "@/lib/services/signal-service";

const CompleteSchema = z.object({
  sessionId: z.string().trim().min(10).max(64),
  // TEST-ONLY KNOB (MOCK contract — LIVE ignores): exercise failure paths
  simulate: z.enum(["ok", "fail_liveness", "face_mismatch"]).optional(),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "liveness-complete"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many requests. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = CompleteSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  try {
    const result = await completeLiveness(user.id, parsed.data, requestId);
    return jsonOk(result);
  } catch (err) {
    if (err instanceof SignalError) {
      return jsonError(err.httpStatus, err.code, err.message, requestId);
    }
    throw err;
  }
}
