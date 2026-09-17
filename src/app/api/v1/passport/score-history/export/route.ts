// GET /api/v1/passport/score-history/export?format=csv|json — Stage 11
// self-service series export (the "sparkline data export" from the roadmap
// close-out). CSV = spreadsheet-friendly series; JSON = full history with
// component deltas and window events. Owner-scoped download, audited
// (SCORE_HISTORY_EXPORTED). The heavyweight NDPA §36 DSR export remains the
// full-record path — this one is the member's quick series download.

import { NextRequest, NextResponse } from "next/server";
import { jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { buildScoreHistoryExport } from "@/lib/services/score-insights-service";
import { recordAudit } from "@/lib/services/audit-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(`score-history-export:${user.id}`, 10, 300_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many exports. Try again in a few minutes.", requestId);
  }

  const format = req.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";

  const result = await buildScoreHistoryExport(user.id, format);
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "SCORE_HISTORY_EXPORTED",
    metadata: { format, records: result.records },
  });

  return new NextResponse(result.body, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
    },
  });
}
