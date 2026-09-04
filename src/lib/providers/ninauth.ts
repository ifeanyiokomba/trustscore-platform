// TrustScore Stage 2 — NINAuth provider adapter (CONTRACT-FIRST, MOCK transport).
//
// This module implements the exact contract the real NINAuth partner integration
// will use (per docs/STAGE0_AUDIT.md §2.1/§4.2):
//   OAuth 2.0 Authorization Code flow + PKCE (S256), OIDC-style ID tokens,
//   consent-bound scoped responses — with a MOCK transport. The LIVE
// implementation swaps only the transport (HTTP calls to the partner's
// authorize/token endpoints) — the session, PKCE, validation and consent logic
// stays identical.
//
// Security invariants (directive §32):
//   - Client secret lives ONLY here (backend) — never sent to any client.
//   - ID tokens are VALIDATED (signature, issuer, audience, expiry, nonce) —
//     never merely decoded.
//   - The PKCE verifier never leaves the server.
//   - The provider returns a MASKED subject reference — never a raw NIN.

import {
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";

// ---------------------------------------------------------------------------
// Contract constants (to be replaced with partner-supplied values — audit §2.2)
// ---------------------------------------------------------------------------

export const NINAUTH_PROVIDER_NAME = "NINAUTH_MOCK";
export const NINAUTH_MODE: "MOCK" | "LIVE" = "MOCK"; // honestly labeled everywhere

export const NINAUTH_CLIENT_ID = "trustscore_sandbox";

// Backend-only secret. In LIVE mode this becomes the partner-issued client
// secret from the environment — still never exposed to any frontend.
const NINAUTH_CLIENT_SECRET =
  process.env.NINAUTH_CLIENT_SECRET ?? "ts_backend_only_mock_partner_secret";

const MOCK_ISSUER = "https://ninauth.nimc.gov.ng/mock";
const ID_TOKEN_TTL_SEC = 300;

export const SESSION_TTL_MS = 10 * 60_000; // verification session TTL (authorize-flow-like)
export const CODE_TTL_MS = 60_000; // one-time authorization code TTL
export const IDENTITY_FRESHNESS_DAYS = 90; // re-verification horizon

// Proposed scope catalog (contract-first). The real partner scope strings will
// replace these identifiers; the consent UX contract stays the same.
export const SCOPE_CATALOG: Record<
  string,
  { label: string; description: string }
> = {
  "identity.basic": {
    label: "Basic identity",
    description: "Verification status and masked identity reference only",
  },
  "identity.nin_status": {
    label: "NIN verification status",
    description: "Whether your government identity record is verified — never the NIN itself",
  },
  "identity.phone_status": {
    label: "Phone binding status",
    description: "Whether a phone number is bound to the identity (Stage 4)",
  },
};

export const DEFAULT_SCOPES = ["identity.basic", "identity.nin_status"];
export const PURPOSE = "SELF_IDENTITY_VERIFICATION";
export const REQUESTER = "TrustScore";
export const CONSENT_POLICY_VERSION = "consent-policy-2026.09";

// ---------------------------------------------------------------------------
// PKCE (real mechanics — S256)
// ---------------------------------------------------------------------------

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

export function generateState(): string {
  return randomBytes(24).toString("hex");
}

export function generateShareCode(): string {
  const digits = randomBytes(2).toString("hex").slice(0, 4).replace(/[a-f]/g, (c) => String(c.charCodeAt(0) % 10));
  const letters = randomBytes(4).toString("base64url").replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
  return `TS-${digits}-${letters.padEnd(4, "X")}`;
}

export function pkceChallengeMatches(verifier: string, challenge: string): boolean {
  const computed = createHash("sha256").update(verifier).digest("base64url");
  return safeEqual(computed, challenge);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// ---------------------------------------------------------------------------
// Authorization code (issued by the mock "NINAuth app", one-time, 60s TTL)
// ---------------------------------------------------------------------------

export function issueAuthorizationCode(): {
  code: string;
  codeHash: string;
  expiresAt: Date;
} {
  const code = `nac_${randomBytes(24).toString("base64url")}`;
  return {
    code,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  };
}

export function hashCode(code: string): string {
  return createHash("sha256").update(`${NINAUTH_CLIENT_SECRET}:${code}`).digest("hex");
}

export function codeMatches(storedHash: string, code: string): boolean {
  return safeEqual(storedHash, hashCode(code));
}

// ---------------------------------------------------------------------------
// Mock OIDC-style ID token: header.payload.signature, HMAC-SHA256 signed.
// The signature is verified on validation — exactly the discipline required
// for the LIVE partner JWKS-based validation.
// ---------------------------------------------------------------------------

export interface IdTokenClaims {
  iss: string;
  aud: string;
  sub: string; // masked subject reference — NEVER a raw NIN
  scopes: string[];
  nonce: string;
  verified: boolean;
  iat: number;
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", NINAUTH_CLIENT_SECRET).update(data).digest("base64url");
}

export function issueMockIdToken(claims: Omit<IdTokenClaims, "iat" | "exp">): string {
  const iat = Math.floor(Date.now() / 1000);
  const full: IdTokenClaims = { ...claims, iat, exp: iat + ID_TOKEN_TTL_SEC };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: "mock-key-1" }));
  const payload = b64url(JSON.stringify(full));
  const signature = sign(`${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
}

export function validateIdToken(token: string, expectedNonce: string): IdTokenClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new TokenValidationError("malformed_token");
  }
  const [header, payload, signature] = parts;

  // 1. Signature check (JWKS-backed verification in LIVE mode)
  const expectedSig = sign(`${header}.${payload}`);
  if (!safeEqual(signature, expectedSig)) {
    throw new TokenValidationError("bad_signature");
  }

  let claims: IdTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new TokenValidationError("bad_payload");
  }

  // 2. Issuer
  if (claims.iss !== MOCK_ISSUER) {
    throw new TokenValidationError("bad_issuer");
  }
  // 3. Audience
  if (claims.aud !== NINAUTH_CLIENT_ID) {
    throw new TokenValidationError("bad_audience");
  }
  // 4. Expiry / issue time
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp <= now) {
    throw new TokenValidationError("expired");
  }
  if (typeof claims.iat !== "number" || claims.iat > now + 60) {
    throw new TokenValidationError("bad_iat");
  }
  // 5. Nonce binding (anti-replay / session binding)
  if (claims.nonce !== expectedNonce) {
    throw new TokenValidationError("bad_nonce");
  }

  return claims;
}

export class TokenValidationError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "TokenValidationError";
  }
}

// ---------------------------------------------------------------------------
// Token endpoint contract (mock transport of the partner /token endpoint)
// ---------------------------------------------------------------------------

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  id_token: string;
}

export interface MockTokenExchangeInput {
  code: string;
  storedCodeHash: string;
  codeExpiresAt: Date;
  codeVerifier: string;
  codeChallenge: string;
  nonce: string;
  maskedSubject: string;
  scopes: string[];
}

export function mockTokenExchange(input: MockTokenExchangeInput): TokenResponse {
  // 1. Code validity (one-time code, 60s TTL) — timing-safe hash compare
  if (!codeMatches(input.storedCodeHash, input.code)) {
    throw new TokenValidationError("bad_code");
  }
  if (input.codeExpiresAt.getTime() < Date.now()) {
    throw new TokenValidationError("code_expired");
  }
  // 2. PKCE: S256(verifier) must equal the challenge bound at session creation
  if (!pkceChallengeMatches(input.codeVerifier, input.codeChallenge)) {
    throw new TokenValidationError("pkce_mismatch");
  }

  const id_token = issueMockIdToken({
    iss: MOCK_ISSUER,
    aud: NINAUTH_CLIENT_ID,
    sub: input.maskedSubject,
    scopes: input.scopes,
    nonce: input.nonce,
    verified: true,
  });

  return {
    access_token: `ts_mock_at_${randomBytes(24).toString("base64url")}`,
    token_type: "Bearer",
    expires_in: 3600,
    id_token,
  };
}

// Masked subject reference — stable per user, never a raw identifier.
export function maskedSubjectFor(userId: string): string {
  const h = createHash("sha256")
    .update(`${NINAUTH_CLIENT_SECRET}:subject:${userId}`)
    .digest("hex")
    .slice(0, 4)
    .toUpperCase();
  return `NINAUTH-****-${h}`;
}

// ---------------------------------------------------------------------------
// Consent screen contract (what NINAuth shows the user: requester, fields, purpose)
// ---------------------------------------------------------------------------

export interface ConsentField {
  scope: string;
  label: string;
  description: string;
}

export interface ConsentScreen {
  requester: string;
  purpose: string;
  fields: ConsentField[];
  policyVersion: string;
  provider: string;
  mode: "MOCK" | "LIVE";
}

export function consentScreenFor(scopes: string[]): ConsentScreen {
  const fields = scopes
    .filter((s) => SCOPE_CATALOG[s])
    .map((s) => ({
      scope: s,
      label: SCOPE_CATALOG[s].label,
      description: SCOPE_CATALOG[s].description,
    }));
  return {
    requester: REQUESTER,
    purpose: PURPOSE,
    fields: fields.length ? fields : [{ scope: "identity.basic", label: SCOPE_CATALOG["identity.basic"].label, description: SCOPE_CATALOG["identity.basic"].description }],
    policyVersion: CONSENT_POLICY_VERSION,
    provider: NINAUTH_PROVIDER_NAME,
    mode: NINAUTH_MODE,
  };
}

// The authorize URL shape (mock endpoint — displayed, never fetched, in sandbox)
export function authorizationUrlFor(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: NINAUTH_CLIENT_ID,
    response_type: "code",
    scope: DEFAULT_SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    redirect_uri: "https://trustscore.ng/api/v1/identity/sessions/callback",
  });
  return `https://ninauth.nimc.gov.ng/mock/authorize?${params.toString()}`;
}
