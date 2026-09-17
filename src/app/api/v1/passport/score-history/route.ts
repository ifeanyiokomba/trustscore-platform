// GET /api/v1/passport/score-history — Stage 11 Score Insights read model,
// Stage 16: cursor-paginated. The caller's snapshot history (newest page of
// 20 by default; `?before=<snapshotId>` pages backwards in time), component
// deltas between consecutive snapshots, audited events inside each window
// (correlated context — NOT a causal verdict), a full-window summary and
// sparkline, plus the pagination cursor block. Session required. Read-only;
// no PII beyond the caller's own redacted action labels.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import {
  getScoreHistory,
  InvalidHistoryCursorError,
  HISTORY_PAGE_MIN,
  HISTORY_PAGE_MAX,
} from "@/lib/services/score-insights-service";

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

  // Stage 16 — pagination params: `before` (cursor snapshot id) and `limit`
  // (5..20, clamped). Malformed limit → 422; unknown cursor → 422 (the
  // message is identical for missing and foreign ids — no probing).
  const params = req.nextUrl.searchParams;
  let before: string | undefined;
  let limit: number | undefined;

  const beforeRaw = params.get("before");
  if (beforeRaw !== null) {
    if (beforeRaw.length < 10 || beforeRaw.length > 64 || !/^[A-Za-z0-9_-]+$/.test(beforeRaw)) {
      return jsonError(422, "BAD_CURSOR", "Malformed history cursor.", requestId);
    }
    before = beforeRaw;
  }

  const limitRaw = params.get("limit");
  if (limitRaw !== null) {
    const n = Number(limitRaw);
    if (!Number.isInteger(n) || n < HISTORY_PAGE_MIN || n > HISTORY_PAGE_MAX) {
      return jsonError(
        422,
        "BAD_LIMIT",
        `limit must be an integer between ${HISTORY_PAGE_MIN} and ${HISTORY_PAGE_MAX}.`,
        requestId
      );
    }
    limit = n;
  }

  try {
    const data = await getScoreHistory(user.id, { before, limit });
    return jsonOk({ ...data, requestId });
  } catch (err) {
    if (err instanceof InvalidHistoryCursorError) {
      return jsonError(422, "BAD_CURSOR", "Unknown history cursor.", requestId);
    }
    throw err;
  }
}
