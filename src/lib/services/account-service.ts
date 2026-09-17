// TrustScore Stage 1 — AccountService (directive §28 service separation).
// Registration, login, session lifecycle. All input validation is zod-based at
// the route layer; this service assumes validated input.

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/platform/crypto";
import { recordAudit } from "@/lib/services/audit-service";
import { notifyUser, welcomeNotification } from "@/lib/services/notification-service";

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  handle: string;
  acceptTerms: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; code: "EMAIL_TAKEN" | "HANDLE_TAKEN" };

export async function registerUser(
  input: RegisterInput,
  requestId: string
): Promise<RegisterResult> {
  const existingEmail = await db.userAccount.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existingEmail) return { ok: false, code: "EMAIL_TAKEN" };

  const existingHandle = await db.userAccount.findUnique({
    where: { handle: input.handle },
    select: { id: true },
  });
  if (existingHandle) return { ok: false, code: "HANDLE_TAKEN" };

  const { hash, salt } = hashPassword(input.password);
  const user = await db.userAccount.create({
    data: {
      email: input.email,
      passwordHash: hash,
      passwordSalt: salt,
      displayName: input.displayName,
      handle: input.handle,
      status: "ACTIVE",
    },
  });

  const notif = welcomeNotification(input.displayName);
  await notifyUser(user.id, "SYSTEM", notif.title, notif.body);
  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "AUTH_REGISTER",
    subjectType: "UserAccount",
    subjectId: user.id,
    requestId,
    metadata: { outcome: "created" },
  });

  return { ok: true, userId: user.id };
}

export type LoginResult =
  | { ok: true; userId: string }
  | { ok: false; code: "INVALID_CREDENTIALS" };

export async function authenticateUser(
  input: LoginInput,
  requestId: string,
  req?: NextRequest
): Promise<LoginResult> {
  const user = await db.userAccount.findUnique({
    where: { email: input.email },
  });

  const valid = user
    ? verifyPassword(input.password, user.passwordSalt, user.passwordHash)
    : false;

  if (!user || !valid) {
    await recordAudit({
      actorType: "ANONYMOUS",
      action: "AUTH_LOGIN_FAILED",
      requestId,
      metadata: { outcome: "invalid_credentials" },
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

  await recordAudit({
    actorType: "USER",
    actorId: user.id,
    action: "AUTH_LOGIN",
    subjectType: "UserAccount",
    subjectId: user.id,
    requestId,
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
