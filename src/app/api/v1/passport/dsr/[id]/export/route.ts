// GET /api/v1/passport/dsr/:id/export — download a completed NDPA §36 export.
// Owner-scoped; the payload is purged 7 days after generation.

import { NextRequest, NextResponse } from "next/server";
import { newRequestId, jsonError } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { getDsrExportPayload } from "@/lib/services/passport-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const { id } = await params;
  const result = await getDsrExportPayload(user.id, id);
  if (!result) {
    return jsonError(404, "NOT_FOUND", "Export not found.", requestId);
  }
  if (result.expired) {
    return jsonError(410, "EXPIRED", "This export passed its 7-day retention window.", requestId);
  }
  const filename = `trustscore-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(result.payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
