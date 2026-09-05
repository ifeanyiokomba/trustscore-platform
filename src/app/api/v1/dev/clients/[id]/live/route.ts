// POST /api/v1/dev/clients/:id/live — switch the client environment to LIVE
// (Stage 9, OWNER only). Body: { confirm: "I UNDERSTAND" } — typing the
// confirmation is the deliberate act. HONEST semantics: LIVE is an
// integration-posture label (https-only webhooks, live key prefix). The
// underlying identity providers remain contract-first MOCK until partner
// credentials exist — the response says so explicitly.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { enableLive, PortalError } from "@/lib/services/devportal-service";
import { API_HONESTY_NOTE } from "@/lib/services/trustdecision-service";

const LiveSchema = z.object({ confirm: z.string().trim() }).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  const rl = rateLimit(`dev-live:${user.id}`, 3, 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED", "Too many environment changes. Wait a minute.", requestId);

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = LiveSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid confirmation payload.", requestId);
  }
  try {
    const result = await enableLive(user.id, id, parsed.data.confirm);
    if (!result.ok) {
      switch (result.code) {
        case "NOT_FOUND":
          return jsonError(404, "NOT_FOUND", "No such API client.", requestId);
        case "FORBIDDEN":
          return jsonError(403, "FORBIDDEN", "Only the client OWNER can change the environment.", requestId);
        case "CONFIRM_REQUIRED":
          return jsonError(422, "CONFIRM_REQUIRED", 'Switching to LIVE requires typing "I UNDERSTAND" in the confirm field.', requestId);
        case "ALREADY_LIVE":
          return jsonError(409, "ALREADY_LIVE", "This client is already LIVE.", requestId);
      }
    }
    return jsonOk({ client: result.client, honesty: API_HONESTY_NOTE, requestId });
  } catch (e) {
    if (e instanceof PortalError) {
      return jsonError(e.code === "NOT_FOUND" ? 404 : 403, e.code, e.message, requestId);
    }
    throw e;
  }
}
