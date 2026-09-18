// AUTH batch — Google OAuth 2.0 provider (contract-first, honestly-labeled
// MOCK posture in the sandbox — identical discipline to the NINAuth provider).
//
// Contract (shared with the real provider):
//   start → (user picks account + consents at Google) → callback
//   (one-time code + PKCE exchange + ID-token validation) → account
//   resolution/link/create.
//
// MOCK mode (no GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in the environment):
//   - The "Google" consent screen is a frontend modal (GoogleConsentModal)
//     where the tester picks the Google account (email) and grants/denies.
//   - The mock subject (sub) is deterministic per email: sha256("google:"+email)
//     — repeat sign-ins resolve to the same identity, exactly like a real sub.
//   - The ID token is an HMAC-signed JWT-shape assertion validated on callback.
//
// LIVE mode (credentials present): authorizationUrl points at the real
// accounts.google.com authorization endpoint with PKCE + state; the callback
// exchanges the code server-side and validates the Google ID token (iss, aud,
// exp, nonce). The resolution/linking rules are identical in both modes.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { generatePkce, generateState } from "@/lib/providers/ninauth";
import { guardedSecret } from "@/lib/platform/boot-guard";

export const GOOGLE_PROVIDER_NAME = "GOOGLE_MOCK";
export const GOOGLE_MODE: "MOCK" | "LIVE" =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? "LIVE"
    : "MOCK"; // honestly labeled everywhere

export const GOOGLE_LOGIN_TTL_MS = 10 * 60_000; // consent window
export const GOOGLE_CODE_TTL_MS = 60_000; // one-time authorization code TTL

// Scopes requested — the minimum for authentication (no profile scraping):
// openid gives us the sub; email gives the contact for linking/recovery.
export const GOOGLE_SCOPES = ["openid", "email"];

const GOOGLE_ISSUER = "https://accounts.google.com";
// sec-batch-A: guarded read — production refuses to boot on the dev default.
const MOCK_SIGNING_SECRET = guardedSecret("SIGNAL_PEPPER");

// ---------------------------------------------------------------------------
// PKCE / state / one-time codes — same primitives as the NINAuth rail.
// ---------------------------------------------------------------------------

export { generatePkce, generateState };

export function issueAuthorizationCode(): { code: string; expiresAt: Date } {
  return { code: randomBytes(24).toString("base64url"), expiresAt: new Date(Date.now() + GOOGLE_CODE_TTL_MS) };
}

export function hashCode(code: string): string {
  return createHash("sha256").update(`google:code:${code}`).digest("hex");
}

export function codeMatches(storedHash: string, presented: string): boolean {
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(hashCode(presented), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function googleAuthorizationUrl(state: string, challenge: string): string {
  if (GOOGLE_MODE === "LIVE") {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      response_type: "code",
      scope: GOOGLE_SCOPES.join(" "),
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      redirect_uri: `${process.env.GOOGLE_REDIRECT_URI ?? ""}/api/v1/auth/google/callback`,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  // MOCK: the frontend modal IS the authorize screen; the URL is informational.
  return `/api/v1/auth/google/consent?state=${encodeURIComponent(state)}`;
}

// ---------------------------------------------------------------------------
// Mock signed assertion (JWT shape) — validated on callback like a real ID
// token: signature (HMAC), issuer, audience, expiry, nonce (= state).
// ---------------------------------------------------------------------------

export class GoogleTokenValidationError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

export function mockGoogleIdToken(claims: {
  sub: string;
  email: string;
  nonce: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: GOOGLE_ISSUER,
      aud: "trustscore_google_audience",
      sub: claims.sub,
      email: claims.email,
      email_verified: true, // Google asserts verified emails
      nonce: claims.nonce,
      iat: now,
      exp: now + 120,
    })
  );
  const sig = createHmac("sha256", `${MOCK_SIGNING_SECRET}:google`)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function validateGoogleIdToken(
  token: string,
  expectedNonce: string
): { sub: string; email: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new GoogleTokenValidationError("malformed");
  const [header, payload, sig] = parts;
  const expected = createHmac("sha256", `${MOCK_SIGNING_SECRET}:google`)
    .update(`${header}.${payload}`)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new GoogleTokenValidationError("bad_signature");

  let claims: {
    iss?: string; aud?: string; sub?: string; email?: string;
    email_verified?: boolean; nonce?: string; exp?: number;
  };
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    throw new GoogleTokenValidationError("bad_payload");
  }
  if (claims.iss !== GOOGLE_ISSUER) throw new GoogleTokenValidationError("bad_issuer");
  if (claims.aud !== "trustscore_google_audience")
    throw new GoogleTokenValidationError("bad_audience");
  if (!claims.sub || !claims.email) throw new GoogleTokenValidationError("missing_claims");
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now())
    throw new GoogleTokenValidationError("expired");
  if (claims.nonce !== expectedNonce) throw new GoogleTokenValidationError("bad_nonce");
  return { sub: claims.sub, email: claims.email.toLowerCase() };
}

// The consent screen copy the mock modal shows (and the LIVE Google screen
// implies by the requested scopes).
export function googleConsentScreen() {
  return {
    provider: GOOGLE_PROVIDER_NAME,
    providerMode: GOOGLE_MODE,
    scopes: GOOGLE_SCOPES,
    purpose: "Sign in to TrustScore with your Google Account",
    sharing:
      "TrustScore will receive your Google account ID and email address. It will NOT see your password or your Google profile.",
    policyUrl: "https://policies.google.com/privacy",
  };
}
