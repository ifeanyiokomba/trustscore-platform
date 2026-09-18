"use client";

import { readError, useTrustStore } from "@/lib/store";
import type { AuthIdentifierInfo, SessionUser } from "@/lib/types";

// Typed client for the Stage-1 auth contract (mirrors the future FastAPI /v1/* surface).
// AUTH batch (auth-6): multi-identifier login, phone OTP, Google OAuth (mock),
// recovery, identifier management. All fetches are relative paths.

// ---------------------------------------------------------------------------
// AUTH batch — response types (mirror /api/v1/auth/*)
// ---------------------------------------------------------------------------

export type PhoneOtpPurpose = "LOGIN" | "REGISTER" | "LINK" | "RECOVERY";

export interface PhoneOtpSessionInfo {
  id: string;
  phoneHint: string;
  expiresAt: string;
  purpose: PhoneOtpPurpose;
  providerMode: string;
}

export interface GoogleConsentScreenInfo {
  provider: string;
  providerMode: string;
  scopes: string[];
  purpose: string;
  sharing: string;
  policyUrl: string;
}

export interface GoogleSessionInfo {
  id: string;
  status: string;
  authorizationUrl: string;
  provider: string;
  providerMode: string;
  consentScreen: GoogleConsentScreenInfo;
  expiresAt: string;
  ttlMs: number;
}

export interface GoogleCallbackUser {
  user: SessionUser;
  outcome: "LOGIN" | "LINKED" | "REGISTERED";
}

export interface GoogleLinkRequired {
  linkRequired: true;
  googleSessionId: string;
  emailHint: string;
  message: string;
}

/** A structured API failure (code + message) for inline field errors. */
export interface ApiCallError {
  status: number;
  code: string;
  message: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiCallError };

async function callApi<T>(
  url: string,
  init: RequestInit
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON body */
    }
    if (!res.ok) {
      const err = (body as { error?: { code?: string; message?: string } } | null)
        ?.error;
      return {
        ok: false,
        error: {
          status: res.status,
          code: err?.code ?? "UNKNOWN",
          message: err?.message ?? "Something went wrong. Please try again.",
        },
      };
    }
    return { ok: true, data: body as T };
  } catch {
    return {
      ok: false,
      error: { status: 0, code: "NETWORK", message: "Network error — try again." },
    };
  }
}

function postJson<T>(url: string, payload: unknown): Promise<ApiResult<T>> {
  return callApi<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Legacy Stage-1 helpers (unchanged contracts — stage matrices pin them)
// ---------------------------------------------------------------------------

export async function apiRegister(input: {
  email: string;
  password: string;
  displayName: string;
  handle: string;
  acceptTerms: boolean;
}): Promise<SessionUser> {
  const { setPending, setError, setUser } = useTrustStore.getState();
  setPending(true);
  setError(null);
  try {
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const message = await readError(res);
      setError(message);
      throw new Error(message);
    }
    const body = await res.json();
    setUser(body.user);
    return body.user as SessionUser;
  } finally {
    setPending(false);
  }
}

export async function apiLogin(input: {
  email: string;
  password: string;
}): Promise<SessionUser> {
  const { setPending, setError, setUser } = useTrustStore.getState();
  setPending(true);
  setError(null);
  try {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const message = await readError(res);
      setError(message);
      throw new Error(message);
    }
    const body = await res.json();
    setUser(body.user);
    return body.user as SessionUser;
  } finally {
    setPending(false);
  }
}

/** AUTH batch registration — email OPTIONAL (username+password path).
 *  Signs the user in on success; returns the structured error so the form can
 *  map HANDLE_TAKEN / EMAIL_TAKEN / HANDLE_INVALID to inline field errors. */
export async function apiRegisterAccount(input: {
  displayName: string;
  handle: string;
  password: string;
  email?: string;
  acceptTerms: boolean;
}): Promise<ApiResult<{ user: SessionUser }>> {
  const { setPending, setError, setUser } = useTrustStore.getState();
  setPending(true);
  setError(null);
  try {
    const result = await postJson<{ user: SessionUser }>("/api/v1/auth/register", input);
    if (result.ok) setUser(result.data.user);
    else setError(result.error.message);
    return result;
  } finally {
    setPending(false);
  }
}

// ---------------------------------------------------------------------------
// AUTH batch — unified identifier login
// ---------------------------------------------------------------------------

export type LoginIdentifierResult =
  | { ok: true; user: SessionUser; identifierType: string }
  | { ok: false; phoneOtpRequired: boolean; error: ApiCallError };

