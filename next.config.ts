import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Batch 0 security headers (docs/audit/SECURITY_AUDIT.md finding S1)
//
// Deliberate sandbox-compatibility decision: X-Frame-Options / CSP
// frame-ancestors are NOT set here because the sandbox Preview Panel may
// embed the app from a different parent origin, and we cannot verify that
// origin from inside the sandbox. Production deployment (Batch 12) adds
// `frame-ancestors <production-origin>` + `X-Frame-Options: DENY` once the
// real domain is known. All other protections below are active now.
//
// CSP notes: Next.js bootstraps with inline scripts (and dev HMR needs eval),
// so 'unsafe-inline' (+'unsafe-eval' in development) is required for scripts;
// nonce-based tightening is the documented Batch 11 follow-up. Fonts are
// self-hosted via next/font; all API calls are same-origin relative paths.
// ---------------------------------------------------------------------------
const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
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
