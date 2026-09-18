import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Batch 0 security headers (docs/audit/SECURITY_AUDIT.md finding S1).
//
// CSP is NOT set here anymore: it moved to src/middleware.ts (sec-batch-A)
// so it can be nonce-based in production (the previous static policy kept
// 'unsafe-inline' for scripts in production, which blocks almost nothing).
// Deliberate sandbox-compatibility decision: X-Frame-Options / CSP
// frame-ancestors are NOT set because the sandbox Preview Panel may embed
// the app from a different parent origin. Production deployment adds
// `frame-ancestors <production-origin>` + `X-Frame-Options: DENY` once the
// real domain is known.
//
// sec-batch-A: typescript.ignoreBuildErrors is now FALSE — the external
// review correctly called out that a passing production build with type
// errors undercuts every "tsc clean" claim as a real gate. `bun run dev`
// (this sandbox) is unaffected; `next build` now fails on type errors, and
// CI ( .github/workflows/ci.yml ) runs tsc + eslint explicitly.
// ---------------------------------------------------------------------------

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // sec-batch-A: type errors are REAL failures now — the production build
    // refuses to succeed on a broken type surface (CI enforces it too).
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
