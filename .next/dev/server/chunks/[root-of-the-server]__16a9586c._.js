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
"[project]/src/app/api/v1/engine/admin/providers/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// GET  /api/v1/engine/admin/providers — Stage 13 provider console read model:
// posture, per-provider transport state (circuit, latency p50/p95, error
// rate, last error), credential vault (masked hints only), simulator health.
// PUT  — set the provider posture { posture: "mock" | "loopback" | "live" }.
// "live" is honestly gated: without PROVIDER_LIVE_ENABLED + base URLs +
// ACTIVE vault credentials for every provider it answers 422 — nothing live
// is ever claimed in this sandbox.
__turbopack_context__.s([
    "GET",
    ()=>GET,
    "PUT",
    ()=>PUT
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/session.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/provider-posture.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/audit-service.ts [app-route] (ecmascript)");
;
;
;
;
;
const PutSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    posture: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "mock",
        "loopback",
        "live"
    ])
}).strict();
async function GET(_req) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSessionUser"])(_req);
    if (!user) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(401, "UNAUTHENTICATED", "No active session.", requestId);
    if (user.role !== "ADMIN") {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(403, "FORBIDDEN", "Provider administration is restricted to platform admins (operational grant).", requestId);
    }
    const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProvidersAdmin"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
        ...data,
        requestId
    });
}
async function PUT(req) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSessionUser"])(req);
    if (!user) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(401, "UNAUTHENTICATED", "No active session.", requestId);
    if (user.role !== "ADMIN") {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(403, "FORBIDDEN", "Provider administration is restricted to platform admins (operational grant).", requestId);
    }
    const rl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])(`providers-posture:${user.id}`, 6, 60_000);
    if (!rl.allowed) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(429, "RATE_LIMITED", "Too many posture changes. Wait a minute.", requestId);
    }
    let body = {};
    try {
        const text = await req.text();
        if (text) body = JSON.parse(text);
    } catch  {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
    }
    const parsed = PutSchema.safeParse(body);
    if (!parsed.success) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(422, "VALIDATION_ERROR", 'posture must be "mock", "loopback" or "live".', requestId);
    }
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setProviderPosture"])(parsed.data.posture);
    } catch (err) {
        if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PostureError"]) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(err.status, err.code, err.message, requestId);
        }
        throw err;
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: user.id,
        action: "PROVIDER_POSTURE_CHANGED",
        subjectType: "PlatformSetting",
        subjectId: "providers.posture",
        requestId,
        metadata: {
            posture: parsed.data.posture
        }
    });
    const posture = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
        posture,
        note: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["postureNote"])(posture),
        requestId
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__16a9586c._.js.map