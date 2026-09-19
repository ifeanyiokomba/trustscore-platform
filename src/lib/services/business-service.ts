// TrustScore Batch 2 (G8) — Business profile service (directive §53).
//
// An RC/BN/IT number is the CAC-class business identifier. The model is
// schema + owner-managed labels ONLY: no business verification provider
// exists, so every profile is honestly UNVERIFIED and carries ZERO trust
// semantics (no score, no band, no engine input — enforced by the batch2
// matrix invariant).
//
// Identifier discipline (directive §29/§32 — same as phones):
//   - The raw RC number is NEVER persisted: a peppered sha256 fingerprint
//     (SIGNAL_PEPPER, guarded by the boot guard) + a masked display hint.
//   - Fingerprint lookup is exact-match on the NORMALIZED form, so a future
//     business check-by-RC resolves without ever storing the number.
//
// Normalization (CAC registrar forms, tolerant input):
//   "RC 1234567", "rc-1234567", "Rc  1234567" → "RC1234567"
//   "BN 98765", "IT 4567821"                  → "BN98765" / "IT4567821"
//   Bare digits "1234567"                     → "RC1234567" (the common case)
//   Registry type is one of RC | BN | IT; digits/alnum tail 3–10 chars.

import { createHash } from "crypto";
import { db } from "@/lib/db";
import { guardedSecret } from "@/lib/platform/boot-guard";
import { recordAudit } from "@/lib/services/audit-service";

const RC_PEPPER = guardedSecret("SIGNAL_PEPPER");

export const MAX_BUSINESS_PROFILES = 5; // anti-spam cap per owner
export const BUSINESS_NAME_MAX = 80;

export type RcRegistry = "RC" | "BN" | "IT";

export interface NormalizedRc {
  registry: RcRegistry;
  normalized: string; // e.g. "RC1234567" — never persisted raw
  hint: string; // e.g. "RC 123•••"
  fingerprint: string; // peppered sha256
}

export class RcValidationError extends Error {
  constructor(public code: "RC_MALFORMED") {
    super("rc_malformed");
    this.name = "RcValidationError";
  }
}

// ---------------------------------------------------------------------------
// Normalization + fingerprinting
// ---------------------------------------------------------------------------

const REGISTRY_PREFIX = /^(RC|BN|IT)[\s\-_.]*(.+)$/i;

export function normalizeRc(input: string): NormalizedRc {
  const raw = input.trim().replace(/\s+/g, " ");
  if (!raw || raw.length > 20) throw new RcValidationError("RC_MALFORMED");

  let registry: RcRegistry;
  let tail: string;

  const m = REGISTRY_PREFIX.exec(raw);
  if (m) {
    registry = m[1].toUpperCase() as RcRegistry;
    tail = m[2].replace(/[\s\-_.]/g, "");
  } else {
    // Bare number — the overwhelmingly common case is an incorporated
    // company RC number; the owner can be explicit with BN/IT when needed.
    registry = "RC";
    tail = raw.replace(/[\s\-_.]/g, "");
  }

  // CAC tails are digits (legacy 5–7) or alphanumeric (newer series); accept
  // 3–10 alphanumerics, at least one digit, uppercase-normalized.
  if (!/^[A-Z0-9]{3,10}$/.test(tail) || !/\d/.test(tail)) {
    throw new RcValidationError("RC_MALFORMED");
  }

  const normalized = `${registry}${tail}`;
  return {
    registry,
    normalized,
    hint: maskRcHint(registry, tail),
    fingerprint: createHash("sha256")
      .update(`${RC_PEPPER}:rc:${normalized}`)
      .digest("hex"),
  };
}

/** Masked hint — registry + first 3 + bullets + last digit (min 5 chars of tail). */
function maskRcHint(registry: RcRegistry, tail: string): string {
  if (tail.length < 5) return `${registry} ${"•".repeat(tail.length)}`;
  return `${registry} ${tail.slice(0, 3)}${"•".repeat(Math.min(4, tail.length - 4))}${tail.slice(-1)}`;
}

