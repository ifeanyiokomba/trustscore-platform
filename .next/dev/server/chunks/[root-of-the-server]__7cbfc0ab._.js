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
"[project]/src/lib/platform/crypto.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateSessionToken",
    ()=>generateSessionToken,
    "hashIp",
    ()=>hashIp,
    "hashPassword",
    ()=>hashPassword,
    "sha256Hex",
    ()=>sha256Hex,
    "verifyPassword",
    ()=>verifyPassword
]);
// TrustScore Stage 1 — cryptography utilities.
// - Passwords: scrypt with per-user random salt, timing-safe verification.
// - Session tokens: 256-bit random; stored only as sha256 hashes.
// - IP addresses: salted sha256 hashes (privacy-preserving audit trail).
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N
const SCRYPT_BLOCKSIZE = 8; // r
const SCRYPT_PARALLELIZATION = 1; // p
const globalForSalt = globalThis;
// Per-process salt for IP hashing (stable within the instance, not persisted).
const ipSalt = globalForSalt.__tsIpSalt ?? (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(16).toString("hex");
globalForSalt.__tsIpSalt = ipSalt;
function hashPassword(password) {
    const salt = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(16).toString("hex");
    const hash = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["scryptSync"])(password, salt, SCRYPT_KEYLEN, {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCKSIZE,
        p: SCRYPT_PARALLELIZATION
    }).toString("hex");
    return {
        hash,
        salt
    };
}
function verifyPassword(password, salt, expectedHashHex) {
    try {
        const actual = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["scryptSync"])(password, salt, SCRYPT_KEYLEN, {
            N: SCRYPT_COST,
            r: SCRYPT_BLOCKSIZE,
            p: SCRYPT_PARALLELIZATION
        });
        const expected = Buffer.from(expectedHashHex, "hex");
        // Constant-length compare to avoid leaking length info.
        if (actual.length !== expected.length) return false;
        return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["timingSafeEqual"])(actual, expected);
    } catch  {
        return false;
    }
}
function generateSessionToken() {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(32).toString("hex"); // 256-bit
}
function sha256Hex(value) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(value).digest("hex");
}
function hashIp(ip) {
    if (!ip) return null;
    return sha256Hex(`${ipSalt}:${ip}`);
}
}),
"[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "recordAudit",
    ()=>recordAudit
]);
// TrustScore Stage 1 — AuditService (directive §28 service separation).
// Redacted audit events for every security-relevant action. No PII in metadata.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
;
// Explicitly redacted: strip anything that could carry PII before persisting.
const SAFE_METADATA_KEYS = new Set([
    "reason",
    "scope",
    "sessionCount",
    "outcome",
    "code",
    "view",
    "scopes",
    "attributes",
    "revokedAttributes",
    "revokedIdentifiers",
    "identityRevoked",
    // Stage 4 signal keys — all non-PII counters / labels
    "attemptsLeft",
    "simSwap",
    "confidence",
    "liveness",
    "faceMatch",
    "level",
    "providerMode",
    // Stage 5 — non-PII counters / labels / prefixes only
    "score",
    "trigger",
    "type",
    "credentialTypes",
    "ttlHours",
    "maxViews",
    "views",
    "viewsLeft",
    "tokenPrefix",
    "scopeSet",
    "exportBytes",
    "requests",
    "deleted",
    "current",
    // Stage 6 — non-PII labels only
    "method",
    // Stage 7 — non-PII labels / counters only (never flag text or rationale)
    "category",
    "evidenceCount",
    // Stage 8 — trust-engine labels / counters only (never policy rationale text)
    "policyVersion",
    "enabled",
    "residualRisk",
    "status",
    "warnings",
    // Stage 8 simulation — counters only (never member identities)
    "cohort",
    "frozenExcluded",
    "simulated",
    // Stage 9 — B2B labels / counters only (never key material, URLs or inputs)
    "environment",
    "plan",
    "keyPrefix",
    "rotateSecret",
    "event",
    "role",
    "attempts",
    "statusCode",
    "deliveryStatus",
    // Stage 10 — network labels / counters only (severity, window, degree)
    "severity",
    "windowDays",
    "degree",
    "signalCount",
    // Stage 11 — score-insights export labels / counters only
    "format",
    "records",
    // Stage 14 — transport observability labels / counters only
    "posture",
    "sustainedMs",
    "snapshots",
    "events",
    "alertsRaised",
    "recoveriesSent",
    "provider"
]);
async function recordAudit(input) {
    try {
        const safeMeta = input.metadata && Object.fromEntries(Object.entries(input.metadata).filter(([k])=>SAFE_METADATA_KEYS.has(k)));
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].auditEvent.create({
            data: {
                actorType: input.actorType,
                actorId: input.actorId ?? null,
                action: input.action,
                subjectType: input.subjectType ?? null,
                subjectId: input.subjectId ?? null,
                requestId: input.requestId ?? null,
                metadata: safeMeta ? JSON.stringify(safeMeta) : null
            }
        });
    } catch (err) {
        // Audit failures must never break the request path — log to stderr only.
        console.error("[audit] failed to record event:", err.message);
    }
}
}),
"[project]/src/lib/platform/session.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// TrustScore Stage 1 — session management (server side).
// The raw session token lives ONLY in an httpOnly cookie; the database stores
// its sha256 hash. Revocation = row update; expiry enforced on read.
__turbopack_context__.s([
    "SESSION_COOKIE",
    ()=>SESSION_COOKIE,
    "SESSION_TTL_MS",
    ()=>SESSION_TTL_MS,
    "clearSessionCookie",
    ()=>clearSessionCookie,
    "createSession",
    ()=>createSession,
    "getSessionUser",
    ()=>getSessionUser,
    "revokeSession",
    ()=>revokeSession,
    "setSessionCookie",
    ()=>setSessionCookie,
    "toPublicUser",
    ()=>toPublicUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
;
;
;
;
const SESSION_COOKIE = "ts_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
function toPublicUser(u) {
    return {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        handle: u.handle,
        status: u.status,
        role: u.role,
        createdAt: u.createdAt.toISOString()
    };
}
async function createSession(userId, req) {
    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateSessionToken"])();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.create({
        data: {
            userId,
            tokenHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(token),
            expiresAt,
            userAgent: (req.headers.get("user-agent") ?? "unknown").slice(0, 200),
            // sec-batch-A: same trusted-proxy resolution as the rate limiter
            // (rightmost XFF hop) — previously parsed raw x-forwarded-for here.
            ipHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashIp"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clientIp"])(req))
        }
    });
    return {
        token,
        expiresAt
    };
}
function setSessionCookie(res, token, expiresAt) {
    res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: ("TURBOPACK compile-time value", "development") === "production",
        path: "/",
        expires: expiresAt
    });
    return res;
}
function clearSessionCookie(res) {
    res.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: ("TURBOPACK compile-time value", "development") === "production",
        path: "/",
        maxAge: 0
    });
    return res;
}
async function getSessionUser(req) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.findUnique({
        where: {
            tokenHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(token)
        },
        include: {
            user: true
        }
    });
    if (!session) return null;
    if (session.revokedAt || session.expiresAt.getTime() < Date.now()) return null;
    if (session.user.status !== "ACTIVE") return null;
    // sec-batch-A — honest session-device drift detection. HARD request-time
    // UA/IP binding is deliberately NOT enforced (IP binding breaks mobile
    // users; docs/audit/SECURITY_AUDIT.md used to overstate this — corrected).
    // But a mid-session user-agent change on a live cookie is now AUDITED as
    // SESSION_DEVICE_CHANGE and the stored fingerprint refreshed, so a stolen
    // cookie used from a different device leaves a visible trail instead of
    // zero friction. (Known limitation: clients that rotate UA per request
    // would emit one event per distinct UA — rare, accepted.)
    const currentUa = (req.headers.get("user-agent") ?? "unknown").slice(0, 200);
    if (session.userAgent !== currentUa) {
        void __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.update({
            where: {
                id: session.id
            },
            data: {
                userAgent: currentUa
            }
        }).catch(()=>{});
        void (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: session.user.id,
            action: "SESSION_DEVICE_CHANGE",
            subjectType: "session",
            subjectId: session.id,
            metadata: {
                severity: "warn"
            }
        });
    }
    return session.user;
}
async function revokeSession(req) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return false;
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.updateMany({
        where: {
            tokenHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(token),
            revokedAt: null
        },
        data: {
            revokedAt: new Date()
        }
    });
    return result.count > 0;
}
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
"[project]/src/lib/services/devportal-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DAILY_QUOTA",
    ()=>DAILY_QUOTA,
    "KEY_TTL_DAYS",
    ()=>KEY_TTL_DAYS,
    "MAX_CLIENTS_PER_USER",
    ()=>MAX_CLIENTS_PER_USER,
    "MAX_KEYS_PER_CLIENT",
    ()=>MAX_KEYS_PER_CLIENT,
    "PortalError",
    ()=>PortalError,
    "addTeamMember",
    ()=>addTeamMember,
    "configureWebhook",
    ()=>configureWebhook,
    "createClient",
    ()=>createClient,
    "enableLive",
    ()=>enableLive,
    "getDailyQuotaState",
    ()=>getDailyQuotaState,
    "getDecisions",
    ()=>getDecisions,
    "getMembership",
    ()=>getMembership,
    "getPortalClient",
    ()=>getPortalClient,
    "getPortalForUser",
    ()=>getPortalForUser,
    "isValidWebhookUrlForTest",
    ()=>isValidWebhookUrlForTest,
    "mintApiKey",
    ()=>mintApiKey,
    "recordUsage",
    ()=>recordUsage,
    "removeTeamMember",
    ()=>removeTeamMember,
    "requireRole",
    ()=>requireRole,
    "revokeApiKey",
    ()=>revokeApiKey,
    "setPlan",
    ()=>setPlan
]);
// TrustScore Stage 9 — DeveloperPortalService (B2B portal core).
//
// ApiClient lifecycle: create (SANDBOX default), LIVE upgrade (typed
// confirmation — honesty label, providers stay MOCK), mock-billing plans
// with REAL daily quotas. ApiKeys: mint (raw shown ONCE, sha256 at rest),
// revoke, per-key counters. Team RBAC: OWNER / DEVELOPER / VIEWER enforced
// server-side via requireMembership — membership IS visibility.
//
// Honest billing: FREE (40 checks/day, 2 keys) and STARTER (500 checks/day,
// 5 keys) — quotas are enforced for real; the PLAN CARD states plainly that
// no payment processor is connected (mock billing). LIVE likewise states
// that identity providers remain contract-first MOCK.
//
// Usage: per-key daily rollups (ApiUsageDay, 90-day retention) + bounded
// per-request events (last 100 per key). Nothing in here carries PII.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$webhook$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/webhook-service.ts [app-route] (ecmascript)");
;
;
;
;
;
const MAX_CLIENTS_PER_USER = 3;
const MAX_KEYS_PER_CLIENT = {
    FREE: 2,
    STARTER: 5
};
const DAILY_QUOTA = {
    FREE: 40,
    STARTER: 500
};
const KEY_TTL_DAYS = 365;
const USAGE_DAYS_RETAINED = 90;
const USAGE_EVENTS_RETAINED = 100;
function todayKey() {
    return new Date().toISOString().slice(0, 10);
}
async function getMembership(userId, clientId) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiTeamMember.findUnique({
        where: {
            clientId_userId: {
                clientId,
                userId
            }
        }
    });
    return row ? {
        clientId: row.clientId,
        userId: row.userId,
        role: row.role
    } : null;
}
class PortalError extends Error {
    code;
    constructor(code, message){
        super(message);
        this.code = code;
    }
}
async function requireRole(userId, clientId, min) {
    const membership = await getMembership(userId, clientId);
    if (!membership) throw new PortalError("NOT_FOUND", "No such API client.");
    const rank = {
        VIEWER: 0,
        DEVELOPER: 1,
        OWNER: 2
    };
    if (rank[membership.role] < rank[min]) {
        throw new PortalError("FORBIDDEN", "Your team role does not allow this action.");
    }
    return membership;
}
async function createClient(userId, input) {
    const name = input.name.trim();
    if (name.length < 3 || name.length > 60) return {
        ok: false,
        code: "VALIDATION"
    };
    if (input.environment && ![
        "SANDBOX",
        "LIVE"
    ].includes(input.environment)) {
        return {
            ok: false,
            code: "VALIDATION"
        };
    }
    const owned = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.count({
        where: {
            ownerId: userId
        }
    });
    // Team memberships of OTHER people's clients do not count against you;
    // a member can OWN at most 3 clients (sandbox scale, honest quota).
    if (owned >= MAX_CLIENTS_PER_USER) return {
        ok: false,
        code: "LIMIT"
    };
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.create({
        data: {
            ownerId: userId,
            name,
            environment: input.environment ?? "SANDBOX"
        }
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiTeamMember.create({
        data: {
            clientId: row.id,
            userId,
            role: "OWNER",
            addedById: userId
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "DEV_CLIENT_CREATED",
        subjectType: "ApiClient",
        subjectId: row.id,
        metadata: {
            environment: row.environment
        }
    });
    const client = await getPortalClient(row.id, userId);
    return {
        ok: true,
        client: client
    };
}
async function enableLive(userId, clientId, confirm) {
    try {
        await requireRole(userId, clientId, "OWNER");
    } catch (e) {
        return {
            ok: false,
            code: e.code
        };
    }
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.findUnique({
        where: {
            id: clientId
        }
    });
    if (!row) return {
        ok: false,
        code: "NOT_FOUND"
    };
    if (row.environment === "LIVE") return {
        ok: false,
        code: "ALREADY_LIVE"
    };
    if (confirm !== "I UNDERSTAND") return {
        ok: false,
        code: "CONFIRM_REQUIRED"
    };
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.update({
        where: {
            id: clientId
        },
        data: {
            environment: "LIVE",
            liveEnabledAt: new Date()
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "DEV_CLIENT_LIVE_ENABLED",
        subjectType: "ApiClient",
        subjectId: clientId,
        metadata: {
            environment: "LIVE"
        }
    });
    const client = await getPortalClient(clientId, userId);
    return {
        ok: true,
        client: client
    };
}
async function setPlan(userId, clientId, plan) {
    try {
        await requireRole(userId, clientId, "OWNER");
    } catch (e) {
        return {
            ok: false,
            code: e.code
        };
    }
    if (![
        "FREE",
        "STARTER"
    ].includes(plan)) return {
        ok: false,
        code: "VALIDATION"
    };
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.update({
        where: {
            id: clientId
        },
        data: {
            plan
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "DEV_PLAN_CHANGED",
        subjectType: "ApiClient",
        subjectId: clientId,
        metadata: {
            plan
        }
    });
    const client = await getPortalClient(clientId, userId);
    return {
        ok: true,
        client: client
    };
}
async function mintApiKey(userId, clientId, name) {
    try {
        await requireRole(userId, clientId, "DEVELOPER");
    } catch (e) {
        return {
            ok: false,
            code: e.code
        };
    }
    const label = name.trim();
    if (label.length < 3 || label.length > 40) return {
        ok: false,
        code: "VALIDATION"
    };
    const client = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.findUnique({
        where: {
            id: clientId
        }
    });
    if (!client) return {
        ok: false,
        code: "NOT_FOUND"
    };
    const keyCap = MAX_KEYS_PER_CLIENT[client.plan] ?? 2;
    const active = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiKey.count({
        where: {
            clientId,
            status: "ACTIVE"
        }
    });
    if (active >= keyCap) return {
        ok: false,
        code: "LIMIT"
    };
    const envTag = client.environment === "LIVE" ? "live" : "sandbox";
    const secret = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(24).toString("hex"); // 192-bit
    const rawKey = `tsk_${envTag}_${secret}`;
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiKey.create({
        data: {
            clientId,
            name: label,
            keyPrefix: rawKey.slice(0, 14),
            keyHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(rawKey),
            expiresAt: new Date(Date.now() + KEY_TTL_DAYS * 24 * 60 * 60 * 1000)
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "API_KEY_MINTED",
        subjectType: "ApiKey",
        subjectId: row.id,
        metadata: {
            keyPrefix: row.keyPrefix,
            environment: client.environment
        }
    });
    return {
        ok: true,
        key: {
            id: row.id,
            name: row.name,
            keyPrefix: row.keyPrefix,
            scope: row.scope,
            expiresAt: row.expiresAt.toISOString(),
            createdAt: row.createdAt.toISOString(),
            rawKey
        }
    };
}
async function revokeApiKey(userId, keyId) {
    const key = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiKey.findUnique({
        where: {
            id: keyId
        },
        include: {
            client: true
        }
    });
    if (!key) return {
        ok: false,
        code: "NOT_FOUND"
    };
    try {
        await requireRole(userId, key.clientId, "DEVELOPER");
    } catch (e) {
        // A member without visibility gets NOT_FOUND (no existence leak).
        return {
            ok: false,
            code: e.code
        };
    }
    if (key.status !== "ACTIVE") return {
        ok: false,
        code: "ALREADY_REVOKED"
    };
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiKey.update({
        where: {
            id: keyId
        },
        data: {
            status: "REVOKED",
            revokedAt: new Date()
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "API_KEY_REVOKED",
        subjectType: "ApiKey",
        subjectId: keyId,
        metadata: {
            keyPrefix: key.keyPrefix
        }
    });
    return {
        ok: true
    };
}
// ---------------------------------------------------------------------------
// Webhook configuration
// ---------------------------------------------------------------------------
function validWebhookUrl(url, environment) {
    let parsed;
    try {
        parsed = new URL(url);
    } catch  {
        return false;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (environment === "LIVE") {
        // LIVE posture: https only, no localhost/private hosts. (Sandbox-honest —
        // underlying providers remain MOCK either way.)
        if (parsed.protocol !== "https:") return false;
        const h = parsed.hostname;
        if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.endsWith(".local")) {
            return false;
        }
    }
    return true;
}
async function configureWebhook(userId, clientId, input) {
    try {
        await requireRole(userId, clientId, "DEVELOPER");
    } catch (e) {
        return {
            ok: false,
            code: e.code
        };
    }
    const client = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.findUnique({
        where: {
            id: clientId
        }
    });
    if (!client) return {
        ok: false,
        code: "NOT_FOUND"
    };
    const url = input.url.trim();
    if (url === "") {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.update({
            where: {
                id: clientId
            },
            data: {
                webhookUrl: null
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: userId,
            action: "WEBHOOK_CONFIGURED",
            subjectType: "ApiClient",
            subjectId: clientId,
            metadata: {
                enabled: false
            }
        });
        return {
            ok: true,
            client: await getPortalClient(clientId, userId)
        };
    }
    if (!validWebhookUrl(url, client.environment)) {
        return {
            ok: false,
            code: "VALIDATION"
        };
    }
    const newSecret = input.rotateSecret || !client.webhookSecret ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$webhook$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateWebhookSecret"])() : null;
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.update({
        where: {
            id: clientId
        },
        data: {
            webhookUrl: url,
            ...newSecret ? {
                webhookSecret: newSecret
            } : {}
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "WEBHOOK_CONFIGURED",
        subjectType: "ApiClient",
        subjectId: clientId,
        metadata: {
            enabled: true,
            rotateSecret: Boolean(newSecret)
        }
    });
    return {
        ok: true,
        client: await getPortalClient(clientId, userId),
        ...newSecret ? {
            secret: newSecret
        } : {}
    };
}
async function addTeamMember(userId, clientId, input) {
    try {
        await requireRole(userId, clientId, "OWNER");
    } catch (e) {
        return {
            ok: false,
            code: e.code
        };
    }
    if (![
        "DEVELOPER",
        "VIEWER"
    ].includes(input.role)) return {
        ok: false,
        code: "VALIDATION"
    };
    const ident = input.identifier.trim().replace(/^@/, "").toLowerCase();
    if (!ident) return {
        ok: false,
        code: "VALIDATION"
    };
    const target = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findFirst({
        where: {
            OR: [
                {
                    handle: ident
                },
                {
                    email: input.identifier.trim()
                }
            ]
        }
    });
    if (!target) return {
        ok: false,
        code: "VALIDATION"
    };
    if (target.id === userId) return {
        ok: false,
        code: "SELF_OWNER"
    };
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiTeamMember.findUnique({
        where: {
            clientId_userId: {
                clientId,
                userId: target.id
            }
        }
    });
    if (existing) return {
        ok: false,
        code: "DUPLICATE"
    };
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiTeamMember.create({
        data: {
            clientId,
            userId: target.id,
            role: input.role,
            addedById: userId
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "DEV_TEAM_MEMBER_ADDED",
        subjectType: "ApiTeamMember",
        subjectId: `${clientId}:${target.id}`,
        metadata: {
            role: input.role
        }
    });
    const client = await getPortalClient(clientId, userId);
    return {
        ok: true,
        client: client
    };
}
async function removeTeamMember(userId, clientId, memberId) {
    try {
        await requireRole(userId, clientId, "OWNER");
    } catch (e) {
        return {
            ok: false,
            code: e.code
        };
    }
    const member = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiTeamMember.findUnique({
        where: {
            id: memberId
        }
    });
    if (!member || member.clientId !== clientId) return {
        ok: false,
        code: "NOT_FOUND"
    };
    if (member.role === "OWNER") return {
        ok: false,
        code: "OWNER_IMMUTABLE"
    };
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiTeamMember.delete({
        where: {
            id: memberId
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "DEV_TEAM_MEMBER_REMOVED",
        subjectType: "ApiTeamMember",
        subjectId: memberId,
        metadata: {
            role: member.role
        }
    });
    const client = await getPortalClient(clientId, userId);
    return {
        ok: true,
        client: client
    };
}
async function recordUsage(keyId, clientId, route, statusCode, outcome, latencyMs) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiKey.update({
        where: {
            id: keyId
        },
        data: {
            totalRequests: {
                increment: 1
            },
            lastUsedAt: new Date()
        }
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiUsageDay.upsert({
        where: {
            keyId_day: {
                keyId,
                day: todayKey()
            }
        },
        create: {
            keyId,
            clientId,
            day: todayKey(),
            checks: 1,
            errors: statusCode >= 400 ? 1 : 0
        },
        update: {
            checks: {
                increment: 1
            },
            errors: {
                increment: statusCode >= 400 ? 1 : 0
            }
        }
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiUsageEvent.create({
        data: {
            keyId,
            route,
            statusCode,
            outcome,
            latencyMs
        }
    });
    // Bounded retention (fire-and-forget discipline, awaited to keep tests deterministic)
    const events = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiUsageEvent.findMany({
        where: {
            keyId
        },
        orderBy: {
            createdAt: "desc"
        },
        skip: USAGE_EVENTS_RETAINED,
        select: {
            id: true
        }
    });
    if (events.length > 0) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiUsageEvent.deleteMany({
            where: {
                id: {
                    in: events.map((e)=>e.id)
                }
            }
        });
    }
}
async function getDailyQuotaState(clientId, plan) {
    const since = todayKey();
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiUsageDay.aggregate({
        where: {
            clientId,
            day: since
        },
        _sum: {
            checks: true
        }
    });
    return DAILY_QUOTA[plan] - (rows._sum.checks ?? 0);
}
async function pruneUsageDays(clientId) {
    const cutoff = new Date(Date.now() - USAGE_DAYS_RETAINED * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiUsageDay.deleteMany({
        where: {
            clientId,
            day: {
                lt: cutoff
            }
        }
    });
}
async function getPortalClient(clientId, viewerId) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.findUnique({
        where: {
            id: clientId
        },
        include: {
            keys: {
                orderBy: {
                    createdAt: "desc"
                }
            },
            team: {
                include: {
                    user: true
                },
                orderBy: {
                    createdAt: "asc"
                }
            },
            usageDays: {
                orderBy: {
                    day: "desc"
                },
                take: 14
            }
        }
    });
    const membership = row ? await getMembership(viewerId, clientId) : null;
    if (!row || !membership) return null;
    const usedToday = row.usageDays.filter((d)=>d.day === todayKey()).reduce((sum, d)=>sum + d.checks, 0);
    const decisionsCount = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustDecision.count({
        where: {
            clientId: row.id
        }
    });
    // 14-day window, oldest → newest, zero-filled for chart continuity.
    const byDay = new Map(row.usageDays.map((d)=>[
            d.day,
            d
        ]));
    const usage = [];
    for(let i = 13; i >= 0; i--){
        const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const d = byDay.get(day);
        usage.push({
            day,
            checks: d?.checks ?? 0,
            errors: d?.errors ?? 0
        });
    }
    return {
        id: row.id,
        name: row.name,
        environment: row.environment,
        status: row.status,
        plan: row.plan,
        role: membership.role,
        quota: {
            plan: DAILY_QUOTA[row.plan] ?? DAILY_QUOTA.FREE,
            usedToday,
            remaining: Math.max(0, (DAILY_QUOTA[row.plan] ?? DAILY_QUOTA.FREE) - usedToday)
        },
        usage,
        webhook: {
            url: row.webhookUrl,
            hasSecret: Boolean(row.webhookSecret),
            secretCreatedAt: null,
            recentDeliveries: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$webhook$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRecentDeliveries"])(row.id, 5)
        },
        keys: row.keys.map((k)=>({
                id: k.id,
                name: k.name,
                keyPrefix: k.keyPrefix,
                scope: k.scope,
                status: k.status,
                totalRequests: k.totalRequests,
                lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
                expiresAt: k.expiresAt?.toISOString() ?? null,
                revokedAt: k.revokedAt?.toISOString() ?? null,
                createdAt: k.createdAt.toISOString()
            })),
        team: row.team.map((m)=>({
                id: m.id,
                userId: m.userId,
                handle: m.user.handle,
                displayName: m.user.displayName,
                role: m.role,
                isYou: m.userId === viewerId,
                createdAt: m.createdAt.toISOString()
            })),
        decisionsCount,
        createdAt: row.createdAt.toISOString()
    };
}
async function getPortalForUser(userId) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$webhook$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["processDueDeliveries"])();
    const memberships = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiTeamMember.findMany({
        where: {
            userId
        },
        orderBy: {
            createdAt: "asc"
        }
    });
    const clients = [];
    for (const m of memberships){
        const c = await getPortalClient(m.clientId, userId);
        if (c) {
            clients.push(c);
            await pruneUsageDays(m.clientId);
        }
    }
    return {
        clients,
        limits: {
            maxClients: MAX_CLIENTS_PER_USER,
            plans: {
                FREE: {
                    quota: DAILY_QUOTA.FREE,
                    keys: MAX_KEYS_PER_CLIENT.FREE
                },
                STARTER: {
                    quota: DAILY_QUOTA.STARTER,
                    keys: MAX_KEYS_PER_CLIENT.STARTER
                }
            }
        }
    };
}
async function getDecisions(userId, clientId, take = 50) {
    try {
        await requireRole(userId, clientId, "VIEWER");
    } catch (e) {
        return {
            ok: false,
            code: e.code
        };
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$webhook$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["processDueDeliveries"])(clientId);
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustDecision.findMany({
        where: {
            clientId
        },
        orderBy: {
            createdAt: "desc"
        },
        take
    });
    return {
        ok: true,
        decisions: rows.map((r)=>({
                id: r.id,
                method: r.method,
                purpose: r.purpose,
                inputHint: r.inputHint,
                outcome: r.outcome,
                requestId: r.requestId,
                createdAt: r.createdAt.toISOString(),
                assessment: r.assessment ? JSON.parse(r.assessment) : null
            }))
    };
}
function isValidWebhookUrlForTest(url, environment) {
    return validWebhookUrl(url, environment);
}
}),
"[project]/src/lib/services/notification-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "notifyUser",
    ()=>notifyUser,
    "welcomeNotification",
    ()=>welcomeNotification
]);
// TrustScore Stage 1 — NotificationService plumbing (Security Center UI arrives Stage 5).
// Stage 12: SCORE type — material score-change receipts (see trustscore-service
// maybeNotifyScoreDrop; every receipt points at Score Insights, never a verdict).
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
;
async function notifyUser(userId, type, title, body) {
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].notification.create({
            data: {
                userId,
                type,
                title,
                body
            }
        });
    } catch (err) {
        console.error("[notification] failed:", err.message);
    }
}
function welcomeNotification(displayName) {
    const first = displayName.split(" ")[0] || "there";
    return {
        title: "Welcome to TrustScore",
        body: `Welcome, ${first}. Your account is ready and your @handle is reserved. Identity verification through NINAuth arrives in Stage 2 — we'll notify you here.`
    };
}
}),
"[project]/src/lib/services/policy-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_RULES",
    ()=>DEFAULT_RULES,
    "DPIA_CHECKLIST",
    ()=>DPIA_CHECKLIST,
    "DPIA_CHECKLIST_LABELS",
    ()=>DPIA_CHECKLIST_LABELS,
    "POLICY_V1_SUMMARY",
    ()=>POLICY_V1_SUMMARY,
    "activatePolicy",
    ()=>activatePolicy,
    "createDraft",
    ()=>createDraft,
    "ensurePoliciesSeeded",
    ()=>ensurePoliciesSeeded,
    "getActivePolicy",
    ()=>getActivePolicy,
    "listPolicies",
    ()=>listPolicies,
    "policyRulesHash",
    ()=>policyRulesHash,
    "shapePolicy",
    ()=>shapePolicy,
    "validateRules",
    ()=>validateRules
]);
// TrustScore Stage 8 — Trust Engine policy layer (audit §4.2).
//
// Rules-first: every number the engine uses lives in a versioned ScoringPolicy
// row (append-only). The DEFAULT_RULES below are policy v1 — the exact
// §36/directive budgets shipped in Stage 5–7, now made explicit and
// configurable. The engine NEVER trusts un-validated config: all writes go
// through validateRules() which clamps/normalizes every field.
//
// Lifecycle: DRAFT → ACTIVE → RETIRED. Activating a new version retires the
// previous one; snapshots name the policyId that produced them, so every
// historical score stays explainable forever. A policy may only activate when
// a COMPLETED DPIA record covers it (NDPC guidance gate — see
// dpia-service.ts / engine-gate).
//
// Admin surface is an OPERATIONAL grant (ADMIN role), like the Stage 7
// reviewer grant: never self-service, always audited.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/crypto.ts [app-route] (ecmascript)");
;
;
const DEFAULT_RULES = {
    assuranceBase: [
        0,
        20,
        34,
        47,
        60
    ],
    freshnessFullDays: 15,
    freshnessMinFactor: 0.75,
    credentialPoints: 6,
    credentialMax: 20,
    interactionPoints: 3,
    interactionWindowDays: 90,
    interactionMax: 5,
    clearedPoints: 2,
    clearedMax: 5,
    riskPenaltyPer: 25,
    riskMaxPenalty: 50,
    riskHighAt: 2,
    snapshotTtlHours: 24,
    establishedMinLevel: 2
};
const POLICY_V1_SUMMARY = "Policy v1 — the directive §36 budgets as shipped through Stage 7: Identity Assurance max 60 (L1 20 / L2 34 / L3 47 / L4 60, freshness-scaled), Credentials 6 per fresh credential (max 20), Reputation +3 per distinct consented L2+ verifier in 90 days (max 5), Resolution +2 per cleared flag (max 5), Confirmed Risk −25 per human-confirmed flag (cap −50), 24h snapshot freshness.";
function clampInt(n, min, max, fallback) {
    const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
    return Math.max(min, Math.min(max, v));
}
function clampFactor(n, min, max, fallback) {
    const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
    return Math.max(min, Math.min(max, v));
}
function validateRules(input) {
    const raw = input ?? {};
    const warnings = [];
    let base = DEFAULT_RULES.assuranceBase.map((x)=>x);
    if (Array.isArray(raw.assuranceBase)) {
        base = raw.assuranceBase.slice(0, 5).map((x)=>clampInt(x, 0, 60, 0));
    }
    while(base.length < 5)base.push(0);
    // Monotonic non-decreasing ladder
    for(let i = 1; i < 5; i++){
        if (base[i] < base[i - 1]) {
            base[i] = base[i - 1];
            warnings.push(`assuranceBase L${i} raised to L${i - 1}'s value (ladder must be monotonic).`);
        }
    }
    const assuranceMax = base[4];
    if (assuranceMax > 60) warnings.push("Identity Assurance budget exceeds 60 — clamped at write time by schema contract.");
    const rules = {
        assuranceBase: base,
        freshnessFullDays: clampInt(raw.freshnessFullDays, 1, 365, DEFAULT_RULES.freshnessFullDays),
        freshnessMinFactor: clampFactor(raw.freshnessMinFactor, 0.1, 1, DEFAULT_RULES.freshnessMinFactor),
        credentialPoints: clampInt(raw.credentialPoints, 0, 20, DEFAULT_RULES.credentialPoints),
        credentialMax: clampInt(raw.credentialMax, 0, 40, DEFAULT_RULES.credentialMax),
        interactionPoints: clampInt(raw.interactionPoints, 0, 10, DEFAULT_RULES.interactionPoints),
        interactionWindowDays: clampInt(raw.interactionWindowDays, 1, 365, DEFAULT_RULES.interactionWindowDays),
        interactionMax: clampInt(raw.interactionMax, 1, 20, DEFAULT_RULES.interactionMax),
        clearedPoints: clampInt(raw.clearedPoints, 0, 10, DEFAULT_RULES.clearedPoints),
        clearedMax: clampInt(raw.clearedMax, 1, 20, DEFAULT_RULES.clearedMax),
        riskPenaltyPer: clampInt(raw.riskPenaltyPer, 0, 50, DEFAULT_RULES.riskPenaltyPer),
        riskMaxPenalty: clampInt(raw.riskMaxPenalty, 0, 100, DEFAULT_RULES.riskMaxPenalty),
        riskHighAt: clampInt(raw.riskHighAt, 1, 10, DEFAULT_RULES.riskHighAt),
        snapshotTtlHours: clampInt(raw.snapshotTtlHours, 1, 168, DEFAULT_RULES.snapshotTtlHours),
        establishedMinLevel: clampInt(raw.establishedMinLevel, 1, 4, DEFAULT_RULES.establishedMinLevel)
    };
    // Structural sanity warnings (governance surface — not silent clamps)
    const totalMax = rules.assuranceBase[4] + rules.credentialMax + rules.interactionMax * rules.interactionPoints + rules.clearedMax * rules.clearedPoints;
    if (totalMax > 100) {
        warnings.push(`Component budgets sum to ${totalMax} > 100 — the engine clamps final scores to 0–100, but budgets should be re-balanced.`);
    }
    return {
        rules,
        warnings
    };
}
// ---------------------------------------------------------------------------
// Seed + resolution
// ---------------------------------------------------------------------------
// ensurePoliciesSeeded — idempotent: creates policy v1 (ACTIVE) + the v1
// DPIA record (COMPLETED, covering the shipped rules) on first call, plus
// the automated-decision gate setting. Called by the engine read path and
// the admin routes. Guarded against concurrent double-seeding via an
// in-flight promise + unique-constraint tolerance.
const globalForSeed = globalThis;
async function ensurePoliciesSeeded() {
    if (globalForSeed.__tsPolicySeed) return globalForSeed.__tsPolicySeed;
    globalForSeed.__tsPolicySeed = (async ()=>{
        // Self-healing seed: each piece is idempotent, so a partially-seeded DB
        // (e.g. after a historical race) converges on the complete state.
        let v1 = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].scoringPolicy.findUnique({
            where: {
                version: 1
            }
        });
        if (!v1) {
            try {
                v1 = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].scoringPolicy.create({
                    data: {
                        version: 1,
                        status: "ACTIVE",
                        rules: JSON.stringify(DEFAULT_RULES),
                        changeSummary: POLICY_V1_SUMMARY,
                        createdBy: "platform-seed",
                        activatedAt: new Date()
                    }
                });
            } catch (e) {
                // P2002 = another worker seeded v1 concurrently.
                if (e.code !== "P2002") throw e;
                v1 = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].scoringPolicy.findUniqueOrThrow({
                    where: {
                        version: 1
                    }
                });
            }
        }
        const dpia = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dpiaRecord.findFirst({
            where: {
                policyId: v1.id
            }
        });
        if (!dpia) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dpiaRecord.create({
                data: {
                    policyId: v1.id,
                    status: "COMPLETED",
                    summary: "DPIA for scoring policy v1 (seeded with the platform): profiling scope limited to platform-recorded verification evidence, reputation and human decisions; no special-category data; explanation, human-review and appeal rights per NDPA §37/§31; automated decisions are limited to score presentation (no auto-blocking) — significant-decision automation stays gated.",
                    residualRisk: "LOW",
                    checklist: JSON.stringify(DPIA_CHECKLIST.map((c)=>({
                            ...c,
                            done: true
                        }))),
                    completedAt: new Date(),
                    createdBy: "platform-seed"
                }
            });
        }
        const setting = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.findUnique({
            where: {
                key: "engine.automatedSignificantDecisions"
            }
        });
        if (!setting) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.create({
                data: {
                    key: "engine.automatedSignificantDecisions",
                    value: JSON.stringify({
                        enabled: false,
                        note: "DPIA-gated — NDPC guidance; must stay false until a full DPIA covers the expanded decision surface."
                    })
                }
            });
        }
    })();
    return globalForSeed.__tsPolicySeed;
}
function shapePolicy(row) {
    const { rules } = validateRules(JSON.parse(row.rules));
    return {
        id: row.id,
        version: row.version,
        status: row.status,
        rules,
        changeSummary: row.changeSummary,
        activatedAt: row.activatedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString()
    };
}
async function getActivePolicy() {
    await ensurePoliciesSeeded();
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].scoringPolicy.findFirst({
        where: {
            status: "ACTIVE"
        },
        orderBy: {
            version: "desc"
        }
    });
    return row ? shapePolicy(row) : null;
}
async function listPolicies() {
    await ensurePoliciesSeeded();
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].scoringPolicy.findMany({
        orderBy: {
            version: "desc"
        }
    });
    return rows.map(shapePolicy);
}
async function createDraft(adminId, input) {
    const { rules, warnings } = validateRules(input.rules);
    if (typeof input.changeSummary !== "string" || input.changeSummary.trim().length < 30) {
        return {
            ok: false,
            code: "VALIDATION"
        };
    }
    const max = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].scoringPolicy.aggregate({
        _max: {
            version: true
        }
    });
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].scoringPolicy.create({
        data: {
            version: (max._max.version ?? 0) + 1,
            status: "DRAFT",
            rules: JSON.stringify(rules),
            changeSummary: input.changeSummary.trim().slice(0, 2000),
            createdBy: adminId
        }
    });
    return {
        ok: true,
        policy: shapePolicy(row),
        warnings
    };
}
async function activatePolicy(policyId, adminId) {
    const draft = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].scoringPolicy.findUnique({
        where: {
            id: policyId
        }
    });
    if (!draft) return {
        ok: false,
        code: "NOT_FOUND"
    };
    if (draft.status !== "DRAFT") return {
        ok: false,
        code: "ALREADY_ACTIVE"
    };
    const dpia = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dpiaRecord.findFirst({
        where: {
            policyId: draft.id,
            status: "COMPLETED"
        },
        orderBy: {
            completedAt: "desc"
        }
    });
    if (!dpia) return {
        ok: false,
        code: "DPIA_REQUIRED"
    };
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].$transaction(async (tx)=>{
        await tx.scoringPolicy.updateMany({
            where: {
                status: "ACTIVE"
            },
            data: {
                status: "RETIRED"
            }
        });
        await tx.scoringPolicy.update({
            where: {
                id: draft.id
            },
            data: {
                status: "ACTIVE",
                activatedAt: new Date()
            }
        });
    });
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].scoringPolicy.findUnique({
        where: {
            id: draft.id
        }
    });
    return {
        ok: true,
        policy: shapePolicy(row)
    };
}
function policyRulesHash(rules) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(JSON.stringify(rules)).slice(0, 16);
}
const DPIA_CHECKLIST = [
    {
        id: "scope",
        label: "Profiling scope mapped (data categories, sources, subjects)"
    },
    {
        id: "special",
        label: "No special-category data processed without legal basis"
    },
    {
        id: "necessity",
        label: "Proportionality & necessity of each score input reviewed"
    },
    {
        id: "rights",
        label: "NDPA rights paths verified (explanation, review, appeal, DSR)"
    },
    {
        id: "bias",
        label: "Bias / disparate-impact review of component weights"
    },
    {
        id: "security",
        label: "Security measures for score data reviewed (access, retention)"
    },
    {
        id: "human",
        label: "Human-in-the-loop for adverse outcomes (flags → reviewer)"
    },
    {
        id: "retention",
        label: "Retention & deletion schedule aligned with DSR cascade"
    }
];
const DPIA_CHECKLIST_LABELS = Object.fromEntries(DPIA_CHECKLIST.map((c)=>[
        c.id,
        c.label
    ]));
}),
"[project]/src/lib/services/trustscore-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MATERIAL_DROP_POINTS",
    ()=>MATERIAL_DROP_POINTS,
    "SCORE_VERSION",
    ()=>SCORE_VERSION,
    "SNAPSHOT_RETAIN",
    ()=>SNAPSHOT_RETAIN,
    "SNAPSHOT_TTL_MS",
    ()=>SNAPSHOT_TTL_MS,
    "computeScoreFromInputs",
    ()=>computeScoreFromInputs,
    "credentialLabel",
    ()=>credentialLabel,
    "getCredentialsForUser",
    ()=>getCredentialsForUser,
    "getScoreSnapshot",
    ()=>getScoreSnapshot,
    "markMaterialChange",
    ()=>markMaterialChange,
    "maskEmail",
    ()=>maskEmail,
    "simulatePolicyImpact",
    ()=>simulatePolicyImpact,
    "syncCredentials",
    ()=>syncCredentials
]);
// TrustScore Stage 5–8 — TrustScore engine (directive §35/§36 score contract).
//
// Formula (directive §36):
//   score = Identity Assurance + Verified Reputation + Verified Credentials
//           + Resolution History − Confirmed Risk
//
// Stage 8 (Trust Engine): every budget/threshold/window now lives in a
// versioned ScoringPolicy row (rules-first, append-only). This module keeps
// the §36 math but reads its numbers from the ACTIVE policy — policy v1 is
// byte-for-byte the budgets shipped in Stage 5–7, so scores are unchanged
// until a new policy version is deliberately activated.
//
// Output contract: Score (0–100) + Confidence (0–100) + Risk Band
// (LOW/MEDIUM/HIGH) + Status (NEW/VERIFIED/ESTABLISHED/CAUTION/HIGH_RISK/
// REVIEW_REQUIRED) + Explanation[] + Freshness (computedAt → expiresAt) +
// State (ACTIVE/STALE/FROZEN/RETIRED) + policy version.
//
// Snapshots are immutable rows: a new one is written when inputs change
// (inputsHash incl. policy hash) or the TTL lapses. Old snapshots beyond the
// latest 20 are pruned. The engine NEVER says "this person is safe"
// (directive §50) — the public card language is locked to "No confirmed
// adverse signals found".
// While the latest snapshot is FROZEN (appeal pending), getScoreSnapshot
// serves it verbatim — no recompute, no new rows (fairness guarantee).
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/notification-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/policy-service.ts [app-route] (ecmascript)");
;
;
;
;
const SCORE_VERSION = 1;
const SNAPSHOT_RETAIN = 50; // last N snapshots kept per user
const ASSURANCE_BASE = {
    0: 0,
    1: 20,
    2: 34,
    3: 47,
    4: 60
};
const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
// Verified-interaction horizon: checks older than the policy window stop
// counting — reputation must be earned continuously, not banked once.
const INTERACTION_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
async function collectReputationInputs(userId, interactionWindowDays) {
    const windowMs = interactionWindowDays && interactionWindowDays > 0 ? interactionWindowDays * 24 * 60 * 60 * 1000 : INTERACTION_WINDOW_MS;
    const flags = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.findMany({
        where: {
            subjectId: userId
        },
        select: {
            status: true
        }
    });
    const confirmedFlags = flags.filter((f)=>f.status === "RESOLVED_CONFIRMED").length;
    const clearedFlags = flags.filter((f)=>[
            "RESOLVED_UNFOUNDED",
            "RESOLVED_DISMISSED"
        ].includes(f.status)).length;
    // Verified interactions: distinct verifiers who ran a CONSENT-BACKED check
    // (handle / trust link / QR — never the anonymous phone probe) on this
    // member within the window, and who currently hold L2+.
    const checks = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.findMany({
        where: {
            subjectId: userId,
            method: {
                in: [
                    "HANDLE",
                    "TRUST_LINK",
                    "QR"
                ]
            },
            createdAt: {
                gte: new Date(Date.now() - windowMs)
            }
        },
        select: {
            verifierId: true
        }
    });
    const verifierIds = [
        ...new Set(checks.map((c)=>c.verifierId))
    ].filter((id)=>id !== userId);
    // Stage 10 — TrustGraph edges: mutual verified interactions with ACTIVE
    // edges (activated within the window). They join the SAME distinct-verifier
    // set — an edge partner who also ran a check is ONE verifier, never two.
    // Counting requires: both memberships ACTIVE + partner identity live L2+.
    const edges = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.findMany({
        where: {
            status: "ACTIVE",
            OR: [
                {
                    aUserId: userId
                },
                {
                    bUserId: userId
                }
            ]
        },
        select: {
            aUserId: true,
            bUserId: true,
            activatedAt: true
        }
    });
    const edgePartnerIds = edges.filter((e)=>(e.activatedAt?.getTime() ?? 0) >= Date.now() - windowMs).map((e)=>e.aUserId === userId ? e.bUserId : e.aUserId);
    const candidateIds = [
        ...new Set([
            ...verifierIds,
            ...edgePartnerIds
        ])
    ];
    // The subject's OWN membership gates their edges: a paused member's
    // attestations stop counting immediately (checks still count — consent
    // for those lives in the SAFETY_CHECK consent, not here).
    const subjectMembership = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUnique({
        where: {
            userId
        },
        select: {
            status: true
        }
    });
    const subjectActive = subjectMembership?.status === "ACTIVE";
    if (candidateIds.length > 0) {
        const [identities, memberships] = await Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findMany({
                where: {
                    userId: {
                        in: candidateIds
                    }
                },
                select: {
                    userId: true,
                    status: true,
                    assuranceLevel: true,
                    expiresAt: true
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findMany({
                where: {
                    userId: {
                        in: candidateIds
                    },
                    status: "ACTIVE"
                },
                select: {
                    userId: true
                }
            })
        ]);
        const now = Date.now();
        const memberIds = new Set(memberships.map((m)=>m.userId));
        // An edge counts only when BOTH endpoints hold ACTIVE memberships.
        const countingEdgePartners = new Set(subjectActive ? edgePartnerIds.filter((id)=>memberIds.has(id)) : []);
        let verifiedInteractions = 0;
        let networkInteractions = 0;
        for (const id of identities){
            const live = id.status === "VERIFIED" && (id.expiresAt?.getTime() ?? 0) > now;
            if (!live || id.assuranceLevel < 2) continue;
            const isCheckVerifier = verifierIds.includes(id.userId);
            const isCountingEdge = countingEdgePartners.has(id.userId);
            if (isCheckVerifier || isCountingEdge) verifiedInteractions += 1;
            if (isCountingEdge && !isCheckVerifier) networkInteractions += 1;
        }
        return {
            verifiedInteractions,
            networkInteractions,
            clearedFlags,
            confirmedFlags
        };
    }
    return {
        verifiedInteractions: 0,
        networkInteractions: 0,
        clearedFlags,
        confirmedFlags
    };
}
async function collectInputs(userId, interactionWindowDays) {
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
        where: {
            userId
        },
        select: {
            status: true,
            assuranceLevel: true,
            expiresAt: true,
            verifiedAt: true,
            evidence: {
                where: {
                    status: "ACTIVE"
                },
                select: {
                    id: true,
                    type: true,
                    confidence: true,
                    expiresAt: true
                }
            }
        }
    });
    const credentials = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].credential.findMany({
        where: {
            userId
        },
        select: {
            id: true,
            type: true,
            status: true,
            expiresAt: true,
            manualRevoked: true
        }
    });
    const reputation = await collectReputationInputs(userId, interactionWindowDays);
    return {
        identity: identity ? {
            status: identity.status,
            assuranceLevel: identity.assuranceLevel,
            govExpiresAt: identity.expiresAt,
            verifiedAt: identity.verifiedAt
        } : null,
        activeEvidence: (identity?.evidence ?? []).map((e)=>({
                id: e.id,
                type: e.type,
                status: "ACTIVE",
                confidence: e.confidence,
                expiresAt: e.expiresAt
            })),
        credentials,
        verifiedInteractions: reputation.verifiedInteractions,
        networkInteractions: reputation.networkInteractions,
        clearedFlags: reputation.clearedFlags,
        confirmedFlags: reputation.confirmedFlags
    };
}
function inputsHashFor(inputs) {
    const canonical = JSON.stringify({
        i: inputs.identity ? [
            inputs.identity.status,
            inputs.identity.assuranceLevel,
            inputs.identity.govExpiresAt?.getTime() ?? null
        ] : null,
        e: inputs.activeEvidence.map((e)=>[
                e.id,
                e.status ?? "ACTIVE",
                e.expiresAt?.getTime() ?? null
            ]).sort(),
        c: inputs.credentials.map((c)=>[
                c.type,
                c.status,
                c.manualRevoked
            ]).sort(),
        r: [
            inputs.confirmedFlags,
            inputs.clearedFlags,
            inputs.verifiedInteractions,
            inputs.networkInteractions
        ]
    });
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(canonical);
}
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
function computeScoreFromInputs(inputs, trigger, rules, ttlMs) {
    const now = Date.now();
    const identityLive = inputs.identity !== null && inputs.identity.status === "VERIFIED" && (inputs.identity.govExpiresAt?.getTime() ?? 0) > now;
    const identityStale = inputs.identity !== null && inputs.identity.status === "VERIFIED" && (inputs.identity.govExpiresAt?.getTime() ?? 0) <= now;
    const level = identityLive ? inputs.identity.assuranceLevel : 0;
    const ASSURANCE = {
        0: rules.assuranceBase[0],
        1: rules.assuranceBase[1],
        2: rules.assuranceBase[2],
        3: rules.assuranceBase[3],
        4: rules.assuranceBase[4]
    };
    // --- Identity Assurance (budget: assuranceBase[4]) ----------------------
    const govDaysLeft = identityLive ? Math.max(0, (inputs.identity.govExpiresAt.getTime() - now) / 86_400_000) : 0;
    const freshnessFactor = !identityLive ? 0 : govDaysLeft >= rules.freshnessFullDays ? 1 : govDaysLeft >= 1 ? Math.max(rules.freshnessMinFactor, 0.9) : rules.freshnessMinFactor;
    const assuranceValue = Math.round((ASSURANCE[clamp(level, 0, 4)] ?? 0) * freshnessFactor);
    // --- Verified Credentials (policy: credentialPoints/credentialMax) ------
    const freshCredentials = inputs.credentials.filter((c)=>c.status === "ACTIVE" && (c.expiresAt?.getTime() ?? Infinity) > now);
    const credentialValue = clamp(freshCredentials.length * rules.credentialPoints, 0, rules.credentialMax);
    // --- Verified Reputation / Resolution History (policy-driven) ----------
    const reputationValue = Math.min(rules.interactionMax, inputs.verifiedInteractions) * rules.interactionPoints;
    const resolutionValue = Math.min(rules.clearedMax, inputs.clearedFlags) * rules.clearedPoints;
    // --- Confirmed Risk (policy: riskPenaltyPer/riskMaxPenalty) ------------
    const riskPenalty = Math.min(Math.floor(rules.riskMaxPenalty / Math.max(1, rules.riskPenaltyPer)), inputs.confirmedFlags) * rules.riskPenaltyPer;
    const score = clamp(assuranceValue + credentialValue + reputationValue + resolutionValue - riskPenalty, 0, 100);
    // --- Confidence -----------------------------------------------------------
    const freshEvidence = inputs.activeEvidence.filter((e)=>(e.expiresAt?.getTime() ?? Infinity) > now);
    const allFresh = freshEvidence.length === inputs.activeEvidence.length && identityLive;
    const confidence = !inputs.identity ? 15 : clamp(40 + Math.min(40, freshEvidence.length * 10) + (allFresh ? 20 : 0), 0, 100);
    // --- Status + risk band ---------------------------------------------------
    let status;
    let riskBand;
    if (inputs.confirmedFlags > 0) {
        status = inputs.confirmedFlags >= rules.riskHighAt ? "HIGH_RISK" : "REVIEW_REQUIRED";
        riskBand = "HIGH";
    } else if (identityStale) {
        status = "CAUTION";
        riskBand = "MEDIUM";
    } else if (!inputs.identity || inputs.identity.status === "NONE" || level === 0) {
        status = "NEW";
        riskBand = "MEDIUM";
    } else if (level >= rules.establishedMinLevel) {
        status = "ESTABLISHED";
        riskBand = "LOW";
    } else {
        status = "VERIFIED";
        riskBand = "LOW";
    }
    // --- Explanation (NDPA §37 — meaningful, per-component) -------------------
    const explanation = [];
    if (!inputs.identity) {
        explanation.push("No Trust Identity yet — this account is unverified, so the score starts at zero.");
    } else {
        explanation.push(`Identity Assurance ${assuranceValue}/${ASSURANCE[4]}: government record ${identityLive ? "verified" : identityStale ? "past its freshness horizon" : inputs.identity.status.toLowerCase()}, assurance level L${level}${identityLive ? `, ${Math.round(govDaysLeft)} days of freshness left` : ""}.`);
        explanation.push(freshCredentials.length > 0 ? `Verified Credentials ${credentialValue}/${rules.credentialMax}: ${freshCredentials.length} active credential${freshCredentials.length === 1 ? "" : "s"} backed by live evidence (${freshCredentials.map((c)=>c.type.replace("_VERIFIED", "").replace(/_/g, " ").toLowerCase()).join(", ")}).` : `Verified Credentials 0/${rules.credentialMax}: no active credentials — verify signals to earn them.`);
        explanation.push(inputs.verifiedInteractions > 0 ? `Verified Reputation ${reputationValue}/${rules.interactionMax * rules.interactionPoints}: ${inputs.verifiedInteractions} verified interaction${inputs.verifiedInteractions === 1 ? "" : "s"} with distinct verified members (consent-backed checks${inputs.networkInteractions > 0 ? ` plus ${inputs.networkInteractions} mutual Trust Network attestation${inputs.networkInteractions === 1 ? "" : "s"}` : ""} in the last ${rules.interactionWindowDays} days, +${rules.interactionPoints} each, capped at ${rules.interactionMax}).` : `Verified Reputation 0/${rules.interactionMax * rules.interactionPoints}: no consent-backed checks or network attestations in the last ${rules.interactionWindowDays} days — an honest zero, not a negative signal.`);
        explanation.push(inputs.clearedFlags > 0 ? `Resolution History ${resolutionValue}/${rules.clearedMax * rules.clearedPoints}: ${inputs.clearedFlags} flag${inputs.clearedFlags === 1 ? " was" : "s were"} raised against you and cleared by human review (+${rules.clearedPoints} each, capped at ${rules.clearedMax}).` : `Resolution History 0/${rules.clearedMax * rules.clearedPoints}: no human-reviewed flag resolutions on record yet — an honest zero, not a negative signal.`);
        explanation.push(riskPenalty > 0 ? `Confirmed Risk −${riskPenalty}: ${inputs.confirmedFlags} confirmed flag${inputs.confirmedFlags === 1 ? "" : "s"} on record after human review. You can appeal a confirmation for 14 days — while an appeal is pending, your score is frozen so it cannot move against you.` : `Confirmed Risk −0: no confirmed adverse signals found. This is a statement about recorded evidence only — never a guarantee that a person is safe to deal with.`);
        explanation.push(`Confidence ${confidence}/100: based on ${freshEvidence.length} fresh evidence record${freshEvidence.length === 1 ? "" : "s"}${allFresh ? " with all signals inside their freshness horizons" : " (some signals are stale)"}.`);
    }
    explanation.push("Under NDPA §37 you can request human review of this decision; confirmed flags can be appealed for 14 days after the reviewer's decision.");
    return {
        status,
        score,
        confidence,
        riskBand,
        components: [
            {
                key: "identityAssurance",
                label: "Identity Assurance",
                value: assuranceValue,
                max: ASSURANCE[4],
                note: identityLive ? `Government-verified, L${level}${freshnessFactor < 1 ? ", freshness-scaled" : ""}` : "No live government verification"
            },
            {
                key: "verifiedCredentials",
                label: "Verified Credentials",
                value: credentialValue,
                max: rules.credentialMax,
                note: `${freshCredentials.length} active, evidence-backed (+${rules.credentialPoints} each)`
            },
            {
                key: "verifiedReputation",
                label: "Verified Reputation",
                value: reputationValue,
                max: rules.interactionMax * rules.interactionPoints,
                note: inputs.verifiedInteractions > 0 ? `${inputs.verifiedInteractions} verified interaction${inputs.verifiedInteractions === 1 ? "" : "s"} (${rules.interactionWindowDays}-day window)${inputs.networkInteractions > 0 ? `, incl. ${inputs.networkInteractions} network attestation${inputs.networkInteractions === 1 ? "" : "s"}` : ""}` : `No verified interactions in the last ${rules.interactionWindowDays} days`
            },
            {
                key: "resolutionHistory",
                label: "Resolution History",
                value: resolutionValue,
                max: rules.clearedMax * rules.clearedPoints,
                note: inputs.clearedFlags > 0 ? `${inputs.clearedFlags} flag${inputs.clearedFlags === 1 ? "" : "s"} cleared by human review` : "No cleared flags on record yet"
            },
            {
                key: "confirmedRisk",
                label: "Confirmed Risk",
                value: -riskPenalty,
                max: 0,
                note: inputs.confirmedFlags > 0 ? `${inputs.confirmedFlags} confirmed flag${inputs.confirmedFlags === 1 ? "" : "s"} (human-reviewed, appealable; −${rules.riskPenaltyPer} each, cap −${rules.riskMaxPenalty})` : `No confirmed flags on record (−${rules.riskPenaltyPer} each when confirmed)`
            }
        ],
        explanation,
        // Combined hash: inputs + the policy rules that interpreted them —
        // a policy change invalidates every cached snapshot (Stage 8).
        inputsHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(inputsHashFor(inputs) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["policyRulesHash"])(rules)),
        trigger,
        computedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + ttlMs).toISOString(),
        policyVersion: 0
    };
}
function shapeSnapshot(row) {
    const state = row.state === "FROZEN" ? "FROZEN" : row.state === "RETIRED" ? "RETIRED" : row.expiresAt.getTime() > Date.now() ? "ACTIVE" : "STALE";
    return {
        id: row.id,
        version: row.version,
        status: row.status,
        score: row.score,
        confidence: row.confidence,
        riskBand: row.riskBand,
        components: JSON.parse(row.components),
        explanation: JSON.parse(row.explanation),
        trigger: row.trigger,
        computedAt: row.computedAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        fresh: row.expiresAt.getTime() > Date.now(),
        // Stage 8 — lifecycle + policy provenance
        state,
        policyId: row.policyId ?? null,
        frozenAt: row.frozenAt?.toISOString() ?? null,
        frozenReason: row.frozenReason ?? null
    };
}
async function persistSnapshot(userId, computed, policyId) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.create({
        data: {
            userId,
            version: SCORE_VERSION,
            status: computed.status,
            score: computed.score,
            confidence: computed.confidence,
            riskBand: computed.riskBand,
            components: JSON.stringify(computed.components),
            explanation: JSON.stringify(computed.explanation),
            inputsHash: computed.inputsHash,
            trigger: computed.trigger,
            expiresAt: new Date(computed.expiresAt),
            state: "ACTIVE",
            policyId
        }
    });
    // Prune: keep the latest SNAPSHOT_RETAIN snapshots per user.
    const stale = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.findMany({
        where: {
            userId
        },
        orderBy: {
            computedAt: "desc"
        },
        skip: SNAPSHOT_RETAIN,
        select: {
            id: true
        }
    });
    if (stale.length > 0) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.deleteMany({
            where: {
                id: {
                    in: stale.map((s)=>s.id)
                }
            }
        });
    }
}
async function getScoreSnapshot(userId) {
    const latest = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.findFirst({
        where: {
            userId
        },
        orderBy: {
            computedAt: "desc"
        }
    });
    // Stage 8 — FREEZE (appeal pending): serve the frozen row verbatim.
    // The score cannot move — up or down — until the human decision lands.
    if (latest && latest.state === "FROZEN") {
        return shapeSnapshot(latest);
    }
    // Stage 8 — the ACTIVE policy drives the numbers AND the inputsHash:
    // a policy change recomputes every user (new snapshot names the policy).
    const policy = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getActivePolicy"])();
    const rules = policy?.rules;
    if (!rules) {
        // Unreachable in practice (seed guarantees v1) — guard for type safety.
        if (latest) return shapeSnapshot(latest);
        throw new Error("No active scoring policy");
    }
    const ttlMs = rules.snapshotTtlHours * 60 * 60 * 1000;
    const inputs = await collectInputs(userId, rules.interactionWindowDays);
    const hash = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(inputsHashFor(inputs) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["policyRulesHash"])(rules));
    if (latest && latest.inputsHash === hash && latest.expiresAt.getTime() > Date.now() && latest.policyId === policy.id) {
        return shapeSnapshot(latest);
    }
    const trigger = latest === undefined || latest === null ? "INITIAL" : latest.inputsHash !== hash || latest.policyId !== policy.id ? "MATERIAL_CHANGE" : "PERIODIC";
    const computed = computeScoreFromInputs(inputs, trigger, rules, ttlMs);
    computed.policyVersion = policy.version;
    await persistSnapshot(userId, computed, policy.id);
    // Stage 12 — material score-drop receipt: the member is notified the
    // moment their score moves materially DOWN (points, band or status),
    // pointed at Score Insights. Never a verdict — a pointer to the record.
    await maybeNotifyScoreDrop(userId, latest ?? null, computed, {
        policyChanged: latest ? latest.policyId !== policy.id : false,
        policyVersion: policy.version
    });
    const fresh = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.findFirst({
        where: {
            userId
        },
        orderBy: {
            computedAt: "desc"
        }
    });
    return shapeSnapshot(fresh ?? latest);
}
const MATERIAL_DROP_POINTS = 10;
const BAND_RANK = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2
};
// Adverse statuses: CAUTION (identity stale), REVIEW_REQUIRED (confirmed flag
// below the HIGH_RISK threshold), HIGH_RISK. Entering ANY of these from a
// clean state is material — the member hears about it immediately.
const ADVERSE_STATUSES = new Set([
    "CAUTION",
    "REVIEW_REQUIRED",
    "HIGH_RISK"
]);
function assessDrop(prev, next, policyChanged) {
    const drop = prev.score - next.score;
    const bandWorsened = (BAND_RANK[next.riskBand] ?? 0) > (BAND_RANK[prev.riskBand] ?? 0);
    const enteredAdverse = !ADVERSE_STATUSES.has(prev.status) && ADVERSE_STATUSES.has(next.status);
    return {
        drop,
        bandWorsened,
        enteredAdverse,
        policyChanged,
        material: drop >= MATERIAL_DROP_POINTS || bandWorsened || enteredAdverse
    };
}
// maybeNotifyScoreDrop — fires ONE notification per material downward move.
// Increases, flat refreshes and INITIAL snapshots never notify (the history
// card already shows those). The frozen path never reaches here (no write
// happens while FROZEN — fairness guarantee), so a receipt can only follow a
// real recompute, including the first one after an appeal decision lands.
async function maybeNotifyScoreDrop(userId, prev, next, provenance) {
    if (!prev) return; // INITIAL — nothing to compare against
    const ctx = assessDrop(prev, next, provenance.policyChanged);
    if (!ctx.material) return;
    const reasons = [];
    if (ctx.drop >= MATERIAL_DROP_POINTS) reasons.push(`down ${ctx.drop} points`);
    if (ctx.bandWorsened) reasons.push("risk band moved up");
    if (ctx.enteredAdverse) reasons.push("status entered an adverse state");
    const title = `TrustScore change: ${prev.score} → ${next.score} (${next.score - prev.score >= 0 ? "+" : "−"}${Math.abs(next.score - prev.score)})`;
    const body = `A material change to your TrustScore was recorded (${reasons.join(", ")}). ` + `Every component delta and the audited events in this window are explained in Score Insights ` + `(Trust Passport → Score history)${ctx.policyChanged ? `, under policy v${provenance.policyVersion}` : ""}. ` + `Confirmed flags are human-reviewed and appealable — adverse findings always carry a reason.`;
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SCORE", title, body);
}
async function markMaterialChange(userId, _trigger) {
    await syncCredentials(userId);
    await getScoreSnapshot(userId);
}
// ---------------------------------------------------------------------------
// Credential sync — credentials are platform-issued assertions that shadow
// their source evidence. A credential NEVER outlives its source; a manual
// user revocation sticks even if the source is still live.
// ---------------------------------------------------------------------------
const CREDENTIAL_LABELS = {
    GOV_ID_VERIFIED: "Government identity verified",
    PHONE_VERIFIED: "Phone number verified",
    LIVENESS_VERIFIED: "Biometric liveness passed"
};
function credentialLabel(type) {
    return CREDENTIAL_LABELS[type] ?? type;
}
async function syncCredentials(userId) {
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
        where: {
            userId
        },
        include: {
            identifiers: true,
            attributes: true,
            evidence: {
                where: {
                    status: "ACTIVE"
                },
                orderBy: {
                    collectedAt: "desc"
                }
            }
        }
    });
    if (!identity) return 0;
    const now = Date.now();
    const fresh = (d)=>(d?.getTime() ?? 0) > now;
    const govEvidence = identity.evidence.find((e)=>e.type === "NINAUTH_ID_TOKEN" && fresh(e.expiresAt));
    const phoneIdentifier = identity.identifiers.find((i)=>i.type === "PHONE" && i.status === "ACTIVE" && fresh(i.expiresAt));
    const biometricIdentifier = identity.identifiers.find((i)=>i.type === "BIOMETRIC" && i.status === "ACTIVE" && fresh(i.expiresAt));
    const phoneEvidence = identity.evidence.find((e)=>e.type === "PHONE_OTP" && fresh(e.expiresAt));
    const livenessEvidence = identity.evidence.find((e)=>e.type === "LIVENESS" && fresh(e.expiresAt));
    const sources = [
        {
            type: "GOV_ID_VERIFIED",
            live: identity.status === "VERIFIED" && !!govEvidence,
            evidenceId: govEvidence?.id ?? null,
            expiresAt: identity.expiresAt,
            claims: {
                provider: identity.provider,
                providerMode: identity.providerMode,
                maskedRef: identity.providerIdentityRef,
                attributesAsserted: identity.attributes.filter((a)=>a.status === "ACTIVE").length
            }
        },
        {
            type: "PHONE_VERIFIED",
            live: !!phoneIdentifier,
            evidenceId: phoneEvidence?.id ?? null,
            expiresAt: phoneIdentifier?.expiresAt ?? null,
            claims: {
                phoneHint: phoneIdentifier?.hint ?? null,
                simSwapRisk: "checked"
            }
        },
        {
            type: "LIVENESS_VERIFIED",
            live: !!biometricIdentifier,
            evidenceId: livenessEvidence?.id ?? null,
            expiresAt: biometricIdentifier?.expiresAt ?? null,
            claims: {
                verdict: "passed",
                templateStored: false
            }
        }
    ];
    let changed = 0;
    for (const src of sources){
        const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].credential.findUnique({
            where: {
                userId_type: {
                    userId,
                    type: src.type
                }
            }
        });
        if (src.live && (!existing || existing.status !== "ACTIVE" && !existing.manualRevoked)) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].credential.upsert({
                where: {
                    userId_type: {
                        userId,
                        type: src.type
                    }
                },
                create: {
                    userId,
                    trustIdentityId: identity.id,
                    type: src.type,
                    issuer: "TrustScore Platform",
                    issuerMode: "MOCK",
                    claims: JSON.stringify(src.claims),
                    status: "ACTIVE",
                    evidenceId: src.evidenceId,
                    expiresAt: src.expiresAt,
                    manualRevoked: false
                },
                update: {
                    status: "ACTIVE",
                    claims: JSON.stringify(src.claims),
                    evidenceId: src.evidenceId,
                    expiresAt: src.expiresAt,
                    revokedAt: null,
                    trustIdentityId: identity.id
                }
            });
            changed += 1;
        } else if (!src.live && existing && existing.status === "ACTIVE") {
            // Source gone → credential lapses (non-manual revocation).
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].credential.update({
                where: {
                    id: existing.id
                },
                data: {
                    status: "REVOKED",
                    revokedAt: new Date()
                }
            });
            changed += 1;
        }
    }
    return changed;
}
async function getCredentialsForUser(userId) {
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].credential.findMany({
        where: {
            userId
        },
        orderBy: {
            issuedAt: "desc"
        }
    });
    const now = Date.now();
    return rows.map((c)=>{
        const expired = (c.expiresAt?.getTime() ?? Infinity) <= now;
        const status = c.status === "ACTIVE" && expired ? "EXPIRED" : c.status;
        return {
            id: c.id,
            type: c.type,
            label: credentialLabel(c.type),
            issuer: c.issuer,
            issuerMode: c.issuerMode,
            claims: JSON.parse(c.claims),
            status,
            manualRevoked: c.manualRevoked,
            evidenceId: c.evidenceId,
            issuedAt: c.issuedAt.toISOString(),
            expiresAt: c.expiresAt?.toISOString() ?? null,
            revokedAt: c.revokedAt?.toISOString() ?? null
        };
    });
}
const SIMULATION_NOTE = "Read-only dry-run — no snapshot was written and no member's score changed. Real movement happens only on activation (DPIA-gated): each member's next read then recomputes under the new rules. Frozen members (appeal pending) are excluded and recompute when their freeze lifts.";
function maskEmail(email) {
    // AUTH batch — phone-only/Google-only accounts have no email; use the handle.
    if (!email) return "member";
    const at = email.indexOf("@");
    if (at <= 0) return "member";
    const local = email.slice(0, at);
    const domain = email.slice(at);
    const head = local.slice(0, 2);
    return `${head}${local.length > 2 ? "••" : ""}${domain}`;
}
async function simulatePolicyImpact(policyId) {
    const [draftRow, active] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].scoringPolicy.findUnique({
            where: {
                id: policyId
            }
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getActivePolicy"])()
    ]);
    if (!draftRow) return {
        ok: false,
        code: "NOT_FOUND"
    };
    if (draftRow.status !== "DRAFT") return {
        ok: false,
        code: "NOT_DRAFT"
    };
    if (!active) return {
        ok: false,
        code: "NO_ACTIVE"
    };
    const draftRules = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateRules"])(JSON.parse(draftRow.rules)).rules;
    const activeTtl = active.rules.snapshotTtlHours * 3_600_000;
    const draftTtl = draftRules.snapshotTtlHours * 3_600_000;
    // Cohort: every member with at least one snapshot, minus frozen members.
    const users = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
        where: {
            status: "ACTIVE",
            scoreSnapshots: {
                some: {}
            }
        },
        select: {
            id: true,
            email: true
        }
    });
    const frozenIds = new Set((await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.findMany({
        where: {
            state: "FROZEN"
        },
        select: {
            userId: true
        }
    })).map((s)=>s.userId));
    const bucketLabels = [
        "0–19",
        "20–39",
        "40–59",
        "60–79",
        "80–100"
    ];
    const bucketOf = (s)=>Math.min(4, Math.floor(s / 20));
    const beforeBuckets = [
        0,
        0,
        0,
        0,
        0
    ];
    const afterBuckets = [
        0,
        0,
        0,
        0,
        0
    ];
    const transitions = new Map();
    const movers = [];
    let cohort = 0;
    let sumBefore = 0;
    let sumAfter = 0;
    let moved = 0;
    let maxUp = 0;
    let maxDown = 0;
    for (const u of users){
        if (frozenIds.has(u.id)) continue;
        const inputs = await collectInputs(u.id, active.rules.interactionWindowDays);
        const beforeScore = computeScoreFromInputs(inputs, "PERIODIC", active.rules, activeTtl);
        const afterScore = computeScoreFromInputs(inputs, "PERIODIC", draftRules, draftTtl);
        const delta = afterScore.score - beforeScore.score;
        cohort += 1;
        sumBefore += beforeScore.score;
        sumAfter += afterScore.score;
        beforeBuckets[bucketOf(beforeScore.score)] += 1;
        afterBuckets[bucketOf(afterScore.score)] += 1;
        if (beforeScore.status !== afterScore.status) {
            const key = `${beforeScore.status}→${afterScore.status}`;
            const existing = transitions.get(key);
            if (existing) existing.count += 1;
            else transitions.set(key, {
                from: beforeScore.status,
                to: afterScore.status,
                count: 1
            });
        }
        if (delta !== 0) {
            moved += 1;
            maxUp = Math.max(maxUp, delta);
            maxDown = Math.min(maxDown, delta);
            movers.push({
                label: maskEmail(u.email),
                before: beforeScore.score,
                after: afterScore.score,
                delta,
                statusBefore: beforeScore.status,
                statusAfter: afterScore.status
            });
        }
    }
    movers.sort((a, b)=>Math.abs(b.delta) - Math.abs(a.delta));
    return {
        ok: true,
        draftVersion: draftRow.version,
        activeVersion: active.version,
        cohort,
        frozenExcluded: users.filter((u)=>frozenIds.has(u.id)).length,
        moved,
        avgBefore: cohort > 0 ? Math.round(sumBefore / cohort * 10) / 10 : 0,
        avgAfter: cohort > 0 ? Math.round(sumAfter / cohort * 10) / 10 : 0,
        avgDelta: cohort > 0 ? Math.round((sumAfter - sumBefore) / cohort * 10) / 10 : 0,
        maxUp,
        maxDown,
        buckets: bucketLabels.map((label, i)=>({
                label,
                before: beforeBuckets[i],
                after: afterBuckets[i]
            })),
        transitions: [
            ...transitions.values()
        ],
        movers: movers.slice(0, 10),
        note: SIMULATION_NOTE
    };
}
}),
"[project]/src/lib/services/engine-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AUTOMATED_DECISIONS_KEY",
    ()=>AUTOMATED_DECISIONS_KEY,
    "deriveState",
    ()=>deriveState,
    "freezeScoresFor",
    ()=>freezeScoresFor,
    "getEngineGate",
    ()=>getEngineGate,
    "getEngineMe",
    ()=>getEngineMe,
    "isAutomatedDecisionsEnabled",
    ()=>isAutomatedDecisionsEnabled,
    "isFrozen",
    ()=>isFrozen,
    "setAutomatedDecisions",
    ()=>setAutomatedDecisions,
    "unfreezeScoresFor",
    ()=>unfreezeScoresFor
]);
// TrustScore Stage 8 — Trust Engine lifecycle service.
//
// Owns the snapshot STATE machine and the DPIA-gated automated-decision
// switch (audit §4.2):
//   ACTIVE  → the fresh, canonical snapshot (still gated by 24h TTL + hash)
//   FROZEN  → an appeal on a confirmed flag is PENDING → the score stops
//             moving (both up and down) until the human decision lands; the
//             passport clearly labels this. Fair-process guarantee.
//   STALE   → TTL lapsed (display state — computed on read, never persisted
//             as a mutation of the row's meaning; getEngineMe derives it)
//   RETIRED → superseded by a newer snapshot (kept for history/DSR)
//
// Freeze semantics: freezeScoresFor(userId, reason) marks the latest
// snapshot FROZEN. While a freeze is in force, getScoreSnapshot returns the
// frozen row as-is (no recompute, no new snapshots, hash changes ignored).
// unfreeze + recompute happen on appeal decision via markMaterialChange.
//
// The automated-decision gate: engine.automatedSignificantDecisions platform
// setting — default FALSE, DPIA-gated. While false, every surface that could
// act on scores says "human review required" instead of acting. This is the
// NDPC-guidance gate the Stage 0 audit demanded before any automated
// significant decision ships.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/policy-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/trustscore-service.ts [app-route] (ecmascript)");
;
;
;
const AUTOMATED_DECISIONS_KEY = "engine.automatedSignificantDecisions";
async function isAutomatedDecisionsEnabled() {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.findUnique({
        where: {
            key: AUTOMATED_DECISIONS_KEY
        }
    });
    if (!row) return false;
    try {
        const v = JSON.parse(row.value);
        return v.enabled === true;
    } catch  {
        return false;
    }
}
async function getEngineGate() {
    const [enabled, policy] = await Promise.all([
        isAutomatedDecisionsEnabled(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getActivePolicy"])()
    ]);
    return {
        automatedSignificantDecisions: enabled,
        gateNote: enabled ? "Automated significant decisions are ENABLED under a completed DPIA. Every decision remains explainable and appealable (NDPA §37)." : "Automated significant decisions are DISABLED by policy — the DPIA gate (NDPC guidance) is closed. Scores are presented for transparency and every adverse path routes to human review.",
        activePolicy: policy
    };
}
async function setAutomatedDecisions(enabled) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.upsert({
        where: {
            key: AUTOMATED_DECISIONS_KEY
        },
        create: {
            key: AUTOMATED_DECISIONS_KEY,
            value: JSON.stringify({
                enabled,
                note: enabled ? "Enabled under a completed DPIA covering the active scoring policy." : "DPIA-gated — disabled by default; requires a completed DPIA and an explicit governance decision."
            })
        },
        update: {
            value: JSON.stringify({
                enabled,
                note: enabled ? "Enabled under a completed DPIA covering the active scoring policy." : "DPIA-gated — disabled by default; requires a completed DPIA and an explicit governance decision."
            })
        }
    });
}
async function freezeScoresFor(userId, reason) {
    const latest = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.findFirst({
        where: {
            userId
        },
        orderBy: {
            computedAt: "desc"
        }
    });
    if (!latest) return "NO_SNAPSHOT";
    if (latest.state === "FROZEN") return "ALREADY_FROZEN";
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.update({
        where: {
            id: latest.id
        },
        data: {
            state: "FROZEN",
            frozenAt: new Date(),
            frozenReason: reason
        }
    });
    return "FROZEN";
}
async function unfreezeScoresFor(userId) {
    const frozen = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.findFirst({
        where: {
            userId,
            state: "FROZEN"
        },
        orderBy: {
            computedAt: "desc"
        }
    });
    if (frozen) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.update({
            where: {
                id: frozen.id
            },
            data: {
                state: "RETIRED"
            }
        });
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markMaterialChange"])(userId, "APPEAL_RESOLVED");
}
async function isFrozen(userId) {
    const latest = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.findFirst({
        where: {
            userId
        },
        orderBy: {
            computedAt: "desc"
        }
    });
    return latest?.state === "FROZEN";
}
function deriveState(row) {
    if (row.state === "FROZEN") return "FROZEN";
    if (row.state === "RETIRED") return "RETIRED";
    return row.expiresAt.getTime() > Date.now() ? "ACTIVE" : "STALE";
}
async function getEngineMe(userId) {
    const [snapshot, gate, policy, historyRows, policyRows] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.findFirst({
            where: {
                userId
            },
            orderBy: {
                computedAt: "desc"
            }
        }),
        isAutomatedDecisionsEnabled(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getActivePolicy"])(),
        // Stage 8 — snapshot history (immutable rows, latest 20 retained):
        // feeds the member's score-over-time sparkline + lifecycle log.
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.findMany({
            where: {
                userId
            },
            orderBy: {
                computedAt: "desc"
            },
            take: 20
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].scoringPolicy.findMany({
            select: {
                id: true,
                version: true
            }
        })
    ]);
    const versionById = new Map(policyRows.map((p)=>[
            p.id,
            p.version
        ]));
    const state = snapshot ? deriveState(snapshot) : null;
    const history = historyRows.slice().reverse() // chronological — oldest → newest
    .map((row)=>({
            score: row.score,
            status: row.status,
            state: deriveState(row),
            trigger: row.trigger,
            computedAt: row.computedAt.toISOString(),
            policyVersion: row.policyId ? versionById.get(row.policyId) ?? null : null
        }));
    return {
        snapshot: snapshot ? {
            state,
            frozenReason: snapshot.state === "FROZEN" ? snapshot.frozenReason : null,
            frozenAt: snapshot.frozenAt?.toISOString() ?? null,
            policyVersion: policy?.version ?? null,
            computedAt: snapshot.computedAt.toISOString(),
            expiresAt: snapshot.expiresAt.toISOString(),
            trigger: snapshot.trigger
        } : null,
        policy: policy ? {
            version: policy.version,
            changeSummary: policy.changeSummary,
            activatedAt: policy.activatedAt
        } : null,
        automatedSignificantDecisions: gate,
        history,
        frozenNote: state === "FROZEN" ? "Your TrustScore is frozen while an appeal is under human review — it cannot move up or down until the reviewer decides. This is a fairness guarantee (NDPA §37)." : null
    };
}
}),
"[project]/src/lib/services/passport-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// TrustScore Stage 5 — PassportService (directive §5 Trust Passport).
// Share tokens / Trust Link, public trust-card views (anti-enumeration,
// view-counted, receipted), identity security center (sessions, notifications),
// trust receipts, and NDPA §36 DSR self-service (export + delete).
//
// Red lines enforced here (directive §50/§59):
// - The public card NEVER says "this person is safe" — only
//   "No confirmed adverse signals found".
// - Raw share tokens exist only in the owner's UI (once) and the viewer's URL.
//   At rest: sha256 only. No NIN/PII ever in URLs, logs or receipts.
// - Unknown tokens return a generic 404 (enumeration resistance).
__turbopack_context__.s([
    "DSR_EXPORT_RETENTION_MS",
    ()=>DSR_EXPORT_RETENTION_MS,
    "SHARE_SCOPES",
    ()=>SHARE_SCOPES,
    "createDsrExport",
    ()=>createDsrExport,
    "createShareToken",
    ()=>createShareToken,
    "currentSessionToken",
    ()=>currentSessionToken,
    "getDsrExportPayload",
    ()=>getDsrExportPayload,
    "getPassportForUser",
    ()=>getPassportForUser,
    "listDsrRequests",
    ()=>listDsrRequests,
    "listNotifications",
    ()=>listNotifications,
    "markNotificationsRead",
    ()=>markNotificationsRead,
    "requestDsrDelete",
    ()=>requestDsrDelete,
    "revokeCredential",
    ()=>revokeCredential,
    "revokeSessionById",
    ()=>revokeSessionById,
    "revokeShareToken",
    ()=>revokeShareToken,
    "viewPublicCard",
    ()=>viewPublicCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/notification-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/trustscore-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/session.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$engine$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/engine-service.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
const SHARE_SCOPES = [
    "PROFILE",
    "SIGNALS",
    "ATTRIBUTES",
    "SCORE"
];
const DSR_EXPORT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RECEIPTS_RETAIN = 50;
const PUBLIC_CARD_LANGUAGE = {
    adverse: "No confirmed adverse signals found",
    disclaimer: "A TrustScore summarizes recorded verification evidence. It is not a guarantee that a person is safe to deal with."
};
function newRawShareToken() {
    return `ts_${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(24).toString("base64url")}`;
}
function shareHash(raw) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(`share:${raw}`);
}
async function getPassportForUser(userId, currentToken) {
    const [user, snapshot, credentials, shareTokens, receipts, sessions, notifications, identity, activeSessionCount] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
            where: {
                id: userId
            },
            select: {
                displayName: true,
                handle: true,
                email: true,
                createdAt: true,
                status: true
            }
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getScoreSnapshot"])(userId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCredentialsForUser"])(userId),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].shareToken.findMany({
            where: {
                userId
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 20
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustReceipt.findMany({
            where: {
                userId
            },
            orderBy: {
                viewedAt: "desc"
            },
            take: 20
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 10
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].notification.findMany({
            where: {
                userId
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 20
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
            where: {
                userId
            },
            select: {
                status: true,
                assuranceLevel: true,
                expiresAt: true
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.count({
            where: {
                userId,
                revokedAt: null,
                expiresAt: {
                    gt: new Date()
                }
            }
        })
    ]);
    const now = Date.now();
    const shapedTokens = shareTokens.map((t)=>{
        const expired = t.status === "ACTIVE" && (t.expiresAt.getTime() <= now || t.views >= t.maxViews);
        const status = t.status === "ACTIVE" && expired ? "EXPIRED" : t.status;
        return {
            id: t.id,
            scopes: JSON.parse(t.scopes),
            maxViews: t.maxViews,
            views: t.views,
            viewsLeft: Math.max(0, t.maxViews - t.views),
            status,
            expiresAt: t.expiresAt.toISOString(),
            revokedAt: t.revokedAt?.toISOString() ?? null,
            lastViewedAt: t.lastViewedAt?.toISOString() ?? null,
            createdAt: t.createdAt.toISOString()
        };
    });
    // Security events: the user's own actions PLUS anonymous viewer events on
    // their share tokens PLUS Stage 6 named safety checks + trust requests
    // PLUS Stage 7 flag/appeal events about them (subject linkage — the owner
    // sees who-checked-when and flag milestones).
    const securityEvents = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].auditEvent.findMany({
        where: {
            OR: [
                {
                    actorId: userId
                },
                {
                    AND: [
                        {
                            action: {
                                in: [
                                    "SHARE_TOKEN_VIEWED",
                                    "SHARE_TOKEN_BLOCKED"
                                ]
                            }
                        },
                        {
                            subjectType: "ShareToken",
                            subjectId: {
                                in: shareTokens.map((t)=>t.id)
                            }
                        }
                    ]
                },
                {
                    AND: [
                        {
                            action: {
                                in: [
                                    "SAFETY_CHECK_RUN",
                                    "TRUST_REQUEST_SENT",
                                    "FLAG_SUBMITTED",
                                    "FLAG_RESOLUTION",
                                    "APPEAL_DECIDED"
                                ]
                            }
                        },
                        {
                            subjectType: "UserAccount",
                            subjectId: userId
                        }
                    ]
                }
            ]
        },
        orderBy: {
            createdAt: "desc"
        },
        take: 30,
        select: {
            id: true,
            action: true,
            createdAt: true
        }
    });
    return {
        profile: user ? {
            displayName: user.displayName,
            handle: user.handle,
            email: user.email,
            memberSince: user.createdAt.toISOString(),
            status: user.status
        } : null,
        assurance: {
            level: identity && identity.status === "VERIFIED" && (identity.expiresAt?.getTime() ?? 0) > Date.now() ? identity.assuranceLevel : 0
        },
        score: snapshot,
        credentials,
        shareTokens: shapedTokens,
        receipts: receipts.map((r)=>{
            let shown = {};
            try {
                shown = JSON.parse(r.cardShown);
            } catch  {
                shown = {};
            }
            return {
                id: r.id,
                viewerLabel: r.viewerLabel,
                channel: r.channel,
                viewedAt: r.viewedAt.toISOString(),
                shown
            };
        }),
        sessions: sessions.map((s)=>({
                id: s.id,
                userAgent: s.userAgent,
                createdAt: s.createdAt.toISOString(),
                expiresAt: s.expiresAt.toISOString(),
                ipHashPrefix: s.ipHash ? `${s.ipHash.slice(0, 8)}…` : null,
                current: currentToken ? s.tokenHash === (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(currentToken) : false
            })),
        activeSessionCount,
        notifications: notifications.map((n)=>({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                readAt: n.readAt?.toISOString() ?? null,
                createdAt: n.createdAt.toISOString()
            })),
        unreadNotifications: notifications.filter((n)=>n.readAt === null).length,
        securityEvents: securityEvents.map((e)=>({
                id: e.id,
                action: e.action,
                createdAt: e.createdAt.toISOString()
            })),
        cardLanguage: PUBLIC_CARD_LANGUAGE
    };
}
async function createShareToken(userId, input) {
    const raw = newRawShareToken();
    const expiresAt = new Date(Date.now() + input.ttlHours * 3600_000);
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].shareToken.create({
        data: {
            userId,
            tokenHash: shareHash(raw),
            scopes: JSON.stringify(input.scopes),
            maxViews: input.maxViews,
            expiresAt
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "SHARE_TOKEN_CREATED",
        subjectType: "ShareToken",
        subjectId: row.id,
        metadata: {
            ttlHours: input.ttlHours,
            maxViews: input.maxViews,
            scopeSet: input.scopes.join(",")
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SECURITY", "Trust link created", `A new trust link was created. It can be opened ${input.maxViews} time${input.maxViews === 1 ? "" : "s"} and expires ${new Date(expiresAt).toLocaleString("en-NG")}. Every open is recorded to your trust receipts.`);
    return {
        // Raw token: returned exactly ONCE — the client must persist/QR it now.
        token: raw,
        linkPath: `/?trust=${raw}`,
        id: row.id,
        scopes: input.scopes,
        maxViews: input.maxViews,
        expiresAt: expiresAt.toISOString()
    };
}
async function revokeShareToken(userId, tokenId) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].shareToken.findFirst({
        where: {
            id: tokenId,
            userId
        }
    });
    if (!row) return "NOT_FOUND";
    if (row.status === "REVOKED") return "ALREADY";
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].shareToken.update({
        where: {
            id: row.id
        },
        data: {
            status: "REVOKED",
            revokedAt: new Date()
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "SHARE_TOKEN_REVOKED",
        subjectType: "ShareToken",
        subjectId: row.id,
        metadata: {
            views: row.views
        }
    });
    return "REVOKED";
}
async function viewPublicCard(rawToken, req, viewer) {
    if (!/^ts_[A-Za-z0-9_-]{20,60}$/.test(rawToken)) {
        return {
            outcome: "NOT_FOUND"
        };
    }
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].shareToken.findUnique({
        where: {
            tokenHash: shareHash(rawToken)
        }
    });
    if (!row) return {
        outcome: "NOT_FOUND"
    }; // generic — enumeration-resistant
    const now = Date.now();
    if (row.status === "REVOKED") return {
        outcome: "EXPIRED",
        reason: "REVOKED"
    };
    if (row.expiresAt.getTime() <= now) return {
        outcome: "EXPIRED",
        reason: "EXPIRED"
    };
    if (row.views >= row.maxViews) return {
        outcome: "EXPIRED",
        reason: "VIEW_LIMIT"
    };
    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            id: row.userId
        },
        select: {
            id: true,
            displayName: true,
            handle: true,
            status: true
        }
    });
    if (!user || user.status !== "ACTIVE") return {
        outcome: "EXPIRED",
        reason: "REVOKED"
    };
    const scopes = JSON.parse(row.scopes);
    const snapshot = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getScoreSnapshot"])(user.id);
    const [credentials, identity] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCredentialsForUser"])(user.id),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
            where: {
                userId: user.id
            },
            include: {
                identifiers: true,
                attributes: {
                    where: {
                        status: "ACTIVE"
                    }
                }
            }
        })
    ]);
    // Count the view + write the receipt BEFORE returning the card — the view
    // is the product (directive: who-checked-you is logged).
    const shown = {
        status: snapshot.status,
        score: snapshot.score,
        confidence: snapshot.confidence,
        riskBand: snapshot.riskBand
    };
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].shareToken.update({
        where: {
            id: row.id
        },
        data: {
            views: {
                increment: 1
            },
            lastViewedAt: new Date()
        }
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustReceipt.create({
        data: {
            userId: user.id,
            shareTokenId: row.id,
            viewerLabel: viewer ? viewer.kind === "API_CLIENT" ? `Trust API check by ${viewer.displayName}` : `Safety Check by @${viewer.handle}` : "Trust link viewer",
            channel: viewer ? viewer.kind === "API_CLIENT" ? "API_CHECK" : "SAFETY_CHECK" : "TRUST_LINK",
            cardShown: JSON.stringify(shown),
            ipHash: req ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashIp"])(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip")) : null
        }
    });
    // Prune receipts: keep the most recent RECEIPTS_RETAIN per user.
    const stale = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustReceipt.findMany({
        where: {
            userId: user.id
        },
        orderBy: {
            viewedAt: "desc"
        },
        skip: RECEIPTS_RETAIN,
        select: {
            id: true
        }
    });
    if (stale.length > 0) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustReceipt.deleteMany({
            where: {
                id: {
                    in: stale.map((s)=>s.id)
                }
            }
        });
    }
    if (row.views === 0) {
        // First open of this link — the owner wants to know.
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(user.id, "SECURITY", "Your Trust Card was viewed", viewer ? viewer.kind === "API_CLIENT" ? `${viewer.displayName} (an integrated business) opened your trust link for the first time via the Trust Decision API. The check is recorded in your trust receipts.` : `@${viewer.handle} opened your trust link for the first time (Safety Check). The check is recorded in your trust receipts.` : "Someone opened your trust link for the first time. The check is recorded in your trust receipts.");
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: viewer ? "USER" : "ANONYMOUS",
        actorId: viewer?.id,
        action: "SHARE_TOKEN_VIEWED",
        subjectType: "ShareToken",
        subjectId: row.id,
        metadata: {
            views: row.views + 1,
            viewsLeft: Math.max(0, row.maxViews - row.views - 1)
        }
    });
    const now2 = Date.now();
    const signalChips = [];
    if (identity && scopes.includes("SIGNALS")) {
        for (const i of identity.identifiers){
            if (i.status !== "ACTIVE") continue;
            if ((i.expiresAt?.getTime() ?? 0) <= now2) continue;
            signalChips.push({
                type: i.type,
                hint: i.hint,
                verifiedAt: i.verifiedAt.toISOString(),
                expiresAt: i.expiresAt?.toISOString() ?? null
            });
        }
    }
    const card = {
        viewerNotice: "This check was recorded to the owner's trust receipts.",
        language: PUBLIC_CARD_LANGUAGE,
        freshness: {
            computedAt: snapshot.computedAt,
            expiresAt: snapshot.expiresAt
        }
    };
    if (scopes.includes("PROFILE")) {
        card.profile = {
            displayName: user.displayName,
            handle: user.handle
        };
    }
    if (scopes.includes("SCORE")) {
        card.score = {
            status: snapshot.status,
            score: snapshot.score,
            confidence: snapshot.confidence,
            riskBand: snapshot.riskBand,
            components: snapshot.components
        };
        card.assurance = {
            level: identity?.status === "VERIFIED" ? identity.assuranceLevel : 0
        };
    }
    if (scopes.includes("SIGNALS")) {
        card.signals = signalChips;
    }
    if (scopes.includes("ATTRIBUTES") && identity) {
        card.attributes = identity.attributes.filter((a)=>(a.expiresAt?.getTime() ?? Infinity) > now2).map((a)=>({
                key: a.key,
                value: a.value
            }));
    }
    card.credentialsCount = credentials.filter((c)=>c.status === "ACTIVE" && (c.expiresAt ? Date.parse(c.expiresAt) > now2 : true)).length;
    return {
        outcome: "OK",
        card,
        // Internal context for the Safety Check service (Stage 6). The anonymous
        // public route strips these before responding.
        subject: {
            id: user.id,
            displayName: user.displayName,
            handle: user.handle
        },
        shareTokenId: row.id,
        scopes,
        attributes: card.attributes ?? []
    };
}
async function revokeCredential(userId, credentialId) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].credential.findFirst({
        where: {
            id: credentialId,
            userId
        }
    });
    if (!row) return "NOT_FOUND";
    if (row.status === "REVOKED" && row.manualRevoked) return "ALREADY";
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].credential.update({
        where: {
            id: row.id
        },
        data: {
            status: "REVOKED",
            revokedAt: new Date(),
            manualRevoked: true
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "CREDENTIAL_REVOKED",
        subjectType: "Credential",
        subjectId: row.id,
        metadata: {
            type: row.type
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SECURITY", "Credential revoked", `Your "${row.type.replace(/_/g, " ").toLowerCase()}" credential was revoked. It will no longer appear on your Trust Card until the underlying signal is re-verified.`);
    return "REVOKED";
}
async function revokeSessionById(userId, sessionId, currentToken) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.findFirst({
        where: {
            id: sessionId,
            userId,
            revokedAt: null
        }
    });
    if (!row) return {
        outcome: "NOT_FOUND"
    };
    if (currentToken && row.tokenHash === (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(currentToken)) {
        return {
            outcome: "IS_CURRENT"
        };
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.update({
        where: {
            id: row.id
        },
        data: {
            revokedAt: new Date()
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "SESSION_REVOKED",
        subjectType: "Session",
        subjectId: row.id
    });
    return {
        outcome: "REVOKED"
    };
}
function currentSessionToken(req) {
    return req.cookies.get("ts_session")?.value;
}
async function listNotifications(userId) {
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].notification.findMany({
        where: {
            userId
        },
        orderBy: {
            createdAt: "desc"
        },
        take: 30
    });
    return {
        notifications: rows.map((n)=>({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                readAt: n.readAt?.toISOString() ?? null,
                createdAt: n.createdAt.toISOString()
            })),
        unread: rows.filter((n)=>n.readAt === null).length
    };
}
async function markNotificationsRead(userId, id) {
    const where = id ? {
        userId,
        id
    } : {
        userId,
        readAt: null
    };
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].notification.updateMany({
        where,
        data: {
            readAt: new Date()
        }
    });
    return res.count;
}
// ---------------------------------------------------------------------------
// DSR — NDPA §36 self-service
// ---------------------------------------------------------------------------
async function buildExportPayload(userId) {
    const [user, identity, consents, evidence, credentials, shareTokens, receipts, sessions, notifications, audit, dsr, phoneVerifications, livenessSessions, verificationSessions, safetyChecks, trustRequests, flags, scoreSnapshots, apiClientsOwnedOrTeamed, myApiMemberships, myApiUsageDays, networkMembership, networkEdges, networkSignals] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
            where: {
                id: userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
            where: {
                userId
            },
            include: {
                identifiers: true,
                attributes: true
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.findMany({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].evidence.findMany({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].credential.findMany({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].shareToken.findMany({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustReceipt.findMany({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.findMany({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].notification.findMany({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].auditEvent.findMany({
            where: {
                actorId: userId
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 200
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dsrRequest.findMany({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.findMany({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].livenessSession.findMany({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.findMany({
            where: {
                userId
            },
            include: {
                events: true
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.findMany({
            where: {
                OR: [
                    {
                        verifierId: userId
                    },
                    {
                        subjectId: userId
                    }
                ]
            },
            orderBy: {
                createdAt: "desc"
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustRequest.findMany({
            where: {
                OR: [
                    {
                        verifierId: userId
                    },
                    {
                        subjectId: userId
                    }
                ]
            },
            orderBy: {
                createdAt: "desc"
            }
        }),
        // Stage 7 — full reputation record (reporter identities are unmasked in
        // the export: NDPA access right beats the UI retaliation shield).
        // Dangling-FK tolerance: handles resolve post-query (raw-SQL test
        // cleanups may have removed a counterparty).
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.findMany({
            where: {
                OR: [
                    {
                        reporterId: userId
                    },
                    {
                        subjectId: userId
                    }
                ]
            },
            orderBy: {
                createdAt: "desc"
            },
            include: {
                evidence: {
                    orderBy: {
                        createdAt: "asc"
                    }
                },
                resolution: true,
                appeal: true
            }
        }),
        // Stage 8 — score snapshots with policy provenance (which rules produced
        // each score — the engine section below joins the policy summaries)
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustScoreSnapshot.findMany({
            where: {
                userId
            },
            orderBy: {
                computedAt: "desc"
            },
            take: 20
        }),
        // Stage 9 — B2B developer-portal footprint: owned clients, teams you
        // sit on, keys (prefixes — raw keys were never stored), webhook config
        // (URL only; the signing secret is regenerable, not exportable) and
        // usage counters.
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.findMany({
            where: {
                OR: [
                    {
                        ownerId: userId
                    },
                    {
                        team: {
                            some: {
                                userId
                            }
                        }
                    }
                ]
            },
            include: {
                keys: true,
                team: {
                    include: {
                        user: {
                            select: {
                                handle: true
                            }
                        }
                    }
                }
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiTeamMember.findMany({
            where: {
                userId
            },
            include: {
                client: true
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiUsageDay.findMany({
            where: {
                client: {
                    ownerId: userId
                }
            }
        }),
        // Stage 10 — Trust Network: membership, every attestation you were part
        // of (partner handles — your own data-subject record) and every shared
        // signal ever held about you (including retracted ones — full honesty).
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUnique({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.findMany({
            where: {
                OR: [
                    {
                        aUserId: userId
                    },
                    {
                        bUserId: userId
                    }
                ]
            },
            orderBy: {
                requestedAt: "desc"
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].sharedSignal.findMany({
            where: {
                subjectUserId: userId
            },
            orderBy: {
                createdAt: "desc"
            }
        })
    ]);
    const networkPartnerIds = [
        ...new Set(networkEdges.map((e)=>e.aUserId === userId ? e.bUserId : e.aUserId))
    ];
    const networkPartners = networkPartnerIds.length ? await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
        where: {
            id: {
                in: networkPartnerIds
            }
        },
        select: {
            id: true,
            handle: true,
            displayName: true
        }
    }) : [];
    // Flag counterparty handles (tolerant of dangling rows — see the flag
    // query note above).
    const flagPartyIds = [
        ...new Set(flags.flatMap((f)=>[
                f.reporterId,
                f.subjectId
            ]))
    ];
    const flagParties = flagPartyIds.length ? await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
        where: {
            id: {
                in: flagPartyIds
            }
        },
        select: {
            id: true,
            handle: true
        }
    }) : [];
    const flagHandleOf = (id)=>flagParties.find((u)=>u.id === id)?.handle ?? "deleted-member";
    return {
        exportedAt: new Date().toISOString(),
        legalBasis: "Nigeria Data Protection Act 2023, s.36 — right of access to personal data",
        retentionNote: "This export contains every record TrustScore holds about you. Stored identifiers are already salted hashes — the raw values (NIN, phone number) were never stored and cannot be exported by anyone, including us.",
        account: user ? {
            email: user.email,
            displayName: user.displayName,
            handle: user.handle,
            status: user.status,
            createdAt: user.createdAt,
            acceptedTermsAt: user.acceptedTermsAt,
            passwordHash: user.passwordHash,
            passwordSalt: user.passwordSalt
        } : null,
        trustIdentity: identity ? {
            status: identity.status,
            assuranceLevel: identity.assuranceLevel,
            provider: identity.provider,
            providerMode: identity.providerMode,
            providerIdentityRef: identity.providerIdentityRef,
            verifiedAt: identity.verifiedAt,
            expiresAt: identity.expiresAt,
            createdAt: identity.createdAt,
            identifiers: identity.identifiers,
            attributes: identity.attributes
        } : null,
        consents,
        evidence,
        credentials: credentials.map((c)=>({
                ...c,
                claims: JSON.parse(c.claims)
            })),
        shareTokens: shareTokens.map((t)=>({
                ...t,
                scopes: JSON.parse(t.scopes)
            })),
        trustReceipts: receipts.map((r)=>({
                ...r,
                cardShown: JSON.parse(r.cardShown)
            })),
        sessions: sessions.map((s)=>({
                id: s.id,
                createdAt: s.createdAt,
                expiresAt: s.expiresAt,
                revokedAt: s.revokedAt,
                userAgent: s.userAgent,
                ipHash: s.ipHash
            })),
        notifications,
        auditEvents: audit,
        dsrRequests: dsr.map((d)=>({
                ...d,
                payload: d.payload ? "<omitted: available via download>" : null
            })),
        phoneVerifications: phoneVerifications.map((p)=>({
                id: p.id,
                phoneHash: p.phoneHash,
                phoneHint: p.phoneHint,
                status: p.status,
                otpHash: p.otpHash,
                simSwapRisk: p.simSwapRisk,
                createdAt: p.createdAt,
                verifiedAt: p.verifiedAt
            })),
        livenessSessions: livenessSessions.map((l)=>({
                id: l.id,
                jobId: l.jobId,
                status: l.status,
                result: l.result ? JSON.parse(l.result) : null,
                confidence: l.confidence,
                createdAt: l.createdAt,
                completedAt: l.completedAt
            })),
        verificationSessions: verificationSessions.map((v)=>({
                id: v.id,
                provider: v.provider,
                status: v.status,
                flow: v.flow,
                scopes: JSON.parse(v.scopes),
                purpose: v.purpose,
                createdAt: v.createdAt,
                completedAt: v.completedAt,
                events: v.events.map((e)=>({
                        eventType: e.eventType,
                        createdAt: e.createdAt
                    }))
            })),
        safetyChecks: safetyChecks.map((c)=>({
                id: c.id,
                role: c.verifierId === userId ? "verifier" : "subject",
                method: c.method,
                assessment: JSON.parse(c.assessment),
                createdAt: c.createdAt
            })),
        trustRequests: trustRequests.map((r)=>({
                id: r.id,
                role: r.verifierId === userId ? "verifier" : "subject",
                status: r.status,
                message: r.message,
                createdAt: r.createdAt,
                respondedAt: r.respondedAt
            })),
        reputation: {
            note: "Reporter identities are masked in the product UI to prevent retaliation; this export is your complete data-subject record (NDPA s.36) and includes them.",
            flags: flags.map((f)=>({
                    id: f.id,
                    role: f.reporterId === userId ? "reporter" : "subject",
                    category: f.category,
                    description: f.description,
                    status: f.status,
                    reporterHandle: flagHandleOf(f.reporterId),
                    subjectHandle: flagHandleOf(f.subjectId),
                    createdAt: f.createdAt,
                    subjectRespondedAt: f.subjectRespondedAt,
                    evidence: f.evidence.map((e)=>({
                            id: e.id,
                            role: e.role,
                            kind: e.kind,
                            content: e.content,
                            submittedBy: e.submittedById === userId ? "you" : "counterparty",
                            createdAt: e.createdAt
                        })),
                    resolution: f.resolution ? {
                        outcome: f.resolution.outcome,
                        rationale: f.resolution.rationale,
                        fraudSignal: f.resolution.fraudSignal,
                        decidedAt: f.resolution.decidedAt
                    } : null,
                    appeal: f.appeal ? {
                        status: f.appeal.status,
                        reason: f.appeal.reason,
                        decisionNote: f.appeal.decisionNote,
                        createdAt: f.appeal.createdAt,
                        decidedAt: f.appeal.decidedAt
                    } : null
                }))
        },
        // Stage 8 — Trust Engine: every score you were ever shown, which policy
        // version produced it, and its lifecycle state (frozen snapshots name the
        // pending appeal). Automated-significant-decisions status at export time.
        trustEngine: {
            note: "Each score you were shown names the versioned scoring policy that produced it. Policies change only through a new version covered by a completed DPIA — never silently.",
            automatedSignificantDecisions: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$engine$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isAutomatedDecisionsEnabled"])(),
            snapshots: scoreSnapshots.map((s)=>({
                    id: s.id,
                    status: s.status,
                    score: s.score,
                    confidence: s.confidence,
                    riskBand: s.riskBand,
                    state: s.state,
                    frozenReason: s.frozenReason,
                    frozenAt: s.frozenAt,
                    trigger: s.trigger,
                    policyId: s.policyId,
                    components: JSON.parse(s.components),
                    explanation: JSON.parse(s.explanation),
                    computedAt: s.computedAt,
                    expiresAt: s.expiresAt
                }))
        },
        // Stage 9 — B2B developer-portal footprint. Raw API keys were NEVER
        // stored (sha256 at rest) and the webhook signing secret is excluded —
        // it is regenerable from the portal, not exportable. Decisions made
        // ABOUT you via the Trust Decision API appear in trustReceipts above
        // (channel API_CHECK).
        apiPlatform: {
            note: "Your developer-portal footprint: API clients you own or sit on (team), key metadata (prefixes only — raw keys were never stored), webhook configuration and daily usage counters. Trust checks businesses ran on you are in trustReceipts (channel API_CHECK).",
            clients: apiClientsOwnedOrTeamed.map((c)=>({
                    id: c.id,
                    name: c.name,
                    environment: c.environment,
                    status: c.status,
                    plan: c.plan,
                    yourRole: myApiMemberships.find((m)=>m.clientId === c.id)?.role ?? (c.ownerId === userId ? "OWNER" : null),
                    webhookUrl: c.webhookUrl,
                    liveEnabledAt: c.liveEnabledAt,
                    createdAt: c.createdAt,
                    keys: c.keys.map((k)=>({
                            name: k.name,
                            keyPrefix: k.keyPrefix,
                            status: k.status,
                            scope: k.scope,
                            totalRequests: k.totalRequests,
                            lastUsedAt: k.lastUsedAt,
                            createdAt: k.createdAt
                        })),
                    team: c.team.map((m)=>({
                            handle: m.user.handle,
                            role: m.role,
                            createdAt: m.createdAt
                        }))
                })),
            usage: myApiUsageDays.map((d)=>({
                    day: d.day,
                    checks: d.checks,
                    errors: d.errors
                }))
        },
        // Stage 10 — Trust Network record: membership state (and the consent
        // backing it — see consents above), every attestation lifecycle you were
        // part of with partner identities, and your full shared-signal history
        // (retracted rows included — your data-subject record is complete).
        trustNetwork: {
            note: "Your Trust Network record. Attestations are mutual and were accepted by both sides; revoked/declined rows are kept for your audit trail. Shared signals are k-anonymized counts in checks — here you see the complete rows, including retracted ones.",
            membership: networkMembership ? {
                status: networkMembership.status,
                joinedAt: networkMembership.joinedAt,
                consentId: networkMembership.consentId
            } : null,
            attestations: networkEdges.map((e)=>{
                const partnerId = e.aUserId === userId ? e.bUserId : e.aUserId;
                const partner = networkPartners.find((p)=>p.id === partnerId);
                return {
                    id: e.id,
                    yourRole: e.requestedById === userId ? "requester" : "invited",
                    partnerHandle: partner?.handle ?? null,
                    partnerName: partner?.displayName ?? null,
                    status: e.status,
                    requestedAt: e.requestedAt,
                    respondedAt: e.respondedAt,
                    activatedAt: e.activatedAt,
                    revokedAt: e.revokedAt,
                    revokedByYou: e.revokedById === userId,
                    expiresAt: e.expiresAt
                };
            }),
            sharedSignals: networkSignals.map((s)=>({
                    id: s.id,
                    kind: s.kind,
                    platform: s.platform,
                    platformMode: s.platformMode,
                    severity: s.severity,
                    note: s.note,
                    sourceType: s.sourceType,
                    createdAt: s.createdAt,
                    expiresAt: s.expiresAt,
                    retractedAt: s.retractedAt
                }))
        }
    };
}
async function createDsrExport(userId) {
    const payload = await buildExportPayload(userId);
    const payloadStr = JSON.stringify(payload, null, 2);
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dsrRequest.create({
        data: {
            userId,
            type: "EXPORT",
            status: "COMPLETED",
            detail: "Data export generated (NDPA §36 right of access)",
            payload: payloadStr,
            completedAt: new Date(),
            expiresAt: new Date(Date.now() + DSR_EXPORT_RETENTION_MS)
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "DSR_EXPORT_COMPLETED",
        subjectType: "DsrRequest",
        subjectId: row.id,
        metadata: {
            exportBytes: payloadStr.length,
            type: "EXPORT"
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SYSTEM", "Your data export is ready", "Your NDPA §36 data export has been generated and is available to download for 7 days.");
    return {
        id: row.id,
        bytes: payloadStr.length,
        expiresAt: row.expiresAt.toISOString()
    };
}
async function getDsrExportPayload(userId, requestId) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dsrRequest.findFirst({
        where: {
            id: requestId,
            userId
        }
    });
    if (!row || row.type !== "EXPORT" || !row.payload) return null;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
        return {
            expired: true
        };
    }
    return {
        expired: false,
        payload: row.payload,
        id: row.id
    };
}
async function requestDsrDelete(req, password) {
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSessionUser"])(req);
    if (!user) return {
        outcome: "NOT_FOUND"
    };
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            id: user.id
        }
    });
    if (!row) return {
        outcome: "NOT_FOUND"
    };
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyPassword"])(password, row.passwordSalt, row.passwordHash)) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: user.id,
            action: "DSR_DELETE_REQUESTED",
            metadata: {
                outcome: "rejected"
            }
        });
        return {
            outcome: "WRONG_PASSWORD"
        };
    }
    // Final export snapshot (legal kindness — last chance to take your data).
    const exportRow = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dsrRequest.create({
        data: {
            userId: user.id,
            type: "EXPORT",
            status: "COMPLETED",
            detail: "Final export generated before account deletion",
            payload: JSON.stringify(await buildExportPayload(user.id), null, 2),
            completedAt: new Date(),
            expiresAt: new Date(Date.now() + DSR_EXPORT_RETENTION_MS)
        }
    });
    // Tombstone BEFORE the cascade wipe — AuditEvent has no FK to the user, so
    // it survives. Redacted: counts only, no PII.
    const counts = {
        consents: await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.count({
            where: {
                userId: user.id
            }
        }),
        evidence: await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].evidence.count({
            where: {
                userId: user.id
            }
        }),
        receipts: await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustReceipt.count({
            where: {
                userId: user.id
            }
        })
    };
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: user.id,
        action: "DSR_DELETE_COMPLETED",
        subjectType: "UserAccount",
        subjectId: user.id,
        metadata: {
            deleted: true,
            requests: counts.consents + counts.evidence + counts.receipts
        }
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.delete({
        where: {
            id: user.id
        }
    }); // cascade wipes identity spine
    return {
        outcome: "OK",
        exportFirst: {
            id: exportRow.id
        }
    };
}
async function listDsrRequests(userId) {
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dsrRequest.findMany({
        where: {
            userId
        },
        orderBy: {
            requestedAt: "desc"
        },
        take: 10,
        select: {
            id: true,
            type: true,
            status: true,
            detail: true,
            requestedAt: true,
            completedAt: true,
            expiresAt: true
        }
    });
    return rows.map((r)=>({
            ...r,
            requestedAt: r.requestedAt.toISOString(),
            completedAt: r.completedAt?.toISOString() ?? null,
            expiresAt: r.expiresAt?.toISOString() ?? null
        }));
}
}),
"[project]/src/lib/services/reputation-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "APPEAL_WINDOW_MS",
    ()=>APPEAL_WINDOW_MS,
    "FLAGS_RETAIN",
    ()=>FLAGS_RETAIN,
    "FLAG_CATEGORIES",
    ()=>FLAG_CATEGORIES,
    "FLAG_CATEGORY_LABELS",
    ()=>FLAG_CATEGORY_LABELS,
    "FLAG_STATUS_LABELS",
    ()=>FLAG_STATUS_LABELS,
    "FLAG_WINDOW_MAX",
    ()=>FLAG_WINDOW_MAX,
    "FLAG_WINDOW_MS",
    ()=>FLAG_WINDOW_MS,
    "createFlag",
    ()=>createFlag,
    "decideAppeal",
    ()=>decideAppeal,
    "decideFlag",
    ()=>decideFlag,
    "effectiveAssuranceLevel",
    ()=>effectiveAssuranceLevel,
    "fileAppeal",
    ()=>fileAppeal,
    "getReputationMe",
    ()=>getReputationMe,
    "getReviewQueue",
    ()=>getReviewQueue,
    "respondToFlag",
    ()=>respondToFlag,
    "withdrawFlag",
    ()=>withdrawFlag
]);
// TrustScore Stage 7 — ReputationService (directive §29 flags/flag_evidence,
// §33 human review, §36 Verified Reputation + Resolution History components).
//
// The reputation layer: flags with evidence → human-reviewed resolution →
// optional subject appeal. Anti-gaming is a design property, not an
// afterthought:
//   * filing a flag requires a live L2+ Trust Identity (a verified human,
//     not a fresh anonymous account)
//   * one OPEN/UNDER_REVIEW flag per reporter→subject pair
//   * at most 3 flags per rolling 7-day window per reporter
//   * at least one evidence item at submission; description must be substantive
//   * the reporter is MASKED to the subject (retaliation shield) — the full
//     record stays available to the subject via NDPA DSR export
//   * decisions are HUMAN (REVIEWER role) — no automated significant
//     decisions in Stage 7 (NDPC guidance; DPIA gate belongs to Stage 8)
//
// Verified interactions (limited Stage 7 form): each DISTINCT verified member
// (current L2+) who ran a consent-backed check on the subject via handle,
// trust link or QR in the last 90 days counts once — +3 reputation points,
// capped at 15. Cleared flags (UNFOUNDED/DISMISSED after human review) give
// +2 resolution-history points, capped at 10. Confirmed flags feed Confirmed
// Risk (−25, cap −50) — computed by the score engine via the same queries.
//
// Red lines: a flag is a report to the platform — never a public accusation;
// the locked subject-facing language never asserts the subject is "safe" or
// "fraudulent" — outcomes are statements about reviewed evidence only.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$engine$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/engine-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/notification-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$network$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/network-service.ts [app-route] (ecmascript)");
;
;
;
;
;
const FLAG_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // rolling reporter quota window
const FLAG_WINDOW_MAX = 3; // max flags per reporter per window
const APPEAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // subject appeal window after a decision
const FLAGS_RETAIN = 50; // max rows surfaced in read models
const FLAG_CATEGORIES = [
    "FRAUD",
    "IMPERSONATION",
    "NON_PAYMENT",
    "SCAM",
    "HARASSMENT",
    "OTHER"
];
const FLAG_CATEGORY_LABELS = {
    FRAUD: "Fraud or deception",
    IMPERSONATION: "Impersonation",
    NON_PAYMENT: "Payment or delivery failure",
    SCAM: "Scam",
    HARASSMENT: "Harassment or abuse",
    OTHER: "Other serious concern"
};
const FLAG_STATUS_LABELS = {
    OPEN: "Open — awaiting your response",
    UNDER_REVIEW: "Under human review",
    RESOLVED_CONFIRMED: "Confirmed after review",
    RESOLVED_UNFOUNDED: "Cleared — unfounded",
    RESOLVED_DISMISSED: "Cleared — dismissed",
    WITHDRAWN: "Withdrawn by reporter"
};
// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function maskHandle(handle) {
    if (handle.length <= 2) return "@**";
    return `@${handle.slice(0, 2)}${"*".repeat(Math.min(4, Math.max(2, handle.length - 2)))}`;
}
async function effectiveAssuranceLevel(userId) {
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
        where: {
            userId
        },
        select: {
            status: true,
            assuranceLevel: true,
            expiresAt: true
        }
    });
    if (!identity) return 0;
    const live = identity.status === "VERIFIED" && (identity.expiresAt?.getTime() ?? 0) > Date.now();
    return live ? identity.assuranceLevel : 0;
}
async function assuranceLevelsFor(userIds) {
    const out = new Map();
    if (userIds.length === 0) return out;
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findMany({
        where: {
            userId: {
                in: userIds
            }
        },
        select: {
            userId: true,
            status: true,
            assuranceLevel: true,
            expiresAt: true
        }
    });
    const now = Date.now();
    for (const r of rows){
        const live = r.status === "VERIFIED" && (r.expiresAt?.getTime() ?? 0) > now;
        out.set(r.userId, live ? r.assuranceLevel : 0);
    }
    return out;
}
async function createFlag(reporter, input) {
    // Anti-gaming gate 1 — verified human behind the report.
    const level = await effectiveAssuranceLevel(reporter.id);
    if (level < 2) return {
        ok: false,
        code: "ASSURANCE_REQUIRED"
    };
    const handle = input.subjectHandle.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
        return {
            ok: false,
            code: "SUBJECT_NOT_FOUND"
        };
    }
    const subject = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            handle
        },
        select: {
            id: true,
            handle: true,
            displayName: true,
            status: true
        }
    });
    if (!subject || subject.status !== "ACTIVE") {
        return {
            ok: false,
            code: "SUBJECT_NOT_FOUND"
        };
    }
    if (subject.id === reporter.id) return {
        ok: false,
        code: "SELF_FLAG"
    };
    // Anti-gaming gate 2 — one open case per pair.
    const open = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.findFirst({
        where: {
            reporterId: reporter.id,
            subjectId: subject.id,
            status: {
                in: [
                    "OPEN",
                    "UNDER_REVIEW"
                ]
            }
        },
        select: {
            id: true
        }
    });
    if (open) return {
        ok: false,
        code: "DUPLICATE_OPEN"
    };
    // Anti-gaming gate 3 — rolling weekly quota (flag wars are expensive).
    const windowStart = new Date(Date.now() - FLAG_WINDOW_MS);
    const recent = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.count({
        where: {
            reporterId: reporter.id,
            createdAt: {
                gte: windowStart
            }
        }
    });
    if (recent >= FLAG_WINDOW_MAX) return {
        ok: false,
        code: "FLAG_WINDOW"
    };
    const flag = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.create({
        data: {
            reporterId: reporter.id,
            subjectId: subject.id,
            category: input.category,
            description: input.description.trim(),
            evidenceCount: input.evidence.length,
            evidence: {
                create: input.evidence.map((e)=>({
                        submittedById: reporter.id,
                        role: "REPORTER",
                        kind: e.kind,
                        content: e.content.trim()
                    }))
            }
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(subject.id, "SECURITY", "A member filed a flag against your profile", `A verified member reported a ${FLAG_CATEGORY_LABELS[input.category] ?? input.category.toLowerCase()} concern. You can respond with your side of the story — a human reviews every case before anything affects your TrustScore. Reporter identities are masked to prevent retaliation.`);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: reporter.id,
        action: "FLAG_SUBMITTED",
        subjectType: "UserAccount",
        subjectId: subject.id,
        metadata: {
            category: input.category,
            evidenceCount: input.evidence.length
        }
    });
    return {
        ok: true,
        flagId: flag.id
    };
}
async function respondToFlag(subjectId, flagId, input) {
    const flag = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.findUnique({
        where: {
            id: flagId
        }
    });
    if (!flag) return {
        ok: false,
        code: "NOT_FOUND"
    };
    if (flag.subjectId !== subjectId) return {
        ok: false,
        code: "NOT_SUBJECT"
    };
    if (flag.status !== "OPEN") {
        return flag.status === "UNDER_REVIEW" && flag.subjectRespondedAt ? {
            ok: false,
            code: "ALREADY_RESPONDED"
        } : {
            ok: false,
            code: "NOT_OPEN"
        };
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flagEvidence.createMany({
        data: [
            {
                flagId: flag.id,
                submittedById: subjectId,
                role: "SUBJECT",
                kind: "TEXT",
                content: input.response.trim()
            },
            ...input.evidence.map((e)=>({
                    flagId: flag.id,
                    submittedById: subjectId,
                    role: "SUBJECT",
                    kind: e.kind,
                    content: e.content.trim()
                }))
        ]
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.update({
        where: {
            id: flag.id
        },
        data: {
            status: "UNDER_REVIEW",
            subjectRespondedAt: new Date(),
            evidenceCount: {
                increment: 1 + input.evidence.length
            }
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(flag.reporterId, "SYSTEM", "Your flag is now under human review", "The member you flagged has responded with their side. A TrustScore reviewer will examine the evidence and decide. You will be notified of the outcome.");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: subjectId,
        action: "FLAG_RESPONSE",
        subjectType: "Flag",
        subjectId: flag.id,
        metadata: {
            evidenceCount: input.evidence.length
        }
    });
    return {
        ok: true
    };
}
async function withdrawFlag(reporterId, flagId) {
    const flag = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.findUnique({
        where: {
            id: flagId
        }
    });
    if (!flag) return {
        ok: false,
        code: "NOT_FOUND"
    };
    if (flag.reporterId !== reporterId) return {
        ok: false,
        code: "NOT_REPORTER"
    };
    if (flag.status !== "OPEN") return {
        ok: false,
        code: "NOT_WITHDRAWABLE"
    };
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.update({
        where: {
            id: flag.id
        },
        data: {
            status: "WITHDRAWN"
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(flag.subjectId, "SYSTEM", "A flag against you was withdrawn", "The reporter withdrew their flag before a decision. It has no effect on your TrustScore and will not appear in checks.");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: reporterId,
        action: "FLAG_WITHDRAWN",
        subjectType: "UserAccount",
        subjectId: flag.subjectId,
        metadata: {}
    });
    return {
        ok: true
    };
}
async function fileAppeal(subjectId, flagId, input) {
    const flag = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.findUnique({
        where: {
            id: flagId
        },
        include: {
            resolution: true,
            appeal: true
        }
    });
    if (!flag) return {
        ok: false,
        code: "NOT_FOUND"
    };
    if (flag.subjectId !== subjectId) return {
        ok: false,
        code: "NOT_SUBJECT"
    };
    if (flag.status !== "RESOLVED_CONFIRMED" || !flag.resolution) {
        return {
            ok: false,
            code: "NOT_CONFIRMED"
        };
    }
    if (flag.appeal) return {
        ok: false,
        code: "ALREADY_APPEALED"
    };
    const decidedAt = flag.resolution.decidedAt.getTime();
    if (Date.now() - decidedAt > APPEAL_WINDOW_MS) {
        return {
            ok: false,
            code: "WINDOW_CLOSED"
        };
    }
    const appeal = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flagAppeal.create({
        data: {
            flagId: flag.id,
            appellantId: subjectId,
            reason: input.reason.trim()
        }
    });
    // Stage 8 — fairness freeze: while the appeal is under human review, the
    // subject's TrustScore cannot move (up or down). Recompute resumes on the
    // appeal decision (unfreezeScoresFor → markMaterialChange).
    const froze = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$engine$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["freezeScoresFor"])(subjectId, "APPEAL_PENDING");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(subjectId, "SECURITY", "Appeal filed — under human review", froze === "FROZEN" || froze === "ALREADY_FROZEN" ? "Your appeal of a confirmed flag is queued for a reviewer. The reviewer examines the original evidence, your response and your appeal reason. While the appeal is pending, your TrustScore is FROZEN — it cannot move up or down until the human decision lands. You will be notified when the appeal is decided." : "Your appeal of a confirmed flag is queued for a reviewer. The reviewer examines the original evidence, your response and your appeal reason. You will be notified when the appeal is decided.");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: subjectId,
        action: "APPEAL_FILED",
        subjectType: "Flag",
        subjectId: flag.id,
        metadata: {}
    });
    return {
        ok: true,
        appealId: appeal.id
    };
}
function isReviewer(user) {
    return user.role === "REVIEWER";
}
async function getReviewQueue(reviewer) {
    if (!isReviewer(reviewer)) return null;
    // Dangling-FK tolerant (see getReputationMe): handles resolve post-query.
    const flags = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.findMany({
        where: {
            status: {
                in: [
                    "UNDER_REVIEW",
                    "OPEN"
                ]
            }
        },
        orderBy: [
            {
                status: "desc"
            },
            {
                createdAt: "asc"
            }
        ],
        take: FLAGS_RETAIN,
        include: {
            evidence: {
                orderBy: {
                    createdAt: "asc"
                }
            },
            appeal: true
        }
    });
    const appeals = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flagAppeal.findMany({
        where: {
            status: "PENDING"
        },
        orderBy: {
            createdAt: "asc"
        },
        take: FLAGS_RETAIN,
        include: {
            flag: {
                include: {
                    evidence: {
                        orderBy: {
                            createdAt: "asc"
                        }
                    },
                    resolution: true
                }
            }
        }
    });
    const partyIds = [
        ...new Set([
            ...flags.flatMap((f)=>[
                    f.reporterId,
                    f.subjectId
                ]),
            ...appeals.flatMap((a)=>[
                    a.flag.reporterId,
                    a.flag.subjectId,
                    a.appellantId
                ])
        ])
    ];
    const parties = partyIds.length ? await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
        where: {
            id: {
                in: partyIds
            }
        },
        select: {
            id: true,
            handle: true,
            displayName: true
        }
    }) : [];
    const party = (id)=>parties.find((p)=>p.id === id) ?? {
            id,
            handle: "deleted-member",
            displayName: "Deleted member"
        };
    const levels = await assuranceLevelsFor(partyIds);
    return {
        queue: flags.map((f)=>({
                id: f.id,
                category: f.category,
                description: f.description,
                status: f.status,
                createdAt: f.createdAt.toISOString(),
                subjectRespondedAt: f.subjectRespondedAt?.toISOString() ?? null,
                reporter: {
                    handle: party(f.reporterId).handle,
                    displayName: party(f.reporterId).displayName,
                    assuranceLevel: levels.get(f.reporterId) ?? 0
                },
                subject: {
                    handle: party(f.subjectId).handle,
                    displayName: party(f.subjectId).displayName,
                    assuranceLevel: levels.get(f.subjectId) ?? 0
                },
                evidence: f.evidence.map((e)=>({
                        id: e.id,
                        role: e.role,
                        kind: e.kind,
                        content: e.content,
                        createdAt: e.createdAt.toISOString()
                    }))
            })),
        appeals: appeals.map((a)=>({
                id: a.id,
                reason: a.reason,
                createdAt: a.createdAt.toISOString(),
                flag: {
                    id: a.flag.id,
                    category: a.flag.category,
                    description: a.flag.description,
                    status: a.flag.status,
                    createdAt: a.flag.createdAt.toISOString(),
                    reporter: {
                        handle: party(a.flag.reporterId).handle,
                        displayName: party(a.flag.reporterId).displayName
                    },
                    subject: {
                        handle: party(a.flag.subjectId).handle,
                        displayName: party(a.flag.subjectId).displayName
                    },
                    resolution: a.flag.resolution ? {
                        outcome: a.flag.resolution.outcome,
                        rationale: a.flag.resolution.rationale,
                        decidedAt: a.flag.resolution.decidedAt.toISOString()
                    } : null,
                    evidence: a.flag.evidence.map((e)=>({
                            id: e.id,
                            role: e.role,
                            kind: e.kind,
                            content: e.content,
                            createdAt: e.createdAt.toISOString()
                        }))
                }
            })),
        reviewerHandleNote: "Decisions are attributed to you as reviewer and published to both parties. You cannot decide a case you filed."
    };
}
async function decideFlag(reviewer, flagId, input) {
    if (!isReviewer(reviewer)) return {
        ok: false,
        code: "NOT_REVIEWER"
    };
    const flag = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.findUnique({
        where: {
            id: flagId
        }
    });
    if (!flag) return {
        ok: false,
        code: "NOT_FOUND"
    };
    if (![
        "OPEN",
        "UNDER_REVIEW"
    ].includes(flag.status)) return {
        ok: false,
        code: "NOT_DECIDABLE"
    };
    // Conflict of interest — a reviewer never decides their own case.
    if (flag.reporterId === reviewer.id || flag.subjectId === reviewer.id) {
        return {
            ok: false,
            code: "CONFLICT"
        };
    }
    const newStatus = input.outcome === "CONFIRMED" ? "RESOLVED_CONFIRMED" : input.outcome === "UNFOUNDED" ? "RESOLVED_UNFOUNDED" : "RESOLVED_DISMISSED";
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flagResolution.create({
        data: {
            flagId: flag.id,
            reviewerId: reviewer.id,
            outcome: input.outcome,
            rationale: input.rationale.trim(),
            fraudSignal: input.outcome === "CONFIRMED"
        }
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.update({
        where: {
            id: flag.id
        },
        data: {
            status: newStatus
        }
    });
    // Stage 10 — a human-confirmed adverse event also mints a k-anonymized
    // shared signal for the network surface (idempotent per flag; the flag's
    // 14-day appeal path is the dispute route).
    if (input.outcome === "CONFIRMED") {
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$network$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mintSignalFromFlag"])({
                id: flag.id,
                subjectId: flag.subjectId,
                category: flag.category
            });
        } catch  {}
    }
    if (input.outcome === "CONFIRMED") {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(flag.subjectId, "SECURITY", "A flag against you was confirmed after human review", "A reviewer examined the evidence and confirmed the concern. It now appears as a confirmed risk signal on your TrustScore (−25, and your status changes). You have 14 days to appeal — an appeal sends the case to a fresh human review.");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(flag.reporterId, "SYSTEM", "Your flag was reviewed: confirmed", "A TrustScore reviewer confirmed the concern you reported. Thank you — confirmed flags are one of the strongest protections the network has.");
    } else {
        const clearedLabel = input.outcome === "UNFOUNDED" ? "found to be unfounded" : "dismissed";
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(flag.subjectId, "SYSTEM", "A flag against you was cleared", `After human review, the flag was ${clearedLabel}. It does not appear in checks and contributes to your resolution history (+2, capped at 10). The reviewer's rationale is available in your Reputation tab.`);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(flag.reporterId, "SYSTEM", `Your flag was reviewed: ${input.outcome.toLowerCase()}`, `A TrustScore reviewer ${clearedLabel === "found to be unfounded" ? "found the flag unfounded" : "dismissed the flag"}. Flagging is a serious action — thank you for raising the concern.`);
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: reviewer.id,
        action: "FLAG_RESOLUTION",
        subjectType: "UserAccount",
        subjectId: flag.subjectId,
        metadata: {
            outcome: input.outcome
        }
    });
    return {
        ok: true,
        outcome: newStatus,
        subjectId: flag.subjectId
    };
}
async function decideAppeal(reviewer, appealId, input) {
    if (!isReviewer(reviewer)) return {
        ok: false,
        code: "NOT_REVIEWER"
    };
    const appeal = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flagAppeal.findUnique({
        where: {
            id: appealId
        },
        include: {
            flag: {
                include: {
                    resolution: true
                }
            }
        }
    });
    if (!appeal) return {
        ok: false,
        code: "NOT_FOUND"
    };
    if (appeal.status !== "PENDING") return {
        ok: false,
        code: "NOT_PENDING"
    };
    if (appeal.flag.reporterId === reviewer.id || appeal.flag.subjectId === reviewer.id) {
        return {
            ok: false,
            code: "CONFLICT"
        };
    }
    const decidedAt = new Date();
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flagAppeal.update({
        where: {
            id: appeal.id
        },
        data: {
            status: input.outcome,
            reviewerId: reviewer.id,
            decisionNote: input.note.trim(),
            decidedAt
        }
    });
    // Stage 8 — lift the fairness freeze: retire the FROZEN snapshot (kept in
    // history) and recompute fresh. The routes call markMaterialChange too;
    // unfreezeScoresFor is idempotent and safe to call first.
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$engine$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["unfreezeScoresFor"])(appeal.appellantId);
    } catch  {
    // A recompute failure must never block the human decision itself.
    }
    if (input.outcome === "OVERTURNED") {
        // Redress: the confirmed flag flips to unfounded; the resolution row keeps
        // the original decision for the record, the flag status is the live truth.
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.update({
            where: {
                id: appeal.flagId
            },
            data: {
                status: "RESOLVED_UNFOUNDED"
            }
        });
        // Stage 10 — the shared signal minted from this flag retracts with it.
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$network$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["retractSignalsForFlag"])(appeal.flagId);
        } catch  {}
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(appeal.appellantId, "SYSTEM", "Your appeal succeeded — the flag was overturned", "A reviewer re-examined the case and overturned the confirmation. The flag now reads as cleared: the risk penalty is removed and it counts toward your resolution history. The reviewer's note is in your Reputation tab.");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(appeal.flag.reporterId, "SYSTEM", "A flag you filed was overturned on appeal", "The subject appealed the confirmation and a reviewer overturned it. The flag now reads as unfounded and no longer affects their TrustScore.");
    } else {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(appeal.appellantId, "SECURITY", "Your appeal was reviewed — the decision stands", "A reviewer re-examined the case and upheld the confirmation. The reviewer's note explains the reasoning. The flag remains a confirmed risk signal.");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(appeal.flag.reporterId, "SYSTEM", "A flag you filed was upheld on appeal", "The subject appealed the confirmation; a reviewer re-examined the evidence and upheld it.");
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: reviewer.id,
        action: "APPEAL_DECIDED",
        subjectType: "UserAccount",
        subjectId: appeal.appellantId,
        metadata: {
            outcome: input.outcome
        }
    });
    return {
        ok: true,
        outcome: input.outcome,
        appellantId: appeal.appellantId
    };
}
async function getReputationMe(userId) {
    // Dangling-FK tolerance: flags may outlive a raw-SQL-deleted counterparty
    // (test cleanups). Reporter/subject handles are resolved AFTER the flag
    // query via a tolerant lookup — a Prisma relation include would throw
    // "Inconsistent query result" on dangling rows.
    const [user, myLevel, flagsAgainst, flagsFiled] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
            where: {
                id: userId
            },
            select: {
                role: true,
                handle: true
            }
        }),
        effectiveAssuranceLevel(userId),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.findMany({
            where: {
                subjectId: userId
            },
            orderBy: {
                createdAt: "desc"
            },
            take: FLAGS_RETAIN,
            include: {
                evidence: {
                    orderBy: {
                        createdAt: "asc"
                    }
                },
                resolution: true,
                appeal: true
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].flag.findMany({
            where: {
                reporterId: userId
            },
            orderBy: {
                createdAt: "desc"
            },
            take: FLAGS_RETAIN,
            include: {
                resolution: true,
                appeal: true
            }
        })
    ]);
    const counterpartyIds = [
        ...new Set([
            ...flagsAgainst.map((f)=>f.reporterId),
            ...flagsFiled.map((f)=>f.subjectId)
        ])
    ];
    const counterparties = counterpartyIds.length ? await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
        where: {
            id: {
                in: counterpartyIds
            }
        },
        select: {
            id: true,
            handle: true
        }
    }) : [];
    const handleOf = (id)=>counterparties.find((u)=>u.id === id)?.handle ?? "deleted-member";
    const reporterLevels = await assuranceLevelsFor(flagsAgainst.map((f)=>f.reporterId));
    const now = Date.now();
    const shapeEvidence = (e)=>({
            id: e.id,
            role: e.role,
            kind: e.kind,
            content: e.content,
            createdAt: e.createdAt.toISOString()
        });
    const appealWindowEndsAt = (f)=>f.resolution ? new Date(f.resolution.decidedAt.getTime() + APPEAL_WINDOW_MS).toISOString() : null;
    const canAppeal = (f)=>f.status === "RESOLVED_CONFIRMED" && !f.appeal && f.resolution !== null && now - f.resolution.decidedAt.getTime() <= APPEAL_WINDOW_MS;
    const confirmedCount = flagsAgainst.filter((f)=>f.status === "RESOLVED_CONFIRMED").length;
    const clearedCount = flagsAgainst.filter((f)=>[
            "RESOLVED_UNFOUNDED",
            "RESOLVED_DISMISSED"
        ].includes(f.status)).length;
    return {
        role: user?.role ?? "USER",
        canFileFlags: myLevel >= 2,
        myAssuranceLevel: myLevel,
        flagWindow: {
            max: FLAG_WINDOW_MAX,
            days: 7
        },
        appealWindowDays: 14,
        flagsAgainstMe: flagsAgainst.map((f)=>{
            const subjectEvidence = f.evidence.filter((e)=>e.role === "SUBJECT");
            const response = subjectEvidence.find((e)=>e.kind === "TEXT") ?? null;
            return {
                id: f.id,
                category: f.category,
                categoryLabel: FLAG_CATEGORY_LABELS[f.category] ?? f.category,
                description: f.description,
                status: f.status,
                reporter: {
                    maskedHandle: maskHandle(handleOf(f.reporterId)),
                    assuranceLevel: reporterLevels.get(f.reporterId) ?? 0
                },
                evidence: f.evidence.filter((e)=>e.role === "REPORTER").map(shapeEvidence),
                myResponse: response ? {
                    content: response.content,
                    at: response.createdAt.toISOString()
                } : null,
                myEvidence: subjectEvidence.filter((e)=>e.kind !== "TEXT" || e !== response).map(shapeEvidence),
                resolution: f.resolution ? {
                    outcome: f.resolution.outcome,
                    rationale: f.resolution.rationale,
                    decidedAt: f.resolution.decidedAt.toISOString()
                } : null,
                appeal: f.appeal ? {
                    status: f.appeal.status,
                    reason: f.appeal.reason,
                    decisionNote: f.appeal.decisionNote,
                    decidedAt: f.appeal.decidedAt?.toISOString() ?? null
                } : null,
                canRespond: f.status === "OPEN",
                canAppeal: canAppeal(f),
                appealWindowEndsAt: appealWindowEndsAt(f),
                createdAt: f.createdAt.toISOString(),
                subjectRespondedAt: f.subjectRespondedAt?.toISOString() ?? null
            };
        }),
        flagsFiledByMe: flagsFiled.map((f)=>({
                id: f.id,
                subjectHandle: handleOf(f.subjectId),
                category: f.category,
                categoryLabel: FLAG_CATEGORY_LABELS[f.category] ?? f.category,
                description: f.description,
                status: f.status,
                evidenceCount: f.evidenceCount,
                resolution: f.resolution ? {
                    outcome: f.resolution.outcome,
                    rationale: f.resolution.rationale,
                    decidedAt: f.resolution.decidedAt.toISOString()
                } : null,
                appeal: f.appeal ? {
                    status: f.appeal.status
                } : null,
                canWithdraw: f.status === "OPEN",
                createdAt: f.createdAt.toISOString()
            })),
        stats: {
            openAgainstMe: flagsAgainst.filter((f)=>[
                    "OPEN",
                    "UNDER_REVIEW"
                ].includes(f.status)).length,
            confirmedAgainstMe: confirmedCount,
            clearedAgainstMe: clearedCount,
            filedByMe: flagsFiled.filter((f)=>f.status !== "WITHDRAWN").length
        },
        maskNote: "Reporter identities are masked in this view to prevent retaliation. Your full data-subject record (including reporter identifiers) is available in your NDPA data export."
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
"[project]/src/lib/providers/ninauth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AUTH_LOGIN_TTL_MS",
    ()=>AUTH_LOGIN_TTL_MS,
    "AUTH_PURPOSE",
    ()=>AUTH_PURPOSE,
    "AUTH_SCOPES",
    ()=>AUTH_SCOPES,
    "CODE_TTL_MS",
    ()=>CODE_TTL_MS,
    "CONSENT_POLICY_VERSION",
    ()=>CONSENT_POLICY_VERSION,
    "CORE_SCOPES",
    ()=>CORE_SCOPES,
    "DEFAULT_SCOPES",
    ()=>DEFAULT_SCOPES,
    "IDENTITY_FRESHNESS_DAYS",
    ()=>IDENTITY_FRESHNESS_DAYS,
    "LOOPBACK_ISSUER",
    ()=>LOOPBACK_ISSUER,
    "LOOPBACK_SIGNING_SECRET",
    ()=>LOOPBACK_SIGNING_SECRET,
    "LOOPBACK_TRUST",
    ()=>LOOPBACK_TRUST,
    "NINAUTH_CLIENT_ID",
    ()=>NINAUTH_CLIENT_ID,
    "NINAUTH_MODE",
    ()=>NINAUTH_MODE,
    "NINAUTH_PROVIDER_NAME",
    ()=>NINAUTH_PROVIDER_NAME,
    "OPTIONAL_SCOPES",
    ()=>OPTIONAL_SCOPES,
    "PURPOSE",
    ()=>PURPOSE,
    "REQUESTER",
    ()=>REQUESTER,
    "SCOPE_CATALOG",
    ()=>SCOPE_CATALOG,
    "SESSION_TTL_MS",
    ()=>SESSION_TTL_MS,
    "TokenValidationError",
    ()=>TokenValidationError,
    "attributeKeysForScopes",
    ()=>attributeKeysForScopes,
    "authAuthorizationUrlFor",
    ()=>authAuthorizationUrlFor,
    "authorizationUrlFor",
    ()=>authorizationUrlFor,
    "codeMatches",
    ()=>codeMatches,
    "consentScreenFor",
    ()=>consentScreenFor,
    "generatePkce",
    ()=>generatePkce,
    "generateShareCode",
    ()=>generateShareCode,
    "generateState",
    ()=>generateState,
    "hashCode",
    ()=>hashCode,
    "identifierFingerprint",
    ()=>identifierFingerprint,
    "issueAuthorizationCode",
    ()=>issueAuthorizationCode,
    "issueMockIdToken",
    ()=>issueMockIdToken,
    "maskedSubjectFor",
    ()=>maskedSubjectFor,
    "maskedSubjectForAuthKey",
    ()=>maskedSubjectForAuthKey,
    "mockAuthTokenExchange",
    ()=>mockAuthTokenExchange,
    "mockProfileFor",
    ()=>mockProfileFor,
    "mockTokenExchange",
    ()=>mockTokenExchange,
    "pkceChallengeMatches",
    ()=>pkceChallengeMatches,
    "validateIdToken",
    ()=>validateIdToken
]);
// TrustScore Stage 2 — NINAuth provider adapter (CONTRACT-FIRST, MOCK transport).
//
// This module implements the exact contract the real NINAuth partner integration
// will use (per docs/STAGE0_AUDIT.md §2.1/§4.2):
//   OAuth 2.0 Authorization Code flow + PKCE (S256), OIDC-style ID tokens,
//   consent-bound scoped responses — with a MOCK transport. The LIVE
// implementation swaps only the transport (HTTP calls to the partner's
// authorize/token endpoints) — the session, PKCE, validation and consent logic
// stays identical.
//
// Security invariants (directive §32):
//   - Client secret lives ONLY here (backend) — never sent to any client.
//   - ID tokens are VALIDATED (signature, issuer, audience, expiry, nonce) —
//     never merely decoded.
//   - The PKCE verifier never leaves the server.
//   - The provider returns a MASKED subject reference — never a raw NIN.
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/scope-mapping.config.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/boot-guard.ts [app-route] (ecmascript)");
;
;
;
const NINAUTH_PROVIDER_NAME = "NINAUTH_MOCK";
const NINAUTH_MODE = "MOCK"; // honestly labeled everywhere
const NINAUTH_CLIENT_ID = "trustscore_sandbox";
// Backend-only secret. In LIVE mode this becomes the partner-issued client
// secret from the environment — still never exposed to any frontend.
// sec-batch-A: guarded read — production refuses to boot on the dev default.
const NINAUTH_CLIENT_SECRET = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["guardedSecret"])("NINAUTH_CLIENT_SECRET");
const MOCK_ISSUER = "https://ninauth.nimc.gov.ng/mock";
const ID_TOKEN_TTL_SEC = 300;
const LOOPBACK_ISSUER = "https://provider-simulator.loopback/ninauth";
const LOOPBACK_SIGNING_SECRET = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["guardedSecret"])("LOOPBACK_SIGNING_SECRET");
const SESSION_TTL_MS = 10 * 60_000; // verification session TTL (authorize-flow-like)
const CODE_TTL_MS = 60_000; // one-time authorization code TTL
const IDENTITY_FRESHNESS_DAYS = 90; // re-verification horizon
const SCOPE_CATALOG = Object.fromEntries(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CAPABILITIES"].map((c)=>[
        c.mockScope,
        {
            label: c.label,
            description: c.description,
            ...c.core ? {
                core: c.core
            } : {},
            ...c.attributeKeys.length ? {
                attributeKeys: [
                    ...c.attributeKeys
                ]
            } : {}
        }
    ]));
const CORE_SCOPES = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CAPABILITIES"].filter((c)=>c.core).map((c)=>c.mockScope);
const OPTIONAL_SCOPES = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$scope$2d$mapping$2e$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CAPABILITIES"].filter((c)=>!c.core && c.attributeKeys.length > 0).map((c)=>c.mockScope);
const DEFAULT_SCOPES = [
    ...CORE_SCOPES
];
const PURPOSE = "SELF_IDENTITY_VERIFICATION";
const REQUESTER = "TrustScore";
const CONSENT_POLICY_VERSION = "consent-policy-2026.09";
const AUTH_PURPOSE = "NINAUTH_AUTHENTICATION";
const AUTH_SCOPES = [
    ...CORE_SCOPES
];
const AUTH_LOGIN_TTL_MS = 10 * 60_000;
function attributeKeysForScopes(scopes) {
    return scopes.flatMap((s)=>SCOPE_CATALOG[s]?.attributeKeys ?? []);
}
function generatePkce() {
    const verifier = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(32).toString("base64url");
    const challenge = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(verifier).digest("base64url");
    return {
        verifier,
        challenge
    };
}
function generateState() {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(24).toString("hex");
}
function generateShareCode() {
    const digits = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(2).toString("hex").slice(0, 4).replace(/[a-f]/g, (c)=>String(c.charCodeAt(0) % 10));
    const letters = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(4).toString("base64url").replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
    return `TS-${digits}-${letters.padEnd(4, "X")}`;
}
function pkceChallengeMatches(verifier, challenge) {
    const computed = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(verifier).digest("base64url");
    return safeEqual(computed, challenge);
}
function safeEqual(a, b) {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["timingSafeEqual"])(ba, bb);
}
function issueAuthorizationCode() {
    const code = `nac_${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(24).toString("base64url")}`;
    return {
        code,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS)
    };
}
function hashCode(code) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${NINAUTH_CLIENT_SECRET}:${code}`).digest("hex");
}
function codeMatches(storedHash, code) {
    return safeEqual(storedHash, hashCode(code));
}
function b64url(input) {
    return Buffer.from(input).toString("base64url");
}
function sign(data) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])("sha256", NINAUTH_CLIENT_SECRET).update(data).digest("base64url");
}
function issueMockIdToken(claims) {
    const iat = Math.floor(Date.now() / 1000);
    const full = {
        ...claims,
        iat,
        exp: iat + ID_TOKEN_TTL_SEC
    };
    const header = b64url(JSON.stringify({
        alg: "HS256",
        typ: "JWT",
        kid: "mock-key-1"
    }));
    const payload = b64url(JSON.stringify(full));
    const signature = sign(`${header}.${payload}`);
    return `${header}.${payload}.${signature}`;
}
// Default trust = the in-process mock provider (existing behavior).
const MOCK_TRUST = {
    issuer: MOCK_ISSUER,
    audience: NINAUTH_CLIENT_ID,
    secret: NINAUTH_CLIENT_SECRET
};
const LOOPBACK_TRUST = {
    issuer: LOOPBACK_ISSUER,
    audience: NINAUTH_CLIENT_ID,
    secret: LOOPBACK_SIGNING_SECRET
};
function validateIdToken(token, expectedNonce, trust = MOCK_TRUST) {
    const parts = token.split(".");
    if (parts.length !== 3) {
        throw new TokenValidationError("malformed_token");
    }
    const [header, payload, signature] = parts;
    // 1. Signature check (JWKS-backed verification in LIVE mode; the loopback
    //    simulator signs with its own shared key, validated identically).
    const expectedSig = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])("sha256", trust.secret).update(`${header}.${payload}`).digest("base64url");
    if (!safeEqual(signature, expectedSig)) {
        throw new TokenValidationError("bad_signature");
    }
    let claims;
    try {
        claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch  {
        throw new TokenValidationError("bad_payload");
    }
    // 2. Issuer
    if (claims.iss !== trust.issuer) {
        throw new TokenValidationError("bad_issuer");
    }
    // 3. Audience
    if (claims.aud !== trust.audience) {
        throw new TokenValidationError("bad_audience");
    }
    // 4. Expiry / issue time
    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== "number" || claims.exp <= now) {
        throw new TokenValidationError("expired");
    }
    if (typeof claims.iat !== "number" || claims.iat > now + 60) {
        throw new TokenValidationError("bad_iat");
    }
    // 5. Nonce binding (anti-replay / session binding)
    if (claims.nonce !== expectedNonce) {
        throw new TokenValidationError("bad_nonce");
    }
    return claims;
}
class TokenValidationError extends Error {
    code;
    constructor(code){
        super(code), this.code = code;
        this.name = "TokenValidationError";
    }
}
function mockTokenExchange(input) {
    // 1. Code validity (one-time code, 60s TTL) — timing-safe hash compare
    if (!codeMatches(input.storedCodeHash, input.code)) {
        throw new TokenValidationError("bad_code");
    }
    if (input.codeExpiresAt.getTime() < Date.now()) {
        throw new TokenValidationError("code_expired");
    }
    // 2. PKCE: S256(verifier) must equal the challenge bound at session creation
    if (!pkceChallengeMatches(input.codeVerifier, input.codeChallenge)) {
        throw new TokenValidationError("pkce_mismatch");
    }
    const profile = {};
    if (input.scopes.includes("profile.name")) {
        profile.given_name = input.profile.given_name;
        profile.family_name = input.profile.family_name;
    }
    if (input.scopes.includes("profile.demographics")) {
        profile.birth_year = input.profile.birth_year;
        profile.state_of_origin = input.profile.state_of_origin;
    }
    const id_token = issueMockIdToken({
        iss: MOCK_ISSUER,
        aud: NINAUTH_CLIENT_ID,
        sub: input.maskedSubject,
        scopes: input.scopes,
        nonce: input.nonce,
        verified: true,
        profile
    });
    return {
        access_token: `ts_mock_at_${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(24).toString("base64url")}`,
        token_type: "Bearer",
        expires_in: 3600,
        id_token
    };
}
function maskedSubjectFor(userId) {
    const h = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${NINAUTH_CLIENT_SECRET}:subject:${userId}`).digest("hex").slice(0, 4).toUpperCase();
    return `NINAUTH-****-${h}`;
}
function identifierFingerprint(providerSubject) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${NINAUTH_CLIENT_SECRET}:identifier:${providerSubject}`).digest("hex");
}
// ---------------------------------------------------------------------------
// Stage 3 — deterministic MOCK profile claims per user (contract-first: the
// LIVE partner returns these fields from the NIN record for granted scopes).
// ---------------------------------------------------------------------------
const GIVEN_NAMES = [
    "Adaeze",
    "Chidi",
    "Ngozi",
    "Emeka",
    "Funke",
    "Tunde",
    "Amina",
    "Ibrahim",
    "Yemi",
    "Chioma",
    "Bala",
    "Halima"
];
const FAMILY_NAMES = [
    "Okafor",
    "Eze",
    "Adeyemi",
    "Bello",
    "Okonkwo",
    "Lawal",
    "Uche",
    "Danladi",
    "Oliseh",
    "Abubakar",
    "Nwosu",
    "Afolayan"
];
const STATES = [
    "Anambra",
    "Enugu",
    "Lagos",
    "Kano",
    "Rivers",
    "Oyo",
    "Kaduna",
    "Delta",
    "Imo",
    "Sokoto",
    "Edo",
    "Plateau"
];
function seededFrom(seed, modulo) {
    const h = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${NINAUTH_CLIENT_SECRET}:seed:${seed}`).digest();
    return h.readUInt32BE(0) % modulo;
}
function mockProfileFor(userId) {
    return {
        given_name: GIVEN_NAMES[seededFrom(`gn:${userId}`, GIVEN_NAMES.length)],
        family_name: FAMILY_NAMES[seededFrom(`fn:${userId}`, FAMILY_NAMES.length)],
        birth_year: String(1972 + seededFrom(`by:${userId}`, 28)),
        state_of_origin: STATES[seededFrom(`st:${userId}`, STATES.length)]
    };
}
function consentScreenFor(scopes, purpose = PURPOSE) {
    const fields = scopes.filter((s)=>SCOPE_CATALOG[s]).map((s)=>({
            scope: s,
            label: SCOPE_CATALOG[s].label,
            description: SCOPE_CATALOG[s].description,
            core: SCOPE_CATALOG[s].core ?? false
        }));
    return {
        requester: REQUESTER,
        purpose,
        fields: fields.length ? fields : [
            {
                scope: "identity.basic",
                label: SCOPE_CATALOG["identity.basic"].label,
                description: SCOPE_CATALOG["identity.basic"].description,
                core: true
            }
        ],
        policyVersion: CONSENT_POLICY_VERSION,
        provider: NINAUTH_PROVIDER_NAME,
        mode: NINAUTH_MODE
    };
}
function authorizationUrlFor(state, codeChallenge) {
    const params = new URLSearchParams({
        client_id: NINAUTH_CLIENT_ID,
        response_type: "code",
        scope: DEFAULT_SCOPES.join(" "),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        redirect_uri: "https://trustscore.ng/api/v1/identity/sessions/callback"
    });
    return `https://ninauth.nimc.gov.ng/mock/authorize?${params.toString()}`;
}
function authAuthorizationUrlFor(state, codeChallenge) {
    const params = new URLSearchParams({
        client_id: NINAUTH_CLIENT_ID,
        response_type: "code",
        scope: AUTH_SCOPES.join(" "),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        redirect_uri: "https://trustscore.ng/api/v1/auth/ninauth/callback",
        prompt: "login"
    });
    return `https://ninauth.nimc.gov.ng/mock/authorize?${params.toString()}`;
}
function maskedSubjectForAuthKey(authKey) {
    const h = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${NINAUTH_CLIENT_SECRET}:authsubject:${authKey}`).digest("hex").slice(0, 4).toUpperCase();
    return `NINAUTH-****-${h}`;
}
function mockAuthTokenExchange(input) {
    if (!codeMatches(input.storedCodeHash, input.code)) {
        throw new TokenValidationError("bad_code");
    }
    if (input.codeExpiresAt.getTime() < Date.now()) {
        throw new TokenValidationError("code_expired");
    }
    if (!pkceChallengeMatches(input.codeVerifier, input.codeChallenge)) {
        throw new TokenValidationError("pkce_mismatch");
    }
    const profile = {};
    if (input.scopes.includes("profile.name")) {
        profile.given_name = input.profile.given_name;
        profile.family_name = input.profile.family_name;
    }
    const id_token = issueMockIdToken({
        iss: MOCK_ISSUER,
        aud: NINAUTH_CLIENT_ID,
        sub: input.maskedSubject,
        scopes: input.scopes,
        nonce: input.nonce,
        verified: true,
        profile,
        email: input.authEmail
    });
    return {
        access_token: `ts_mock_at_${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(24).toString("base64url")}`,
        token_type: "Bearer",
        expires_in: 3600,
        id_token
    };
}
}),
"[project]/src/lib/services/network-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EDGE_SCORE_WINDOW_DAYS",
    ()=>EDGE_SCORE_WINDOW_DAYS,
    "MAX_ACTIVE_EDGES",
    ()=>MAX_ACTIVE_EDGES,
    "PENDING_TTL_DAYS",
    ()=>PENDING_TTL_DAYS,
    "PROPOSE_QUOTA",
    ()=>PROPOSE_QUOTA,
    "PROPOSE_WINDOW_DAYS",
    ()=>PROPOSE_WINDOW_DAYS,
    "SIGNAL_KIND_CONFIRMED_ADVERSE",
    ()=>SIGNAL_KIND_CONFIRMED_ADVERSE,
    "SIGNAL_MIN_K",
    ()=>SIGNAL_MIN_K,
    "SIGNAL_WINDOW_DAYS",
    ()=>SIGNAL_WINDOW_DAYS,
    "buildNetworkBlockFor",
    ()=>buildNetworkBlockFor,
    "ensureNetworkSeeded",
    ()=>ensureNetworkSeeded,
    "expireStalePending",
    ()=>expireStalePending,
    "getMembership",
    ()=>getMembership,
    "getNetworkMe",
    ()=>getNetworkMe,
    "joinNetwork",
    ()=>joinNetwork,
    "listProviders",
    ()=>listProviders,
    "mintSignalFromFlag",
    ()=>mintSignalFromFlag,
    "pauseNetwork",
    ()=>pauseNetwork,
    "proposeInteraction",
    ()=>proposeInteraction,
    "respondToInteraction",
    ()=>respondToInteraction,
    "retractSignalsForFlag",
    ()=>retractSignalsForFlag,
    "revokeInteraction",
    ()=>revokeInteraction
]);
// TrustScore Stage 10 — Trust Network service (audit §4.2).
//
// The network layer: opt-in membership (NETWORK consent scope, NDPA §31),
// mutual verified-interaction edges (the TrustGraph), k-anonymized shared
// signals (FraudNet-class, band-level only) and the pan-African
// country-provider registry.
//
// Anti-gaming mirrors the reputation layer: both endpoints must be network
// members at L2+ to attest an interaction, proposals are quota-limited
// (3 / 7 days), a pair can hold at most one open lifecycle, active edges
// are capped (50) and revocable by either side.
//
// Score integration (deliberately conservative): edges feed the EXISTING
// Verified Reputation component — the same "distinct consented L2+
// verifier" primitive, never a new hidden number. Pausing membership by
// either endpoint stops the edge counting immediately (the recompute is
// triggered via markMaterialChange).
//
// Shared-signal discipline: counts and platform attribution ONLY. Real
// signals mint from human-confirmed flags (the flag's 14-day appeal window
// IS the dispute path) and retract automatically when an appeal overturns
// the confirmation. Signals are never exported raw to other members — the
// checker-facing surface is a count + band language (see
// buildNetworkBlockFor).
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/notification-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/trustscore-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$reputation$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/reputation-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/ninauth.ts [app-route] (ecmascript)");
;
;
;
;
;
;
// ---------------------------------------------------------------------------
// Constants (engine-owned, honest labels)
// ---------------------------------------------------------------------------
const NETWORK_REQUESTER = "TrustScore Trust Network";
const NETWORK_PURPOSE = "Join the Trust Network: your verified interactions with other members can count toward your Verified Reputation (mutual attestations only), and band-level shared signals about you can be counted in consented safety checks. You can pause membership at any time — edges stop counting immediately.";
const NETWORK_SCOPE = "NETWORK";
const NETWORK_CONSENT_SCOPES = [
    NETWORK_SCOPE
];
const PROPOSE_QUOTA = 3; // proposals per 7 days
const PROPOSE_WINDOW_DAYS = 7;
const PENDING_TTL_DAYS = 7; // requests expire after one week
const MAX_ACTIVE_EDGES = 50; // per member — graph hygiene
const SIGNAL_WINDOW_DAYS = 90;
const SIGNAL_MIN_K = 3; // k-anonymity floor for checker-facing counts
const EDGE_SCORE_WINDOW_DAYS = 90; // mirrors the policy interaction window
const SIGNAL_KIND_CONFIRMED_ADVERSE = "CONFIRMED_ADVERSE";
// Pan-African corridor registry (read model, honest labels). NG is the only
// MOCK_LIVE corridor (the shipped contract-first NINAuth adapter); the rest
// are PLANNED — no live coverage is claimed anywhere.
const PROVIDER_REGISTRY = [
    {
        code: "NG",
        name: "Nigeria",
        idTypeName: "National Identification Number (NINAuth)",
        govDepth: 3,
        phoneDepth: 3,
        livenessDepth: 3,
        mode: "MOCK_LIVE",
        note: "Live corridor in this sandbox behind the contract-first MOCK NINAuth adapter (OAuth 2.0 + PKCE, OIDC-style ID tokens). LIVE transports activate once partner credentials exist.",
        sortOrder: 1
    },
    {
        code: "GH",
        name: "Ghana",
        idTypeName: "Ghana Card (GVN)",
        govDepth: 2,
        phoneDepth: 2,
        livenessDepth: 1,
        mode: "PLANNED",
        note: "Ghana Card verification adapter planned (same contract-first pattern). Phone-OTP signal depth planned first — government identity depth follows partner agreements.",
        sortOrder: 2
    },
    {
        code: "KE",
        name: "Kenya",
        idTypeName: "National ID (Huduma Namba alignment)",
        govDepth: 2,
        phoneDepth: 2,
        livenessDepth: 2,
        mode: "PLANNED",
        note: "eCitizen-class verification adapter planned. No live coverage claimed.",
        sortOrder: 3
    },
    {
        code: "RW",
        name: "Rwanda",
        idTypeName: "National ID (Irembo)",
        govDepth: 2,
        phoneDepth: 3,
        livenessDepth: 1,
        mode: "PLANNED",
        note: "Planned corridor — digital-first civil registry makes this a natural early expansion.",
        sortOrder: 4
    },
    {
        code: "ZA",
        name: "South Africa",
        idTypeName: "Smart ID Card (DHA)",
        govDepth: 2,
        phoneDepth: 2,
        livenessDepth: 3,
        mode: "PLANNED",
        note: "Planned corridor — strong biometric infrastructure; liveness depth is the differentiator.",
        sortOrder: 5
    },
    {
        code: "CI",
        name: "Côte d'Ivoire",
        idTypeName: "Attestation d'Identité",
        govDepth: 1,
        phoneDepth: 3,
        livenessDepth: 1,
        mode: "PLANNED",
        note: "Planned corridor — phone-first signal depth (moile-money corridor realities).",
        sortOrder: 6
    },
    {
        code: "SN",
        name: "Senegal",
        idTypeName: "NIU (Numéro d'Identification Unique)",
        govDepth: 1,
        phoneDepth: 2,
        livenessDepth: 1,
        mode: "PLANNED",
        note: "Planned corridor — the NUU spine is already centralized, adapter work is light.",
        sortOrder: 7
    },
    {
        code: "EG",
        name: "Egypt",
        idTypeName: "National ID (NID)",
        govDepth: 2,
        phoneDepth: 2,
        livenessDepth: 2,
        mode: "PLANNED",
        note: "Planned corridor — North-African expansion anchor; no live coverage claimed.",
        sortOrder: 8
    }
];
// ---------------------------------------------------------------------------
// Idempotent seed — provider registry + a demo graph for the demo accounts
// (ada / chidi / ngozi). The demo rows carry honest DEMO/MOCK provenance and
// never touch ada's score inputs (only chidi ↔ ngozi gets an ACTIVE edge —
// the pending demo request to ada is only visible until she acts on it).
// ---------------------------------------------------------------------------
const globalForNetSeed = globalThis;
async function ensureNetworkSeeded() {
    if (globalForNetSeed.__tsNetworkSeed) return globalForNetSeed.__tsNetworkSeed;
    globalForNetSeed.__tsNetworkSeed = (async ()=>{
        for (const p of PROVIDER_REGISTRY){
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].countryProvider.upsert({
                where: {
                    code: p.code
                },
                create: p,
                update: {
                    name: p.name,
                    idTypeName: p.idTypeName,
                    govDepth: p.govDepth,
                    phoneDepth: p.phoneDepth,
                    livenessDepth: p.livenessDepth,
                    mode: p.mode,
                    note: p.note,
                    sortOrder: p.sortOrder
                }
            });
        }
        // Demo graph (memberships + one ACTIVE edge + one PENDING request + one
        // MOCK partner signal) — only for the three demo accounts, only once.
        const demo = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
            where: {
                handle: {
                    in: [
                        "ada",
                        "chidi",
                        "ngozi"
                    ]
                }
            },
            select: {
                id: true,
                handle: true
            }
        });
        if (demo.length === 3) {
            const byHandle = Object.fromEntries(demo.map((u)=>[
                    u.handle,
                    u.id
                ]));
            const memberSeeds = [
                byHandle.ada,
                byHandle.chidi,
                byHandle.ngozi
            ].map((userId)=>({
                    userId,
                    status: "ACTIVE"
                }));
            for (const seed of memberSeeds){
                const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUnique({
                    where: {
                        userId: seed.userId
                    }
                });
                if (!existing) {
                    // Demo memberships carry their (demo) consent rows — the invariant
                    // "membership is consent-backed" holds even in demo data.
                    const consent = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.create({
                        data: {
                            userId: seed.userId,
                            requester: NETWORK_REQUESTER,
                            purpose: NETWORK_PURPOSE,
                            scopes: JSON.stringify(NETWORK_CONSENT_SCOPES),
                            policyVersion: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CONSENT_POLICY_VERSION"]
                        }
                    });
                    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.create({
                        data: {
                            ...seed,
                            consentId: consent.id
                        }
                    });
                }
            }
            const edgeExists = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.findFirst({
                where: {
                    status: "ACTIVE",
                    OR: [
                        {
                            aUserId: byHandle.chidi,
                            bUserId: byHandle.ngozi
                        },
                        {
                            aUserId: byHandle.ngozi,
                            bUserId: byHandle.chidi
                        }
                    ]
                }
            });
            if (!edgeExists) {
                const [a, b] = [
                    byHandle.chidi,
                    byHandle.ngozi
                ].sort();
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.create({
                    data: {
                        aUserId: a,
                        bUserId: b,
                        status: "ACTIVE",
                        requestedById: byHandle.chidi,
                        requestedToId: byHandle.ngozi,
                        expiresAt: new Date(Date.now() + PENDING_TTL_DAYS * 86400_000),
                        respondedAt: new Date(),
                        activatedAt: new Date()
                    }
                });
            }
            const pendingExists = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.findFirst({
                where: {
                    status: "PENDING",
                    requestedToId: byHandle.ada
                }
            });
            if (!pendingExists) {
                const [a, b] = [
                    byHandle.ngozi,
                    byHandle.ada
                ].sort();
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.create({
                    data: {
                        aUserId: a,
                        bUserId: b,
                        status: "PENDING",
                        requestedById: byHandle.ngozi,
                        requestedToId: byHandle.ada,
                        expiresAt: new Date(Date.now() + PENDING_TTL_DAYS * 86400_000)
                    }
                });
            }
            const signalExists = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].sharedSignal.findFirst({
                where: {
                    subjectUserId: byHandle.chidi,
                    sourceType: "DEMO_SEED"
                }
            });
            if (!signalExists) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].sharedSignal.create({
                    data: {
                        subjectUserId: byHandle.chidi,
                        kind: SIGNAL_KIND_CONFIRMED_ADVERSE,
                        platform: "MockFintech GH (MOCK demo partner)",
                        platformMode: "MOCK",
                        severity: "LOW",
                        windowDays: SIGNAL_WINDOW_DAYS,
                        note: "Demo data: a MOCK partner platform's contribution to the sandbox shared-signal registry. It exists to demonstrate the FraudNet-class shape — no real adverse event is claimed.",
                        sourceType: "DEMO_SEED",
                        expiresAt: new Date(Date.now() + SIGNAL_WINDOW_DAYS * 86400_000)
                    }
                });
            }
        }
    })();
    try {
        await globalForNetSeed.__tsNetworkSeed;
    } catch (e) {
        globalForNetSeed.__tsNetworkSeed = undefined;
        throw e;
    }
}
async function getMembership(userId) {
    await ensureNetworkSeeded();
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUnique({
        where: {
            userId
        }
    });
}
async function assertNetworkMember(userId) {
    const m = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUnique({
        where: {
            userId
        }
    });
    return m?.status === "ACTIVE";
}
async function joinNetwork(userId) {
    await ensureNetworkSeeded();
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUnique({
        where: {
            userId
        }
    });
    if (existing && existing.status === "ACTIVE") return {
        ok: false,
        code: "ALREADY_JOINED"
    };
    if (existing) {
        // Re-join: grant a fresh consent (the old one stays withdrawn for the record)
        const consent = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.create({
            data: {
                userId,
                requester: NETWORK_REQUESTER,
                purpose: NETWORK_PURPOSE,
                scopes: JSON.stringify(NETWORK_CONSENT_SCOPES),
                policyVersion: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CONSENT_POLICY_VERSION"]
            }
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.update({
            where: {
                userId
            },
            data: {
                status: "ACTIVE",
                consentId: consent.id
            }
        });
    } else {
        const consent = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.create({
            data: {
                userId,
                requester: NETWORK_REQUESTER,
                purpose: NETWORK_PURPOSE,
                scopes: JSON.stringify(NETWORK_CONSENT_SCOPES),
                policyVersion: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CONSENT_POLICY_VERSION"]
            }
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.create({
            data: {
                userId,
                status: "ACTIVE",
                consentId: consent.id
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SYSTEM", "You joined the Trust Network", "Your verified interactions with other members can now count toward your Verified Reputation — mutual attestations only, and you can pause membership at any time.");
    }
    // Edges (if any) start counting again.
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markMaterialChange"])(userId, "NETWORK_JOINED");
    } catch  {}
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "NETWORK_JOINED",
        subjectType: "NetworkMembership",
        metadata: {}
    });
    const m = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUniqueOrThrow({
        where: {
            userId
        }
    });
    return {
        ok: true,
        status: m.status,
        joinedAt: m.joinedAt.toISOString()
    };
}
async function pauseNetwork(userId) {
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUnique({
        where: {
            userId
        }
    });
    if (!existing) return {
        ok: false,
        code: "NOT_A_MEMBER"
    };
    if (existing.consentId) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.update({
            where: {
                id: existing.consentId
            },
            data: {
                withdrawnAt: new Date()
            }
        });
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.update({
        where: {
            userId
        },
        data: {
            status: "PAUSED"
        }
    });
    // Edges stop counting for BOTH endpoints — notify active partners.
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markMaterialChange"])(userId, "NETWORK_PAUSED");
    } catch  {}
    const partners = await activePartnerIds(userId);
    for (const p of partners){
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(p, "SYSTEM", "A member paused their Trust Network membership", "One of your verified interactions stopped counting toward Verified Reputation because the other member paused their network membership. No action is needed.");
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markMaterialChange"])(p, "NETWORK_PAUSED_PARTNER");
        } catch  {}
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "NETWORK_PAUSED",
        subjectType: "NetworkMembership",
        metadata: {}
    });
    const m = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUniqueOrThrow({
        where: {
            userId
        }
    });
    return {
        ok: true,
        status: m.status,
        joinedAt: m.joinedAt.toISOString()
    };
}
// ---------------------------------------------------------------------------
// Edges — propose / respond / revoke
// ---------------------------------------------------------------------------
async function activePartnerIds(userId) {
    const edges = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.findMany({
        where: {
            status: "ACTIVE",
            OR: [
                {
                    aUserId: userId
                },
                {
                    bUserId: userId
                }
            ]
        },
        select: {
            aUserId: true,
            bUserId: true
        }
    });
    return edges.map((e)=>e.aUserId === userId ? e.bUserId : e.aUserId);
}
async function proposeInteraction(requesterId, handle) {
    await ensureNetworkSeeded();
    const clean = handle.trim().replace(/^@/, "").toLowerCase();
    if (clean.length < 2 || clean.length > 40) return {
        ok: false,
        code: "UNKNOWN_HANDLE"
    };
    const [requesterMembership, target] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUnique({
            where: {
                userId: requesterId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
            where: {
                handle: clean
            },
            select: {
                id: true,
                handle: true
            }
        })
    ]);
    if (!target) return {
        ok: false,
        code: "UNKNOWN_HANDLE"
    };
    if (target.id === requesterId) return {
        ok: false,
        code: "SELF"
    };
    if (requesterMembership?.status !== "ACTIVE") return {
        ok: false,
        code: "NOT_A_MEMBER"
    };
    const targetMembership = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUnique({
        where: {
            userId: target.id
        }
    });
    if (targetMembership?.status !== "ACTIVE") return {
        ok: false,
        code: "TARGET_NOT_MEMBER"
    };
    const [requesterLevel, targetLevel] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$reputation$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["effectiveAssuranceLevel"])(requesterId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$reputation$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["effectiveAssuranceLevel"])(target.id)
    ]);
    if (requesterLevel < 2) return {
        ok: false,
        code: "LEVEL_GATE"
    };
    if (targetLevel < 2) return {
        ok: false,
        code: "TARGET_LEVEL_GATE"
    };
    // Quota — 3 proposals per rolling 7 days (same shape as flags).
    const since = new Date(Date.now() - PROPOSE_WINDOW_DAYS * 86400_000);
    const recent = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.count({
        where: {
            requestedById: requesterId,
            requestedAt: {
                gte: since
            }
        }
    });
    if (recent >= PROPOSE_QUOTA) return {
        ok: false,
        code: "QUOTA"
    };
    // One open lifecycle per pair (PENDING or ACTIVE).
    const [a, b] = [
        requesterId,
        target.id
    ].sort();
    const open = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.findFirst({
        where: {
            aUserId: a,
            bUserId: b,
            status: {
                in: [
                    "PENDING",
                    "ACTIVE"
                ]
            }
        }
    });
    if (open) return {
        ok: false,
        code: "OPEN_LIFECYCLE"
    };
    const [myActive, targetActive] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.count({
            where: {
                status: "ACTIVE",
                OR: [
                    {
                        aUserId: requesterId
                    },
                    {
                        bUserId: requesterId
                    }
                ]
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.count({
            where: {
                status: "ACTIVE",
                OR: [
                    {
                        aUserId: target.id
                    },
                    {
                        bUserId: target.id
                    }
                ]
            }
        })
    ]);
    if (myActive >= MAX_ACTIVE_EDGES) return {
        ok: false,
        code: "EDGE_CAP"
    };
    if (targetActive >= MAX_ACTIVE_EDGES) return {
        ok: false,
        code: "TARGET_EDGE_CAP"
    };
    const expiresAt = new Date(Date.now() + PENDING_TTL_DAYS * 86400_000);
    const edge = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.create({
        data: {
            aUserId: a,
            bUserId: b,
            status: "PENDING",
            requestedById: requesterId,
            requestedToId: target.id,
            expiresAt
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(target.id, "SYSTEM", "Someone proposed a verified interaction with you", "A verified member proposes to attest that you two dealt with each other. Accepting creates a mutual verified interaction — it counts toward both of your Verified Reputation (never a negative signal). You can decline now or revoke later. The request is in your Trust Network tab.");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: requesterId,
        action: "NETWORK_INTERACTION_PROPOSED",
        subjectType: "TrustEdge",
        subjectId: edge.id,
        metadata: {}
    });
    return {
        ok: true,
        edgeId: edge.id,
        expiresAt: expiresAt.toISOString()
    };
}
async function respondToInteraction(userId, edgeId, decision) {
    await expireStalePending();
    const edge = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.findUnique({
        where: {
            id: edgeId
        }
    });
    if (!edge) return {
        ok: false,
        code: "NOT_FOUND"
    };
    if (edge.requestedToId !== userId) return {
        ok: false,
        code: "NOT_INVITED"
    };
    if (edge.status !== "PENDING") return {
        ok: false,
        code: "NOT_PENDING"
    };
    if (edge.expiresAt.getTime() < Date.now()) return {
        ok: false,
        code: "EXPIRED"
    };
    const now = new Date();
    if (decision === "ACCEPT") {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.update({
            where: {
                id: edge.id
            },
            data: {
                status: "ACTIVE",
                respondedAt: now,
                activatedAt: now
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(edge.requestedById, "SYSTEM", "Your verified-interaction proposal was accepted", "A mutual verified interaction is now active. It counts toward Verified Reputation for both of you (capped by the scoring policy) and either side can revoke it at any time.");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: userId,
            action: "NETWORK_INTERACTION_ACCEPTED",
            subjectType: "TrustEdge",
            subjectId: edge.id,
            metadata: {}
        });
        // The edge counts for BOTH endpoints' reputation inputs.
        for (const u of [
            edge.requestedById,
            edge.requestedToId
        ]){
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markMaterialChange"])(u, "EDGE_ACTIVATED");
            } catch  {}
        }
        return {
            ok: true,
            status: "ACTIVE"
        };
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.update({
        where: {
            id: edge.id
        },
        data: {
            status: "DECLINED",
            respondedAt: now
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "NETWORK_INTERACTION_DECLINED",
        subjectType: "TrustEdge",
        subjectId: edge.id,
        metadata: {}
    });
    return {
        ok: true,
        status: "DECLINED"
    };
}
async function revokeInteraction(userId, edgeId) {
    await expireStalePending();
    const edge = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.findUnique({
        where: {
            id: edgeId
        }
    });
    if (!edge) return {
        ok: false,
        code: "NOT_FOUND"
    };
    const isParticipant = edge.requestedById === userId || edge.requestedToId === userId;
    if (!isParticipant) return {
        ok: false,
        code: "NOT_PARTICIPANT"
    };
    if (edge.status === "PENDING") {
        if (edge.requestedById !== userId) return {
            ok: false,
            code: "ONLY_REQUESTER_CANCELS"
        };
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.update({
            where: {
                id: edge.id
            },
            data: {
                status: "REVOKED",
                revokedAt: new Date(),
                revokedById: userId
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: userId,
            action: "NETWORK_INTERACTION_REVOKED",
            subjectType: "TrustEdge",
            subjectId: edge.id,
            metadata: {
                status: "cancelled"
            }
        });
        return {
            ok: true,
            status: "REVOKED"
        };
    }
    if (edge.status !== "ACTIVE") return {
        ok: false,
        code: "NOT_OPEN"
    };
    const now = new Date();
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.update({
        where: {
            id: edge.id
        },
        data: {
            status: "REVOKED",
            revokedAt: now,
            revokedById: userId
        }
    });
    const partner = edge.requestedById === userId ? edge.requestedToId : edge.requestedById;
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(partner, "SYSTEM", "A verified interaction was revoked", "One of your verified interactions was revoked (either by you or the other member). It no longer counts toward Verified Reputation for either side.");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "NETWORK_INTERACTION_REVOKED",
        subjectType: "TrustEdge",
        subjectId: edge.id,
        metadata: {
            status: "revoked"
        }
    });
    for (const u of [
        edge.requestedById,
        edge.requestedToId
    ]){
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markMaterialChange"])(u, "EDGE_REVOKED");
        } catch  {}
    }
    return {
        ok: true,
        status: "REVOKED"
    };
}
async function expireStalePending() {
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.updateMany({
        where: {
            status: "PENDING",
            expiresAt: {
                lt: new Date()
            }
        },
        data: {
            status: "EXPIRED"
        }
    });
    return res.count;
}
async function mintSignalFromFlag(flag) {
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].sharedSignal.findFirst({
        where: {
            sourceType: "PLATFORM_RESOLUTION",
            sourceId: flag.id
        }
    });
    if (existing) return; // idempotent — one signal per confirmed flag
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].sharedSignal.create({
        data: {
            subjectUserId: flag.subjectId,
            kind: SIGNAL_KIND_CONFIRMED_ADVERSE,
            platform: "TrustScore (sandbox)",
            platformMode: "MOCK",
            severity: flag.category === "FRAUD" ? "HIGH" : "MEDIUM",
            windowDays: SIGNAL_WINDOW_DAYS,
            note: `Human-confirmed adverse flag (category: ${flag.category}) after evidence review. The flag's 14-day appeal path is the dispute route — an overturned appeal retracts this signal automatically.`,
            sourceType: "PLATFORM_RESOLUTION",
            sourceId: flag.id,
            expiresAt: new Date(Date.now() + SIGNAL_WINDOW_DAYS * 86400_000)
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "SYSTEM",
        action: "NETWORK_SIGNAL_MINTED",
        subjectType: "UserAccount",
        subjectId: flag.subjectId,
        metadata: {
            severity: flag.category === "FRAUD" ? "HIGH" : "MEDIUM",
            windowDays: SIGNAL_WINDOW_DAYS
        }
    });
}
async function retractSignalsForFlag(flagId) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].sharedSignal.updateMany({
        where: {
            sourceType: "PLATFORM_RESOLUTION",
            sourceId: flagId,
            retractedAt: null
        },
        data: {
            retractedAt: new Date()
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "SYSTEM",
        action: "NETWORK_SIGNAL_RETRACTED",
        subjectType: "Flag",
        subjectId: flagId,
        metadata: {}
    });
}
function visibleSignals(userId) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].sharedSignal.findMany({
        where: {
            subjectUserId: userId,
            retractedAt: null,
            expiresAt: {
                gt: new Date()
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });
}
async function buildNetworkBlockFor(subjectId) {
    const membership = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUnique({
        where: {
            userId: subjectId
        }
    });
    if (membership?.status !== "ACTIVE") {
        return {
            joined: false,
            sharedSignals: null,
            businessChecks: null,
            note: "Subject has not joined the Trust Network — no shared signals are available. This is not an adverse signal."
        };
    }
    const signals = await visibleSignals(subjectId);
    const count = signals.length;
    const platforms = [
        ...new Set(signals.map((s)=>s.platform))
    ];
    const businessChecks = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustReceipt.count({
        where: {
            userId: subjectId,
            channel: "API_CHECK"
        }
    });
    return {
        joined: true,
        // k-anonymity: below the floor, the count collapses to a band word —
        // a single signal can never isolate a subject's record to a checker.
        sharedSignals: {
            count: count >= SIGNAL_MIN_K ? count : count > 0 ? SIGNAL_MIN_K : 0,
            platforms,
            windowDays: SIGNAL_WINDOW_DAYS,
            minK: SIGNAL_MIN_K
        },
        businessChecks,
        note: count === 0 ? "No shared signals on record. Network signals are band-level counts from human-confirmed events only — this is a statement about recorded evidence, never a guarantee." : `Shared signals present: a k-anonymized count of human-confirmed adverse events (minimum cohort ${SIGNAL_MIN_K}) attributed to the platforms listed. Band-level only — details are never shared. This is a statement about recorded evidence, never a guarantee.`
    };
}
async function getNetworkMe(userId) {
    await ensureNetworkSeeded();
    await expireStalePending();
    const membership = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findUnique({
        where: {
            userId
        }
    });
    const joined = membership?.status === "ACTIVE";
    // Active + pending edges involving me.
    const edges = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.findMany({
        where: {
            OR: [
                {
                    aUserId: userId
                },
                {
                    bUserId: userId
                }
            ]
        },
        orderBy: {
            requestedAt: "desc"
        },
        take: 120
    });
    const activeEdges = edges.filter((e)=>e.status === "ACTIVE");
    const partnerIds = activeEdges.map((e)=>e.aUserId === userId ? e.bUserId : e.aUserId);
    const [partnerUsers, partnerIdentities, partnerMemberships] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
            where: {
                id: {
                    in: partnerIds
                }
            },
            select: {
                id: true,
                displayName: true,
                handle: true
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findMany({
            where: {
                userId: {
                    in: partnerIds
                }
            },
            select: {
                userId: true,
                status: true,
                assuranceLevel: true,
                expiresAt: true
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].networkMembership.findMany({
            where: {
                userId: {
                    in: partnerIds
                }
            },
            select: {
                userId: true,
                status: true
            }
        })
    ]);
    const now = Date.now();
    const nodes = [];
    const graphEdges = [];
    for (const e of activeEdges){
        const partnerId = e.aUserId === userId ? e.bUserId : e.aUserId;
        const u = partnerUsers.find((p)=>p.id === partnerId);
        if (!u) continue; // tolerant of dangling rows (raw-SQL test cleanups)
        const id = partnerIdentities.find((i)=>i.userId === partnerId);
        const live = id?.status === "VERIFIED" && (id?.expiresAt?.getTime() ?? 0) > now;
        const m = partnerMemberships.find((mm)=>mm.userId === partnerId);
        nodes.push({
            userId: u.id,
            displayName: u.displayName,
            handle: u.handle,
            level: live ? id.assuranceLevel : 0,
            membership: m?.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
            since: (e.activatedAt ?? e.respondedAt ?? e.requestedAt).toISOString(),
            lastActive: true
        });
        graphEdges.push({
            id: e.id,
            to: u.id,
            since: (e.activatedAt ?? e.respondedAt ?? e.requestedAt).toISOString(),
            status: e.status
        });
    }
    // Counting partners — only mutually-ACTIVE memberships + live L2+ count.
    const countingPartners = nodes.filter((n)=>n.membership === "ACTIVE" && n.level >= 2).length;
    // Requests (incoming = I must respond; outgoing = I proposed).
    const pendingIncoming = edges.filter((e)=>e.status === "PENDING" && e.requestedToId === userId);
    const pendingOutgoing = edges.filter((e)=>e.status === "PENDING" && e.requestedById === userId);
    const incomingRequesters = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
        where: {
            id: {
                in: pendingIncoming.map((e)=>e.requestedById)
            }
        },
        select: {
            id: true,
            displayName: true,
            handle: true
        }
    });
    const outgoingTargets = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
        where: {
            id: {
                in: pendingOutgoing.map((e)=>e.requestedToId)
            }
        },
        select: {
            id: true,
            displayName: true,
            handle: true
        }
    });
    const [signals, businessChecks, quotaCount, allPartnerUsers] = await Promise.all([
        visibleSignals(userId),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustReceipt.count({
            where: {
                userId,
                channel: "API_CHECK"
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustEdge.count({
            where: {
                requestedById: userId,
                requestedAt: {
                    gte: new Date(Date.now() - PROPOSE_WINDOW_DAYS * 86400_000)
                }
            }
        }),
        // One lookup for every handle the read model may display (graph nodes,
        // requesters, targets and history partners).
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
            where: {
                id: {
                    in: [
                        ...partnerIds,
                        ...pendingIncoming.map((e)=>e.requestedById),
                        ...pendingOutgoing.map((e)=>e.requestedToId),
                        ...edges.filter((e)=>[
                                "DECLINED",
                                "EXPIRED",
                                "REVOKED"
                            ].includes(e.status)).map((e)=>e.requestedById === userId ? e.requestedToId : e.requestedById)
                    ]
                }
            },
            select: {
                id: true,
                displayName: true,
                handle: true
            }
        })
    ]);
    const userById = (id)=>allPartnerUsers.find((u)=>u.id === id);
    const history = edges.filter((e)=>[
            "DECLINED",
            "EXPIRED",
            "REVOKED"
        ].includes(e.status)).slice(0, 20).map((e)=>{
        const partnerId = e.requestedById === userId ? e.requestedToId : e.requestedById;
        const partner = userById(partnerId);
        return {
            id: e.id,
            status: e.status,
            direction: e.requestedById === userId ? "OUTGOING" : "INCOMING",
            partnerId,
            partnerHandle: partner?.handle ?? null,
            partnerName: partner?.displayName ?? null,
            at: (e.respondedAt ?? e.revokedAt ?? e.expiresAt).toISOString()
        };
    });
    return {
        membership: {
            joined,
            status: membership?.status ?? null,
            joinedAt: membership?.joinedAt.toISOString() ?? null,
            consentId: membership?.consentId ?? null
        },
        standing: {
            degree: activeEdges.length,
            countingPartners,
            businessChecks,
            reputationNote: "Verified interactions feed the same Verified Reputation component as consented safety checks — mutual attestations only, capped by the scoring policy. Pausing membership by either side stops an edge counting immediately.",
            quota: {
                used: quotaCount,
                max: PROPOSE_QUOTA,
                windowDays: PROPOSE_WINDOW_DAYS
            }
        },
        graph: {
            nodes,
            edges: graphEdges
        },
        interactions: {
            incoming: pendingIncoming.map((e)=>{
                const r = incomingRequesters.find((u)=>u.id === e.requestedById);
                return {
                    id: e.id,
                    from: r ? {
                        displayName: r.displayName,
                        handle: r.handle
                    } : null,
                    requestedAt: e.requestedAt.toISOString(),
                    expiresAt: e.expiresAt.toISOString()
                };
            }),
            outgoing: pendingOutgoing.map((e)=>{
                const t = outgoingTargets.find((u)=>u.id === e.requestedToId);
                return {
                    id: e.id,
                    to: t ? {
                        displayName: t.displayName,
                        handle: t.handle
                    } : null,
                    requestedAt: e.requestedAt.toISOString(),
                    expiresAt: e.expiresAt.toISOString()
                };
            }),
            history
        },
        signals: signals.map((s)=>({
                id: s.id,
                kind: s.kind,
                platform: s.platform,
                platformMode: s.platformMode,
                severity: s.severity,
                windowDays: s.windowDays,
                note: s.note,
                sourceType: s.sourceType,
                createdAt: s.createdAt.toISOString(),
                expiresAt: s.expiresAt.toISOString(),
                dispute: {
                    route: "Reputation tab → appeal",
                    note: "Signals sourced from platform flags inherit the flag's 14-day appeal path; an overturned appeal retracts the signal automatically."
                }
            })),
        kAnonymity: {
            minK: SIGNAL_MIN_K,
            windowDays: SIGNAL_WINDOW_DAYS,
            note: `Checker-facing signal counts are k-anonymized (minimum cohort ${SIGNAL_MIN_K}) and band-level only — details, categories and raw identifiers are never shared with checkers.`
        },
        honesty: {
            platformMode: "MOCK",
            note: "Partner platforms in this sandbox are MOCK demo participants (MockFintech GH). The sharing CONTRACT is real; the partner feeds are honest mock-ups."
        }
    };
}
async function listProviders() {
    await ensureNetworkSeeded();
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].countryProvider.findMany({
        orderBy: {
            sortOrder: "asc"
        }
    });
    return {
        providers: rows.map((r)=>({
                code: r.code,
                name: r.name,
                idTypeName: r.idTypeName,
                depths: {
                    gov: r.govDepth,
                    phone: r.phoneDepth,
                    liveness: r.livenessDepth
                },
                mode: r.mode,
                note: r.note
            })),
        honesty: "The registry is a read model. Only NG is contract-first MOCK_LIVE in this sandbox; every other corridor is PLANNED — no live coverage is claimed. Verification flows remain NG-only until an adapter ships."
    };
}
}),
"[project]/src/lib/providers/phone-provider.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MAX_OTP_ATTEMPTS",
    ()=>MAX_OTP_ATTEMPTS,
    "MAX_RESENDS",
    ()=>MAX_RESENDS,
    "OTP_TTL_MS",
    ()=>OTP_TTL_MS,
    "PHONE_FRESHNESS_DAYS",
    ()=>PHONE_FRESHNESS_DAYS,
    "PHONE_MODE",
    ()=>PHONE_MODE,
    "PHONE_PROVIDER_NAME",
    ()=>PHONE_PROVIDER_NAME,
    "RESEND_COOLDOWN_MS",
    ()=>RESEND_COOLDOWN_MS,
    "confidenceForSimSwap",
    ()=>confidenceForSimSwap,
    "issueOtp",
    ()=>issueOtp,
    "maskPhoneHint",
    ()=>maskPhoneHint,
    "mockDelivery",
    ()=>mockDelivery,
    "normalizePhoneE164",
    ()=>normalizePhoneE164,
    "otpMatches",
    ()=>otpMatches,
    "phoneFingerprint",
    ()=>phoneFingerprint,
    "simSwapRiskFor",
    ()=>simSwapRiskFor
]);
// TrustScore Stage 4 — Phone verification provider adapter
// (CONTRACT-FIRST, MOCK transport).
//
// This module implements the contract a real SMS/phone-check partner (or an
// MNO signal aggregator) will use (per docs/STAGE0_AUDIT.md §4.2 Stage 4):
//   E.164-normalized phone input → OTP delivery → hashed-code verification →
//   SIM-swap risk signal — with a MOCK transport. The LIVE implementation
//   swaps only the delivery + risk-lookup calls; the normalization, hashing,
//   attempt-capping and consent discipline stay identical.
//
// Security invariants (directive §32/§29):
//   - The raw phone number is NEVER persisted: only a peppered sha256
//     fingerprint (identifier discipline) + a masked display hint.
//   - The OTP is stored hashed — never plaintext.
//   - OTP comparison is timing-safe.
//   - The delivery message containing the code exists ONLY in the MOCK-mode
//     API response (honestly labeled) so the sandbox can test the flow; LIVE
//     responses never echo codes.
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/boot-guard.ts [app-route] (ecmascript)");
;
;
const PHONE_PROVIDER_NAME = "SMS_MOCK";
const PHONE_MODE = "MOCK"; // honestly labeled everywhere
// Backend-only pepper — shared with the identifier fingerprint discipline.
// sec-batch-A: guarded read — production refuses to boot on the dev default
// (this pepper is what makes phone fingerprints irreversible).
const PHONE_PEPPER = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["guardedSecret"])("SIGNAL_PEPPER");
const OTP_TTL_MS = 5 * 60_000; // OTP validity window
const MAX_OTP_ATTEMPTS = 3; // wrong attempts before lockout
const MAX_RESENDS = 3; // resends per verification
const RESEND_COOLDOWN_MS = 30_000; // minimum spacing between sends
const PHONE_FRESHNESS_DAYS = 90; // identifier freshness horizon
function normalizePhoneE164(input) {
    const raw = input.trim().replace(/[\s()\-.]/g, "");
    let national;
    if (raw.startsWith("+234")) national = raw.slice(4);
    else if (raw.startsWith("234") && raw.length >= 13) national = raw.slice(3);
    else if (raw.startsWith("0")) national = raw.slice(1);
    else national = raw;
    // NG mobile numbers: 10 digits after the country code, leading 7/8/9.
    if (!/^([789]\d{9})$/.test(national)) return null;
    return `+234${national}`;
}
function maskPhoneHint(e164) {
    const national = e164.slice(4); // 10 digits
    return `+234 ${national[0]}•• ••• ••${national.slice(8)}`;
}
function phoneFingerprint(e164) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${PHONE_PEPPER}:phone:${e164}`).digest("hex");
}
function issueOtp() {
    const code = String((0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomInt"])(0, 1_000_000)).padStart(6, "0");
    return {
        code,
        otpHash: hashCode(code)
    };
}
function hashCode(code) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${PHONE_PEPPER}:otp:${code}`).digest("hex");
}
function otpMatches(storedOtpHash, code) {
    const a = Buffer.from(storedOtpHash, "hex");
    const b = Buffer.from(hashCode(code), "hex");
    if (a.length !== b.length) return false;
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["timingSafeEqual"])(a, b);
}
function simSwapRiskFor(phoneHash, override) {
    if (override) return override;
    // Deterministic mock: hash-bucketed, LOW-dominant (realistic base rate).
    const bucket = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${PHONE_PEPPER}:simswap:${phoneHash}`).digest();
    const v = bucket.readUInt32BE(0) % 20;
    if (v === 0) return "MEDIUM";
    return "LOW";
}
function mockDelivery(code) {
    return {
        mode: PHONE_MODE,
        channel: "sms",
        provider: PHONE_PROVIDER_NAME,
        message: `TrustScore: your verification code is ${code}. It expires in 5 minutes. Never share this code.`
    };
}
function confidenceForSimSwap(risk) {
    switch(risk){
        case "LOW":
            return 95;
        case "MEDIUM":
            return 85;
        case "HIGH":
            return 70;
    }
}
}),
"[project]/src/lib/services/safety-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// TrustScore Stage 6 — SafetyService (directive §2/§46 "Check Before You Deal").
//
// The VERIFIER-side product: a signed-in member runs a sanitized assessment
// on a counterparty before dealing with them. Four entry methods:
//   HANDLE        — @handle lookup, gated by the subject's standing
//                   SAFETY_CHECK consent (anti-enumeration: unknown handle
//                   and disabled checks return byte-identical responses)
//   PHONE         — consent-gated peppered-hash identifier match: the raw
//                   phone is fingerprinted server-side and discarded; it is
//                   never stored, logged or echoed (directive §38/§50)
//   TRUST_LINK/QR — an active Stage 5 share token (token scopes govern; the
//                   view is counted + receipted with the verifier's NAME)
//
// Every completed check is: consent-backed (per-check consent), receipted to
// the subject (TrustReceipt with a named viewer label), notified, audited,
// and snapshotted into SafetyCheck.assessment — exactly what was shown.
//
// Trust Requests: when a handle is not checkable, the verifier may ASK once
// (7-day expiry, one pending per pair). ACCEPT mints a scoped trust link and
// runs the assessment for the verifier; the subject keeps the link (their
// token, their control). DECLINE is final for that request.
//
// Red lines (directive §50/§59): the assessment NEVER says "this person is
// safe" — the locked language is "No confirmed adverse signals found" plus
// the not-a-guarantee disclaimer. No raw identifiers in any response, audit
// event, receipt or stored assessment.
__turbopack_context__.s([
    "SAFETY_LANGUAGE",
    ()=>SAFETY_LANGUAGE,
    "SAFETY_SCOPE_KEYS",
    ()=>SAFETY_SCOPE_KEYS,
    "TRUST_REQUEST_TTL_MS",
    ()=>TRUST_REQUEST_TTL_MS,
    "buildAssessment",
    ()=>buildAssessment,
    "getChecksByVerifier",
    ()=>getChecksByVerifier,
    "getSafetyMe",
    ()=>getSafetyMe,
    "getSafetySettings",
    ()=>getSafetySettings,
    "pruneSafetyChecks",
    ()=>pruneSafetyChecks,
    "respondTrustRequest",
    ()=>respondTrustRequest,
    "runSafetyCheck",
    ()=>runSafetyCheck,
    "sendTrustRequest",
    ()=>sendTrustRequest,
    "updateSafetySettings",
    ()=>updateSafetySettings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/notification-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/trustscore-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$passport$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/passport-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$network$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/network-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/phone-provider.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/ninauth.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
const SAFETY_REQUESTER = "TrustScore Safety Check";
const SAFETY_PURPOSE = "Allow verified TrustScore members to run a safety check on your handle or verified phone before dealing with you. Every check is receipted to you.";
const SAFETY_SCOPE_KEYS = {
    status: "safety.status",
    profile: "safety.profile",
    signals: "safety.signals",
    phoneMatch: "safety.phone_match"
};
const TRUST_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CHECKS_RETAIN = 50;
const TOKEN_MAX_VIEWS = 10;
const SAFETY_LANGUAGE = {
    adverse: "No confirmed adverse signals found",
    disclaimer: "A TrustScore summarizes recorded verification evidence. It is not a guarantee that a person is safe to deal with."
};
// Status-derived headline. NEVER "safe" — only statements about evidence.
function headlineForStatus(status) {
    switch(status){
        case "HIGH_RISK":
            return "Confirmed risk signals on record — proceed only with human review";
        case "REVIEW_REQUIRED":
            return "Under review — proceed with care";
        case "CAUTION":
            return "Identity freshness has lapsed — proceed with care";
        case "ESTABLISHED":
        case "VERIFIED":
            return SAFETY_LANGUAGE.adverse;
        default:
            return "New profile — no confirmed adverse signals found";
    }
}
async function findActiveSafetyConsent(userId) {
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.findMany({
        where: {
            userId,
            requester: SAFETY_REQUESTER,
            withdrawnAt: null
        },
        orderBy: {
            grantedAt: "desc"
        }
    });
    return rows[0] ?? null;
}
function scopesFor(input) {
    const scopes = [
        SAFETY_SCOPE_KEYS.status
    ];
    if (input.includeProfile) scopes.push(SAFETY_SCOPE_KEYS.profile);
    if (input.includeSignals) scopes.push(SAFETY_SCOPE_KEYS.signals);
    if (input.allowPhoneMatch) scopes.push(SAFETY_SCOPE_KEYS.phoneMatch);
    return scopes;
}
async function getSafetySettings(userId) {
    const consent = await findActiveSafetyConsent(userId);
    if (!consent) {
        return {
            enabled: false,
            includeProfile: false,
            includeSignals: false,
            allowPhoneMatch: false,
            consentId: null,
            grantedAt: null
        };
    }
    const granted = JSON.parse(consent.scopes);
    return {
        enabled: true,
        includeProfile: granted.includes(SAFETY_SCOPE_KEYS.profile),
        includeSignals: granted.includes(SAFETY_SCOPE_KEYS.signals),
        allowPhoneMatch: granted.includes(SAFETY_SCOPE_KEYS.phoneMatch),
        consentId: consent.id,
        grantedAt: consent.grantedAt.toISOString()
    };
}
async function updateSafetySettings(userId, input) {
    if (!input.enabled) {
        // Withdraw any active standing consent — checks stop immediately.
        const consent = await findActiveSafetyConsent(userId);
        if (consent) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.update({
                where: {
                    id: consent.id
                },
                data: {
                    withdrawnAt: new Date()
                }
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
                actorType: "USER",
                actorId: userId,
                action: "SAFETY_SETTINGS_UPDATED",
                subjectType: "Consent",
                subjectId: consent.id,
                metadata: {
                    outcome: "disabled"
                }
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SECURITY", "Safety checks turned off", "Members can no longer run safety checks on your handle or phone number. The change is effective immediately and audited.");
        }
        return getSafetySettings(userId);
    }
    const scopes = scopesFor(input);
    const existing = await findActiveSafetyConsent(userId);
    if (existing) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.update({
            where: {
                id: existing.id
            },
            data: {
                scopes: JSON.stringify(scopes)
            }
        });
    } else {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.create({
            data: {
                userId,
                requester: SAFETY_REQUESTER,
                purpose: SAFETY_PURPOSE,
                scopes: JSON.stringify(scopes),
                policyVersion: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CONSENT_POLICY_VERSION"]
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SECURITY", "Safety checks turned on", "Verified members can now run a safety check on your handle. You control what they see, every check is receipted, and you can turn this off at any time.");
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "SAFETY_SETTINGS_UPDATED",
        subjectType: "Consent",
        metadata: {
            outcome: "enabled",
            scopes: scopes.length
        }
    });
    return getSafetySettings(userId);
}
async function buildAssessment(subject, opts) {
    const [snapshot, identity, credentials] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getScoreSnapshot"])(subject.id),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
            where: {
                userId: subject.id
            },
            include: {
                identifiers: true
            }
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCredentialsForUser"])(subject.id)
    ]);
    const now = Date.now();
    const level = identity && identity.status === "VERIFIED" && (identity.expiresAt?.getTime() ?? 0) > now ? identity.assuranceLevel : 0;
    const signals = opts.includeSignals && identity ? identity.identifiers.filter((i)=>i.status === "ACTIVE" && (i.expiresAt?.getTime() ?? 0) > now).map((i)=>({
            type: i.type,
            hint: i.hint,
            verifiedAt: i.verifiedAt.toISOString(),
            expiresAt: i.expiresAt?.toISOString() ?? null
        })) : [];
    const assessment = {
        method: opts.method,
        checkedAt: new Date().toISOString(),
        headline: headlineForStatus(snapshot.status),
        summary: {
            status: snapshot.status,
            riskBand: snapshot.riskBand,
            assuranceLevel: level,
            // Stage 8 — lifecycle honesty: a frozen score is under human appeal
            // review; a stale one is past its horizon. Neither is a negative claim.
            state: snapshot.state ?? "ACTIVE"
        },
        signals,
        credentialsCount: credentials.filter((c)=>c.status === "ACTIVE" && (c.expiresAt ? Date.parse(c.expiresAt) > now : true)).length,
        freshness: {
            assessedAt: snapshot.computedAt,
            expiresAt: snapshot.expiresAt,
            fresh: Date.parse(snapshot.expiresAt) > now
        },
        explanation: snapshot.explanation,
        language: SAFETY_LANGUAGE
    };
    if (opts.includeProfile) {
        assessment.subject = {
            displayName: subject.displayName,
            handle: subject.handle
        };
    }
    if (opts.includeScore) {
        // Score number only via SCORE-scoped trust links — handle checks stay
        // band-level (no false precision on a counterparty's behalf).
        assessment.score = {
            score: snapshot.score,
            confidence: snapshot.confidence
        };
    }
    if (opts.attributes && opts.attributes.length > 0) {
        assessment.attributes = opts.attributes;
    }
    return assessment;
}
function extractToken(input) {
    const trimmed = input.trim();
    try {
        const url = new URL(trimmed);
        const trust = url.searchParams.get("trust");
        if (trust) return trust;
    } catch  {
    /* not a URL — treat as a raw token */ }
    return trimmed;
}
function verifierIpHash(req) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashIp"])(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip"));
}
async function runSafetyCheck(verifier, input, req) {
    const provided = [
        input.handle,
        input.phone,
        input.link,
        input.qr
    ].filter((v)=>v !== undefined && v !== "").length;
    if (provided !== 1) {
        return {
            outcome: "UNAVAILABLE",
            message: "Provide exactly one of: handle, phone, link or qr."
        };
    }
    // ----- TRUST_LINK / QR (token scopes govern; named, receipted, counted) ----
    if (input.link !== undefined || input.qr !== undefined) {
        const method = input.qr !== undefined ? "QR" : "TRUST_LINK";
        const raw = extractToken(input.qr ?? input.link);
        const view = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$passport$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["viewPublicCard"])(raw, req, {
            id: verifier.id,
            displayName: verifier.displayName,
            handle: verifier.handle
        });
        if (view.outcome !== "OK") {
            // Dead links are honest about WHY (the verifier was handed the token by
            // the subject) — mirrors the public viewer's 410 semantics.
            if (view.outcome === "EXPIRED") return {
                outcome: "DEAD_LINK",
                reason: view.reason
            };
            return {
                outcome: "DEAD_LINK",
                reason: "REVOKED"
            };
        }
        const assessment = await buildAssessment(view.subject, {
            method,
            includeProfile: view.scopes.includes("PROFILE"),
            includeSignals: view.scopes.includes("SIGNALS"),
            includeScore: view.scopes.includes("SCORE"),
            attributes: view.attributes
        });
        // Stage 10 — band-level network signals (counts only, k-anonymized).
        // The B2B Trust Decision API surface (trustdecision-service) is NOT
        // touched: its Stage 9 contract is frozen.
        assessment.network = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$network$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildNetworkBlockFor"])(view.subject.id);
        const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.create({
            data: {
                verifierId: verifier.id,
                subjectId: view.subject.id,
                method,
                assessment: JSON.stringify(assessment),
                shareTokenId: view.shareTokenId,
                ipHash: verifierIpHash(req)
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(view.subject.id, "SECURITY", "A member ran a safety check on you", `@${verifier.handle} checked your Trust Card via ${method === "QR" ? "a QR Trust Card scan" : "a trust link"}. The assessment they saw is recorded in your safety-check receipts.`);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: verifier.id,
            action: "SAFETY_CHECK_RUN",
            subjectType: "UserAccount",
            subjectId: view.subject.id,
            metadata: {
                method,
                outcome: "completed"
            }
        });
        return {
            outcome: "OK",
            checkId: row.id,
            assessment,
            receipted: true
        };
    }
    // ----- PHONE (consent-gated peppered-hash match) ---------------------------
    if (input.phone !== undefined) {
        const e164 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePhoneE164"])(input.phone);
        if (!e164) {
            return {
                outcome: "UNAVAILABLE",
                message: "Enter a valid Nigerian mobile number."
            };
        }
        const fingerprint = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["phoneFingerprint"])(e164); // raw phone discarded here — never stored
        const identifier = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].identityIdentifier.findFirst({
            where: {
                type: "PHONE",
                hash: fingerprint,
                status: "ACTIVE"
            },
            include: {
                trustIdentity: {
                    include: {
                        user: true
                    }
                }
            }
        });
        const subject = identifier && (identifier.expiresAt?.getTime() ?? 0) > Date.now() && identifier.trustIdentity.status === "VERIFIED" && identifier.trustIdentity.user.status === "ACTIVE" ? identifier.trustIdentity.user : null;
        if (!subject || subject.id === verifier.id) {
            // Anti-enumeration: no match, stale match or self — identical response.
            return {
                outcome: "UNAVAILABLE",
                message: "No safety-check profile is available for this number."
            };
        }
        const settings = await getSafetySettings(subject.id);
        if (!settings.enabled || !settings.allowPhoneMatch) {
            return {
                outcome: "UNAVAILABLE",
                message: "No safety-check profile is available for this number."
            };
        }
        const assessment = await buildAssessment({
            id: subject.id,
            displayName: subject.displayName,
            handle: subject.handle
        }, {
            method: "PHONE",
            includeProfile: settings.includeProfile,
            includeSignals: settings.includeSignals
        });
        assessment.network = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$network$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildNetworkBlockFor"])(subject.id);
        const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.create({
            data: {
                verifierId: verifier.id,
                subjectId: subject.id,
                method: "PHONE",
                assessment: JSON.stringify(assessment),
                consentId: settings.consentId,
                ipHash: verifierIpHash(req)
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(subject.id, "SECURITY", "A member ran a safety check on you", `@${verifier.handle} ran a safety check using your verified phone number. The assessment they saw is recorded in your safety-check receipts.`);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: verifier.id,
            action: "SAFETY_CHECK_RUN",
            subjectType: "UserAccount",
            subjectId: subject.id,
            metadata: {
                method: "PHONE",
                outcome: "completed"
            }
        });
        return {
            outcome: "OK",
            checkId: row.id,
            assessment,
            receipted: true
        };
    }
    // ----- HANDLE ----------------------------------------------------------------
    const handle = (input.handle ?? "").trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
        return {
            outcome: "UNAVAILABLE",
            message: "Enter a valid handle (3–24 characters: a–z, 0–9, _)."
        };
    }
    const subject = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            handle
        },
        select: {
            id: true,
            displayName: true,
            handle: true,
            status: true
        }
    });
    // Self-check: your own assessment, no standing consent needed (it's you).
    if (subject && subject.id === verifier.id) {
        const assessment = await buildAssessment(subject, {
            method: "HANDLE",
            includeProfile: true,
            includeSignals: true
        });
        assessment.network = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$network$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildNetworkBlockFor"])(subject.id);
        const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.create({
            data: {
                verifierId: verifier.id,
                subjectId: verifier.id,
                method: "HANDLE",
                assessment: JSON.stringify(assessment)
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: verifier.id,
            action: "SAFETY_CHECK_RUN",
            subjectType: "UserAccount",
            subjectId: verifier.id,
            metadata: {
                method: "HANDLE",
                outcome: "self"
            }
        });
        return {
            outcome: "SELF",
            checkId: row.id,
            message: "This is your own profile — the assessment below is what a member would see if you turn on safety checks (subject to your sharing settings).",
            assessment
        };
    }
    // Anti-enumeration: unknown handle and disabled checks are identical.
    const unavailable = {
        outcome: "UNAVAILABLE",
        message: "No safety-check profile is available for this handle."
    };
    if (!subject || subject.status !== "ACTIVE") {
        return unavailable;
    }
    const settings = await getSafetySettings(subject.id);
    if (!settings.enabled) {
        return unavailable;
    }
    const assessment = await buildAssessment(subject, {
        method: "HANDLE",
        includeProfile: settings.includeProfile,
        includeSignals: settings.includeSignals
    });
    assessment.network = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$network$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildNetworkBlockFor"])(subject.id);
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.create({
        data: {
            verifierId: verifier.id,
            subjectId: subject.id,
            method: "HANDLE",
            assessment: JSON.stringify(assessment),
            consentId: settings.consentId,
            ipHash: verifierIpHash(req)
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(subject.id, "SECURITY", "A member ran a safety check on you", `@${verifier.handle} ran a safety check on your handle before dealing with you. The assessment they saw is recorded in your safety-check receipts.`);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: verifier.id,
        action: "SAFETY_CHECK_RUN",
        subjectType: "UserAccount",
        subjectId: subject.id,
        metadata: {
            method: "HANDLE",
            outcome: "completed"
        }
    });
    await pruneSafetyChecks(subject.id);
    return {
        outcome: "OK",
        checkId: row.id,
        assessment,
        receipted: true
    };
}
async function getChecksByVerifier(verifierId) {
    const [rows, requests] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.findMany({
            where: {
                verifierId
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 20,
            include: {
                subject: {
                    select: {
                        displayName: true,
                        handle: true
                    }
                }
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustRequest.findMany({
            where: {
                verifierId
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 10,
            include: {
                subject: {
                    select: {
                        displayName: true,
                        handle: true
                    }
                }
            }
        })
    ]);
    const now = Date.now();
    return {
        checks: rows.map((r)=>{
            let a = {};
            try {
                a = JSON.parse(r.assessment);
            } catch  {
                a = {};
            }
            const summary = a.summary ?? {};
            return {
                id: r.id,
                method: r.method,
                subject: r.subject ? {
                    displayName: r.subject.displayName,
                    handle: r.subject.handle
                } : null,
                status: summary.status ?? null,
                riskBand: summary.riskBand ?? null,
                headline: a.headline ?? null,
                checkedAt: r.createdAt.toISOString(),
                self: r.verifierId === r.subjectId
            };
        }),
        requests: requests.map((r)=>({
                id: r.id,
                subject: r.subject ? {
                    displayName: r.subject.displayName,
                    handle: r.subject.handle
                } : null,
                status: r.status === "PENDING" && r.expiresAt.getTime() <= now ? "EXPIRED" : r.status,
                message: r.message,
                respondedAt: r.respondedAt?.toISOString() ?? null,
                expiresAt: r.expiresAt.toISOString(),
                createdAt: r.createdAt.toISOString()
            }))
    };
}
async function getSafetyMe(userId) {
    const [settings, checks, requests] = await Promise.all([
        getSafetySettings(userId),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.findMany({
            where: {
                subjectId: userId
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 20,
            include: {
                verifier: {
                    select: {
                        displayName: true,
                        handle: true
                    }
                }
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustRequest.findMany({
            where: {
                subjectId: userId
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 10,
            include: {
                verifier: {
                    select: {
                        displayName: true,
                        handle: true
                    }
                }
            }
        })
    ]);
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const [total, last7] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.count({
            where: {
                subjectId: userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.count({
            where: {
                subjectId: userId,
                createdAt: {
                    gte: new Date(weekAgo)
                }
            }
        })
    ]);
    return {
        settings,
        stats: {
            totalChecks: total,
            last7Days: last7,
            lastCheckAt: checks[0]?.createdAt.toISOString() ?? null
        },
        checksReceived: checks.map((c)=>{
            let shown = {};
            try {
                shown = JSON.parse(c.assessment);
            } catch  {
                shown = {};
            }
            return {
                id: c.id,
                verifier: c.verifier ? {
                    displayName: c.verifier.displayName,
                    handle: c.verifier.handle
                } : null,
                method: c.method,
                checkedAt: c.createdAt.toISOString(),
                shown: {
                    headline: shown.headline ?? null,
                    status: shown.summary?.status ?? null,
                    signalsCount: Array.isArray(shown.signals) ? shown.signals.length : 0
                }
            };
        }),
        requestsReceived: requests.map((r)=>({
                id: r.id,
                verifier: r.verifier ? {
                    displayName: r.verifier.displayName,
                    handle: r.verifier.handle
                } : null,
                status: r.status === "PENDING" && r.expiresAt.getTime() <= now ? "EXPIRED" : r.status,
                message: r.message,
                expiresAt: r.expiresAt.toISOString(),
                respondedAt: r.respondedAt?.toISOString() ?? null,
                createdAt: r.createdAt.toISOString()
            })),
        language: SAFETY_LANGUAGE
    };
}
// ---------------------------------------------------------------------------
// Trust Requests
// ---------------------------------------------------------------------------
const TRUST_REQUEST_MESSAGE = "asks you to share your Trust Card before you deal — accept to mint a scoped, receipted trust link.";
async function sendTrustRequest(verifier, handleInput) {
    const handle = handleInput.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
        return {
            outcome: "UNAVAILABLE",
            message: "Enter a valid handle."
        };
    }
    const subject = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            handle
        },
        select: {
            id: true,
            handle: true,
            displayName: true,
            status: true
        }
    });
    if (!subject || subject.status !== "ACTIVE") {
        return {
            outcome: "UNAVAILABLE",
            message: "No member found for this handle."
        };
    }
    if (subject.id === verifier.id) {
        return {
            outcome: "SELF",
            message: "That's your own handle — no request needed."
        };
    }
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustRequest.findFirst({
        where: {
            verifierId: verifier.id,
            subjectId: subject.id,
            status: "PENDING"
        }
    });
    if (existing && existing.expiresAt.getTime() > Date.now()) {
        return {
            outcome: "ALREADY_REQUESTED",
            requestId: existing.id
        };
    }
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustRequest.create({
        data: {
            verifierId: verifier.id,
            subjectId: subject.id,
            message: `@${verifier.handle} ${TRUST_REQUEST_MESSAGE}`,
            expiresAt: new Date(Date.now() + TRUST_REQUEST_TTL_MS)
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(subject.id, "SYSTEM", "New trust request", `@${verifier.handle} asked you to share your Trust Card before you deal. Accept to mint a scoped, receipted trust link — or decline. The request expires in 7 days.`);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: verifier.id,
        action: "TRUST_REQUEST_SENT",
        subjectType: "UserAccount",
        subjectId: subject.id,
        metadata: {
            outcome: "sent"
        }
    });
    return {
        outcome: "OK",
        requestId: row.id,
        expiresAt: row.expiresAt.toISOString()
    };
}
async function respondTrustRequest(subjectId, requestId, decision) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustRequest.findUnique({
        where: {
            id: requestId
        }
    });
    if (!row || row.subjectId !== subjectId) return {
        outcome: "NOT_FOUND"
    };
    if (row.status !== "PENDING") return {
        outcome: "NOT_PENDING"
    };
    if (row.expiresAt.getTime() <= Date.now()) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustRequest.update({
            where: {
                id: row.id
            },
            data: {
                status: "EXPIRED"
            }
        });
        return {
            outcome: "EXPIRED"
        };
    }
    if (decision === "DECLINE") {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustRequest.update({
            where: {
                id: row.id
            },
            data: {
                status: "DECLINED",
                respondedAt: new Date()
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(row.verifierId, "SYSTEM", "Trust request declined", "The member declined to share their Trust Card. Nothing was shared — no data left their account.");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: subjectId,
            action: "TRUST_REQUEST_DECLINED",
            subjectType: "TrustRequest",
            subjectId: row.id,
            metadata: {
                outcome: "declined"
            }
        });
        return {
            outcome: "OK",
            decision: "DECLINED"
        };
    }
    // ACCEPT: mint a scoped trust link (the subject's token, their control),
    // then run the named assessment FOR the verifier through it — counted,
    // receipted, snapshotted into the verifier's Safety Check history.
    const raw = `ts_${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(24).toString("base64url")}`;
    const expiresAt = new Date(Date.now() + TRUST_REQUEST_TTL_MS);
    const token = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].shareToken.create({
        data: {
            userId: subjectId,
            tokenHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(`share:${raw}`),
            scopes: JSON.stringify([
                "PROFILE",
                "SIGNALS",
                "SCORE"
            ]),
            maxViews: TOKEN_MAX_VIEWS,
            expiresAt
        }
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustRequest.update({
        where: {
            id: row.id
        },
        data: {
            status: "ACCEPTED",
            respondedAt: new Date(),
            shareTokenId: token.id
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: subjectId,
        action: "TRUST_REQUEST_ACCEPTED",
        subjectType: "TrustRequest",
        subjectId: row.id,
        metadata: {
            outcome: "accepted",
            maxViews: TOKEN_MAX_VIEWS,
            scopes: 3
        }
    });
    const [subject, verifier] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
            where: {
                id: subjectId
            },
            select: {
                id: true,
                displayName: true,
                handle: true
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
            where: {
                id: row.verifierId
            },
            select: {
                id: true,
                displayName: true,
                handle: true
            }
        })
    ]);
    if (subject && verifier) {
        // Named open: counts view #1, writes the receipt, notifies on first open.
        const view = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$passport$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["viewPublicCard"])(raw, undefined, {
            id: verifier.id,
            displayName: verifier.displayName,
            handle: verifier.handle
        });
        if (view.outcome === "OK") {
            const assessment = await buildAssessment(view.subject, {
                method: "TRUST_LINK",
                includeProfile: view.scopes.includes("PROFILE"),
                includeSignals: view.scopes.includes("SIGNALS"),
                includeScore: view.scopes.includes("SCORE"),
                attributes: view.attributes
            });
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.create({
                data: {
                    verifierId: verifier.id,
                    subjectId: subject.id,
                    method: "TRUST_LINK",
                    assessment: JSON.stringify(assessment),
                    shareTokenId: token.id
                }
            });
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(verifier.id, "SYSTEM", "Trust request accepted", `@${subject.handle} accepted your trust request. Their assessment is ready in your Safety Check history — and the trust link is theirs to share with you directly.`);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(subjectId, "SECURITY", "Trust link minted", `A trust link was minted for @${verifier.handle} (10 opens, 7 days). Every open is receipted. Keep the link below — it is shown only once.`);
    }
    return {
        outcome: "OK",
        decision: "ACCEPTED",
        token: raw,
        linkPath: `/?trust=${raw}`
    };
}
async function pruneSafetyChecks(userId) {
    const stale = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.findMany({
        where: {
            subjectId: userId
        },
        orderBy: {
            createdAt: "desc"
        },
        skip: CHECKS_RETAIN,
        select: {
            id: true
        }
    });
    if (stale.length > 0) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].safetyCheck.deleteMany({
            where: {
                id: {
                    in: stale.map((s)=>s.id)
                }
            }
        });
    }
}
}),
"[project]/src/lib/services/trustdecision-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// TrustScore Stage 9 — TrustDecisionService (the B2B Trust Decision API).
// POST /api/v1/trust/check — authenticated with an API key, NOT a session.
//
// What this endpoint IS: a consent-gated, band-level assessment surface for
// integrated businesses — the B2B twin of the member Safety Check. Subjects
// control API checks through the SAME standing SAFETY_CHECK consent; every
// completed check is receipted to the subject with the BUSINESS's name and
// generates a notification; responses carry the locked language (directive
// §50 — NEVER "this person is safe").
//
// What it is NOT: an automated significant decision. The response says so
// explicitly: TrustScore never auto-approves or auto-rejects a person; a
// business's significant decisions need their own human review (NDPA §37).
// That is why this endpoint works regardless of the engine's automated-
// decision gate — it provides information, not decisions.
//
// Red lines carried over from the member surface:
//   * band-level only — the score NUMBER is never returned here (SCORE-scoped
//     trust links are the only path to the number, and they stay member-owned)
//   * anti-enumeration: unknown handle ≡ disabled ≡ un-consented — byte-
//     identical UNAVAILABLE responses; no subject rows written for probes
//   * raw phone is hashed server-side and discarded — never stored, echoed
//     or logged (directive §38)
//   * rate limits per key + real daily plan quotas; auth failures are
//     rate-limited per IP (key-guessing resistance)
__turbopack_context__.s([
    "API_HONESTY_NOTE",
    ()=>API_HONESTY_NOTE,
    "DECISION_NOTE",
    ()=>DECISION_NOTE,
    "PURPOSE_OPTIONS",
    ()=>PURPOSE_OPTIONS,
    "authenticateApiKey",
    ()=>authenticateApiKey,
    "purposeLabel",
    ()=>purposeLabel,
    "runTrustDecision",
    ()=>runTrustDecision
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/notification-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$safety$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/safety-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$passport$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/passport-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/phone-provider.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/devportal-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$webhook$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/webhook-service.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
const RATE_LIMIT_PER_KEY_PER_MIN = 60;
const AUTH_FAILS_PER_IP_PER_MIN = 10;
const DECISION_NOTE = "This endpoint returns an assessment, not a decision: TrustScore never auto-approves or auto-rejects a person. Use it to inform your own review — significant decisions about a person require human judgment (NDPA §37).";
const API_HONESTY_NOTE = "SANDBOX/LIVE labels describe integration posture. Underlying identity providers remain contract-first MOCK until partner credentials exist — no live government, MNO or biometric integration is claimed.";
const PURPOSE_OPTIONS = [
    "marketplace_transaction",
    "employment",
    "rental",
    "professional_engagement",
    "high_value_transaction",
    "b2b_onboarding",
    "general_screening"
];
const PURPOSE_LABELS = {
    marketplace_transaction: "a marketplace transaction",
    employment: "employment screening",
    rental: "rental screening",
    professional_engagement: "a professional engagement",
    high_value_transaction: "a high-value transaction",
    b2b_onboarding: "business onboarding",
    general_screening: "general screening"
};
function purposeLabel(purpose) {
    return PURPOSE_LABELS[purpose ?? "general_screening"] ?? PURPOSE_LABELS.general_screening;
}
async function authenticateApiKey(req, requestId) {
    const raw = req.headers.get("x-api-key")?.trim() ?? "";
    // Auth-failure rate limit (per IP) — applies to EVERY failure mode
    // (malformed, unknown, revoked, suspended) so key-probing is bounded.
    const failLimit = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clientKey"])(req, "trust-api-auth"), AUTH_FAILS_PER_IP_PER_MIN, 60_000);
    const authRejected = (message)=>{
        const rl = failLimit();
        if (!rl.allowed) {
            return {
                ok: false,
                code: "RATE_LIMITED",
                message: "Too many failed API-key attempts from this address — retry shortly."
            };
        }
        return {
            ok: false,
            code: "UNAUTHENTICATED",
            message
        };
    };
    if (!raw || !/^tsk_(live|sandbox)_[a-f0-9]{48}$/.test(raw)) {
        // Uniform 401 — never reveal whether a key exists (guessing resistance).
        return authRejected("Missing or malformed API key. Pass it in the X-API-Key header.");
    }
    const key = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiKey.findUnique({
        where: {
            keyHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sha256Hex"])(raw)
        },
        include: {
            client: true
        }
    });
    if (!key || key.status !== "ACTIVE" || key.scope !== "TRUST_CHECK") {
        return authRejected("This API key is not valid or is revoked.");
    }
    if (key.client.status !== "ACTIVE") {
        return authRejected("This API client is suspended.");
    }
    // Per-key rate limit.
    const rl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])(`trust-check:${key.id}`, RATE_LIMIT_PER_KEY_PER_MIN, 60_000);
    if (!rl.allowed) {
        return {
            ok: false,
            code: "RATE_LIMITED",
            message: "Trust Decision API rate limit reached (60/min per key)."
        };
    }
    // Real daily plan quota.
    const remaining = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDailyQuotaState"])(key.clientId, key.client.plan);
    if (remaining <= 0) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "SYSTEM",
            action: "API_QUOTA_EXCEEDED",
            subjectType: "ApiClient",
            subjectId: key.clientId,
            metadata: {
                plan: key.client.plan
            }
        });
        return {
            ok: false,
            code: "QUOTA_EXCEEDED",
            message: `Daily quota exhausted for the ${key.client.plan} plan (${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DAILY_QUOTA"][key.client.plan] ?? 0} checks/day). Upgrade the plan or wait for the UTC daily reset.`
        };
    }
    void requestId; // audit events carry their own request ids where needed
    return {
        ok: true,
        caller: {
            keyId: key.id,
            clientId: key.clientId,
            clientName: key.client.name,
            clientStatus: key.client.status,
            environment: key.client.environment,
            plan: key.client.plan,
            scope: key.scope
        }
    };
}
function extractToken(input) {
    const trimmed = input.trim();
    try {
        const url = new URL(trimmed);
        const trust = url.searchParams.get("trust");
        if (trust) return trust;
    } catch  {
    /* not a URL — treat as a raw token */ }
    return trimmed;
}
async function runTrustDecision(caller, input, requestId) {
    const started = Date.now();
    const provided = [
        input.handle,
        input.phone,
        input.link,
        input.qr
    ].filter((v)=>v !== undefined && v !== "").length;
    const purpose = input.purpose ?? "general_screening";
    const purposeText = purposeLabel(purpose);
    const client = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].apiClient.findUnique({
        where: {
            id: caller.clientId
        }
    });
    const finish = async (status, decision, extra)=>{
        const outcome = decision.outcome === "OK" ? "OK" : decision.outcome === "UNAVAILABLE" ? "UNAVAILABLE" : "DEAD_LINK";
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustDecision.create({
            data: {
                clientId: caller.clientId,
                keyId: caller.keyId,
                subjectId: extra?.subjectId ?? null,
                method: extra?.method ?? "HANDLE",
                purpose,
                inputHint: extra?.inputHint ?? "invalid",
                outcome,
                assessment: extra?.assessment ? JSON.stringify(extra.assessment) : null,
                consentId: extra?.consentId ?? null,
                shareTokenId: extra?.shareTokenId ?? null,
                requestId
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordUsage"])(caller.keyId, caller.clientId, "/api/v1/trust/check", status, outcome, Date.now() - started);
        // Receipt to the subject for HANDLE/PHONE checks (link checks are already
        // receipted inside viewPublicCard with the business named). The receipt is
        // the who-checked-you log: channel API_CHECK, band-level cardShown only.
        if (outcome === "OK" && extra?.subjectId && (extra?.method === "HANDLE" || extra?.method === "PHONE")) {
            const summary = extra?.assessment?.summary ?? {};
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustReceipt.create({
                data: {
                    userId: extra.subjectId,
                    viewerLabel: `Trust API check by ${caller.clientName} — ${purposeText}`,
                    channel: "API_CHECK",
                    cardShown: JSON.stringify({
                        status: summary.status ?? null,
                        riskBand: summary.riskBand ?? null
                    })
                }
            });
            const stale = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustReceipt.findMany({
                where: {
                    userId: extra.subjectId
                },
                orderBy: {
                    viewedAt: "desc"
                },
                skip: 50,
                select: {
                    id: true
                }
            });
            if (stale.length > 0) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustReceipt.deleteMany({
                    where: {
                        id: {
                            in: stale.map((r)=>r.id)
                        }
                    }
                });
            }
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: client?.ownerId,
            action: "TRUST_DECISION_API",
            subjectType: "ApiClient",
            subjectId: caller.clientId,
            metadata: {
                method: extra?.method ?? "none",
                purpose,
                outcome,
                environment: caller.environment
            }
        });
        // Fire the webhook (attempt #1 synchronous; response does not depend on it).
        // The `subject` field follows the SAME profile-scope rule as the assessment:
        // phone checks never echo a handle the business did not provide.
        if (client?.webhookUrl && client.webhookSecret) {
            const assessmentSubject = extra?.assessment?.subject ?? null;
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$webhook$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["enqueueDelivery"])(client, "TRUST_CHECK_COMPLETED", {
                requestId,
                decisionId: requestId,
                outcome,
                method: extra?.method ?? null,
                purpose,
                subject: assessmentSubject?.handle ? `@${assessmentSubject.handle}` : null,
                assessment: extra?.assessment && outcome === "OK" ? {
                    headline: extra.assessment.headline,
                    status: extra.assessment.summary?.status ?? null,
                    riskBand: extra.assessment.summary?.riskBand ?? null,
                    freshness: extra.assessment.freshness ?? null
                } : null,
                note: DECISION_NOTE
            });
        }
        const quotaRemaining = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDailyQuotaState"])(caller.clientId, caller.plan);
        return {
            status,
            body: {
                decision,
                environment: caller.environment,
                providerMode: "MOCK",
                quota: {
                    plan: caller.plan,
                    limit: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DAILY_QUOTA"][caller.plan] ?? 0,
                    remaining: Math.max(0, quotaRemaining)
                },
                note: DECISION_NOTE,
                honesty: API_HONESTY_NOTE,
                requestId
            }
        };
    };
    if (provided !== 1) {
        return finish(422, {
            outcome: "UNAVAILABLE",
            message: "Provide exactly one of: handle, phone, link or qr."
        });
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$webhook$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["processDueDeliveries"])(caller.clientId);
    // ----- TRUST_LINK / QR (token scopes govern; counted + receipted) --------
    if (input.link !== undefined || input.qr !== undefined) {
        const method = input.qr !== undefined ? "QR" : "TRUST_LINK";
        const raw = extractToken(input.qr ?? input.link);
        // The business acts as the NAMED viewer — receipts say which business
        // checked (channel API_CHECK), never a forged member handle.
        const view = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$passport$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["viewPublicCard"])(raw, undefined, {
            id: `client:${caller.clientId}`,
            displayName: caller.clientName,
            handle: `app:${caller.clientName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20)}`,
            kind: "API_CLIENT"
        });
        if (view.outcome !== "OK") {
            const reason = view.outcome === "EXPIRED" ? view.reason : "REVOKED";
            return finish(200, {
                outcome: "DEAD_LINK",
                reason
            }, {
                method,
                inputHint: "trust link"
            });
        }
        const assessment = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$safety$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildAssessment"])(view.subject, {
            method,
            includeProfile: view.scopes.includes("PROFILE"),
            includeSignals: view.scopes.includes("SIGNALS"),
            includeScore: false,
            attributes: view.attributes
        });
        // B2B checks never include the score number even for SCORE-scoped links —
        // strip to band-level (business surface policy, documented in the portal).
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(view.subject.id, "SECURITY", "A business ran a trust check on you", `${caller.clientName} (an integrated business) checked your Trust Card via the Trust Decision API using ${method === "QR" ? "a QR Trust Card scan" : "a trust link"}, for ${purposeText}. The assessment they saw is recorded in your receipts.`);
        return finish(200, {
            outcome: "OK",
            checkId: requestId,
            receipted: true,
            assessment
        }, {
            subjectId: view.subject.id,
            method,
            inputHint: "trust link",
            assessment,
            shareTokenId: view.shareTokenId
        });
    }
    // ----- PHONE (consent-gated peppered-hash match; raw digits discarded) ----
    if (input.phone !== undefined) {
        const e164 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePhoneE164"])(input.phone);
        if (!e164) {
            return finish(422, {
                outcome: "UNAVAILABLE",
                message: "Enter a valid Nigerian mobile number."
            }, {
                method: "PHONE",
                inputHint: "invalid"
            });
        }
        const fingerprint = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["phoneFingerprint"])(e164); // raw phone discarded here
        const identifier = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].identityIdentifier.findFirst({
            where: {
                type: "PHONE",
                hash: fingerprint,
                status: "ACTIVE"
            },
            include: {
                trustIdentity: {
                    include: {
                        user: true
                    }
                }
            }
        });
        const subject = identifier && (identifier.expiresAt?.getTime() ?? 0) > Date.now() && identifier.trustIdentity.status === "VERIFIED" && identifier.trustIdentity.user.status === "ACTIVE" ? identifier.trustIdentity.user : null;
        const unavailable = {
            outcome: "UNAVAILABLE",
            message: "No trust profile is available for this number."
        };
        if (!subject) {
            return finish(200, unavailable, {
                method: "PHONE",
                inputHint: "verified phone (hashed)"
            });
        }
        const settings = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$safety$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSafetySettings"])(subject.id);
        if (!settings.enabled || !settings.allowPhoneMatch) {
            return finish(200, unavailable, {
                method: "PHONE",
                inputHint: "verified phone (hashed)"
            });
        }
        const assessment = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$safety$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildAssessment"])({
            id: subject.id,
            displayName: subject.displayName,
            handle: subject.handle
        }, {
            method: "PHONE",
            includeProfile: settings.includeProfile,
            includeSignals: settings.includeSignals
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(subject.id, "SECURITY", "A business ran a trust check on you", `${caller.clientName} (an integrated business) ran a trust check using your verified phone number via the Trust Decision API, for ${purposeText}. The assessment they saw is recorded in your receipts.`);
        return finish(200, {
            outcome: "OK",
            checkId: requestId,
            receipted: true,
            assessment
        }, {
            subjectId: subject.id,
            method: "PHONE",
            inputHint: "verified phone (hashed)",
            assessment,
            consentId: settings.consentId
        });
    }
    // ----- HANDLE (subject's standing consent governs) -------------------------
    const handle = (input.handle ?? "").trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
        return finish(422, {
            outcome: "UNAVAILABLE",
            message: "Enter a valid handle (3–24 characters: a–z, 0–9, _)."
        }, {
            method: "HANDLE",
            inputHint: "invalid"
        });
    }
    const subject = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            handle
        },
        select: {
            id: true,
            displayName: true,
            handle: true,
            status: true
        }
    });
    const unavailable = {
        outcome: "UNAVAILABLE",
        message: "No trust profile is available for this handle."
    };
    // Owner self-check: the owner already holds this data via their passport —
    // allow it (useful for integration smoke tests), no receipt, no notification.
    if (subject && subject.id === client?.ownerId) {
        const assessment = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$safety$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildAssessment"])(subject, {
            method: "HANDLE",
            includeProfile: true,
            includeSignals: true
        });
        return finish(200, {
            outcome: "OK",
            checkId: requestId,
            receipted: false,
            assessment
        }, {
            subjectId: subject.id,
            method: "HANDLE",
            inputHint: `@${handle} (self)`,
            assessment
        });
    }
    if (!subject || subject.status !== "ACTIVE") {
        return finish(200, unavailable, {
            method: "HANDLE",
            inputHint: `@${handle}`
        });
    }
    const settings = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$safety$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSafetySettings"])(subject.id);
    if (!settings.enabled) {
        return finish(200, unavailable, {
            method: "HANDLE",
            inputHint: `@${handle}`
        });
    }
    const assessment = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$safety$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildAssessment"])(subject, {
        method: "HANDLE",
        includeProfile: settings.includeProfile,
        includeSignals: settings.includeSignals
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(subject.id, "SECURITY", "A business ran a trust check on you", `${caller.clientName} (an integrated business) ran a trust check on your handle via the Trust Decision API, for ${purposeText}. The assessment they saw is recorded in your receipts.`);
    return finish(200, {
        outcome: "OK",
        checkId: requestId,
        receipted: true,
        assessment
    }, {
        subjectId: subject.id,
        method: "HANDLE",
        inputHint: `@${handle}`,
        assessment,
        consentId: settings.consentId
    });
}
}),
"[project]/src/app/api/v1/dev/clients/[id]/live/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// POST /api/v1/dev/clients/:id/live — switch the client environment to LIVE
// (Stage 9, OWNER only). Body: { confirm: "I UNDERSTAND" } — typing the
// confirmation is the deliberate act. HONEST semantics: LIVE is an
// integration-posture label (https-only webhooks, live key prefix). The
// underlying identity providers remain contract-first MOCK until partner
// credentials exist — the response says so explicitly.
__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/session.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/devportal-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustdecision$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/trustdecision-service.ts [app-route] (ecmascript)");
;
;
;
;
;
const LiveSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    confirm: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim()
}).strict();
async function POST(req, { params }) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const { id } = await params;
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSessionUser"])(req);
    if (!user) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(401, "UNAUTHENTICATED", "No active session.", requestId);
    const rl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])(`dev-live:${user.id}`, 3, 60_000);
    if (!rl.allowed) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(429, "RATE_LIMITED", "Too many environment changes. Wait a minute.", requestId);
    let body = {};
    try {
        const text = await req.text();
        if (text) body = JSON.parse(text);
    } catch  {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
    }
    const parsed = LiveSchema.safeParse(body);
    if (!parsed.success) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(422, "VALIDATION_ERROR", "Invalid confirmation payload.", requestId);
    }
    try {
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["enableLive"])(user.id, id, parsed.data.confirm);
        if (!result.ok) {
            switch(result.code){
                case "NOT_FOUND":
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(404, "NOT_FOUND", "No such API client.", requestId);
                case "FORBIDDEN":
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(403, "FORBIDDEN", "Only the client OWNER can change the environment.", requestId);
                case "CONFIRM_REQUIRED":
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(422, "CONFIRM_REQUIRED", 'Switching to LIVE requires typing "I UNDERSTAND" in the confirm field.', requestId);
                case "ALREADY_LIVE":
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(409, "ALREADY_LIVE", "This client is already LIVE.", requestId);
            }
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
            client: result.client,
            honesty: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustdecision$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["API_HONESTY_NOTE"],
            requestId
        });
    } catch (e) {
        if (e instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PortalError"]) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(e.code === "NOT_FOUND" ? 404 : 403, e.code, e.message, requestId);
        }
        throw e;
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7cbfc0ab._.js.map