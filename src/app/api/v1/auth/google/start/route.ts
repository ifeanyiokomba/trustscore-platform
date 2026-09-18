// POST /api/v1/auth/google/start — begin "Continue with Google". No platform
// session required (you are signing IN); rate-limited per IP. Returns the
// login session, the authorization URL (LIVE: accounts.google.com with
// PKCE+state; MOCK: the consent modal contract), and the consent screen copy.
// The PKCE verifier stays server-side, always.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { startGoogleLogin } from "@/lib/services/google-auth-service";

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const rl = rateLimit(clientKey(req, "google-login"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Please wait a minute.", requestId);
  }

  const session = await startGoogleLogin(requestId);
  return jsonOk({ session, requestId });
}
