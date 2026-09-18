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
"[project]/src/app/api/v1/dev/webhook-sink/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// POST /api/v1/dev/webhook-sink — the SANDBOX SELF-TEST webhook target
// (Stage 9). A plain echo endpoint so a developer can point their webhook
// at http://localhost:3000/api/v1/dev/webhook-sink, fire a test event (or a
// real check), and watch the delivery land: the delivery log records the
// response (this echo), and the portal's docs show how to verify the
// X-TrustScore-Signature header.
//
// It stores NOTHING (beyond the platform's own delivery row, which already
// carries the payload + signature). It echoes back the exact headers +
// body it received — that echo is captured as the delivery's response
// snippet, which is exactly the debugging signal a developer needs.
//
// Rate-limited per IP (it is a public endpoint; abuse = noisy echoes only).
__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
;
async function POST(req) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const rl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clientKey"])(req, "webhook-sink"), 30, 60_000);
    if (!rl.allowed) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
            error: {
                code: "RATE_LIMITED",
                message: "Sink rate limit — retry shortly.",
                requestId
            }
        }, 429);
    }
    let body = "";
    try {
        body = (await req.text()).slice(0, 4000);
    } catch  {
        body = "";
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
        received: true,
        sink: "TrustScore sandbox self-test webhook sink",
        headers: {
            "x-trustscore-event": req.headers.get("x-trustscore-event") ?? null,
            "x-trustscore-signature": req.headers.get("x-trustscore-signature") ?? null,
            "content-type": req.headers.get("content-type") ?? null
        },
        body: body ? safeJson(body) : null,
        note: "This sink echoes what it received so the delivery log shows your endpoint's exact view. In production, verify the signature and return 2xx fast.",
        requestId
    });
}
function safeJson(text) {
    try {
        return JSON.parse(text);
    } catch  {
        return text;
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__00b74c8d._.js.map