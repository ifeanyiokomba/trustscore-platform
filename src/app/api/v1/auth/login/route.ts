// POST /api/v1/auth/login — session login (rate-limited, generic errors, audited).
// AUTH batch: the unified identifier field accepts username | email | phone.
// Phone-shaped identifiers are routed to the OTP flow (PHONE_OTP_REQUIRED —
// shape-based, never existence-based). Legacy `email` field still accepted
// (stage matrices pin the old shape).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey, GENERIC_LOGIN_ERROR } from "@/lib/platform/http";
import { createSession, setSessionCookie, toPublicUser } from "@/lib/platform/session";
import { authenticateUser, getUserById } from "@/lib/services/account-service";
import { notifyUser } from "@/lib/services/notification-service";
import { detectIdentifierType } from "@/lib/auth/identifiers";

const LoginSchema = z
  .object({
    identifier: z.string().trim().min(1).max(254).optional(),
    email: z.string().trim().toLowerCase().email().max(254).optional(), // legacy
    password: z.string().min(1).max(128),
  })
  .refine((v) => v.identifier || v.email, {
    message: "Enter your username, email or phone number.",
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

  const result = await authenticateUser(
    { identifier: parsed.data.identifier, email: parsed.data.email, password: parsed.data.password },
    requestId,
    req
  );
  if (!result.ok) {
    if (result.code === "PHONE_OTP_REQUIRED") {
      // The identifier is phone-shaped → the client switches to the OTP flow.
      return jsonError(
        400,
        "PHONE_OTP_REQUIRED",
        "Phone numbers sign in with a one-time code. Use the phone sign-in flow.",
        requestId
      );
    }
    // Enumeration-resistant: identical error for unknown identifier and bad password.
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
  const res = jsonOk({
    user: toPublicUser(user),
    // Client hint for the "which identifier did they use" UX (type only —
    // the value is never echoed back).
    identifierType: detectIdentifierType(parsed.data.identifier ?? parsed.data.email ?? "")
      ?? "EMAIL",
  });
  return setSessionCookie(res, token, expiresAt);
}
