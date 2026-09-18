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
"[project]/src/lib/auth/identifiers.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IDENTIFIER_TYPES",
    ()=>IDENTIFIER_TYPES,
    "RESERVED_USERNAMES",
    ()=>RESERVED_USERNAMES,
    "detectIdentifierType",
    ()=>detectIdentifierType,
    "googleSubForEmail",
    ()=>googleSubForEmail,
    "identifierLabel",
    ()=>identifierLabel,
    "isUsernameShape",
    ()=>isUsernameShape,
    "normalizeEmail",
    ()=>normalizeEmail,
    "normalizePhoneIdentifier",
    ()=>normalizePhoneIdentifier,
    "normalizeUsername",
    ()=>normalizeUsername
]);
// AUTH batch — identifier normalization + detection (pure functions, no DB).
//
// The single identifier field accepts username | email | phone. Detection is
// heuristic-first (shape), never account-existence-based (enumeration safety):
//   - contains "@" AND a dot in the domain → EMAIL
//   - digits/+/spaces/dashes only, ≥7 significant digits → PHONE (NG E.164)
//   - otherwise → USERNAME (normalized lowercase handle)
//
// Value discipline per type lives in the AuthIdentifier table; the raw phone
// number NEVER persists (fingerprint only) and never reaches URLs/logs/analytics.
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/phone-provider.ts [app-route] (ecmascript)");
;
;
const IDENTIFIER_TYPES = [
    "USERNAME",
    "EMAIL",
    "PHONE",
    "GOOGLE"
];
const RESERVED_USERNAMES = new Set([
    "admin",
    "administrator",
    "root",
    "system",
    "support",
    "help",
    "security",
    "official",
    "staff",
    "moderator",
    "trustscore",
    "ninauth",
    "nimc",
    "api",
    "noreply",
    "no-reply",
    "postmaster",
    "webmaster",
    "mail",
    "info",
    "billing",
    "legal",
    "privacy",
    "abuse",
    "dev",
    "developer",
    "engineering",
    "marketing",
    "sales",
    "finance",
    "team",
    "trust",
    "verify",
    "login",
    "signin",
    "signup",
    "register",
    "account",
    "me",
    "null",
    "undefined",
    "test",
    "demo"
]);
const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeUsername(raw) {
    const v = raw.trim().toLowerCase();
    if (!USERNAME_RE.test(v)) return null;
    if (RESERVED_USERNAMES.has(v)) return null;
    return v;
}
function isUsernameShape(raw) {
    return /^[a-zA-Z0-9_]+$/.test(raw.trim());
}
function normalizeEmail(raw) {
    const v = raw.trim().toLowerCase();
    if (v.length > 254 || !EMAIL_RE.test(v)) return null;
    return v;
}
function normalizePhoneIdentifier(raw) {
    const e164 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePhoneE164"])(raw);
    if (!e164) return null;
    return {
        e164,
        hash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["phoneFingerprint"])(e164),
        hint: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["maskPhoneHint"])(e164)
    };
}
function detectIdentifierType(raw) {
    const v = raw.trim();
    if (!v) return null;
    if (v.includes("@") && EMAIL_RE.test(v.toLowerCase())) return "EMAIL";
    // Phone shapes: +234…, 0…, or bare 7/8/9-leading 10-11 digits.
    const compact = v.replace(/[\s()\-.]/g, "");
    if (/^\+?\d{7,15}$/.test(compact)) return "PHONE";
    if (isUsernameShape(v)) return "USERNAME";
    return null;
}
function googleSubForEmail(normalizedEmail) {
    return `g_${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`google:${normalizedEmail}`).digest("hex").slice(0, 24)}`;
}
function identifierLabel(type) {
    switch(type){
        case "USERNAME":
            return "Username";
        case "EMAIL":
            return "Email";
        case "PHONE":
            return "Phone";
        case "GOOGLE":
            return "Google";
    }
}
}),
"[project]/src/lib/services/auth-identifier-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "backfillIdentifiers",
    ()=>backfillIdentifiers,
    "deriveHandle",
    ()=>deriveHandle,
    "linkIdentifier",
    ()=>linkIdentifier,
    "listIdentifiers",
    ()=>listIdentifiers,
    "markIdentifierVerified",
    ()=>markIdentifierVerified,
    "resolveIdentifier",
    ()=>resolveIdentifier,
    "touchIdentifier",
    ()=>touchIdentifier,
    "unlinkIdentifier",
    ()=>unlinkIdentifier
]);
// AUTH batch — AuthIdentifier service: the canonical multi-identifier registry.
// Every login method (username / email / phone / Google / NINAuth) resolves
// through resolveIdentifier(). UserAccount.email + handle remain denormalized
// display fields, kept in sync here — the registry is single-source for AUTH.
//
// Conflict policy: @@unique([type, value]) — an identifier belongs to exactly
// ONE account. Ownership is never silently transferred between accounts.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth/identifiers.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
;
;
;
;
async function resolveIdentifier(type, value) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findUnique({
        where: {
            type_value: {
                type,
                value
            }
        },
        select: {
            userId: true
        }
    });
    if (row) return {
        ok: true,
        userId: row.userId
    };
    // Legacy fallback: pre-AUTH-batch rows (email/handle on UserAccount). The
    // backfill covers these, but tests can create accounts directly.
    if (type === "EMAIL") {
        const byEmail = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
            where: {
                email: value
            },
            select: {
                id: true
            }
        });
        if (byEmail) return {
            ok: true,
            userId: byEmail.id
        };
    }
    if (type === "USERNAME") {
        const byHandle = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
            where: {
                handle: value
            },
            select: {
                id: true
            }
        });
        if (byHandle) return {
            ok: true,
            userId: byHandle.id
        };
    }
    return {
        ok: false,
        code: "NOT_FOUND"
    };
}
async function touchIdentifier(userId, type, value) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.updateMany({
        where: {
            userId,
            type,
            value
        },
        data: {
            lastUsedAt: new Date()
        }
    });
}
async function linkIdentifier(userId, type, value, opts) {
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findUnique({
        where: {
            type_value: {
                type,
                value
            }
        },
        select: {
            userId: true
        }
    });
    if (existing) {
        return existing.userId === userId ? {
            ok: false,
            code: "ALREADY_LINKED"
        } : {
            ok: false,
            code: "TAKEN_BY_OTHER"
        };
    }
    if (opts.makePrimary) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.updateMany({
            where: {
                userId,
                type,
                isPrimary: true
            },
            data: {
                isPrimary: false
            }
        });
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.create({
        data: {
            userId,
            type,
            value,
            hint: opts.hint ?? null,
            verified: opts.verified ?? false,
            verifiedAt: opts.verified ? new Date() : null,
            isPrimary: opts.makePrimary ?? false
        }
    });
    // Keep the denormalized display fields in sync (read path compatibility).
    if (opts.syncAccount) {
        if (type === "EMAIL") {
            const user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
                where: {
                    id: userId
                },
                select: {
                    email: true
                }
            });
            if (!user?.email) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.update({
                    where: {
                        id: userId
                    },
                    data: {
                        email: value
                    }
                });
            }
        }
        if (type === "USERNAME") {
            const user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
                where: {
                    id: userId
                },
                select: {
                    handle: true
                }
            });
            if (!user || user.handle === value) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.update({
                    where: {
                        id: userId
                    },
                    data: {
                        handle: value
                    }
                });
            }
        }
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "AUTH_IDENTIFIER_LINKED",
        subjectType: "AuthIdentifier",
        subjectId: `${type}:${value.slice(0, 12)}`,
        requestId: opts.requestId,
        metadata: {
            outcome: "linked",
            type,
            verified: opts.verified ?? false
        }
    });
    return {
        ok: true,
        created: true
    };
}
async function markIdentifierVerified(userId, type, value) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.updateMany({
        where: {
            userId,
            type,
            value
        },
        data: {
            verified: true,
            verifiedAt: new Date()
        }
    });
}
async function unlinkIdentifier(userId, type, value, requestId) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findUnique({
        where: {
            type_value: {
                type,
                value
            }
        },
        select: {
            userId: true
        }
    });
    if (!row || row.userId !== userId) return {
        ok: false,
        code: "NOT_LINKED"
    };
    const identifiers = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findMany({
        where: {
            userId
        },
        select: {
            type: true
        }
    });
    if (identifiers.length <= 1) {
        // The only identifier left: passwordless accounts cannot lose it.
        // (Accounts WITH a password may drop their last identifier — the password
        // remains a valid auth path via the identifier-less email column? No —
        // login resolves through identifiers, so keep the guard simple and safe.)
        return {
            ok: false,
            code: "LAST_IDENTIFIER"
        };
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.delete({
        where: {
            type_value: {
                type,
                value
            }
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "AUTH_IDENTIFIER_UNLINKED",
        subjectType: "AuthIdentifier",
        subjectId: `${type}:${value.slice(0, 12)}`,
        requestId,
        metadata: {
            outcome: "unlinked",
            type
        }
    });
    return {
        ok: true
    };
}
async function listIdentifiers(userId) {
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findMany({
        where: {
            userId
        },
        orderBy: [
            {
                isPrimary: "desc"
            },
            {
                linkedAt: "asc"
            }
        ]
    });
    return rows.map((r)=>({
            type: r.type,
            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["identifierLabel"])(r.type),
            hint: r.hint,
            verified: r.verified,
            isPrimary: r.isPrimary,
            linkedAt: r.linkedAt.toISOString(),
            lastUsedAt: r.lastUsedAt?.toISOString() ?? null
        }));
}
async function backfillIdentifiers() {
    const users = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findMany({
        select: {
            id: true,
            email: true,
            handle: true
        }
    });
    let created = 0;
    for (const u of users){
        const have = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findMany({
            where: {
                userId: u.id
            },
            select: {
                type: true,
                value: true
            }
        });
        const haveTypes = new Set(have.map((h)=>`${h.type}:${h.value}`));
        const wanted = [];
        if (u.handle && !haveTypes.has(`USERNAME:${u.handle}`)) wanted.push({
            type: "USERNAME",
            value: u.handle
        });
        if (u.email && !haveTypes.has(`EMAIL:${u.email}`)) wanted.push({
            type: "EMAIL",
            value: u.email
        });
        if (wanted.length) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.createMany({
                data: wanted.map((w, i)=>({
                        userId: u.id,
                        type: w.type,
                        value: w.value,
                        // Legacy accounts have usable email+password+handle from day one;
                        // the email was never bounce-verified, so verified=false is the
                        // honest label (verification gates linking, not password login).
                        verified: false,
                        isPrimary: i === 0 && !have.length
                    }))
            });
            created += wanted.length;
        }
    }
    return {
        created
    };
}
async function deriveHandle(givenName) {
    const base = (givenName ?? "member").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 18) || "member";
    let candidate = base.length >= 3 ? base : `${base}_user`;
    for(let attempt = 0; attempt < 6; attempt++){
        const taken = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
            where: {
                handle: candidate
            },
            select: {
                id: true
            }
        });
        if (!taken) return candidate;
        candidate = `${base.slice(0, 18)}_${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(2).toString("hex")}`;
    }
    return `member_${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(4).toString("hex")}`;
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
"[project]/src/lib/providers/google.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GOOGLE_CODE_TTL_MS",
    ()=>GOOGLE_CODE_TTL_MS,
    "GOOGLE_LOGIN_TTL_MS",
    ()=>GOOGLE_LOGIN_TTL_MS,
    "GOOGLE_MODE",
    ()=>GOOGLE_MODE,
    "GOOGLE_PROVIDER_NAME",
    ()=>GOOGLE_PROVIDER_NAME,
    "GOOGLE_SCOPES",
    ()=>GOOGLE_SCOPES,
    "GoogleTokenValidationError",
    ()=>GoogleTokenValidationError,
    "codeMatches",
    ()=>codeMatches,
    "googleAuthorizationUrl",
    ()=>googleAuthorizationUrl,
    "googleConsentScreen",
    ()=>googleConsentScreen,
    "hashCode",
    ()=>hashCode,
    "issueAuthorizationCode",
    ()=>issueAuthorizationCode,
    "mockGoogleIdToken",
    ()=>mockGoogleIdToken,
    "validateGoogleIdToken",
    ()=>validateGoogleIdToken
]);
// AUTH batch — Google OAuth 2.0 provider (contract-first, honestly-labeled
// MOCK posture in the sandbox — identical discipline to the NINAuth provider).
//
// Contract (shared with the real provider):
//   start → (user picks account + consents at Google) → callback
//   (one-time code + PKCE exchange + ID-token validation) → account
//   resolution/link/create.
//
// MOCK mode (no GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in the environment):
//   - The "Google" consent screen is a frontend modal (GoogleConsentModal)
//     where the tester picks the Google account (email) and grants/denies.
//   - The mock subject (sub) is deterministic per email: sha256("google:"+email)
//     — repeat sign-ins resolve to the same identity, exactly like a real sub.
//   - The ID token is an HMAC-signed JWT-shape assertion validated on callback.
//
// LIVE mode (credentials present): authorizationUrl points at the real
// accounts.google.com authorization endpoint with PKCE + state; the callback
// exchanges the code server-side and validates the Google ID token (iss, aud,
// exp, nonce). The resolution/linking rules are identical in both modes.
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/ninauth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/boot-guard.ts [app-route] (ecmascript)");
;
;
;
const GOOGLE_PROVIDER_NAME = "GOOGLE_MOCK";
const GOOGLE_MODE = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "LIVE" : "MOCK"; // honestly labeled everywhere
const GOOGLE_LOGIN_TTL_MS = 10 * 60_000; // consent window
const GOOGLE_CODE_TTL_MS = 60_000; // one-time authorization code TTL
const GOOGLE_SCOPES = [
    "openid",
    "email"
];
const GOOGLE_ISSUER = "https://accounts.google.com";
// sec-batch-A: guarded read — production refuses to boot on the dev default.
const MOCK_SIGNING_SECRET = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["guardedSecret"])("SIGNAL_PEPPER");
;
function issueAuthorizationCode() {
    return {
        code: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(24).toString("base64url"),
        expiresAt: new Date(Date.now() + GOOGLE_CODE_TTL_MS)
    };
}
function hashCode(code) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`google:code:${code}`).digest("hex");
}
function codeMatches(storedHash, presented) {
    const a = Buffer.from(storedHash, "hex");
    const b = Buffer.from(hashCode(presented), "hex");
    return a.length === b.length && (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["timingSafeEqual"])(a, b);
}
function googleAuthorizationUrl(state, challenge) {
    if (GOOGLE_MODE === "LIVE") {
        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            response_type: "code",
            scope: GOOGLE_SCOPES.join(" "),
            state,
            code_challenge: challenge,
            code_challenge_method: "S256",
            redirect_uri: `${process.env.GOOGLE_REDIRECT_URI ?? ""}/api/v1/auth/google/callback`
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    // MOCK: the frontend modal IS the authorize screen; the URL is informational.
    return `/api/v1/auth/google/consent?state=${encodeURIComponent(state)}`;
}
class GoogleTokenValidationError extends Error {
    code;
    constructor(code){
        super(code);
        this.code = code;
    }
}
function b64url(input) {
    return Buffer.from(input).toString("base64url");
}
function mockGoogleIdToken(claims) {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({
        alg: "HS256",
        typ: "JWT"
    }));
    const payload = b64url(JSON.stringify({
        iss: GOOGLE_ISSUER,
        aud: "trustscore_google_audience",
        sub: claims.sub,
        email: claims.email,
        email_verified: true,
        nonce: claims.nonce,
        iat: now,
        exp: now + 120
    }));
    const sig = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])("sha256", `${MOCK_SIGNING_SECRET}:google`).update(`${header}.${payload}`).digest("base64url");
    return `${header}.${payload}.${sig}`;
}
function validateGoogleIdToken(token, expectedNonce) {
    const parts = token.split(".");
    if (parts.length !== 3) throw new GoogleTokenValidationError("malformed");
    const [header, payload, sig] = parts;
    const expected = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])("sha256", `${MOCK_SIGNING_SECRET}:google`).update(`${header}.${payload}`).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["timingSafeEqual"])(a, b)) throw new GoogleTokenValidationError("bad_signature");
    let claims;
    try {
        claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    } catch  {
        throw new GoogleTokenValidationError("bad_payload");
    }
    if (claims.iss !== GOOGLE_ISSUER) throw new GoogleTokenValidationError("bad_issuer");
    if (claims.aud !== "trustscore_google_audience") throw new GoogleTokenValidationError("bad_audience");
    if (!claims.sub || !claims.email) throw new GoogleTokenValidationError("missing_claims");
    if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) throw new GoogleTokenValidationError("expired");
    if (claims.nonce !== expectedNonce) throw new GoogleTokenValidationError("bad_nonce");
    return {
        sub: claims.sub,
        email: claims.email.toLowerCase()
    };
}
function googleConsentScreen() {
    return {
        provider: GOOGLE_PROVIDER_NAME,
        providerMode: GOOGLE_MODE,
        scopes: GOOGLE_SCOPES,
        purpose: "Sign in to TrustScore with your Google Account",
        sharing: "TrustScore will receive your Google account ID and email address. It will NOT see your password or your Google profile.",
        policyUrl: "https://policies.google.com/privacy"
    };
}
}),
"[project]/src/lib/services/google-auth-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "applyGoogleGrant",
    ()=>applyGoogleGrant,
    "completeGoogleLogin",
    ()=>completeGoogleLogin,
    "confirmGoogleLink",
    ()=>confirmGoogleLink,
    "notifyGoogleSignIn",
    ()=>notifyGoogleSignIn,
    "startGoogleLogin",
    ()=>startGoogleLogin
]);
// AUTH batch — Google authentication service ("Continue with Google").
// OAuth 2.0 + PKCE + state over the GoogleLoginSession table. Account
// resolution at the callback (design D4):
//   1. GOOGLE identifier (stable sub) already bound → LOGIN
//   2. sub unbound + Google email matches an account with a VERIFIED EMAIL
//      identifier → auto-LINK + login (Google's verified email = secure
//      ownership proof — the standard linking rule)
//   3. email matches an account whose EMAIL identifier is UNVERIFIED →
//      LINK_REQUIRED (never a silent merge: the user signs in with their
//      password first, then confirms linking via /auth/google/link)
//   4. no match → REGISTER (passwordless: scrypt hash of an unguessable
//      random value; password login impossible by construction)
//
// Product principle (D8): Google authentication establishes the ACCOUNT —
// it never establishes a verified Trust Identity and never affects trust.
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/notification-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/auth-identifier-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth/identifiers.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/providers/google.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/ninauth.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
async function startGoogleLogin(requestId) {
    const { verifier, challenge } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generatePkce"])();
    const state = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateState"])();
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.create({
        data: {
            state,
            codeVerifier: verifier,
            codeChallenge: challenge,
            status: "AWAITING_CONSENT",
            expiresAt: new Date(Date.now() + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["GOOGLE_LOGIN_TTL_MS"])
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "ANONYMOUS",
        action: "AUTH_GOOGLE_START",
        subjectType: "GoogleLoginSession",
        subjectId: session.id,
        requestId,
        metadata: {
            outcome: "started",
            providerMode: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["GOOGLE_MODE"]
        }
    });
    return {
        id: session.id,
        status: session.status,
        authorizationUrl: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["googleAuthorizationUrl"])(state, challenge),
        provider: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["GOOGLE_PROVIDER_NAME"],
        providerMode: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["GOOGLE_MODE"],
        consentScreen: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["googleConsentScreen"])(),
        expiresAt: session.expiresAt.toISOString(),
        ttlMs: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["GOOGLE_LOGIN_TTL_MS"]
    };
}
async function applyGoogleGrant(input, requestId) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.findUnique({
        where: {
            id: input.sessionId
        }
    });
    if (!session) return {
        ok: false,
        code: "SESSION_NOT_FOUND"
    };
    if (session.status === "DENIED") return {
        ok: false,
        code: "DENIED"
    };
    if (session.status !== "AWAITING_CONSENT") return {
        ok: false,
        code: "NOT_PENDING"
    };
    if (session.expiresAt.getTime() < Date.now()) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.update({
            where: {
                id: session.id
            },
            data: {
                status: "EXPIRED",
                errorReason: "session_ttl"
            }
        });
        return {
            ok: false,
            code: "EXPIRED"
        };
    }
    const email = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeEmail"])(input.email);
    if (!email) return {
        ok: false,
        code: "EMAIL_INVALID"
    };
    if (input.decision === "DENY") {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.update({
            where: {
                id: session.id
            },
            data: {
                status: "DENIED",
                completedAt: new Date()
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "ANONYMOUS",
            action: "AUTH_GOOGLE_DENIED",
            subjectType: "GoogleLoginSession",
            subjectId: session.id,
            requestId,
            metadata: {
                outcome: "denied"
            }
        });
        return {
            ok: false,
            code: "DENIED"
        };
    }
    const issued = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["issueAuthorizationCode"])();
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.update({
        where: {
            id: session.id
        },
        data: {
            status: "GRANTED",
            googleEmail: email,
            googleSub: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["googleSubForEmail"])(email),
            authorizationCodeHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["hashCode"])(issued.code),
            authorizationCodeExp: issued.expiresAt
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "ANONYMOUS",
        action: "AUTH_GOOGLE_GRANTED",
        subjectType: "GoogleLoginSession",
        subjectId: session.id,
        requestId,
        metadata: {
            outcome: "granted",
            providerMode: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["GOOGLE_MODE"]
        }
    });
    return {
        ok: true,
        code: issued.code,
        state: session.state
    };
}
async function failGoogleSession(sessionId, reason, requestId) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.update({
        where: {
            id: sessionId
        },
        data: {
            status: "EXPIRED",
            errorReason: reason,
            completedAt: new Date()
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "ANONYMOUS",
        action: "AUTH_GOOGLE_FAILED",
        subjectType: "GoogleLoginSession",
        subjectId: sessionId,
        requestId,
        metadata: {
            outcome: "failed",
            reason
        }
    });
}
function maskEmail(email) {
    const [local, domain] = email.split("@");
    const head = local.slice(0, 1);
    return `${head}${"•".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}
async function completeGoogleLogin(input, requestId) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.findUnique({
        where: {
            id: input.sessionId
        }
    });
    if (!session) return {
        ok: false,
        code: "SESSION_NOT_FOUND"
    };
    if (session.state !== input.state) {
        await failGoogleSession(session.id, "state_mismatch", requestId);
        return {
            ok: false,
            code: "BAD_STATE"
        };
    }
    if (session.status === "COMPLETED") return {
        ok: false,
        code: "CODE_REUSED"
    };
    if (session.status !== "GRANTED" || !session.authorizationCodeHash) {
        return {
            ok: false,
            code: "NOT_GRANTED"
        };
    }
    if ((session.authorizationCodeExp?.getTime() ?? 0) < Date.now() || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["codeMatches"])(session.authorizationCodeHash, input.code)) {
        await failGoogleSession(session.id, "code_mismatch", requestId);
        return {
            ok: false,
            code: "EXCHANGE_FAILED",
            reason: "code"
        };
    }
    // Mock ID token mint + validation (in LIVE this is the token-endpoint call).
    let idToken;
    try {
        idToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["mockGoogleIdToken"])({
            sub: session.googleSub,
            email: session.googleEmail,
            nonce: session.state
        });
    } catch  {
        await failGoogleSession(session.id, "exchange_error", requestId);
        return {
            ok: false,
            code: "EXCHANGE_FAILED",
            reason: "exchange"
        };
    }
    let claims;
    try {
        claims = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["validateGoogleIdToken"])(idToken, session.state);
    } catch (err) {
        const reason = err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$google$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["GoogleTokenValidationError"] ? err.code : "validation_error";
        await failGoogleSession(session.id, `token_${reason}`, requestId);
        return {
            ok: false,
            code: "TOKEN_INVALID",
            reason
        };
    }
    // 1. Returning Google user.
    const bySub = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolveIdentifier"])("GOOGLE", claims.sub);
    if (bySub.ok) {
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
            where: {
                id: bySub.userId
            },
            select: {
                status: true
            }
        });
        if (!user || user.status !== "ACTIVE") {
            return {
                ok: false,
                code: "SESSION_NOT_FOUND"
            };
        }
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.update({
            where: {
                id: session.id
            },
            data: {
                status: "COMPLETED",
                completedAt: new Date()
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: bySub.userId,
            action: "AUTH_GOOGLE_LOGIN",
            subjectType: "UserAccount",
            subjectId: bySub.userId,
            requestId,
            metadata: {
                outcome: "login"
            }
        });
        return {
            ok: true,
            userId: bySub.userId,
            outcome: "LOGIN"
        };
    }
    // 2/3. Email-based linking decision.
    const byEmail = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolveIdentifier"])("EMAIL", claims.email);
    if (byEmail.ok) {
        const emailIdent = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findUnique({
            where: {
                type_value: {
                    type: "EMAIL",
                    value: claims.email
                }
            },
            select: {
                userId: true,
                verified: true
            }
        });
        if (emailIdent?.verified) {
            // Auto-link: Google asserts verified email ownership.
            const user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
                where: {
                    id: byEmail.userId
                },
                select: {
                    status: true
                }
            });
            if (!user || user.status !== "ACTIVE") {
                return {
                    ok: false,
                    code: "SESSION_NOT_FOUND"
                };
            }
            // Consume the session BEFORE the account write (crash-safe, no replay).
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.update({
                where: {
                    id: session.id
                },
                data: {
                    status: "COMPLETED",
                    completedAt: new Date()
                }
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(byEmail.userId, "GOOGLE", claims.sub, {
                hint: claims.email,
                verified: true,
                requestId,
                syncAccount: false
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
                actorType: "USER",
                actorId: byEmail.userId,
                action: "AUTH_GOOGLE_LINKED",
                subjectType: "UserAccount",
                subjectId: byEmail.userId,
                requestId,
                metadata: {
                    outcome: "linked",
                    rule: "verified_email"
                }
            });
            return {
                ok: true,
                userId: byEmail.userId,
                outcome: "LINKED"
            };
        }
        // Unverified email match — explicit linking flow required.
        return {
            ok: false,
            code: "LINK_REQUIRED",
            googleSessionId: session.id,
            emailHint: maskEmail(claims.email)
        };
    }
    // 4. Registration — passwordless account from the Google claims.
    // Consume the session BEFORE the account write (crash-safe, no replay).
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.update({
        where: {
            id: session.id
        },
        data: {
            status: "COMPLETED",
            completedAt: new Date()
        }
    });
    const displayName = claims.email.split("@")[0].slice(0, 40) || "Google Member";
    const handle = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["deriveHandle"])(displayName);
    const { hash, salt } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashPassword"])((0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(32).toString("base64url"));
    const created = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.create({
        data: {
            email: claims.email,
            passwordHash: hash,
            passwordSalt: salt,
            displayName,
            handle,
            status: "ACTIVE"
        }
    });
    // Register the auth identifiers (canonical registry, design D1) — the
    // handle is a login identifier from day one, mirroring the email path
    // (matrix observation auth-7 #1).
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(created.id, "USERNAME", handle, {
        verified: true,
        requestId,
        makePrimary: false,
        syncAccount: true
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(created.id, "GOOGLE", claims.sub, {
        hint: claims.email,
        verified: true,
        requestId,
        makePrimary: true
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(created.id, "EMAIL", claims.email, {
        hint: claims.email,
        verified: true,
        requestId
    });
    const notif = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["welcomeNotification"])(displayName);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(created.id, "SYSTEM", notif.title, notif.body);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: created.id,
        action: "AUTH_GOOGLE_REGISTERED",
        subjectType: "UserAccount",
        subjectId: created.id,
        requestId,
        metadata: {
            outcome: "registered"
        }
    });
    return {
        ok: true,
        userId: created.id,
        outcome: "REGISTERED"
    };
}
async function confirmGoogleLink(userId, googleSessionId, requestId) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.findUnique({
        where: {
            id: googleSessionId
        }
    });
    if (!session) return {
        ok: false,
        code: "SESSION_NOT_FOUND"
    };
    if (session.status !== "GRANTED" || !session.googleSub) {
        return {
            ok: false,
            code: "NOT_GRANTED"
        };
    }
    if (session.expiresAt.getTime() < Date.now()) {
        return {
            ok: false,
            code: "EXPIRED"
        };
    }
    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            id: userId
        },
        select: {
            status: true
        }
    });
    if (!user || user.status !== "ACTIVE") return {
        ok: false,
        code: "NOT_ACTIVE"
    };
    const link = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(userId, "GOOGLE", session.googleSub, {
        hint: session.googleEmail ?? undefined,
        verified: true,
        requestId,
        makePrimary: false
    });
    if (!link.ok) {
        return link.code === "TAKEN_BY_OTHER" ? {
            ok: false,
            code: "ALREADY_LINKED_TO_OTHER"
        } : {
            ok: false,
            code: "ALREADY_LINKED"
        };
    }
    // If the account has no email yet, adopt the Google email as the display one.
    const account = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            id: userId
        },
        select: {
            email: true
        }
    });
    if (!account?.email && session.googleEmail) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.update({
            where: {
                id: userId
            },
            data: {
                email: session.googleEmail
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(userId, "EMAIL", session.googleEmail, {
            hint: session.googleEmail,
            verified: true,
            requestId
        });
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].googleLoginSession.update({
        where: {
            id: googleSessionId
        },
        data: {
            status: "COMPLETED",
            completedAt: new Date()
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "AUTH_GOOGLE_LINK_CONFIRMED",
        subjectType: "UserAccount",
        subjectId: userId,
        requestId,
        metadata: {
            outcome: "linked",
            rule: "explicit_confirm"
        }
    });
    return {
        ok: true,
        userId
    };
}
async function notifyGoogleSignIn(userId, ua) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SECURITY", "New sign-in to your account", `A session was opened via Google from "${ua}". If this wasn't you, revoke the session from your Identity Security Center.`);
}
}),
"[project]/src/app/api/v1/auth/google/link/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// POST /api/v1/auth/google/link — explicit account linking (the LINK_REQUIRED
// continuation): requires an authenticated platform session (the user proved
// account ownership with their password) + a still-GRANTED google session.
// The Google identity is bound to THE CALLER's account — an identifier that
// belongs to another account is refused (never a silent merge).
__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/session.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$google$2d$auth$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/google-auth-service.ts [app-route] (ecmascript)");
;
;
;
;
const LinkSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    googleSessionId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(10).max(64)
});
async function POST(req) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSessionUser"])(req);
    if (!user) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(401, "UNAUTHENTICATED", "Sign in with your password first to link Google.", requestId);
    }
    const rl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clientKey"])(req, "google-link"), 10, 60_000);
    if (!rl.allowed) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(429, "RATE_LIMITED", "Too many attempts. Please wait a minute.", requestId);
    }
    let body;
    try {
        body = await req.json();
    } catch  {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
    }
    const parsed = LinkSchema.safeParse(body);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
    }
    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$google$2d$auth$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["confirmGoogleLink"])(user.id, parsed.data.googleSessionId, requestId);
    if (!result.ok) {
        const map = {
            SESSION_NOT_FOUND: {
                status: 404,
                message: "Unknown Google sign-in session. Start again."
            },
            NOT_GRANTED: {
                status: 409,
                message: "The Google sign-in was not granted."
            },
            EXPIRED: {
                status: 410,
                message: "The Google sign-in expired. Start again."
            },
            NOT_ACTIVE: {
                status: 403,
                message: "This account is not active."
            },
            ALREADY_LINKED_TO_OTHER: {
                status: 409,
                message: "That Google account is already linked to a different TrustScore account."
            },
            ALREADY_LINKED: {
                status: 409,
                message: "Google is already linked to your account."
            }
        };
        const fail = map[result.code];
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(fail.status, result.code, fail.message, requestId);
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
        linked: true,
        requestId
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__958a59e2._.js.map