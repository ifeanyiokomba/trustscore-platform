// TrustScore Stage 9 — WebhookService (B2B event delivery).
//
// Signed, bounded-retry webhook deliveries for API clients. Every delivery
// row stores the EXACT payload + the HMAC-SHA256 signature we sent, the
// endpoint's response code/snippet and the retry schedule — so the delivery
// log IS the integration audit trail.
//
// Signature scheme (Stripe-style, timestamped):
//   X-TrustScore-Signature: t=<unix>,v1=<hex>
//   v1 = HMAC-SHA256(webhookSecret, `${t}.${rawBody}`)
//   X-TrustScore-Event:    <event name>
// The secret is a shared secret by necessity (the platform signs, the
// business verifies) — generated server-side, shown ONCE, rotatable.
//
// Retries: attempts at +0s, +60s, +5m, +25m, +2h (5 total). Delivery is
// attempted synchronously (2.5s timeout) on the triggering request; due
// retries are processed lazily on portal reads and later API calls
// (processDueDeliveries) — honest for a single-instance deployment.
//
// Payload discipline (directive §38/§50): band-level assessment fields only
// — never a score number, never raw phone digits, never PII. A handle echo
// is the business's own request data; phone inputs stay masked hints.

import { db } from "@/lib/db";
import { randomBytes, createHmac } from "crypto";

export interface ShapedDelivery {
  id: string;
  event: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  statusCode: number | null;
  responseSnippet: string | null;
  signature: string | null;
  durationMs: number | null;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

const DELIVERY_TIMEOUT_MS = 2500;
const RETRY_SCHEDULE_SEC = [0, 60, 300, 1500, 7200]; // 5 attempts
export const WEBHOOK_MAX_ATTEMPTS = RETRY_SCHEDULE_SEC.length;
const DELIVERIES_RETAINED = 50;

export interface WebhookEventPayload {
  event: "TRUST_CHECK_COMPLETED" | "WEBHOOK_TEST";
  data: Record<string, unknown>;
}

function signPayload(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function webhookSignatureHeader(secret: string, body: string): string {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${signPayload(secret, t, body)}`;
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

// ---------------------------------------------------------------------------
// Deliveries
// ---------------------------------------------------------------------------

export interface DeliveryAttemptResult {
  status: "DELIVERED" | "RETRYING" | "EXHAUSTED";
  statusCode: number | null;
  responseSnippet: string | null;
  durationMs: number;
}

async function attemptHttpDelivery(
  url: string,
  secret: string,
  body: string,
  event: string
): Promise<DeliveryAttemptResult> {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrustScore-Webhooks/1.0",
        "X-TrustScore-Event": event,
        "X-TrustScore-Signature": webhookSignatureHeader(secret, body),
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = (await res.text()).slice(0, 200);
    return {
      status: res.ok ? "DELIVERED" : "RETRYING",
      statusCode: res.status,
      responseSnippet: text || null,
      durationMs: Date.now() - started,
    };
  } catch {
    return {
      status: "RETRYING",
      statusCode: null,
      responseSnippet: null,
      durationMs: Date.now() - started,
    };
  }
}

// enqueueDelivery — creates the row and performs attempt #1 synchronously.
// The triggering API response does NOT depend on delivery success (webhook
// reliability is the receiver's contract, not the check's contract).
export async function enqueueDelivery(
  client: { id: string; webhookUrl: string | null; webhookSecret: string | null },
  event: WebhookEventPayload["event"],
  data: Record<string, unknown>
): Promise<{ deliveryId: string | null; attempted: boolean }> {
  if (!client.webhookUrl || !client.webhookSecret) {
    return { deliveryId: null, attempted: false };
  }
  const body = JSON.stringify({
    id: `evt_${Date.now().toString(36)}${randomBytes(4).toString("hex")}`,
    event,
    created: new Date().toISOString(),
    data,
  });
  const row = await db.webhookDelivery.create({
    data: {
      clientId: client.id,
      event,
      payload: body,
      status: "PENDING",
    },
  });
  await attemptDelivery(row.id, client.webhookUrl, client.webhookSecret, body, event);
  await pruneDeliveries(client.id);
  return { deliveryId: row.id, attempted: true };
}

async function attemptDelivery(
  deliveryId: string,
  url: string,
  secret: string,
  body: string,
  event: string
): Promise<DeliveryAttemptResult> {
  const result = await attemptHttpDelivery(url, secret, body, event);
  const prior = await db.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: { attempts: true },
  });
  const attempts = (prior?.attempts ?? 0) + 1;
  // Schedule the next retry (or give up) — attempts run at the RETRY_SCHEDULE
  // offsets; after the last slot the delivery is EXHAUSTED (honest terminal).
  const exhausted = result.status !== "DELIVERED" && attempts >= RETRY_SCHEDULE_SEC.length;
  const nextWaitSec =
    result.status !== "DELIVERED" && !exhausted
      ? RETRY_SCHEDULE_SEC[Math.min(attempts, RETRY_SCHEDULE_SEC.length - 1)]
      : null;
  await db.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      attempts,
      statusCode: result.statusCode,
      responseSnippet: result.responseSnippet,
      signature: webhookSignatureHeader(secret, body),
      durationMs: result.durationMs,
      lastAttemptAt: new Date(),
      status: result.status === "DELIVERED" ? "DELIVERED" : exhausted ? "EXHAUSTED" : "RETRYING",
      deliveredAt: result.status === "DELIVERED" ? new Date() : null,
      nextRetryAt: nextWaitSec !== null ? new Date(Date.now() + nextWaitSec * 1000) : null,
    },
  });
  return { ...result, status: exhausted ? "EXHAUSTED" : result.status };
}

// processDueDeliveries — lazy retry worker. Called from portal reads and
// Trust Decision API calls (bounded: at most 5 due deliveries per call so a
// dead endpoint can't stall the request path). Tolerates dangling clientId
// rows (raw-SQL maintenance can bypass Prisma's client-side cascades) —
// such rows are skipped and left to pruning.
export async function processDueDeliveries(clientId?: string): Promise<number> {
  const due = await db.webhookDelivery.findMany({
    where: {
      status: "RETRYING",
      nextRetryAt: { lte: new Date() },
      ...(clientId ? { clientId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  let processed = 0;
  for (const d of due) {
    const client = await db.apiClient.findUnique({ where: { id: d.clientId } });
    if (!client?.webhookUrl || !client.webhookSecret) continue;
    await attemptDelivery(d.id, client.webhookUrl, client.webhookSecret, d.payload, d.event);
    processed += 1;
  }
  return processed;
}

async function pruneDeliveries(clientId: string): Promise<void> {
  const rows = await db.webhookDelivery.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    skip: DELIVERIES_RETAINED,
    select: { id: true },
  });
  if (rows.length > 0) {
    await db.webhookDelivery.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  }
}

// ---------------------------------------------------------------------------
// Read model
// ---------------------------------------------------------------------------

export function shapeDelivery(row: {
  id: string;
  event: string;
  payload: string;
  status: string;
  attempts: number;
  statusCode: number | null;
  responseSnippet: string | null;
  signature: string | null;
  durationMs: number | null;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
}): ShapedDelivery {
  return {
    id: row.id,
    event: row.event,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    status: row.status,
    attempts: row.attempts,
    statusCode: row.statusCode,
    responseSnippet: row.responseSnippet,
    signature: row.signature,
    durationMs: row.durationMs,
    lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
    nextRetryAt: row.nextRetryAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getRecentDeliveries(clientId: string, take = 10) {
  const rows = await db.webhookDelivery.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(shapeDelivery);
}
