// POST /api/v1/internal/webhook-tick — Stage 12 timer-driven webhook retry.
// Called ONLY by the platform's own webhook-worker mini-service (port 3031),
// which ticks every 60s. This closes the "lazy-only retry" gap: due retries
// now run on a timer IN ADDITION to the lazy on-read processor.
//
// Stage 14: the tick ALSO runs the transport observability pass — persist
// circuit transition events + per-provider metrics snapshots and evaluate
// sustained-open alerts (see transport-observability.ts). The observability
// leg is fault-tolerant: a failure degrades to webhook-only behavior and is
// reported in the response, never breaking the retry tick.
//
// Access: a fixed internal token header (sandbox single-instance posture —
// documented honestly; production shape is an internal network grant). The
// endpoint is deliberately bounded: processDueDeliveries() takes at most 5
// due deliveries per call, so even a hammering caller gets bounded work.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId } from "@/lib/platform/http";
import { processDueDeliveries } from "@/lib/services/webhook-service";
import { runObservabilityTick } from "@/lib/services/transport-observability";

export const INTERNAL_TICK_TOKEN = "ts-internal-webhook-tick-v1";

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const token = req.headers.get("x-internal-token");
  if (!token || token !== INTERNAL_TICK_TOKEN) {
    return jsonError(403, "FORBIDDEN", "Internal endpoint — invalid token.", requestId);
  }
  const processed = await processDueDeliveries();

  // Stage 14 — transport observability (best-effort, bounded).
  let observability:
    | {
        snapshotsPersisted: number;
        eventsPersisted: number;
        alertsRaised: string[];
        recoveriesSent: string[];
      }
    | { error: string };
  try {
    const result = await runObservabilityTick();
    observability = {
      snapshotsPersisted: result.snapshotsPersisted,
      eventsPersisted: result.eventsPersisted,
      alertsRaised: result.alertsRaised,
      recoveriesSent: result.recoveriesSent,
    };
  } catch (err) {
    observability = { error: err instanceof Error ? err.message : "observability tick failed" };
  }

  return jsonOk({ processed, observability, at: new Date().toISOString(), requestId });
}

export async function GET(_req: NextRequest) {
  const requestId = newRequestId();
  return jsonError(405, "METHOD_NOT_ALLOWED", "POST only — the worker ticks this endpoint.", requestId);
}
