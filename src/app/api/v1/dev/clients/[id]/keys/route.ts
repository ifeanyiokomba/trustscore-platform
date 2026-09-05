// POST /api/v1/dev/clients/:id/keys — mint an API key (Stage 9).
// OWNER/DEVELOPER role. The RAW key is returned exactly ONCE and never
// stored or logged — at rest only sha256(raw) + a short prefix. FREE plan
// allows 2 active keys, STARTER 5. Keys expire informatively after 365d.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { mintApiKey, PortalError } from "@/lib/services/devportal-service";

const MintSchema = z.object({ name: z.string().trim().min(3).max(40) }).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  const rl = rateLimit(`dev-mint:${user.id}`, 5, 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED", "Too many key operations. Wait a minute.", requestId);

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = MintSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Key label must be 3–40 characters.", requestId);
  }
  try {
    const result = await mintApiKey(user.id, id, parsed.data.name);
    if (!result.ok) {
      switch (result.code) {
        case "NOT_FOUND":
          return jsonError(404, "NOT_FOUND", "No such API client.", requestId);
        case "FORBIDDEN":
          return jsonError(403, "FORBIDDEN", "Your team role does not allow minting keys.", requestId);
        case "LIMIT":
          return jsonError(409, "KEY_LIMIT", "Active-key limit for this plan reached. Revoke a key or upgrade the plan.", requestId);
        default:
          return jsonError(422, "VALIDATION_ERROR", "Invalid key label.", requestId);
      }
    }
    return jsonOk(
      {
        key: result.key,
        warning:
          "Copy this key now — it is shown ONCE and can never be retrieved again (only its sha256 hash is stored).",
        requestId,
      },
      201
    );
  } catch (e) {
    if (e instanceof PortalError) {
      return jsonError(e.code === "NOT_FOUND" ? 404 : 403, e.code, e.message, requestId);
    }
    throw e;
  }
}
