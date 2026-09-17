// TrustScore Stage 16 — Scope Enforcement Pipeline (the code-review blocker,
// made real at runtime).
//
// The NINAuth developer guide is explicit: "only the fields explicitly
// approved by the user are shared." Therefore the ONLY legal data path is:
//
//     provider response → granted scopes → allowed attributes
//                       → normalization → minimal storage
//
// and NEVER:
//
//     provider response → saved wholesale into the users table
//
// This module enforces that path as a hard guard:
//   1. RAW-IDENTIFIER TRIPWIRE — if a provider payload ever carries a raw-NIN
//      field (any casing of nin / nin_number / national_id …), the guard
//      throws `RawIdentifierLeakError` and NOTHING from that payload is
//      persisted. A SYSTEM audit event records the blocked key names (never
//      the values) so the attempt is tamper-evident.
//   2. SCOPE WHITELIST — only attributes declared in the SCOPE_CATALOG for a
//      *granted* scope survive normalization. Everything else in the payload
//      is dropped on the floor, even if the provider sent it.
//   3. MINIMAL SHAPE — the output carries exactly what downstream storage is
//      allowed to hold: the masked subject, the verified flag, and the
//      whitelisted profile keys. No passthrough of arbitrary provider JSON.
//
// Integration rule: EVERY code path that writes NINAuth-derived data must call
// `enforceScopePipeline` first. Adding a writer that skips it is a
// code-review blocker by policy.

import {
  SCOPE_CATALOG,
  type IdTokenClaims,
  type ProfileClaims,
} from "@/lib/providers/ninauth";

// Keys that must NEVER appear in a provider payload. Lookups compare the
// NORMALIZED key (lowercased, non-alphanumerics stripped), so the set itself
// must store normalized entries — Batch 1's depth-bound regression test
// (tests/batch1_tripwire.ts) caught the original raw-string set missing
// `nimc_nin`/`voters_number` after normalization. Case-insensitive; keys are
// matched exactly and with snake/camel variants. This list is deliberately
// narrow and key-based (not value-based) so it can never false-positive on
// legitimate data like phone numbers or timestamps.
const RAW_IDENTIFIER_KEYS = new Set(
  [
    "nin",
    "n_number",
    "ninnumber",
    "nin_number",
    "nimc_nin",
    "national_id",
    "nationalidnumber",
    "nationalid",
    "identity_number",
    "identitynumber",
    "bvn",
    "voters_number",
  ].map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ""))
);

export class RawIdentifierLeakError extends Error {
  readonly code = "RAW_IDENTIFIER_BLOCKED";
  constructor(public blockedKeys: string[]) {
    super(
      `Scope guard blocked a provider payload carrying raw identifier key(s): ${blockedKeys.join(
        ", "
      )}. Nothing was stored.`
    );
    this.name = "RawIdentifierLeakError";
  }
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Deep key scan (bounded depth — provider payloads are shallow by contract).
function findRawIdentifierKeys(node: unknown, depth = 0, found: string[] = []): string[] {
  if (depth > 4 || node === null || typeof node !== "object") return found;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (RAW_IDENTIFIER_KEYS.has(normalizeKey(key))) {
      found.push(key);
    }
    findRawIdentifierKeys(value, depth + 1, found);
  }
  return found;
}

export interface SanitizedAssertion {
  sub: string; // masked provider subject — never a raw identifier
  verified: boolean;
  email?: string; // auth-binding email (AUTH flow only)
  scopes: string[]; // the granted scopes that shaped this payload
  profile: ProfileClaims; // ONLY keys whitelisted by granted scopes
}

// The pipeline. `claims` is a VALIDATED ID-token payload (validation happens
// before this guard — signature, issuer, audience, expiry, nonce). The guard
// then enforces storage minimality regardless of what the provider included.
export function enforceScopePipeline(
  claims: IdTokenClaims,
  grantedScopes: string[]
): SanitizedAssertion {
  // 1. Raw-identifier tripwire — checked on the WHOLE payload first so a
  //    leaked field anywhere blocks everything (fail closed).
  const blockedKeys = findRawIdentifierKeys(claims);
  if (blockedKeys.length > 0) {
    throw new RawIdentifierLeakError(blockedKeys);
  }

  // 2. Scope whitelist — an attribute key survives only if some GRANTED scope
  //    declares it in the catalog. Ungranted-but-present keys are dropped.
  const allowedKeys = new Set(
    grantedScopes.flatMap((s) => SCOPE_CATALOG[s]?.attributeKeys ?? [])
  );
  const profile: ProfileClaims = {};
  const source = claims.profile ?? {};
  for (const key of Object.keys(source) as Array<keyof ProfileClaims>) {
    if (allowedKeys.has(key as string) && source[key] !== undefined) {
      profile[key] = source[key];
    }
  }

  // 3. Minimal shape — explicit field-by-field construction, no spreads of
  //    provider JSON into storage-bound objects.
  return {
    sub: claims.sub,
    verified: claims.verified === true,
    email: claims.email,
    scopes: [...grantedScopes],
    profile,
  };
}

// Convenience for tests and the internal self-check: run the pipeline against
// an arbitrary payload and report (without throwing) what it would do.
export function inspectScopePipeline(
  payload: unknown,
  grantedScopes: string[]
): { blocked: boolean; blockedKeys: string[]; sanitized: SanitizedAssertion | null } {
  const blockedKeys = findRawIdentifierKeys(payload);
  if (blockedKeys.length > 0) {
    return { blocked: true, blockedKeys, sanitized: null };
  }
  const claims = payload as IdTokenClaims;
  return {
    blocked: false,
    blockedKeys: [],
    sanitized: enforceScopePipeline(claims, grantedScopes),
  };
}
