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
    "provider",
    // Batch 2 (G7) — the blocking holder's TrustIdentity cuid (not a user id,
    // not PII) so duplicate-block forensics can trace which claim won.
    "holderIdentity",
    // Batch 2 (G8) — masked RC display hint ("RC 1•••45" — non-reconstructable)
    "rcHint"
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
"[project]/src/lib/services/account-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// TrustScore Stage 1 — AccountService (directive §28 service separation).
// Registration, login, session lifecycle. All input validation is zod-based at
// the route layer; this service assumes validated input.
__turbopack_context__.s([
    "authenticateUser",
    ()=>authenticateUser,
    "getUserById",
    ()=>getUserById,
    "recentAuditForUser",
    ()=>recentAuditForUser,
    "registerUser",
    ()=>registerUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/notification-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/auth-identifier-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth/identifiers.ts [app-route] (ecmascript)");
;
;
;
;
;
;
async function registerUser(input, requestId) {
    const handle = input.handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle) || __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RESERVED_USERNAMES"].has(handle)) return {
        ok: false,
        code: "HANDLE_INVALID"
    };
    const email = input.email?.trim().toLowerCase() || undefined;
    if (email && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeEmail"])(email)) return {
        ok: false,
        code: "EMAIL_INVALID"
    };
    if (email) {
        const existingEmail = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
            where: {
                email
            },
            select: {
                id: true
            }
        });
        if (existingEmail) return {
            ok: false,
            code: "EMAIL_TAKEN"
        };
        const identEmail = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findUnique({
            where: {
                type_value: {
                    type: "EMAIL",
                    value: email
                }
            },
            select: {
                id: true
            }
        });
        if (identEmail) return {
            ok: false,
            code: "EMAIL_TAKEN"
        };
    }
    const existingHandle = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            handle
        },
        select: {
            id: true
        }
    });
    if (existingHandle) return {
        ok: false,
        code: "HANDLE_TAKEN"
    };
    const identHandle = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findUnique({
        where: {
            type_value: {
                type: "USERNAME",
                value: handle
            }
        },
        select: {
            id: true
        }
    });
    if (identHandle) return {
        ok: false,
        code: "HANDLE_TAKEN"
    };
    const { hash, salt } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashPassword"])(input.password);
    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.create({
        data: {
            email: email ?? null,
            passwordHash: hash,
            passwordSalt: salt,
            displayName: input.displayName,
            handle,
            status: "ACTIVE"
        }
    });
    // Register the auth identifiers (canonical registry, design D1).
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(user.id, "USERNAME", handle, {
        verified: true,
        requestId,
        makePrimary: !email,
        syncAccount: true
    });
    if (email) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(user.id, "EMAIL", email, {
            verified: false,
            requestId,
            makePrimary: true,
            syncAccount: true
        });
    }
    const notif = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["welcomeNotification"])(input.displayName);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(user.id, "SYSTEM", notif.title, notif.body);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: user.id,
        action: "AUTH_REGISTER",
        subjectType: "UserAccount",
        subjectId: user.id,
        requestId,
        metadata: {
            outcome: "created",
            withEmail: !!email
        }
    });
    return {
        ok: true,
        userId: user.id
    };
}
async function authenticateUser(input, requestId, req) {
    // Unified identifier (username | email | phone). Phone-shaped input is
    // routed to the OTP flow — the decision is SHAPE-based, never
    // existence-based (enumeration safety).
    const raw = input.identifier?.trim() || input.email?.trim() || "";
    const type = raw ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["detectIdentifierType"])(raw) : null;
    if (type === "PHONE") {
        return {
            ok: false,
            code: "PHONE_OTP_REQUIRED"
        };
    }
    const lookupType = type === "EMAIL" ? "EMAIL" : "USERNAME";
    let value = lookupType === "EMAIL" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeEmail"])(raw) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeUsername"])(raw);
    // Lenient fallback: legacy handles that fail the strict username rules
    // (e.g. reserved list) still attempt a direct lookup.
    if (!value && raw) value = raw.toLowerCase() || null;
    let user = null;
    if (value) {
        const resolved = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolveIdentifier"])(lookupType, value);
        if (resolved.ok) {
            user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
                where: {
                    id: resolved.userId
                }
            });
        }
    }
    const valid = user ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyPassword"])(input.password, user.passwordSalt, user.passwordHash) : false;
    if (!user || !valid) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "ANONYMOUS",
            action: "AUTH_LOGIN_FAILED",
            requestId,
            // identifier TYPE only — never the value (enumeration resistance)
            metadata: {
                outcome: "invalid_credentials",
                identifierType: type ?? "unknown"
            }
        });
        return {
            ok: false,
            code: "INVALID_CREDENTIALS"
        };
    }
    if (user.status !== "ACTIVE") {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "ANONYMOUS",
            action: "AUTH_LOGIN_FAILED",
            requestId,
            metadata: {
                outcome: "account_not_active"
            }
        });
        return {
            ok: false,
            code: "INVALID_CREDENTIALS"
        };
    }
    // Sync the registry (legacy rows) + touch lastUsedAt.
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(user.id, "USERNAME", user.handle, {
        verified: true,
        requestId,
        makePrimary: !user.email,
        syncAccount: true
    }).catch(()=>undefined);
    if (user.email) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(user.id, "EMAIL", user.email, {
            verified: false,
            requestId,
            makePrimary: true,
            syncAccount: true
        }).catch(()=>undefined);
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: user.id,
        action: "AUTH_LOGIN",
        subjectType: "UserAccount",
        subjectId: user.id,
        requestId,
        metadata: {
            outcome: "login",
            identifierType: lookupType
        }
    });
    void req; // reserved for future device binding
    return {
        ok: true,
        userId: user.id
    };
}
async function getUserById(userId) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            id: userId
        },
        select: {
            id: true,
            email: true,
            displayName: true,
            handle: true,
            status: true,
            role: true,
            createdAt: true
        }
    });
}
async function recentAuditForUser(userId, limit = 10) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].auditEvent.findMany({
        where: {
            actorId: userId,
            OR: [
                {
                    action: {
                        startsWith: "AUTH_"
                    }
                },
                {
                    action: {
                        startsWith: "IDENTITY_"
                    }
                },
                {
                    action: {
                        startsWith: "SIGNAL_"
                    }
                },
                // Stage 5 — Trust Passport surfaces in the same audit feed
                {
                    action: {
                        startsWith: "SHARE_"
                    }
                },
                {
                    action: {
                        startsWith: "CREDENTIAL_"
                    }
                },
                {
                    action: {
                        startsWith: "DSR_"
                    }
                },
                {
                    action: {
                        startsWith: "SESSION_"
                    }
                },
                {
                    action: "SCORE_SNAPSHOT"
                },
                // Stage 6 — Safety Check + Trust Requests
                {
                    action: {
                        startsWith: "SAFETY_"
                    }
                },
                {
                    action: {
                        startsWith: "TRUST_REQUEST"
                    }
                },
                // Stage 7 — Reputation (own actions only; subject-linkage events surface
                // in the Security Center timeline)
                {
                    action: {
                        startsWith: "FLAG_"
                    }
                },
                {
                    action: {
                        startsWith: "APPEAL_"
                    }
                },
                // Stage 8 — Trust Engine administration (own actions)
                {
                    action: {
                        startsWith: "POLICY_"
                    }
                },
                {
                    action: {
                        startsWith: "DPIA_"
                    }
                },
                {
                    action: {
                        startsWith: "ENGINE_"
                    }
                },
                // Stage 9 — B2B developer-portal actions (own actions; the
                // TRUST_DECISION_API actor is the client owner)
                {
                    action: {
                        startsWith: "DEV_"
                    }
                },
                {
                    action: {
                        startsWith: "API_"
                    }
                },
                {
                    action: {
                        startsWith: "WEBHOOK_"
                    }
                },
                {
                    action: "TRUST_DECISION_API"
                },
                // Stage 10 — Trust Network (own actions only; signal mint/retract
                // are SYSTEM-actor events surfaced via the Security Center timeline)
                {
                    action: {
                        startsWith: "NETWORK_"
                    }
                },
                // Stage 11 — Score Insights (own exports)
                {
                    action: "SCORE_HISTORY_EXPORTED"
                }
            ]
        },
        orderBy: {
            createdAt: "desc"
        },
        take: limit,
        select: {
            id: true,
            action: true,
            createdAt: true
        }
    });
}
}),
"[project]/src/lib/services/phone-auth-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PHONE_OTP_TTL_MS",
    ()=>PHONE_OTP_TTL_MS,
    "completePhoneLink",
    ()=>completePhoneLink,
    "completePhoneLogin",
    ()=>completePhoneLogin,
    "completePhoneRegistration",
    ()=>completePhoneRegistration,
    "notifyPhoneSignIn",
    ()=>notifyPhoneSignIn,
    "startPhoneOtp",
    ()=>startPhoneOtp,
    "verifyPhoneOtp",
    ()=>verifyPhoneOtp
]);
// AUTH batch — phone OTP authentication service.
//
// Phone login/register/link/recovery over PhoneLoginSession (mirrors the
// identity-layer PhoneVerification OTP discipline):
//   - OTP: 6 digits, sha256(pepper+code) at rest, 5-minute TTL
//   - Caps: 5 wrong attempts → FAILED; 3 resends max; per-IP + per-phone
//     rate limits at the route layer
//   - Delivery: MOCK (honestly labeled — the code is returned in the response
//     so the sandbox is testable; production swaps in the SMS transport)
//   - The raw phone NEVER persists: phoneFingerprint (peppered sha256 of
//     E.164) is the only stored form; the masked hint is display-only and
//     never appears in URLs, logs, or analytics.
//
// Enumeration resistance: OTP start ALWAYS succeeds identically whether or
// not the number matches an account; the verify step fails generically.
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/notification-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/auth-identifier-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth/identifiers.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
const OTP_PEPPER = process.env.SIGNAL_PEPPER ?? "ts_backend_only_signal_pepper";
const PHONE_OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_RESENDS = 3;
function generateOtp() {
    return String((0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomInt"])(0, 1_000_000)).padStart(6, "0");
}
function hashOtp(code) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${OTP_PEPPER}:otp:${code}`).digest("hex");
}
function otpMatches(storedHash, presented) {
    return storedHash === hashOtp(presented);
}
async function startPhoneOtp(input, requestId) {
    const phone = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePhoneIdentifier"])(input.phone);
    if (!phone) return {
        ok: false,
        code: "PHONE_INVALID"
    };
    // A PENDING session for the same number+purpose is superseded (resend
    // discipline is per-session; starting fresh resets attempts).
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.updateMany({
        where: {
            phoneHash: phone.hash,
            purpose: input.purpose,
            status: "PENDING"
        },
        data: {
            status: "EXPIRED"
        }
    });
    const otp = generateOtp();
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.create({
        data: {
            phoneHash: phone.hash,
            phoneHint: phone.hint,
            purpose: input.purpose,
            displayName: input.displayName?.slice(0, 80),
            handle: input.handle?.slice(0, 24),
            otpHash: hashOtp(otp),
            expiresAt: new Date(Date.now() + PHONE_OTP_TTL_MS)
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "ANONYMOUS",
        action: "AUTH_PHONE_OTP_START",
        subjectType: "PhoneLoginSession",
        subjectId: session.id,
        requestId,
        // phoneHint only — never the raw number, never the fingerprint
        metadata: {
            outcome: "started",
            purpose: input.purpose,
            hint: phone.hint
        }
    });
    return {
        ok: true,
        sessionId: session.id,
        phoneHint: phone.hint,
        expiresAt: session.expiresAt.toISOString(),
        // MOCK SMS delivery — the sandbox surfaces the code; production delivery
        // is the SMS transport (Termii-class) and this field becomes null.
        mockOtp: otp,
        providerMode: "MOCK"
    };
}
async function verifyPhoneOtp(input, requestId) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.findUnique({
        where: {
            id: input.sessionId
        }
    });
    if (!session) return {
        ok: false,
        code: "SESSION_NOT_FOUND"
    };
    if (session.status === "VERIFIED") return {
        ok: true,
        purpose: session.purpose,
        phoneHash: session.phoneHash,
        verified: true
    };
    if (session.status !== "PENDING") return {
        ok: false,
        code: "EXPIRED"
    };
    if (session.expiresAt.getTime() < Date.now()) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.update({
            where: {
                id: session.id
            },
            data: {
                status: "EXPIRED"
            }
        });
        return {
            ok: false,
            code: "EXPIRED"
        };
    }
    if (session.attempts >= MAX_ATTEMPTS) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.update({
            where: {
                id: session.id
            },
            data: {
                status: "FAILED"
            }
        });
        return {
            ok: false,
            code: "MAX_ATTEMPTS"
        };
    }
    if (!otpMatches(session.otpHash, input.otp)) {
        const attempts = session.attempts + 1;
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.update({
            where: {
                id: session.id
            },
            data: {
                attempts,
                status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING"
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "ANONYMOUS",
            action: "AUTH_PHONE_OTP_INVALID",
            subjectType: "PhoneLoginSession",
            subjectId: session.id,
            requestId,
            metadata: {
                outcome: "invalid_otp",
                attempt: attempts
            }
        });
        return {
            ok: false,
            code: attempts >= MAX_ATTEMPTS ? "MAX_ATTEMPTS" : "OTP_INVALID"
        };
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.update({
        where: {
            id: session.id
        },
        data: {
            status: "VERIFIED",
            verifiedAt: new Date()
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "ANONYMOUS",
        action: "AUTH_PHONE_OTP_VERIFIED",
        subjectType: "PhoneLoginSession",
        subjectId: session.id,
        requestId,
        metadata: {
            outcome: "verified",
            purpose: session.purpose
        }
    });
    return {
        ok: true,
        purpose: session.purpose,
        phoneHash: session.phoneHash,
        verified: true
    };
}
async function completePhoneLogin(input, requestId) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.findUnique({
        where: {
            id: input.sessionId
        }
    });
    if (!session || session.status !== "VERIFIED") return {
        ok: false,
        code: "NOT_VERIFIED"
    };
    if (session.purpose !== "LOGIN" && session.purpose !== "RECOVERY") return {
        ok: false,
        code: "WRONG_PURPOSE"
    };
    const resolved = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolveIdentifier"])("PHONE", session.phoneHash);
    if (!resolved.ok) return {
        ok: false,
        code: "ACCOUNT_NOT_FOUND"
    };
    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            id: resolved.userId
        },
        select: {
            id: true,
            status: true
        }
    });
    if (!user || user.status !== "ACTIVE") return {
        ok: false,
        code: "NOT_ACTIVE"
    };
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.update({
        where: {
            id: session.id
        },
        data: {
            status: "FAILED"
        }
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.updateMany({
        where: {
            userId: user.id,
            type: "PHONE",
            value: session.phoneHash
        },
        data: {
            lastUsedAt: new Date()
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: user.id,
        action: "AUTH_PHONE_LOGIN",
        subjectType: "UserAccount",
        subjectId: user.id,
        requestId,
        metadata: {
            outcome: "login"
        }
    });
    return {
        ok: true,
        userId: user.id,
        outcome: "LOGIN"
    };
}
async function completePhoneRegistration(input, requestId) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.findUnique({
        where: {
            id: input.sessionId
        }
    });
    if (!session || session.status !== "VERIFIED") return {
        ok: false,
        code: "NOT_VERIFIED"
    };
    if (session.purpose !== "REGISTER") return {
        ok: false,
        code: "WRONG_PURPOSE"
    };
    const name = input.displayName.trim();
    if (name.length < 2 || name.length > 80) return {
        ok: false,
        code: "NAME_INVALID"
    };
    const handle = input.handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) return {
        ok: false,
        code: "HANDLE_INVALID"
    };
    const taken = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            handle
        },
        select: {
            id: true
        }
    });
    if (taken) return {
        ok: false,
        code: "HANDLE_TAKEN"
    };
    const phoneTaken = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findUnique({
        where: {
            type_value: {
                type: "PHONE",
                value: session.phoneHash
            }
        },
        select: {
            id: true
        }
    });
    if (phoneTaken) return {
        ok: false,
        code: "PHONE_TAKEN"
    };
    // Passwordless unless the user also sets a password at registration.
    const { hash, salt } = input.password ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashPassword"])(input.password) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashPassword"])((0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(32).toString("base64url"));
    const created = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.create({
        data: {
            email: input.email?.trim().toLowerCase() || null,
            passwordHash: hash,
            passwordSalt: salt,
            displayName: name,
            handle,
            status: "ACTIVE"
        }
    });
    // Register the auth identifiers (canonical registry, design D1) — the
    // handle is a login identifier from day one, exactly like email-path
    // registration (matrix observation auth-7 #1).
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(created.id, "USERNAME", handle, {
        verified: true,
        requestId,
        makePrimary: false,
        syncAccount: true
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(created.id, "PHONE", session.phoneHash, {
        hint: session.phoneHint,
        verified: true,
        requestId,
        makePrimary: true
    });
    if (input.email) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(created.id, "EMAIL", input.email.trim().toLowerCase(), {
            hint: input.email,
            verified: false,
            requestId
        });
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.update({
        where: {
            id: session.id
        },
        data: {
            status: "FAILED"
        }
    });
    const notif = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["welcomeNotification"])(name);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(created.id, "SYSTEM", notif.title, notif.body);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: created.id,
        action: "AUTH_PHONE_REGISTERED",
        subjectType: "UserAccount",
        subjectId: created.id,
        requestId,
        metadata: {
            outcome: "registered",
            withPassword: !!input.password
        }
    });
    return {
        ok: true,
        userId: created.id,
        outcome: "REGISTERED"
    };
}
async function completePhoneLink(userId, input, requestId) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.findUnique({
        where: {
            id: input.sessionId
        }
    });
    if (!session || session.status !== "VERIFIED") return {
        ok: false,
        code: "NOT_VERIFIED"
    };
    if (session.purpose !== "LINK") return {
        ok: false,
        code: "WRONG_PURPOSE"
    };
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findUnique({
        where: {
            type_value: {
                type: "PHONE",
                value: session.phoneHash
            }
        },
        select: {
            userId: true
        }
    });
    if (existing) {
        return {
            ok: false,
            code: existing.userId === userId ? "NOT_LINKED_TO_OTHER" : "PHONE_TAKEN"
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
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["linkIdentifier"])(userId, "PHONE", session.phoneHash, {
        hint: session.phoneHint,
        verified: true,
        requestId
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneLoginSession.update({
        where: {
            id: session.id
        },
        data: {
            status: "FAILED"
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SECURITY", "Phone number linked to your account", "You can now sign in with your phone number via a one-time code. If this wasn't you, unlink it from your Security Center immediately.");
    return {
        ok: true,
        userId
    };
}
async function notifyPhoneSignIn(userId, ua) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SECURITY", "New sign-in to your account", `A session was opened with your phone number from "${ua}". If this wasn't you, revoke the session from your Identity Security Center.`);
}
}),
"[project]/src/app/api/v1/auth/phone/register/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// POST /api/v1/auth/phone/register — complete phone-first registration from
// a VERIFIED OTP session (the number itself was the proof). Password is
// optional: without one the account is passwordless (OTP-only sign-in),
// exactly like the NINAuth/Google passwordless accounts.
__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/session.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$account$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/account-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$phone$2d$auth$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/phone-auth-service.ts [app-route] (ecmascript)");
;
;
;
;
;
const RegisterSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    sessionId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(10).max(64),
    displayName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(2).max(80),
    handle: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, "Username must be 3–24 chars: a–z, 0–9, _"),
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8).max(128).optional(),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().toLowerCase().email().max(254).optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal(""))
});
async function POST(req) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const rl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clientKey"])(req, "phone-register"), 5, 60_000);
    if (!rl.allowed) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(429, "RATE_LIMITED", "Too many attempts. Wait a minute.", requestId);
    }
    let body;
    try {
        body = await req.json();
    } catch  {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
    }
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
    }
    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$phone$2d$auth$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["completePhoneRegistration"])({
        sessionId: parsed.data.sessionId,
        displayName: parsed.data.displayName,
        handle: parsed.data.handle,
        password: parsed.data.password,
        email: parsed.data.email || undefined
    }, requestId);
    if (!result.ok) {
        const map = {
            NOT_VERIFIED: {
                status: 401,
                code: "OTP_UNVERIFIED",
                message: "Verify your phone code first."
            },
            WRONG_PURPOSE: {
                status: 409,
                code: "WRONG_PURPOSE",
                message: "This code was not issued for registration."
            },
            PHONE_TAKEN: {
                status: 409,
                code: "PHONE_TAKEN",
                message: "That number is already linked to an account."
            },
            HANDLE_TAKEN: {
                status: 409,
                code: "HANDLE_TAKEN",
                message: "That username is already reserved."
            },
            HANDLE_INVALID: {
                status: 422,
                code: "HANDLE_INVALID",
                message: "That username is not available."
            },
            NAME_INVALID: {
                status: 422,
                code: "NAME_INVALID",
                message: "Enter your full name."
            }
        };
        const fail = map[result.code];
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(fail.status, fail.code, fail.message, requestId);
    }
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$account$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getUserById"])(result.userId);
    if (!user) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(500, "INTERNAL", "Account creation failed.", requestId);
    }
    const { token, expiresAt } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createSession"])(user.id, req);
    const res = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
        user: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPublicUser"])(user),
        outcome: "REGISTERED",
        requestId
    }, 201);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setSessionCookie"])(res, token, expiresAt);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__ee8d9a4b._.js.map