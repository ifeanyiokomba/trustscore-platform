// POST /api/v1/auth/google/[id]/grant — MOCK ONLY: simulates the user acting
// inside Google (picking an account + approving the consent screen). In LIVE
// posture this endpoint does not exist — the real Google consent screen
// redirects to our callback with the one-time code. The mock sub is
// deterministic per email (sha256("google:"+email)) so repeat sign-ins
// resolve to the same identity, exactly like a real provider sub.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { applyGoogleGrant } from "@/lib/services/google-auth-service";
import { GOOGLE_MODE } from "@/lib/providers/google";

const GrantSchema = z.object({
  decision: z.enum(["GRANT", "DENY"]),
  email: z.string().trim().toLowerCase().email().max(254),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  if (GOOGLE_MODE === "LIVE") {
    return jsonError(404, "NOT_FOUND", "Not found.", requestId);
  }

  const rl = rateLimit(clientKey(req, "google-grant"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Please wait a minute.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = GrantSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await applyGoogleGrant(
    { sessionId: id, decision: parsed.data.decision, email: parsed.data.email },
    requestId
  );
  if (!result.ok) {
    const map: Record<string, { status: number; message: string }> = {
      SESSION_NOT_FOUND: { status: 404, message: "Unknown Google sign-in session." },
      NOT_PENDING: { status: 409, message: "This sign-in was already decided." },
      EXPIRED: { status: 410, message: "This sign-in expired. Start again." },
      DENIED: { status: 403, message: "You denied the Google sign-in." },
      EMAIL_INVALID: { status: 422, message: "Enter a valid Google email." },
    };
    const fail = map[result.code];
    return jsonError(fail.status, result.code, fail.message, requestId);
  }

  return jsonOk({ code: result.code, state: result.state, requestId });
}
