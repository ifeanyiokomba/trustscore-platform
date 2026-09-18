// POST /api/v1/auth/phone/start — request an OTP for phone sign-in /
// registration / linking / recovery. Enumeration-resistant: ALWAYS the same
// 200 shape whether or not the number matches an account (the verify step
// is where existence matters, and it fails generically). MOCK delivery
// returns the code honestly labeled. The raw number never persists.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { startPhoneOtp } from "@/lib/services/phone-auth-service";

const StartSchema = z.object({
  phone: z.string().trim().min(7).max(20),
  purpose: z.enum(["LOGIN", "REGISTER", "LINK", "RECOVERY"]).default("LOGIN"),
  displayName: z.string().trim().min(2).max(80).optional(),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/)
    .optional(),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const rl = rateLimit(clientKey(req, "phone-otp"), 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many code requests. Wait a minute.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = StartSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await startPhoneOtp(parsed.data, requestId);
  if (!result.ok) {
    if (result.code === "PHONE_INVALID") {
      return jsonError(422, "PHONE_INVALID", "Enter a valid Nigerian mobile number.", requestId);
    }
    return jsonError(429, "RATE_LIMITED", "Too many code requests. Wait a minute.", requestId);
  }

  return jsonOk({
    session: {
      id: result.sessionId,
      phoneHint: result.phoneHint,
      expiresAt: result.expiresAt,
      purpose: parsed.data.purpose,
      providerMode: result.providerMode,
    },
    // MOCK SMS delivery — honestly labeled; production swaps in the SMS
    // transport and this becomes null.
    mockOtp: result.mockOtp,
    requestId,
  });
}
