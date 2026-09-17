// POST /api/v1/identity/signals/phone/start — Stage 4 phone verification.
// Validates + normalizes a Nigerian mobile number, records consent (NDPA §31),
// issues a hashed 5-minute OTP through the contract-first MOCK SMS transport.
// Requires a VERIFIED, fresh government identity (Level 1 first).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { startPhoneVerification, SignalError } from "@/lib/services/signal-service";

const StartSchema = z.object({
  phone: z.string().trim().min(7).max(20),
  // TEST-ONLY KNOB (MOCK contract — LIVE ignores): simulates SIM-swap risk
  simSwapRisk: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "phone-start"), 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many phone verifications. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = StartSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  try {
    const result = await startPhoneVerification(user.id, parsed.data, requestId);
    return jsonOk(result, 201);
  } catch (err) {
    if (err instanceof SignalError) {
      return jsonError(err.httpStatus, err.code, err.message, requestId);
    }
    throw err;
  }
}
