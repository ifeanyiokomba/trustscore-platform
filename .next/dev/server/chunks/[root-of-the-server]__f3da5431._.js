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
    "clientKey",
    ()=>clientKey,
    "jsonError",
    ()=>jsonError,
    "jsonOk",
    ()=>jsonOk,
    "newRequestId",
    ()=>newRequestId,
    "rateLimit",
    ()=>rateLimit
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
function clientKey(req, scope) {
    // Best-effort client key: IP (+ optional identity in the route).
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    return `${scope}:${ip}`;
}
const GENERIC_LOGIN_ERROR = "Invalid email or password.";
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
            ipHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashIp"])(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip"))
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
;
const PHONE_PROVIDER_NAME = "SMS_MOCK";
const PHONE_MODE = "MOCK"; // honestly labeled everywhere
// Backend-only pepper — shared with the identifier fingerprint discipline.
const PHONE_PEPPER = process.env.SIGNAL_PEPPER ?? "ts_backend_only_signal_pepper";
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
"[project]/src/app/api/v1/auth/me/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// GET /api/v1/auth/me — resolve the current session (used to hydrate the client).
// AUTH batch: also returns the caller's authentication identifiers (masked)
// so the client can render the sign-in methods state.
__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/session.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/auth-identifier-service.ts [app-route] (ecmascript)");
;
;
;
async function GET(req) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSessionUser"])(req);
    if (!user) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(401, "UNAUTHENTICATED", "No active session.", requestId);
    }
    const identifiers = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listIdentifiers"])(user.id);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
        user: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPublicUser"])(user),
        identifiers
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__f3da5431._.js.map