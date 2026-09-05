// POST /api/v1/auth/register — create a Stage-1 account (validated, rate-limited, audited).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { createSession, setSessionCookie, toPublicUser } from "@/lib/platform/session";
import { registerUser, getUserById } from "@/lib/services/account-service";

const RegisterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  displayName: z.string().trim().min(2).max(80),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, "Handle must be 3–24 chars: a–z, 0–9, _"),
  acceptTerms: z.literal(true, {
    message: "You must accept the Terms & Privacy Policy",
  }),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const rl = rateLimit(clientKey(req, "register"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Please try again shortly.", requestId);
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

  const result = await registerUser(parsed.data, requestId);
  if (!result.ok) {
    if (result.code === "EMAIL_TAKEN") {
      return jsonError(409, "EMAIL_TAKEN", "An account with this email already exists.", requestId);
    }
    return jsonError(409, "HANDLE_TAKEN", "That handle is already reserved.", requestId);
  }

  const user = await getUserById(result.userId);
  if (!user) {
    return jsonError(500, "INTERNAL", "Account creation failed.", requestId);
  }

  const { token, expiresAt } = await createSession(user.id, req);
  const res = jsonOk({ user: toPublicUser(user) }, 201);
  return setSessionCookie(res, token, expiresAt);
}
