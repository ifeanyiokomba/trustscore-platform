// TrustScore sec-batch-A — request proxy (Next 16 "middleware" convention):
// boot-guard + CSP.
//
// 1) BOOT GUARD (module scope, runs once per server start): in production the
//    process REFUSES to serve traffic when any security-critical secret
//    (VAULT_MASTER_KEY / SIGNAL_PEPPER / NINAUTH_CLIENT_SECRET /
//    LOOPBACK_SIGNING_SECRET) is missing, defaulted or weak — see
//    src/lib/platform/boot-guard.ts. Fail-closed beats silently protecting
//    identity fingerprints with a constant from the public repo history.
//
// 2) CSP: nonce-based in production. The old next.config.ts policy shipped
//    'unsafe-inline' for scripts in every environment, which blocks almost
//    nothing — an injected <script> tag executed fine. Now:
//      - production: script-src 'self' 'nonce-<per-request>' 'strict-dynamic'
//        (Next.js + React 19 automatically nonce their rendered <script> tags
//        when the CSP header rides the request — documented pattern).
//      - development: unchanged HMR-compatible policy ('unsafe-inline' +
//        'unsafe-eval'), because Turbopack dev tooling needs them.
//      - TS_FORCE_NONCE_CSP=1 exercises the production nonce path in dev for
//        verification (sandbox-only escape hatch).
//    style-src keeps 'unsafe-inline' (inline style attributes; no script
//    execution risk). Static headers stay in next.config.ts.

import { NextRequest, NextResponse } from "next/server";
import { assertSecretsAtBoot } from "@/lib/platform/boot-guard";

// Fail-closed boot check — before the first byte of any request.
assertSecretsAtBoot();

function freshNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export default function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const useNonce = !isDev || process.env.TS_FORCE_NONCE_CSP === "1";
  const nonce = freshNonce();

  const scriptSrc = useNonce
    ? `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : " 'strict-dynamic'"}`
    : `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`;

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  // Carry the policy (+ nonce) on the REQUEST so Next.js / React 19 apply the
  // nonce to every <script> tag they render for this response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Everything except immutable static assets (which carry no policy of
  // their own — they are not documents).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
