// POST /api/v1/auth/ninauth/start — begin a passwordless "Continue with
// NINAuth" login (Stage 16). No platform session required (you are signing
// IN); rate-limited per IP. Returns the login session, the (mock) NINAuth
// authorize URL with S256 PKCE, and the consent screen the simulated NINAuth
// app will show. PKCE verifier stays server-side, always.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { startNinAuthLogin, authConsentScreen } from "@/lib/services/ninauth-auth-service";

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  // Session creation only (no code issuance here) — roomy enough for a
  // legitimate retry and the stage matrix, tight enough to stop farming.
  const rl = rateLimit(clientKey(req, "ninauth-login"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many NINAuth sign-in attempts. Please wait a minute.",
      requestId
    );
  }

  const session = await startNinAuthLogin(requestId);
  return jsonOk({
    session,
    consentScreen: authConsentScreen(),
    requestId,
  });
}
