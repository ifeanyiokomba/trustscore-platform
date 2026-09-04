import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

// --- Request IDs ---------------------------------------------------------
export function newRequestId(): string {
  return "req_" + randomUUID().replace(/-/g, "").slice(0, 20);
}

export function newIdempotencyKey(): string {
  return "idm_" + randomUUID().replace(/-/g, "").slice(0, 24);
}

// --- API keys ------------------------------------------------------------
export function generateApiKey(env: "live" | "sandbox" = "live"): {
  plain: string;
  prefix: string;
  hash: string;
} {
  const rand = randomUUID().replace(/-/g, "");
  const plain = `ts_${env}_${rand}`;
  const prefix = `ts_${env}_${rand.slice(0, 4)}********`;
  const hash = hashKey(plain);
  return { plain, prefix, hash };
}

export function hashKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

// --- Audit logging (never log raw PII; metadata only) -------------------
export async function audit(opts: {
  actor: string;
  action: string;
  subjectType?: string;
  subjectId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  redacted?: boolean;
}) {
  try {
    await db.auditLog.create({
      data: {
        actor: opts.actor,
        action: opts.action,
        subjectType: opts.subjectType ?? null,
        subjectId: opts.subjectId ?? null,
        requestId: opts.requestId ?? null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
        redacted: opts.redacted ?? true,
      },
    });
  } catch {
    // never let audit failure break a request
  }
}

// --- Reference codes -----------------------------------------------------
export function newFlagCode(): string {
  const n = Math.floor(1000 + Math.random() * 8999);
  return `TS-FLG-${n}`;
}

// --- Safe serialization helpers ----------------------------------------
export function safeJson(s: string | null | undefined): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// --- Rate limiting (in-memory token bucket, demo only) ------------------
const buckets = new Map<string, { tokens: number; ts: number }>();
const RATE_LIMIT = 60; // per window
const WINDOW_MS = 60_000;

export function rateLimit(key: string): { ok: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.ts > WINDOW_MS) {
    buckets.set(key, { tokens: RATE_LIMIT - 1, ts: now });
    return { ok: true, remaining: RATE_LIMIT - 1, reset: WINDOW_MS };
  }
  if (b.tokens <= 0) {
    return { ok: false, remaining: 0, reset: WINDOW_MS - (now - b.ts) };
  }
  b.tokens -= 1;
  return { ok: true, remaining: b.tokens, reset: WINDOW_MS - (now - b.ts) };
}
