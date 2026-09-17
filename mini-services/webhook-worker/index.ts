// TrustScore Stage 12 — webhook-worker mini-service.
//
// Production-shape timer worker for webhook retries: every 60s it POSTs to
// the platform's internal /api/v1/internal/webhook-tick endpoint (Next.js on
// port 3000, same machine) with the internal token. The platform side stays
// bounded (≤5 due deliveries per tick); this worker only adds TIMING — the
// lazy on-read processor continues to work, so retries run even if this
// worker is down.
//
// Also serves a small HTTP surface on port 3031:
//   GET /health → { ok, port, uptimeSec, lastTickAt, lastResult, ticks, errors }
//
// Notes (honesty):
//  - single-instance sandbox posture; the token is a fixed shared constant;
//  - when the dev server is down (restarts, OOM recovery) the tick fails
//    quietly and is counted in `errors` — the worker keeps trying.

const PORT = 3031;
const TICK_MS = 60_000;
const APP_URL = "http://127.0.0.1:3000";
const TOKEN = "ts-internal-webhook-tick-v1";

const startedAt = Date.now();
let ticks = 0;
let errors = 0;
let lastTickAt: string | null = null;
let lastResult: string | null = null;

async function tick(): Promise<void> {
  ticks += 1;
  lastTickAt = new Date().toISOString();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${APP_URL}/api/v1/internal/webhook-tick`, {
      method: "POST",
      headers: { "x-internal-token": TOKEN },
      signal: controller.signal,
    });
    clearTimeout(timer);
    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      /* non-JSON body — status below is what matters */
    }
    if (res.ok) {
      lastResult = `ok (processed ${body.processed ?? 0})`;
    } else {
      errors += 1;
      lastResult = `http ${res.status}`;
    }
  } catch (err) {
    errors += 1;
    lastResult = `error: ${(err as Error).name === "AbortError" ? "timeout" : (err as Error).message}`;
  }
}

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/")) {
      return Response.json({
        ok: true,
        service: "webhook-worker",
        port: PORT,
        intervalMs: TICK_MS,
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
        ticks,
        errors,
        lastTickAt,
        lastResult,
      });
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`[webhook-worker] health on :${PORT}, ticking ${APP_URL} every ${TICK_MS / 1000}s`);

// First tick shortly after boot (lets the dev server settle), then interval.
setTimeout(() => {
  void tick();
}, 5_000);
setInterval(() => {
  void tick();
}, TICK_MS);
