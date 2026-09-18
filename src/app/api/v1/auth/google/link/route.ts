// POST /api/v1/auth/google/link — explicit account linking (the LINK_REQUIRED
// continuation): requires an authenticated platform session (the user proved
// account ownership with their password) + a still-GRANTED google session.
// The Google identity is bound to THE CALLER's account — an identifier that
// belongs to another account is refused (never a silent merge).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { confirmGoogleLink } from "@/lib/services/google-auth-service";

const LinkSchema = z.object({
  googleSessionId: z.string().trim().min(10).max(64),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "Sign in with your password first to link Google.", requestId);
  }

  const rl = rateLimit(clientKey(req, "google-link"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Please wait a minute.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = LinkSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await confirmGoogleLink(user.id, parsed.data.googleSessionId, requestId);
  if (!result.ok) {
    const map: Record<string, { status: number; message: string }> = {
      SESSION_NOT_FOUND: { status: 404, message: "Unknown Google sign-in session. Start again." },
      NOT_GRANTED: { status: 409, message: "The Google sign-in was not granted." },
      EXPIRED: { status: 410, message: "The Google sign-in expired. Start again." },
      NOT_ACTIVE: { status: 403, message: "This account is not active." },
      ALREADY_LINKED_TO_OTHER: {
        status: 409,
        message: "That Google account is already linked to a different TrustScore account.",
      },
      ALREADY_LINKED: { status: 409, message: "Google is already linked to your account." },
    };
    const fail = map[result.code];
    return jsonError(fail.status, result.code, fail.message, requestId);
  }

  return jsonOk({ linked: true, requestId });
}
