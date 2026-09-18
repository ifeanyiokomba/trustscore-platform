module.exports = [
"[project]/src/lib/store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "readError",
    ()=>readError,
    "useTrustStore",
    ()=>useTrustStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
"use client";
;
async function readError(res) {
    try {
        const body = await res.json();
        if (body?.error?.message) return body.error.message;
    } catch  {
    /* fall through */ }
    return "Something went wrong. Please try again.";
}
const useTrustStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        view: "landing",
        user: null,
        authLoading: true,
        pending: false,
        error: null,
        setView: (v)=>set({
                view: v,
                error: null
            }),
        setUser: (user)=>set({
                user,
                view: user ? "dashboard" : "landing",
                authLoading: false
            }),
        setPending: (pending)=>set({
                pending
            }),
        setError: (error)=>set({
                error
            }),
        refreshMe: async ()=>{
            try {
                const res = await fetch("/api/v1/auth/me", {
                    cache: "no-store"
                });
                if (res.ok) {
                    const body = await res.json();
                    set({
                        user: body.user,
                        view: "dashboard",
                        authLoading: false
                    });
                } else {
                    set({
                        user: null,
                        authLoading: false
                    });
                }
            } catch  {
                set({
                    user: null,
                    authLoading: false
                });
            }
        },
        signOut: async ()=>{
            set({
                pending: true
            });
            try {
                await fetch("/api/v1/auth/logout", {
                    method: "POST"
                });
            } catch  {
            /* best-effort */ }
            set({
                user: null,
                view: "landing",
                pending: false,
                error: null
            });
        }
    }));
