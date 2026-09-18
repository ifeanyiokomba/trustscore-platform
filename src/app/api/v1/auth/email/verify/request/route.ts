// POST /api/v1/auth/email/verify/request — request an email verification
// code (authenticated). Marks the EMAIL AuthIdentifier verified on confirm —
// the gate for Google auto-linking and email-based recovery delivery.
// MOCK delivery returns the code honestly labeled.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { requestEmailVerification } from "@/lib/services/recovery-service";

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "email-verify"), 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many requests. Wait a minute.", requestId);
  }

  const result = await requestEmailVerification(user.id, requestId);
  if (!result.ok) {
    const map: Record<string, { status: number; message: string }> = {
      NO_EMAIL: { status: 409, message: "This account has no email address to verify." },
      ALREADY_VERIFIED: { status: 409, message: "Your email is already verified." },
      RATE_LIMITED: { status: 429, message: "Too many requests. Wait a minute." },
    };
    const fail = map[result.code];
    return jsonError(fail.status, result.code, fail.message, requestId);
  }

  return jsonOk({
    requested: true,
    // MOCK email delivery — honestly labeled; production swaps in the email
    // transport and this becomes null.
    mockCode: result.mockCode,
    expiresAt: result.expiresAt,
    requestId,
  });
}
