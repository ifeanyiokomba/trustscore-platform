// POST /api/v1/dev/clients/:id/plan — change the mock-billing plan
// (Stage 9, OWNER only). Body: { plan: "FREE" | "STARTER" }. Quotas are
// enforced for real (FREE 40 checks/day, STARTER 500); the BILLING is an
// honest mock-up — no payment processor is connected, and the response
// says so. Existing keys keep working; only caps change.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { setPlan, PortalError, DAILY_QUOTA, MAX_KEYS_PER_CLIENT } from "@/lib/services/devportal-service";

const PlanSchema = z.object({ plan: z.enum(["FREE", "STARTER"]) }).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  const rl = rateLimit(`dev-plan:${user.id}`, 3, 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED", "Too many plan changes. Wait a minute.", requestId);

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = PlanSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Plan must be FREE or STARTER.", requestId);
  }
  try {
    const result = await setPlan(user.id, id, parsed.data.plan);
    if (!result.ok) {
      switch (result.code) {
        case "NOT_FOUND":
          return jsonError(404, "NOT_FOUND", "No such API client.", requestId);
        case "FORBIDDEN":
          return jsonError(403, "FORBIDDEN", "Only the client OWNER changes the plan.", requestId);
        default:
          return jsonError(422, "VALIDATION_ERROR", "Invalid plan.", requestId);
      }
    }
    return jsonOk({
      client: result.client,
      billingHonesty:
        "Mock billing: no payment processor is connected in this sandbox. Quotas and key caps ARE enforced for real — the invoice is the only part that is pretend.",
      planCaps: {
        quota: DAILY_QUOTA[parsed.data.plan],
        keys: MAX_KEYS_PER_CLIENT[parsed.data.plan],
      },
      requestId,
    });
  } catch (e) {
    if (e instanceof PortalError) {
      return jsonError(e.code === "NOT_FOUND" ? 404 : 403, e.code, e.message, requestId);
    }
    throw e;
  }
}
