// POST /api/v1/engine/admin/providers/:key/fault — Stage 13 (ADMIN): set the
// SANDBOX SIMULATOR fault mode for a provider's calls { mode: none | timeout
// | error | auth | slow }. Exists to exercise the transport's failure paths
// (retries, timeouts, circuit-breaker trips) on demand. Loopback posture only
// — MOCK resolves in-process and LIVE partners obviously cannot be faulted
// from here.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { PROVIDER_KEYS, LOOPBACK_BASE_URL, type ProviderKey } from "@/lib/providers/transport";
import { getProviderPosture, simulatorHealth } from "@/lib/providers/provider-posture";
import { recordAudit } from "@/lib/services/audit-service";

const FaultSchema = z
  .object({
    mode: z.enum(["none", "timeout", "error", "auth", "slow"]),
  })
  .strict();

const FAULT_NOTES: Record<string, string> = {
  none: "Simulator healthy — calls succeed normally.",
  timeout: "Simulator sleeps 8s per call — the transport aborts at 4s, retries twice, then fails (TIMEOUT / RETRIES_EXHAUSTED).",
  error: "Simulator answers 500 — retried, then fails honestly (RETRIES_EXHAUSTED).",
  auth: "Simulator rejects signatures with 401 — the provider's ANSWER, never retried (AUTH_REJECTED).",
  slow: "Simulator adds 900ms latency — watch p50/p95 in the provider console.",
};

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
  const rl = rateLimit(`sim-fault:${user.id}`, 12, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many fault-mode changes. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = FaultSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      422,
      "VALIDATION_ERROR",
      'mode must be one of none, timeout, error, auth, slow.',
      requestId
    );
  }

  const posture = await getProviderPosture();
  if (posture !== "loopback") {
    return jsonError(
      409,
      "LOOPBACK_ONLY",
      "Fault injection targets the sandbox simulator, which only receives calls in the loopback posture. Switch the posture first.",
      requestId
    );
  }

  // The simulator's fault mode is GLOBAL (one process); we record which
  // provider the operator was exercising for the audit trail.
  try {
    const res = await fetch(`${LOOPBACK_BASE_URL}/_fault`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: parsed.data.mode }),
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      return jsonError(
        502,
        "SIMULATOR_UNREACHABLE",
        data.error?.message ?? "The simulator rejected the fault-mode change.",
        requestId
      );
    }
  } catch (err) {
    return jsonError(
      502,
      "SIMULATOR_UNREACHABLE",
      `Could not reach the provider simulator (${err instanceof Error ? err.message : "network fault"}). Start it with mini-services/provider-simulator/start.sh.`,
      requestId
    );
  }

  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "SIMULATOR_FAULT_MODE_SET",
    subjectType: "ProviderSimulator",
    subjectId: key,
    requestId,
    metadata: { provider: key, mode: parsed.data.mode, posture },
  });

  const sim = await simulatorHealth();
  return jsonOk({
    provider: key,
    mode: parsed.data.mode,
    note: FAULT_NOTES[parsed.data.mode],
    simulator: sim,
    requestId,
  });
}
