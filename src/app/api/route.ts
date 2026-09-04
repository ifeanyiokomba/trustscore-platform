// GET /api — API index (mirrors the future FastAPI /v1 surface).

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "TrustScore Platform API",
    stage: "4 — Trust Signals (phone OTP + biometric liveness, L2–L4 escalation, cross-signal consistency)",
    version: "1.3.0",
    notice:
      "NINAuth integration is implemented behind a contract-first MOCK provider adapter (OAuth 2.0 + PKCE + OIDC-style ID tokens). Phone (SMS OTP) and biometric (liveness) signals are likewise contract-first MOCK transports. No live government or MNO/biometric integration is claimed. The LIVE transports activate once partner sandbox credentials exist (audit §2.2).",
    endpoints: [
      { method: "GET", path: "/api/health", auth: false, description: "Liveness + database readiness" },
      { method: "POST", path: "/api/v1/auth/register", auth: false, description: "Create an account (rate-limited)" },
      { method: "POST", path: "/api/v1/auth/login", auth: false, description: "Sign in (rate-limited)" },
      { method: "POST", path: "/api/v1/auth/logout", auth: "session", description: "Revoke session (idempotent)" },
      { method: "GET", path: "/api/v1/auth/me", auth: "session", description: "Current user" },
      { method: "GET", path: "/api/v1/auth/activity", auth: "session", description: "Recent audited auth events (redacted)" },
      { method: "POST", path: "/api/v1/identity/sessions", auth: "session", description: "Create NINAuth verification session (PKCE, consent screen contract, optional scopes)" },
      { method: "GET", path: "/api/v1/identity/sessions/:id", auth: "session", description: "Session status + event timeline" },
      { method: "POST", path: "/api/v1/identity/sessions/:id/consent", auth: "session", description: "MOCK NINAuth app consent decision (GRANT/DENY, granular scope subset) — retired in LIVE mode" },
      { method: "POST", path: "/api/v1/identity/sessions/:id/callback", auth: "session", description: "OAuth callback: code exchange (PKCE) + ID token validation → TrustIdentity + evidence + attributes" },
      { method: "GET", path: "/api/v1/identity/me", auth: "session", description: "TrustIdentity + assurance ladder + identifiers + attributes + evidence + consents + timeline + signals (phone/biometric/cross-signal)" },
      { method: "POST", path: "/api/v1/identity/consents/:id/withdraw", auth: "session", description: "NDPA §31 consent withdrawal — revokes sourced attributes + signal identifiers; identity if establishing" },
      { method: "POST", path: "/api/v1/identity/signals/phone/start", auth: "session", description: "Stage 4: start phone OTP verification (NG E.164, consent, hashed OTP, MOCK SMS delivery)" },
      { method: "POST", path: "/api/v1/identity/signals/phone/resend", auth: "session", description: "Stage 4: resend OTP (30s cooldown, max 3, attempts reset)" },
      { method: "POST", path: "/api/v1/identity/signals/phone/confirm", auth: "session", description: "Stage 4: confirm OTP → PHONE identifier (hashed) + evidence → ladder L2" },
      { method: "POST", path: "/api/v1/identity/signals/biometrics/start", auth: "session", description: "Stage 4: create liveness job (MOCK Smile-ID-class contract, consent, 10-min window)" },
      { method: "POST", path: "/api/v1/identity/signals/biometrics/complete", auth: "session", description: "Stage 4: submit capture → verdict (liveness + face-match vs government record) → ladder L3/L4" },
    ],
    roadmap: {
      "5": "Trust Passport: profile, score snapshot, QR trust card, share tokens, security center",
    },
  });
}
