// POST /api/v1/engine/admin/providers/:key/reset — Stage 13 (ADMIN): reset a
// provider's circuit breaker + transport metrics (CLOSED, zeroed). :key is
// ninauth | phone | liveness.

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { resetProviderTransport, providerTransportStatus, PROVIDER_KEYS, type ProviderKey } from "@/lib/providers/transport";
import { recordAudit } from "@/lib/services/audit-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const requestId = newRequestId();
  const { key } = await params;

  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Provider administration is restricted to platform admins.", requestId);
  }
  if (!PROVIDER_KEYS.includes(key as ProviderKey)) {
    return jsonError(404, "UNKNOWN_PROVIDER", `Unknown provider key: ${key}.`, requestId);
  }
  const rl = rateLimit(`providers-reset:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many resets. Wait a minute.", requestId);
  }

  resetProviderTransport(key as ProviderKey);
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "PROVIDER_TRANSPORT_RESET",
    subjectType: "ProviderTransport",
    subjectId: key,
    requestId,
    metadata: { provider: key },
  });

  return jsonOk({
    provider: key,
    transport: providerTransportStatus(key as ProviderKey),
    note: `Circuit breaker CLOSED and metrics zeroed for ${key}.`,
    requestId,
  });
}
