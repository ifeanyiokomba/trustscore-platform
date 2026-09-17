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
const SNAPSHOT_RETAIN = 20; // last N snapshots kept per user
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
"[project]/src/app/api/v1/engine/public/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// GET /api/v1/engine/public — PUBLIC trust-engine transparency view (Stage 8).
// Shows every member (and the landing page) the ACTIVE scoring policy —
// rules, budgets, DPIA status and the automated-decision gate state.
// This is the "rules-first, inspectable engine" the audit demands: no
// secrets here by design; the policy IS the public contract.
__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/policy-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$engine$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/engine-service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
;
;
;
;
async function GET(req) {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["newRequestId"])();
    const rl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clientKey"])(req, "engine-public"), 30, 60_000);
    if (!rl.allowed) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
            error: {
                code: "RATE_LIMITED",
                message: "Too many requests — retry shortly.",
                requestId
            }
        }, 429);
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ensurePoliciesSeeded"])(); // converges seed before reads (DPIA registry)
    const [gate, policies, dpias] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$engine$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getEngineGate"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$policy$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listPolicies"])(),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].dpiaRecord.findMany({
            orderBy: {
                createdAt: "desc"
            },
            take: 10,
            select: {
                id: true,
                status: true,
                residualRisk: true,
                summary: true,
                completedAt: true,
                createdAt: true,
                policyId: true
            }
        })
    ]);
    const policyMap = new Map(policies.map((p)=>[
            p.id,
            p.version
        ]));
    const active = gate.activePolicy;
    const activeDpia = dpias.find((d)=>d.policyId === active?.id && d.status === "COMPLETED");
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonOk"])({
        activePolicy: active ? {
            version: active.version,
            activatedAt: active.activatedAt,
            changeSummary: active.changeSummary,
            rules: active.rules
        } : null,
        policyHistory: policies.map((p)=>({
                version: p.version,
                status: p.status,
                changeSummary: p.changeSummary,
                activatedAt: p.activatedAt
            })),
        dpia: {
            status: activeDpia ? "COMPLETED" : "REQUIRED",
            completedAt: activeDpia?.completedAt?.toISOString() ?? null,
            residualRisk: activeDpia?.residualRisk ?? null,
            summary: activeDpia?.summary ?? null
        },
        dpiRegistry: dpias.map((d)=>({
                status: d.status,
                residualRisk: d.residualRisk,
                policyVersion: policyMap.get(d.policyId) ?? null,
                completedAt: d.completedAt?.toISOString() ?? null
            })),
        automatedSignificantDecisions: gate.automatedSignificantDecisions,
        gateNote: gate.gateNote,
        language: "The scoring policy is public by design (rules-first engine). It changes only through a new versioned policy covered by a completed DPIA — never silently.",
        requestId
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__49818385._.js.map