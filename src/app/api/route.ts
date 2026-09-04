// GET /api — Stage-1 API index (mirrors the future FastAPI /v1 surface).

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "TrustScore Platform API",
    stage: "2 — NINAuth Identity (contract-first MOCK provider)",
    version: "1.1.0",
    notice:
      "NINAuth integration is implemented behind a contract-first MOCK provider adapter (OAuth 2.0 + PKCE + OIDC-style ID tokens). No live government integration is claimed. The LIVE transport activates once partner sandbox credentials exist (audit §2.2).",
    endpoints: [
      { method: "GET", path: "/api/health", auth: false, description: "Liveness + database readiness" },
      { method: "POST", path: "/api/v1/auth/register", auth: false, description: "Create an account (rate-limited)" },
      { method: "POST", path: "/api/v1/auth/login", auth: false, description: "Sign in (rate-limited)" },
      { method: "POST", path: "/api/v1/auth/logout", auth: "session", description: "Revoke session (idempotent)" },
      { method: "GET", path: "/api/v1/auth/me", auth: "session", description: "Current user" },
      { method: "GET", path: "/api/v1/auth/activity", auth: "session", description: "Recent audited auth events (redacted)" },
      { method: "POST", path: "/api/v1/identity/sessions", auth: "session", description: "Create NINAuth verification session (PKCE, consent screen contract)" },
      { method: "GET", path: "/api/v1/identity/sessions/:id", auth: "session", description: "Session status + event timeline" },
      { method: "POST", path: "/api/v1/identity/sessions/:id/consent", auth: "session", description: "MOCK NINAuth app consent decision (GRANT/DENY) — retired in LIVE mode" },
      { method: "POST", path: "/api/v1/identity/sessions/:id/callback", auth: "session", description: "OAuth callback: code exchange (PKCE) + ID token validation → TrustIdentity" },
      { method: "GET", path: "/api/v1/identity/me", auth: "session", description: "TrustIdentity + consent history + latest session timeline" },
    ],
    roadmap: {
      "3": "Trust Identity management — assurance levels L1–L4, hashed identifiers, consent-scoped attributes",
    },
  });
}
