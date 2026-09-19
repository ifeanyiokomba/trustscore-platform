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
import { CAPABILITIES } from "@/lib/providers/scope-mapping.config";
import { guardedSecret } from "@/lib/platform/boot-guard";

// ---------------------------------------------------------------------------
// Contract constants (to be replaced with partner-supplied values — audit §2.2)
// ---------------------------------------------------------------------------

export const NINAUTH_PROVIDER_NAME = "NINAUTH_MOCK";
export const NINAUTH_MODE: "MOCK" | "LIVE" = "MOCK"; // honestly labeled everywhere

export const NINAUTH_CLIENT_ID = "trustscore_sandbox";

// Backend-only secret. In LIVE mode this becomes the partner-issued client
// secret from the environment — still never exposed to any frontend.
// sec-batch-A: guarded read — production refuses to boot on the dev default.
const NINAUTH_CLIENT_SECRET = guardedSecret("NINAUTH_CLIENT_SECRET");

const MOCK_ISSUER = "https://ninauth.nimc.gov.ng/mock";
const ID_TOKEN_TTL_SEC = 300;

// Stage 13 — loopback trust config: the provider simulator on :3032 issues
// ID tokens signed with ITS OWN key (production: the partner's JWKS). The
// backend validates against THIS issuer + signing secret when the platform
// posture is `loopback` — the validation DISCIPLINE stays identical.
export const LOOPBACK_ISSUER = "https://provider-simulator.loopback/ninauth";
export const LOOPBACK_SIGNING_SECRET = guardedSecret("LOOPBACK_SIGNING_SECRET");

export const SESSION_TTL_MS = 10 * 60_000; // verification session TTL (authorize-flow-like)
export const CODE_TTL_MS = 60_000; // one-time authorization code TTL
export const IDENTITY_FRESHNESS_DAYS = 90; // re-verification horizon

// Proposed scope catalog — DERIVED from the externalized capability→scope
// mapping config (Batch 1, G5/PV2: the mapping is config, not code). The real
// partner scope strings replace the mockScope column in
// scope-mapping.config.ts when the contract publishes them; the consent UX
// contract stays the same. CORE scopes are always required for verification;
// OPTIONAL scopes unlock consent-scoped identity attributes (Stage 3) — the
// user opts in per field.
export const SCOPE_CATALOG: Record<
  string,
  {
    label: string;
    description: string;
    core?: boolean;
    attributeKeys?: string[];
    /** Batch 3 — documented official pii-fields paths under this capability. */
    piiFieldPaths?: string[];
  }
> = Object.fromEntries(
  CAPABILITIES.map((c) => [
    c.mockScope,
    {
      label: c.label,
      description: c.description,
      ...(c.core ? { core: c.core } : {}),
      ...(c.attributeKeys.length ? { attributeKeys: [...c.attributeKeys] } : {}),
      ...(c.piiFieldPaths.length ? { piiFieldPaths: [...c.piiFieldPaths] } : {}),
    },
  ])
);

export const CORE_SCOPES = CAPABILITIES.filter((c) => c.core).map((c) => c.mockScope);
export const OPTIONAL_SCOPES = CAPABILITIES.filter(
  (c) => !c.core && c.attributeKeys.length > 0
).map((c) => c.mockScope);
export const DEFAULT_SCOPES = [...CORE_SCOPES];
export const PURPOSE = "SELF_IDENTITY_VERIFICATION";
export const REQUESTER = "TrustScore";
export const CONSENT_POLICY_VERSION = "consent-policy-2026.09";

// Stage 16 — NINAuth authentication ("Continue with NINAuth"). The developer
// guide models authentication as a first-class NINAuth flow: the service
// initiates authentication, the user approves in the NINAuth app, and the
// application receives a signed, scoped assertion. Auth requests the core
// identity scopes; profile.name is optional (used only to name a new account
// on first sign-in — declining it falls back to a neutral display name).
export const AUTH_PURPOSE = "NINAUTH_AUTHENTICATION";
export const AUTH_SCOPES = [...CORE_SCOPES];
export const AUTH_LOGIN_TTL_MS = 10 * 60_000;

// Attributes a scope produces (used by the Stage 3 attribute writer).
export function attributeKeysForScopes(scopes: string[]): string[] {
  return scopes.flatMap((s) => SCOPE_CATALOG[s]?.attributeKeys ?? []);
}

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

export interface ProfileClaims {
  given_name?: string;
  family_name?: string;
  birth_year?: string;
  state_of_origin?: string;
}

