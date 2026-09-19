// PATCH  /api/v1/businesses/:id — rename a business profile (DSR rectification).
// DELETE /api/v1/businesses/:id — remove a business profile.
//
// Owner-scoped; UNVERIFIED labels only (Batch 2, G8 — no provider claims).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { renameBusinessProfile, deleteBusinessProfile } from "@/lib/services/business-service";

const RenameSchema = z.object({ name: z.string().min(1).max(80) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(clientKey(req, "business-update"), 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Please slow down.", requestId);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = RenameSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "name is required.", requestId);
  }

  const result = await renameBusinessProfile(user.id, id, parsed.data.name, requestId);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return jsonError(404, "NOT_FOUND", "Business profile not found.", requestId);
    }
    return jsonError(422, "NAME_INVALID", "Business name must be 1–80 characters.", requestId);
  }
  return jsonOk({ profile: result.profile, requestId });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const result = await deleteBusinessProfile(user.id, id, requestId);
  if (!result.ok) {
    return jsonError(404, "NOT_FOUND", "Business profile not found.", requestId);
  }
  return jsonOk({ deleted: true, requestId });
}
