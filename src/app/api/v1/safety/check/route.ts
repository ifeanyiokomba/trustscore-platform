// POST /api/v1/safety/check — run a Safety Check (verifier-side, Stage 6).
// Body: exactly ONE of { handle, phone, link, qr }.
// Auth required (accountability: every check is attributed, receipted,
// rate-limited). Anti-enumeration: unknown handle / disabled checks /
// unmatched phone return an identical UNAVAILABLE shape (never a 404).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { runSafetyCheck } from "@/lib/services/safety-service";

const CheckSchema = z
  .object({
    handle: z.string().trim().min(1).max(64).optional(),
    phone: z.string().trim().min(5).max(20).optional(),
    link: z.string().trim().min(10).max(512).optional(),
    qr: z.string().trim().min(10).max(512).optional(),
  })
  .strict()
  .refine(
    (v) => [v.handle, v.phone, v.link, v.qr].filter((f) => f !== undefined && f !== "").length === 1,
    { message: "Provide exactly one of: handle, phone, link or qr." }
  );

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  // Per-verifier + per-IP window — safety checks are a privileged lookup.
  const rl = rateLimit(`safety-check:${user.id}`, 12, 60_000);
  if (!rl.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many safety checks. Wait a minute before checking again.",
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
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await runSafetyCheck(
    { id: user.id, displayName: user.displayName, handle: user.handle },
    parsed.data,
    req
  );

  switch (result.outcome) {
    case "OK":
      return jsonOk({
        outcome: "OK",
        checkId: result.checkId,
        assessment: result.assessment,
        receipted: result.receipted,
      });
    case "SELF":
      return jsonOk({
        outcome: "SELF",
        checkId: result.checkId,
        message: result.message,
        assessment: result.assessment,
      });
    case "DEAD_LINK":
      return jsonOk({ outcome: "DEAD_LINK", reason: result.reason });
    case "UNAVAILABLE":
      return jsonOk({ outcome: "UNAVAILABLE", message: result.message });
  }
}
