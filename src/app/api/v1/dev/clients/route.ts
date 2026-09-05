// POST /api/v1/dev/clients — register an API client (business app) in the
// Developer Portal (Stage 9). SANDBOX by default; LIVE is a separate typed
// confirmation step. Max 3 owned clients per member (sandbox scale, honest
// quota). Creating a client makes you its OWNER team member.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { createClient } from "@/lib/services/devportal-service";

const CreateSchema = z
  .object({
    name: z.string().trim().min(3).max(60),
    environment: z.enum(["SANDBOX", "LIVE"]).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  const rl = rateLimit(`dev-create:${user.id}`, 5, 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED", "Too many client registrations. Wait a minute.", requestId);

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Client name must be 3–60 characters.", requestId);
  }
  const result = await createClient(user.id, parsed.data);
  if (!result.ok) {
    if (result.code === "LIMIT") {
      return jsonError(409, "CLIENT_LIMIT", "You already own the maximum of 3 API clients.", requestId);
    }
    return jsonError(422, "VALIDATION_ERROR", "Invalid client settings.", requestId);
  }
  return jsonOk({ client: result.client, requestId }, 201);
}
