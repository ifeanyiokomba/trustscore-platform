// POST /api/v1/reputation/flags — file a flag with evidence (Stage 7).
// Body: { subjectHandle, category, description, evidence: [{kind, content}] }
// Anti-gaming (service-enforced): live L2+ reporter identity, no self-flags,
// one open flag per pair, 3-per-7-day reporter quota, ≥1 evidence item.
// Route-level rate limit 3/min per user (abuse brake on top of the quota).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { createFlag, FLAG_CATEGORIES } from "@/lib/services/reputation-service";

const EvidenceSchema = z
  .object({
    kind: z.enum(["TEXT", "LINK"]),
    content: z
      .string()
      .trim()
      .min(5, "Evidence must be at least 5 characters.")
      .max(2000, "Evidence must be at most 2000 characters."),
  })
  .strict();

const FlagSchema = z
  .object({
    subjectHandle: z
      .string()
      .trim()
      .min(3)
      .max(25)
      .regex(/^[a-zA-Z0-9_@]+$/, "Handle may only contain letters, numbers and underscores."),
    category: z.enum(FLAG_CATEGORIES),
    description: z
      .string()
      .trim()
      .min(40, "Describe the concern in at least 40 characters — flags are serious.")
      .max(2000, "Description must be at most 2000 characters."),
    evidence: z.array(EvidenceSchema).min(1, "At least one piece of evidence is required.").max(5),
  })
  .strict();

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  const rl = rateLimit(`flag-create:${user.id}`, 3, 60_000);
  if (!rl.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many flag submissions. Wait a minute before trying again.",
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

  const parsed = FlagSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
  }

  const result = await createFlag(
    { id: user.id, handle: user.handle },
    parsed.data
  );

  if (!result.ok) {
    switch (result.code) {
    case "ASSURANCE_REQUIRED":
      return jsonError(
        403,
        "ASSURANCE_REQUIRED",
        "Filing a flag requires a verified identity (L2+): verify your government ID and phone first. This keeps reporting human and accountable.",
        requestId
      );
    case "SELF_FLAG":
      return jsonError(422, "SELF_FLAG", "You cannot file a flag against yourself.", requestId);
    case "SUBJECT_NOT_FOUND":
      return jsonError(404, "SUBJECT_NOT_FOUND", "No member found with that handle.", requestId);
    case "DUPLICATE_OPEN":
      return jsonError(
        409,
        "DUPLICATE_OPEN",
        "You already have an open flag against this member. The case must close (resolved or withdrawn) before you can file another.",
        requestId
      );
    case "FLAG_WINDOW":
      return jsonError(
        429,
        "FLAG_WINDOW",
        "Weekly flag limit reached (3 per 7 days). This cap protects members from flag wars.",
        requestId
      );
    }
  }
  return jsonOk(
    {
      outcome: "FILED",
      flagId: result.flagId,
      note: "The member has been notified and can respond. A human reviewer decides the outcome — flags never affect a TrustScore automatically.",
    },
    201
  );
}
