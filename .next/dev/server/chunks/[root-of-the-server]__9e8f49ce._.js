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
"[project]/src/lib/services/identity-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ASSURANCE_LADDER",
    ()=>ASSURANCE_LADDER,
    "IdentityProviderError",
    ()=>IdentityProviderError,
    "ScopeValidationError",
    ()=>ScopeValidationError,
    "applyConsentDecision",
    ()=>applyConsentDecision,
    "completeCallback",
    ()=>completeCallback,
    "computeAssuranceLadder",
    ()=>computeAssuranceLadder,
    "consentScreen",
    ()=>consentScreen,
    "createVerificationSession",
    ()=>createVerificationSession,
    "getIdentityForUser",
    ()=>getIdentityForUser,
    "getSessionForUser",
    ()=>getSessionForUser,
    "recordEvent",
    ()=>recordEvent,
    "resolveRequestedScopes",
    ()=>resolveRequestedScopes,
    "shapeIdentity",
    ()=>shapeIdentity,
    "withdrawConsent",
    ()=>withdrawConsent
]);
// TrustScore Stage 2 — IdentityService (directive §28 service separation).
// Verification session lifecycle: create → consent (mock NINAuth app) →
// callback (code + PKCE exchange + ID token validation) → TrustIdentity.
// Everything consent-scoped, redacted, audited. No raw identifiers anywhere.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/ninauth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/notification-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/trustscore-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/transport.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/provider-posture.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
const TERMINAL_STATUSES = new Set([
    "COMPLETED",
    "FAILED",
    "CONSENT_DENIED",
    "EXPIRED"
]);
class IdentityProviderError extends Error {
    transportCode;
    constructor(transportCode, message){
        super(message), this.transportCode = transportCode;
        this.name = "IdentityProviderError";
    }
}
function ninauthLabels(posture) {
    return {
        providerName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerNameFor"])("ninauth", posture),
        providerMode: posture === "mock" ? "MOCK" : "LIVE"
    };
}
async function transportFailure(err) {
    throw new IdentityProviderError(err.code, `The NINAuth provider transport failed (${err.code}: ${err.detail}). Nothing was written — try again when the provider recovers.`);
}
const ASSURANCE_LADDER = [
    {
        level: 1,
        key: "government",
        title: "Government identity",
        detail: "NINAuth-verified record with masked reference and 90-day freshness",
        stage: "Live now"
    },
    {
        level: 2,
        key: "phone",
        title: "Verified phone",
        detail: "Phone number bound via OTP to the same identity — stored as a fingerprint only",
        stage: "Live now"
    },
    {
        level: 3,
        key: "biometric",
        title: "Biometric liveness",
        detail: "Selfie liveness check consistent with the government record",
        stage: "Live now"
    },
    {
        level: 4,
        key: "cross_signal",
        title: "Cross-signal consistency",
        detail: "All verified signals agree — no SIM-swap flags, face match holds, freshness intact",
        stage: "Live now"
    }
];
function computeAssuranceLadder(input) {
    const hasPhone = input.activeIdentifierTypes.includes("PHONE");
    const hasBiometric = input.activeIdentifierTypes.includes("BIOMETRIC");
    const l2 = input.identityVerified && hasPhone;
    const l3 = l2 && hasBiometric;
    const l4 = l3 && (input.crossSignalConsistent ?? false);
    return ASSURANCE_LADDER.map((r)=>({
            ...r,
            achieved: r.level === 1 ? input.identityVerified : r.level === 2 ? l2 : r.level === 3 ? l3 : l4
        }));
}
function resolveRequestedScopes(requested) {
    if (!requested?.length) return {
        scopes: [
            ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_SCOPES"]
        ],
        rejected: []
    };
    const set = new Set(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CORE_SCOPES"]);
    const rejected = [];
    for (const s of requested){
        if (__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SCOPE_CATALOG"][s] && !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CORE_SCOPES"].includes(s)) set.add(s);
        else if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SCOPE_CATALOG"][s]) rejected.push(s);
    }
    return {
        scopes: [
            ...set
        ],
        rejected
    };
}
async function createVerificationSession(userId, input, requestId) {
    const { scopes, rejected } = resolveRequestedScopes(input.scopes);
    if (rejected.length > 0) {
        throw new ScopeValidationError(rejected);
    }
    const purpose = input.purpose ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PURPOSE"];
    const { verifier, challenge } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generatePkce"])();
    const state = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateState"])();
    const shareCode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateShareCode"])();
    // Stage 13 — loopback posture: register the session with the provider over
    // the REAL transport (signed, timed out, retried, circuit-brokened) BEFORE
    // anything is written. A transport failure leaves zero rows behind.
    const posture = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    const labels = ninauthLabels(posture);
    let authorizationUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["authorizationUrlFor"])(state, challenge);
    if (posture === "loopback") {
        try {
            const { data } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerCall"])("ninauth", "/v1/ninauth/session", {
                clientId: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NINAUTH_CLIENT_ID"],
                state,
                codeChallenge: challenge,
                scopes: scopes.join(" ")
            });
            authorizationUrl = data.authorizeUrl ?? authorizationUrl;
        } catch (err) {
            if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ProviderTransportError"]) await transportFailure(err);
            throw err;
        }
    }
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.create({
        data: {
            userId,
            provider: labels.providerName,
            providerMode: labels.providerMode,
            flow: input.flow === "SHARE_CODE" ? "SHARE_CODE" : "QR",
            status: "AWAITING_CONSENT",
            state,
            codeVerifier: verifier,
            codeChallenge: challenge,
            scopes: JSON.stringify(scopes),
            purpose,
            policyVersion: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CONSENT_POLICY_VERSION"],
            shareCode,
            authorizationUrl,
            expiresAt: new Date(Date.now() + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SESSION_TTL_MS"])
        }
    });
    await recordEvent(session.id, "SESSION_CREATED", {
        flow: session.flow,
        scope: scopes.join(" ")
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "IDENTITY_SESSION_CREATED",
        subjectType: "VerificationSession",
        subjectId: session.id,
        requestId,
        metadata: {
            scope: posture === "mock" ? "ninauth_mock" : "ninauth_loopback",
            outcome: "created",
            posture
        }
    });
    return session;
}
class ScopeValidationError extends Error {
    rejected;
    constructor(rejected){
        super("scope_invalid"), this.rejected = rejected;
        this.name = "ScopeValidationError";
    }
}
async function getSessionForUser(userId, sessionId) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.findUnique({
        where: {
            id: sessionId
        },
        include: {
            events: {
                orderBy: {
                    createdAt: "asc"
                }
            }
        }
    });
    if (!session || session.userId !== userId) return null;
    // Lazy expiry: a non-terminal session past its TTL becomes EXPIRED.
    if (!TERMINAL_STATUSES.has(session.status) && session.expiresAt.getTime() < Date.now()) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.update({
            where: {
                id: session.id
            },
            data: {
                status: "EXPIRED",
                errorReason: "session_ttl"
            }
        });
        await recordEvent(session.id, "SESSION_EXPIRED", {
            reason: "ttl"
        });
        session.status = "EXPIRED";
        session.errorReason = "session_ttl";
    }
    return session;
}
async function applyConsentDecision(userId, sessionId, decision, requestId, grantedScopes) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.findUnique({
        where: {
            id: sessionId
        }
    });
    if (!session || session.userId !== userId) {
        return {
            ok: false,
            code: "SESSION_NOT_FOUND"
        };
    }
    // Idempotent re-deny on an already-denied session is acknowledged…
    if (session.status === "CONSENT_DENIED" && decision === "DENY") {
        return {
            ok: false,
            code: "DENIED"
        };
    }
    // …but a GRANT on a terminal session is never allowed.
    if (session.status !== "AWAITING_CONSENT") {
        return {
            ok: false,
            code: "NOT_PENDING"
        };
    }
    if (session.expiresAt.getTime() < Date.now()) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.update({
            where: {
                id: session.id
            },
            data: {
                status: "EXPIRED",
                errorReason: "session_ttl"
            }
        });
        await recordEvent(session.id, "SESSION_EXPIRED", {
            reason: "ttl"
        });
        return {
            ok: false,
            code: "EXPIRED"
        };
    }
    if (decision === "DENY") {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.update({
            where: {
                id: session.id
            },
            data: {
                status: "CONSENT_DENIED",
                completedAt: new Date()
            }
        });
        await recordEvent(session.id, "CONSENT_DENIED", {
            reason: "user_denied"
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: userId,
            action: "IDENTITY_CONSENT_DENIED",
            subjectType: "VerificationSession",
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
    // Stage 3 — granular consent: the user approves a SUBSET of the requested
    // scopes. Core scopes are mandatory; optional scopes are opt-in. The
    // session binds the granted set; token + attributes follow exactly it.
    const requested = JSON.parse(session.scopes);
    let finalScopes = requested;
    if (grantedScopes) {
        const valid = grantedScopes.every((s)=>requested.includes(s)) && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CORE_SCOPES"].every((c)=>grantedScopes.includes(c));
        if (!valid) {
            return {
                ok: false,
                code: "SCOPE_INVALID"
            };
        }
        finalScopes = grantedScopes;
    }
    // GRANT: the NINAuth side issues a one-time authorization code (60s TTL).
    // Stage 13 — in loopback posture the code is issued by the provider over the
    // REAL transport (signed call, retries, circuit breaker); in mock posture
    // it is issued in-process exactly as before. Either way we store only the
    // timing-safe hash + expiry.
    let code;
    let codeExpiresAt;
    const posture = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    if (posture === "loopback") {
        try {
            const { data } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerCall"])("ninauth", "/v1/ninauth/authorize", {
                state: session.state,
                maskedSubject: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["maskedSubjectFor"])(userId)
            });
            code = data.code;
            codeExpiresAt = new Date(Date.now() + (data.expiresInSec ?? 60) * 1000);
        } catch (err) {
            if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ProviderTransportError"]) {
                // Honest failure — nothing was written; the session stays AWAITING_CONSENT.
                await recordEvent(session.id, "CONSENT_PROVIDER_UNAVAILABLE", {
                    reason: err.code
                });
                return {
                    ok: false,
                    code: "PROVIDER_UNAVAILABLE"
                };
            }
            throw err;
        }
    } else {
        const issued = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["issueAuthorizationCode"])();
        code = issued.code;
        codeExpiresAt = issued.expiresAt;
    }
    const codeHash = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashCode"])(code);
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.update({
        where: {
            id: session.id
        },
        data: {
            status: "CONSENT_GRANTED",
            scopes: JSON.stringify(finalScopes),
            authorizationCodeHash: codeHash,
            authorizationCodeExp: codeExpiresAt
        }
    });
    await recordEvent(session.id, "CONSENT_GRANTED", {
        scope: finalScopes.join(" "),
        policyVersion: session.policyVersion
    });
    await recordEvent(session.id, "CODE_ISSUED", {
        reason: "one_time_60s",
        posture
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "IDENTITY_CONSENT_GRANTED",
        subjectType: "VerificationSession",
        subjectId: session.id,
        requestId,
        metadata: {
            outcome: "granted",
            scope: posture === "mock" ? "ninauth_mock" : "ninauth_loopback",
            scopes: finalScopes.length
        }
    });
    return {
        ok: true,
        code,
        state: session.state,
        grantedScopes: finalScopes
    };
}
async function completeCallback(userId, sessionId, input, requestId) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.findUnique({
        where: {
            id: sessionId
        }
    });
    if (!session || session.userId !== userId) {
        return {
            ok: false,
            code: "SESSION_NOT_FOUND"
        };
    }
    // State must match exactly (anti-CSRF). Also rejects replayed callbacks on
    // completed sessions because the stored state row is already terminal.
    if (session.state !== input.state) {
        await failSession(session.id, "state_mismatch", userId, requestId);
        return {
            ok: false,
            code: "BAD_STATE"
        };
    }
    if (session.status === "COMPLETED") {
        return {
            ok: false,
            code: "CODE_REUSED"
        };
    }
    if (session.status !== "CONSENT_GRANTED" || !session.authorizationCodeHash) {
        return {
            ok: false,
            code: "NOT_GRANTED"
        };
    }
    // Code must match the stored hash (timing-safe).
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["codeMatches"])(session.authorizationCodeHash, input.code)) {
        await failSession(session.id, "code_mismatch", userId, requestId);
        return {
            ok: false,
            code: "EXCHANGE_FAILED",
            reason: "code"
        };
    }
    // Token exchange (PKCE verified inside) + ID token validation.
    // Stage 13 — loopback: the exchange happens over the REAL transport against
    // the provider simulator; the returned ID token is validated against the
    // loopback trust config (same signature/issuer/audience/exp/nonce checks).
    // Mock: the in-process exchange exactly as before. Everything downstream —
    // consent record, TrustIdentity, evidence, identifiers, attributes — is
    // posture-independent: the claims are the provider's, never ours to invent.
    const scopes = JSON.parse(session.scopes);
    const posture = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    const labels = ninauthLabels(posture);
    let idToken;
    try {
        if (posture === "loopback") {
            const { data } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerCall"])("ninauth", "/v1/ninauth/token", {
                code: input.code,
                codeVerifier: session.codeVerifier,
                nonce: session.state,
                clientId: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NINAUTH_CLIENT_ID"]
            });
            idToken = data.id_token;
        } else {
            const profileClaims = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mockProfileFor"])(userId);
            const tokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mockTokenExchange"])({
                code: input.code,
                storedCodeHash: session.authorizationCodeHash,
                codeExpiresAt: session.authorizationCodeExp ?? new Date(0),
                codeVerifier: session.codeVerifier,
                codeChallenge: session.codeChallenge,
                nonce: session.state,
                maskedSubject: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["maskedSubjectFor"])(userId),
                scopes,
                profile: profileClaims
            });
            idToken = tokens.id_token;
        }
    } catch (err) {
        if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ProviderTransportError"]) {
            await failSession(session.id, `transport_${err.code}`, userId, requestId);
            return {
                ok: false,
                code: "EXCHANGE_FAILED",
                reason: `transport_${err.code}`
            };
        }
        const reason = err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TokenValidationError"] ? err.code : "exchange_error";
        await failSession(session.id, reason, userId, requestId);
        return {
            ok: false,
            code: "EXCHANGE_FAILED",
            reason
        };
    }
    await recordEvent(session.id, "CODE_EXCHANGED", {
        reason: posture === "loopback" ? "pkce_ok_provider_transport" : "pkce_ok"
    });
    let claims;
    try {
        claims = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateIdToken"])(idToken, session.state, posture === "loopback" ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LOOPBACK_TRUST"] : undefined);
    } catch (err) {
        const reason = err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TokenValidationError"] ? err.code : "validation_error";
        await failSession(session.id, `token_${reason}`, userId, requestId);
        return {
            ok: false,
            code: "TOKEN_INVALID",
            reason
        };
    }
    await recordEvent(session.id, "TOKEN_VALIDATED", {
        reason: "signature_iss_aud_exp_nonce"
    });
    // Consent record (directive §31): who / why / what / when / provider / policy.
    const consent = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.create({
        data: {
            userId,
            sessionId: session.id,
            requester: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["REQUESTER"],
            purpose: session.purpose,
            scopes: session.scopes,
            policyVersion: session.policyVersion
        }
    });
    // TrustIdentity: evidence + masked reference only, with a freshness horizon.
    const now = new Date();
    const expiresAt = new Date(now.getTime() + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["IDENTITY_FRESHNESS_DAYS"] * 24 * 60 * 60 * 1000);
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.upsert({
        where: {
            userId
        },
        create: {
            userId,
            status: "VERIFIED",
            assuranceLevel: 1,
            provider: labels.providerName,
            providerMode: labels.providerMode,
            providerIdentityRef: claims.sub,
            establishingConsentId: consent.id,
            verifiedAt: now,
            expiresAt
        },
        update: {
            status: "VERIFIED",
            assuranceLevel: 1,
            provider: labels.providerName,
            providerMode: labels.providerMode,
            providerIdentityRef: claims.sub,
            establishingConsentId: consent.id,
            verifiedAt: now,
            expiresAt
        }
    });
    // Stage 3 — Evidence record: provenance chain (session + consent + provider)
    // with confidence and freshness. Redacted summary — no PII (directive §38).
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].evidence.create({
        data: {
            userId,
            trustIdentityId: identity.id,
            sessionId: session.id,
            consentId: consent.id,
            type: "NINAUTH_ID_TOKEN",
            provider: labels.providerName,
            providerMode: labels.providerMode,
            summary: posture === "loopback" ? "Government identity verified via NINAuth ID token over the sandbox loopback transport (HMAC-signed calls; signature, issuer, audience, nonce validated)." : "Government identity verified via NINAuth ID token (signature, issuer, audience, nonce validated).",
            confidence: 100,
            status: "ACTIVE",
            collectedAt: now,
            expiresAt
        }
    });
    // Stage 3 — Hashed identifier fingerprint (never a raw identifier).
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].identityIdentifier.upsert({
        where: {
            trustIdentityId_type: {
                trustIdentityId: identity.id,
                type: "NIN_FINGERPRINT"
            }
        },
        create: {
            trustIdentityId: identity.id,
            type: "NIN_FINGERPRINT",
            hash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["identifierFingerprint"])(claims.sub),
            hint: "Government ID · NINAuth subject (masked)",
            status: "ACTIVE",
            verifiedAt: now,
            expiresAt,
            consentId: consent.id
        },
        update: {
            hash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["identifierFingerprint"])(claims.sub),
            status: "ACTIVE",
            verifiedAt: now,
            expiresAt,
            consentId: consent.id
        }
    });
    // Stage 3 — Consent-scoped identity attributes: only for granted profile
    // scopes; each carries the consent as provenance so withdrawal revokes it.
    const attributeKeys = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["attributeKeysForScopes"])(scopes);
    for (const key of attributeKeys){
        const value = claims.profile?.[key];
        if (!value) continue;
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].identityAttribute.upsert({
            where: {
                trustIdentityId_key: {
                    trustIdentityId: identity.id,
                    key
                }
            },
            create: {
                trustIdentityId: identity.id,
                key,
                value,
                scope: key === "given_name" || key === "family_name" ? "profile.name" : "profile.demographics",
                consentId: consent.id,
                status: "ACTIVE",
                source: labels.providerName,
                assertedAt: now,
                expiresAt
            },
            update: {
                value,
                scope: key === "given_name" || key === "family_name" ? "profile.name" : "profile.demographics",
                consentId: consent.id,
                status: "ACTIVE",
                source: labels.providerName,
                assertedAt: now,
                expiresAt
            }
        });
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.update({
        where: {
            id: session.id
        },
        data: {
            status: "COMPLETED",
            completedAt: now,
            consentId: consent.id
        }
    });
    const attributeCount = attributeKeys.length;
    await recordEvent(session.id, "IDENTITY_VERIFIED", {
        scope: "level_1_government",
        policyVersion: session.policyVersion,
        attributes: attributeCount
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "IDENTITY_VERIFIED",
        subjectType: "TrustIdentity",
        subjectId: identity.id,
        requestId,
        metadata: {
            outcome: "level_1",
            scope: posture === "mock" ? "ninauth_mock" : "ninauth_loopback",
            posture,
            attributes: attributeCount
        }
    });
    const providerLabel = posture === "mock" ? "mock provider" : "sandbox loopback transport";
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "VERIFICATION", "Trust Identity established", attributeCount > 0 ? `Your government identity was verified through NINAuth (${providerLabel}). Assurance Level 1, valid for 90 days — ${attributeCount} consent-scoped attributes added to your profile.` : `Your government identity was verified through NINAuth (${providerLabel}). Assurance Level 1, valid for 90 days. A consent record has been added to your history.`);
    // Stage 5: material change — recompute the TrustScore snapshot + sync
    // credentials so the passport reflects the new identity immediately.
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markMaterialChange"])(userId, "IDENTITY_VERIFIED");
    return {
        ok: true,
        identity: shapeIdentity(identity)
    };
}
async function failSession(sessionId, reason, userId, requestId) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.update({
        where: {
            id: sessionId
        },
        data: {
            status: "FAILED",
            errorReason: reason,
            completedAt: new Date()
        }
    });
    await recordEvent(sessionId, "SESSION_FAILED", {
        reason
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "IDENTITY_SESSION_FAILED",
        subjectType: "VerificationSession",
        subjectId: sessionId,
        requestId,
        metadata: {
            reason
        }
    });
}
async function withdrawConsent(userId, consentId, requestId) {
    const consent = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.findUnique({
        where: {
            id: consentId
        }
    });
    if (!consent || consent.userId !== userId) {
        return {
            ok: false,
            code: "NOT_FOUND"
        };
    }
    if (consent.withdrawnAt) {
        return {
            ok: false,
            code: "ALREADY_WITHDRAWN"
        };
    }
    const now = new Date();
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.update({
        where: {
            id: consent.id
        },
        data: {
            withdrawnAt: now
        }
    });
    // Revoke attributes sourced from this consent.
    const revokedAttrs = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].identityAttribute.updateMany({
        where: {
            consentId: consent.id,
            status: "ACTIVE"
        },
        data: {
            status: "REVOKED"
        }
    });
    // Stage 4 — revoke identifiers SOURCED from this consent (phone / biometric
    // signal bindings). Withdrawing the signal consent unbinds the signal and
    // de-escalates the ladder — the identifier never outlives its consent.
    const revokedIdentifiers = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].identityIdentifier.updateMany({
        where: {
            consentId: consent.id,
            status: "ACTIVE"
        },
        data: {
            status: "REVOKED"
        }
    });
    // If this consent established the current TrustIdentity, revoke the spine.
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
        where: {
            userId
        }
    });
    let identityRevoked = false;
    if (identity && identity.establishingConsentId === consent.id && identity.status !== "REVOKED") {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.update({
            where: {
                id: identity.id
            },
            data: {
                status: "REVOKED",
                assuranceLevel: 0,
                updatedAt: now
            }
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].identityIdentifier.updateMany({
            where: {
                trustIdentityId: identity.id,
                status: "ACTIVE"
            },
            data: {
                status: "REVOKED"
            }
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].evidence.updateMany({
            where: {
                trustIdentityId: identity.id,
                status: "ACTIVE"
            },
            data: {
                status: "REVOKED"
            }
        });
        identityRevoked = true;
    } else {
        // Non-establishing consent: revoke its own evidence records.
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].evidence.updateMany({
            where: {
                consentId: consent.id,
                status: "ACTIVE"
            },
            data: {
                status: "REVOKED"
            }
        });
        // De-escalate the ladder for the surviving identity (Stage 4).
        if (identity && identity.status !== "REVOKED") {
            const { recomputeAssuranceLevel } = await __turbopack_context__.A("[project]/src/lib/services/signal-service.ts [app-route] (ecmascript, async loader)");
            await recomputeAssuranceLevel(userId);
        }
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "IDENTITY_CONSENT_WITHDRAWN",
        subjectType: "Consent",
        subjectId: consent.id,
        requestId,
        metadata: {
            outcome: "withdrawn",
            revokedAttributes: revokedAttrs.count,
            revokedIdentifiers: revokedIdentifiers.count,
            identityRevoked
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SECURITY", "Consent withdrawn", identityRevoked ? `You withdrew the consent that established your Trust Identity. Your identity, its identifiers, attributes and evidence have been revoked. You can re-verify anytime.` : `You withdrew a consent. ${revokedAttrs.count + revokedIdentifiers.count} bound item${revokedAttrs.count + revokedIdentifiers.count === 1 ? "" : "s"} (attributes / signals) sourced from it ${revokedAttrs.count + revokedIdentifiers.count === 1 ? "was" : "were"} revoked.`);
    // Stage 5: material change — the read model moved (attributes/identifiers
    // revoked); recompute the snapshot and let credentials lapse with sources.
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markMaterialChange"])(userId, "CONSENT_WITHDRAWN");
    return {
        ok: true,
        revokedAttributes: revokedAttrs.count,
        revokedIdentifiers: revokedIdentifiers.count,
        identityRevoked
    };
}
function shapeIdentity(identity, statusOverride) {
    return {
        status: statusOverride ?? identity.status,
        assuranceLevel: identity.assuranceLevel,
        provider: identity.provider,
        providerMode: identity.providerMode,
        providerIdentityRef: identity.providerIdentityRef,
        verifiedAt: identity.verifiedAt?.toISOString() ?? null,
        expiresAt: identity.expiresAt?.toISOString() ?? null,
        createdAt: identity.createdAt.toISOString()
    };
}
async function getIdentityForUser(userId, crossSignal) {
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
        where: {
            userId
        },
        include: {
            identifiers: {
                orderBy: {
                    verifiedAt: "desc"
                }
            },
            attributes: {
                orderBy: {
                    key: "asc"
                }
            },
            evidence: {
                orderBy: {
                    collectedAt: "desc"
                },
                take: 10
            }
        }
    });
    const consents = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.findMany({
        where: {
            userId
        },
        orderBy: {
            grantedAt: "desc"
        },
        take: 5,
        select: {
            id: true,
            requester: true,
            purpose: true,
            scopes: true,
            policyVersion: true,
            grantedAt: true,
            withdrawnAt: true
        }
    });
    const lastSession = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationSession.findFirst({
        where: {
            userId
        },
        orderBy: {
            createdAt: "desc"
        },
        select: {
            id: true,
            status: true,
            provider: true,
            providerMode: true,
            flow: true,
            createdAt: true,
            events: {
                orderBy: {
                    createdAt: "asc"
                },
                select: {
                    id: true,
                    eventType: true,
                    createdAt: true
                }
            }
        }
    });
    // Lazy freshness: an identity past its horizon reads as EXPIRED (L1 lost
    // until re-verification) — the read model stays honest without a cron job.
    const isStale = identity !== null && identity.status === "VERIFIED" && identity.expiresAt !== null && identity.expiresAt.getTime() < Date.now();
    const activeIdentifierTypes = (identity?.identifiers ?? []).filter((i)=>i.status === "ACTIVE" && (i.expiresAt?.getTime() ?? Infinity) > Date.now()).map((i)=>i.type);
    const ladder = computeAssuranceLadder({
        identityVerified: identity?.status === "VERIFIED" && !isStale,
        activeIdentifierTypes,
        crossSignalConsistent: crossSignal?.consistent ?? false
    });
    return {
        identity: identity ? shapeIdentity(identity, isStale ? "EXPIRED" : undefined) : {
            status: "NONE",
            assuranceLevel: 0,
            provider: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NINAUTH_PROVIDER_NAME"],
            providerMode: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NINAUTH_MODE"],
            providerIdentityRef: null,
            verifiedAt: null,
            expiresAt: null,
            createdAt: new Date().toISOString()
        },
        ladder,
        identifiers: (identity?.identifiers ?? []).map((i)=>({
                id: i.id,
                type: i.type,
                hint: i.hint,
                status: i.status,
                verifiedAt: i.verifiedAt.toISOString(),
                expiresAt: i.expiresAt?.toISOString() ?? null,
                hashPrefix: `${i.hash.slice(0, 8)}…`
            })),
        attributes: (identity?.attributes ?? []).map((a)=>({
                id: a.id,
                key: a.key,
                value: a.status === "ACTIVE" ? a.value : "—",
                scope: a.scope,
                status: a.status,
                source: a.source,
                assertedAt: a.assertedAt.toISOString(),
                expiresAt: a.expiresAt?.toISOString() ?? null,
                consentId: a.consentId
            })),
        evidence: (identity?.evidence ?? []).map((e)=>({
                id: e.id,
                type: e.type,
                provider: e.provider,
                providerMode: e.providerMode,
                summary: e.summary,
                confidence: e.confidence,
                status: e.status,
                collectedAt: e.collectedAt.toISOString(),
                expiresAt: e.expiresAt?.toISOString() ?? null
            })),
        consents: consents.map((c)=>({
                ...c,
                scopes: JSON.parse(c.scopes),
                grantedAt: c.grantedAt.toISOString(),
                withdrawnAt: c.withdrawnAt?.toISOString() ?? null
            })),
        lastSession: lastSession ? {
            ...lastSession,
            createdAt: lastSession.createdAt.toISOString(),
            events: lastSession.events.map((e)=>({
                    ...e,
                    createdAt: e.createdAt.toISOString()
                }))
        } : null
    };
}
async function recordEvent(sessionId, eventType, detail) {
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].verificationEvent.create({
            data: {
                sessionId,
                eventType,
                detail: detail ? JSON.stringify(detail) : null
            }
        });
    } catch (err) {
        console.error("[identity] event record failed:", err.message);
    }
}
function consentScreen(scopes) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["consentScreenFor"])(scopes);
}
}),
"[project]/src/app/api/v1/identity/sessions/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// POST /api/v1/identity/sessions — create a NINAuth verification session
// (Stage 2, contract-first MOCK provider). Auth required, rate-limited.
__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/session.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$identity$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/identity-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/ninauth.ts [app-route] (ecmascript)");
;
;
;
;
;
const CreateSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    purpose: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(120).optional(),
    scopes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(64)).max(8).optional(),
    flow: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "QR",
        "SHARE_CODE"
    ]).optional()
});
async function POST(req) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSessionUser"])(req);
    if (!user) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(401, "UNAUTHENTICATED", "No active session.", requestId);
    }
    const rl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clientKey"])(req, "identity-session"), 5, 60_000);
    if (!rl.allowed) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(429, "RATE_LIMITED", "Too many verification attempts. Please wait a minute.", requestId);
    }
    let body = {};
    try {
        const text = await req.text();
        if (text) body = JSON.parse(text);
    } catch  {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
    }
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
    }
    let session;
    try {
        session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$identity$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createVerificationSession"])(user.id, parsed.data, requestId);
    } catch (err) {
        if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$identity$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ScopeValidationError"]) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(422, "SCOPE_INVALID", `Unknown scope(s): ${err.rejected.join(", ")}.`, requestId);
        }
        if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$identity$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["IdentityProviderError"]) {
            // Stage 13 — honest provider-transport failure (circuit open, timeouts,
            // retries exhausted). Nothing was written.
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(503, "PROVIDER_UNAVAILABLE", err.message, requestId);
        }
        throw err;
    }
    const scopes = JSON.parse(session.scopes);
    const consent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$identity$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["consentScreen"])(scopes);
    // Stage 13 — posture-aware honesty: the consent screen's provider labels
    // must match the transport that will actually answer (MOCK or LOOPBACK).
    consent.provider = session.provider;
    consent.mode = session.providerMode;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
        session: {
            id: session.id,
            status: session.status,
            provider: session.provider,
            providerMode: session.providerMode,
            flow: session.flow,
            shareCode: session.shareCode,
            authorizationUrl: session.authorizationUrl,
            scopes,
            purpose: session.purpose,
            expiresAt: session.expiresAt.toISOString(),
            createdAt: session.createdAt.toISOString(),
            ttlMs: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SESSION_TTL_MS"]
        },
        consent
    }, 201);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__9e8f49ce._.js.map