// GET  /api/v1/engine/admin/providers/history — Stage 14 transport observability
//        read model: per-provider snapshot history (sparkline source), the
//        circuit transition log, and the sustained-open alert episode state.
// POST — run the observability tick NOW (admin action): drains + persists
//        pending circuit transitions, writes fresh snapshots, evaluates
//        sustained-open alerts/recoveries. Audited.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getTransportHistory, runObservabilityTick } from "@/lib/services/transport-observability";
import { getProviderPosture } from "@/lib/providers/provider-posture";
import { recordAudit } from "@/lib/services/audit-service";

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
  const data = await getTransportHistory();
  return jsonOk({ ...data, requestId });
}

export async function POST(req: NextRequest) {
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
  const rl = rateLimit(`transport-snapshot:${user.id}`, 6, 60_000);
  if (!rl.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many snapshot requests. Wait a minute — the internal tick keeps history flowing anyway.",
      requestId
    );
  }

  const result = await runObservabilityTick();
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "TRANSPORT_SNAPSHOT_TAKEN",
    subjectType: "ProviderTransport",
    subjectId: "all",
    requestId,
    metadata: {
      posture: await getProviderPosture(),
      snapshots: result.snapshotsPersisted,
      events: result.eventsPersisted,
      alertsRaised: result.alertsRaised,
      recoveriesSent: result.recoveriesSent,
    },
  });

  const data = await getTransportHistory();
  return jsonOk({ ...data, tick: result, requestId });
}

export async function PUT(_req: NextRequest) {
  const requestId = newRequestId();
  return jsonError(405, "METHOD_NOT_ALLOWED", "GET reads history, POST snapshots now.", requestId);
}
