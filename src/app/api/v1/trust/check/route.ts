// POST /api/v1/trust/check — the B2B Trust Decision API (Stage 9).
//
// Auth: X-API-Key header (tsk_<env>_<hex>) — NOT a browser session. The
// endpoint serves INTEGRATED BUSINESSES: marketplaces, lenders, rental
// platforms checking a counterparty before dealing.
//
// Contract (honest by design):
//   * exactly one of { handle, phone, link, qr }
//   * HANDLE/PHONE checks are gated by the subject's standing SAFETY_CHECK
//     consent — the same consent as member checks. No consent → identical
//     UNAVAILABLE (anti-enumeration)
//   * responses are band-level assessments with the locked language; the
//     score NUMBER never crosses this surface
//   * every completed check is receipted to the subject (the business is
//     NAMED), notified, audited, logged for usage/quota, and — when a
//     webhook endpoint is configured — delivered as a signed event
//   * this is an assessment surface, not an automated-decision surface:
//     the note field says so on every response (NDPA §37)
//
// Errors: 401 invalid key · 400 bad JSON · 422 wrong input shape ·
// 429 rate limit / quota · 200 for UNAVAILABLE/DEAD_LINK outcomes (they
// are valid business results, not errors).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId } from "@/lib/platform/http";
import {
  authenticateApiKey,
  runTrustDecision,
  PURPOSE_OPTIONS,
} from "@/lib/services/trustdecision-service";

const CheckSchema = z
  .object({
    handle: z.string().trim().min(1).max(64).optional(),
    phone: z.string().trim().min(1).max(20).optional(),
    link: z.string().trim().min(1).max(512).optional(),
    qr: z.string().trim().min(1).max(512).optional(),
    // Directive §22 — transaction-specific trust: the business states WHY it is
    // checking. Optional + backward-compatible; echoed on the subject's
    // receipt/notification and stored on the TrustDecision audit row.
    purpose: z.enum(PURPOSE_OPTIONS).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const auth = await authenticateApiKey(req, requestId);
  if (!auth.ok) {
    return jsonError(
      auth.code === "RATE_LIMITED" || auth.code === "QUOTA_EXCEEDED" ? 429 : 401,
      auth.code,
      auth.message,
      requestId
    );
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = CheckSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid input.", requestId);
  }

  const result = await runTrustDecision(auth.caller, parsed.data, requestId);
  return jsonOk(result.body, result.status);
}
