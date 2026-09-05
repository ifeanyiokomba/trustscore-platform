// TrustScore Stage 1 — cryptography utilities.
// - Passwords: scrypt with per-user random salt, timing-safe verification.
// - Session tokens: 256-bit random; stored only as sha256 hashes.
// - IP addresses: salted sha256 hashes (privacy-preserving audit trail).

import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N
const SCRYPT_BLOCKSIZE = 8; // r
const SCRYPT_PARALLELIZATION = 1; // p

const globalForSalt = globalThis as unknown as {
  __tsIpSalt?: string;
};
// Per-process salt for IP hashing (stable within the instance, not persisted).
const ipSalt =
  globalForSalt.__tsIpSalt ?? randomBytes(16).toString("hex");
globalForSalt.__tsIpSalt = ipSalt;

export function hashPassword(
  password: string
): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCKSIZE,
    p: SCRYPT_PARALLELIZATION,
  }).toString("hex");
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  salt: string,
  expectedHashHex: string
): boolean {
  try {
    const actual = scryptSync(password, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCKSIZE,
      p: SCRYPT_PARALLELIZATION,
    });
    const expected = Buffer.from(expectedHashHex, "hex");
    // Constant-length compare to avoid leaking length info.
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex"); // 256-bit
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return sha256Hex(`${ipSalt}:${ip}`);
}