;
}),
"[project]/src/lib/motion.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AnimatedNumber",
    ()=>AnimatedNumber,
    "DUR",
    ()=>DUR,
    "EASE",
    ()=>EASE,
    "Reveal",
    ()=>Reveal,
    "SPRING",
    ()=>SPRING,
    "STAGGER",
    ()=>STAGGER,
    "fadeIn",
    ()=>fadeIn,
    "fadeUp",
    ()=>fadeUp,
    "riseBlur",
    ()=>riseBlur,
    "scaleIn",
    ()=>scaleIn,
    "staggerParent",
    ()=>staggerParent,
    "useFloatState",
    ()=>useFloatState,
    "useScrolled",
    ()=>useScrolled
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
// TrustScore Stage 15 — Design Elevation.
// The shared motion design language: one easing curve, one spring, one set
// of reveal variants. Every animated surface in the product pulls from here
// so the whole page moves with a single, coherent choreography.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$animation$2f$animate$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/animation/animate/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$use$2d$in$2d$view$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/utils/use-in-view.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$reduced$2d$motion$2f$use$2d$reduced$2d$motion$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/utils/reduced-motion/use-reduced-motion.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
const EASE = [
    0.22,
    1,
    0.36,
    1
];
const SPRING = {
    type: "spring",
    stiffness: 320,
    damping: 28
};
const DUR = {
    fast: 0.3,
    base: 0.45,
    slow: 0.6
};
const STAGGER = 0.07;
const fadeUp = {
    hidden: {
        opacity: 0,
        y: 24
    },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: DUR.base,
            ease: EASE
        }
    }
};
const fadeIn = {
    hidden: {
        opacity: 0
    },
    show: {
        opacity: 1,
        transition: {
            duration: DUR.base,
            ease: EASE
        }
    }
};
const scaleIn = {
    hidden: {
        opacity: 0,
        y: 20,
        scale: 0.97
    },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: DUR.slow,
            ease: EASE
        }
    }
};
const riseBlur = {
    hidden: {
        opacity: 0,
        y: 28,
        filter: "blur(8px)"
    },
    show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
            duration: 0.7,
            ease: EASE
        }
    }
};
function staggerParent(delay = 0, stagger = STAGGER) {
    return {
        hidden: {},
        show: {
            transition: {
                staggerChildren: stagger,
                delayChildren: delay
            }
        }
    };
}
const VIEWPORT_ONCE = {
    once: true,
    margin: "-80px"
};
function Reveal({ children, delay = 0, className, as = "div" }) {
    const MotionTag = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"][as];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(MotionTag, {
        initial: "hidden",
        whileInView: "show",
        viewport: VIEWPORT_ONCE,
        variants: fadeUp,
        transition: {
            delay
        },
        className: className,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/lib/motion.tsx",
        lineNumber: 96,
        columnNumber: 5
    }, this);
}
function AnimatedNumber({ value, duration = 1.4, delay = 0, prefix = "", suffix = "", format, className }) {
    const ref = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"](null);
    const inView = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$use$2d$in$2d$view$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useInView"])(ref, {
        once: true,
        margin: "-40px"
    });
    const reduced = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$reduced$2d$motion$2f$use$2d$reduced$2d$motion$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useReducedMotion"])();
    const [display, setDisplay] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"](()=>(format ?? String)(reduced ? value : 0));
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"](()=>{
        if (reduced || !inView) return;
        const controls = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$animation$2f$animate$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["animate"])(0, value, {
            duration,
            delay,
            ease: EASE,
            onUpdate: (v)=>setDisplay((format ?? String)(Math.round(v)))
        });
        return ()=>controls.stop();
    }, [
        inView,
        reduced,
        value,
        duration,
        delay,
        format
    ]);
    // Once reduced-motion users land, show the final value immediately.
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"](()=>{
        if (reduced) setDisplay((format ?? String)(value));
    }, [
        reduced,
        value,
        format
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        ref: ref,
        className: className,
        style: {
            fontVariantNumeric: "tabular-nums"
        },
        children: [
            prefix,
            display,
            suffix
        ]
    }, void 0, true, {
        fileName: "[project]/src/lib/motion.tsx",
        lineNumber: 155,
        columnNumber: 5
    }, this);
}
function useScrolled(threshold = 12) {
    const [scrolled, setScrolled] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"](false);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"](()=>{
        const onScroll = ()=>setScrolled(window.scrollY > threshold);
        onScroll();
        window.addEventListener("scroll", onScroll, {
            passive: true
        });
        return ()=>window.removeEventListener("scroll", onScroll);
    }, [
        threshold
    ]);
    return scrolled;
}
function useFloatState() {
    const reduced = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$reduced$2d$motion$2f$use$2d$reduced$2d$motion$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useReducedMotion"])();
    return !reduced;
}
}),
"[project]/src/lib/api-client.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "apiEmailVerifyConfirm",
    ()=>apiEmailVerifyConfirm,
    "apiEmailVerifyRequest",
    ()=>apiEmailVerifyRequest,
    "apiGoogleCallback",
    ()=>apiGoogleCallback,
    "apiGoogleGrant",
    ()=>apiGoogleGrant,
    "apiGoogleLink",
    ()=>apiGoogleLink,
    "apiGoogleStart",
    ()=>apiGoogleStart,
    "apiListIdentifiers",
    ()=>apiListIdentifiers,
    "apiLogin",
    ()=>apiLogin,
    "apiLoginIdentifier",
    ()=>apiLoginIdentifier,
    "apiLogoutAll",
    ()=>apiLogoutAll,
    "apiPhoneOtpStart",
    ()=>apiPhoneOtpStart,
    "apiPhoneOtpVerify",
    ()=>apiPhoneOtpVerify,
    "apiPhoneRegister",
    ()=>apiPhoneRegister,
    "apiRecoverConfirm",
    ()=>apiRecoverConfirm,
    "apiRecoverRequest",
    ()=>apiRecoverRequest,
    "apiRegister",
    ()=>apiRegister,
    "apiRegisterAccount",
    ()=>apiRegisterAccount,
    "apiUnlinkIdentifier",
    ()=>apiUnlinkIdentifier
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store.ts [app-ssr] (ecmascript)");
"use client";
;
async function callApi(url, init) {
    try {
        const res = await fetch(url, init);
        let body = null;
        try {
            body = await res.json();
        } catch  {
        /* non-JSON body */ }
        if (!res.ok) {
            const err = body?.error;
            return {
                ok: false,
                error: {
                    status: res.status,
                    code: err?.code ?? "UNKNOWN",
                    message: err?.message ?? "Something went wrong. Please try again."
                }
            };
        }
        return {
            ok: true,
            data: body
        };
    } catch  {
        return {
            ok: false,
            error: {
                status: 0,
                code: "NETWORK",
                message: "Network error — try again."
            }
        };
    }
}
function postJson(url, payload) {
    return callApi(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
}
async function apiRegister(input) {
    const { setPending, setError, setUser } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTrustStore"].getState();
    setPending(true);
    setError(null);
    try {
        const res = await fetch("/api/v1/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(input)
        });
        if (!res.ok) {
            const message = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["readError"])(res);
            setError(message);
            throw new Error(message);
        }
        const body = await res.json();
        setUser(body.user);
        return body.user;
    } finally{
        setPending(false);
    }
}
async function apiLogin(input) {
    const { setPending, setError, setUser } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTrustStore"].getState();
    setPending(true);
    setError(null);
    try {
        const res = await fetch("/api/v1/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(input)
        });
        if (!res.ok) {
            const message = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["readError"])(res);
            setError(message);
            throw new Error(message);
        }
        const body = await res.json();
        setUser(body.user);
        return body.user;
    } finally{
        setPending(false);
    }
}
async function apiRegisterAccount(input) {
    const { setPending, setError, setUser } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTrustStore"].getState();
    setPending(true);
    setError(null);
    try {
        const result = await postJson("/api/v1/auth/register", input);
        if (result.ok) setUser(result.data.user);
        else setError(result.error.message);
        return result;
    } finally{
        setPending(false);
    }
}
async function apiLoginIdentifier(input, opts) {
    const { setPending, setError, setUser } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTrustStore"].getState();
    if (!opts?.silent) {
        setPending(true);
        setError(null);
    }
    try {
        const result = await postJson("/api/v1/auth/login", input);
        if (result.ok) {
            if (!opts?.silent) setUser(result.data.user);
            return {
                ok: true,
                user: result.data.user,
                identifierType: result.data.identifierType
            };
        }
        if (result.error.code === "PHONE_OTP_REQUIRED") {
            // Not an error — the sign-in form switches into the phone OTP step.
            return {
                ok: false,
                phoneOtpRequired: true,
                error: result.error
            };
        }
        if (!opts?.silent) setError(result.error.message);
        return {
            ok: false,
            phoneOtpRequired: false,
            error: result.error
        };
    } finally{
        if (!opts?.silent) setPending(false);
    }
}
async function apiPhoneOtpStart(input) {
    const result = await postJson("/api/v1/auth/phone/start", input);
    if (result.ok) {
        return {
            ok: true,
            session: result.data.session,
            mockOtp: result.data.mockOtp
        };
    }
    return {
        ok: false,
        error: result.error
    };
}
async function apiPhoneOtpVerify(input) {
    const { setPending, setError, setUser } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTrustStore"].getState();
    setPending(true);
    setError(null);
    try {
        const result = await postJson("/api/v1/auth/phone/verify", input);
        if (result.ok) {
            if ("user" in result.data) {
                setUser(result.data.user);
                return {
                    ok: true,
                    user: result.data.user,
                    outcome: "LOGIN"
                };
            }
            return {
                ok: true,
                verified: true,
                purpose: result.data.purpose
            };
        }
        setError(result.error.message);
        return {
            ok: false,
            error: result.error
        };
    } finally{
        setPending(false);
    }
}
async function apiPhoneRegister(input) {
    const { setPending, setError, setUser } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTrustStore"].getState();
    setPending(true);
    setError(null);
    try {
        const result = await postJson("/api/v1/auth/phone/register", input);
        if (result.ok) setUser(result.data.user);
        else setError(result.error.message);
        return result;
    } finally{
        setPending(false);
    }
}
async function apiGoogleStart() {
    return postJson("/api/v1/auth/google/start", {});
}
async function apiGoogleGrant(sessionId, input) {
    return postJson(`/api/v1/auth/google/${sessionId}/grant`, input);
}
async function apiGoogleCallback(sessionId, input) {
    const { setPending, setUser } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTrustStore"].getState();
    setPending(true);
    try {
        const result = await postJson(`/api/v1/auth/google/${sessionId}/callback`, input);
        if (result.ok) {
            if ("user" in result.data) {
                setUser(result.data.user);
                return {
                    ok: true,
                    data: result.data
                };
            }
            // LINK_REQUIRED — not an authentication failure; the caller continues.
            return {
                ok: false,
                linkRequired: result.data,
                error: {
                    status: 200,
                    code: "LINK_REQUIRED",
                    message: result.data.message
                }
            };
        }
        return {
            ok: false,
            error: result.error
        };
    } finally{
        setPending(false);
    }
}
async function apiGoogleLink(input) {
    return postJson("/api/v1/auth/google/link", input);
}
async function apiRecoverRequest(input) {
    return postJson("/api/v1/auth/recover/password/request", input);
}
async function apiRecoverConfirm(input) {
    return postJson("/api/v1/auth/recover/password/confirm", input);
}
async function apiListIdentifiers() {
    return callApi("/api/v1/auth/identifiers", {
        method: "GET",
        cache: "no-store"
    });
}
async function apiUnlinkIdentifier(type) {
    return postJson(`/api/v1/auth/identifiers/${type}/unlink`, {});
}
async function apiEmailVerifyRequest() {
    return postJson("/api/v1/auth/email/verify/request", {});
}
async function apiEmailVerifyConfirm(input) {
    return postJson("/api/v1/auth/email/verify/confirm", input);
}
async function apiLogoutAll() {
    const { setUser } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTrustStore"].getState();
    const result = await postJson("/api/v1/auth/logout-all", {});
    if (result.ok) setUser(null);
    return result;
}
}),
"[project]/src/app/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$nav$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/nav.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$footer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/footer.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$hero$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/landing/hero.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$product$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/landing/product.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$how$2d$it$2d$works$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/landing/how-it-works.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$policy$2d$explainer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/landing/policy-explainer.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$architecture$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/landing/architecture.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$roadmap$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/landing/roadmap.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$security$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/landing/security.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$auth$2d$view$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/auth/auth-view.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$dashboard$2f$dashboard$2d$view$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/dashboard/dashboard-view.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$public$2f$trust$2d$viewer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/public/trust-viewer.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store.ts [app-ssr] (ecmascript)");
"use client";
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
;
;
;
;
;
;
function LandingView() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        id: "main",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$hero$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Hero"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$product$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Product"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$how$2d$it$2d$works$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HowItWorks"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$policy$2d$explainer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PolicyExplainer"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$architecture$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Architecture"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$roadmap$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Roadmap"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 27,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$landing$2f$security$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Security"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
// Read the location once (SSR-safe via useSyncExternalStore). The trust
// token is an opaque random value — never a NIN/identifier.
const subscribeNoop = ()=>()=>{};
function Home() {
    const { view, refreshMe } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTrustStore"])();
    const search = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSyncExternalStore"](subscribeNoop, ()=>window.location.search, ()=>"");
    const trustToken = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"](()=>{
        const t = new URLSearchParams(search).get("trust");
        return t && /^ts_[A-Za-z0-9_-]{10,80}$/.test(t) ? t : null;
    }, [
        search
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"](()=>{
        void refreshMe();
    }, [
        refreshMe
    ]);
    // Public Trust Link view — anonymous, standalone (no auth surface).
    if (trustToken) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex min-h-screen flex-col",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$public$2f$trust$2d$viewer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TrustViewer"], {
                token: trustToken
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 57,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 56,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex min-h-screen flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$nav$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Nav"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 64,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-1 flex-col",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                    mode: "wait",
                    children: view === "auth" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        initial: {
                            opacity: 0
                        },
                        animate: {
                            opacity: 1
                        },
                        exit: {
                            opacity: 0
                        },
                        transition: {
                            duration: 0.25
                        },
                        className: "flex flex-1 flex-col",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                            id: "main",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$auth$2d$view$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuthView"], {}, void 0, false, {
                                fileName: "[project]/src/app/page.tsx",
                                lineNumber: 77,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/page.tsx",
                            lineNumber: 76,
                            columnNumber: 15
                        }, this)
                    }, "auth", false, {
                        fileName: "[project]/src/app/page.tsx",
                        lineNumber: 68,
                        columnNumber: 13
                    }, this) : view === "dashboard" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        initial: {
                            opacity: 0
                        },
                        animate: {
                            opacity: 1
                        },
                        exit: {
                            opacity: 0
                        },
                        transition: {
                            duration: 0.25
                        },
                        className: "flex flex-1 flex-col",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                            id: "main",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$dashboard$2f$dashboard$2d$view$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DashboardView"], {}, void 0, false, {
                                fileName: "[project]/src/app/page.tsx",
                                lineNumber: 90,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/page.tsx",
                            lineNumber: 89,
                            columnNumber: 15
                        }, this)
                    }, "dashboard", false, {
                        fileName: "[project]/src/app/page.tsx",
                        lineNumber: 81,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        initial: {
                            opacity: 0
                        },
                        animate: {
                            opacity: 1
                        },
                        exit: {
                            opacity: 0
                        },
                        transition: {
                            duration: 0.25
                        },
                        className: "flex flex-1 flex-col",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(LandingView, {}, void 0, false, {
                            fileName: "[project]/src/app/page.tsx",
                            lineNumber: 102,
                            columnNumber: 15
                        }, this)
                    }, "landing", false, {
                        fileName: "[project]/src/app/page.tsx",
                        lineNumber: 94,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/page.tsx",
                    lineNumber: 66,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 65,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$footer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Footer"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 107,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 63,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_58dc9930._.js.map