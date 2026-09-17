// TrustScore Stage 16 — NINAuth authentication service ("Continue with
// NINAuth"). Passwordless login over the same OAuth 2.0 + PKCE + signed
// assertion contract as identity verification (developer-guide directive):
//
//   start → (user approves in the NINAuth app) → callback (code + PKCE
//   exchange + ID-token validation + scope guard) → UserAccount binding.
//
// Account resolution order at the callback:
//   1. ninauthSubject already bound  → sign in (returning NINAuth user)
//   2. email matches an account      → bind the subject, sign in (linking)
//   3. otherwise                     → create a passwordless account from the
//                                      consented claims (name scope optional)
//
// The mock NINAuth app binds to the confirmed email (the stand-in for the
// biometrically-bound NINAuth identity) — honestly labeled everywhere. In
// LIVE posture the partner's stable subject arrives in the signed assertion.
//
// Security invariants (same as the identity spine):
//   - PKCE verifier never leaves the server.
//   - Authorization codes are one-time, hashed at rest, 60s TTL.
//   - ID tokens are VALIDATED (signature, issuer, audience, expiry, nonce).
//   - The scope guard runs before ANY NINAuth-derived write.
//   - Passwordless accounts hold an scrypt hash of an unguessable random
//     value that is never disclosed — password login is impossible for them.

import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/platform/crypto";
import { recordAudit } from "@/lib/services/audit-service";
import {
  notifyUser,
  welcomeNotification,
} from "@/lib/services/notification-service";
import {
  AUTH_PURPOSE,
  AUTH_LOGIN_TTL_MS,
  AUTH_SCOPES,
  CORE_SCOPES,
  SCOPE_CATALOG,
  generatePkce,
  generateState,
  authAuthorizationUrlFor,
  issueAuthorizationCode,
  hashCode,
  codeMatches,
  mockAuthTokenExchange,
  validateIdToken,
  maskedSubjectForAuthKey,
  mockProfileFor,
  consentScreenFor,
  NINAUTH_MODE,
  NINAUTH_PROVIDER_NAME,
  TokenValidationError,
} from "@/lib/providers/ninauth";
import { enforceScopePipeline } from "@/lib/providers/scope-guard";

const LOGIN_TERMINAL = new Set(["COMPLETED", "DENIED", "EXPIRED"]);

// Auth may request the core identity scopes plus the optional name scope
// (used to name a new account). Anything else is rejected (purpose limitation).
const AUTH_ALLOWED_SCOPES = [...AUTH_SCOPES, "profile.name"];

export function authConsentScreen() {
  return consentScreenFor(AUTH_ALLOWED_SCOPES);
}

// ---------------------------------------------------------------------------
// Start — create the login session (PKCE generated server-side)
// ---------------------------------------------------------------------------

export async function startNinAuthLogin(requestId: string) {
  const { verifier, challenge } = generatePkce();
  const state = generateState();
  const session = await db.ninAuthLoginSession.create({
    data: {
      state,
      codeVerifier: verifier,
      codeChallenge: challenge,
      scopes: JSON.stringify(AUTH_SCOPES),
      status: "AWAITING_APPROVAL",
      expiresAt: new Date(Date.now() + AUTH_LOGIN_TTL_MS),
    },
  });
  const authorizationUrl = authAuthorizationUrlFor(state, challenge);
  await recordAudit({
    actorType: "ANONYMOUS",
    action: "AUTH_NINAUTH_START",
    subjectType: "NinAuthLoginSession",
    subjectId: session.id,
    requestId,
    metadata: { outcome: "started", providerMode: NINAUTH_MODE },
  });
  return {
    id: session.id,
    status: session.status,
    authorizationUrl,
    purpose: AUTH_PURPOSE,
    provider: NINAUTH_PROVIDER_NAME,
    providerMode: NINAUTH_MODE,
    expiresAt: session.expiresAt.toISOString(),
    ttlMs: AUTH_LOGIN_TTL_MS,
  };
}

// ---------------------------------------------------------------------------
// Approval — simulates the user acting inside the NINAuth app.
// In LIVE mode this endpoint disappears; the user approves in the real
// NINAuth app and NINAuth redirects to our callback with the code.
// ---------------------------------------------------------------------------

export type ApprovalResult =
  | { ok: true; code: string; state: string }
  | {
      ok: false;
      code:
        | "SESSION_NOT_FOUND"
        | "NOT_PENDING"
        | "EXPIRED"
        | "DENIED"
        | "SCOPE_INVALID";
    };

