"use client";

// TrustScore AUTH batch (auth-6) — the unified auth screen.
//
// One card, every method:
//   - Continue with NINAuth (passwordless, mock provider — flagship)
//   - Continue with Google (mock OAuth consent modal)
//   - Sign in with ANY identifier (username | email | phone). Phone-shaped
//     identifiers switch into the OTP step automatically (server-driven via
//     PHONE_OTP_REQUIRED, never an error).
//   - Create account with email OR phone-first (OTP, password optional).
//   - Forgot password (identifier-based, MOCK token surfaced honestly).

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AtSign,
  Lock,
  Mail,
  User,
  BadgeCheck,
  KeyRound,
  Smartphone,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTrustStore } from "@/lib/store";
import {
  apiLoginIdentifier,
  apiPhoneOtpStart,
  apiPhoneOtpVerify,
  apiPhoneRegister,
  apiRegisterAccount,
  apiRecoverRequest,
  apiRecoverConfirm,
  apiGoogleStart,
  type PhoneOtpSessionInfo,
} from "@/lib/api-client";
import { PhoneOtpStep } from "@/components/auth/phone-otp-step";
import {
  NinAuthModal,
  type NinAuthSessionInfo,
} from "@/components/auth/ninauth-modal";
import { GoogleConsentModal } from "@/components/auth/google-consent-modal";
import type { ConsentScreenInfo } from "@/lib/types";
import type { GoogleSessionInfo } from "@/lib/api-client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_RE = /^[a-z0-9_]{3,24}$/;

// Mirrors the backend's shape-based detection (never existence-based).
function isPhoneShaped(raw: string): boolean {
  const compact = raw.replace(/[\s()\-.]/g, "");
  return /^\+?\d{7,15}$/.test(compact);
}

function fieldError(
  value: string,
  kind: "identifier" | "password" | "handle" | "displayName" | "phone" | string
): string | null {
  if (!value.trim()) return "Required";
  if (kind === "password" && value.length < 8) return "At least 8 characters";
  if (kind === "handle" && !HANDLE_RE.test(value.trim()))
    return "3–24 chars: lowercase letters, numbers, underscore";
  if (kind === "displayName" && value.trim().length < 2) return "At least 2 characters";
  if (kind === "phone" && !isPhoneShaped(value)) return "Enter a valid Nigerian mobile number";
  return null;
}

type SigninMode = "form" | "phone" | "otp" | "forgot" | "forgot-sent" | "forgot-done";
type SignupMode = "form" | "phone-entry" | "phone-otp" | "phone-details";

