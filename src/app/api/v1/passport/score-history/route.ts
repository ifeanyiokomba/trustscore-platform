// GET /api/v1/passport/score-history — Stage 11 Score Insights read model:
// the caller's snapshot history (oldest → newest), component-level deltas
// between consecutive snapshots, the audited events recorded inside each
// window (correlated context — NOT a causal verdict), a summary and the
// sparkline series. Session required. Read-only; no PII beyond the caller's
// own redacted action labels.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getScoreHistory } from "@/lib/services/score-insights-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  // Cheap read, but keep it bounded per USER (shared NATs must not fight).
  const rl = rateLimit(`score-history:${user.id}`, 60, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many requests. Try again shortly.", requestId);
  }

  const data = await getScoreHistory(user.id);
  return jsonOk({ ...data, requestId });
}
