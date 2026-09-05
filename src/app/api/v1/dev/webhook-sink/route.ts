// POST /api/v1/dev/webhook-sink — the SANDBOX SELF-TEST webhook target
// (Stage 9). A plain echo endpoint so a developer can point their webhook
// at http://localhost:3000/api/v1/dev/webhook-sink, fire a test event (or a
// real check), and watch the delivery land: the delivery log records the
// response (this echo), and the portal's docs show how to verify the
// X-TrustScore-Signature header.
//
// It stores NOTHING (beyond the platform's own delivery row, which already
// carries the payload + signature). It echoes back the exact headers +
// body it received — that echo is captured as the delivery's response
// snippet, which is exactly the debugging signal a developer needs.
//
// Rate-limited per IP (it is a public endpoint; abuse = noisy echoes only).

import { NextRequest } from "next/server";
import { jsonOk, newRequestId, rateLimit, clientKey } from "@/lib/platform/http";

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const rl = rateLimit(clientKey(req, "webhook-sink"), 30, 60_000);
  if (!rl.allowed) {
    return jsonOk({ error: { code: "RATE_LIMITED", message: "Sink rate limit — retry shortly.", requestId } }, 429);
  }
  let body = "";
  try {
    body = (await req.text()).slice(0, 4000);
  } catch {
    body = "";
  }
  return jsonOk({
    received: true,
    sink: "TrustScore sandbox self-test webhook sink",
    headers: {
      "x-trustscore-event": req.headers.get("x-trustscore-event") ?? null,
      "x-trustscore-signature": req.headers.get("x-trustscore-signature") ?? null,
      "content-type": req.headers.get("content-type") ?? null,
    },
    body: body ? safeJson(body) : null,
    note: "This sink echoes what it received so the delivery log shows your endpoint's exact view. In production, verify the signature and return 2xx fast.",
    requestId,
  });
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
