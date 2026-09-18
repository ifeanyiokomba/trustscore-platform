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
"[project]/src/lib/services/recovery-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EMAIL_CODE_TTL_MS",
    ()=>EMAIL_CODE_TTL_MS,
    "RESET_TTL_MS",
    ()=>RESET_TTL_MS,
    "confirmEmailVerification",
    ()=>confirmEmailVerification,
    "confirmPasswordReset",
    ()=>confirmPasswordReset,
    "requestEmailVerification",
    ()=>requestEmailVerification,
    "requestPasswordReset",
    ()=>requestPasswordReset
]);
// AUTH batch — account recovery service.
//
// Password reset ("forgot password"): identifier-based request with a
// GENERIC always-200 response (enumeration-resistant); the reset token is
// sha256-hashed at rest, single-use, 15-minute TTL; confirming rotates the
// password and revokes EVERY active session.
//
// Email verification: 6-digit code (hashed at rest, 10-minute TTL, capped
// attempts) that flips the EMAIL AuthIdentifier to verified — the gate that
// enables Google auto-linking and email-based recovery delivery.
//
// MOCK delivery discipline (honestly labeled): the sandbox surfaces codes and
// reset tokens in the API response + the account's notification feed so the
// flows are testable; production swaps in the email/SMS transports and these
// fields become null.
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
const PEPPER = process.env.SIGNAL_PEPPER ?? "ts_backend_only_signal_pepper";
const RESET_TTL_MS = 15 * 60_000;
const EMAIL_CODE_TTL_MS = 10 * 60_000;
const MAX_CODE_ATTEMPTS = 5;
function hashToken(token) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${PEPPER}:reset:${token}`).digest("hex");
}
function hashEmailCode(code) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${PEPPER}:emailcode:${code}`).digest("hex");
}
async function requestPasswordReset(input, requestId) {
    const raw = input.identifier.trim();
    const type = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["detectIdentifierType"])(raw);
    let userId = null;
    if (type === "EMAIL") {
        const email = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeEmail"])(raw);
        if (email) {
            const resolved = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolveIdentifier"])("EMAIL", email);
            if (resolved.ok) userId = resolved.userId;
        }
    } else if (type === "USERNAME") {
        const username = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeUsername"])(raw) ?? raw.toLowerCase();
        const resolved = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolveIdentifier"])("USERNAME", username);
        if (resolved.ok) userId = resolved.userId;
    } else if (type === "PHONE") {
        const phone = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$identifiers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePhoneIdentifier"])(raw);
        if (phone) {
            const resolved = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolveIdentifier"])("PHONE", phone.hash);
            if (resolved.ok) userId = resolved.userId;
        }
    }
    if (!userId) {
        // No account matched: identical response (with a decoy token).
        return {
            ok: true,
            sent: true,
            message: "If an account matches that identifier, reset instructions have been sent.",
            mockToken: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(24).toString("base64url")
        };
    }
    const token = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(24).toString("base64url");
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].passwordResetSession.create({
        data: {
            userId,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + RESET_TTL_MS)
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SECURITY", "Password reset requested", "A password reset was requested for your account. The link expires in 15 minutes. If this wasn't you, no action is needed — your password is unchanged.");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "ANONYMOUS",
        action: "AUTH_RESET_REQUESTED",
        subjectType: "UserAccount",
        subjectId: userId,
        requestId,
        metadata: {
            outcome: "requested",
            identifierType: type ?? "unknown"
        }
    });
    return {
        ok: true,
        sent: true,
        message: "If an account matches that identifier, reset instructions have been sent.",
        mockToken: token
    };
}
async function confirmPasswordReset(input, requestId) {
    if (input.newPassword.length < 8 || input.newPassword.length > 128) {
        return {
            ok: false,
            code: "PASSWORD_WEAK"
        };
    }
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].passwordResetSession.findUnique({
        where: {
            tokenHash: hashToken(input.token)
        }
    });
    if (!session || session.status !== "PENDING" || session.expiresAt.getTime() < Date.now()) {
        // Generic: expired, used, and decoy tokens are indistinguishable.
        if (session && session.status === "PENDING" && session.expiresAt.getTime() < Date.now()) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].passwordResetSession.update({
                where: {
                    id: session.id
                },
                data: {
                    status: "EXPIRED"
                }
            });
        }
        return {
            ok: false,
            code: "TOKEN_INVALID"
        };
    }
    const { hash, salt } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashPassword"])(input.newPassword);
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].$transaction([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].passwordResetSession.update({
            where: {
                id: session.id
            },
            data: {
                status: "USED",
                usedAt: new Date()
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.update({
            where: {
                id: session.userId
            },
            data: {
                passwordHash: hash,
                passwordSalt: salt
            }
        }),
        // Session revocation on credential rotation — every device signs out.
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].session.updateMany({
            where: {
                userId: session.userId,
                revokedAt: null
            },
            data: {
                revokedAt: new Date()
            }
        })
    ]);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(session.userId, "SECURITY", "Password changed", "Your password was reset and all sessions were signed out. If this wasn't you, contact support immediately.");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: session.userId,
        action: "AUTH_RESET_CONFIRMED",
        subjectType: "UserAccount",
        subjectId: session.userId,
        requestId,
        metadata: {
            outcome: "reset_confirmed",
            sessionsRevoked: true
        }
    });
    return {
        ok: true,
        userId: session.userId
    };
}
async function requestEmailVerification(userId, requestId) {
    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].userAccount.findUnique({
        where: {
            id: userId
        },
        select: {
            email: true
        }
    });
    if (!user?.email) return {
        ok: false,
        code: "NO_EMAIL"
    };
    const ident = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].authIdentifier.findUnique({
        where: {
            type_value: {
                type: "EMAIL",
                value: user.email
            }
        },
        select: {
            id: true,
            verified: true
        }
    });
    if (ident?.verified) return {
        ok: false,
        code: "ALREADY_VERIFIED"
    };
    const code = String((0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomInt"])(0, 1_000_000)).padStart(6, "0");
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.upsert({
        where: {
            key: `emailverify:${userId}`
        },
        create: {
            key: `emailverify:${userId}`,
            value: JSON.stringify({
                codeHash: hashEmailCode(code),
                email: user.email,
                attempts: 0,
                expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString()
            })
        },
        update: {
            value: JSON.stringify({
                codeHash: hashEmailCode(code),
                email: user.email,
                attempts: 0,
                expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString()
            })
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "AUTH_EMAIL_VERIFY_REQUESTED",
        subjectType: "UserAccount",
        subjectId: userId,
        requestId,
        metadata: {
            outcome: "requested"
        }
    });
    return {
        ok: true,
        mockCode: code,
        expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString()
    };
}
async function confirmEmailVerification(userId, input, requestId) {
    const setting = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.findUnique({
        where: {
            key: `emailverify:${userId}`
        }
    });
    if (!setting) return {
        ok: false,
        code: "NO_PENDING"
    };
    const pending = JSON.parse(setting.value);
    if (new Date(pending.expiresAt).getTime() < Date.now()) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.delete({
            where: {
                key: `emailverify:${userId}`
            }
        });
        return {
            ok: false,
            code: "EXPIRED"
        };
    }
    if (pending.attempts >= MAX_CODE_ATTEMPTS) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.delete({
            where: {
                key: `emailverify:${userId}`
            }
        });
        return {
            ok: false,
            code: "MAX_ATTEMPTS"
        };
    }
    if (hashEmailCode(input.code) !== pending.codeHash) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.update({
            where: {
                key: `emailverify:${userId}`
            },
            data: {
                value: JSON.stringify({
                    ...pending,
                    attempts: pending.attempts + 1
                })
            }
        });
        return {
            ok: false,
            code: "CODE_INVALID"
        };
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$auth$2d$identifier$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markIdentifierVerified"])(userId, "EMAIL", pending.email);
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].platformSetting.delete({
        where: {
            key: `emailverify:${userId}`
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "AUTH_EMAIL_VERIFIED",
        subjectType: "AuthIdentifier",
        subjectId: `EMAIL:${pending.email.slice(0, 12)}`,
        requestId,
        metadata: {
            outcome: "verified"
        }
    });
    return {
        ok: true,
        email: pending.email
    };
}
}),
"[project]/src/app/api/v1/auth/recover/password/confirm/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// POST /api/v1/auth/recover/password/confirm — confirm a password reset:
// single-use token, 15-minute TTL. On success the password rotates and EVERY
// session for the account is revoked (credential rotation = sign out all
// devices). Failures are generic — expired, used, and decoy tokens are
// indistinguishable.
__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$recovery$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/recovery-service.ts [app-route] (ecmascript)");
;
;
;
const ConfirmSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    token: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(16).max(128),
    newPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, "Password must be at least 8 characters").max(128)
});
async function POST(req) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const rl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clientKey"])(req, "reset-confirm"), 5, 60_000);
    if (!rl.allowed) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(429, "RATE_LIMITED", "Too many attempts. Wait a minute.", requestId);
    }
    let body;
    try {
        body = await req.json();
    } catch  {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
    }
    const parsed = ConfirmSchema.safeParse(body);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(422, "VALIDATION_ERROR", first?.message ?? "Invalid input.", requestId);
    }
    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$recovery$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["confirmPasswordReset"])(parsed.data, requestId);
    if (!result.ok) {
        if (result.code === "PASSWORD_WEAK") {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(422, "PASSWORD_WEAK", "Password must be at least 8 characters.", requestId);
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(400, "TOKEN_INVALID", "This reset link is invalid or has expired. Request a new one.", requestId);
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
        reset: true,
        message: "Password reset. All sessions were signed out — sign in with your new password.",
        requestId
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e2432b0a._.js.map