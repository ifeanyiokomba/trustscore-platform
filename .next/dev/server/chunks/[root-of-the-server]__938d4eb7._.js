module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/src/lib/platform/http.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GENERIC_LOGIN_ERROR",
    ()=>GENERIC_LOGIN_ERROR,
    "clientIp",
    ()=>clientIp,
    "clientKey",
    ()=>clientKey,
    "failureLimitExhausted",
    ()=>failureLimitExhausted,
    "jsonError",
    ()=>jsonError,
    "jsonOk",
    ()=>jsonOk,
    "newRequestId",
    ()=>newRequestId,
    "rateLimit",
    ()=>rateLimit,
    "recordFailure",
    ()=>recordFailure
]);
// TrustScore Stage 1 — platform HTTP utilities.
// Uniform error envelope, request IDs, and an in-memory rate limiter.
// (Local memory caching only, per platform constraints — Redis arrives with the
// production FastAPI backend; the interface is designed to swap cleanly.)
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
function newRequestId() {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])();
}
function jsonError(status, code, message, requestId) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: {
            code,
            message,
            requestId
        }
    }, {
        status
    });
}
function jsonOk(body, status = 200) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(body, {
        status
    });
}
const globalForRate = globalThis;
const rateStore = globalForRate.__tsRateLimiter ?? new Map();
globalForRate.__tsRateLimiter = rateStore;
function rateLimit(key, limit, windowMs) {
    const now = Date.now();
    const win = rateStore.get(key);
    if (!win || win.resetAt <= now) {
        rateStore.set(key, {
            count: 1,
            resetAt: now + windowMs
        });
        return {
            allowed: true,
            remaining: limit - 1,
            retryAfterSec: 0
        };
    }
    if (win.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSec: Math.ceil((win.resetAt - now) / 1000)
        };
    }
    win.count += 1;
    return {
        allowed: true,
        remaining: limit - win.count,
        retryAfterSec: 0
    };
}
const GENERIC_LOGIN_ERROR = "Invalid email or password.";
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
function trustedProxyHops() {
    const parsed = Number.parseInt(process.env.TS_TRUSTED_PROXY_HOPS ?? "1", 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.min(parsed, 5);
}
function clientIp(req) {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
        const hops = xff.split(",").map((h)=>h.trim()).filter(Boolean);
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
function clientKey(req, scope) {
    return `${scope}:${clientIp(req)}`;
}
const globalForFailures = globalThis;
const failureStore = globalForFailures.__tsFailureLimiter ?? new Map();
globalForFailures.__tsFailureLimiter = failureStore;
function failureLimitExhausted(key, limit, windowMs) {
    const now = Date.now();
    const win = failureStore.get(key);
    if (!win || win.resetAt <= now) return {
        blocked: false,
        retryAfterSec: 0
    };
    if (win.count >= limit) {
        return {
            blocked: true,
            retryAfterSec: Math.ceil((win.resetAt - now) / 1000)
        };
    }
    return {
        blocked: false,
        retryAfterSec: 0
    };
}
function recordFailure(key, windowMs) {
    const now = Date.now();
    const win = failureStore.get(key);
    if (!win || win.resetAt <= now) {
        failureStore.set(key, {
            count: 1,
            resetAt: now + windowMs
        });
        return;
    }
    win.count += 1;
}
}),
"[project]/src/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "db",
    ()=>db
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
const db = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
    log: [
        'error'
    ]
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = db;
}),
"[project]/src/lib/services/webhook-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WEBHOOK_MAX_ATTEMPTS",
    ()=>WEBHOOK_MAX_ATTEMPTS,
    "enqueueDelivery",
    ()=>enqueueDelivery,
    "generateWebhookSecret",
    ()=>generateWebhookSecret,
    "getRecentDeliveries",
    ()=>getRecentDeliveries,
    "processDueDeliveries",
    ()=>processDueDeliveries,
    "shapeDelivery",
    ()=>shapeDelivery,
    "webhookSignatureHeader",
    ()=>webhookSignatureHeader
]);
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
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
const DELIVERY_TIMEOUT_MS = 2500;
const RETRY_SCHEDULE_SEC = [
    0,
    60,
    300,
    1500,
    7200
]; // 5 attempts
const WEBHOOK_MAX_ATTEMPTS = RETRY_SCHEDULE_SEC.length;
const DELIVERIES_RETAINED = 50;
function signPayload(secret, timestamp, body) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}
function webhookSignatureHeader(secret, body) {
    const t = Math.floor(Date.now() / 1000);
    return `t=${t},v1=${signPayload(secret, t, body)}`;
}
function generateWebhookSecret() {
    return `whsec_${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(24).toString("hex")}`;
}
async function attemptHttpDelivery(url, secret, body, event) {
    const started = Date.now();
    try {
        const controller = new AbortController();
        const timer = setTimeout(()=>controller.abort(), DELIVERY_TIMEOUT_MS);
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "TrustScore-Webhooks/1.0",
                "X-TrustScore-Event": event,
                "X-TrustScore-Signature": webhookSignatureHeader(secret, body)
            },
            body,
            signal: controller.signal
        });
        clearTimeout(timer);
        const text = (await res.text()).slice(0, 200);
        return {
            status: res.ok ? "DELIVERED" : "RETRYING",
            statusCode: res.status,
            responseSnippet: text || null,
            durationMs: Date.now() - started
        };
    } catch  {
        return {
            status: "RETRYING",
            statusCode: null,
            responseSnippet: null,
            durationMs: Date.now() - started
        };
    }
}
async function enqueueDelivery(client, event, data) {
    if (!client.webhookUrl || !client.webhookSecret) {
        return {
            deliveryId: null,
            attempted: false
        };
    }
    const body = JSON.stringify({
        id: `evt_${Date.now().toString(36)}${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(4).toString("hex")}`,
        event,
        created: new Date().toISOString(),
        data
    });
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].webhookDelivery.create({
        data: {
            clientId: client.id,
            event,
            payload: body,
            status: "PENDING"
        }
    });
    await attemptDelivery(row.id, client.webhookUrl, client.webhookSecret, body, event);
    await pruneDeliveries(client.id);
    return {
        deliveryId: row.id,
        attempted: true
    };
}
async function attemptDelivery(deliveryId, url, secret, body, event) {
    const result = await attemptHttpDelivery(url, secret, body, event);
    const prior = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].webhookDelivery.findUnique({
        where: {
            id: deliveryId
        },
        select: {
            attempts: true
        }
    });
    const attempts = (prior?.attempts ?? 0) + 1;
    // Schedule the next retry (or give up) — attempts run at the RETRY_SCHEDULE
    // offsets; after the last slot the delivery is EXHAUSTED (honest terminal).
    const exhausted = result.status !== "DELIVERED" && attempts >= RETRY_SCHEDULE_SEC.length;
    const nextWaitSec = result.status !== "DELIVERED" && !exhausted ? RETRY_SCHEDULE_SEC[Math.min(attempts, RETRY_SCHEDULE_SEC.length - 1)] : null;
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].webhookDelivery.update({
        where: {
            id: deliveryId
        },
        data: {
            attempts,
            statusCode: result.statusCode,
            responseSnippet: result.responseSnippet,
            signature: webhookSignatureHeader(secret, body),
            durationMs: result.durationMs,
            lastAttemptAt: new Date(),
            status: result.status === "DELIVERED" ? "DELIVERED" : exhausted ? "EXHAUSTED" : "RETRYING",
            deliveredAt: result.status === "DELIVERED" ? new Date() : null,
            nextRetryAt: nextWaitSec !== null ? new Date(Date.now() + nextWaitSec * 1000) : null
        }
    });
    return {
        ...result,
        status: exhausted ? "EXHAUSTED" : result.status
    };
}
async function processDueDeliveries(clientId) {
    const due = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].webhookDelivery.findMany({
        where: {
            status: "RETRYING",
            nextRetryAt: {
                lte: new Date()
            },
            ...clientId ? {
                clientId
            } : {}
        },
        orderBy: {
            createdAt: "asc"
        },
        take: 5
    });
    let processed = 0;
    for (const d of due){
        const client = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.findUnique({
            where: {
                id: d.clientId
            }
        });
        if (!client?.webhookUrl || !client.webhookSecret) continue;
        await attemptDelivery(d.id, client.webhookUrl, client.webhookSecret, d.payload, d.event);
        processed += 1;
    }
    return processed;
}
async function pruneDeliveries(clientId) {
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].webhookDelivery.findMany({
        where: {
            clientId
        },
        orderBy: {
            createdAt: "desc"
        },
        skip: DELIVERIES_RETAINED,
        select: {
            id: true
        }
    });
    if (rows.length > 0) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].webhookDelivery.deleteMany({
            where: {
                id: {
                    in: rows.map((r)=>r.id)
                }
            }
        });
    }
}
function shapeDelivery(row) {
    return {
        id: row.id,
        event: row.event,
        payload: JSON.parse(row.payload),
        status: row.status,
        attempts: row.attempts,
        statusCode: row.statusCode,
        responseSnippet: row.responseSnippet,
        signature: row.signature,
        durationMs: row.durationMs,
        lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
        nextRetryAt: row.nextRetryAt?.toISOString() ?? null,
        deliveredAt: row.deliveredAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString()
    };
}
async function getRecentDeliveries(clientId, take = 10) {
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].webhookDelivery.findMany({
        where: {
            clientId
        },
        orderBy: {
            createdAt: "desc"
        },
        take
    });
    return rows.map(shapeDelivery);
}
}),
"[project]/src/lib/providers/transport.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LOOPBACK_BASE_URL",
    ()=>LOOPBACK_BASE_URL,
    "PROVIDER_KEYS",
    ()=>PROVIDER_KEYS,
    "ProviderTransportError",
    ()=>ProviderTransportError,
    "TRANSPORT_CONSTANTS",
    ()=>TRANSPORT_CONSTANTS,
    "TRANSPORT_HMAC_KEY",
    ()=>TRANSPORT_HMAC_KEY,
    "circuitEpisodeStart",
    ()=>circuitEpisodeStart,
    "drainCircuitTransitions",
    ()=>drainCircuitTransitions,
    "effectiveCircuitState",
    ()=>effectiveCircuitState,
    "providerCall",
    ()=>providerCall,
    "providerGet",
    ()=>providerGet,
    "providerTransportStatus",
    ()=>providerTransportStatus,
    "resetProviderTransport",
    ()=>resetProviderTransport,
    "signTransportPayload",
    ()=>signTransportPayload
]);
// TrustScore Stage 13 — Provider transport layer (LIVE-ready).
//
// The single wire boundary every provider call crosses when the platform is
// NOT in MOCK posture (audit §4.2 "swap only the transport"):
//   - HMAC-SHA256 request signing (x-ts-signature: t=…,v1=…) — shared-key
//     authenticity between platform and provider, same shape as the webhook
//     signature contract.
//   - Bounded timeouts (AbortController) + idempotency keys.
//   - Retries ONLY on 5xx/network errors (never on 4xx — those are the
//     provider's answer, not a fault), exponential backoff, max 2 retries.
//   - A circuit breaker per provider: 3 consecutive transport failures →
//     OPEN for 20s (fail fast, honest 503s upstream) → HALF_OPEN probe →
//     CLOSED. In-memory, single-instance posture (documented).
//   - Latency/error metrics per provider (p50/p95 over the last 100 calls,
//     error counts, last error) — surfaced in the admin provider console.
//
// Stage 14: every circuit state TRANSITION is also pushed onto an in-memory
// queue (drainCircuitTransitions) so the observability tick can persist the
// transition log + evaluate sustained-open alerts. The hot path only pushes
// a small object — no I/O in the request path.
//
// Honest-error discipline: every failure is a typed ProviderTransportError
// with a machine code. Callers translate these into honest 503s — never a
// silent fallback to a different provider's answer.
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
const PROVIDER_KEYS = [
    "ninauth",
    "phone",
    "liveness"
];
const TRANSPORT_HMAC_KEY = process.env.TRANSPORT_HMAC_KEY ?? "ts_backend_only_transport_hmac_key";
const LOOPBACK_BASE_URL = process.env.LOOPBACK_BASE_URL ?? "http://127.0.0.1:3032";
const REQUEST_TIMEOUT_MS = 4_000;
const RETRY_BACKOFF_MS = [
    150,
    600
];
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 20_000;
const METRICS_SAMPLES = 100;
class ProviderTransportError extends Error {
    code;
    provider;
    detail;
    status;
    constructor(code, provider, detail, status){
        super(`${code}:${provider}:${detail}`), this.code = code, this.provider = provider, this.detail = detail, this.status = status;
        this.name = "ProviderTransportError";
    }
}
const g = globalThis;
const breakers = g.__tsProviderBreakers ?? new Map();
const metrics = g.__tsProviderMetrics ?? new Map();
const transitions = g.__tsCircuitTransitions ?? [];
g.__tsProviderBreakers = breakers;
g.__tsProviderMetrics = metrics;
g.__tsCircuitTransitions = transitions;
function pushTransition(provider, fromState, toState, reason) {
    if (fromState === toState) return;
    transitions.push({
        provider,
        fromState,
        toState,
        reason,
        at: Date.now()
    });
    // Bounded queue — the tick drains it every 60s; a fault-injection storm
    // must never grow this unbounded.
    if (transitions.length > 500) transitions.splice(0, transitions.length - 500);
}
function drainCircuitTransitions() {
    return transitions.splice(0, transitions.length);
}
function breakerFor(key) {
    let b = breakers.get(key);
    if (!b) {
        b = {
            state: "CLOSED",
            consecutiveFailures: 0,
            openedAt: null,
            lastProbeAt: null,
            firstTripAt: null
        };
        breakers.set(key, b);
    }
    return b;
}
function metricsFor(key) {
    let m = metrics.get(key);
    if (!m) {
        m = {
            calls: 0,
            errors: 0,
            samples: [],
            lastError: null,
            lastErrorAt: null,
            lastOkAt: null,
            lastLatencyMs: null
        };
        metrics.set(key, m);
    }
    return m;
}
function percentile(sorted, p) {
    if (!sorted.length) return null;
    const idx = Math.min(sorted.length - 1, Math.floor(p / 100 * sorted.length));
    return sorted[idx];
}
function effectiveCircuitState(key) {
    const b = breakerFor(key);
    if (b.state === "OPEN" && b.openedAt !== null) {
        if (Date.now() - b.openedAt >= CIRCUIT_OPEN_MS) return "HALF_OPEN";
    }
    return b.state;
}
function recordSuccess(key, latencyMs) {
    const b = breakerFor(key);
    const m = metricsFor(key);
    m.calls += 1;
    m.samples.push(latencyMs);
    if (m.samples.length > METRICS_SAMPLES) m.samples.shift();
    m.lastOkAt = Date.now();
    m.lastLatencyMs = latencyMs;
    // Success closes the circuit (also settles a HALF_OPEN probe).
    if (b.state !== "CLOSED") {
        pushTransition(key, b.state, "CLOSED", "SUCCESS");
    }
    b.state = "CLOSED";
    b.consecutiveFailures = 0;
    b.openedAt = null;
    b.firstTripAt = null;
}
function recordFailure(key, code, detail) {
    const b = breakerFor(key);
    const m = metricsFor(key);
    m.calls += 1;
    m.errors += 1;
    m.lastError = `${code} — ${detail}`;
    m.lastErrorAt = Date.now();
    b.consecutiveFailures += 1;
    if (b.state === "HALF_OPEN" || b.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
        const from = b.state;
        // A HALF_OPEN re-trip belongs to the SAME episode as the trip that
        // opened it — "sustained open" is measured from the first trip.
        const continuing = from === "OPEN" || from === "HALF_OPEN" && b.firstTripAt !== null;
        b.state = "OPEN";
        b.openedAt = Date.now();
        if (!continuing) b.firstTripAt = Date.now();
        pushTransition(key, from, "OPEN", code);
    }
}
function allowCall(key) {
    const state = effectiveCircuitState(key);
    if (state === "CLOSED") return true;
    if (state === "OPEN") return false;
    // HALF_OPEN: allow a single probe (per call — single-instance simplicity).
    const b = breakerFor(key);
    b.lastProbeAt = Date.now();
    return true;
}
function resetProviderTransport(key) {
    const b = breakerFor(key);
    if (b.state !== "CLOSED") {
        pushTransition(key, b.state, "CLOSED", "RESET");
    }
    breakers.set(key, {
        state: "CLOSED",
        consecutiveFailures: 0,
        openedAt: null,
        lastProbeAt: null,
        firstTripAt: null
    });
    metrics.set(key, {
        calls: 0,
        errors: 0,
        samples: [],
        lastError: null,
        lastErrorAt: null,
        lastOkAt: null,
        lastLatencyMs: null
    });
}
function providerTransportStatus(key) {
    const b = breakerFor(key);
    const m = metricsFor(key);
    const sorted = [
        ...m.samples
    ].sort((a, z)=>a - z);
    const state = effectiveCircuitState(key);
    return {
        circuit: state,
        circuitSince: state === b.state ? b.openedAt : Date.now(),
        consecutiveFailures: b.consecutiveFailures,
        calls: m.calls,
        errors: m.errors,
        errorRate: m.calls > 0 ? Math.round(m.errors / m.calls * 100) : 0,
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        lastLatencyMs: m.lastLatencyMs,
        lastError: m.lastError,
        lastErrorAt: m.lastErrorAt ? new Date(m.lastErrorAt).toISOString() : null,
        lastOkAt: m.lastOkAt ? new Date(m.lastOkAt).toISOString() : null,
        /** Stage 14 — episode start (first trip of the current non-CLOSED run). */ firstTripAt: b.firstTripAt
    };
}
function signTransportPayload(body, timestampMs) {
    const signed = `${timestampMs}.${body}`;
    const v1 = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])("sha256", TRANSPORT_HMAC_KEY).update(signed).digest("hex");
    return `t=${timestampMs},v1=${v1}`;
}
async function singleAttempt(key, path, body, timeoutMs) {
    const ts = Date.now();
    const headers = {
        "Content-Type": "application/json",
        "x-ts-signature": signTransportPayload(body, ts),
        "x-ts-provider": key,
        "x-ts-idempotency-key": (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])()
    };
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${LOOPBACK_BASE_URL}${path}`, {
            method: "POST",
            headers,
            body,
            signal: controller.signal,
            cache: "no-store"
        });
        const text = await res.text();
        return {
            status: res.status,
            text
        };
    } finally{
        clearTimeout(timer);
    }
}
async function providerCall(key, path, payload, opts) {
    if (!allowCall(key)) {
        throw new ProviderTransportError("CIRCUIT_OPEN", key, `circuit open — failing fast after ${CIRCUIT_FAILURE_THRESHOLD} consecutive failures`);
    }
    const body = JSON.stringify(payload);
    const timeoutMs = opts?.timeoutMs ?? REQUEST_TIMEOUT_MS;
    const startedAt = Date.now();
    let attempts = 0;
    let lastCode = "NETWORK_ERROR";
    let lastDetail = "no attempt completed";
    for(let i = 0; i <= RETRY_BACKOFF_MS.length; i++){
        attempts += 1;
        try {
            const { status, text } = await singleAttempt(key, path, body, timeoutMs);
            if (status >= 200 && status < 300) {
                let data;
                try {
                    data = JSON.parse(text);
                } catch  {
                    throw new ProviderTransportError("PROVIDER_HTTP_ERROR", key, `provider returned non-JSON body (status ${status})`);
                }
                const latencyMs = Date.now() - startedAt;
                recordSuccess(key, latencyMs);
                return {
                    data,
                    latencyMs,
                    attempts
                };
            }
            if (status === 401 || status === 403) {
                // The provider rejected our signature/credentials — an ANSWER, not a
                // fault. Do not retry; surface honestly.
                recordFailure(key, "AUTH_REJECTED", `status ${status}`);
                throw new ProviderTransportError("AUTH_REJECTED", key, `provider rejected the signed request (status ${status})`, status);
            }
            if (status >= 400 && status < 500) {
                // Other 4xx: the provider's answer — returned, not retried.
                const latencyMs = Date.now() - startedAt;
                recordSuccess(key, latencyMs); // transport worked; the contract answered
                let detail = text.slice(0, 200);
                try {
                    const parsed = JSON.parse(text);
                    detail = parsed.error?.message ?? parsed.error?.code ?? detail;
                } catch  {
                /* keep raw text */ }
                throw new ProviderTransportError("PROVIDER_HTTP_ERROR", key, detail, status);
            }
            // 5xx — retryable transport fault.
            lastCode = "PROVIDER_HTTP_ERROR";
            lastDetail = `status ${status}`;
        } catch (err) {
            if (err instanceof ProviderTransportError) throw err;
            if (err instanceof Error && err.name === "AbortError") {
                lastCode = "TIMEOUT";
                lastDetail = `no response within ${timeoutMs}ms`;
            } else {
                lastCode = "NETWORK_ERROR";
                lastDetail = err instanceof Error ? err.message : "network fault";
            }
        }
        if (i < RETRY_BACKOFF_MS.length) {
            await new Promise((r)=>setTimeout(r, RETRY_BACKOFF_MS[i]));
        }
    }
    recordFailure(key, lastCode, lastDetail);
    throw new ProviderTransportError(lastCode === "PROVIDER_HTTP_ERROR" ? "RETRIES_EXHAUSTED" : lastCode, key, `${lastDetail} (after ${attempts} attempts)`);
}
async function providerGet(key, path, opts) {
    if (!allowCall(key)) {
        throw new ProviderTransportError("CIRCUIT_OPEN", key, "circuit open — failing fast");
    }
    const ts = Date.now();
    const sig = signTransportPayload(`GET ${path}`, ts);
    const controller = new AbortController();
    const timeoutMs = opts?.timeoutMs ?? REQUEST_TIMEOUT_MS;
    const timer = setTimeout(()=>controller.abort(), timeoutMs);
    const startedAt = Date.now();
    try {
        const res = await fetch(`${LOOPBACK_BASE_URL}${path}`, {
            method: "GET",
            headers: {
                "x-ts-signature": sig,
                "x-ts-provider": key
            },
            signal: controller.signal,
            cache: "no-store"
        });
        const text = await res.text();
        if (res.status === 401 || res.status === 403) {
            recordFailure(key, "AUTH_REJECTED", `status ${res.status}`);
            throw new ProviderTransportError("AUTH_REJECTED", key, `rejected (status ${res.status})`, res.status);
        }
        if (res.status === 200) {
            const latencyMs = Date.now() - startedAt;
            recordSuccess(key, latencyMs);
            return {
                data: JSON.parse(text),
                latencyMs,
                attempts: 1
            };
        }
        const latencyMs = Date.now() - startedAt;
        recordSuccess(key, latencyMs);
        throw new ProviderTransportError("PROVIDER_HTTP_ERROR", key, `status ${res.status}`, res.status);
    } catch (err) {
        if (err instanceof ProviderTransportError) throw err;
        const isAbort = err instanceof Error && err.name === "AbortError";
        const code = isAbort ? "TIMEOUT" : "NETWORK_ERROR";
        const detail = isAbort ? `no response within ${timeoutMs}ms` : String(err);
        recordFailure(key, code, detail);
        throw new ProviderTransportError(code, key, detail);
    } finally{
        clearTimeout(timer);
    }
}
const TRANSPORT_CONSTANTS = {
    REQUEST_TIMEOUT_MS,
    RETRY_BACKOFF_MS: [
        ...RETRY_BACKOFF_MS
    ],
    CIRCUIT_FAILURE_THRESHOLD,
    CIRCUIT_OPEN_MS,
    METRICS_SAMPLES
};
function circuitEpisodeStart(key) {
    const b = breakerFor(key);
    if (b.state === "CLOSED") return null;
    return b.firstTripAt ?? b.openedAt;
}
}),
"[project]/src/lib/platform/boot-guard.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// TrustScore sec-batch-A — boot-time secret posture guard.
//
// Every security-critical secret that historically fell back to a hardcoded
// dev constant now routes through `guardedSecret()`. The guard:
//
//   - DEV: falls back to the dev constant AND logs ONE loud warning naming
//     every defaulted secret (honest posture, visible in dev.log). The dev
//     constants themselves are safe to expose only because the sandbox runs
//     MOCK providers with no real person data — production is different.
//
//   - PRODUCTION: REFUSES TO OPERATE. `assertSecretsAtBoot()` throws at first
//     module load (middleware + every provider import), failing requests with
//     a 500 rather than silently protecting identity fingerprints with a
//     constant that lives in the public repo's history. A value fails the
//     check when it is missing, equal to its dev default, equal to a known
//     `.env.example` placeholder, or shorter than 16 characters.
//
// Why this matters (external review, sec-batch-A): SIGNAL_PEPPER turns raw
// phone numbers and NIN references into the peppered fingerprints the whole
// privacy pitch rests on; a silent default fallback makes every fingerprint
// reversible by anyone who has read the source. VAULT_MASTER_KEY guards every
// provider credential at rest. Same class for the NINAuth/loopback signing
// secrets. `vaultUsesDefaultKey` and friends now read from this module, so
// the "honesty signal" is enforced, not just displayed.
__turbopack_context__.s([
    "SECRET_SPECS",
    ()=>SECRET_SPECS,
    "anyDefaultSecrets",
    ()=>anyDefaultSecrets,
    "assertSecretsAtBoot",
    ()=>assertSecretsAtBoot,
    "guardedSecret",
    ()=>guardedSecret,
    "secretIsDefault",
    ()=>secretIsDefault,
    "secretPosture",
    ()=>secretPosture
]);
const SECRET_SPECS = [
    {
        env: "VAULT_MASTER_KEY",
        devDefault: "ts_dev_only_vault_master_key",
        label: "AES-256-GCM master key for the provider credential vault"
    },
    {
        env: "SIGNAL_PEPPER",
        devDefault: "ts_backend_only_signal_pepper",
        label: "pepper for identifier fingerprints (phone / NIN references)"
    },
    {
        env: "NINAUTH_CLIENT_SECRET",
        devDefault: "ts_backend_only_mock_partner_secret",
        label: "NINAuth partner client secret (mock ID-token signing in sandbox)"
    },
    {
        env: "LOOPBACK_SIGNING_SECRET",
        devDefault: "ts_backend_only_loopback_signing_secret",
        label: "loopback provider-simulator ID-token signing secret"
    }
];
// Values that must never reach production: dev defaults above plus the
// placeholder strings shipped in .env.example (someone copying the example
// file without editing it is exactly the "one forgotten env var" failure).
const WEAK_VALUES = new Set([
    ...SECRET_SPECS.map((s)=>s.devDefault),
    "dev-only-pepper-change-me",
    "loopback-dev-secret",
    "dev-transport-hmac-key",
    "dev-webhook-secret",
    "change-me",
    "changeme",
    "secret",
    "password"
]);
const MIN_PRODUCTION_LENGTH = 16;
const specByEnv = new Map(SECRET_SPECS.map((s)=>[
        s.env,
        s
    ]));
function evaluate(spec) {
    const value = process.env[spec.env];
    const set = value !== undefined && value !== "";
    return {
        env: spec.env,
        label: spec.label,
        set,
        isDefault: !set,
        weak: !set || value.length < MIN_PRODUCTION_LENGTH || WEAK_VALUES.has(value)
    };
}
function secretPosture() {
    return SECRET_SPECS.map(evaluate);
}
function anyDefaultSecrets() {
    return SECRET_SPECS.some((spec)=>!process.env[spec.env]);
}
function secretIsDefault(env) {
    const spec = specByEnv.get(env);
    if (!spec) return false;
    return !process.env[env];
}
const isStrict = ()=>("TURBOPACK compile-time value", "development") === "production" || process.env.TS_BOOT_GUARD_STRICT === "1";
let asserted = false;
function assertSecretsAtBoot() {
    if (asserted) return;
    asserted = true;
    const strict = isStrict();
    const bad = SECRET_SPECS.map(evaluate).filter((p)=>p.weak);
    if (strict && bad.length > 0) {
        throw new Error([
            "[boot-guard] REFUSING TO START: security-critical secrets are unset/weak in a production boot:",
            ...bad.map((p)=>`  - ${p.env} (${p.label}) — set a strong value (≥${MIN_PRODUCTION_LENGTH} chars, not a dev default or .env.example placeholder)`),
            "The identity layer (peppered fingerprints, credential vault, token signing) must never run on public dev constants."
        ].join("\n"));
    }
    if (bad.length > 0) {
        // Dev honesty: visible in dev.log on every cold start.
        console.warn([
            "[boot-guard] DEV POSTURE — security secrets running on public dev constants (fine for MOCK sandbox, fatal in production):",
            ...bad.map((p)=>`  - ${p.env}: ${p.label}`)
        ].join("\n"));
    } else {
        console.info("[boot-guard] all guarded secrets configured (no dev defaults in use).");
    }
}
function guardedSecret(env) {
    assertSecretsAtBoot();
    const spec = specByEnv.get(env);
    if (!spec) {
        throw new Error(`[boot-guard] guardedSecret("${env}") is not a registered secret spec`);
    }
    return process.env[env] ?? spec.devDefault;
}
}),
"[project]/src/lib/providers/credential-vault.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "decryptSecret",
    ()=>decryptSecret,
    "encryptSecret",
    ()=>encryptSecret,
    "listCredentials",
    ()=>listCredentials,
    "maskSecret",
    ()=>maskSecret,
    "resolveCredential",
    ()=>resolveCredential,
    "revokeCredential",
    ()=>revokeCredential,
    "saveCredential",
    ()=>saveCredential,
    "vaultUsesDefaultKey",
    ()=>vaultUsesDefaultKey
]);
// TrustScore Stage 13 — Provider credential vault (AES-256-GCM at rest).
//
// Holds LIVE-posture provider credentials (client secrets / signing keys)
// encrypted under a platform master key (env VAULT_MASTER_KEY — 32-byte hex
// or any string, hashed to a 32-byte key). The sandbox falls back to a
// dev-only master constant and SAYS SO (vaultDefaultKey flag) — production
// must set the env var.
//
// Discipline:
//   - The plaintext secret is written ONCE by an admin, stored only as an
//     authenticated ciphertext blob, and NEVER returned by any read API —
//     reads surface a masked hint (first 2 + last 4 chars).
//   - One ACTIVE credential per provider; saving a new one retires the old.
//   - Revocation is immediate (resolveCredential returns null thereafter).
//   - lastUsedAt is touched only when the LIVE transport actually uses it.
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/boot-guard.ts [app-route] (ecmascript)");
;
;
;
// sec-batch-A: guarded read — production REFUSES to boot on the dev default
// (boot-guard.ts); the vaultUsesDefaultKey flag below now feeds the admin
// security-posture endpoint instead of being an honesty signal wired to
// nothing.
const MASTER_KEY_INPUT = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["guardedSecret"])("VAULT_MASTER_KEY");
const vaultUsesDefaultKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["secretIsDefault"])("VAULT_MASTER_KEY");
function masterKey() {
    // Any input → 32-byte AES key via SHA-256 (env value may be hex or a phrase).
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(MASTER_KEY_INPUT).digest();
}
function encryptSecret(plaintext) {
    const iv = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(12);
    const cipher = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createCipheriv"])("aes-256-gcm", masterKey(), iv);
    const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    return [
        "v1",
        iv.toString("base64url"),
        tag.toString("base64url"),
        ciphertext.toString("base64url")
    ].join(".");
}
function decryptSecret(blob) {
    const parts = blob.split(".");
    if (parts.length !== 4 || parts[0] !== "v1") {
        throw new Error("bad_blob_format");
    }
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const ciphertext = Buffer.from(parts[3], "base64url");
    const decipher = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createDecipheriv"])("aes-256-gcm", masterKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]).toString("utf8");
}
function maskSecret(secret) {
    if (secret.length <= 8) return "•".repeat(secret.length);
    return `${secret.slice(0, 2)}${"•".repeat(Math.min(12, secret.length - 6))}${secret.slice(-4)}`;
}
async function saveCredential(input) {
    // Retire any current ACTIVE credential for this provider (single-active).
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].providerCredential.updateMany({
        where: {
            provider: input.provider,
            status: "ACTIVE"
        },
        data: {
            status: "RETIRED",
            retiredAt: new Date()
        }
    });
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].providerCredential.create({
        data: {
            provider: input.provider,
            keyId: input.keyId,
            secretCipher: encryptSecret(input.secret),
            hint: maskSecret(input.secret),
            note: input.note ?? null,
            createdBy: input.createdBy
        }
    });
    return toInfo(row);
}
async function revokeCredential(provider) {
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].providerCredential.updateMany({
        where: {
            provider,
            status: "ACTIVE"
        },
        data: {
            status: "RETIRED",
            retiredAt: new Date()
        }
    });
    return res.count > 0;
}
async function listCredentials() {
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].providerCredential.findMany({
        orderBy: {
            createdAt: "desc"
        },
        take: 50
    });
    return rows.map(toInfo);
}
async function resolveCredential(provider) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].providerCredential.findFirst({
        where: {
            provider,
            status: "ACTIVE"
        },
        orderBy: {
            createdAt: "desc"
        }
    });
    if (!row) return null;
    try {
        const secret = decryptSecret(row.secretCipher);
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].providerCredential.update({
            where: {
                id: row.id
            },
            data: {
                lastUsedAt: new Date()
            }
        });
        return {
            keyId: row.keyId,
            secret
        };
    } catch  {
        // Blob is unreadable (master key rotated without re-encryption) — treat
        // as absent and say so honestly upstream.
        return null;
    }
}
function toInfo(row) {
    return {
        id: row.id,
        provider: row.provider,
        keyId: row.keyId,
        hint: row.hint,
        status: row.status,
        note: row.note,
        lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        retiredAt: row.retiredAt?.toISOString() ?? null
    };
}
}),
"[project]/src/lib/providers/scope-mapping.config.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// TrustScore Batch 1 — Externalized capability→scope mapping (G5 / PROVIDER_AUDIT PV2).
//
// Directive §11: the capability→production-scope mapping must be CONFIG, not
// code. Until the NINAuth partner contract publishes a scope vocabulary, every
// scope string in this platform is mock-contract-only (NINAUTH_CONTRACT_MATRIX
// row "scopes": UNCONFIRMED — zero scope names published in any official
// source). This file is the single place where that mapping lives:
//
//   TrustScore capability (canonical, stable)
//     → consent UX copy (label + description)
//     → attribute keys (the profile claims it may unlock)
//     → MOCK scope string (what MOCK/LOOPBACK postures use today)
//     → LIVE scope string (null = UNCONFIRMED until the partner publishes)
//     → official pii-fields paths (the documented `dataRequested[]` catalog —
//        what a LIVE enterprise-verification call would request instead)
//
// The LIVE posture gate (provider-posture.ts) refuses to flip until every
// capability carries a non-null liveScope — the mapping is ENFORCED, not
// aspirational. When partner credentials arrive, filling in the liveScope
// column + confirming the piiFieldPaths is the entire scope-side change; no
// runtime logic changes.
//
// Sources (fetched 2026-09-17, docs/research/NINAUTH_RESEARCH.md §5.1/§5.2):
//   - "No scope strings/names are published anywhere in the fetched sources."
//   - pii-fields catalog: GET /api/v1/integration/enterprise/pii-fields —
//     50+ paths incl. `biographicData.firstName`, `contactData.phone1`, …
//     (and `nin` — which TrustScore NEVER requests; the scope-guard tripwire
//     stays mandatory for exactly that reason).
__turbopack_context__.s([
    "CAPABILITIES",
    ()=>CAPABILITIES,
    "CORE_CAPABILITIES",
    ()=>CORE_CAPABILITIES,
    "OPTIONAL_CAPABILITIES",
    ()=>OPTIONAL_CAPABILITIES,
    "SCOPE_MAPPING_CONFIG_VERSION",
    ()=>SCOPE_MAPPING_CONFIG_VERSION,
    "assertLiveScopeConfigComplete",
    ()=>assertLiveScopeConfigComplete,
    "capabilityForScope",
    ()=>capabilityForScope,
    "liveScopeGaps",
    ()=>liveScopeGaps,
    "scopeCatalogForPosture",
    ()=>scopeCatalogForPosture
]);
const SCOPE_MAPPING_CONFIG_VERSION = "scope-mapping-2026.09-batch1";
const CAPABILITIES = [
    {
        capability: "identity.basic",
        label: "Basic identity",
        description: "Verification status and masked identity reference only",
        core: true,
        attributeKeys: [],
        mockScope: "identity.basic",
        liveScope: null,
        piiFieldPaths: []
    },
    {
        capability: "identity.nin_status",
        label: "NIN verification status",
        description: "Whether your government identity record is verified — never the NIN itself",
        core: true,
        attributeKeys: [],
        mockScope: "identity.nin_status",
        liveScope: null,
        piiFieldPaths: []
    },
    {
        capability: "profile.name",
        label: "Name details",
        description: "Given name and family name as held on your NIN record",
        attributeKeys: [
            "given_name",
            "family_name"
        ],
        mockScope: "profile.name",
        liveScope: null,
        piiFieldPaths: [
            "biographicData.firstName",
            "biographicData.lastName"
        ]
    },
    {
        capability: "profile.demographics",
        label: "Demographics",
        description: "Birth year and state of origin as held on your NIN record",
        attributeKeys: [
            "birth_year",
            "state_of_origin"
        ],
        mockScope: "profile.demographics",
        liveScope: null,
        piiFieldPaths: [
            "biographicData.dateOfBirth",
            "biographicData.origin.state"
        ]
    },
    {
        capability: "identity.phone_status",
        label: "Phone binding status",
        description: "Whether a phone number is bound to the identity (Stage 4)",
        attributeKeys: [],
        mockScope: "identity.phone_status",
        liveScope: null,
        piiFieldPaths: [
            "contactData.phone1"
        ]
    }
];
function scopeCatalogForPosture(posture) {
    const useLive = posture === "LIVE";
    const catalog = {};
    for (const c of CAPABILITIES){
        const scope = useLive ? c.liveScope : c.mockScope;
        if (!scope) continue; // LIVE with an UNCONFIRMED scope — unreachable while the gate holds
        catalog[scope] = {
            label: c.label,
            description: c.description,
            core: c.core,
            attributeKeys: c.attributeKeys.length ? c.attributeKeys : undefined,
            capability: c.capability
        };
    }
    return catalog;
}
const CORE_CAPABILITIES = CAPABILITIES.filter((c)=>c.core).map((c)=>c.capability);
const OPTIONAL_CAPABILITIES = CAPABILITIES.filter((c)=>!c.core && c.attributeKeys.length > 0).map((c)=>c.capability);
function liveScopeGaps() {
    return CAPABILITIES.filter((c)=>c.liveScope === null);
}
function assertLiveScopeConfigComplete() {
    const gaps = liveScopeGaps();
    if (gaps.length > 0) {
        throw new Error(`NINAuth LIVE scope mapping incomplete: ${gaps.map((c)=>c.capability).join(", ")} have no confirmed partner scope string (zero scope names are published officially — fill the liveScope column of scope-mapping.config.ts from the partner contract first).`);
    }
}
function capabilityForScope(scope, posture) {
    const useLive = posture === "LIVE";
    for (const c of CAPABILITIES){
        const s = useLive ? c.liveScope : c.mockScope;
        if (s === scope) return c.capability;
    }
    return null;
}
}),
"[project]/src/lib/providers/request-reasons.config.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// TrustScore Batch 1 — Purpose↔requestReason adapter mapping stub (G18 / PRIVACY_AUDIT PR1).
//
// Directive §15/§16 + the NINAuth Postman collection: every NINAuth
// enterprise verification call carries a `requestReason` drawn from a FIXED
// catalog served by GET /api/v1/integration/enterprise/request-reasons —
// "39 keys". The collection description enumerates them in abbreviated brace
// notation; 37 expand unambiguously from the documented text. The remaining 2
// are UNCONFIRMED until the live catalog endpoint is reachable — recorded
// honestly below, never invented.
//
// TrustScore's own Trust Decision API carries an optional `purpose` (Batch 0,
// G2 — marketplace_transaction | employment | … ). When TrustScore itself
// redeems a NINAuth enterprise verification (Batch 6's share-code / dynamic-QR
// modality), it must translate its purpose into the partner's requestReason.
// This module is that adapter as a STUB:
//
//   - every mapping row carries a rationale + a `confirmed: false` flag,
//   - resolveRequestReason() fails closed on unknown purposes,
//   - assertRequestReasonInCatalog() validates a mapped key against the
//     DOCUMENTED catalog (and, in LIVE, against the served catalog),
//   - the LIVE posture readiness report surfaces the unconfirmed count.
//
// Nothing here is used by MOCK/LOOPBACK flows today — by design. It exists so
// the LIVE flip has the adapter ready, with every assumption labeled.
__turbopack_context__.s([
    "PURPOSE_TO_REQUEST_REASON",
    ()=>PURPOSE_TO_REQUEST_REASON,
    "REQUEST_REASON_CATALOG",
    ()=>REQUEST_REASON_CATALOG,
    "REQUEST_REASON_CATALOG_VERSION",
    ()=>REQUEST_REASON_CATALOG_VERSION,
    "REQUEST_REASON_OFFICIAL_COUNT",
    ()=>REQUEST_REASON_OFFICIAL_COUNT,
    "REQUEST_REASON_UNCONFIRMED_COUNT",
    ()=>REQUEST_REASON_UNCONFIRMED_COUNT,
    "assertRequestReasonInCatalog",
    ()=>assertRequestReasonInCatalog,
    "requestReasonReadiness",
    ()=>requestReasonReadiness,
    "resolveRequestReason",
    ()=>resolveRequestReason
]);
const REQUEST_REASON_CATALOG_VERSION = "request-reasons-2026.09-batch1";
const REQUEST_REASON_OFFICIAL_COUNT = 39;
const REQUEST_REASON_CATALOG = [
    // Taxation family
    {
        key: "taxationEnrollment",
        group: "taxation"
    },
    {
        key: "taxationAssessment",
        group: "taxation"
    },
    {
        key: "taxationEnforcement",
        group: "taxation"
    },
    // Education family
    {
        key: "educationExam",
        group: "education"
    },
    {
        key: "educationAdmission",
        group: "education"
    },
    {
        key: "educationPromotion",
        group: "education"
    },
    // Employment family
    {
        key: "employmentRecruitment",
        group: "employment"
    },
    {
        key: "employmentEnrollment",
        group: "employment"
    },
    {
        key: "employmentDismissal",
        group: "employment"
    },
    // Corporate affairs family
    {
        key: "corporateAffairsDirector",
        group: "corporateAffairs"
    },
    {
        key: "corporateAffairsShareholder",
        group: "corporateAffairs"
    },
    {
        key: "corporateAffairsTrustee",
        group: "corporateAffairs"
    },
    // Transport modes
    {
        key: "aviationTransport",
        group: "transport"
    },
    {
        key: "roadTransport",
        group: "transport"
    },
    {
        key: "maritimeTransport",
        group: "transport"
    },
    {
        key: "railwayTransport",
        group: "transport"
    },
    // Financial / screening
    {
        key: "creditBackgroundCheck",
        group: "screening"
    },
    {
        key: "financialProducts",
        group: "financial"
    },
    {
        key: "insurance",
        group: "financial"
    },
    {
        key: "pensionEnrollment",
        group: "financial"
    },
    // Government / security
    {
        key: "defence",
        group: "government"
    },
    {
        key: "leaCheck",
        group: "government"
    },
    {
        key: "efccCheck",
        group: "government"
    },
    {
        key: "nyscCheck",
        group: "government"
    },
    {
        key: "passportImmigration",
        group: "government"
    },
    {
        key: "blacklistPolitical",
        group: "government"
    },
    {
        key: "blacklistSocial",
        group: "government"
    },
    {
        key: "crimePrisonIncarceration",
        group: "government"
    },
    {
        key: "legalCourts",
        group: "government"
    },
    {
        key: "clearanceForPoliticalOffice",
        group: "government"
    },
    // Access
    {
        key: "physicalAccess",
        group: "access"
    },
    {
        key: "logicalVirtualAccess",
        group: "access"
    },
    // Telecommunication
    {
        key: "telecommunicationSimReg",
        group: "telecommunication"
    },
    {
        key: "telecommunicationIotReg",
        group: "telecommunication"
    },
    // Other
    {
        key: "medical",
        group: "other"
    },
    {
        key: "entertainment",
        group: "other"
    },
    {
        key: "socioCulturalEnrollment",
        group: "other"
    }
];
const CATALOG_KEYS = new Set(REQUEST_REASON_CATALOG.map((r)=>r.key));
const REQUEST_REASON_UNCONFIRMED_COUNT = REQUEST_REASON_OFFICIAL_COUNT - REQUEST_REASON_CATALOG.length;
const PURPOSE_TO_REQUEST_REASON = [
    {
        purpose: "marketplace_transaction",
        requestReason: "creditBackgroundCheck",
        rationale: "Counterparty screening before a transaction — closest documented background-check reason; no marketplace key exists in the catalog.",
        confirmed: false
    },
    {
        purpose: "employment",
        requestReason: "employmentRecruitment",
        rationale: "Direct match — the catalog's pre-hire screening reason.",
        confirmed: false
    },
    {
        purpose: "rental",
        requestReason: "creditBackgroundCheck",
        rationale: "Tenant screening is a background check; no housing key exists in the documented catalog.",
        confirmed: false
    },
    {
        purpose: "professional_engagement",
        requestReason: "employmentRecruitment",
        rationale: "Engaging a professional mirrors recruitment screening in the catalog's vocabulary.",
        confirmed: false
    },
    {
        purpose: "high_value_transaction",
        requestReason: "financialProducts",
        rationale: "High-value transaction due diligence sits in the financial family; the closest documented key.",
        confirmed: false
    },
    {
        purpose: "b2b_onboarding",
        requestReason: "corporateAffairsDirector",
        rationale: "Business onboarding verifies the counterparty's principals — the corporate-affairs family is the documented fit.",
        confirmed: false
    },
    {
        purpose: "general_screening",
        requestReason: "creditBackgroundCheck",
        rationale: "The generic background-check reason; used when the caller supplies no purpose.",
        confirmed: false
    }
];
const PURPOSE_MAP = new Map(PURPOSE_TO_REQUEST_REASON.map((m)=>[
        m.purpose,
        m
    ]));
function resolveRequestReason(purpose) {
    const mapping = PURPOSE_MAP.get(purpose);
    if (!mapping) {
        throw new Error(`No requestReason mapping for purpose '${purpose}' — add it to request-reasons.config.ts before enabling this purpose in LIVE.`);
    }
    return {
        requestReason: mapping.requestReason,
        confirmed: mapping.confirmed,
        rationale: mapping.rationale
    };
}
function assertRequestReasonInCatalog(key) {
    if (!CATALOG_KEYS.has(key)) {
        throw new Error(`requestReason '${key}' is not in the documented NINAuth catalog (37 enumerated keys; ${REQUEST_REASON_UNCONFIRMED_COUNT} remain UNCONFIRMED until the live endpoint is reachable).`);
    }
}
function requestReasonReadiness() {
    return {
        catalogVersion: REQUEST_REASON_CATALOG_VERSION,
        enumerated: REQUEST_REASON_CATALOG.length,
        officialCount: REQUEST_REASON_OFFICIAL_COUNT,
        unconfirmed: REQUEST_REASON_UNCONFIRMED_COUNT,
        purposesMapped: PURPOSE_TO_REQUEST_REASON.length,
        purposeOptions: PURPOSE_MAP.size,
        allPurposesMapped: PURPOSE_TO_REQUEST_REASON.every((m)=>CATALOG_KEYS.has(m.requestReason)),
        mappingsConfirmed: PURPOSE_TO_REQUEST_REASON.filter((m)=>m.confirmed).length
    };
}
}),
"[project]/src/lib/providers/live-readiness.config.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LIVE_READINESS_ITEMS",
    ()=>LIVE_READINESS_ITEMS,
    "LIVE_READINESS_VERSION",
    ()=>LIVE_READINESS_VERSION,
    "liveReadinessReport",
    ()=>liveReadinessReport
]);
// TrustScore Batch 1 — NINAuth LIVE-readiness checklist (G4).
//
// The 33-row NINAUTH_CONTRACT_MATRIX (docs/research/) reconciles every
// official NINAuth capability against our MOCK implementation. This module
// encodes the actionable half — every UNCONFIRMED row and every PARTIAL row's
// missing piece — as a machine-readable checklist, aggregated with the
// scope-mapping and request-reason gaps into one readiness report surfaced in
// the admin provider console.
//
// Rules (non-negotiable):
//   - Nothing in this file is guessed; each item cites its matrix row.
//   - The LIVE posture gate consults the scope-mapping half (the parts that
//     map to code we own). The rest is the sandbox-verification agenda for
//     when partner credentials arrive — the honest LIVE-gate posture.
//   - Resolving an item happens by EDITING the matrix + this checklist with
//     the confirmed fact and its source; never by deleting the row.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/scope-mapping.config.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$request$2d$reasons$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/request-reasons.config.ts [app-route] (ecmascript)");
;
;
const LIVE_READINESS_VERSION = "live-readiness-2026.09-batch1";
const LIVE_READINESS_ITEMS = [
    // --- UNCONFIRMED rows -----------------------------------------------------
    {
        id: "oauth-nonce",
        area: "OAuth",
        status: "UNCONFIRMED",
        missing: "Whether NINAuth issues or honors the OIDC nonce at all.",
        posture: "We generate nonce = session.state and validate it inside validateIdToken (OIDC-correct hardening; honestly ours).",
        resolution: "Confirm nonce support in the partner sandbox; if absent, document the deviation and keep ours."
    },
    {
        id: "refresh-token",
        area: "OAuth",
        status: "UNCONFIRMED",
        missing: "Refresh-token existence, grant shape, rotation, revocation.",
        posture: "Not implemented; sessions are our own cookies.",
        resolution: "Decide refresh policy from the sandbox contract; do not assume one exists."
    },
    {
        id: "business-signin-rc",
        area: "Identity",
        status: "UNCONFIRMED",
        missing: "Whether any business-identity authentication flow exists (only CAC docs + directors' NINs at enterprise registration are documented).",
        posture: "Business/RC modeled as Batch 2 schema only; no provider claims.",
        resolution: "Confirm with the partner; keep business identity provider-agnostic until then."
    },
    {
        id: "sdk-web",
        area: "SDKs",
        status: "UNCONFIRMED",
        missing: "Existence of any official web SDK/JS library.",
        posture: "None used; plain OAuth redirect shape in our contract.",
        resolution: "Adopt only if officially published; otherwise keep the redirect contract."
    },
    {
        id: "sdk-mobile",
        area: "SDKs",
        status: "UNCONFIRMED",
        missing: "Existence of a mobile/Expo/React Native SDK; app-link guidance for native clients.",
        posture: "Web-only integration (ADR-002); mobile gated.",
        resolution: "Un-gate Batch 4 only on official guidance."
    },
    {
        id: "error-codes",
        area: "Errors",
        status: "UNCONFIRMED",
        missing: "The full LIVE error table — codes, messages, retry semantics.",
        posture: "Our own codes (SCOPE_INVALID, RAW_IDENTIFIER_BLOCKED, state_mismatch, code replay, rate-limit) — clearly ours, never presented as NINAuth's.",
        resolution: "Derive the LIVE error table from the sandbox and map ours onto it."
    },
    {
        id: "rate-limits",
        area: "Errors",
        status: "UNCONFIRMED",
        missing: "NINAuth's actual rate limits.",
        posture: "Our own limits (start 10/min; approve/callback tighter).",
        resolution: "Read the sandbox headers/docs; align our client-side backoff."
    },
    // --- PARTIAL rows' missing pieces -----------------------------------------
    {
        id: "oauth-base-url",
        area: "OAuth",
        status: "PARTIAL",
        missing: "The OAuth base URL — /oauth/authorize, /oauth/token, /oauth/userinfo are documented only as RELATIVE paths; no base URL is published anywhere.",
        posture: "MOCK/LOOPBACK endpoints; LIVE refuses to flip without NINAUTH_BASE_URL.",
        resolution: "Obtain the base URL at onboarding; set NINAUTH_BASE_URL."
    },
    {
        id: "token-auth-shape",
        area: "OAuth",
        status: "PARTIAL",
        missing: "Token-endpoint auth shape (client_secret POST vs Basic) and exact response fields.",
        posture: "Contract-first mock with documented envelope; LIVE shape pending.",
        resolution: "Confirm from the sandbox; adjust the transport call only."
    },
    {
        id: "id-token-schema",
        area: "Assertion",
        status: "PARTIAL",
        missing: "ID-token schema, signature algorithm, and JWKS mechanism (only assertion CONTENTS are documented).",
        posture: "HMAC-signed mock tokens with full validation discipline (signature/issuer/audience/expiry/nonce).",
        resolution: "Swap validation to the partner's JWKS; keep the validation discipline identical."
    },
    {
        id: "userinfo-shape",
        area: "Assertion",
        status: "PARTIAL",
        missing: "UserInfo endpoint URL + response schema.",
        posture: "Claims arrive in the ID token; no separate UserInfo call.",
        resolution: "Confirm whether the partner separates them; adapt the transport."
    },
    {
        id: "scope-vocabulary",
        area: "Scopes",
        status: "PARTIAL",
        missing: "ZERO scope names are published — our identity.*/profile.* strings are mock-contract-only.",
        posture: "Externalized in scope-mapping.config.ts with liveScope=null per capability; the LIVE gate refuses to flip while any is null.",
        resolution: "Fill the liveScope column from the partner contract; re-run the batch1 matrix."
    },
    {
        id: "crypto-keys-usage",
        area: "Security",
        status: "PARTIAL",
        missing: "How the RSA dashboard keys are applied to verification requests (encrypt which payload, which padding).",
        posture: "Vault stores credentials AES-256-GCM; no RSA request encryption yet.",
        resolution: "Implement request encryption per sandbox samples before LIVE traffic."
    },
    {
        id: "webhook-events",
        area: "Webhooks",
        status: "PARTIAL",
        missing: "Webhook event names, payloads, and signature scheme (URL support is documented, nothing else).",
        posture: "Our own signed webhook deliveries (ts_ secrets, HMAC) for B2B — never presented as NINAuth's.",
        resolution: "Subscribe to partner events in the sandbox; map their vocabulary."
    },
    {
        id: "consent-screen-brand",
        area: "Consent",
        status: "PARTIAL",
        missing: "Exact partner-side consent-screen presentation + remaining branding constraints.",
        posture: "Our consent screen follows the documented requester/fields/purpose contract + brand rules (white/green, one-word NINAuth, ≥44px).",
        resolution: "Verify against the live app; adjust copy only where mandated."
    },
    {
        id: "sso-federation",
        area: "SSO",
        status: "PARTIAL",
        missing: "SSO/session-federation mechanics (only that NINAuth SSOs the dashboard session).",
        posture: "Not relied upon.",
        resolution: "Confirm at onboarding; adopt only if it simplifies the partner dashboard flow."
    }
];
function liveReadinessReport() {
    const scopeGaps = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["liveScopeGaps"])();
    const reasons = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$request$2d$reasons$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requestReasonReadiness"])();
    const unconfirmed = LIVE_READINESS_ITEMS.filter((i)=>i.status === "UNCONFIRMED");
    const partial = LIVE_READINESS_ITEMS.filter((i)=>i.status === "PARTIAL");
    return {
        version: LIVE_READINESS_VERSION,
        scopeMapping: {
            configVersion: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SCOPE_MAPPING_CONFIG_VERSION"],
            totalCapabilities: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CAPABILITIES"].length,
            liveScopeConfirmed: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CAPABILITIES"].length - scopeGaps.length,
            missingLiveScopes: scopeGaps.map((c)=>c.capability)
        },
        requestReasons: reasons,
        contractItems: {
            total: LIVE_READINESS_ITEMS.length,
            unconfirmed: unconfirmed.length,
            partial: partial.length,
            documented: 33 - unconfirmed.length - partial.length
        },
        liveGate: {
            // What the LIVE posture flip requires, in order: env flag, base URLs,
            // vault credentials (checked at flip time) + the scope mapping (this
            // batch's addition). The rest of the checklist is the sandbox agenda.
            scopeMappingComplete: scopeGaps.length === 0,
            requestReasonCatalogComplete: reasons.unconfirmed === 0
        },
        items: LIVE_READINESS_ITEMS
    };
}
}),
"[project]/src/lib/providers/provider-posture.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PROVIDER_LABELS",
    ()=>PROVIDER_LABELS,
    "PROVIDER_POSTURE_KEY",
    ()=>PROVIDER_POSTURE_KEY,
    "PostureError",
    ()=>PostureError,
    "getProviderPosture",
    ()=>getProviderPosture,
    "getProvidersAdmin",
    ()=>getProvidersAdmin,
    "invalidatePostureCache",
    ()=>invalidatePostureCache,
    "isLoopback",
    ()=>isLoopback,
    "postureNote",
    ()=>postureNote,
    "providerNameFor",
    ()=>providerNameFor,
    "setProviderPosture",
    ()=>setProviderPosture,
    "simulatorHealth",
    ()=>simulatorHealth
]);
// TrustScore Stage 13 — Provider posture (mock | loopback | live).
//
// The posture is a platform setting (PlatformSetting key "providers.posture"),
// NOT an env var — it flips at runtime through the admin console without a
// restart, and every read is cached in-memory for 5s (single instance,
// documented). Default: "mock" — every existing stage matrix stays green.
//
//   mock     — the contract-first MOCK transports (Stages 2–4 behavior,
//              honest labels everywhere; the default sandbox posture).
//   loopback — the REAL transport code path (signing, timeouts, retries,
//              circuit breaker, metrics) pointed at the local provider
//              simulator mini-service :3032. Exercises everything LIVE will
//              use except the partner itself.
//   live     — the partner's real endpoints + vault credentials. Honestly
//              gated: requires PROVIDER_LIVE_ENABLED=true, per-provider base
//              URLs AND an ACTIVE vault credential for each provider. The
//              sandbox has none of these, so the API answers 422 instead of
//              pretending.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/transport.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$credential$2d$vault$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/credential-vault.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/scope-mapping.config.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$live$2d$readiness$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/live-readiness.config.ts [app-route] (ecmascript)");
;
;
;
;
;
const PROVIDER_POSTURE_KEY = "providers.posture";
const PROVIDER_LABELS = {
    ninauth: {
        title: "NINAuth (government identity)",
        role: "OAuth 2.0 + PKCE session, authorization code, token exchange, ID-token validation"
    },
    phone: {
        title: "SMS carrier (phone OTP)",
        role: "E.164 delivery of one-time codes; SIM-swap risk posture at bind time"
    },
    liveness: {
        title: "Biometric liveness partner",
        role: "Job create → capture submit → verdict (anti-spoofing + face match)"
    }
};
function providerNameFor(key, posture) {
    switch(posture){
        case "mock":
            return key === "ninauth" ? "NINAUTH_MOCK" : key === "phone" ? "SMS_MOCK" : "LIVENESS_MOCK";
        case "loopback":
            return key === "ninauth" ? "NINAUTH_LOOPBACK" : key === "phone" ? "SMS_LOOPBACK" : "LIVENESS_LOOPBACK";
        case "live":
            return key === "ninauth" ? "NINAUTH_LIVE" : key === "phone" ? "SMS_LIVE" : "LIVENESS_LIVE";
    }
}
// ---------------------------------------------------------------------------
// Posture read (5s in-memory cache) + write
// ---------------------------------------------------------------------------
const globalForPosture = globalThis;
async function getProviderPosture() {
    const cached = globalForPosture.__tsProviderPosture;
    if (cached && Date.now() - cached.readAt < 5_000) return cached.value;
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.findUnique({
        where: {
            key: PROVIDER_POSTURE_KEY
        }
    });
    let value = "mock";
    if (row) {
        try {
            const parsed = JSON.parse(row.value);
            if (parsed.posture === "mock" || parsed.posture === "loopback" || parsed.posture === "live") {
                value = parsed.posture;
            }
        } catch  {
        /* malformed setting falls back to mock — honest default */ }
    }
    globalForPosture.__tsProviderPosture = {
        value,
        readAt: Date.now()
    };
    return value;
}
function invalidatePostureCache() {
    globalForPosture.__tsProviderPosture = undefined;
}
function isLoopback(posture) {
    return posture === "loopback";
}
class PostureError extends Error {
    code;
    status;
    constructor(code, status, message){
        super(message), this.code = code, this.status = status;
        this.name = "PostureError";
    }
}
async function setProviderPosture(posture) {
    if (posture === "live") {
        // Honest LIVE gate — none of these hold in the sandbox, by design.
        if (process.env.PROVIDER_LIVE_ENABLED !== "true") {
            throw new PostureError("LIVE_NOT_ENABLED", 422, "LIVE posture requires PROVIDER_LIVE_ENABLED=true plus per-provider base URLs and an ACTIVE vault credential for every provider. The sandbox has none of these — nothing live is claimed.");
        }
        const missingBase = [];
        if (!process.env.NINAUTH_BASE_URL) missingBase.push("NINAUTH_BASE_URL");
        if (!process.env.PHONE_BASE_URL) missingBase.push("PHONE_BASE_URL");
        if (!process.env.LIVENESS_BASE_URL) missingBase.push("LIVENESS_BASE_URL");
        if (missingBase.length) {
            throw new PostureError("LIVE_BASE_URL_MISSING", 422, `LIVE posture requires ${missingBase.join(", ")} to be set.`);
        }
        for (const key of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_KEYS"]){
            const active = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].providerCredential.findFirst({
                where: {
                    provider: key,
                    status: "ACTIVE"
                }
            });
            if (!active) {
                throw new PostureError("LIVE_CREDENTIAL_MISSING", 422, `LIVE posture requires an ACTIVE vault credential for ${key} (none is stored).`);
            }
        }
        // Batch 1 (G5) — the capability→scope mapping must be COMPLETE before the
        // flip: every capability needs its partner-confirmed liveScope string.
        // Zero scope names are published officially today, so this ALWAYS refuses
        // in the sandbox — by design, not by accident.
        const scopeGaps = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["liveScopeGaps"])();
        if (scopeGaps.length > 0) {
            throw new PostureError("LIVE_SCOPE_MAPPING_UNCONFIRMED", 422, `LIVE posture requires a confirmed partner scope string for every capability (scope-mapping.config.ts ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SCOPE_MAPPING_CONFIG_VERSION"]}); still unconfirmed: ${scopeGaps.map((c)=>c.capability).join(", ")}. Zero scope names are published in any official NINAuth source — fill the liveScope column from the partner contract first.`);
        }
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.upsert({
        where: {
            key: PROVIDER_POSTURE_KEY
        },
        create: {
            key: PROVIDER_POSTURE_KEY,
            value: JSON.stringify({
                posture
            })
        },
        update: {
            value: JSON.stringify({
                posture
            })
        }
    });
    invalidatePostureCache();
}
async function simulatorHealth() {
    const port = Number(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LOOPBACK_BASE_URL"].split(":").pop() ?? 3032);
    try {
        const controller = new AbortController();
        const timer = setTimeout(()=>controller.abort(), 2_000);
        try {
            const res = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LOOPBACK_BASE_URL"]}/health`, {
                signal: controller.signal,
                cache: "no-store"
            });
            const body = await res.json();
            return {
                reachable: res.status === 200 && body.ok === true,
                port,
                fault: body.fault ?? null,
                uptimeSec: body.uptimeSec ?? null
            };
        } finally{
            clearTimeout(timer);
        }
    } catch (err) {
        return {
            reachable: false,
            port,
            fault: null,
            uptimeSec: null,
            detail: err instanceof Error ? err.message : "unreachable"
        };
    }
}
function postureNote(posture) {
    switch(posture){
        case "mock":
            return "MOCK transports (default). All provider calls resolve in-process against the contract-first mocks — honest labels everywhere, no wire traffic.";
        case "loopback":
            return "Sandbox loopback: the REAL transport path (HMAC-signed calls, timeouts, retries, circuit breakers, metrics) pointed at the local provider simulator on :3032. Exercises everything LIVE will use except the partner itself.";
        case "live":
            return "LIVE partner endpoints with vault credentials. (Not available in this sandbox — the API refuses the flip honestly.)";
    }
}
async function getProvidersAdmin() {
    const [posture, vault, sim] = await Promise.all([
        getProviderPosture(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$credential$2d$vault$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listCredentials"])(),
        simulatorHealth()
    ]);
    const vaultByProvider = new Map(vault.filter((v)=>v.status === "ACTIVE").map((v)=>[
            v.provider,
            v
        ]));
    return {
        posture,
        postureNote: postureNote(posture),
        liveAvailable: process.env.PROVIDER_LIVE_ENABLED === "true" && Boolean(process.env.NINAUTH_BASE_URL) && Boolean(process.env.PHONE_BASE_URL) && Boolean(process.env.LIVENESS_BASE_URL) && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_KEYS"].every((k)=>vaultByProvider.has(k)),
        providers: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_KEYS"].map((key)=>({
                key,
                title: PROVIDER_LABELS[key].title,
                role: PROVIDER_LABELS[key].role,
                providerName: providerNameFor(key, posture),
                mode: posture === "mock" ? "MOCK" : "LIVE",
                transport: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerTransportStatus"])(key),
                credential: vaultByProvider.get(key) ?? null
            })),
        vault,
        simulator: sim,
        vaultDefaultKey: !process.env.VAULT_MASTER_KEY,
        // Batch 1 (G4/G5/G18) — the NINAuth LIVE-alignment surface: scope-mapping
        // gaps, request-reason readiness, and the contract-matrix checklist the
        // LIVE flip + sandbox verification must clear.
        ninauthAlignment: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$live$2d$readiness$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["liveReadinessReport"])(),
        constants: {
            requestTimeoutMs: 4_000,
            retries: 2,
            backoffMs: [
                150,
                600
            ],
            circuitThreshold: 3,
            circuitOpenMs: 20_000
        }
    };
}
}),
"[project]/src/lib/services/transport-observability.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ALERT_STATE_KEY",
    ()=>ALERT_STATE_KEY,
    "DEFAULT_SUSTAINED_MS",
    ()=>DEFAULT_SUSTAINED_MS,
    "MAX_SUSTAINED_MS",
    ()=>MAX_SUSTAINED_MS,
    "MIN_SUSTAINED_MS",
    ()=>MIN_SUSTAINED_MS,
    "SUSTAINED_MS_KEY",
    ()=>SUSTAINED_MS_KEY,
    "getSustainedThresholdMs",
    ()=>getSustainedThresholdMs,
    "getTransportHistory",
    ()=>getTransportHistory,
    "runObservabilityTick",
    ()=>runObservabilityTick,
    "setSustainedThresholdMs",
    ()=>setSustainedThresholdMs
]);
// TrustScore Stage 14 — Transport observability service.
//
// Closes the Stage 13 watch item "circuit state + transport metrics are
// in-memory (a dev restart zeroes them)": the internal tick (and an admin
// "snapshot now" action) now persists
//   - TransportSnapshot rows — periodic per-provider metrics snapshots, so
//     transport health HISTORY survives restarts (the live counters stay
//     in-memory, single-instance posture — documented honestly), and
//   - CircuitEvent rows — the circuit-breaker transition audit trail
//     (trip / half-open / re-trip / recovered / reset, with the reason code).
//
// Sustained-open alerting: when a provider's breaker has been non-CLOSED for
// longer than the admin-tunable threshold (PlatformSetting
// "transport.alert.sustainedMs", default 45s — several trip→half-open→re-trip
// cycles), every ADMIN gets a SYSTEM notification. One alert per episode
// (deduped via the persisted episode state in PlatformSetting
// "transport.alerts"), plus a recovery notification when the circuit closes.
// Episode state is DB-backed so dedupe survives restarts.
//
// Honesty rules: MOCK posture never alerts (no wire traffic exists to be
// unhealthy); a restart-closed circuit that was alerted DOES send a recovery
// note (the circuit genuinely is closed again); the queue is bounded.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/transport.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/provider-posture.ts [app-route] (ecmascript)");
;
;
;
const SUSTAINED_MS_KEY = "transport.alert.sustainedMs";
const ALERT_STATE_KEY = "transport.alerts";
const DEFAULT_SUSTAINED_MS = 45_000;
const MIN_SUSTAINED_MS = 5_000;
const MAX_SUSTAINED_MS = 600_000;
const SNAPSHOTS_KEPT = 360; // per provider — 6h at 60s cadence
const EVENTS_KEPT = 300; // per provider
// ---------------------------------------------------------------------------
// Threshold (admin-tunable, 5s cache — same posture discipline as the
// provider posture setting)
// ---------------------------------------------------------------------------
const globalForObs = globalThis;
async function getSustainedThresholdMs() {
    const cached = globalForObs.__tsSustainedMs;
    if (cached && Date.now() - cached.readAt < 5_000) return cached.value;
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.findUnique({
        where: {
            key: SUSTAINED_MS_KEY
        }
    });
    let value = DEFAULT_SUSTAINED_MS;
    if (row) {
        try {
            const parsed = JSON.parse(row.value);
            if (typeof parsed.sustainedMs === "number" && parsed.sustainedMs >= MIN_SUSTAINED_MS && parsed.sustainedMs <= MAX_SUSTAINED_MS) {
                value = parsed.sustainedMs;
            }
        } catch  {
        /* malformed falls back to the default — honest posture */ }
    }
    globalForObs.__tsSustainedMs = {
        value,
        readAt: Date.now()
    };
    return value;
}
async function setSustainedThresholdMs(ms) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.upsert({
        where: {
            key: SUSTAINED_MS_KEY
        },
        create: {
            key: SUSTAINED_MS_KEY,
            value: JSON.stringify({
                sustainedMs: ms
            })
        },
        update: {
            value: JSON.stringify({
                sustainedMs: ms
            })
        }
    });
    globalForObs.__tsSustainedMs = {
        value: ms,
        readAt: Date.now()
    };
}
async function readAlertState() {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.findUnique({
        where: {
            key: ALERT_STATE_KEY
        }
    });
    if (!row) return {};
    try {
        return JSON.parse(row.value);
    } catch  {
        return {};
    }
}
async function writeAlertState(state) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.upsert({
        where: {
            key: ALERT_STATE_KEY
        },
        create: {
            key: ALERT_STATE_KEY,
            value: JSON.stringify(state)
        },
        update: {
            value: JSON.stringify(state)
        }
    });
}
async function persistTransitions(drain) {
    if (!drain.length) return 0;
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].circuitEvent.createMany({
        data: drain.map((t)=>({
                provider: t.provider,
                fromState: t.fromState,
                toState: t.toState,
                reason: t.reason,
                createdAt: new Date(t.at)
            }))
    });
    return drain.length;
}
async function pruneProvider(provider) {
    const [snapCount, evtCount] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].transportSnapshot.count({
            where: {
                provider
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].circuitEvent.count({
            where: {
                provider
            }
        })
    ]);
    if (snapCount > SNAPSHOTS_KEPT) {
        const oldest = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].transportSnapshot.findMany({
            where: {
                provider
            },
            orderBy: {
                createdAt: "desc"
            },
            skip: SNAPSHOTS_KEPT,
            select: {
                createdAt: true
            },
            take: 1
        });
        if (oldest.length) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].transportSnapshot.deleteMany({
                where: {
                    provider,
                    createdAt: {
                        lt: oldest[0].createdAt
                    }
                }
            });
        }
    }
    if (evtCount > EVENTS_KEPT) {
        const oldest = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].circuitEvent.findMany({
            where: {
                provider
            },
            orderBy: {
                createdAt: "desc"
            },
            skip: EVENTS_KEPT,
            select: {
                createdAt: true
            },
            take: 1
        });
        if (oldest.length) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].circuitEvent.deleteMany({
                where: {
                    provider,
                    createdAt: {
                        lt: oldest[0].createdAt
                    }
                }
            });
        }
    }
}
async function notifyAdmins(title, body) {
    const admins = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
        where: {
            role: "ADMIN",
            status: "ACTIVE"
        },
        select: {
            id: true
        }
    });
    if (!admins.length) return;
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].notification.createMany({
        data: admins.map((a)=>({
                userId: a.id,
                type: "SYSTEM",
                title,
                body
            }))
    });
}
async function runObservabilityTick() {
    const posture = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    const drain = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["drainCircuitTransitions"])();
    const eventsPersisted = await persistTransitions(drain);
    const rows = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_KEYS"].map((key)=>{
        const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerTransportStatus"])(key);
        return {
            provider: key,
            posture,
            circuit: t.circuit,
            calls: t.calls,
            errors: t.errors,
            errorRate: t.errorRate,
            p50: t.p50,
            p95: t.p95
        };
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].transportSnapshot.createMany({
        data: rows
    });
    const alertsRaised = [];
    const recoveriesSent = [];
    const [thresholdMs, alertState] = await Promise.all([
        getSustainedThresholdMs(),
        readAlertState()
    ]);
    const now = Date.now();
    let stateChanged = false;
    for (const key of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_KEYS"]){
        const episodeStart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["circuitEpisodeStart"])(key);
        const episode = alertState[key];
        if (episodeStart !== null) {
            const state = alertState[key] ?? {
                firstTripAt: new Date(episodeStart).toISOString(),
                alertedAt: null
            };
            if (!episode) {
                alertState[key] = state;
                stateChanged = true;
            }
            const sustainedFor = now - episodeStart;
            const shouldAlert = posture !== "mock" && // honest: no wire traffic in MOCK — nothing to alert on
            state.alertedAt === null && sustainedFor >= thresholdMs;
            if (shouldAlert) {
                state.alertedAt = new Date().toISOString();
                alertState[key] = state;
                stateChanged = true;
                alertsRaised.push(key);
                const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerTransportStatus"])(key);
                await notifyAdmins(`Provider circuit sustained open — ${key}`, `The ${key} provider circuit has been open for ${Math.round(sustainedFor / 1000)}s ` + `(${t.calls} calls, ${t.errors} errors, last error: ${t.lastError ?? "unknown"}). ` + `Verify calls fail honestly (503) while the breaker is open. — Trust Engine observability (Stage 14)`);
            }
        } else if (episode && episode.alertedAt) {
            // Circuit is CLOSED now and this episode had alerted → recovery note.
            delete alertState[key];
            stateChanged = true;
            recoveriesSent.push(key);
            await notifyAdmins(`Provider circuit recovered — ${key}`, `The ${key} provider circuit is closed again (recovered or reset). ` + `The episode that started ${new Date(episode.firstTripAt).toLocaleTimeString()} and alerted ` + `at ${new Date(episode.alertedAt).toLocaleTimeString()} is over. — Trust Engine observability (Stage 14)`);
        } else if (episode) {
            // Stale bookkeeping (e.g. restart closed the breaker before the
            // threshold elapsed) — clear it quietly.
            delete alertState[key];
            stateChanged = true;
        }
    }
    if (stateChanged) await writeAlertState(alertState);
    // Prune occasionally (every 10th tick) — cheap amortized history bounds.
    const shouldPrune = Math.floor(now / 60_000) % 10 === 0;
    if (shouldPrune) {
        await Promise.all(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_KEYS"].map((k)=>pruneProvider(k)));
    }
    return {
        snapshotsPersisted: rows.length,
        eventsPersisted,
        alertsRaised,
        recoveriesSent,
        pruned: shouldPrune
    };
}
async function getTransportHistory() {
    const { PROVIDER_LABELS } = await __turbopack_context__.A("[project]/src/lib/providers/provider-posture.ts [app-route] (ecmascript, async loader)");
    const [thresholdMs, alertState, posture] = await Promise.all([
        getSustainedThresholdMs(),
        readAlertState(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])()
    ]);
    const providers = await Promise.all(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_KEYS"].map(async (key)=>{
        const [snapshots, events] = await Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].transportSnapshot.findMany({
                where: {
                    provider: key
                },
                orderBy: {
                    createdAt: "desc"
                },
                take: 60
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].circuitEvent.findMany({
                where: {
                    provider: key
                },
                orderBy: {
                    createdAt: "desc"
                },
                take: 12
            })
        ]);
        return {
            key,
            title: PROVIDER_LABELS[key].title,
            snapshots: snapshots.map((s)=>({
                    createdAt: s.createdAt.toISOString(),
                    circuit: s.circuit,
                    calls: s.calls,
                    errors: s.errors,
                    errorRate: s.errorRate,
                    p50: s.p50,
                    p95: s.p95
                })).reverse(),
            events: events.map((e)=>({
                    createdAt: e.createdAt.toISOString(),
                    fromState: e.fromState,
                    toState: e.toState,
                    reason: e.reason
                })),
            alert: alertState[key] ?? null
        };
    }));
    return {
        sustainedMs: thresholdMs,
        defaultSustainedMs: DEFAULT_SUSTAINED_MS,
        posture,
        providers,
        titles: Object.fromEntries(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_KEYS"].map((k)=>[
                k,
                PROVIDER_LABELS[k].title
            ]))
    };
}
}),
"[project]/src/app/api/v1/internal/webhook-tick/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// POST /api/v1/internal/webhook-tick — Stage 12 timer-driven webhook retry.
// Called ONLY by the platform's own webhook-worker mini-service (port 3031),
// which ticks every 60s. This closes the "lazy-only retry" gap: due retries
// now run on a timer IN ADDITION to the lazy on-read processor.
//
// Stage 14: the tick ALSO runs the transport observability pass — persist
// circuit transition events + per-provider metrics snapshots and evaluate
// sustained-open alerts (see transport-observability.ts). The observability
// leg is fault-tolerant: a failure degrades to webhook-only behavior and is
// reported in the response, never breaking the retry tick.
//
// Access: a fixed internal token header (sandbox single-instance posture —
// documented honestly; production shape is an internal network grant). The
// endpoint is deliberately bounded: processDueDeliveries() takes at most 5
// due deliveries per call, so even a hammering caller gets bounded work.
__turbopack_context__.s([
    "GET",
    ()=>GET,
    "INTERNAL_TICK_TOKEN",
    ()=>INTERNAL_TICK_TOKEN,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$webhook$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/webhook-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$transport$2d$observability$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/transport-observability.ts [app-route] (ecmascript)");
;
;
;
const INTERNAL_TICK_TOKEN = "ts-internal-webhook-tick-v1";
async function POST(req) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const token = req.headers.get("x-internal-token");
    if (!token || token !== INTERNAL_TICK_TOKEN) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(403, "FORBIDDEN", "Internal endpoint — invalid token.", requestId);
    }
    const processed = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$webhook$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["processDueDeliveries"])();
    // Stage 14 — transport observability (best-effort, bounded).
    let observability;
    try {
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$transport$2d$observability$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["runObservabilityTick"])();
        observability = {
            snapshotsPersisted: result.snapshotsPersisted,
            eventsPersisted: result.eventsPersisted,
            alertsRaised: result.alertsRaised,
            recoveriesSent: result.recoveriesSent
        };
    } catch (err) {
        observability = {
            error: err instanceof Error ? err.message : "observability tick failed"
        };
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
        processed,
        observability,
        at: new Date().toISOString(),
        requestId
    });
}
async function GET(_req) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(405, "METHOD_NOT_ALLOWED", "POST only — the worker ticks this endpoint.", requestId);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__938d4eb7._.js.map