export async function applyNinAuthApproval(
  input: {
    sessionId: string;
    decision: "GRANT" | "DENY";
    email: string;
    grantedScopes?: string[];
  },
  requestId: string
): Promise<ApprovalResult> {
  const session = await db.ninAuthLoginSession.findUnique({
    where: { id: input.sessionId },
  });
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  if (session.status === "DENIED") return { ok: false, code: "DENIED" };
  if (session.status !== "AWAITING_APPROVAL") return { ok: false, code: "NOT_PENDING" };
  if (session.expiresAt.getTime() < Date.now()) {
    await db.ninAuthLoginSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED", errorReason: "session_ttl" },
    });
    return { ok: false, code: "EXPIRED" };
  }

  if (input.decision === "DENY") {
    await db.ninAuthLoginSession.update({
      where: { id: session.id },
      data: { status: "DENIED", completedAt: new Date() },
    });
    await recordAudit({
      actorType: "ANONYMOUS",
      action: "AUTH_NINAUTH_DENIED",
      subjectType: "NinAuthLoginSession",
      subjectId: session.id,
      requestId,
      metadata: { outcome: "denied" },
    });
    return { ok: false, code: "DENIED" };
  }

  // Granular consent: core scopes mandatory; only the allowed optional scope
  // (profile.name) may be added; anything else is rejected.
  let finalScopes = [...AUTH_SCOPES];
  if (input.grantedScopes) {
    const valid =
      input.grantedScopes.every((s) => AUTH_ALLOWED_SCOPES.includes(s)) &&
      CORE_SCOPES.every((c) => input.grantedScopes!.includes(c));
    if (!valid) return { ok: false, code: "SCOPE_INVALID" };
    finalScopes = input.grantedScopes;
  }

  // The NINAuth side issues a one-time authorization code (60s TTL); we store
  // only its timing-safe hash plus the confirmed binding email.
  const issued = issueAuthorizationCode();
  await db.ninAuthLoginSession.update({
    where: { id: session.id },
    data: {
      status: "APPROVED",
      scopes: JSON.stringify(finalScopes),
      authEmail: input.email,
      authorizationCodeHash: hashCode(issued.code),
      authorizationCodeExp: issued.expiresAt,
    },
  });
  await recordAudit({
    actorType: "ANONYMOUS",
    action: "AUTH_NINAUTH_APPROVED",
    subjectType: "NinAuthLoginSession",
    subjectId: session.id,
    requestId,
    metadata: { outcome: "approved", scopes: finalScopes.length, providerMode: NINAUTH_MODE },
  });
  return { ok: true, code: issued.code, state: session.state };
}

// ---------------------------------------------------------------------------
// Callback — validate state, exchange the code (PKCE), validate the ID token,
// run the scope guard, then bind / link / create the UserAccount.
// ---------------------------------------------------------------------------

export type AuthCallbackResult =
  | {
      ok: true;
      userId: string;
      outcome: "LOGIN" | "LINKED" | "REGISTERED";
    }
  | {
      ok: false;
      code:
        | "SESSION_NOT_FOUND"
        | "BAD_STATE"
        | "NOT_APPROVED"
        | "CODE_REUSED"
        | "EXCHANGE_FAILED"
        | "TOKEN_INVALID"
        | "SCOPE_GUARD_BLOCKED";
      reason?: string;
    };

async function failLoginSession(
  sessionId: string,
  reason: string,
  requestId: string
) {
  await db.ninAuthLoginSession.update({
    where: { id: sessionId },
    data: { status: "EXPIRED", errorReason: reason, completedAt: new Date() },
  });
  await recordAudit({
    actorType: "ANONYMOUS",
    action: "AUTH_NINAUTH_FAILED",
    subjectType: "NinAuthLoginSession",
    subjectId: sessionId,
    requestId,
    metadata: { outcome: "failed", reason },
  });
}

