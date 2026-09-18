module.exports = [
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
"[project]/src/lib/providers/liveness-provider.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FACE_MATCH_THRESHOLD",
    ()=>FACE_MATCH_THRESHOLD,
    "LIVENESS_FRESHNESS_DAYS",
    ()=>LIVENESS_FRESHNESS_DAYS,
    "LIVENESS_MODE",
    ()=>LIVENESS_MODE,
    "LIVENESS_PASS_THRESHOLD",
    ()=>LIVENESS_PASS_THRESHOLD,
    "LIVENESS_PROVIDER_NAME",
    ()=>LIVENESS_PROVIDER_NAME,
    "LIVENESS_TTL_MS",
    ()=>LIVENESS_TTL_MS,
    "biometricFingerprint",
    ()=>biometricFingerprint,
    "captureInstructions",
    ()=>captureInstructions,
    "createLivenessJob",
    ()=>createLivenessJob,
    "evaluateLiveness",
    ()=>evaluateLiveness
]);
// TrustScore Stage 4 — Biometric liveness provider adapter
// (CONTRACT-FIRST, MOCK transport — Smile-ID-class job contract).
//
// The contract a real liveness/biometric partner exposes:
//   create job → capture (client-side SDK) → submit → verdict
//   { passed, livenessScore, faceMatchScore, consistent, reason, confidence }
//
// In this sandbox the capture is simulated (the frontend renders an honest
// MOCK capture experience) and the verdict is computed here deterministically.
// The LIVE implementation swaps only the job submission + polling transport;
// the verdict shape, thresholds, identifier/evidence discipline and consent
// binding stay identical.
//
// Security invariants (directive §32/§29):
//   - No selfie pixels, face templates or biometric data are EVER stored.
//     Only the redacted verdict + a fingerprint of the subject linkage.
//   - The biometric subject is matched against the government-anchored
//     identity reference (masked NINAuth subject) — never a raw NIN.
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/platform/boot-guard.ts [app-route] (ecmascript)");
;
;
const LIVENESS_PROVIDER_NAME = "LIVENESS_MOCK";
const LIVENESS_MODE = "MOCK"; // honestly labeled everywhere
// sec-batch-A: guarded read — production refuses to boot on the dev default.
const LIVENESS_PEPPER = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$platform$2f$boot$2d$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["guardedSecret"])("SIGNAL_PEPPER");
const LIVENESS_TTL_MS = 10 * 60_000; // capture-window TTL
const LIVENESS_FRESHNESS_DAYS = 90; // identifier freshness horizon
const LIVENESS_PASS_THRESHOLD = 70; // anti-spoofing score floor
const FACE_MATCH_THRESHOLD = 80; // selfie ↔ government record floor
function createLivenessJob() {
    return {
        jobId: `livejob_${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(16).toString("hex")}`
    };
}
function biometricFingerprint(maskedSubject) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${LIVENESS_PEPPER}:biometric:${maskedSubject}`).digest("hex");
}
function seededRange(seed, min, max) {
    const h = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])("sha256").update(`${LIVENESS_PEPPER}:seed:${seed}`).digest();
    const v = h.readUInt32BE(0) % 1000;
    return min + Math.round(v / 999 * (max - min));
}
function evaluateLiveness(input) {
    let livenessScore;
    let faceMatchScore;
    let reason = "liveness_passed";
    switch(input.simulate){
        case "fail_liveness":
            livenessScore = seededRange(`${input.jobId}:live-fail`, 20, 55);
            faceMatchScore = seededRange(`${input.jobId}:face-ok`, 82, 99);
            reason = "liveness_score_below_threshold";
            break;
        case "face_mismatch":
            livenessScore = seededRange(`${input.jobId}:live-ok`, 78, 99);
            faceMatchScore = seededRange(`${input.jobId}:face-fail`, 35, 65);
            reason = "face_match_below_threshold";
            break;
        default:
            livenessScore = seededRange(`${input.jobId}:live`, 80, 99);
            faceMatchScore = seededRange(`${input.jobId}:face`, 84, 99);
    }
    const passed = livenessScore >= LIVENESS_PASS_THRESHOLD && faceMatchScore >= FACE_MATCH_THRESHOLD;
    const consistent = passed && input.maskedSubject.length > 0;
    const confidence = Math.round((livenessScore + faceMatchScore) / 2);
    return {
        passed,
        livenessScore,
        faceMatchScore,
        consistent,
        reason,
        confidence: passed ? confidence : Math.round(Math.max(livenessScore, faceMatchScore) * 0.6)
    };
}
function captureInstructions() {
    return [
        "Hold the phone at eye level in good, even lighting",
        "Center your face in the frame and hold still",
        "Remove glasses, hats or masks that obscure your face",
        "The check takes a few seconds — keep the frame until it completes"
    ];
}
}),
"[project]/src/lib/services/signal-service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SignalError",
    ()=>SignalError,
    "activeIdentifierTypesFor",
    ()=>activeIdentifierTypesFor,
    "completeLiveness",
    ()=>completeLiveness,
    "computeCrossSignalState",
    ()=>computeCrossSignalState,
    "confirmPhoneOtp",
    ()=>confirmPhoneOtp,
    "getSandboxSmsInbox",
    ()=>getSandboxSmsInbox,
    "getSignalsForUser",
    ()=>getSignalsForUser,
    "recomputeAssuranceLevel",
    ()=>recomputeAssuranceLevel,
    "resendPhoneOtp",
    ()=>resendPhoneOtp,
    "startLiveness",
    ()=>startLiveness,
    "startPhoneVerification",
    ()=>startPhoneVerification
]);
// TrustScore Stage 4 — SignalService (directive §28 service separation).
// Phone (OTP) + biometric (liveness) verification bound to the Trust Identity
// spine, with assurance escalation when signals agree (L2–L4) and
// cross-signal consistency (directive §30).
//
// Disciplines carried forward:
//   - A signal can only be bound to a VERIFIED, FRESH government identity
//     (L1 first — a phone or selfie alone never establishes identity).
//   - Every verification is consent-backed (NDPA §31) — withdrawal revokes
//     the sourced identifier and de-escalates the ladder.
//   - Raw phone numbers are stored ONLY as peppered fingerprints + masked
//     hints; no biometric templates are ever stored.
//   - Every action is audited (redacted metadata — directive §38).
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/phone-provider.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$liveness$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/providers/liveness-provider.ts [app-route] (ecmascript)");
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
;
class SignalError extends Error {
    code;
    httpStatus;
    extra;
    constructor(code, httpStatus, message, extra){
        super(message), this.code = code, this.httpStatus = httpStatus, this.extra = extra;
        this.name = "SignalError";
    }
}
const PHONE_CONSENT_PURPOSE = "SELF_ASSURANCE_PHONE";
const PHONE_CONSENT_SCOPES = [
    "phone.otp_verify"
];
const LIVENESS_CONSENT_PURPOSE = "SELF_ASSURANCE_BIOMETRIC";
const LIVENESS_CONSENT_SCOPES = [
    "biometric.liveness"
];
// ---------------------------------------------------------------------------
// Shared: the identity spine a signal binds to (L1 gate)
// ---------------------------------------------------------------------------
async function requireFreshIdentity(userId) {
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
        where: {
            userId
        }
    });
    const fresh = identity !== null && identity.status === "VERIFIED" && identity.providerIdentityRef !== null && (identity.expiresAt?.getTime() ?? 0) > Date.now();
    if (!fresh || !identity) {
        throw new SignalError("IDENTITY_REQUIRED", 409, "Verify your government identity (Level 1) before binding additional signals.", {
            requiredLevel: 1
        });
    }
    return identity;
}
function activeIdentifierTypesFor(identity) {
    if (identity.status !== "VERIFIED") return [];
    if ((identity.expiresAt?.getTime() ?? 0) <= Date.now()) return [];
    return identity.identifiers.filter((i)=>i.status === "ACTIVE" && (i.expiresAt?.getTime() ?? Infinity) > Date.now()).map((i)=>i.type);
}
async function computeCrossSignalState(userId) {
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
        where: {
            userId
        },
        include: {
            identifiers: true
        }
    });
    const phoneRow = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.findFirst({
        where: {
            userId,
            status: "VERIFIED"
        },
        orderBy: {
            verifiedAt: "desc"
        }
    });
    const livenessRow = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].livenessSession.findFirst({
        where: {
            userId,
            status: "PASSED"
        },
        orderBy: {
            completedAt: "desc"
        }
    });
    const identityFresh = identity !== null && identity.status === "VERIFIED" && (identity.expiresAt?.getTime() ?? 0) > Date.now();
    const types = identity ? activeIdentifierTypesFor(identity) : [];
    const hasPhone = types.includes("PHONE");
    const hasBiometric = types.includes("BIOMETRIC");
    let livenessConsistent = false;
    if (livenessRow?.result) {
        try {
            const verdict = JSON.parse(livenessRow.result);
            livenessConsistent = verdict.consistent === true;
        } catch  {
            livenessConsistent = false;
        }
    }
    const simSwapRisk = phoneRow?.simSwapRisk;
    const checks = [
        {
            key: "government",
            label: "Government identity verified & fresh",
            ok: identityFresh
        },
        {
            key: "phone",
            label: hasPhone ? "Phone bound via OTP & fresh" : "Phone not bound",
            ok: hasPhone
        },
        {
            key: "sim_swap",
            label: simSwapRisk === "HIGH" ? "SIM-swap risk detected on the bound line" : simSwapRisk === "MEDIUM" ? "Moderate SIM-swap risk on the bound line" : hasPhone ? "No SIM-swap signals on the bound line" : "No SIM-swap signal (phone not bound)",
            ok: hasPhone && simSwapRisk !== "HIGH"
        },
        {
            key: "biometric",
            label: hasBiometric ? "Biometric liveness passed & fresh" : "Biometric liveness not completed",
            ok: hasBiometric
        },
        {
            key: "face_match",
            label: livenessRow ? livenessConsistent ? "Selfie consistent with the government record" : "Selfie not established as consistent" : "No biometric comparison yet",
            ok: hasBiometric && livenessConsistent
        }
    ];
    const consistent = identityFresh && hasPhone && hasBiometric && livenessConsistent && simSwapRisk !== "HIGH";
    const eligibleLevel = identityFresh ? hasPhone ? hasBiometric ? consistent ? 4 : 3 : 2 : 1 : 0;
    return {
        consistent,
        checks,
        eligibleLevel
    };
}
async function recomputeAssuranceLevel(userId) {
    const state = await computeCrossSignalState(userId);
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
        where: {
            userId
        }
    });
    if (!identity) return 0;
    if (identity.assuranceLevel !== state.eligibleLevel) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.update({
            where: {
                id: identity.id
            },
            data: {
                assuranceLevel: state.eligibleLevel,
                updatedAt: new Date()
            }
        });
    }
    return state.eligibleLevel;
}
// ---------------------------------------------------------------------------
// Phone verification — start
// ---------------------------------------------------------------------------
// Stage 13 — loopback delivery: the OTP message goes out over the REAL
// transport (signed, timed out, retried, circuit-brokened) to the sandbox SMS
// carrier. The carrier knows only the MASKED hint (privacy discipline holds
// across processes); the code itself is never echoed back — LIVE contract.
async function deliverOtpViaTransport(phoneHint, code) {
    const text = `TrustScore: your verification code is ${code}. It expires in 5 minutes. Never share this code.`;
    try {
        const { data, latencyMs } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerCall"])("phone", "/v1/phone/messages", {
            to: phoneHint,
            text
        });
        return {
            messageId: data.messageId,
            latencyMs
        };
    } catch (err) {
        if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ProviderTransportError"]) {
            throw new SignalError("PROVIDER_UNAVAILABLE", 503, `The SMS carrier transport failed (${err.code}). Nothing was sent and nothing was stored — try again when the carrier recovers.`);
        }
        throw err;
    }
}
function providerLabels(key, posture) {
    return {
        providerName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerNameFor"])(key, posture === "mock" ? "mock" : posture === "loopback" ? "loopback" : "live"),
        providerMode: posture === "mock" ? "MOCK" : "LIVE"
    };
}
async function startPhoneVerification(userId, input, requestId) {
    const identity = await requireFreshIdentity(userId);
    const e164 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePhoneE164"])(input.phone);
    if (!e164) {
        throw new SignalError("PHONE_INVALID", 422, "Enter a valid Nigerian mobile number (e.g. 0801 234 5678).");
    }
    const posture = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    const labels = providerLabels("phone", posture);
    const hint = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["maskPhoneHint"])(e164);
    const { code, otpHash } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["issueOtp"])();
    const fingerprint = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["phoneFingerprint"])(e164);
    const risk = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["simSwapRiskFor"])(fingerprint, input.simSwapRisk);
    // Loopback: deliver through the transport FIRST — a failure leaves zero
    // rows behind (honest 503). Mock: the code surfaces in the delivery panel.
    let transportMessageId = null;
    if (posture === "loopback") {
        const sent = await deliverOtpViaTransport(hint, code);
        transportMessageId = sent.messageId;
    }
    const consent = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.create({
        data: {
            userId,
            requester: "TrustScore (you)",
            purpose: PHONE_CONSENT_PURPOSE,
            scopes: JSON.stringify(PHONE_CONSENT_SCOPES),
            policyVersion: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CONSENT_POLICY_VERSION"]
        }
    });
    const verification = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.create({
        data: {
            userId,
            phoneHash: fingerprint,
            phoneHint: hint,
            status: "PENDING",
            otpHash,
            simSwapRisk: risk,
            consentId: consent.id,
            expiresAt: new Date(Date.now() + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTP_TTL_MS"])
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "SIGNAL_PHONE_STARTED",
        subjectType: "PhoneVerification",
        subjectId: verification.id,
        requestId,
        metadata: {
            outcome: "started",
            scope: "phone_otp",
            providerMode: labels.providerMode,
            posture,
            transportMessageId
        }
    });
    // Delivery contract: MOCK echoes the message (sandbox test surface, labeled);
    // loopback/LIVE never echo the code — the sandbox inbox holds the message.
    const delivery = posture === "mock" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mockDelivery"])(code) : {
        mode: "LIVE",
        channel: "sms",
        provider: labels.providerName,
        message: `Code sent to ${hint} through the signed sandbox carrier transport (message ${transportMessageId}). Open the sandbox SMS inbox to read it — LIVE responses never echo codes.`
    };
    return {
        verification: {
            id: verification.id,
            phoneHint: verification.phoneHint,
            status: verification.status,
            attemptsLeft: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_OTP_ATTEMPTS"],
            resendsLeft: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_RESENDS"],
            expiresAt: verification.expiresAt.toISOString(),
            provider: labels.providerName,
            providerMode: labels.providerMode,
            posture
        },
        consent: {
            id: consent.id,
            purpose: PHONE_CONSENT_PURPOSE
        },
        delivery
    };
}
async function resendPhoneOtp(userId, input, requestId) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.findUnique({
        where: {
            id: input.verificationId
        }
    });
    if (!row || row.userId !== userId) {
        throw new SignalError("NOT_FOUND", 404, "Verification not found.");
    }
    if (row.status !== "PENDING") {
        throw new SignalError("NOT_PENDING", 409, `Verification is ${row.status.toLowerCase()}.`);
    }
    const sinceUpdate = Date.now() - row.updatedAt.getTime();
    if (sinceUpdate < __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RESEND_COOLDOWN_MS"]) {
        throw new SignalError("COOLDOWN", 429, "Please wait before requesting a new code.", {
            retryAfterSec: Math.ceil((__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RESEND_COOLDOWN_MS"] - sinceUpdate) / 1000)
        });
    }
    if (row.resends >= __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_RESENDS"]) {
        throw new SignalError("RESEND_LIMIT", 409, "Resend limit reached. Start a new verification.");
    }
    if (row.expiresAt.getTime() < Date.now()) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.update({
            where: {
                id: row.id
            },
            data: {
                status: "EXPIRED"
            }
        });
        throw new SignalError("EXPIRED", 409, "This verification expired. Start a new one.");
    }
    const { code, otpHash } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["issueOtp"])();
    const posture = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    const labels = providerLabels("phone", posture);
    // Loopback: send the new code through the transport BEFORE updating the
    // row — a failure leaves the previous code intact (honest 503).
    let transportMessageId = null;
    if (posture === "loopback") {
        const sent = await deliverOtpViaTransport(row.phoneHint, code);
        transportMessageId = sent.messageId;
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.update({
        where: {
            id: row.id
        },
        data: {
            otpHash,
            attempts: 0,
            resends: row.resends + 1,
            expiresAt: new Date(Date.now() + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTP_TTL_MS"])
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "SIGNAL_PHONE_RESENT",
        subjectType: "PhoneVerification",
        subjectId: row.id,
        requestId,
        metadata: {
            outcome: "resent",
            scope: "phone_otp",
            posture,
            transportMessageId
        }
    });
    const delivery = posture === "mock" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mockDelivery"])(code) : {
        mode: "LIVE",
        channel: "sms",
        provider: labels.providerName,
        message: `New code sent to ${row.phoneHint} through the signed sandbox carrier transport (message ${transportMessageId}). Open the sandbox SMS inbox to read it — the previous code is no longer valid.`
    };
    return {
        verification: {
            id: row.id,
            phoneHint: row.phoneHint,
            status: "PENDING",
            attemptsLeft: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_OTP_ATTEMPTS"],
            resendsLeft: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_RESENDS"] - (row.resends + 1),
            expiresAt: new Date(Date.now() + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OTP_TTL_MS"]).toISOString(),
            provider: labels.providerName,
            providerMode: labels.providerMode,
            posture
        },
        delivery
    };
}
async function getSandboxSmsInbox(userId, requestId) {
    const posture = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    if (posture !== "loopback") {
        throw new SignalError("PROVIDER_UNAVAILABLE", 409, "The sandbox SMS inbox exists only in the loopback provider posture (MOCK surfaces the code in the delivery panel; LIVE delivers to real handsets).");
    }
    const pending = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.findFirst({
        where: {
            userId,
            status: "PENDING"
        },
        orderBy: {
            createdAt: "desc"
        }
    });
    const hint = pending?.phoneHint ?? null;
    try {
        const { data } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerGet"])("phone", hint ? `/v1/phone/inbox?to=${encodeURIComponent(hint)}` : "/v1/phone/inbox");
        return {
            posture,
            phoneHint: hint,
            messages: data.messages ?? [],
            note: "Sandbox SMS inbox — messages the loopback carrier received for your masked number. In LIVE posture codes are delivered to real handsets and never appear here.",
            requestId
        };
    } catch (err) {
        if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ProviderTransportError"]) {
            throw new SignalError("PROVIDER_UNAVAILABLE", 503, `The sandbox SMS carrier is unreachable (${err.code}). Try again shortly.`);
        }
        throw err;
    }
}
async function confirmPhoneOtp(userId, input, requestId) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.findUnique({
        where: {
            id: input.verificationId
        }
    });
    if (!row || row.userId !== userId) {
        throw new SignalError("NOT_FOUND", 404, "Verification not found.");
    }
    // Lazy state transitions first — the row must be a live, pending check.
    if (row.status === "EXPIRED" || row.expiresAt.getTime() < Date.now()) {
        if (row.status === "PENDING") {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.update({
                where: {
                    id: row.id
                },
                data: {
                    status: "EXPIRED"
                }
            });
        }
        throw new SignalError("EXPIRED", 409, "This verification expired. Start a new one.");
    }
    if (row.status !== "PENDING") {
        throw new SignalError("LOCKED", 409, `Verification is ${row.status.toLowerCase()} — start a new one.`);
    }
    if (!/^\d{6}$/.test(input.code)) {
        throw new SignalError("OTP_INVALID", 422, "Enter the 6-digit code from the SMS.");
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["otpMatches"])(row.otpHash, input.code)) {
        const attempts = row.attempts + 1;
        const locked = attempts >= __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_OTP_ATTEMPTS"];
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.update({
            where: {
                id: row.id
            },
            data: {
                attempts,
                status: locked ? "FAILED" : "PENDING"
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: userId,
            action: "SIGNAL_PHONE_FAILED",
            subjectType: "PhoneVerification",
            subjectId: row.id,
            requestId,
            metadata: {
                outcome: locked ? "locked" : "wrong_code",
                attemptsLeft: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_OTP_ATTEMPTS"] - attempts
            }
        });
        if (locked) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SECURITY", "Phone verification locked", "Too many wrong codes. For your security this verification was locked — start a new one if this was you.");
        }
        throw new SignalError(locked ? "LOCKED" : "OTP_INVALID", locked ? 409 : 400, locked ? "Too many wrong attempts — verification locked. Start a new one." : "That code is not correct.", {
            attemptsLeft: Math.max(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_OTP_ATTEMPTS"] - attempts)
        });
    }
    // Correct code: bind the phone to the identity spine.
    const now = new Date();
    const expiresAt = new Date(now.getTime() + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PHONE_FRESHNESS_DAYS"] * 24 * 60 * 60 * 1000);
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
        where: {
            userId
        }
    });
    if (!identity || identity.status !== "VERIFIED") {
        throw new SignalError("IDENTITY_REQUIRED", 409, "Government identity is no longer active.");
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.update({
        where: {
            id: row.id
        },
        data: {
            status: "VERIFIED",
            verifiedAt: now
        }
    });
    // Stage 6 — hash-lookup unambiguity: a phone number belongs to exactly one
    // verified identity at a time. If another identity holds an ACTIVE
    // identifier with this fingerprint (number re-verified by its new owner,
    // or a sandbox duplicate), the older binding is SUPERSEDED — its evidence
    // lapses and the ladder de-escalates for that user.
    const collisions = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].identityIdentifier.findMany({
        where: {
            type: "PHONE",
            hash: row.phoneHash,
            status: "ACTIVE",
            NOT: {
                trustIdentityId: identity.id
            }
        },
        select: {
            id: true,
            trustIdentityId: true
        }
    });
    for (const c of collisions){
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].identityIdentifier.update({
            where: {
                id: c.id
            },
            data: {
                status: "SUPERSEDED"
            }
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].evidence.updateMany({
            where: {
                trustIdentityId: c.trustIdentityId,
                type: "PHONE_OTP",
                status: "ACTIVE"
            },
            data: {
                status: "REVOKED"
            }
        });
        const oldIdentity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
            where: {
                id: c.trustIdentityId
            },
            select: {
                userId: true
            }
        });
        if (oldIdentity) {
            await recomputeAssuranceLevel(oldIdentity.userId);
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markMaterialChange"])(oldIdentity.userId, "PHONE_SUPERSEDED");
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(oldIdentity.userId, "SECURITY", "Phone number re-verified elsewhere", "The phone number linked to your identity was just verified by a different TrustScore account, so your phone signal was superseded. If this wasn't you, contact support immediately.");
        }
    }
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].identityIdentifier.upsert({
        where: {
            trustIdentityId_type: {
                trustIdentityId: identity.id,
                type: "PHONE"
            }
        },
        create: {
            trustIdentityId: identity.id,
            type: "PHONE",
            hash: row.phoneHash,
            hint: `Phone · ${row.phoneHint} (OTP-verified)`,
            status: "ACTIVE",
            verifiedAt: now,
            expiresAt,
            consentId: row.consentId
        },
        update: {
            hash: row.phoneHash,
            hint: `Phone · ${row.phoneHint} (OTP-verified)`,
            status: "ACTIVE",
            verifiedAt: now,
            expiresAt,
            consentId: row.consentId
        }
    });
    const risk = row.simSwapRisk;
    const confirmPosture = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    const phoneLabels = providerLabels("phone", confirmPosture);
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].evidence.create({
        data: {
            userId,
            trustIdentityId: identity.id,
            sessionId: row.id,
            consentId: row.consentId,
            type: "PHONE_OTP",
            provider: phoneLabels.providerName,
            providerMode: phoneLabels.providerMode,
            summary: `Phone bound to identity via SMS OTP (${phoneLabels.providerName} — ${phoneLabels.providerMode} transport). SIM-swap risk: ${risk}.`,
            confidence: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["confidenceForSimSwap"])(risk),
            status: "ACTIVE",
            collectedAt: now,
            expiresAt
        }
    });
    const level = await recomputeAssuranceLevel(userId);
    const escalated = level >= 2;
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "SIGNAL_PHONE_VERIFIED",
        subjectType: "IdentityIdentifier",
        subjectId: identity.id,
        requestId,
        metadata: {
            outcome: "verified",
            level,
            simSwap: risk,
            providerMode: phoneLabels.providerMode,
            posture: confirmPosture
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "VERIFICATION", "Phone verified", escalated ? `Your phone ${row.phoneHint} is now bound to your Trust Identity — Assurance Level ${level} (valid 90 days). You can withdraw this consent anytime.` : `Your phone ${row.phoneHint} was verified, but the assurance ladder could not escalate yet — check that your government identity is still fresh.`);
    // Stage 5: material change — a new signal moved the read model.
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markMaterialChange"])(userId, "PHONE_VERIFIED");
    return {
        verification: {
            id: row.id,
            status: "VERIFIED",
            phoneHint: row.phoneHint
        },
        identifier: {
            type: "PHONE",
            hint: `Phone · ${row.phoneHint} (OTP-verified)`,
            status: "ACTIVE",
            expiresAt: expiresAt.toISOString()
        },
        assuranceLevel: level,
        escalated,
        simSwapRisk: risk
    };
}
async function startLiveness(userId, _input, requestId) {
    const identity = await requireFreshIdentity(userId);
    const posture = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    const labels = providerLabels("liveness", posture);
    // Stage 13 — loopback: the job is created by the provider over the REAL
    // transport (jobId issued by the partner, not by us). A failure leaves
    // zero rows behind (honest 503). Mock: the in-process job exactly as before.
    let jobId;
    if (posture === "loopback") {
        try {
            const { data } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerCall"])("liveness", "/v1/liveness/jobs", {});
            jobId = data.jobId;
        } catch (err) {
            if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ProviderTransportError"]) {
                throw new SignalError("PROVIDER_UNAVAILABLE", 503, `The liveness partner transport failed (${err.code}). No session was created — try again when the partner recovers.`);
            }
            throw err;
        }
    } else {
        jobId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$liveness$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createLivenessJob"])().jobId;
    }
    const consent = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].consent.create({
        data: {
            userId,
            requester: "TrustScore (you)",
            purpose: LIVENESS_CONSENT_PURPOSE,
            scopes: JSON.stringify(LIVENESS_CONSENT_SCOPES),
            policyVersion: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$ninauth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CONSENT_POLICY_VERSION"]
        }
    });
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].livenessSession.create({
        data: {
            userId,
            trustIdentityId: identity.id,
            jobId,
            status: "PENDING",
            consentId: consent.id,
            expiresAt: new Date(Date.now() + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$liveness$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LIVENESS_TTL_MS"])
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "SIGNAL_LIVENESS_STARTED",
        subjectType: "LivenessSession",
        subjectId: session.id,
        requestId,
        metadata: {
            outcome: "started",
            scope: "biometric_liveness",
            providerMode: labels.providerMode,
            posture
        }
    });
    return {
        session: {
            id: session.id,
            jobId: session.jobId,
            status: session.status,
            expiresAt: session.expiresAt.toISOString(),
            provider: labels.providerName,
            providerMode: labels.providerMode,
            posture,
            instructions: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$liveness$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["captureInstructions"])()
        },
        consent: {
            id: consent.id,
            purpose: LIVENESS_CONSENT_PURPOSE
        }
    };
}
async function completeLiveness(userId, input, requestId) {
    const row = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].livenessSession.findUnique({
        where: {
            id: input.sessionId
        }
    });
    if (!row || row.userId !== userId) {
        throw new SignalError("NOT_FOUND", 404, "Liveness session not found.");
    }
    if (row.status !== "PENDING") {
        throw new SignalError("NOT_PENDING", 409, `Liveness session is ${row.status.toLowerCase()}.`);
    }
    if (row.expiresAt.getTime() < Date.now()) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].livenessSession.update({
            where: {
                id: row.id
            },
            data: {
                status: "EXPIRED"
            }
        });
        throw new SignalError("EXPIRED", 409, "The capture window expired. Start a new check.");
    }
    if (input.simulate && ![
        "ok",
        "fail_liveness",
        "face_mismatch"
    ].includes(input.simulate)) {
        throw new SignalError("REASON_INVALID", 422, "Unknown simulation reason.");
    }
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
        where: {
            userId
        }
    });
    if (!identity || identity.status !== "VERIFIED" || !identity.providerIdentityRef) {
        throw new SignalError("IDENTITY_REQUIRED", 409, "Government identity is no longer active.");
    }
    const posture = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    const labels = providerLabels("liveness", posture);
    // Stage 13 — loopback: the capture is submitted to the partner over the
    // REAL transport and the verdict comes back from the partner (deterministic
    // seeded scores — the simulator's "model"). Mock: in-process evaluation.
    let verdict;
    if (posture === "loopback") {
        try {
            const { data } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["providerCall"])("liveness", `/v1/liveness/jobs/${encodeURIComponent(row.jobId)}/submit`, {
                simulate: input.simulate ?? "ok",
                maskedSubject: identity.providerIdentityRef
            });
            // Shape validation — the verdict is the partner's ANSWER, but we still
            // enforce our own contract on it (never trust blindly).
            if (typeof data.passed !== "boolean" || typeof data.livenessScore !== "number" || typeof data.faceMatchScore !== "number" || typeof data.reason !== "string") {
                throw new SignalError("PROVIDER_UNAVAILABLE", 502, "The liveness partner returned a malformed verdict — rejected. No biometric signal was added.");
            }
            verdict = data;
        } catch (err) {
            if (err instanceof SignalError) throw err;
            if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ProviderTransportError"]) {
                // Honest failure — the session stays PENDING (retryable).
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
                    actorType: "USER",
                    actorId: userId,
                    action: "SIGNAL_LIVENESS_TRANSPORT_FAILED",
                    subjectType: "LivenessSession",
                    subjectId: row.id,
                    requestId,
                    metadata: {
                        outcome: "transport_error",
                        code: err.code,
                        posture
                    }
                });
                throw new SignalError("PROVIDER_UNAVAILABLE", 503, `The liveness partner transport failed (${err.code}). Your capture window is still open — retry when the partner recovers.`);
            }
            throw err;
        }
    } else {
        verdict = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$liveness$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["evaluateLiveness"])({
            jobId: row.jobId,
            maskedSubject: identity.providerIdentityRef,
            simulate: input.simulate
        });
    }
    const now = new Date();
    const resultJson = JSON.stringify({
        passed: verdict.passed,
        livenessScore: verdict.livenessScore,
        faceMatchScore: verdict.faceMatchScore,
        consistent: verdict.consistent,
        reason: verdict.reason
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].livenessSession.update({
        where: {
            id: row.id
        },
        data: {
            status: verdict.passed ? "PASSED" : "FAILED",
            result: resultJson,
            confidence: verdict.confidence,
            completedAt: now
        }
    });
    if (!verdict.passed) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
            actorType: "USER",
            actorId: userId,
            action: "SIGNAL_LIVENESS_FAILED",
            subjectType: "LivenessSession",
            subjectId: row.id,
            requestId,
            metadata: {
                outcome: "failed",
                reason: verdict.reason,
                providerMode: labels.providerMode,
                posture
            }
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "SECURITY", "Liveness check not completed", verdict.reason === "face_match_below_threshold" ? "The selfie could not be matched to your government record, so no biometric signal was added. You can retry with better lighting." : "The liveness check did not pass. No biometric signal was added. You can retry anytime.");
        return {
            session: {
                id: row.id,
                status: "FAILED"
            },
            verdict: {
                ...verdict,
                bound: false
            },
            assuranceLevel: identity.assuranceLevel
        };
    }
    // Passed: bind the biometric identifier (fingerprint only — no templates).
    const expiresAt = new Date(now.getTime() + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$liveness$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LIVENESS_FRESHNESS_DAYS"] * 24 * 60 * 60 * 1000);
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].identityIdentifier.upsert({
        where: {
            trustIdentityId_type: {
                trustIdentityId: identity.id,
                type: "BIOMETRIC"
            }
        },
        create: {
            trustIdentityId: identity.id,
            type: "BIOMETRIC",
            hash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$liveness$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["biometricFingerprint"])(identity.providerIdentityRef),
            hint: "Biometric · liveness + face-match vs government record",
            status: "ACTIVE",
            verifiedAt: now,
            expiresAt,
            consentId: row.consentId
        },
        update: {
            hash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$liveness$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["biometricFingerprint"])(identity.providerIdentityRef),
            hint: "Biometric · liveness + face-match vs government record",
            status: "ACTIVE",
            verifiedAt: now,
            expiresAt,
            consentId: row.consentId
        }
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].evidence.create({
        data: {
            userId,
            trustIdentityId: identity.id,
            sessionId: row.id,
            consentId: row.consentId,
            type: "LIVENESS",
            provider: labels.providerName,
            providerMode: labels.providerMode,
            summary: `Selfie liveness passed and matched the government record (${labels.providerName} — ${labels.providerMode} transport). No biometric data stored — verdict only.`,
            confidence: verdict.confidence,
            status: "ACTIVE",
            collectedAt: now,
            expiresAt
        }
    });
    const level = await recomputeAssuranceLevel(userId);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$audit$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAudit"])({
        actorType: "USER",
        actorId: userId,
        action: "SIGNAL_LIVENESS_PASSED",
        subjectType: "IdentityIdentifier",
        subjectId: identity.id,
        requestId,
        metadata: {
            outcome: "passed",
            level,
            liveness: verdict.livenessScore,
            faceMatch: verdict.faceMatchScore,
            providerMode: labels.providerMode,
            posture
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$notification$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notifyUser"])(userId, "VERIFICATION", "Biometric liveness passed", level >= 4 ? `Liveness passed and all your signals agree — Assurance Level ${level} (cross-signal consistency). Valid 90 days.` : `Liveness passed and matched your government record — Assurance Level ${level} (valid 90 days). You can withdraw this consent anytime.`);
    // Stage 5: material change — a new signal moved the read model.
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$trustscore$2d$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markMaterialChange"])(userId, "LIVENESS_PASSED");
    return {
        session: {
            id: row.id,
            status: "PASSED"
        },
        verdict: {
            ...verdict,
            bound: true
        },
        assuranceLevel: level
    };
}
async function getSignalsForUser(userId) {
    const identity = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].trustIdentity.findUnique({
        where: {
            userId
        },
        include: {
            identifiers: true
        }
    });
    const phoneIdentifier = identity?.identifiers.find((i)=>i.type === "PHONE") ?? null;
    const biometricIdentifier = identity?.identifiers.find((i)=>i.type === "BIOMETRIC") ?? null;
    const pendingPhone = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.findFirst({
        where: {
            userId,
            status: "PENDING",
            expiresAt: {
                gt: new Date()
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });
    const lastPhone = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].phoneVerification.findFirst({
        where: {
            userId,
            status: "VERIFIED"
        },
        orderBy: {
            verifiedAt: "desc"
        }
    });
    const pendingLiveness = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].livenessSession.findFirst({
        where: {
            userId,
            status: "PENDING",
            expiresAt: {
                gt: new Date()
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });
    const lastLiveness = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].livenessSession.findFirst({
        where: {
            userId,
            status: "PASSED"
        },
        orderBy: {
            completedAt: "desc"
        }
    });
    const now = Date.now();
    const identifierStatus = (idt)=>{
        if (!idt) return "NONE";
        if (idt.status === "REVOKED") return "REVOKED";
        if ((idt.expiresAt?.getTime() ?? 0) <= now) return "EXPIRED";
        return idt.status; // ACTIVE
    };
    let lastScores = null;
    if (lastLiveness?.result) {
        try {
            const v = JSON.parse(lastLiveness.result);
            lastScores = {
                liveness: v.livenessScore,
                faceMatch: v.faceMatchScore,
                confidence: lastLiveness.confidence ?? 0
            };
        } catch  {
            lastScores = null;
        }
    }
    const crossSignal = await computeCrossSignalState(userId);
    // Stage 13 — the providers block reflects the CURRENT posture (honest,
    // live-configured provider names; evidence rows carry bind-time names).
    const postureNow = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$provider$2d$posture$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getProviderPosture"])();
    const phoneNow = providerLabels("phone", postureNow);
    const livenessNow = providerLabels("liveness", postureNow);
    return {
        phone: {
            status: identifierStatus(phoneIdentifier),
            hint: phoneIdentifier?.hint?.replace(/^Phone · /, "") ?? lastPhone?.phoneHint ?? null,
            verifiedAt: phoneIdentifier?.verifiedAt?.toISOString() ?? null,
            expiresAt: phoneIdentifier?.expiresAt?.toISOString() ?? null,
            simSwapRisk: lastPhone?.simSwapRisk ?? null,
            consentId: phoneIdentifier?.consentId ?? null,
            inProgress: pendingPhone ? {
                id: pendingPhone.id,
                phoneHint: pendingPhone.phoneHint,
                expiresAt: pendingPhone.expiresAt.toISOString(),
                attemptsLeft: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_OTP_ATTEMPTS"] - pendingPhone.attempts,
                resendsLeft: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$providers$2f$phone$2d$provider$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_RESENDS"] - pendingPhone.resends
            } : null
        },
        biometric: {
            status: identifierStatus(biometricIdentifier),
            verifiedAt: biometricIdentifier?.verifiedAt?.toISOString() ?? null,
            expiresAt: biometricIdentifier?.expiresAt?.toISOString() ?? null,
            lastScores,
            consentId: biometricIdentifier?.consentId ?? null,
            inProgress: pendingLiveness ? {
                id: pendingLiveness.id,
                expiresAt: pendingLiveness.expiresAt.toISOString()
            } : null
        },
        crossSignal,
        providers: {
            phone: {
                name: phoneNow.providerName,
                mode: phoneNow.providerMode
            },
            liveness: {
                name: livenessNow.providerName,
                mode: livenessNow.providerMode
            }
        }
    };
}
}),
];

//# sourceMappingURL=src_lib_3f307c6a._.js.map