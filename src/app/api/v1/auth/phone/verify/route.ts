// POST /api/v1/auth/phone/verify — verify the OTP. For LOGIN/RECOVERY
// purposes the platform session is created here (generic failures — an
// unknown number, a wrong code, and a missing session are indistinguishable).
// For REGISTER/LINK the session is only marked VERIFIED; the caller completes
// via /auth/phone/register or the link flow.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { createSession, setSessionCookie, toPublicUser } from "@/lib/platform/session";
import { getUserById } from "@/lib/services/account-service";
import {
  verifyPhoneOtp,
  completePhoneLogin,
  notifyPhoneSignIn,
} from "@/lib/services/phone-auth-service";

const VerifySchema = z.object({
  sessionId: z.string().trim().min(10).max(64),
  otp: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const rl = rateLimit(clientKey(req, "phone-verify"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Wait a minute.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Enter the 6-digit code.", requestId);
  }

  const verified = await verifyPhoneOtp(parsed.data, requestId);
  if (!verified.ok) {
    // Enumeration-resistant mapping: every failure reason collapses into
    // the same client-facing error (the code field is kept for the matrix).
    const message =
      verified.code === "MAX_ATTEMPTS"
        ? "Too many incorrect codes. Request a new one."
        : "That code is invalid or expired. Request a new one.";
    return jsonError(401, "OTP_INVALID", message, requestId);
  }

  if (verified.purpose === "LOGIN" || verified.purpose === "RECOVERY") {
    const login = await completePhoneLogin({ sessionId: parsed.data.sessionId }, requestId);
    if (!login.ok) {
      // Unknown number / inactive account — same generic error as a bad code.
      return jsonError(401, "OTP_INVALID", "That code is invalid or expired. Request a new one.", requestId);
    }
    const user = await getUserById(login.userId);
    if (!user) {
      return jsonError(401, "OTP_INVALID", "That code is invalid or expired. Request a new one.", requestId);
    }
    const { token, expiresAt } = await createSession(user.id, req);
    const ua = (req.headers.get("user-agent") ?? "unknown device").slice(0, 120);
    await notifyPhoneSignIn(user.id, ua);
    const res = jsonOk({ user: toPublicUser(user), outcome: "LOGIN", requestId });
    return setSessionCookie(res, token, expiresAt);
  }

  // REGISTER / LINK — the caller completes the flow.
  return jsonOk({ verified: true, purpose: verified.purpose, requestId });
}