/** Identifier login (username | email | phone). A phone-shaped identifier is
 *  routed by the server to the OTP flow (400 PHONE_OTP_REQUIRED) — the client
 *  switches to the phone OTP step instead of surfacing an error.
 *  `silent` skips store mutations (the Google link continuation signs the user
 *  in only after the link itself succeeds, so the modal never unmounts mid-flow). */
export async function apiLoginIdentifier(
  input: {
    identifier: string;
    password: string;
  },
  opts?: { silent?: boolean }
): Promise<LoginIdentifierResult> {
  const { setPending, setError, setUser } = useTrustStore.getState();
  if (!opts?.silent) {
    setPending(true);
    setError(null);
  }
  try {
    const result = await postJson<{ user: SessionUser; identifierType: string }>(
      "/api/v1/auth/login",
      input
    );
    if (result.ok) {
      if (!opts?.silent) setUser(result.data.user);
      return { ok: true, user: result.data.user, identifierType: result.data.identifierType };
    }
    if (result.error.code === "PHONE_OTP_REQUIRED") {
      // Not an error — the sign-in form switches into the phone OTP step.
      return { ok: false, phoneOtpRequired: true, error: result.error };
    }
    if (!opts?.silent) setError(result.error.message);
    return { ok: false, phoneOtpRequired: false, error: result.error };
  } finally {
    if (!opts?.silent) setPending(false);
  }
}

// ---------------------------------------------------------------------------
// AUTH batch — phone OTP (login / register / link)
// ---------------------------------------------------------------------------

export type PhoneOtpStartResult =
  | { ok: true; session: PhoneOtpSessionInfo; mockOtp: string | null }
  | { ok: false; error: ApiCallError };

export async function apiPhoneOtpStart(input: {
  phone: string;
  purpose: PhoneOtpPurpose;
}): Promise<PhoneOtpStartResult> {
  const result = await postJson<{ session: PhoneOtpSessionInfo; mockOtp: string | null }>(
    "/api/v1/auth/phone/start",
    input
  );
  if (result.ok) {
    return { ok: true, session: result.data.session, mockOtp: result.data.mockOtp };
  }
  return { ok: false, error: result.error };
}

export type PhoneOtpVerifyResult =
  | { ok: true; user: SessionUser; outcome: "LOGIN" } // LOGIN / RECOVERY — signed in
  | { ok: true; verified: true; purpose: PhoneOtpPurpose } // REGISTER / LINK — flow continues
  | { ok: false; error: ApiCallError };

/** Verify the 6-digit code. LOGIN/RECOVERY purposes complete sign-in here
 *  (cookie set server-side; the store user is set from the response). */
export async function apiPhoneOtpVerify(input: {
  sessionId: string;
  otp: string;
}): Promise<PhoneOtpVerifyResult> {
  const { setPending, setError, setUser } = useTrustStore.getState();
  setPending(true);
  setError(null);
  try {
    const result = await postJson<
      { user: SessionUser; outcome: "LOGIN" } | { verified: true; purpose: PhoneOtpPurpose }
    >("/api/v1/auth/phone/verify", input);
    if (result.ok) {
      if ("user" in result.data) {
        setUser(result.data.user);
        return { ok: true, user: result.data.user, outcome: "LOGIN" };
      }
      return { ok: true, verified: true, purpose: result.data.purpose };
    }
    setError(result.error.message);
    return { ok: false, error: result.error };
  } finally {
    setPending(false);
  }
}

/** Complete phone-first registration from a verified OTP session. Signs the
 *  user in (cookie set server-side). */
export async function apiPhoneRegister(input: {
  sessionId: string;
  displayName: string;
  handle: string;
  password?: string;
  email?: string;
}): Promise<ApiResult<{ user: SessionUser; outcome: "REGISTERED" }>> {
  const { setPending, setError, setUser } = useTrustStore.getState();
  setPending(true);
  setError(null);
  try {
    const result = await postJson<{ user: SessionUser; outcome: "REGISTERED" }>(
      "/api/v1/auth/phone/register",
      input
    );
    if (result.ok) setUser(result.data.user);
    else setError(result.error.message);
    return result;
  } finally {
    setPending(false);
  }
}

// ---------------------------------------------------------------------------
// AUTH batch — Google (mock OAuth 2.0: start → grant → callback → link)
// ---------------------------------------------------------------------------

export async function apiGoogleStart(): Promise<
  ApiResult<{ session: GoogleSessionInfo }>
