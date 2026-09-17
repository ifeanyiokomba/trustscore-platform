// POST /api/v1/dev/clients/:id/webhook/test — send a signed WEBHOOK_TEST
// event to the configured endpoint (Stage 9).
//
// OWNER/DEVELOPER role. The delivery runs through the REAL pipeline
// (enqueueDelivery → signed attempt #1 → retry schedule on failure), so the
// response reports exactly what any production event would experience:
//   { delivery: ShapedDelivery } — status DELIVERED (2xx) or RETRYING with
//   nextRetryAt, the signature header we sent, the endpoint's status code and
//   a response snippet.
//
// Errors: 401 no session · 403 role · 404 client · 422 WEBHOOK_NOT_CONFIGURED
// (test requires a configured URL + secret — configure first).
//
// NOTE (Batch 0 audit): this file was reconstructed during the Batch-0 deep
// audit — it existed in the working tree when stage9 went green but was lost
// in the Stage-15 orphan-branch working-tree revert and never committed
// (tests + UI referenced it; the route 404'd). Lesson recorded in worklog:
// the standing rule "after any platform commit, run tsc + one matrix" now
// also covers "route files referenced by tests must exist".

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { db } from "@/lib/db";
import { requireRole, PortalError } from "@/lib/services/devportal-service";
import { enqueueDelivery, shapeDelivery } from "@/lib/services/webhook-service";
import { recordAudit } from "@/lib/services/audit-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);

  // Test sends are bounded (they perform a real HTTP attempt).
  const rl = rateLimit(`dev-webhook-test:${user.id}:${id}`, 6, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many test sends. Wait a minute.", requestId);
  }

  try {
    await requireRole(user.id, id, "DEVELOPER");
  } catch (e) {
    if (e instanceof PortalError) {
      return jsonError(e.code === "NOT_FOUND" ? 404 : 403, e.code, e.message, requestId);
    }
    throw e;
  }

  const client = await db.apiClient.findUnique({
    where: { id },
    select: { id: true, webhookUrl: true, webhookSecret: true },
  });
  if (!client) {
    return jsonError(404, "NOT_FOUND", "No such API client.", requestId);
  }
  if (!client.webhookUrl || !client.webhookSecret) {
    return jsonError(
      422,
      "WEBHOOK_NOT_CONFIGURED",
      "Configure a webhook URL first — the test event is delivered to your configured endpoint.",
      requestId
    );
  }

  const { deliveryId } = await enqueueDelivery(client, "WEBHOOK_TEST", {
    message: "This is a test event from TrustScore. Verify the signature, then discard.",
    hint: "Signatures: HMAC-SHA256(secret, `${t}.${rawBody}`) over the exact bytes received.",
  });

  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "WEBHOOK_TEST_SENT",
    subjectType: "ApiClient",
    subjectId: id,
    metadata: { deliveryId },
  });

  const row = deliveryId
    ? await db.webhookDelivery.findUnique({ where: { id: deliveryId } })
    : null;
  if (!row) {
    return jsonError(500, "DELIVERY_FAILED", "The test delivery could not be recorded.", requestId);
  }

  return jsonOk({
    delivery: shapeDelivery(row),
    note: "Test events use the same signing + retry pipeline as production events.",
    requestId,
  });
}
