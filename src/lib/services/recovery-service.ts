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

import { randomBytes, randomInt, createHash } from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/platform/crypto";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser } from "@/lib/services/notification-service";
import { resolveIdentifier, markIdentifierVerified } from "@/lib/services/auth-identifier-service";
import {
  detectIdentifierType,
  normalizeEmail,
  normalizeUsername,
  normalizePhoneIdentifier,
} from "@/lib/auth/identifiers";

const PEPPER = process.env.SIGNAL_PEPPER ?? "ts_backend_only_signal_pepper";
export const RESET_TTL_MS = 15 * 60_000;
export const EMAIL_CODE_TTL_MS = 10 * 60_000;
const MAX_CODE_ATTEMPTS = 5;

function hashToken(token: string): string {
  return createHash("sha256").update(`${PEPPER}:reset:${token}`).digest("hex");
}
function hashEmailCode(code: string): string {
  return createHash("sha256").update(`${PEPPER}:emailcode:${code}`).digest("hex");
}

// ---------------------------------------------------------------------------
// Password reset — request
// ---------------------------------------------------------------------------

export type ResetRequestResult = {
  // ALWAYS the same shape, whether or not an account matched.
  ok: true;
  sent: true;
  message: string;
  // MOCK delivery only — the sandbox token. Production: null (real email).
  // A fake token is returned even when NO account matched so the response
  // shape cannot distinguish existence; the fake token fails at confirm
  // with the same generic error as an expired real one.
  mockToken: string;
};

export async function requestPasswordReset(
  input: { identifier: string },
  requestId: string
): Promise<ResetRequestResult> {
  const raw = input.identifier.trim();
  const type = detectIdentifierType(raw);

  let userId: string | null = null;
  if (type === "EMAIL") {
    const email = normalizeEmail(raw);
    if (email) {
      const resolved = await resolveIdentifier("EMAIL", email);
      if (resolved.ok) userId = resolved.userId;
    }
  } else if (type === "USERNAME") {
    const username = normalizeUsername(raw) ?? raw.toLowerCase();
    const resolved = await resolveIdentifier("USERNAME", username);
    if (resolved.ok) userId = resolved.userId;
  } else if (type === "PHONE") {
    const phone = normalizePhoneIdentifier(raw);
    if (phone) {
      const resolved = await resolveIdentifier("PHONE", phone.hash);
      if (resolved.ok) userId = resolved.userId;
    }
  }

  if (!userId) {
    // No account matched: identical response (with a decoy token).
    return {
      ok: true,
      sent: true,
      message: "If an account matches that identifier, reset instructions have been sent.",
      mockToken: randomBytes(24).toString("base64url"),
    };
  }

  const token = randomBytes(24).toString("base64url");
  await db.passwordResetSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  await notifyUser(
    userId,
    "SECURITY",
    "Password reset requested",
    "A password reset was requested for your account. The link expires in 15 minutes. If this wasn't you, no action is needed — your password is unchanged."
  );
  await recordAudit({
    actorType: "ANONYMOUS",
    action: "AUTH_RESET_REQUESTED",
    subjectType: "UserAccount",
    subjectId: userId,
    requestId,
    metadata: { outcome: "requested", identifierType: type ?? "unknown" },
  });
  return {
    ok: true,
    sent: true,
    message: "If an account matches that identifier, reset instructions have been sent.",
    mockToken: token,
  };
}

// ---------------------------------------------------------------------------
// Password reset — confirm
// ---------------------------------------------------------------------------

export type ResetConfirmResult =
  | { ok: true; userId: string }
  | { ok: false; code: "TOKEN_INVALID" | "PASSWORD_WEAK" };