export interface IdTokenClaims {
  iss: string;
  aud: string;
  sub: string; // masked subject reference — NEVER a raw NIN
  scopes: string[];
  nonce: string;
  verified: boolean;
  profile?: ProfileClaims; // consent-scoped claims — only keys the scopes allow
  // Stage 16 — authentication assertions carry the account-binding email the
  // user confirmed inside the NINAuth app (MOCK binding surface). Never a NIN.
  email?: string;
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

export interface TokenTrustConfig {
  issuer: string;
  audience: string;
  secret: string;
}

// Default trust = the in-process mock provider (existing behavior).
const MOCK_TRUST: TokenTrustConfig = {
  issuer: MOCK_ISSUER,
  audience: NINAUTH_CLIENT_ID,
  secret: NINAUTH_CLIENT_SECRET,
};

// Loopback trust = the simulator's issuer + signing key (Stage 13).
export const LOOPBACK_TRUST: TokenTrustConfig = {
  issuer: LOOPBACK_ISSUER,
  audience: NINAUTH_CLIENT_ID,
  secret: LOOPBACK_SIGNING_SECRET,
};

export function validateIdToken(
  token: string,
  expectedNonce: string,
  trust: TokenTrustConfig = MOCK_TRUST
): IdTokenClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new TokenValidationError("malformed_token");
  }
  const [header, payload, signature] = parts;

  // 1. Signature check (JWKS-backed verification in LIVE mode; the loopback
  //    simulator signs with its own shared key, validated identically).
  const expectedSig = createHmac("sha256", trust.secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
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
  if (claims.iss !== trust.issuer) {
    throw new TokenValidationError("bad_issuer");
  }
  // 3. Audience
  if (claims.aud !== trust.audience) {
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
  profile: ProfileClaims; // filtered by granted scopes inside
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

  const profile: ProfileClaims = {};
  if (input.scopes.includes("profile.name")) {
    profile.given_name = input.profile.given_name;
    profile.family_name = input.profile.family_name;
  }
  if (input.scopes.includes("profile.demographics")) {
    profile.birth_year = input.profile.birth_year;
    profile.state_of_origin = input.profile.state_of_origin;
  }

  const id_token = issueMockIdToken({
    iss: MOCK_ISSUER,
    aud: NINAUTH_CLIENT_ID,
    sub: input.maskedSubject,
    scopes: input.scopes,
    nonce: input.nonce,
    verified: true,
    profile,
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
// Stage 3 — hashed identifier fingerprint (directive §29 identity_identifiers).
// The identifier hash lets future Safety Checks (Stage 6) match a presented
// identifier against identities WITHOUT storing any raw value.
export function identifierFingerprint(providerSubject: string): string {
  return createHash("sha256")
    .update(`${NINAUTH_CLIENT_SECRET}:identifier:${providerSubject}`)
    .digest("hex");
}

// ---------------------------------------------------------------------------
// Stage 3 — deterministic MOCK profile claims per user (contract-first: the
// LIVE partner returns these fields from the NIN record for granted scopes).
// ---------------------------------------------------------------------------

const GIVEN_NAMES = [
  "Adaeze", "Chidi", "Ngozi", "Emeka", "Funke", "Tunde",
  "Amina", "Ibrahim", "Yemi", "Chioma", "Bala", "Halima",
];
const FAMILY_NAMES = [
  "Okafor", "Eze", "Adeyemi", "Bello", "Okonkwo", "Lawal",
  "Uche", "Danladi", "Oliseh", "Abubakar", "Nwosu", "Afolayan",
];
const STATES = [
  "Anambra", "Enugu", "Lagos", "Kano", "Rivers", "Oyo",
  "Kaduna", "Delta", "Imo", "Sokoto", "Edo", "Plateau",
];

function seededFrom(seed: string, modulo: number): number {
  const h = createHash("sha256").update(`${NINAUTH_CLIENT_SECRET}:seed:${seed}`).digest();
  return h.readUInt32BE(0) % modulo;
}

export function mockProfileFor(userId: string): ProfileClaims {
  return {
    given_name: GIVEN_NAMES[seededFrom(`gn:${userId}`, GIVEN_NAMES.length)],
    family_name: FAMILY_NAMES[seededFrom(`fn:${userId}`, FAMILY_NAMES.length)],
    birth_year: String(1972 + seededFrom(`by:${userId}`, 28)),
    state_of_origin: STATES[seededFrom(`st:${userId}`, STATES.length)],
  };
}

// ---------------------------------------------------------------------------
// Consent screen contract (what NINAuth shows the user: requester, fields, purpose)
// ---------------------------------------------------------------------------

export interface ConsentField {
  scope: string;
  label: string;
  description: string;
  core?: boolean;
  /**
   * Batch 3 — the documented official `dataRequested[]` pii-fields paths this
   * capability maps to (scope-mapping.config.ts). Disclosed on the consent
   * screen so the granularity we bundle is transparent against NINAuth's
   * field-level catalog. Empty for status-only capabilities.
   */
  fieldPaths?: string[];
}

export interface ConsentScreen {
  requester: string;
  purpose: string;
  fields: ConsentField[];
  policyVersion: string;
  provider: string;
  mode: "MOCK" | "LIVE";
}

export function consentScreenFor(scopes: string[], purpose: string = PURPOSE): ConsentScreen {
  const fields = scopes
    .filter((s) => SCOPE_CATALOG[s])
    .map((s) => ({
      scope: s,
      label: SCOPE_CATALOG[s].label,
      description: SCOPE_CATALOG[s].description,
      core: SCOPE_CATALOG[s].core ?? false,
      ...(SCOPE_CATALOG[s].piiFieldPaths?.length
        ? { fieldPaths: [...SCOPE_CATALOG[s].piiFieldPaths!] }
        : {}),
    }));
  return {
    requester: REQUESTER,
    purpose,
    fields: fields.length
      ? fields
      : [
          {
            scope: "identity.basic",
            label: SCOPE_CATALOG["identity.basic"].label,
            description: SCOPE_CATALOG["identity.basic"].description,
            core: true,
          },
        ],
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

// ---------------------------------------------------------------------------
// Stage 16 — NINAuth authentication contract ("Continue with NINAuth").
// Same OAuth 2.0 + PKCE discipline as identity verification, scoped to
// authentication: the user approves in the (mock) NINAuth app and TrustScore
// receives a signed assertion whose subject binds to a UserAccount.
// ---------------------------------------------------------------------------

// The auth authorize URL shape (mock endpoint — displayed, never fetched).
export function authAuthorizationUrlFor(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: NINAUTH_CLIENT_ID,
    response_type: "code",
    scope: AUTH_SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    redirect_uri: "https://trustscore.ng/api/v1/auth/ninauth/callback",
    prompt: "login",
  });
  return `https://ninauth.nimc.gov.ng/mock/authorize?${params.toString()}`;
}

// Auth subject — the masked NINAuth reference an authentication assertion
// carries. In MOCK posture the simulated NINAuth app binds to the confirmed
// email (the stand-in for the biometrically-bound NINAuth identity); in LIVE
// posture the partner's stable subject arrives in the assertion and this
// derivation disappears. Same shape as the verification subject: opaque.
export function maskedSubjectForAuthKey(authKey: string): string {
  const h = createHash("sha256")
    .update(`${NINAUTH_CLIENT_SECRET}:authsubject:${authKey}`)
    .digest("hex")
    .slice(0, 4)
    .toUpperCase();
  return `NINAUTH-****-${h}`;
}

// The mock /token exchange for the AUTH flow. Identical one-time-code + PKCE
// discipline to mockTokenExchange; issues an authentication assertion with the
// account-binding email claim and (optionally) the consented name claims.
export function mockAuthTokenExchange(input: {
  code: string;
  storedCodeHash: string;
  codeExpiresAt: Date;
  codeVerifier: string;
  codeChallenge: string;
  nonce: string;
  maskedSubject: string;
  authEmail: string;
  scopes: string[];
  profile: ProfileClaims;
}): TokenResponse {
  if (!codeMatches(input.storedCodeHash, input.code)) {
    throw new TokenValidationError("bad_code");
  }
  if (input.codeExpiresAt.getTime() < Date.now()) {
    throw new TokenValidationError("code_expired");
  }
  if (!pkceChallengeMatches(input.codeVerifier, input.codeChallenge)) {
    throw new TokenValidationError("pkce_mismatch");
  }

  const profile: ProfileClaims = {};
  if (input.scopes.includes("profile.name")) {
    profile.given_name = input.profile.given_name;
    profile.family_name = input.profile.family_name;
  }

  const id_token = issueMockIdToken({
    iss: MOCK_ISSUER,
    aud: NINAUTH_CLIENT_ID,
    sub: input.maskedSubject,
    scopes: input.scopes,
    nonce: input.nonce,
    verified: true,
    profile,
    email: input.authEmail,
  });

  return {
    access_token: `ts_mock_at_${randomBytes(24).toString("base64url")}`,
    token_type: "Bearer",
    expires_in: 3600,
    id_token,
  };
}