// Deterministic, collision-tolerant handle from the consented given name.
async function deriveHandle(givenName: string | undefined): Promise<string> {
  const base = (givenName ?? "member")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 18) || "member";
  let candidate = base.length >= 3 ? base : `${base}_user`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const taken = await db.userAccount.findUnique({
      where: { handle: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
    candidate = `${base.slice(0, 18)}_${randomBytes(2).toString("hex")}`;
  }
  return `member_${randomBytes(4).toString("hex")}`;
}

export async function completeNinAuthLogin(
  input: { sessionId: string; code: string; state: string },
  requestId: string
): Promise<AuthCallbackResult> {
  const session = await db.ninAuthLoginSession.findUnique({
    where: { id: input.sessionId },
  });
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };

  // State must match exactly (anti-CSRF); also rejects replayed callbacks.
  if (session.state !== input.state) {
    await failLoginSession(session.id, "state_mismatch", requestId);
    return { ok: false, code: "BAD_STATE" };
  }
  if (session.status === "COMPLETED") return { ok: false, code: "CODE_REUSED" };
  if (session.status !== "APPROVED" || !session.authorizationCodeHash) {
    return { ok: false, code: "NOT_APPROVED" };
  }
  if (!codeMatches(session.authorizationCodeHash, input.code)) {
    await failLoginSession(session.id, "code_mismatch", requestId);
    return { ok: false, code: "EXCHANGE_FAILED", reason: "code" };
  }

  // Token exchange (one-time code + PKCE verified inside) against the mock
  // provider transport, then full ID-token validation.
  const scopes = JSON.parse(session.scopes) as string[];
  const authEmail = session.authEmail ?? "";
  let idToken: string;
  try {
    const tokens = mockAuthTokenExchange({
      code: input.code,
      storedCodeHash: session.authorizationCodeHash,
      codeExpiresAt: session.authorizationCodeExp ?? new Date(0),
      codeVerifier: session.codeVerifier,
      codeChallenge: session.codeChallenge,
      nonce: session.state,
      maskedSubject: maskedSubjectForAuthKey(authEmail),
      authEmail,
      scopes,
      profile: mockProfileFor(authEmail),
    });
    idToken = tokens.id_token;
  } catch (err) {
    const reason = err instanceof TokenValidationError ? err.code : "exchange_error";
    await failLoginSession(session.id, reason, requestId);
    return { ok: false, code: "EXCHANGE_FAILED", reason };
  }

  let claims;
  try {
    claims = validateIdToken(idToken, session.state);
  } catch (err) {
    const reason = err instanceof TokenValidationError ? err.code : "validation_error";
    await failLoginSession(session.id, `token_${reason}`, requestId);
    return { ok: false, code: "TOKEN_INVALID", reason };
  }

  // The scope-enforcement pipeline (code-review blocker, runtime-enforced):
  // raw-identifier tripwire + granted-scope whitelist + minimal shape. This
  // runs BEFORE any account write touches NINAuth-derived data.
  let sanitized;
  try {
    sanitized = enforceScopePipeline(claims, scopes);
  } catch {
    await failLoginSession(session.id, "raw_identifier_blocked", requestId);
    await recordAudit({
      actorType: "SYSTEM",
      action: "SCOPE_GUARD_BLOCKED",
      subjectType: "NinAuthLoginSession",
      subjectId: session.id,
      requestId,
      metadata: { outcome: "blocked", reason: "raw_identifier" },
    });
    return { ok: false, code: "SCOPE_GUARD_BLOCKED" };
  }

  // Mark the login session consumed BEFORE account writes so a crash can
  // never leave a replayable code behind.
  await db.ninAuthLoginSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  // 1. Returning NINAuth user — the subject is already bound.
  const bySubject = await db.userAccount.findUnique({
    where: { ninauthSubject: sanitized.sub },
  });
  if (bySubject) {
    if (bySubject.status !== "ACTIVE") {
      return { ok: false, code: "SESSION_NOT_FOUND" };
    }
    await recordAudit({
      actorType: "USER",
      actorId: bySubject.id,
      action: "AUTH_NINAUTH_LOGIN",
      subjectType: "UserAccount",
      subjectId: bySubject.id,
      requestId,
      metadata: { outcome: "login" },
    });
    return { ok: true, userId: bySubject.id, outcome: "LOGIN" };
  }

  // 2. Linking — the confirmed email matches an existing account: bind the
  //    NINAuth subject to it (passwordless sign-in from now on).
  const byEmail = await db.userAccount.findUnique({
    where: { email: sanitized.email ?? "" },
  });
  if (byEmail) {
    if (byEmail.status !== "ACTIVE") {
      return { ok: false, code: "SESSION_NOT_FOUND" };
    }
    await db.userAccount.update({
      where: { id: byEmail.id },
      data: { ninauthSubject: sanitized.sub, ninauthLinkedAt: new Date() },
    });
    await recordAudit({
      actorType: "USER",
      actorId: byEmail.id,
      action: "AUTH_NINAUTH_LINKED",
      subjectType: "UserAccount",
      subjectId: byEmail.id,
      requestId,
      metadata: { outcome: "linked" },
    });
    return { ok: true, userId: byEmail.id, outcome: "LINKED" };
  }

  // 3. Registration — a passwordless account created from the consented
  //    claims. The password is an unguessable random value that is never
  //    disclosed: password login is impossible by construction.
  const given = sanitized.profile.given_name;
  const family = sanitized.profile.family_name;
  const displayName =
    given && family ? `${given} ${family}` : "Verified Member";
  const handle = await deriveHandle(given);
  const { hash, salt } = hashPassword(randomBytes(32).toString("base64url"));
  const created = await db.userAccount.create({
    data: {
      email: sanitized.email ?? `ninauth-${randomBytes(8).toString("hex")}@ninauth.local`,
      passwordHash: hash,
      passwordSalt: salt,
      displayName,
      handle,
      status: "ACTIVE",
      ninauthSubject: sanitized.sub,
      ninauthLinkedAt: new Date(),
    },
  });
  const notif = welcomeNotification(displayName);
  await notifyUser(created.id, "SYSTEM", notif.title, notif.body);
  await recordAudit({
    actorType: "USER",
    actorId: created.id,
    action: "AUTH_NINAUTH_REGISTERED",
    subjectType: "UserAccount",
    subjectId: created.id,
    requestId,
    metadata: { outcome: "registered", scopes: sanitized.scopes.length },
  });
  return { ok: true, userId: created.id, outcome: "REGISTERED" };
}

// Security notification on every NINAuth sign-in (device + time), mirroring
// the password sign-in contract in the Stage 5 Security Center.
export async function notifyNinAuthSignIn(userId: string, req: NextRequest) {
  const ua = (req.headers.get("user-agent") ?? "unknown device").slice(0, 120);
  await notifyUser(
    userId,
    "SECURITY",
    "New sign-in to your account",
    `A session was opened via NINAuth from "${ua}". If this wasn't you, revoke the session from your Identity Security Center.`
  );
}
