// POST /api/v1/auth/recover/password/request — identifier-based password
// reset request. ALWAYS 200 with an identical body whether or not an account
// matched (enumeration-resistant); the MOCK-mode token is real for a match
// and a decoy (fails identically at confirm) for a non-match.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { requestPasswordReset } from "@/lib/services/recovery-service";

const RequestSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const rl = rateLimit(clientKey(req, "reset-request"), 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many reset requests. Wait a minute.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Enter your username, email or phone number.", requestId);
  }

  const result = await requestPasswordReset(parsed.data, requestId);
  return jsonOk({
    sent: result.sent,
    message: result.message,
    // MOCK email delivery — honestly labeled; production swaps in the email
    // transport and this becomes null.
    mockToken: result.mockToken,
    requestId,
  });
}