// ---------------------------------------------------------------------------
// Read shape (masked, honest — nothing here is a trust signal)
// ---------------------------------------------------------------------------

export interface BusinessProfileInfo {
  id: string;
  name: string;
  rcHint: string;
  status: "UNVERIFIED";
  createdAt: string;
  updatedAt: string;
}

function toInfo(row: {
  id: string;
  name: string;
  rcHint: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): BusinessProfileInfo {
  return {
    id: row.id,
    name: row.name,
    rcHint: row.rcHint,
    status: "UNVERIFIED", // the only reachable state in this batch (honesty by type)
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Operations (owner-scoped, audited)
// ---------------------------------------------------------------------------

export type CreateBusinessResult =
  | { ok: true; profile: BusinessProfileInfo }
  | { ok: false; code: "RC_MALFORMED" | "NAME_INVALID" | "LIMIT_REACHED" | "DUPLICATE" };

export async function createBusinessProfile(
  userId: string,
  input: { name: string; rcNumber: string },
  requestId?: string
): Promise<CreateBusinessResult> {
  const name = input.name.trim();
  if (!name || name.length > BUSINESS_NAME_MAX) {
    return { ok: false, code: "NAME_INVALID" };
  }

  let rc: NormalizedRc;
  try {
    rc = normalizeRc(input.rcNumber);
  } catch {
    return { ok: false, code: "RC_MALFORMED" };
  }

  const count = await db.businessAccount.count({ where: { ownerId: userId } });
  if (count >= MAX_BUSINESS_PROFILES) {
    return { ok: false, code: "LIMIT_REACHED" };
  }

  try {
    const row = await db.businessAccount.create({
      data: {
        ownerId: userId,
        name,
        rcFingerprint: rc.fingerprint,
        rcHint: rc.hint,
        status: "UNVERIFIED",
      },
    });
    await recordAudit({
      actorType: "USER",
      actorId: userId,
      action: "BUSINESS_PROFILE_CREATED",
      subjectType: "BusinessAccount",
      subjectId: row.id,
      requestId,
      metadata: { outcome: "created", rcHint: rc.hint },
    });
    return { ok: true, profile: toInfo(row) };
  } catch (err) {
    // P2002: unique([ownerId, rcFingerprint]) — same RC claimed twice by this owner.
    if ((err as { code?: string }).code === "P2002") {
      return { ok: false, code: "DUPLICATE" };
    }
    throw err;
  }
}

export async function listBusinessProfiles(userId: string): Promise<BusinessProfileInfo[]> {
  const rows = await db.businessAccount.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toInfo);
}

export type UpdateBusinessResult =
  | { ok: true; profile: BusinessProfileInfo }
  | { ok: false; code: "NOT_FOUND" | "NAME_INVALID" };

export async function renameBusinessProfile(
  userId: string,
  profileId: string,
  name: string,
  requestId?: string
): Promise<UpdateBusinessResult> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > BUSINESS_NAME_MAX) {
    return { ok: false, code: "NAME_INVALID" };
  }
  try {
    const row = await db.businessAccount.update({
      where: { id: profileId, ownerId: userId },
      data: { name: trimmed },
    });
    await recordAudit({
      actorType: "USER",
      actorId: userId,
      action: "BUSINESS_PROFILE_UPDATED",
      subjectType: "BusinessAccount",
      subjectId: row.id,
      requestId,
      metadata: { outcome: "renamed" },
    });
    return { ok: true, profile: toInfo(row) };
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return { ok: false, code: "NOT_FOUND" };
    }
    throw err;
  }
}

export async function deleteBusinessProfile(
  userId: string,
  profileId: string,
  requestId?: string
): Promise<{ ok: boolean }> {
  try {
    const row = await db.businessAccount.delete({ where: { id: profileId, ownerId: userId } });
    await recordAudit({
      actorType: "USER",
      actorId: userId,
      action: "BUSINESS_PROFILE_DELETED",
      subjectType: "BusinessAccount",
      subjectId: row.id,
      requestId,
      metadata: { outcome: "deleted", rcHint: row.rcHint },
    });
    return { ok: true };
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return { ok: false };
    }
    throw err;
  }
}
