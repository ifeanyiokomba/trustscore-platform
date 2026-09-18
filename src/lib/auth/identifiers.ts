// AUTH batch — identifier normalization + detection (pure functions, no DB).
//
// The single identifier field accepts username | email | phone. Detection is
// heuristic-first (shape), never account-existence-based (enumeration safety):
//   - contains "@" AND a dot in the domain → EMAIL
//   - digits/+/spaces/dashes only, ≥7 significant digits → PHONE (NG E.164)
//   - otherwise → USERNAME (normalized lowercase handle)
//
// Value discipline per type lives in the AuthIdentifier table; the raw phone
// number NEVER persists (fingerprint only) and never reaches URLs/logs/analytics.

import { createHash } from "crypto";
import {
  normalizePhoneE164,
  maskPhoneHint,
  phoneFingerprint,
} from "@/lib/providers/phone-provider";

export type IdentifierType = "USERNAME" | "EMAIL" | "PHONE" | "GOOGLE";

export const IDENTIFIER_TYPES: IdentifierType[] = [
  "USERNAME",
  "EMAIL",
  "PHONE",
  "GOOGLE",
];

// Case-insensitive uniqueness is achieved by ALWAYS storing lowercase (same
// discipline as the legacy handle column). System/reserved names are refused
// so public profiles can never impersonate platform roles.
export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "system", "support", "help", "security",
  "official", "staff", "moderator", "trustscore", "ninauth", "nimc", "api",
  "noreply", "no-reply", "postmaster", "webmaster", "mail", "info", "billing",
  "legal", "privacy", "abuse", "dev", "developer", "engineering", "marketing",
  "sales", "finance", "team", "trust", "verify", "login", "signin", "signup",
  "register", "account", "me", "null", "undefined", "test", "demo",
]);

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeUsername(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!USERNAME_RE.test(v)) return null;
  if (RESERVED_USERNAMES.has(v)) return null;
  return v;
}

export function isUsernameShape(raw: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(raw.trim());
}

export function normalizeEmail(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (v.length > 254 || !EMAIL_RE.test(v)) return null;
  return v;
}

// Phone: returns the fingerprint triple {e164 (transient only), hash, hint}.
// The e164 value is used for OTP delivery in-memory and then discarded.
export function normalizePhoneIdentifier(
  raw: string
): { e164: string; hash: string; hint: string } | null {
  const e164 = normalizePhoneE164(raw);
  if (!e164) return null;
  return { e164, hash: phoneFingerprint(e164), hint: maskPhoneHint(e164) };
}

export function detectIdentifierType(raw: string): IdentifierType | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.includes("@") && EMAIL_RE.test(v.toLowerCase())) return "EMAIL";
  // Phone shapes: +234…, 0…, or bare 7/8/9-leading 10-11 digits.
  const compact = v.replace(/[\s()\-.]/g, "");
  if (/^\+?\d{7,15}$/.test(compact)) return "PHONE";
  if (isUsernameShape(v)) return "USERNAME";
  return null;
}

// Google mock subject — deterministic per email so repeat sign-ins resolve to
// the same account (mirrors how a real provider sub is stable per user).
export function googleSubForEmail(normalizedEmail: string): string {
  return `g_${createHash("sha256").update(`google:${normalizedEmail}`).digest("hex").slice(0, 24)}`;
}

export function identifierLabel(type: IdentifierType): string {
  switch (type) {
    case "USERNAME":
      return "Username";
    case "EMAIL":
      return "Email";
    case "PHONE":
      return "Phone";
    case "GOOGLE":
      return "Google";
  }
}
