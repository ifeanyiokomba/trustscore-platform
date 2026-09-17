// POST /api/v1/auth/ninauth/[id]/callback — the OAuth callback contract of
// the "Continue with NINAuth" flow (Stage 16): state check → one-time code +
// PKCE exchange → signed-assertion (ID token) validation → scope-guard
// pipeline → account bind / link / create → platform session cookie.
//
// Failure mapping mirrors the identity-flow callback. On success the caller
// receives the public user (same shape as password login) and the outcome:
// LOGIN (returning NINAuth user), LINKED (existing account, subject bound)
// or REGISTERED (new passwordless account).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { createSession, setSessionCookie, toPublicUser } from "@/lib/platform/session";
import { getUserById } from "@/lib/services/account-service";
import {
  completeNinAuthLogin,
  notifyNinAuthSignIn,
} from "@/lib/services/ninauth-auth-service";

const CallbackSchema = z.object({
  code: z.string().trim().min(16).max(128),
  state: z.string().trim().min(8).max(128),
});

const FAILURE_STATUS: Record<string, { status: number; message: string }> = {
  SESSION_NOT_FOUND: { status: 404, message: "Unknown sign-in session." },
  BAD_STATE: { status: 400, message: "State mismatch — the sign-in session was invalidated. Start again." },
  NOT_APPROVED: { status: 409, message: "This sign-in has not been approved yet." },
  CODE_REUSED: { status: 409, message: "This sign-in code was already used." },
  EXCHANGE_FAILED: { status: 400, message: "The code exchange failed. Start again." },
  TOKEN_INVALID: { status: 401, message: "The identity assertion failed validation." },
  SCOPE_GUARD_BLOCKED: { status: 500, message: "The provider payload was blocked by the scope guard. Nothing was stored." },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const rl = rateLimit(clientKey(req, "ninauth-callback"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Please wait a minute.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = CallbackSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await completeNinAuthLogin(
    { sessionId: id, code: parsed.data.code, state: parsed.data.state },
    requestId
  );

  if (!result.ok) {
    const fail = FAILURE_STATUS[result.code];
    return jsonError(fail.status, result.code, fail.message, requestId);
  }

  const user = await getUserById(result.userId);
  if (!user) {
    return jsonError(401, "INVALID_CREDENTIALS", "Sign-in failed. Please try again.", requestId);
  }

  const { token, expiresAt } = await createSession(user.id, req);
  await notifyNinAuthSignIn(user.id, req);

  const res = jsonOk({ user: toPublicUser(user), outcome: result.outcome, requestId });
  return setSessionCookie(res, token, expiresAt);
}
