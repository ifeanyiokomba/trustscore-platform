// POST /api/v1/auth/google/[id]/callback — the OAuth callback of "Continue
// with Google": state check → one-time code + PKCE exchange → ID-token
// validation → account resolution (LOGIN / auto-LINK on verified email /
// LINK_REQUIRED on unverified email match / REGISTER). Success returns the
// public user + platform session cookie. LINK_REQUIRED returns the pending
// google session id + masked email hint — the client signs in with the
// password and confirms the link via /auth/google/link. Never a silent merge.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { createSession, setSessionCookie, toPublicUser } from "@/lib/platform/session";
import { getUserById } from "@/lib/services/account-service";
import {
  completeGoogleLogin,
  notifyGoogleSignIn,
} from "@/lib/services/google-auth-service";

const CallbackSchema = z.object({
  code: z.string().trim().min(16).max(128),
  state: z.string().trim().min(8).max(128),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const rl = rateLimit(clientKey(req, "google-callback"), 10, 60_000);
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

  const result = await completeGoogleLogin(
    { sessionId: id, code: parsed.data.code, state: parsed.data.state },
    requestId
  );

  if (!result.ok) {
    if (result.code === "LINK_REQUIRED") {
      // Explicit linking flow — NOT a failure of authentication.
      return jsonOk(
        {
          linkRequired: true,
          googleSessionId: result.googleSessionId,
          emailHint: result.emailHint,
          message:
            "An account exists with this email. Sign in with your password to link Google to it.",
          requestId,
        },
        200
      );
    }
    const map: Record<string, { status: number; message: string }> = {
      SESSION_NOT_FOUND: { status: 404, message: "Unknown Google sign-in session." },
      BAD_STATE: { status: 400, message: "State mismatch — the sign-in session was invalidated. Start again." },
      NOT_GRANTED: { status: 409, message: "This sign-in has not been granted yet." },
      CODE_REUSED: { status: 409, message: "This sign-in code was already used." },
      EXCHANGE_FAILED: { status: 400, message: "The code exchange failed. Start again." },
      TOKEN_INVALID: { status: 401, message: "The Google identity assertion failed validation." },
    };
    const fail = map[result.code];
    return jsonError(fail.status, result.code, fail.message, requestId);
  }

  const user = await getUserById(result.userId);
  if (!user) {
    return jsonError(401, "INVALID_CREDENTIALS", "Sign-in failed. Please try again.", requestId);
  }

  const { token, expiresAt } = await createSession(user.id, req);
  const ua = (req.headers.get("user-agent") ?? "unknown device").slice(0, 120);
  await notifyGoogleSignIn(user.id, ua);

  const res = jsonOk({ user: toPublicUser(user), outcome: result.outcome, requestId });
  return setSessionCookie(res, token, expiresAt);
}
