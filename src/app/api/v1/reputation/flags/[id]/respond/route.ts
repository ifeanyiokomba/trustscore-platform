// POST /api/v1/reputation/flags/:id/respond — the SUBJECT's side of the story
// (Stage 7). Body: { response, evidence?: [{kind, content}] }. OPEN →
// UNDER_REVIEW (enters the human review queue). One response per flag.

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { respondToFlag } from "@/lib/services/reputation-service";
import { markMaterialChange } from "@/lib/services/trustscore-service";

const EvidenceSchema = z
  .object({
    kind: z.enum(["TEXT", "LINK"]),
    content: z.string().trim().min(5).max(2000),
  })
  .strict();

const RespondSchema = z
  .object({
    response: z
      .string()
      .trim()
      .min(20, "Your response must be at least 20 characters — the reviewer needs your side.")
      .max(2000),
    evidence: z.array(EvidenceSchema).max(5).default([]),
  })
  .strict();

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

  const rl = rateLimit(`flag-respond:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many responses. Wait a minute.", requestId);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = RespondSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await respondToFlag(user.id, id, parsed.data);
  if (!result.ok) {
    switch (result.code) {
    case "NOT_FOUND":
      return jsonError(404, "NOT_FOUND", "No such flag.", requestId);
    case "NOT_SUBJECT":
      return jsonError(403, "NOT_SUBJECT", "Only the flagged member can respond to this flag.", requestId);
    case "ALREADY_RESPONDED":
      return jsonError(
        409,
        "ALREADY_RESPONDED",
        "You already responded to this flag — it is under human review.",
        requestId
      );
    case "NOT_OPEN":
      return jsonError(
        409,
        "NOT_OPEN",
        "This flag is no longer open for a response.",
        requestId
      );
    }
  }
  // Response alone does not move the score; recomputed so timeline data
  // (evidence counts) stays fresh.
  await markMaterialChange(user.id, "FLAG_RESPONSE");
  return jsonOk({
    outcome: "SUBMITTED",
    note: "Your response is in. A human reviewer now examines both sides and decides. You will be notified of the outcome.",
  });
}
