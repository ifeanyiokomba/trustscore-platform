// POST /api/v1/businesses — create a business profile (Batch 2, G8).
// GET  /api/v1/businesses — list the caller's business profiles (masked).
//
// Honesty contract: these are UNVERIFIED owner-claimed labels (RC/BN/IT).
// No provider exists, so nothing here is a trust signal — the response
// shape deliberately exposes status only (no score/band fields, ever).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { createBusinessProfile, listBusinessProfiles } from "@/lib/services/business-service";

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  rcNumber: z.string().min(3).max(20),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "business-create"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Please slow down.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "name and rcNumber are required.", requestId);
  }

  const result = await createBusinessProfile(user.id, parsed.data, requestId);

  if (!result.ok) {
    switch (result.code) {
      case "RC_MALFORMED":
        return jsonError(
          422,
          "RC_MALFORMED",
          "That doesn't look like a CAC registration number. Use the registry prefix (RC, BN or IT) followed by 3–10 characters, e.g. RC 1234567.",
          requestId
        );
      case "NAME_INVALID":
        return jsonError(422, "NAME_INVALID", "Business name must be 1–80 characters.", requestId);
      case "LIMIT_REACHED":
        return jsonError(
          409,
          "LIMIT_REACHED",
          `You already have the maximum of 5 business profiles. Remove one to add another.`,
          requestId
        );
      case "DUPLICATE":
        return jsonError(
          409,
          "DUPLICATE",
          "You have already claimed this registration number.",
          requestId
        );
    }
  }

  return jsonOk({ profile: result.profile }, 201);
}

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const profiles = await listBusinessProfiles(user.id);
  return jsonOk({ profiles, requestId });
}
