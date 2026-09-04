// POST /api/v1/identity/sessions/:id/consent — the MOCK NINAuth app side of the
// flow: the user's approve/deny decision inside "their NINAuth app". Issues a
// one-time authorization code on GRANT.
//
// In LIVE mode this endpoint is retired: the user consents inside the real
// NINAuth app and NINAuth redirects the authorization code to our callback.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { applyConsentDecision } from "@/lib/services/identity-service";

const ConsentSchema = z.object({
  decision: z.enum(["GRANT", "DENY"]),
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

  const rl = rateLimit(clientKey(req, "identity-consent"), 12, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Please slow down.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = ConsentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "decision must be GRANT or DENY.", requestId);
  }

  const result = await applyConsentDecision(user.id, id, parsed.data.decision, requestId);

  if (!result.ok) {
    switch (result.code) {
      case "SESSION_NOT_FOUND":
        return jsonError(404, "SESSION_NOT_FOUND", "Verification session not found.", requestId);
      case "NOT_PENDING":
        return jsonError(409, "NOT_PENDING", "This session is not awaiting a consent decision.", requestId);
      case "EXPIRED":
        return jsonError(410, "EXPIRED", "This verification session has expired. Start a new one.", requestId);
      case "DENIED":
        return jsonOk({ ok: true, decision: "DENY" });
    }
  }

  return jsonOk({ ok: true, decision: "GRANT", code: result.code, state: result.state });
}
