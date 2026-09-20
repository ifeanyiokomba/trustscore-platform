// AUTH batch — Google authentication service ("Continue with Google").
// OAuth 2.0 + PKCE + state over the GoogleLoginSession table. Account
// resolution at the callback (design D4):
//   1. GOOGLE identifier (stable sub) already bound → LOGIN
//   2. sub unbound + Google email matches an account with a VERIFIED EMAIL
//      identifier → auto-LINK + login (Google's verified email = secure
//      ownership proof — the standard linking rule)
//   3. email matches an account whose EMAIL identifier is UNVERIFIED →
//      LINK_REQUIRED (never a silent merge: the user signs in with their
//      password first, then confirms linking via /auth/google/link)
//   4. no match → REGISTER (passwordless: scrypt hash of an unguessable
//      random value; password login impossible by construction)
//
// Product principle (D8): Google authentication establishes the ACCOUNT —
// it never establishes a verified Trust Identity and never affects trust.

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/platform/crypto";
import { recordAudit } from "@/lib/services/audit-service";
import {
  notifyUser,
  welcomeNotification,
} from "@/lib/services/notification-service";
import {
  linkIdentifier,
  resolveIdentifier,
  deriveHandle,
} from "@/lib/services/auth-identifier-service";
import { googleSubForEmail, normalizeEmail } from "@/lib/auth/identifiers";
import {
  GOOGLE_LOGIN_TTL_MS,
  GOOGLE_PROVIDER_NAME,
  GOOGLE_MODE,
  generatePkce,
  generateState,
  issueAuthorizationCode,
  hashCode,
  codeMatches,
  googleAuthorizationUrl,
  mockGoogleIdToken,
  validateGoogleIdToken,
  googleConsentScreen,
  GoogleTokenValidationError,
  assertGoogleLiveNotAttempted,
} from "@/lib/providers/google";

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

export async function startGoogleLogin(requestId: string) {
  // Same defense-in-depth as completeGoogleLogin — see assertGoogleLiveNotAttempted.
  assertGoogleLiveNotAttempted();

  const { verifier, challenge } = generatePkce();
  const state = generateState();
  const session = await db.googleLoginSession.create({
    data: {
      state,
      codeVerifier: verifier,
      codeChallenge: challenge,
      status: "AWAITING_CONSENT",
      expiresAt: new Date(Date.now() + GOOGLE_LOGIN_TTL_MS),
    },
  });
  await recordAudit({
    actorType: "ANONYMOUS",
    action: "AUTH_GOOGLE_START",
    subjectType: "GoogleLoginSession",
    subjectId: session.id,
    requestId,
    metadata: { outcome: "started", providerMode: GOOGLE_MODE },
  });
  return {
    id: session.id,
    status: session.status,
    authorizationUrl: googleAuthorizationUrl(state, challenge),
    provider: GOOGLE_PROVIDER_NAME,
    providerMode: GOOGLE_MODE,
    consentScreen: googleConsentScreen(),
    expiresAt: session.expiresAt.toISOString(),
    ttlMs: GOOGLE_LOGIN_TTL_MS,
  };
}

// ---------------------------------------------------------------------------
// Mock consent grant — simulates the user picking a Google account and
// approving/denying inside Google. In LIVE mode this endpoint disappears
// (the real Google consent does it and redirects to our callback).
// ---------------------------------------------------------------------------

export type GrantResult =
  | { ok: true; code: string; state: string }
  | {
      ok: false;
      code: "SESSION_NOT_FOUND" | "NOT_PENDING" | "EXPIRED" | "DENIED" | "EMAIL_INVALID";
    };

export async function applyGoogleGrant(
  input: { sessionId: string; decision: "GRANT" | "DENY"; email: string },
  requestId: string
): Promise<GrantResult> {
  const session = await db.googleLoginSession.findUnique({
    where: { id: input.sessionId },
  });
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  if (session.status === "DENIED") return { ok: false, code: "DENIED" };
  if (session.status !== "AWAITING_CONSENT") return { ok: false, code: "NOT_PENDING" };
  if (session.expiresAt.getTime() < Date.now()) {
    await db.googleLoginSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED", errorReason: "session_ttl" },
    });
    return { ok: false, code: "EXPIRED" };
  }

  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, code: "EMAIL_INVALID" };

  if (input.decision === "DENY") {
    await db.googleLoginSession.update({
      where: { id: session.id },
      data: { status: "DENIED", completedAt: new Date() },
    });
    await recordAudit({
      actorType: "ANONYMOUS",
      action: "AUTH_GOOGLE_DENIED",
      subjectType: "GoogleLoginSession",
      subjectId: session.id,
      requestId,
      metadata: { outcome: "denied" },
    });
    return { ok: false, code: "DENIED" };
  }

  const issued = issueAuthorizationCode();
  await db.googleLoginSession.update({
    where: { id: session.id },
    data: {
      status: "GRANTED",
      googleEmail: email,
      googleSub: googleSubForEmail(email),
      authorizationCodeHash: hashCode(issued.code),
      authorizationCodeExp: issued.expiresAt,
    },
  });
  await recordAudit({
    actorType: "ANONYMOUS",
    action: "AUTH_GOOGLE_GRANTED",
    subjectType: "GoogleLoginSession",
    subjectId: session.id,
    requestId,
    metadata: { outcome: "granted", providerMode: GOOGLE_MODE },
  });
  return { ok: true, code: issued.code, state: session.state };
}

