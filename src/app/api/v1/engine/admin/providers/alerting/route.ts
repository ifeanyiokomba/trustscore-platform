// PUT /api/v1/engine/admin/providers/alerting — Stage 14 sustained-open alert
// threshold tuning. Body: { sustainedMs: number } clamped to [5000, 600000].
// The threshold decides when a non-CLOSED circuit episode raises SYSTEM
// notifications to every ADMIN. Audited (PROVIDER_ALERTING_CHANGED).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import {
  getSustainedThresholdMs,
  setSustainedThresholdMs,
  DEFAULT_SUSTAINED_MS,
  MIN_SUSTAINED_MS,
  MAX_SUSTAINED_MS,
} from "@/lib/services/transport-observability";
import { recordAudit } from "@/lib/services/audit-service";

const PutSchema = z
  .object({
    sustainedMs: z
      .number()
      .int()
      .min(MIN_SUSTAINED_MS, `sustainedMs must be ≥ ${MIN_SUSTAINED_MS}`)
      .max(MAX_SUSTAINED_MS, `sustainedMs must be ≤ ${MAX_SUSTAINED_MS}`),
  })
  .strict();

export async function GET(_req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(_req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Admins only (operational grant).", requestId);
  }
  const sustainedMs = await getSustainedThresholdMs();
  return jsonOk({
    sustainedMs,
    defaultSustainedMs: DEFAULT_SUSTAINED_MS,
    minSustainedMs: MIN_SUSTAINED_MS,
    maxSustainedMs: MAX_SUSTAINED_MS,
    requestId,
  });
}

export async function PUT(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Admins only (operational grant).", requestId);
  }
  const rl = rateLimit(`transport-alerting:${user.id}`, 6, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many threshold changes. Wait a minute.", requestId);
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
    return jsonError(
      422,
      "VALIDATION_ERROR",
      `sustainedMs must be an integer between ${MIN_SUSTAINED_MS} and ${MAX_SUSTAINED_MS} (ms).`,
      requestId
    );
  }

  await setSustainedThresholdMs(parsed.data.sustainedMs);
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "PROVIDER_ALERTING_CHANGED",
    subjectType: "PlatformSetting",
    subjectId: "transport.alert.sustainedMs",
    requestId,
    metadata: { sustainedMs: parsed.data.sustainedMs },
  });

  return jsonOk({
    sustainedMs: parsed.data.sustainedMs,
    note: `Sustained-open alerts now fire after ${Math.round(parsed.data.sustainedMs / 1000)}s of a non-closed circuit episode.`,
    requestId,
  });
}
