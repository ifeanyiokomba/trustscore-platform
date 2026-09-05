// GET /api/v1/network/providers — PUBLIC pan-African country-provider
// registry (Stage 10). No PII, no session: a transparency/marketing surface
// stating where verification depth exists and where it is merely PLANNED.
// The registry is a read model — verification flows remain NG-only until an
// adapter ships.

import { NextRequest } from "next/server";
import { jsonOk, jsonError, newRequestId, rateLimit } from "@/lib/platform/http";
import { listProviders } from "@/lib/services/network-service";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const rl = rateLimit(`network-providers:${req.headers.get("x-real-ip") ?? "anon"}`, 60, 60_000);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many requests. Wait a minute.", requestId);
  }

  const data = await listProviders();
  return jsonOk({ ...data, requestId });
}
