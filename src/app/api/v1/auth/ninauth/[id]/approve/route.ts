// POST /api/v1/auth/ninauth/[id]/approve — the MOCK NINAuth app side of the
// "Continue with NINAuth" flow (Stage 16), mirroring the identity-flow
// consent endpoint. The user acts inside the (simulated) NINAuth app: they
// confirm the binding identity (email — the stand-in for the biometrically-
// bound NINAuth identity in MOCK posture) and grant or deny the scopes.
// In LIVE posture this endpoint disappears: the real NINAuth app approves
// and redirects to our callback with the code.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { applyNinAuthApproval } from "@/lib/services/ninauth-auth-service";

const ApproveSchema = z.object({
  decision: z.enum(["GRANT", "DENY"]),
  // The identity the simulated NINAuth app acts for. Normalized here.
  email: z.string().trim().toLowerCase().email().max(254),
  // Optional granular consent: core scopes are mandatory; profile.name is
  // the only allowed addition. Anything else → SCOPE_INVALID.
  grantedScopes: z.array(z.string().trim().max(64)).max(8).optional(),
});

const FAILURE_STATUS: Record<string, { status: number; message: string }> = {
  SESSION_NOT_FOUND: { status: 404, message: "Unknown sign-in session." },
  NOT_PENDING: { status: 409, message: "This sign-in session is no longer awaiting approval." },
  EXPIRED: { status: 410, message: "This sign-in session expired. Start again." },
  DENIED: { status: 409, message: "This sign-in was already denied." },
  SCOPE_INVALID: { status: 422, message: "Invalid scopes — core scopes are required and only profile.name may be added." },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const rl = rateLimit(clientKey(req, "ninauth-approve"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Please wait a minute.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await applyNinAuthApproval(
    { sessionId: id, ...parsed.data },
    requestId
  );

  if (!result.ok) {
    const fail = FAILURE_STATUS[result.code];
    return jsonError(fail.status, result.code, fail.message, requestId);
  }

  // The one-time code + state — exactly what the NINAuth redirect would carry.
  return jsonOk({ code: result.code, state: result.state, requestId });
}
