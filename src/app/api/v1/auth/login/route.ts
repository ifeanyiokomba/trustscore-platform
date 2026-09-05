// POST /api/v1/auth/login — session login (rate-limited, generic errors, audited).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey, GENERIC_LOGIN_ERROR } from "@/lib/platform/http";
import { createSession, setSessionCookie, toPublicUser } from "@/lib/platform/session";
import { authenticateUser, getUserById } from "@/lib/services/account-service";
import { notifyUser } from "@/lib/services/notification-service";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  // Stricter limit on login (brute-force resistance).
  const rl = rateLimit(clientKey(req, "login"), 8, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many sign-in attempts. Try again in a minute.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", GENERIC_LOGIN_ERROR, requestId);
  }

  const result = await authenticateUser(parsed.data, requestId, req);
  if (!result.ok) {
    // Enumeration-resistant: identical error for unknown email and bad password.
    return jsonError(401, "INVALID_CREDENTIALS", GENERIC_LOGIN_ERROR, requestId);
  }

  const user = await getUserById(result.userId);
  if (!user) {
    return jsonError(401, "INVALID_CREDENTIALS", GENERIC_LOGIN_ERROR, requestId);
  }

  const { token, expiresAt } = await createSession(user.id, req);
  // Stage 5 Security Center: change alert on every sign-in (device + time).
  const ua = (req.headers.get("user-agent") ?? "unknown device").slice(0, 120);
  await notifyUser(
    user.id,
    "SECURITY",
    "New sign-in to your account",
    `A session was opened from "${ua}". If this wasn't you, revoke the session from your Identity Security Center.`
  );
  const res = jsonOk({ user: toPublicUser(user) });
  return setSessionCookie(res, token, expiresAt);
}
