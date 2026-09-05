// POST /api/v1/reputation/flags/:id/withdraw — the REPORTER withdraws an OPEN
// flag (Stage 7). Withdrawn flags have zero score effect and never surface in
// checks. Only while OPEN (once the subject has responded, the case goes to
// review — withdrawing to dodge scrutiny is not allowed).

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { withdrawFlag } from "@/lib/services/reputation-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(`flag-withdraw:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many actions. Wait a minute.", requestId);
  }

  const result = await withdrawFlag(user.id, id);
  if (!result.ok) {
    switch (result.code) {
    case "NOT_FOUND":
      return jsonError(404, "NOT_FOUND", "No such flag.", requestId);
    case "NOT_REPORTER":
      return jsonError(403, "NOT_REPORTER", "Only the reporter can withdraw this flag.", requestId);
    case "NOT_WITHDRAWABLE":
      return jsonError(
        409,
        "NOT_WITHDRAWABLE",
        "This flag can no longer be withdrawn — it is already under review or resolved.",
        requestId
      );
    }
  }
  return jsonOk({
    outcome: "WITHDRAWN",
    note: "The flag is withdrawn. It has no effect on the member's TrustScore and the member has been notified.",
  });
}
