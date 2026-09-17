// POST /api/v1/identity/signals/phone/resend — Stage 4. Issues a fresh OTP
// for a PENDING verification (old code invalidated, attempts reset).
// 30s cooldown, max 3 resends per verification.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { resendPhoneOtp, SignalError } from "@/lib/services/signal-service";

const ResendSchema = z.object({
  verificationId: z.string().trim().min(10).max(64),
  simSwapRisk: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(), // MOCK test knob
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "phone-resend"), 3, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many resends. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = ResendSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  try {
    const result = await resendPhoneOtp(user.id, parsed.data, requestId);
    return jsonOk(result);
  } catch (err) {
    if (err instanceof SignalError) {
      const headers =
        err.code === "COOLDOWN" && err.extra?.retryAfterSec
          ? { "Retry-After": String(err.extra.retryAfterSec) }
          : undefined;
      return jsonError(err.httpStatus, err.code, err.message, requestId);
    }
    throw err;
  }
}