export function AuthView() {
  const { setView, error, setError } = useTrustStore();
  const [tab, setTab] = React.useState<"signin" | "signup">("signup");

  // --- Sign-in fields ------------------------------------------------------
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [validation, setValidation] = React.useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [signinMode, setSigninMode] = React.useState<SigninMode>("form");

  // --- Phone OTP (shared sign-in / registration step) -----------------------
  const [phone, setPhone] = React.useState("");
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [phoneSession, setPhoneSession] = React.useState<PhoneOtpSessionInfo | null>(null);
  const [mockOtp, setMockOtp] = React.useState<string | null>(null);
  const [otp, setOtp] = React.useState("");
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [otpBusy, setOtpBusy] = React.useState(false);
  const [startingOtp, setStartingOtp] = React.useState(false);

  // --- Password recovery ----------------------------------------------------
  const [recoverIdentifier, setRecoverIdentifier] = React.useState("");
  const [recoverBusy, setRecoverBusy] = React.useState(false);
  const [recoverError, setRecoverError] = React.useState<string | null>(null);
  const [mockToken, setMockToken] = React.useState<string | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [newConfirm, setNewConfirm] = React.useState("");
  const [tokenCopied, setTokenCopied] = React.useState(false);

  // --- Registration (email path) --------------------------------------------
  const [displayName, setDisplayName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [serverFieldErrors, setServerFieldErrors] = React.useState<{
    handle?: string;
    email?: string;
  }>({});

  // --- Registration (phone path) ---------------------------------------------
  const [signupMode, setSignupMode] = React.useState<SignupMode>("form");
  const [regName, setRegName] = React.useState("");
  const [regHandle, setRegHandle] = React.useState("");
  const [regEmail, setRegEmail] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regBusy, setRegBusy] = React.useState(false);
  const [regFieldErrors, setRegFieldErrors] = React.useState<{
    handle?: string;
    displayName?: string;
    password?: string;
    email?: string;
  }>({});

  // --- Stage 16 — passwordless "Continue with NINAuth" -----------------------
  const [ninOpen, setNinOpen] = React.useState(false);
  const [ninSession, setNinSession] = React.useState<NinAuthSessionInfo | null>(null);
  const [ninConsent, setNinConsent] = React.useState<ConsentScreenInfo | null>(null);
  const [ninStarting, setNinStarting] = React.useState(false);

  // --- AUTH batch — "Continue with Google" (mock OAuth) -----------------------
  const [googleOpen, setGoogleOpen] = React.useState(false);
  const [googleSession, setGoogleSession] = React.useState<GoogleSessionInfo | null>(null);
  const [googleStarting, setGoogleStarting] = React.useState(false);

  async function startNinAuth() {
    setNinStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/ninauth/start", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? "Could not start NINAuth sign-in.");
        return;
      }
      setNinSession(body.session as NinAuthSessionInfo);
      setNinConsent(body.consentScreen as ConsentScreenInfo);
      setNinOpen(true);
    } catch {
      setError("Network error — try again.");
    } finally {
      setNinStarting(false);
    }
  }

  async function startGoogle(keepOpen = false) {
    if (!keepOpen) setGoogleStarting(true);
    setError(null);
    try {
      const res = await apiGoogleStart();
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setGoogleSession(res.data.session);
      setGoogleOpen(true);
    } catch {
      setError("Network error — try again.");
    } finally {
      setGoogleStarting(false);
    }
  }

  // Seed the Google modal from whatever email-shaped value the user typed.
  const googleInitialEmail = React.useMemo(() => {
    const id = identifier.trim().toLowerCase();
    if (EMAIL_RE.test(id)) return id;
    const mail = email.trim().toLowerCase();
    if (EMAIL_RE.test(mail)) return mail;
    return "";
  }, [identifier, email]);

  React.useEffect(() => {
    setError(null);
    setValidation({});
    setServerFieldErrors({});
    setRegFieldErrors({});
  }, [tab, setError]);

  React.useEffect(() => {
    setError(null);
  }, [signinMode, signupMode, setError]);

  function resetOtpState() {
    setOtp("");
    setOtpError(null);
    setPhoneSession(null);
    setMockOtp(null);
  }

  // --- Phone OTP: start (sign-in LOGIN / registration REGISTER) ---------------
  async function startPhoneOtp(purpose: "LOGIN" | "REGISTER") {
    const raw = phone.trim();
    setPhoneError(null);
    setStartingOtp(true);
    try {
      const res = await apiPhoneOtpStart({ phone: raw, purpose });
      if (!res.ok) {
        setPhoneError(res.error.message);
        return false;
      }
      setPhoneSession(res.session);
      setMockOtp(res.mockOtp);
      setOtp("");
      setOtpError(null);
      return true;
    } catch {
      setPhoneError("Network error — try again.");
      return false;
    } finally {
      setStartingOtp(false);
    }
  }

  async function startSignInPhone(rawPhone: string) {
    // Auto-switch into the OTP step for this number (no error shown).
    setPhone(rawPhone);
    setSigninMode("otp");
    setStartingOtp(true);
    try {
      const res = await apiPhoneOtpStart({ phone: rawPhone, purpose: "LOGIN" });
      if (!res.ok) {
        // Number shape rejected → fall back to the phone entry with guidance.
        setSigninMode("phone");
        setPhoneError(res.error.message);
        return;
      }
      setPhoneSession(res.session);
      setMockOtp(res.mockOtp);
      setOtp("");
      setOtpError(null);
    } catch {
      setSigninMode("phone");
      setPhoneError("Network error — try again.");
    } finally {
      setStartingOtp(false);
    }
  }

  // --- Sign-in ---------------------------------------------------------------
  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    const id = identifier.trim();

    // Phone-shaped identifiers sign in with a code — switch straight into the
    // OTP step (the password is irrelevant; the server routes phone-shaped
    // identifiers to OTP the same way via PHONE_OTP_REQUIRED).
    if (isPhoneShaped(id)) {
      await startSignInPhone(id);
      return;
    }

    const v: Record<string, string | null> = {
      identifier: fieldError(id, "identifier"),
      password: fieldError(password, "password"),
    };
    setValidation(v);
    if (Object.values(v).some(Boolean)) return;

    setSubmitting(true);
    try {
      const res = await apiLoginIdentifier({ identifier: id, password });
      if (!res.ok && res.phoneOtpRequired) {
        // No error shown — the form becomes the phone OTP step for that number.
        await startSignInPhone(id);
      }
      // Success switches the view (store); failures surfaced via store error.
    } catch {
      /* error already surfaced in store */
    } finally {
      setSubmitting(false);
    }
  }

  async function verifySignInOtp() {
    if (!phoneSession) return;
    setOtpBusy(true);
    setOtpError(null);
    try {
      const res = await apiPhoneOtpVerify({ sessionId: phoneSession.id, otp });
      if (!res.ok) {
        setOtpError(res.error.message);
        return;
      }
      if ("user" in res) {
        // Signed in — the store switches to the dashboard.
        return;
      }
      // REGISTER/LINK purposes never appear on the sign-in path.
      setOtpError("That code is invalid or expired.");
    } catch {
      setOtpError("Network error — try again.");
    } finally {
      setOtpBusy(false);
    }
  }

  // --- Password recovery -------------------------------------------------------
  async function onRecoverRequest(e: React.FormEvent) {
    e.preventDefault();
    const id = recoverIdentifier.trim();
    if (!id) {
      setRecoverError("Enter your username, email or phone number.");
      return;
    }
    setRecoverError(null);
    setRecoverBusy(true);
    try {
      const res = await apiRecoverRequest({ identifier: id });
      if (res.ok) {
        setMockToken(res.data.mockToken);
        setSigninMode("forgot-sent");
      } else {
        setRecoverError(res.error.message);
      }
    } catch {
      setRecoverError("Network error — try again.");
    } finally {
      setRecoverBusy(false);
    }
  }

  async function onRecoverConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!mockToken) return;
    const v: Record<string, string | null> = {};
    if (newPassword.length < 8) v.newPassword = "At least 8 characters";
    if (newConfirm !== newPassword) v.newConfirm = "Passwords do not match";
    setValidation(v);
    if (Object.values(v).some(Boolean)) return;

    setRecoverBusy(true);
    setRecoverError(null);
    try {
      const res = await apiRecoverConfirm({ token: mockToken, newPassword });
      if (res.ok) {
        setSigninMode("forgot-done");
      } else {
        setRecoverError(res.error.message);
      }
    } catch {
      setRecoverError("Network error — try again.");
    } finally {
      setRecoverBusy(false);
    }
  }

  async function copyToken() {
    if (!mockToken) return;
    try {
      await navigator.clipboard.writeText(mockToken);
    } catch {
      /* visible to copy manually */
    }
    setTokenCopied(true);
    window.setTimeout(() => setTokenCopied(false), 1600);
  }

  // --- Registration (email path) -------------------------------------------------
  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    const v: Record<string, string | null> = {
      displayName: fieldError(displayName, "displayName"),
      handle: fieldError(handle, "handle"),
      password: fieldError(password, "password"),
    };
    if (mail && !EMAIL_RE.test(mail)) v.email = "Enter a valid email address";
    if (confirm !== password) v.confirm = "Passwords do not match";
    if (!acceptTerms) v.terms = "Please accept the Terms & Privacy Policy";
    setValidation(v);
    setServerFieldErrors({});
    if (Object.values(v).some(Boolean)) return;

    setSubmitting(true);
    try {
      const res = await apiRegisterAccount({
        displayName: displayName.trim(),
        handle: handle.trim().toLowerCase(),
        email: mail || undefined,
        password,
        acceptTerms,
      });
      if (!res.ok) {
        // Inline field errors, not just the top alert.
        const fields: { handle?: string; email?: string } = {};
        if (res.error.code === "HANDLE_TAKEN") fields.handle = "That username is already reserved.";
        if (res.error.code === "HANDLE_INVALID") fields.handle = "That username is not available.";
        if (res.error.code === "EMAIL_TAKEN") fields.email = "An account with this email already exists.";
        if (res.error.code === "EMAIL_INVALID") fields.email = "Enter a valid email address.";
        setServerFieldErrors(fields);
      }
      // Success switches the view (store); the generic message also shows in
      // the top alert via the store error.
    } catch {
      /* error already surfaced in store */
    } finally {
      setSubmitting(false);
    }
  }

  // --- Registration (phone path) ---------------------------------------------------
  async function onRegisterPhoneSend(e: React.FormEvent) {
    e.preventDefault();
    const v: Record<string, string | null> = { phone: fieldError(phone, "phone") };
    setValidation(v);
    if (v.phone) return;
    const ok = await startPhoneOtp("REGISTER");
    if (ok) setSignupMode("phone-otp");
  }

  async function verifyRegisterOtp() {
    if (!phoneSession) return;
    setOtpBusy(true);
    setOtpError(null);
    try {
      const res = await apiPhoneOtpVerify({ sessionId: phoneSession.id, otp });
      if (!res.ok) {
        setOtpError(res.error.message);
        return;
      }
      if (!("user" in res) && (res.purpose === "REGISTER" || res.purpose === "LINK")) {
        setSignupMode("phone-details");
        return;
      }
      setOtpError("That code is invalid or expired.");
    } catch {
      setOtpError("Network error — try again.");
    } finally {
      setOtpBusy(false);
    }
  }

  async function onRegisterPhoneComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneSession) return;
    const mail = regEmail.trim().toLowerCase();
    const v: { displayName?: string; handle?: string; password?: string; email?: string } = {};
    if (fieldError(regName, "displayName")) v.displayName = "At least 2 characters";
    if (fieldError(regHandle, "handle")) v.handle = "3–24 chars: lowercase letters, numbers, underscore";
    if (regPassword && regPassword.length < 8) v.password = "At least 8 characters";
    if (mail && !EMAIL_RE.test(mail)) v.email = "Enter a valid email address";
    setRegFieldErrors(v);
    if (Object.values(v).some(Boolean)) return;

    setRegBusy(true);
    try {
      const res = await apiPhoneRegister({
        sessionId: phoneSession.id,
        displayName: regName.trim(),
        handle: regHandle.trim().toLowerCase(),
        password: regPassword || undefined,
        email: mail || undefined,
      });
      if (!res.ok) {
        const fields: typeof regFieldErrors = {};
        if (res.error.code === "HANDLE_TAKEN") fields.handle = "That username is already reserved.";
        if (res.error.code === "HANDLE_INVALID") fields.handle = "That username is not available.";
        if (res.error.code === "NAME_INVALID") fields.displayName = "Enter your full name.";
        if (res.error.code === "PHONE_TAKEN") {
          // Session stale → start over with a different number.
          resetOtpState();
          setSignupMode("phone-entry");
          setPhoneError(res.error.message);
        }
        setRegFieldErrors(fields);
      }
      // Success switches the view (store).
    } catch {
      /* error already surfaced in store */
    } finally {
      setRegBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section
      className="relative flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-12"
      aria-labelledby="auth-heading"
    >
      <div className="ts-grid-bg absolute inset-0" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <button
          onClick={() => setView("landing")}
          className="mb-4 flex min-h-11 items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        <Card className="ts-glow border-primary/20 shadow-xl">
          <CardHeader className="text-center">
            <span className="ts-icon-tile mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-primary">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <CardTitle id="auth-heading" className="font-display mt-4 text-2xl font-semibold tracking-tight">
              {tab === "signup" ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {tab === "signup"
                ? "Reserve your @handle — sign up with your details or your phone, then verify your Trust Identity with NINAuth (mock provider) in the dashboard."
                : "Sign in with your username, email or phone — or passwordless with NINAuth / Google."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* The flagship sign-in: passwordless via NINAuth.
                Brand treatment per the NINAuth guide: white, green accents. */}
            <Button
              type="button"
              onClick={() => void startNinAuth()}
              disabled={ninStarting}
              className="mt-1 min-h-12 w-full gap-2.5 border border-emerald-600/40 bg-white py-5 text-emerald-700 shadow-sm transition-all hover:-translate-y-px hover:bg-emerald-50 hover:text-emerald-800 dark:bg-white dark:text-emerald-700 dark:hover:bg-emerald-50"
              size="lg"
              data-testid="ninauth-signin-button"
            >
              {ninStarting ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white"
                  aria-hidden="true"
                >
                  <ShieldCheck className="h-3 w-3" />
                </span>
              )}
              Continue with NINAuth
            </Button>

            {/* Google — white card with the official multi-color "G" (mock provider). */}
            <Button
              type="button"
              onClick={() => void startGoogle()}
              disabled={googleStarting}
              className="mt-2.5 min-h-12 w-full gap-2.5 border border-neutral-300 bg-white py-5 text-neutral-800 shadow-sm transition-all hover:-translate-y-px hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-500 dark:bg-white dark:text-neutral-800 dark:hover:bg-neutral-50"
              size="lg"
              data-testid="google-signin-button"
            >
              {googleStarting ? (
                <Loader2 className="h-5 w-5 animate-spin text-neutral-500" aria-hidden="true" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
                  <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                or sign in with your details
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Tabs value={tab} onValueChange={(t) => setTab(t as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">Create account</TabsTrigger>
                <TabsTrigger value="signin">Sign in</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* ------------------------------------------------------- SIGN IN */}
              <TabsContent value="signin" className="mt-4">
                {signinMode === "form" && (
                  <form onSubmit={onSignIn} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="signin-identifier">Username, email or phone number</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="signin-identifier"
                          className="pl-9"
                          placeholder="ada, you@example.com or 0803…"
                          autoComplete="username"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          aria-invalid={!!validation.identifier}
                          required
                          data-testid="signin-identifier"
                        />
                      </div>
                      {validation.identifier && (
                        <p className="text-xs text-destructive">{validation.identifier}</p>
                      )}
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Phone numbers sign in with a one-time code instead of a password.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Password</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setRecoverIdentifier(identifier);
                            setRecoverError(null);
                            setMockToken(null);
                            setNewPassword("");
                            setNewConfirm("");
                            setSigninMode("forgot");
                          }}
                          className="rounded-sm text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="signin-password"
                          className="pl-9"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          aria-invalid={!!validation.password}
                          required
                          data-testid="signin-password"
                        />
                      </div>
                      {validation.password && (
                        <p className="text-xs text-destructive">{validation.password}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full"
                      size="lg"
                      disabled={submitting}
                      data-testid="signin-submit"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          resetOtpState();
                          setPhone(identifier.trim());
                          setPhoneError(null);
                          setSigninMode("phone");
                        }}
                        className="flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                        Sign in with a phone code
                      </button>
                    </div>
                  </form>
                )}

                {signinMode === "phone" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v: Record<string, string | null> = { phone: fieldError(phone, "phone") };
                      setValidation(v);
                      if (v.phone) return;
                      void (async () => {
                        const ok = await startPhoneOtp("LOGIN");
                        if (ok) setSigninMode("otp");
                      })();
                    }}
                    className="space-y-4"
                    noValidate
                  >
                    <div className="space-y-2">
                      <Label htmlFor="signin-phone">Phone number</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="signin-phone"
                          className="pl-9"
                          type="tel"
                          inputMode="tel"
                          placeholder="0803 123 4567"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          aria-invalid={!!validation.phone || !!phoneError}
                          required
                          autoFocus
                        />
                      </div>
                      {(validation.phone || phoneError) && (
                        <p className="text-xs text-destructive">{phoneError ?? validation.phone}</p>
                      )}
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Nigerian mobile numbers — we store only a salted fingerprint.
                      </p>
                    </div>
                    <Button type="submit" variant="outline" className="w-full" size="lg" disabled={startingOtp}>
                      {startingOtp ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending code…
                        </>
                      ) : (
                        "Send code"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneError(null);
                        setSigninMode("form");
                      }}
                      className="flex min-h-11 items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      Back to password sign-in
                    </button>
                  </form>
                )}

                {signinMode === "otp" && (startingOtp || phoneSession) && (
                  <div aria-live="polite">
                    {startingOtp && !phoneSession ? (
                      <div className="flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Sending your code…
                      </div>
                    ) : (
                      <PhoneOtpStep
                        phoneHint={phoneSession?.phoneHint ?? ""}
                        mockOtp={mockOtp}
                        value={otp}
                        onValueChange={setOtp}
                        onVerify={() => void verifySignInOtp()}
                        onBack={() => {
                          resetOtpState();
                          setSigninMode("phone");
                        }}
                        busy={otpBusy}
                        error={otpError}
                        verifyLabel="Verify & sign in"
                      />
                    )}
                  </div>
                )}

                {signinMode === "forgot" && (
                  <form onSubmit={onRecoverRequest} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="recover-identifier">Username, email or phone number</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="recover-identifier"
                          className="pl-9"
                          placeholder="ada, you@example.com or 0803…"
                          autoComplete="username"
                          value={recoverIdentifier}
                          onChange={(e) => setRecoverIdentifier(e.target.value)}
                          aria-invalid={!!recoverError}
                          required
                          autoFocus
                        />
                      </div>
                      {recoverError && (
                        <p className="text-xs text-destructive" role="alert">{recoverError}</p>
                      )}
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Reset instructions go out for whichever identifier your account uses.
                      </p>
                    </div>
                    <Button type="submit" variant="outline" className="w-full" size="lg" disabled={recoverBusy}>
                      {recoverBusy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        "Send reset link"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSigninMode("form")}
                      className="flex min-h-11 items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      Back to sign in
                    </button>
                  </form>
                )}

                {signinMode === "forgot-sent" && (
                  <form onSubmit={onRecoverConfirm} className="space-y-4" noValidate>
                    <p className="text-sm leading-snug">
                      If an account matches that identifier, reset instructions have
                      been sent. <span className="text-muted-foreground">The reset revokes every active session.</span>
                    </p>

                    {mockToken && (
                      <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                          MOCK email preview
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 break-all rounded-md bg-white/70 px-2.5 py-1.5 font-mono text-xs text-amber-900 dark:bg-black/30 dark:text-amber-200">
                            {mockToken}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0 gap-1 border-amber-500/40 bg-transparent text-[11px] text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                            onClick={() => void copyToken()}
                            aria-label="Copy reset token"
                          >
                            {tokenCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          This build has no email transport — the token your reset
                          email would carry is shown here.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="recover-new-password">New password</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="recover-new-password"
                          className="pl-9"
                          type="password"
                          placeholder="8+ characters"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          aria-invalid={!!validation.newPassword}
                          required
                        />
                      </div>
                      {validation.newPassword && (
                        <p className="text-xs text-destructive">{validation.newPassword}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recover-confirm">Confirm new password</Label>
                      <Input
                        id="recover-confirm"
                        type="password"
                        placeholder="Repeat password"
                        autoComplete="new-password"
                        value={newConfirm}
                        onChange={(e) => setNewConfirm(e.target.value)}
                        aria-invalid={!!validation.newConfirm}
                        required
                      />
                      {validation.newConfirm && (
                        <p className="text-xs text-destructive">{validation.newConfirm}</p>
                      )}
                    </div>

                    {recoverError && (
                      <p className="text-xs text-destructive" role="alert">{recoverError}</p>
                    )}

                    <Button type="submit" variant="outline" className="w-full" size="lg" disabled={recoverBusy}>
                      {recoverBusy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resetting…
                        </>
                      ) : (
                        "Reset password"
                      )}
                    </Button>
                  </form>
                )}

                {signinMode === "forgot-done" && (
                  <div className="space-y-4" role="status">
                    <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 text-sm">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <p>
                        Password reset. All sessions were signed out — sign in with
                        your new password.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      size="lg"
                      onClick={() => {
                        setPassword("");
                        setSigninMode("form");
                      }}
                    >
                      Back to sign in
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* ---------------------------------------------------- CREATE ACCOUNT */}
              <TabsContent value="signup" className="mt-4">
                {signupMode === "form" && (
                  <>
                    <form onSubmit={onRegister} className="space-y-4" noValidate>
                      <div className="space-y-2">
                        <Label htmlFor="reg-name">Full name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                          <Input
                            id="reg-name"
                            className="pl-9"
                            placeholder="Ada Obi"
                            autoComplete="name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            aria-invalid={!!validation.displayName}
                            required
                          />
                        </div>
                        {validation.displayName && (
                          <p className="text-xs text-destructive">{validation.displayName}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reg-handle">Username</Label>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                          <Input
                            id="reg-handle"
                            className="pl-9"
                            placeholder="ada"
                            autoComplete="off"
                            value={handle}
                            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                            aria-invalid={!!validation.handle || !!serverFieldErrors.handle}
                            required
                          />
                        </div>
                        {handle && HANDLE_RE.test(handle) && !serverFieldErrors.handle && (
                          <p className="flex items-center gap-1 text-xs text-primary">
                            <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                            trustscore.ng/@{handle}
                          </p>
                        )}
                        {(validation.handle || serverFieldErrors.handle) && (
                          <p className="text-xs text-destructive" role="alert">
                            {serverFieldErrors.handle ?? validation.handle}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reg-email">Email (optional)</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                          <Input
                            id="reg-email"
                            className="pl-9"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            aria-invalid={!!validation.email || !!serverFieldErrors.email}
                          />
                        </div>
                        {(validation.email || serverFieldErrors.email) && (
                          <p className="text-xs text-destructive" role="alert">
                            {serverFieldErrors.email ?? validation.email}
                          </p>
                        )}
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          Your fallback for recovery — add a phone or use NINAuth/Google instead.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="reg-password">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <Input
                              id="reg-password"
                              className="pl-9"
                              type="password"
                              placeholder="8+ characters"
                              autoComplete="new-password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              aria-invalid={!!validation.password}
                              required
                            />
                          </div>
                          {validation.password && (
                            <p className="text-xs text-destructive">{validation.password}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-confirm">Confirm</Label>
                          <Input
                            id="reg-confirm"
                            type="password"
                            placeholder="Repeat password"
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            aria-invalid={!!validation.confirm}
                            required
                          />
                          {validation.confirm && (
                            <p className="text-xs text-destructive">{validation.confirm}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="reg-terms"
                            checked={acceptTerms}
                            onCheckedChange={(c) => setAcceptTerms(c === true)}
                            aria-invalid={!!validation.terms}
                          />
                          <Label htmlFor="reg-terms" className="text-xs font-normal leading-snug text-muted-foreground">
                            I accept the Terms of Service and Privacy Policy, and consent to
                            TrustScore processing my account data under the Nigeria Data
                            Protection Act.
                          </Label>
                        </div>
                        {validation.terms && (
                          <p className="text-xs text-destructive">{validation.terms}</p>
                        )}
                      </div>

                      {/* The details path is the fallback — outline styling keeps the
                          NINAuth action (above) visually primary. */}
                      <Button type="submit" variant="outline" className="w-full" size="lg" disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account…
                          </>
                        ) : (
                          "Create account"
                        )}
                      </Button>
                    </form>

                    <button
                      type="button"
                      onClick={() => {
                        resetOtpState();
                        setPhoneError(null);
                        setPhone(identifier.trim());
                        setSignupMode("phone-entry");
                      }}
                      className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      data-testid="phone-register-switch"
                    >
                      <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                      Prefer your phone number? Sign up with a code instead
                    </button>
                  </>
                )}

                {signupMode === "phone-entry" && (
                  <form onSubmit={onRegisterPhoneSend} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone">Phone number</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="reg-phone"
                          className="pl-9"
                          type="tel"
                          inputMode="tel"
                          placeholder="0803 123 4567"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          aria-invalid={!!validation.phone || !!phoneError}
                          required
                          autoFocus
                        />
                      </div>
                      {(validation.phone || phoneError) && (
                        <p className="text-xs text-destructive" role="alert">
                          {phoneError ?? validation.phone}
                        </p>
                      )}
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Nigerian mobile numbers. We&apos;ll text a 6-digit code — the
                        number itself is the proof (stored only as a salted fingerprint).
                      </p>
                    </div>
                    <Button type="submit" variant="outline" className="w-full" size="lg" disabled={startingOtp}>
                      {startingOtp ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending code…
                        </>
                      ) : (
                        "Send code"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneError(null);
                        setSignupMode("form");
                      }}
                      className="flex min-h-11 items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      Back to email sign-up
                    </button>
                  </form>
                )}

                {signupMode === "phone-otp" && (startingOtp || phoneSession) && (
                  <div aria-live="polite">
                    {startingOtp && !phoneSession ? (
                      <div className="flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Sending your code…
                      </div>
                    ) : (
                      <PhoneOtpStep
                        phoneHint={phoneSession?.phoneHint ?? ""}
                        mockOtp={mockOtp}
                        value={otp}
                        onValueChange={setOtp}
                        onVerify={() => void verifyRegisterOtp()}
                        onBack={() => {
                          resetOtpState();
                          setSignupMode("phone-entry");
                        }}
                        busy={otpBusy}
                        error={otpError}
                        verifyLabel="Verify & continue"
                      />
                    )}
                  </div>
                )}

                {signupMode === "phone-details" && phoneSession && (
                  <form onSubmit={onRegisterPhoneComplete} className="space-y-4" noValidate>
                    <p className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        <span className="font-mono">{phoneSession.phoneHint}</span> verified —
                        finish your account below.
                      </span>
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="phone-reg-name">Full name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="phone-reg-name"
                          className="pl-9"
                          placeholder="Ada Obi"
                          autoComplete="name"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          aria-invalid={!!regFieldErrors.displayName}
                          required
                        />
                      </div>
                      {regFieldErrors.displayName && (
                        <p className="text-xs text-destructive" role="alert">{regFieldErrors.displayName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone-reg-handle">Username</Label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="phone-reg-handle"
                          className="pl-9"
                          placeholder="ada"
                          autoComplete="off"
                          value={regHandle}
                          onChange={(e) => setRegHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          aria-invalid={!!regFieldErrors.handle}
                          required
                        />
                      </div>
                      {regHandle && HANDLE_RE.test(regHandle) && !regFieldErrors.handle && (
                        <p className="flex items-center gap-1 text-xs text-primary">
                          <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                          trustscore.ng/@{regHandle}
                        </p>
                      )}
                      {regFieldErrors.handle && (
                        <p className="text-xs text-destructive" role="alert">{regFieldErrors.handle}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone-reg-email">Email (optional)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="phone-reg-email"
                          className="pl-9"
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          aria-invalid={!!regFieldErrors.email}
                        />
                      </div>
                      {regFieldErrors.email && (
                        <p className="text-xs text-destructive" role="alert">{regFieldErrors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone-reg-password">
                        Password (optional — you&apos;ll sign in with a code)
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="phone-reg-password"
                          className="pl-9"
                          type="password"
                          placeholder="8+ characters"
                          autoComplete="new-password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          aria-invalid={!!regFieldErrors.password}
                        />
                      </div>
                      {regFieldErrors.password && (
                        <p className="text-xs text-destructive" role="alert">{regFieldErrors.password}</p>
                      )}
                    </div>

                    <Button type="submit" variant="outline" className="w-full" size="lg" disabled={regBusy}>
                      {regBusy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account…
                        </>
                      ) : (
                        "Create account"
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
              NINAuth sign-in is passwordless — your identity is asserted by
              NIMC&apos;s NINAuth (mock provider in this build) and no raw NIN is
              ever collected. Google sign-in uses a mock provider in this build
              too. Your details — username, email or phone — remain the fallback,
              and none of these methods affect your trust score.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stage 16 — the simulated NINAuth app consent screen */}
      <NinAuthModal
        open={ninOpen}
        session={ninSession}
        consent={ninConsent}
        initialEmail={googleInitialEmail}
        onRestart={() => void startNinAuth()}
        restarting={ninStarting}
        onDismiss={() => {
          setNinOpen(false);
          setNinSession(null);
          setNinConsent(null);
        }}
      />

      {/* AUTH batch — the simulated Google account picker + consent screen */}
      <GoogleConsentModal
        open={googleOpen}
        mode="signin"
        session={googleSession}
        initialEmail={googleInitialEmail}
        onDismiss={() => {
          setGoogleOpen(false);
          setGoogleSession(null);
        }}
        onRestart={() => void startGoogle(true)}
      />
    </section>
  );
}