export async function confirmPasswordReset(
  input: { token: string; newPassword: string },
  requestId: string
): Promise<ResetConfirmResult> {
  if (input.newPassword.length < 8 || input.newPassword.length > 128) {
    return { ok: false, code: "PASSWORD_WEAK" };
  }
  const session = await db.passwordResetSession.findUnique({
    where: { tokenHash: hashToken(input.token) },
  });
  if (
    !session ||
    session.status !== "PENDING" ||
    session.expiresAt.getTime() < Date.now()
  ) {
    // Generic: expired, used, and decoy tokens are indistinguishable.
    if (session && session.status === "PENDING" && session.expiresAt.getTime() < Date.now()) {
      await db.passwordResetSession.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      });
    }
    return { ok: false, code: "TOKEN_INVALID" };
  }

  const { hash, salt } = hashPassword(input.newPassword);
  await db.$transaction([
    db.passwordResetSession.update({
      where: { id: session.id },
      data: { status: "USED", usedAt: new Date() },
    }),
    db.userAccount.update({
      where: { id: session.userId },
      data: { passwordHash: hash, passwordSalt: salt },
    }),
    // Session revocation on credential rotation — every device signs out.
    db.session.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await notifyUser(
    session.userId,
    "SECURITY",
    "Password changed",
    "Your password was reset and all sessions were signed out. If this wasn't you, contact support immediately."
  );
  await recordAudit({
    actorType: "USER",
    actorId: session.userId,
    action: "AUTH_RESET_CONFIRMED",
    subjectType: "UserAccount",
    subjectId: session.userId,
    requestId,
    metadata: { outcome: "reset_confirmed", sessionsRevoked: true },
  });
  return { ok: true, userId: session.userId };
}

// ---------------------------------------------------------------------------
// Email verification (authenticated) — request + confirm
// ---------------------------------------------------------------------------

export type EmailVerifyRequestResult =
  | {
      ok: true;
      // MOCK delivery only — production swaps in the email transport.
      mockCode: string;
      expiresAt: string;
    }
  | { ok: false; code: "NO_EMAIL" | "ALREADY_VERIFIED" | "RATE_LIMITED" };

export async function requestEmailVerification(
  userId: string,
  requestId: string
): Promise<EmailVerifyRequestResult> {
  const user = await db.userAccount.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return { ok: false, code: "NO_EMAIL" };
  const ident = await db.authIdentifier.findUnique({
    where: { type_value: { type: "EMAIL", value: user.email } },
    select: { id: true, verified: true },
  });
  if (ident?.verified) return { ok: false, code: "ALREADY_VERIFIED" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.platformSetting.upsert({
    where: { key: `emailverify:${userId}` },
    create: {
      key: `emailverify:${userId}`,
      value: JSON.stringify({
        codeHash: hashEmailCode(code),
        email: user.email,
        attempts: 0,
        expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString(),
      }),
    },
    update: {
      value: JSON.stringify({
        codeHash: hashEmailCode(code),
        email: user.email,
        attempts: 0,
        expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString(),
      }),
    },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "AUTH_EMAIL_VERIFY_REQUESTED",
    subjectType: "UserAccount",
    subjectId: userId,
    requestId,
    metadata: { outcome: "requested" },
  });
  return {
    ok: true,
    mockCode: code,
    expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString(),
  };
}

export type EmailVerifyConfirmResult =
  | { ok: true; email: string }
  | { ok: false; code: "NO_PENDING" | "CODE_INVALID" | "MAX_ATTEMPTS" | "EXPIRED" };

export async function confirmEmailVerification(
  userId: string,
  input: { code: string },
  requestId: string
): Promise<EmailVerifyConfirmResult> {
  const setting = await db.platformSetting.findUnique({
    where: { key: `emailverify:${userId}` },
  });
  if (!setting) return { ok: false, code: "NO_PENDING" };
  const pending = JSON.parse(setting.value) as {
    codeHash: string;
    email: string;
    attempts: number;
    expiresAt: string;
  };
  if (new Date(pending.expiresAt).getTime() < Date.now()) {
    await db.platformSetting.delete({ where: { key: `emailverify:${userId}` } });
    return { ok: false, code: "EXPIRED" };
  }
  if (pending.attempts >= MAX_CODE_ATTEMPTS) {
    await db.platformSetting.delete({ where: { key: `emailverify:${userId}` } });
    return { ok: false, code: "MAX_ATTEMPTS" };
  }
  if (hashEmailCode(input.code) !== pending.codeHash) {
    await db.platformSetting.update({
      where: { key: `emailverify:${userId}` },
      data: {
        value: JSON.stringify({ ...pending, attempts: pending.attempts + 1 }),
      },
    });
    return { ok: false, code: "CODE_INVALID" };
  }

  await markIdentifierVerified(userId, "EMAIL", pending.email);
  await db.platformSetting.delete({ where: { key: `emailverify:${userId}` } });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "AUTH_EMAIL_VERIFIED",
    subjectType: "AuthIdentifier",
    subjectId: `EMAIL:${pending.email.slice(0, 12)}`,
    requestId,
    metadata: { outcome: "verified" },
  });
  return { ok: true, email: pending.email };
}