// ---------------------------------------------------------------------------
// Callback — state check → one-time code + PKCE exchange → ID-token
// validation → account resolution.
// ---------------------------------------------------------------------------

export type GoogleCallbackResult =
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
        | "NOT_GRANTED"
        | "CODE_REUSED"
        | "EXCHANGE_FAILED"
        | "TOKEN_INVALID";
      reason?: string;
    }
  | {
      // Resolution rule 3: the email matches an UNVERIFIED account email —
      // never a silent merge. The caller signs in with their password and
      // confirms the link while this session is still GRANTED.
      ok: false;
      code: "LINK_REQUIRED";
      googleSessionId: string;
      emailHint: string;
    };

async function failGoogleSession(
  sessionId: string,
  reason: string,
  requestId: string
) {
  await db.googleLoginSession.update({
    where: { id: sessionId },
    data: { status: "EXPIRED", errorReason: reason, completedAt: new Date() },
  });
  await recordAudit({
    actorType: "ANONYMOUS",
    action: "AUTH_GOOGLE_FAILED",
    subjectType: "GoogleLoginSession",
    subjectId: sessionId,
    requestId,
    metadata: { outcome: "failed", reason },
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  const head = local.slice(0, 1);
  return `${head}${"•".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

export async function completeGoogleLogin(
  input: { sessionId: string; code: string; state: string },
  requestId: string
): Promise<GoogleCallbackResult> {
  // Defense in depth: proxy.ts already refuses to boot in production if
  // GOOGLE_MODE is LIVE (see assertGoogleLiveNotAttempted in google.ts for
  // why). Re-checked here too, so this function never mints a mock-signed
  // token and calls it a real login if it's ever reached some other way.
  assertGoogleLiveNotAttempted();

  const session = await db.googleLoginSession.findUnique({
    where: { id: input.sessionId },
  });
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };

  if (session.state !== input.state) {
    await failGoogleSession(session.id, "state_mismatch", requestId);
    return { ok: false, code: "BAD_STATE" };
  }
  if (session.status === "COMPLETED") return { ok: false, code: "CODE_REUSED" };
  if (session.status !== "GRANTED" || !session.authorizationCodeHash) {
    return { ok: false, code: "NOT_GRANTED" };
  }
  if (
    (session.authorizationCodeExp?.getTime() ?? 0) < Date.now() ||
    !codeMatches(session.authorizationCodeHash, input.code)
  ) {
    await failGoogleSession(session.id, "code_mismatch", requestId);
    return { ok: false, code: "EXCHANGE_FAILED", reason: "code" };
  }

  // Mock ID token mint + validation (in LIVE this is the token-endpoint call).
  let idToken: string;
  try {
    idToken = mockGoogleIdToken({
      sub: session.googleSub!,
      email: session.googleEmail!,
      nonce: session.state,
    });
  } catch {
    await failGoogleSession(session.id, "exchange_error", requestId);
    return { ok: false, code: "EXCHANGE_FAILED", reason: "exchange" };
  }

  let claims: { sub: string; email: string };
  try {
    claims = validateGoogleIdToken(idToken, session.state);
  } catch (err) {
    const reason = err instanceof GoogleTokenValidationError ? err.code : "validation_error";
    await failGoogleSession(session.id, `token_${reason}`, requestId);
    return { ok: false, code: "TOKEN_INVALID", reason };
  }

  // 1. Returning Google user.
  const bySub = await resolveIdentifier("GOOGLE", claims.sub);
  if (bySub.ok) {
    const user = await db.userAccount.findUnique({
      where: { id: bySub.userId },
      select: { status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return { ok: false, code: "SESSION_NOT_FOUND" };
    }
    await db.googleLoginSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await recordAudit({
      actorType: "USER",
      actorId: bySub.userId,
      action: "AUTH_GOOGLE_LOGIN",
      subjectType: "UserAccount",
      subjectId: bySub.userId,
      requestId,
      metadata: { outcome: "login" },
    });
    return { ok: true, userId: bySub.userId, outcome: "LOGIN" };
  }

  // 2/3. Email-based linking decision.
  const byEmail = await resolveIdentifier("EMAIL", claims.email);
  if (byEmail.ok) {
    const emailIdent = await db.authIdentifier.findUnique({
      where: { type_value: { type: "EMAIL", value: claims.email } },
      select: { userId: true, verified: true },
    });
    if (emailIdent?.verified) {
      // Auto-link: Google asserts verified email ownership.
      const user = await db.userAccount.findUnique({
        where: { id: byEmail.userId },
        select: { status: true },
      });
      if (!user || user.status !== "ACTIVE") {
        return { ok: false, code: "SESSION_NOT_FOUND" };
      }
      // Consume the session BEFORE the account write (crash-safe, no replay).
      await db.googleLoginSession.update({
        where: { id: session.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await linkIdentifier(byEmail.userId, "GOOGLE", claims.sub, {
        hint: claims.email,
        verified: true,
        requestId,
        syncAccount: false,
      });
      await recordAudit({
        actorType: "USER",
        actorId: byEmail.userId,
        action: "AUTH_GOOGLE_LINKED",
        subjectType: "UserAccount",
        subjectId: byEmail.userId,
        requestId,
        metadata: { outcome: "linked", rule: "verified_email" },
      });
      return { ok: true, userId: byEmail.userId, outcome: "LINKED" };
    }
    // Unverified email match — explicit linking flow required.
    return {
      ok: false,
      code: "LINK_REQUIRED",
      googleSessionId: session.id,
      emailHint: maskEmail(claims.email),
    };
  }

  // 4. Registration — passwordless account from the Google claims.
  // Consume the session BEFORE the account write (crash-safe, no replay).
  await db.googleLoginSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  const displayName = claims.email.split("@")[0].slice(0, 40) || "Google Member";
  const handle = await deriveHandle(displayName);
  const { hash, salt } = hashPassword(randomBytes(32).toString("base64url"));
  const created = await db.userAccount.create({
    data: {
      email: claims.email, // display convenience; login is via the GOOGLE identifier
      passwordHash: hash,
      passwordSalt: salt,
      displayName,
      handle,
      status: "ACTIVE",
    },
  });
  // Register the auth identifiers (canonical registry, design D1) — the
  // handle is a login identifier from day one, mirroring the email path
  // (matrix observation auth-7 #1).
  await linkIdentifier(created.id, "USERNAME", handle, {
    verified: true,
    requestId,
    makePrimary: false,
    syncAccount: true,
  });
  await linkIdentifier(created.id, "GOOGLE", claims.sub, {
    hint: claims.email,
    verified: true,
    requestId,
    makePrimary: true,
  });
  await linkIdentifier(created.id, "EMAIL", claims.email, {
    hint: claims.email,
    verified: true, // Google asserted verification
    requestId,
  });
  const notif = welcomeNotification(displayName);
  await notifyUser(created.id, "SYSTEM", notif.title, notif.body);
  await recordAudit({
    actorType: "USER",
    actorId: created.id,
    action: "AUTH_GOOGLE_REGISTERED",
    subjectType: "UserAccount",
    subjectId: created.id,
    requestId,
    metadata: { outcome: "registered" },
  });
  return { ok: true, userId: created.id, outcome: "REGISTERED" };
}

// ---------------------------------------------------------------------------
// Explicit account linking — platform-session-authenticated, against a still
// GRANTED google session (rule 3 continuation). Never merges accounts.
// ---------------------------------------------------------------------------

export type ConfirmLinkResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      code:
        | "SESSION_NOT_FOUND"
        | "NOT_GRANTED"
        | "EXPIRED"
        | "ALREADY_LINKED_TO_OTHER"
        | "ALREADY_LINKED"
        | "NOT_ACTIVE";
    };

export async function confirmGoogleLink(
  userId: string,
  googleSessionId: string,
  requestId: string
): Promise<ConfirmLinkResult> {
  const session = await db.googleLoginSession.findUnique({
    where: { id: googleSessionId },
  });
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  if (session.status !== "GRANTED" || !session.googleSub) {
    return { ok: false, code: "NOT_GRANTED" };
  }
  if (session.expiresAt.getTime() < Date.now()) {
    return { ok: false, code: "EXPIRED" };
  }
  const user = await db.userAccount.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (!user || user.status !== "ACTIVE") return { ok: false, code: "NOT_ACTIVE" };

  const link = await linkIdentifier(userId, "GOOGLE", session.googleSub, {
    hint: session.googleEmail ?? undefined,
    verified: true,
    requestId,
    makePrimary: false,
  });
  if (!link.ok) {
    return link.code === "TAKEN_BY_OTHER"
      ? { ok: false, code: "ALREADY_LINKED_TO_OTHER" }
      : { ok: false, code: "ALREADY_LINKED" };
  }

  // If the account has no email yet, adopt the Google email as the display one.
  const account = await db.userAccount.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!account?.email && session.googleEmail) {
    await db.userAccount.update({
      where: { id: userId },
      data: { email: session.googleEmail },
    });
    await linkIdentifier(userId, "EMAIL", session.googleEmail, {
      hint: session.googleEmail,
      verified: true,
      requestId,
    });
  }

  await db.googleLoginSession.update({
    where: { id: googleSessionId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "AUTH_GOOGLE_LINK_CONFIRMED",
    subjectType: "UserAccount",
    subjectId: userId,
    requestId,
    metadata: { outcome: "linked", rule: "explicit_confirm" },
  });
  return { ok: true, userId };
}

export async function notifyGoogleSignIn(userId: string, ua: string) {
  await notifyUser(
    userId,
    "SECURITY",
    "New sign-in to your account",
    `A session was opened via Google from "${ua}". If this wasn't you, revoke the session from your Identity Security Center.`
  );
}
