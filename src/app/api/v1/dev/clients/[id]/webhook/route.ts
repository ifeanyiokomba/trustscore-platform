// POST /api/v1/dev/clients/:id/webhook — configure the webhook endpoint
// (Stage 9). OWNER/DEVELOPER role. Body: { url, rotateSecret }.
//   * url "" (empty) disables deliveries
//   * SANDBOX allows http(s) incl. localhost (self-test against the
//     platform's own sink); LIVE requires https and rejects local/private
//     hosts
//   * the signing secret is generated server-side; it is returned ONCE when
//     (re)generated — after that only its existence is reported
// Every delivery is signed: X-TrustScore-Signature: t=<unix>,v1=<hmac>.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { configureWebhook, PortalError } from "@/lib/services/devportal-service";

const WebhookSchema = z
  .object({
    url: z.string().trim().max(512),
    rotateSecret: z.boolean().default(false),
  })
  .strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  const rl = rateLimit(`dev-webhook:${user.id}`, 10, 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED", "Too many webhook changes. Wait a minute.", requestId);

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = WebhookSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid webhook settings.", requestId);
  }
  try {
    const result = await configureWebhook(user.id, id, parsed.data);
    if (!result.ok) {
      switch (result.code) {
        case "NOT_FOUND":
          return jsonError(404, "NOT_FOUND", "No such API client.", requestId);
        case "FORBIDDEN":
          return jsonError(403, "FORBIDDEN", "Your team role does not allow webhook changes.", requestId);
        default:
          return jsonError(
            422,
            "VALIDATION_ERROR",
            "Webhook URL must be a valid http(s) URL. LIVE clients require https and reject localhost/private hosts.",
            requestId
          );
      }
    }
    return jsonOk({
      client: result.client,
      ...(result.secret
        ? {
            secret: result.secret,
            secretWarning:
              "Copy this signing secret now — it is shown ONCE. Verify deliveries with HMAC-SHA256(secret, `${t}.${body}`).",
          }
        : {}),
      requestId,
    });
  } catch (e) {
    if (e instanceof PortalError) {
      return jsonError(e.code === "NOT_FOUND" ? 404 : 403, e.code, e.message, requestId);
    }
    throw e;
  }
}
