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
"[project]/src/app/api/v1/dev/clients/[id]/keys/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// POST /api/v1/dev/clients/:id/keys — mint an API key (Stage 9).
// OWNER/DEVELOPER role. The RAW key is returned exactly ONCE and never
// stored or logged — at rest only sha256(raw) + a short prefix. FREE plan
// allows 2 active keys, STARTER 5. Keys expire informatively after 365d.
__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/session.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/devportal-service.ts [app-route] (ecmascript)");
;
;
;
;
const MintSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(3).max(40)
}).strict();
async function POST(req, { params }) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const { id } = await params;
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSessionUser"])(req);
    if (!user) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(401, "UNAUTHENTICATED", "No active session.", requestId);
    const rl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])(`dev-mint:${user.id}`, 5, 60_000);
    if (!rl.allowed) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(429, "RATE_LIMITED", "Too many key operations. Wait a minute.", requestId);
    let body = {};
    try {
        const text = await req.text();
        if (text) body = JSON.parse(text);
    } catch  {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
    }
    const parsed = MintSchema.safeParse(body);
    if (!parsed.success) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(422, "VALIDATION_ERROR", "Key label must be 3–40 characters.", requestId);
    }
    try {
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mintApiKey"])(user.id, id, parsed.data.name);
        if (!result.ok) {
            switch(result.code){
                case "NOT_FOUND":
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(404, "NOT_FOUND", "No such API client.", requestId);
                case "FORBIDDEN":
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(403, "FORBIDDEN", "Your team role does not allow minting keys.", requestId);
                case "LIMIT":
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(409, "KEY_LIMIT", "Active-key limit for this plan reached. Revoke a key or upgrade the plan.", requestId);
                default:
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(422, "VALIDATION_ERROR", "Invalid key label.", requestId);
            }
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
            key: result.key,
            warning: "Copy this key now — it is shown ONCE and can never be retrieved again (only its sha256 hash is stored).",
            requestId
        }, 201);
    } catch (e) {
        if (e instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$devportal$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PortalError"]) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(e.code === "NOT_FOUND" ? 404 : 403, e.code, e.message, requestId);
        }
        throw e;
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__cdadb25f._.js.map