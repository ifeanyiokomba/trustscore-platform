// POST /api/v1/safety/settings — update the standing SAFETY_CHECK consent
// (Stage 6). Enabling creates/updates the consent (NDPA §31 — requester,
// purpose, granted scopes, policy version); disabling withdraws it, which
// stops member checks on the subject's handle/phone immediately.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { updateSafetySettings } from "@/lib/services/safety-service";

const SettingsSchema = z.object({
  enabled: z.boolean(),
  includeProfile: z.boolean().default(true),
  includeSignals: z.boolean().default(true),
  allowPhoneMatch: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(`safety-settings:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many settings changes. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const settings = await updateSafetySettings(user.id, parsed.data);
  return jsonOk({ settings });
}
