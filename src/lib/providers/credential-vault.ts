// TrustScore Stage 13 — Provider credential vault (AES-256-GCM at rest).
//
// Holds LIVE-posture provider credentials (client secrets / signing keys)
// encrypted under a platform master key (env VAULT_MASTER_KEY — 32-byte hex
// or any string, hashed to a 32-byte key). The sandbox falls back to a
// dev-only master constant and SAYS SO (vaultDefaultKey flag) — production
// must set the env var.
//
// Discipline:
//   - The plaintext secret is written ONCE by an admin, stored only as an
//     authenticated ciphertext blob, and NEVER returned by any read API —
//     reads surface a masked hint (first 2 + last 4 chars).
//   - One ACTIVE credential per provider; saving a new one retires the old.
//   - Revocation is immediate (resolveCredential returns null thereafter).
//   - lastUsedAt is touched only when the LIVE transport actually uses it.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { ProviderKey } from "@/lib/providers/transport";
import { guardedSecret, secretIsDefault } from "@/lib/platform/boot-guard";

// sec-batch-A: guarded read — production REFUSES to boot on the dev default
// (boot-guard.ts); the vaultUsesDefaultKey flag below now feeds the admin
// security-posture endpoint instead of being an honesty signal wired to
// nothing.
const MASTER_KEY_INPUT = guardedSecret("VAULT_MASTER_KEY");

export const vaultUsesDefaultKey = secretIsDefault("VAULT_MASTER_KEY");

function masterKey(): Buffer {
  // Any input → 32-byte AES key via SHA-256 (env value may be hex or a phrase).
  return createHash("sha256").update(MASTER_KEY_INPUT).digest();
}

// ---------------------------------------------------------------------------
// AES-256-GCM blob format: v1.<iv>.<tag>.<ciphertext> (base64url parts)
// ---------------------------------------------------------------------------

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(blob: string): string {
  const parts = blob.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("bad_blob_format");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Masked display hint — never reconstructs a usable secret. */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) return "•".repeat(secret.length);
  return `${secret.slice(0, 2)}${"•".repeat(Math.min(12, secret.length - 6))}${secret.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Vault operations (admin-gated at the API layer)
// ---------------------------------------------------------------------------

export interface VaultEntryInfo {
  id: string;
  provider: string;
  keyId: string;
  hint: string;
  status: string;
  note: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  retiredAt: string | null;
}

export async function saveCredential(input: {
  provider: ProviderKey;
  keyId: string;
  secret: string;
  note?: string;
  createdBy: string;
}): Promise<VaultEntryInfo> {
  // Retire any current ACTIVE credential for this provider (single-active).
  await db.providerCredential.updateMany({
    where: { provider: input.provider, status: "ACTIVE" },
    data: { status: "RETIRED", retiredAt: new Date() },
  });
  const row = await db.providerCredential.create({
    data: {
      provider: input.provider,
      keyId: input.keyId,
      secretCipher: encryptSecret(input.secret),
      hint: maskSecret(input.secret),
      note: input.note ?? null,
      createdBy: input.createdBy,
    },
  });
  return toInfo(row);
}

export async function revokeCredential(provider: ProviderKey): Promise<boolean> {
  const res = await db.providerCredential.updateMany({
    where: { provider, status: "ACTIVE" },
    data: { status: "RETIRED", retiredAt: new Date() },
  });
  return res.count > 0;
}

export async function listCredentials(): Promise<VaultEntryInfo[]> {
  const rows = await db.providerCredential.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toInfo);
}

/** LIVE transport use: decrypt the ACTIVE credential (null when absent/retired). */
export async function resolveCredential(
  provider: ProviderKey
): Promise<{ keyId: string; secret: string } | null> {
  const row = await db.providerCredential.findFirst({
    where: { provider, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  try {
    const secret = decryptSecret(row.secretCipher);
    await db.providerCredential.update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    });
    return { keyId: row.keyId, secret };
  } catch {
    // Blob is unreadable (master key rotated without re-encryption) — treat
    // as absent and say so honestly upstream.
    return null;
  }
}

function toInfo(row: {
  id: string;
  provider: string;
  keyId: string;
  hint: string;
  status: string;
  note: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  retiredAt: Date | null;
}): VaultEntryInfo {
  return {
    id: row.id,
    provider: row.provider,
    keyId: row.keyId,
    hint: row.hint,
    status: row.status,
    note: row.note,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    retiredAt: row.retiredAt?.toISOString() ?? null,
  };
}
