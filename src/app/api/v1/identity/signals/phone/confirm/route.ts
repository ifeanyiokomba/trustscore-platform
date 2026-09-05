// POST /api/v1/identity/signals/phone/confirm — Stage 4. Timing-safe OTP
// check (3 attempts max, lockout + security notification), then binds the
// phone to the Trust Identity spine as a hashed identifier + evidence and
// escalates the assurance ladder to Level 2.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { confirmPhoneOtp, SignalError } from "@/lib/services/signal-service";

const ConfirmSchema = z.object({
  verificationId: z.string().trim().min(10).max(64),
  code: z.string().trim().min(6).max(6),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  // OTP-guessing protection: tighter budget than ordinary actions.
  const rl = rateLimit(clientKey(req, "phone-confirm"), 12, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  try {
    const result = await confirmPhoneOtp(user.id, parsed.data, requestId);
    return jsonOk(result);
  } catch (err) {
    if (err instanceof SignalError) {
      const errorBody = { error: { code: err.code, message: err.message, requestId } };
      const response = NextResponse.json(errorBody, { status: err.httpStatus });
      if (err.extra?.attemptsLeft !== undefined) {
        response.headers.set("X-Attempts-Left", String(err.extra.attemptsLeft));
      }
      return response;
    }
    throw err;
  }
}
