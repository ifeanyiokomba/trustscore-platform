// GET /api — Stage-1 API index (mirrors the future FastAPI /v1 surface).

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "TrustScore Platform API",
    stage: "1 — Platform Foundation",
    version: "1.0.0",
    notice:
      "NINAuth integration arrives in Stage 2 behind a provider adapter. No live government integration is claimed at this stage.",
    endpoints: [
      { method: "GET", path: "/api/health", auth: false, description: "Liveness + database readiness" },
      { method: "POST", path: "/api/v1/auth/register", auth: false, description: "Create an account (rate-limited)" },
      { method: "POST", path: "/api/v1/auth/login", auth: false, description: "Sign in (rate-limited)" },
      { method: "POST", path: "/api/v1/auth/logout", auth: "session", description: "Revoke session (idempotent)" },
      { method: "GET", path: "/api/v1/auth/me", auth: "session", description: "Current user" },
      { method: "GET", path: "/api/v1/auth/activity", auth: "session", description: "Recent audited auth events (redacted)" },
    ],
    roadmap: {
      "2": "POST /v1/identity/sessions, GET /v1/identity/sessions/:id, GET /v1/identity/me (NINAuth)",
    },
  });
}
