// GET /api — API index (mirrors the future FastAPI /v1 surface).

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "TrustScore Platform API",
    stage: "5 — Trust Passport (TrustScore snapshots, credentials, QR trust card, share tokens/trust link, security center, trust receipts, DSR)",
    version: "1.4.0",
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
      { method: "GET", path: "/api/v1/passport/me", auth: "session", description: "Stage 5: Trust Passport — score snapshot, credentials, share tokens, receipts, sessions, notifications" },
      { method: "POST", path: "/api/v1/passport/share", auth: "session", description: "Stage 5: create Trust Link (raw token shown ONCE; hashed at rest; view-counted, expiring, revocable)" },
      { method: "GET", path: "/api/v1/passport/share", auth: "session", description: "Stage 5: list share tokens (metadata only)" },
      { method: "DELETE", path: "/api/v1/passport/share/:id", auth: "session", description: "Stage 5: revoke a Trust Link" },
      { method: "GET", path: "/api/v1/passport/public/:token", auth: "public", description: "Stage 5: PUBLIC trust-card view — anti-enumeration, view-counted, receipted (410 when dead, 429 when abused)" },
      { method: "POST", path: "/api/v1/passport/credentials/:id/revoke", auth: "session", description: "Stage 5: manually revoke a passport credential (sticks until re-verification)" },
      { method: "POST", path: "/api/v1/passport/dsr", auth: "session", description: "Stage 5: NDPA §36 DSR — EXPORT (data download, 7-day retention) or DELETE (password-confirmed cascade)" },
      { method: "GET", path: "/api/v1/passport/dsr", auth: "session", description: "Stage 5: list DSR requests" },
      { method: "GET", path: "/api/v1/passport/dsr/:id/export", auth: "session", description: "Stage 5: download a completed data export" },
      { method: "GET", path: "/api/v1/passport/notifications", auth: "session", description: "Stage 5: notification feed (change alerts)" },
      { method: "POST", path: "/api/v1/passport/notifications", auth: "session", description: "Stage 5: mark notifications read ({id} or {all:true})" },
      { method: "POST", path: "/api/v1/security/sessions/:id/revoke", auth: "session", description: "Stage 5: remote sign-out of another active session" },
    ],
    roadmap: {
      "6": "Safety Check + Trust Requests (verifier-side, hash-lookup matches)",
      "7": "Resolution + Appeals (flags, disputes, human review)",
    },
  });
}
