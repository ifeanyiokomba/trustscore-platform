// POST /api/v1/identity/sessions — create a NINAuth verification session
// (Stage 2, contract-first MOCK provider). Auth required, rate-limited.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import {
  createVerificationSession,
  consentScreen,
  ScopeValidationError,
  IdentityProviderError,
} from "@/lib/services/identity-service";
import { recordAudit } from "@/lib/services/audit-service";
import { SESSION_TTL_MS } from "@/lib/providers/ninauth";

const CreateSchema = z.object({
  purpose: z.string().trim().max(120).optional(),
  scopes: z.array(z.string().trim().max(64)).max(8).optional(),
  flow: z.enum(["QR", "SHARE_CODE"]).optional(),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "identity-session"), 5, 60_000);
  if (!rl.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many verification attempts. Please wait a minute.",
      requestId
    );
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  let session;
  try {
    session = await createVerificationSession(user.id, parsed.data, requestId);
  } catch (err) {
    if (err instanceof ScopeValidationError) {
      return jsonError(
        422,
        "SCOPE_INVALID",
        `Unknown scope(s): ${err.rejected.join(", ")}.`,
        requestId
      );
    }
    if (err instanceof IdentityProviderError) {
      // Stage 13 — honest provider-transport failure (circuit open, timeouts,
      // retries exhausted). Nothing was written.
      return jsonError(503, "PROVIDER_UNAVAILABLE", err.message, requestId);
    }
    throw err;
  }
  const scopes = JSON.parse(session.scopes) as string[];
  const consent = consentScreen(scopes);
  // Stage 13 — posture-aware honesty: the consent screen's provider labels
  // must match the transport that will actually answer (MOCK or LOOPBACK).
  consent.provider = session.provider;
  consent.mode = session.providerMode as "MOCK" | "LIVE";

  return jsonOk(
    {
      session: {
        id: session.id,
        status: session.status,
        provider: session.provider,
        providerMode: session.providerMode, // honest per-posture label
        flow: session.flow,
        shareCode: session.shareCode,
        authorizationUrl: session.authorizationUrl,
        scopes,
        purpose: session.purpose,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        ttlMs: SESSION_TTL_MS,
      },
      consent,
    },
    201
  );
}
