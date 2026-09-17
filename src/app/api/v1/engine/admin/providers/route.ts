// GET  /api/v1/engine/admin/providers — Stage 13 provider console read model:
// posture, per-provider transport state (circuit, latency p50/p95, error
// rate, last error), credential vault (masked hints only), simulator health.
// PUT  — set the provider posture { posture: "mock" | "loopback" | "live" }.
// "live" is honestly gated: without PROVIDER_LIVE_ENABLED + base URLs +
// ACTIVE vault credentials for every provider it answers 422 — nothing live
// is ever claimed in this sandbox.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import {
  getProvidersAdmin,
  setProviderPosture,
  getProviderPosture,
  postureNote,
  PostureError,
} from "@/lib/providers/provider-posture";
import { recordAudit } from "@/lib/services/audit-service";

const PutSchema = z
  .object({
    posture: z.enum(["mock", "loopback", "live"]),
  })
  .strict();

export async function GET(_req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(_req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(
      403,
      "FORBIDDEN",
      "Provider administration is restricted to platform admins (operational grant).",
      requestId
    );
  }
  const data = await getProvidersAdmin();
  return jsonOk({ ...data, requestId });
}

export async function PUT(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(
      403,
      "FORBIDDEN",
      "Provider administration is restricted to platform admins (operational grant).",
      requestId
    );
  }
  const rl = rateLimit(`providers-posture:${user.id}`, 6, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many posture changes. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", 'posture must be "mock", "loopback" or "live".', requestId);
  }

  try {
    await setProviderPosture(parsed.data.posture);
  } catch (err) {
    if (err instanceof PostureError) {
      return jsonError(err.status, err.code, err.message, requestId);
    }
    throw err;
  }

  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "PROVIDER_POSTURE_CHANGED",
    subjectType: "PlatformSetting",
    subjectId: "providers.posture",
    requestId,
    metadata: { posture: parsed.data.posture },
  });

  const posture = await getProviderPosture();
  return jsonOk({
    posture,
    note: postureNote(posture),
    requestId,
  });
}
