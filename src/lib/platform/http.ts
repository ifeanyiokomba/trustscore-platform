// TrustScore Stage 1 — platform HTTP utilities.
// Uniform error envelope, request IDs, and an in-memory rate limiter.
// (Local memory caching only, per platform constraints — Redis arrives with the
// production FastAPI backend; the interface is designed to swap cleanly.)

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export function newRequestId(): string {
  return randomUUID();
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  requestId?: string
): NextResponse<ApiErrorShape> {
  return NextResponse.json({ error: { code, message, requestId } }, { status });
}

export function jsonOk<T extends object>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

// ---------------------------------------------------------------------------
// In-memory fixed-window rate limiter (per key). Suitable for single-instance
// Stage 1; swaps to Redis in production.
// ---------------------------------------------------------------------------

interface Window {
  count: number;
  resetAt: number;
}

const globalForRate = globalThis as unknown as {
  __tsRateLimiter?: Map<string, Window>;
};
const rateStore = globalForRate.__tsRateLimiter ?? new Map<string, Window>();
globalForRate.__tsRateLimiter = rateStore;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const win = rateStore.get(key);
  if (!win || win.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  if (win.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((win.resetAt - now) / 1000),
    };
  }
  win.count += 1;
  return { allowed: true, remaining: limit - win.count, retryAfterSec: 0 };
}

// Never leak whether an email exists (enumeration resistance).
export const GENERIC_LOGIN_ERROR = "Invalid email or password.";

// ---------------------------------------------------------------------------
// sec-batch-A — trusted-proxy boundary for client IP resolution.
//
// Deployment contract (now ENFORCED here + documented in .env.example):
// TrustScore sits behind exactly TS_TRUSTED_PROXY_HOPS appending reverse
// proxies (sandbox: the Caddy gateway; production: the edge proxy). A proxy
// that APPENDS to X-Forwarded-For puts the real client address on the RIGHT;
// leftmost entries are trivially client-spoofable (the previous code took
// [0], so a fresh spoofed IP per request defeated every IP-keyed rate limit).
// We therefore key on the hop TS_TRUSTED_PROXY_HOPS-from-the-right.
// Without XFF the request is effectively direct — x-real-ip (same trust
// level, set by the proxy tier) or "unknown".
// ---------------------------------------------------------------------------

function trustedProxyHops(): number {
  const parsed = Number.parseInt(process.env.TS_TRUSTED_PROXY_HOPS ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 5);
}

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      // Rightmost hops are appended by our own trusted proxy chain;
      // leftmost hops are attacker-controlled. hops-from-the-right =
      // TS_TRUSTED_PROXY_HOPS (1 → the address our fronting proxy observed).
      const idx = Math.max(0, hops.length - trustedProxyHops());
      return hops[idx];
    }
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

export function clientKey(req: NextRequest, scope: string): string {
  return `${scope}:${clientIp(req)}`;
}

// ---------------------------------------------------------------------------
// sec-batch-A — per-account failure windows (distributed credential-stuffing
// defense). The fixed-window limiter above is IP-keyed: one attacker on many
// IPs against ONE account was previously unlimited. recordFailure() builds a
// FAILURE-only window per arbitrary key (routes hash the normalized
// identifier), and failureLimitExhausted() peeks without incrementing, so
// only actual 401s consume the budget. Keys exist for ANY identifier string,
// known or not — a 429 leaks nothing about account existence.
// ---------------------------------------------------------------------------

interface FailureWindow {
  count: number;
  resetAt: number;
}

const globalForFailures = globalThis as unknown as {
  __tsFailureLimiter?: Map<string, FailureWindow>;
};
const failureStore =
  globalForFailures.__tsFailureLimiter ?? new Map<string, FailureWindow>();
globalForFailures.__tsFailureLimiter = failureStore;

export function failureLimitExhausted(
  key: string,
  limit: number,
  windowMs: number
): { blocked: boolean; retryAfterSec: number } {
  const now = Date.now();
  const win = failureStore.get(key);
  if (!win || win.resetAt <= now) return { blocked: false, retryAfterSec: 0 };
  if (win.count >= limit) {
    return {
      blocked: true,
      retryAfterSec: Math.ceil((win.resetAt - now) / 1000),
    };
  }
  return { blocked: false, retryAfterSec: 0 };
}

export function recordFailure(key: string, windowMs: number): void {
  const now = Date.now();
  const win = failureStore.get(key);
  if (!win || win.resetAt <= now) {
    failureStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  win.count += 1;
}
