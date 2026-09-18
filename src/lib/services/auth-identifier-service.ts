// AUTH batch — AuthIdentifier service: the canonical multi-identifier registry.
// Every login method (username / email / phone / Google / NINAuth) resolves
// through resolveIdentifier(). UserAccount.email + handle remain denormalized
// display fields, kept in sync here — the registry is single-source for AUTH.
//
// Conflict policy: @@unique([type, value]) — an identifier belongs to exactly
// ONE account. Ownership is never silently transferred between accounts.

import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import {
  type IdentifierType,
  identifierLabel,
} from "@/lib/auth/identifiers";
import { recordAudit } from "@/lib/services/audit-service";

export type ResolveResult =
  | { ok: true; userId: string }
  | { ok: false; code: "NOT_FOUND" };

export async function resolveIdentifier(
  type: IdentifierType,
  value: string
): Promise<ResolveResult> {
  const row = await db.authIdentifier.findUnique({
    where: { type_value: { type, value } },
    select: { userId: true },
  });
  if (row) return { ok: true, userId: row.userId };

  // Legacy fallback: pre-AUTH-batch rows (email/handle on UserAccount). The
  // backfill covers these, but tests can create accounts directly.
  if (type === "EMAIL") {
    const byEmail = await db.userAccount.findUnique({
      where: { email: value },
      select: { id: true },
    });
    if (byEmail) return { ok: true, userId: byEmail.id };
  }
  if (type === "USERNAME") {
    const byHandle = await db.userAccount.findUnique({
      where: { handle: value },
      select: { id: true },
    });
    if (byHandle) return { ok: true, userId: byHandle.id };
  }
  return { ok: false, code: "NOT_FOUND" };
}

export async function touchIdentifier(
  userId: string,
  type: IdentifierType,
  value: string
) {
  await db.authIdentifier.updateMany({
    where: { userId, type, value },
    data: { lastUsedAt: new Date() },
  });
}

export type LinkResult =
  | { ok: true; created: boolean }
  | { ok: false; code: "TAKEN_BY_OTHER" | "ALREADY_LINKED" | "INVALID" };

