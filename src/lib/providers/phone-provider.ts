// TrustScore Stage 4 — Phone verification provider adapter
// (CONTRACT-FIRST, MOCK transport).
//
// This module implements the contract a real SMS/phone-check partner (or an
// MNO signal aggregator) will use (per docs/STAGE0_AUDIT.md §4.2 Stage 4):
//   E.164-normalized phone input → OTP delivery → hashed-code verification →
//   SIM-swap risk signal — with a MOCK transport. The LIVE implementation
//   swaps only the delivery + risk-lookup calls; the normalization, hashing,
//   attempt-capping and consent discipline stay identical.
//
// Security invariants (directive §32/§29):
//   - The raw phone number is NEVER persisted: only a peppered sha256
//     fingerprint (identifier discipline) + a masked display hint.
//   - The OTP is stored hashed — never plaintext.
//   - OTP comparison is timing-safe.
//   - The delivery message containing the code exists ONLY in the MOCK-mode
//     API response (honestly labeled) so the sandbox can test the flow; LIVE
//     responses never echo codes.

import { createHash, randomInt, timingSafeEqual } from "crypto";
import { guardedSecret } from "@/lib/platform/boot-guard";

export const PHONE_PROVIDER_NAME = "SMS_MOCK";
export const PHONE_MODE: "MOCK" | "LIVE" = "MOCK"; // honestly labeled everywhere

// Backend-only pepper — shared with the identifier fingerprint discipline.
// sec-batch-A: guarded read — production refuses to boot on the dev default
// (this pepper is what makes phone fingerprints irreversible).
const PHONE_PEPPER = guardedSecret("SIGNAL_PEPPER");

export const OTP_TTL_MS = 5 * 60_000; // OTP validity window
export const MAX_OTP_ATTEMPTS = 3; // wrong attempts before lockout
export const MAX_RESENDS = 3; // resends per verification
export const RESEND_COOLDOWN_MS = 30_000; // minimum spacing between sends
export const PHONE_FRESHNESS_DAYS = 90; // identifier freshness horizon

// ---------------------------------------------------------------------------
// Normalization — Nigerian E.164 (+234, 10-digit national significant number
// starting with 7/8/9). Accepts +234…, 234…, 0…, or bare local numbers.
// ---------------------------------------------------------------------------

export function normalizePhoneE164(input: string): string | null {
  const raw = input.trim().replace(/[\s()\-.]/g, "");
  let national: string;

  if (raw.startsWith("+234")) national = raw.slice(4);
  else if (raw.startsWith("234") && raw.length >= 13) national = raw.slice(3);
  else if (raw.startsWith("0")) national = raw.slice(1);
  else national = raw;

  // NG mobile numbers: 10 digits after the country code, leading 7/8/9.
  if (!/^([789]\d{9})$/.test(national)) return null;
  return `+234${national}`;
}

// Masked display hint: country code + first digit + bullets + last 2 digits.
// Never enough to reconstruct the number — mirrors the hashPrefix discipline.
export function maskPhoneHint(e164: string): string {
  const national = e164.slice(4); // 10 digits
  return `+234 ${national[0]}•• ••• ••${national.slice(8)}`;
}

// ---------------------------------------------------------------------------
// Identifier fingerprint (Stage 3 discipline): peppered sha256 — the raw
// number never persists anywhere.
// ---------------------------------------------------------------------------

export function phoneFingerprint(e164: string): string {
  return createHash("sha256").update(`${PHONE_PEPPER}:phone:${e164}`).digest("hex");
}

// ---------------------------------------------------------------------------
// OTP issue + verify (hashed at rest, timing-safe compare)
// ---------------------------------------------------------------------------

export function issueOtp(): { code: string; otpHash: string } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return { code, otpHash: hashCode(code) };
}

function hashCode(code: string): string {
  return createHash("sha256").update(`${PHONE_PEPPER}:otp:${code}`).digest("hex");
}

export function otpMatches(storedOtpHash: string, code: string): boolean {
  const a = Buffer.from(storedOtpHash, "hex");
  const b = Buffer.from(hashCode(code), "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// SIM-swap risk (mock network signal — LIVE swaps in an MNO/aggregator call).
// A phone verified moments after a SIM swap is a weaker signal: OTP control
// alone does not prove long-term possession. The ladder consumes this in the
// cross-signal consistency computation (L4).
// ---------------------------------------------------------------------------

export type SimSwapRisk = "LOW" | "MEDIUM" | "HIGH";

export function simSwapRiskFor(phoneHash: string, override?: SimSwapRisk): SimSwapRisk {
  if (override) return override;
  // Deterministic mock: hash-bucketed, LOW-dominant (realistic base rate).
  const bucket = createHash("sha256")
    .update(`${PHONE_PEPPER}:simswap:${phoneHash}`)
    .digest();
  const v = bucket.readUInt32BE(0) % 20;
  if (v === 0) return "MEDIUM";
  return "LOW";
}

// ---------------------------------------------------------------------------
// Delivery contract (MOCK): the message a real SMS gateway would deliver.
// The code appears ONLY in MOCK responses (sandbox test surface, labeled).
// ---------------------------------------------------------------------------

export interface DeliveryInfo {
  mode: "MOCK" | "LIVE";
  channel: "sms";
  provider: string;
  message: string; // MOCK: includes the code for testability; LIVE: redacted
}

export function mockDelivery(code: string): DeliveryInfo {
  return {
    mode: PHONE_MODE,
    channel: "sms",
    provider: PHONE_PROVIDER_NAME,
    message: `TrustScore: your verification code is ${code}. It expires in 5 minutes. Never share this code.`,
  };
}

// Evidence confidence reflects the SIM-swap posture of the binding.
export function confidenceForSimSwap(risk: SimSwapRisk): number {
  switch (risk) {
    case "LOW":
      return 95;
    case "MEDIUM":
      return 85;
    case "HIGH":
      return 70;
  }
}
