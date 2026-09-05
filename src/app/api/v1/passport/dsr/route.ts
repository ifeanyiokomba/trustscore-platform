// POST /api/v1/passport/dsr — NDPA §36 data-subject rights, self-service.
//   {type: "EXPORT"}            → generates the full data export (downloadable 7 days)
//   {type: "DELETE", password}  → verifies password, final export, cascade delete.
// GET — list the caller's DSR requests (redacted).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser, clearSessionCookie } from "@/lib/platform/session";
import {
  createDsrExport,
  requestDsrDelete,
  listDsrRequests,
} from "@/lib/services/passport-service";
import { recordAudit } from "@/lib/services/audit-service";

const DsrSchema = z.union([
  z.object({ type: z.literal("EXPORT") }),
  z.object({ type: z.literal("DELETE"), password: z.string().min(8).max(200) }),
]);

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  // DSR is expensive (full payload build) — 3 per 5 minutes per USER (not
  // per IP: a shared NAT must not block another person's rights request).
  const rl = rateLimit(`dsr:${user.id}`, 3, 300_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many DSR requests. Try again in a few minutes.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = DsrSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid DSR request.", requestId);
  }

  if (parsed.data.type === "EXPORT") {
    await recordAudit({
      actorType: "USER",
      actorId: user.id,
      action: "DSR_EXPORT_REQUESTED",
      metadata: { type: "EXPORT" },
    });
    const result = await createDsrExport(user.id);
    return jsonOk(
      {
        type: "EXPORT",
        status: "COMPLETED",
        requestId: result.id,
        bytes: result.bytes,
        expiresAt: result.expiresAt,
        downloadPath: `/api/v1/passport/dsr/${result.id}/export`,
      },
      201
    );
  }

  // DELETE — irreversible; requires password re-confirmation.
  const result = await requestDsrDelete(req, parsed.data.password);
  if (result.outcome === "WRONG_PASSWORD") {
    return jsonError(401, "WRONG_PASSWORD", "Password confirmation failed.", requestId);
  }
  if (result.outcome === "NOT_FOUND") {
    return jsonError(404, "NOT_FOUND", "Account not found.", requestId);
  }
  const res = jsonOk(
    {
      type: "DELETE",
      status: "COMPLETED",
      deleted: true,
      finalExport: result.exportFirst
        ? {
            id: result.exportFirst.id,
            note: "A final data export was generated before deletion. Retain it — it is no longer downloadable once you sign out.",
          }
        : null,
    },
    200
  );
  return clearSessionCookie(res);
}

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const requests = await listDsrRequests(user.id);
  return jsonOk({ requests });
}
