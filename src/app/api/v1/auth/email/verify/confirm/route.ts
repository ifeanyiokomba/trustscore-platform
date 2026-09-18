// POST /api/v1/auth/email/verify/confirm — confirm the email verification
// code (authenticated). Flips the EMAIL AuthIdentifier to verified.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { confirmEmailVerification } from "@/lib/services/recovery-service";

const ConfirmSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "email-verify-confirm"), 10, 60_000);
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

  const result = await confirmEmailVerification(user.id, parsed.data, requestId);
  if (!result.ok) {
    const map: Record<string, { status: number; message: string }> = {
      NO_PENDING: { status: 409, message: "No pending verification. Request a new code." },
      CODE_INVALID: { status: 401, message: "That code is invalid. Check it and try again." },
      MAX_ATTEMPTS: { status: 429, message: "Too many incorrect codes. Request a new one." },
      EXPIRED: { status: 410, message: "That code expired. Request a new one." },
    };
    const fail = map[result.code];
    return jsonError(fail.status, result.code, fail.message, requestId);
  }

  return jsonOk({ verified: true, email: result.email, requestId });
}
