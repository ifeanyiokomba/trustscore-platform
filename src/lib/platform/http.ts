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

export function clientKey(req: NextRequest, scope: string): string {
  // Best-effort client key: IP (+ optional identity in the route).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

// Never leak whether an email exists (enumeration resistance).
export const GENERIC_LOGIN_ERROR = "Invalid email or password.";
