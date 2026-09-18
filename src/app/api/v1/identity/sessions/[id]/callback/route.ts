// POST /api/v1/identity/sessions/:id/callback — the OAuth callback contract:
// validate state → exchange authorization code with PKCE (backend-only) →
// validate the ID token (signature/iss/aud/exp/nonce) → establish TrustIdentity.
//
// This is the endpoint shape NINAuth will redirect to in LIVE mode. The code
// exchange and token handling happen exclusively server-side (directive §32).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { completeCallback } from "@/lib/services/identity-service";

const CallbackSchema = z.object({
  code: z.string().min(10).max(256),
  state: z.string().min(10).max(128),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "identity-callback"), 12, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Please slow down.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = CallbackSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "code and state are required.", requestId);
  }

  const result = await completeCallback(user.id, id, parsed.data, requestId);

  if (!result.ok) {
    switch (result.code) {
      case "SESSION_NOT_FOUND":
        return jsonError(404, "SESSION_NOT_FOUND", "Verification session not found.", requestId);
      case "BAD_STATE":
        return jsonError(400, "BAD_STATE", "State mismatch — the session may have been replayed.", requestId);
      case "NOT_GRANTED":
        return jsonError(409, "NOT_GRANTED", "Consent has not been granted for this session.", requestId);
      case "CODE_REUSED":
        return jsonError(409, "CODE_REUSED", "This authorization code has already been used.", requestId);
      case "EXCHANGE_FAILED":
        return jsonError(400, "EXCHANGE_FAILED", `Code exchange failed (${result.reason ?? "unknown"}).`, requestId);
      case "TOKEN_INVALID":
        return jsonError(401, "TOKEN_INVALID", `ID token validation failed (${result.reason ?? "unknown"}).`, requestId);
      // Batch 2 (G7) — duplicate government identity: fail-closed + account
      // recovery routing. The message tells the legitimate owner exactly what
      // to do and gives an attacker nothing (the subject is opaque, the holder
      // is never identified).
      case "IDENTITY_TAKEN":
        return jsonError(
          409,
          "IDENTITY_TAKEN",
          "This government identity is already linked to a different TrustScore account. If that account is yours, sign in to it instead — or recover its access from the sign-in page (Forgot password). If you believe this is an error, contact support.",
          requestId
        );
    }
  }

  return jsonOk({ ok: true, identity: result.identity });
}
