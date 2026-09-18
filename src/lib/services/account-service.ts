// TrustScore Stage 1 — AccountService (directive §28 service separation).
// Registration, login, session lifecycle. All input validation is zod-based at
// the route layer; this service assumes validated input.

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/platform/crypto";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser, welcomeNotification } from "@/lib/services/notification-service";
import {
  linkIdentifier,
  resolveIdentifier,
  deriveHandle,
} from "@/lib/services/auth-identifier-service";
import {
  detectIdentifierType,
  normalizeEmail,
  normalizeUsername,
  normalizePhoneIdentifier,
  RESERVED_USERNAMES,
} from "@/lib/auth/identifiers";

export interface RegisterInput {
  // AUTH batch — email is OPTIONAL (username+password, phone+OTP, or Google
  // registration paths exist). The username (handle) stays required: it is
  // the public profile handle and a login identifier.
  email?: string;
  password: string;
  displayName: string;
  handle: string;
  acceptTerms: boolean;
}

export interface LoginInput {
  // AUTH batch — the unified identifier field. Legacy `email` callers keep
  // working (stage matrices pin the old shape); identifier takes precedence.
  identifier?: string;
  email?: string;
  password: string;
}

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; code: "EMAIL_TAKEN" | "HANDLE_TAKEN" | "HANDLE_INVALID" | "EMAIL_INVALID" };

export async function registerUser(
  input: RegisterInput,
  requestId: string
): Promise<RegisterResult> {
  const handle = input.handle.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(handle) || RESERVED_USERNAMES.has(handle))
    return { ok: false, code: "HANDLE_INVALID" };

  const email = input.email?.trim().toLowerCase() || undefined;
  if (email && !normalizeEmail(email)) return { ok: false, code: "EMAIL_INVALID" };

  if (email) {
    const existingEmail = await db.userAccount.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) return { ok: false, code: "EMAIL_TAKEN" };
    const identEmail = await db.authIdentifier.findUnique({
      where: { type_value: { type: "EMAIL", value: email } },
      select: { id: true },
    });
    if (identEmail) return { ok: false, code: "EMAIL_TAKEN" };
  }

  const existingHandle = await db.userAccount.findUnique({
    where: { handle },
    select: { id: true },
  });
  if (existingHandle) return { ok: false, code: "HANDLE_TAKEN" };
  const identHandle = await db.authIdentifier.findUnique({
    where: { type_value: { type: "USERNAME", value: handle } },
    select: { id: true },
  });
  if (identHandle) return { ok: false, code: "HANDLE_TAKEN" };

  const { hash, salt } = hashPassword(input.password);
  const user = await db.userAccount.create({
    data: {
      email: email ?? null,
      passwordHash: hash,
      passwordSalt: salt,
      displayName: input.displayName,
      handle,
      status: "ACTIVE",
    },
  });

  // Register the auth identifiers (canonical registry, design D1).
  await linkIdentifier(user.id, "USERNAME", handle, {
    verified: true, // username possession = account creation, not email proof
    requestId,
    makePrimary: !email,
    syncAccount: true,
  });
  if (email) {
    await linkIdentifier(user.id, "EMAIL", email, {
      verified: false, // email verification is its own flow (linking/recovery gate)
      requestId,
      makePrimary: true,
      syncAccount: true,
    });
  }

  const notif = welcomeNotification(input.displayName);
  await notifyUser(user.id, "SYSTEM", notif.title, notif.body);
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "AUTH_REGISTER",
    subjectType: "UserAccount",
    subjectId: user.id,
    requestId,
    metadata: { outcome: "created", withEmail: !!email },
  });

  return { ok: true, userId: user.id };
}

export type LoginResult =
  | { ok: true; userId: string }
  | { ok: false; code: "INVALID_CREDENTIALS" | "PHONE_OTP_REQUIRED" };

