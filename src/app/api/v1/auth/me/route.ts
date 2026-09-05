// GET /api/v1/auth/me — resolve the current session (used to hydrate the client).

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId } from "@/lib/platform/http";
import { getSessionUser, toPublicUser } from "@/lib/platform/session";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const user = await getSessionUser(req);
  if (!user) {
    return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  }

  return jsonOk({ user: toPublicUser(user) });
}
