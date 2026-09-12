// POST /api/v1/internal/webhook-tick — Stage 12 timer-driven webhook retry.
// Called ONLY by the platform's own webhook-worker mini-service (port 3031),
// which ticks every 60s. This closes the "lazy-only retry" gap: due retries
// now run on a timer IN ADDITION to the lazy on-read processor.
//
// Access: a fixed internal token header (sandbox single-instance posture —
// documented honestly; production shape is an internal network grant). The
// endpoint is deliberately bounded: processDueDeliveries() takes at most 5
// due deliveries per call, so even a hammering caller gets bounded work.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId } from "@/lib/platform/http";
import { processDueDeliveries } from "@/lib/services/webhook-service";

export const INTERNAL_TICK_TOKEN = "ts-internal-webhook-tick-v1";

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const token = req.headers.get("x-internal-token");
  if (!token || token !== INTERNAL_TICK_TOKEN) {
    return jsonError(403, "FORBIDDEN", "Internal endpoint — invalid token.", requestId);
  }
  const processed = await processDueDeliveries();
  return jsonOk({ processed, at: new Date().toISOString(), requestId });
}

export async function GET(_req: NextRequest) {
  const requestId = newRequestId();
  return jsonError(405, "METHOD_NOT_ALLOWED", "POST only — the worker ticks this endpoint.", requestId);
}