export async function authenticateUser(
  input: LoginInput,
  requestId: string,
  req?: NextRequest
): Promise<LoginResult> {
  // Unified identifier (username | email | phone). Phone-shaped input is
  // routed to the OTP flow — the decision is SHAPE-based, never
  // existence-based (enumeration safety).
  const raw = input.identifier?.trim() || input.email?.trim() || "";
  const type = raw ? detectIdentifierType(raw) : null;
  if (type === "PHONE") {
    return { ok: false, code: "PHONE_OTP_REQUIRED" };
  }

  const lookupType: "USERNAME" | "EMAIL" = type === "EMAIL" ? "EMAIL" : "USERNAME";
  let value: string | null =
    lookupType === "EMAIL" ? normalizeEmail(raw) : normalizeUsername(raw);
  // Lenient fallback: legacy handles that fail the strict username rules
  // (e.g. reserved list) still attempt a direct lookup.
  if (!value && raw) value = raw.toLowerCase() || null;

  let user = null as null | Awaited<ReturnType<typeof db.userAccount.findUnique>>;
  if (value) {
    const resolved = await resolveIdentifier(lookupType, value);
    if (resolved.ok) {
      user = await db.userAccount.findUnique({ where: { id: resolved.userId } });
    }
  }

  const valid = user
    ? verifyPassword(input.password, user.passwordSalt, user.passwordHash)
    : false;

  if (!user || !valid) {
    await recordAudit({
      actorType: "ANONYMOUS",
      action: "AUTH_LOGIN_FAILED",
      requestId,
      // identifier TYPE only — never the value (enumeration resistance)
      metadata: { outcome: "invalid_credentials", identifierType: type ?? "unknown" },
    });
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  if (user.status !== "ACTIVE") {
    await recordAudit({
      actorType: "ANONYMOUS",
      action: "AUTH_LOGIN_FAILED",
      requestId,
      metadata: { outcome: "account_not_active" },
    });
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  // Sync the registry (legacy rows) + touch lastUsedAt.
  await linkIdentifier(user.id, "USERNAME", user.handle, {
    verified: true,
    requestId,
    makePrimary: !user.email,
    syncAccount: true,
  }).catch(() => undefined);
  if (user.email) {
    await linkIdentifier(user.id, "EMAIL", user.email, {
      verified: false,
      requestId,
      makePrimary: true,
      syncAccount: true,
    }).catch(() => undefined);
  }

  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "AUTH_LOGIN",
    subjectType: "UserAccount",
    subjectId: user.id,
    requestId,
    metadata: { outcome: "login", identifierType: lookupType },
  });
  void req; // reserved for future device binding
  return { ok: true, userId: user.id };
}

export async function getUserById(userId: string) {
  return db.userAccount.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      handle: true,
      status: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function recentAuditForUser(userId: string, limit = 10) {
  return db.auditEvent.findMany({
    where: {
      actorId: userId,
      OR: [
        { action: { startsWith: "AUTH_" } },
        { action: { startsWith: "IDENTITY_" } },
        { action: { startsWith: "SIGNAL_" } },
        // Stage 5 — Trust Passport surfaces in the same audit feed
        { action: { startsWith: "SHARE_" } },
        { action: { startsWith: "CREDENTIAL_" } },
        { action: { startsWith: "DSR_" } },
        { action: { startsWith: "SESSION_" } },
        { action: "SCORE_SNAPSHOT" },
        // Stage 6 — Safety Check + Trust Requests
        { action: { startsWith: "SAFETY_" } },
        { action: { startsWith: "TRUST_REQUEST" } },
        // Stage 7 — Reputation (own actions only; subject-linkage events surface
        // in the Security Center timeline)
        { action: { startsWith: "FLAG_" } },
        { action: { startsWith: "APPEAL_" } },
        // Stage 8 — Trust Engine administration (own actions)
        { action: { startsWith: "POLICY_" } },
        { action: { startsWith: "DPIA_" } },
        { action: { startsWith: "ENGINE_" } },
        // Stage 9 — B2B developer-portal actions (own actions; the
        // TRUST_DECISION_API actor is the client owner)
        { action: { startsWith: "DEV_" } },
        { action: { startsWith: "API_" } },
        { action: { startsWith: "WEBHOOK_" } },
        { action: "TRUST_DECISION_API" },
        // Stage 10 — Trust Network (own actions only; signal mint/retract
        // are SYSTEM-actor events surfaced via the Security Center timeline)
        { action: { startsWith: "NETWORK_" } },
        // Stage 11 — Score Insights (own exports)
        { action: "SCORE_HISTORY_EXPORTED" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, action: true, createdAt: true },
  });
}
