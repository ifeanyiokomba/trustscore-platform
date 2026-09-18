// POST /api/v1/auth/recover/password/confirm — confirm a password reset:
// single-use token, 15-minute TTL. On success the password rotates and EVERY
// session for the account is revoked (credential rotation = sign out all
// devices). Failures are generic — expired, used, and decoy tokens are
// indistinguishable.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { confirmPasswordReset } from "@/lib/services/recovery-service";

const ConfirmSchema = z.object({
  token: z.string().trim().min(16).max(128),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const rl = rateLimit(clientKey(req, "reset-confirm"), 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Wait a minute.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await confirmPasswordReset(parsed.data, requestId);
  if (!result.ok) {
    if (result.code === "PASSWORD_WEAK") {
      return jsonError(422, "PASSWORD_WEAK", "Password must be at least 8 characters.", requestId);
    }
    return jsonError(400, "TOKEN_INVALID", "This reset link is invalid or has expired. Request a new one.", requestId);
  }

  return jsonOk({
    reset: true,
    message: "Password reset. All sessions were signed out — sign in with your new password.",
    requestId,
  });
}