> {
  return postJson<{ session: GoogleSessionInfo }>("/api/v1/auth/google/start", {});
}

export async function apiGoogleGrant(
  sessionId: string,
  input: { decision: "GRANT" | "DENY"; email: string }
): Promise<ApiResult<{ code: string; state: string }>> {
  return postJson<{ code: string; state: string }>(
    `/api/v1/auth/google/${sessionId}/grant`,
    input
  );
}

export type GoogleCallbackResult =
  | { ok: true; data: GoogleCallbackUser }
  | { ok: false; linkRequired?: GoogleLinkRequired; error: ApiCallError };

/** The OAuth callback: code + state → resolution (LOGIN / LINKED / REGISTERED
 *  → signed in, cookie set) or LINK_REQUIRED (password sign-in + explicit
 *  link). Signs the store user in on success. */
export async function apiGoogleCallback(
  sessionId: string,
  input: { code: string; state: string }
): Promise<GoogleCallbackResult> {
  const { setPending, setUser } = useTrustStore.getState();
  setPending(true);
  try {
    const result = await postJson<GoogleCallbackUser | GoogleLinkRequired>(
      `/api/v1/auth/google/${sessionId}/callback`,
      input
    );
    if (result.ok) {
      if ("user" in result.data) {
        setUser(result.data.user);
        return { ok: true, data: result.data };
      }
      // LINK_REQUIRED — not an authentication failure; the caller continues.
      return { ok: false, linkRequired: result.data, error: { status: 200, code: "LINK_REQUIRED", message: result.data.message } };
    }
    return { ok: false, error: result.error };
  } finally {
    setPending(false);
  }
}

/** Explicit Google link (authenticated caller — either after a password
 *  sign-in or from the Security Center while already signed in). */
export async function apiGoogleLink(input: {
  googleSessionId: string;
}): Promise<ApiResult<{ linked: true }>> {
  return postJson<{ linked: true }>("/api/v1/auth/google/link", input);
}

// ---------------------------------------------------------------------------
// AUTH batch — password recovery
// ---------------------------------------------------------------------------

export async function apiRecoverRequest(input: {
  identifier: string;
}): Promise<ApiResult<{ sent: boolean; message: string; mockToken: string | null }>> {
  return postJson<{ sent: boolean; message: string; mockToken: string | null }>(
    "/api/v1/auth/recover/password/request",
    input
  );
}

export async function apiRecoverConfirm(input: {
  token: string;
  newPassword: string;
}): Promise<ApiResult<{ reset: boolean; message: string }>> {
  return postJson<{ reset: boolean; message: string }>(
    "/api/v1/auth/recover/password/confirm",
    input
  );
}

// ---------------------------------------------------------------------------
// AUTH batch — identifier management (Security Center)
// ---------------------------------------------------------------------------

export async function apiListIdentifiers(): Promise<
  ApiResult<{ identifiers: AuthIdentifierInfo[] }>
> {
  return callApi<{ identifiers: AuthIdentifierInfo[] }>(
    "/api/v1/auth/identifiers",
    { method: "GET", cache: "no-store" }
  );
}

export async function apiUnlinkIdentifier(
  type: "GOOGLE" | "PHONE"
): Promise<ApiResult<{ unlinked: boolean; type: string }>> {
  return postJson<{ unlinked: boolean; type: string }>(
    `/api/v1/auth/identifiers/${type}/unlink`,
    {}
  );
}

export async function apiEmailVerifyRequest(): Promise<
  ApiResult<{ requested: boolean; mockCode: string | null; expiresAt: string }>
> {
  return postJson<{ requested: boolean; mockCode: string | null; expiresAt: string }>(
    "/api/v1/auth/email/verify/request",
    {}
  );
}

export async function apiEmailVerifyConfirm(input: {
  code: string;
}): Promise<ApiResult<{ verified: boolean; email: string }>> {
  return postJson<{ verified: boolean; email: string }>(
    "/api/v1/auth/email/verify/confirm",
    input
  );
}

/** Sign out from EVERY device. Clears the store user (back to landing). */
export async function apiLogoutAll(): Promise<
  ApiResult<{ signedOut: boolean; sessionsRevoked: number }>
> {
  const { setUser } = useTrustStore.getState();
  const result = await postJson<{ signedOut: boolean; sessionsRevoked: number }>(
    "/api/v1/auth/logout-all",
    {}
  );
  if (result.ok) setUser(null);
  return result;
}
