// POST /api/v1/auth/phone/register — complete phone-first registration from
// a VERIFIED OTP session (the number itself was the proof). Password is
// optional: without one the account is passwordless (OTP-only sign-in),
// exactly like the NINAuth/Google passwordless accounts.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { createSession, setSessionCookie, toPublicUser } from "@/lib/platform/session";
import { getUserById } from "@/lib/services/account-service";
import { completePhoneRegistration } from "@/lib/services/phone-auth-service";

const RegisterSchema = z.object({
  sessionId: z.string().trim().min(10).max(64),
  displayName: z.string().trim().min(2).max(80),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, "Username must be 3–24 chars: a–z, 0–9, _"),
  password: z.string().min(8).max(128).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const rl = rateLimit(clientKey(req, "phone-register"), 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Wait a minute.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await completePhoneRegistration(
    {
      sessionId: parsed.data.sessionId,
      displayName: parsed.data.displayName,
      handle: parsed.data.handle,
      password: parsed.data.password,
      email: parsed.data.email || undefined,
    },
    requestId
  );
  if (!result.ok) {
    const map: Record<string, { status: number; code: string; message: string }> = {
      NOT_VERIFIED: { status: 401, code: "OTP_UNVERIFIED", message: "Verify your phone code first." },
      WRONG_PURPOSE: { status: 409, code: "WRONG_PURPOSE", message: "This code was not issued for registration." },
      PHONE_TAKEN: { status: 409, code: "PHONE_TAKEN", message: "That number is already linked to an account." },
      HANDLE_TAKEN: { status: 409, code: "HANDLE_TAKEN", message: "That username is already reserved." },
      HANDLE_INVALID: { status: 422, code: "HANDLE_INVALID", message: "That username is not available." },
      NAME_INVALID: { status: 422, code: "NAME_INVALID", message: "Enter your full name." },
    };
    const fail = map[result.code];
    return jsonError(fail.status, fail.code, fail.message, requestId);
  }

  const user = await getUserById(result.userId);
  if (!user) {
    return jsonError(500, "INTERNAL", "Account creation failed.", requestId);
  }

  const { token, expiresAt } = await createSession(user.id, req);
  const res = jsonOk({ user: toPublicUser(user), outcome: "REGISTERED", requestId }, 201);
  return setSessionCookie(res, token, expiresAt);
}
