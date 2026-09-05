// POST /api/v1/dev/clients/:id/team — add a team member (Stage 9, OWNER
// only). Body: { identifier: "@handle or email", role: DEVELOPER | VIEWER }.
// Members gain visibility of the client in THEIR portal. Roles are enforced
// server-side on every portal route. Adding yourself is refused (you are
// already the OWNER).

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, newRequestId, rateLimit } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { addTeamMember, PortalError } from "@/lib/services/devportal-service";
import { notifyUser } from "@/lib/services/notification-service";

const AddSchema = z
  .object({
    identifier: z.string().trim().min(3).max(120),
    role: z.enum(["DEVELOPER", "VIEWER"]),
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
  const rl = rateLimit(`dev-team:${user.id}`, 10, 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED", "Too many team changes. Wait a minute.", requestId);

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Provide a member identifier and a role of DEVELOPER or VIEWER.", requestId);
  }
  try {
    const result = await addTeamMember(user.id, id, parsed.data);
    if (!result.ok) {
      switch (result.code) {
        case "NOT_FOUND":
          return jsonError(404, "NOT_FOUND", "No such API client.", requestId);
        case "FORBIDDEN":
          return jsonError(403, "FORBIDDEN", "Only the client OWNER manages the team.", requestId);
        case "DUPLICATE":
          return jsonError(409, "DUPLICATE", "This member is already on the team.", requestId);
        case "SELF_OWNER":
          return jsonError(422, "SELF_OWNER", "You are already the OWNER of this client.", requestId);
        default:
          return jsonError(422, "VALIDATION_ERROR", "No member matches that handle or email.", requestId);
      }
    }
    // Tell the new member they now see this client in their portal.
    const added = result.client.team[result.client.team.length - 1];
    if (added && !added.isYou) {
      await notifyUser(
        added.userId,
        "SYSTEM",
        `You were added to the ${result.client.name} API client`,
        `@${user.handle} added you as a ${added.role} on the "${result.client.name}" developer portal. You can now see it under Developers in your dashboard.`
      );
    }
    return jsonOk({ client: result.client, requestId }, 201);
  } catch (e) {
    if (e instanceof PortalError) {
      return jsonError(e.code === "NOT_FOUND" ? 404 : 403, e.code, e.message, requestId);
    }
    throw e;
  }
}