export async function linkIdentifier(
  userId: string,
  type: IdentifierType,
  value: string,
  opts: {
    hint?: string;
    verified?: boolean;
    requestId: string;
    makePrimary?: boolean;
    syncAccount?: boolean; // mirror EMAIL/USERNAME onto UserAccount display fields
  }
): Promise<LinkResult> {
  const existing = await db.authIdentifier.findUnique({
    where: { type_value: { type, value } },
    select: { userId: true },
  });
  if (existing) {
    return existing.userId === userId
      ? { ok: false, code: "ALREADY_LINKED" }
      : { ok: false, code: "TAKEN_BY_OTHER" };
  }

  if (opts.makePrimary) {
    await db.authIdentifier.updateMany({
      where: { userId, type, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  await db.authIdentifier.create({
    data: {
      userId,
      type,
      value,
      hint: opts.hint ?? null,
      verified: opts.verified ?? false,
      verifiedAt: opts.verified ? new Date() : null,
      isPrimary: opts.makePrimary ?? false,
    },
  });

  // Keep the denormalized display fields in sync (read path compatibility).
  if (opts.syncAccount) {
    if (type === "EMAIL") {
      const user = await db.userAccount.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!user?.email) {
        await db.userAccount.update({ where: { id: userId }, data: { email: value } });
      }
    }
    if (type === "USERNAME") {
      const user = await db.userAccount.findUnique({
        where: { id: userId },
        select: { handle: true },
      });
      if (!user || user.handle === value) {
        await db.userAccount.update({ where: { id: userId }, data: { handle: value } });
      }
    }
  }

  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "AUTH_IDENTIFIER_LINKED",
    subjectType: "AuthIdentifier",
    subjectId: `${type}:${value.slice(0, 12)}`,
    requestId: opts.requestId,
    metadata: { outcome: "linked", type, verified: opts.verified ?? false },
  });
  return { ok: true, created: true };
}

export async function markIdentifierVerified(
  userId: string,
  type: IdentifierType,
  value: string
) {
  await db.authIdentifier.updateMany({
    where: { userId, type, value },
    data: { verified: true, verifiedAt: new Date() },
  });
}

// Unlink guard: an account must always retain at least one usable auth path —
// (a password on the account) OR (another linked identifier). Unlinking the
// last identifier of a passwordless account would orphan it permanently.
export type UnlinkResult =
  | { ok: true }
  | { ok: false; code: "NOT_LINKED" | "LAST_IDENTIFIER" | "AUDIT_ONLY" };

export async function unlinkIdentifier(
  userId: string,
  type: IdentifierType,
  value: string,
  requestId: string
): Promise<UnlinkResult> {
  const row = await db.authIdentifier.findUnique({
    where: { type_value: { type, value } },
    select: { userId: true },
  });
  if (!row || row.userId !== userId) return { ok: false, code: "NOT_LINKED" };

  const identifiers = await db.authIdentifier.findMany({
    where: { userId },
    select: { type: true },
  });
  if (identifiers.length <= 1) {
    // The only identifier left: passwordless accounts cannot lose it.
    // (Accounts WITH a password may drop their last identifier — the password
    // remains a valid auth path via the identifier-less email column? No —
    // login resolves through identifiers, so keep the guard simple and safe.)
    return { ok: false, code: "LAST_IDENTIFIER" };
  }

  await db.authIdentifier.delete({
    where: { type_value: { type, value } },
  });
  await recordAudit({
    actorType: "USER",
    actorId: userId,
    action: "AUTH_IDENTIFIER_UNLINKED",
    subjectType: "AuthIdentifier",
    subjectId: `${type}:${value.slice(0, 12)}`,
    requestId,
    metadata: { outcome: "unlinked", type },
  });
  return { ok: true };
}

// Masked view model — never exposes raw phone or google sub.
export interface PublicIdentifier {
  type: IdentifierType;
  label: string;
  hint: string | null;
  verified: boolean;
  isPrimary: boolean;
  linkedAt: string;
  lastUsedAt: string | null;
}

export async function listIdentifiers(userId: string): Promise<PublicIdentifier[]> {
  const rows = await db.authIdentifier.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { linkedAt: "asc" }],
  });
  return rows.map((r) => ({
    type: r.type as IdentifierType,
    label: identifierLabel(r.type as IdentifierType),
    hint: r.hint,
    verified: r.verified,
    isPrimary: r.isPrimary,
    linkedAt: r.linkedAt.toISOString(),
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
  }));
}

// One-time migration helper: create USERNAME + EMAIL identifiers for every
// pre-AUTH-batch account (idempotent — safe to re-run).
export async function backfillIdentifiers(): Promise<{ created: number }> {
  const users = await db.userAccount.findMany({
    select: { id: true, email: true, handle: true },
  });
  let created = 0;
  for (const u of users) {
    const have = await db.authIdentifier.findMany({
      where: { userId: u.id },
      select: { type: true, value: true },
    });
    const haveTypes = new Set(have.map((h) => `${h.type}:${h.value}`));
    const wanted: { type: IdentifierType; value: string }[] = [];
    if (u.handle && !haveTypes.has(`USERNAME:${u.handle}`))
      wanted.push({ type: "USERNAME", value: u.handle });
    if (u.email && !haveTypes.has(`EMAIL:${u.email}`))
      wanted.push({ type: "EMAIL", value: u.email });
    if (wanted.length) {
      await db.authIdentifier.createMany({
        data: wanted.map((w, i) => ({
          userId: u.id,
          type: w.type,
          value: w.value,
          // Legacy accounts have usable email+password+handle from day one;
          // the email was never bounce-verified, so verified=false is the
          // honest label (verification gates linking, not password login).
          verified: false,
          isPrimary: i === 0 && !have.length,
        })),
      });
      created += wanted.length;
    }
  }
  return { created };
}

// Deterministic, collision-tolerant handle derivation (shared by Google and
// NINAuth registration paths).
export async function deriveHandle(givenName: string | undefined): Promise<string> {
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
