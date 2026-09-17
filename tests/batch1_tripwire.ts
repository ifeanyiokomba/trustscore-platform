// TrustScore Batch 1 — G6/A2: tripwire depth-bound regression test.
//
// The scope-guard's raw-identifier tripwire scans provider payloads to a
// DOCUMENTED depth bound (4). This suite pins that contract against new claim
// shapes: nesting at every scanned depth, beyond-bound shapes (where the
// scope whitelist + minimal-shape construction must take over — defense in
// depth), key-casing/separator variants, arrays, nulls, and the exact error
// surface (code, blockedKeys) plus the non-throwing inspector.
//
// Run: bun tests/batch1_tripwire.ts
// Exit 0 = all green; non-zero = at least one FAIL.

import {
  enforceScopePipeline,
  inspectScopePipeline,
  RawIdentifierLeakError,
} from "../src/lib/providers/scope-guard";
import type { IdTokenClaims, ProfileClaims } from "../src/lib/providers/ninauth";

let PASS = 0;
let FAIL = 0;

function check(name: string, ok: boolean, detail = ""): void {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${name}${detail && !ok ? ` — ${detail}` : ""}`);
  if (ok) PASS += 1;
  else FAIL += 1;
}

/** Build a minimal valid claims object with an arbitrary extra top-level shape. */
function claimsWith(extra: Record<string, unknown>, profile: ProfileClaims = {}): IdTokenClaims {
  return {
    iss: "https://ninauth.nimc.gov.ng/mock",
    aud: "trustscore_sandbox",
    sub: "NINAUTH-****-AB12",
    scopes: ["identity.basic", "identity.nin_status", "profile.name"],
    nonce: "n",
    verified: true,
    profile,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
    ...extra,
  };
}

/** Nest `value` under `depth` levels of object wrappers (depth 0 = top level). */
function nested(depth: number, value: unknown): Record<string, unknown> {
  let node: unknown = value;
  for (let i = 0; i < depth; i++) node = { wrapper: node };
  return node as Record<string, unknown>;
}

const GRANTED = ["identity.basic", "identity.nin_status", "profile.name"];

console.log("== 1) tripwire fires at every scanned depth (bound = 4, inclusive) ==");

for (const depth of [0, 1, 2, 3, 4]) {
  let blocked = false;
  let blockedKeys: string[] = [];
  try {
    enforceScopePipeline(claimsWith(nested(depth, { nin: "12345678901" })), GRANTED);
  } catch (e) {
    blocked = e instanceof RawIdentifierLeakError;
    blockedKeys = e instanceof RawIdentifierLeakError ? e.blockedKeys : [];
  }
  check(
    `depth-${depth} raw 'nin' is blocked (fail closed)`,
    blocked,
    `depth ${depth} did not throw RawIdentifierLeakError`
  );
  if (depth === 0) {
    check("blockedKeys reports the offending key name", blockedKeys.includes("nin"), JSON.stringify(blockedKeys));
    check(
      "error code is RAW_IDENTIFIER_BLOCKED and name is set",
      (() => {
        try {
          enforceScopePipeline(claimsWith({ nin: "x" }), GRANTED);
          return false;
        } catch (e) {
          return e instanceof RawIdentifierLeakError && e.code === "RAW_IDENTIFIER_BLOCKED" && e.name === "RawIdentifierLeakError";
        }
      })()
    );
  }
}

console.log("== 2) beyond the documented bound — defense in depth holds ==");

// Depth 5+ is beyond the tripwire's scan. The scope whitelist + minimal-shape
// construction must still keep the leaked key OUT of storage.
for (const depth of [5, 6]) {
  const result = enforceScopePipeline(
    claimsWith(nested(depth, { nin: "12345678901" })),
    GRANTED
  );
  const serialized = JSON.stringify(result);
  check(
    `depth-${depth} past the tripwire bound: no raw value stored`,
    !serialized.includes("12345678901"),
    serialized
  );
  check(
    `depth-${depth} past the tripwire bound: no 'nin' key anywhere in output`,
    !/"nin"/.test(serialized),
    serialized
  );
  // The profile was empty anyway — shape must be exactly the constructed
  // minimal fields (email is always constructed; JSON drops it when absent).
  check(
    `depth-${depth} minimal shape — only constructed fields, no passthrough`,
    Object.keys(result).sort().join(",") === "email,profile,scopes,sub,verified" &&
      !("email" in result && result.email !== undefined),
    Object.keys(result).join(",")
  );
}

console.log("== 3) key normalization — casing and separator variants are caught ==");

for (const key of ["NIN", "NIn_Number", "ninNumber", "n i n", "nin-number", "nimc_nin", "nationalIdNumber", "identity_number", "bvn", "voters_number"]) {
  let blocked = false;
  try {
    enforceScopePipeline(claimsWith({ [key]: "x" }), GRANTED);
  } catch (e) {
    blocked = e instanceof RawIdentifierLeakError;
  }
  check(`variant key '${key}' is blocked`, blocked);
}

console.log("== 4) new claim shapes — arrays, nulls, deep JSON ==");

// Array of objects carrying a raw identifier (array items are traversed).
let blocked = false;
try {
  enforceScopePipeline(
    claimsWith({ profile_aliases: [{ label: "a", nin: "12345678901" }] }),
    GRANTED
  );
} catch (e) {
  blocked = e instanceof RawIdentifierLeakError;
}
check("array item carrying 'nin' is blocked (depth 2)", blocked);

// Nulls and empty objects must not crash the scan.
let okShape = true;
try {
  enforceScopePipeline(claimsWith({ maybe: null, empty: {}, list: [] }), GRANTED);
} catch {
  okShape = false;
}
check("nulls/empties pass through the scan without crashing", okShape);

// Raw identifier inside a granted profile's NESTED unknown key: dropped by
// the whitelist even at depth 2 within profile (tripwire also covers it —
// expect the tripwire, the stronger guarantee).
blocked = false;
try {
  enforceScopePipeline(
    claimsWith({}, { given_name: "Ada", extra: { nin: "12345678901" } } as unknown as ProfileClaims),
    GRANTED
  );
} catch (e) {
  blocked = e instanceof RawIdentifierLeakError;
}
check("raw identifier nested inside an unknown profile key is blocked", blocked);

console.log("== 5) scope whitelist — ungranted attributes never survive ==");

const result = enforceScopePipeline(
  claimsWith(
    {},
    {
      given_name: "Ada",
      family_name: "Eze",
      birth_year: "1990",
      state_of_origin: "Anambra",
      phone_number: "+2348000000000",
    } as unknown as ProfileClaims
  ),
  GRANTED // profile.name only — demographics NOT granted
);
check(
  "granted profile.name keys survive",
  result.profile.given_name === "Ada" && result.profile.family_name === "Eze"
);
check(
  "ungranted demographics keys are dropped",
  result.profile.birth_year === undefined && result.profile.state_of_origin === undefined
);
check(
  "unknown keys (phone_number) are dropped",
  (result.profile as unknown as Record<string, unknown>).phone_number === undefined
);
check(
  "scopes echoed are exactly the granted list",
  JSON.stringify(result.scopes) === JSON.stringify(GRANTED)
);
check("verified flag propagates", result.verified === true);
check(
  "masked subject passes through unchanged",
  result.sub === "NINAUTH-****-AB12"
);

const unverified = enforceScopePipeline(
  { ...claimsWith({}), verified: false },
  ["identity.basic"]
);
check("verified:false propagates (never coerced to true)", unverified.verified === false);

console.log("== 6) inspector — non-throwing report surface ==");

const inspected = inspectScopePipeline(claimsWith({ NIN: "x" }), GRANTED);
check("inspector reports blocked:true with the key", inspected.blocked && inspected.blockedKeys.includes("NIN"));
check("inspector returns no sanitized payload when blocked", inspected.sanitized === null);
const inspectedClean = inspectScopePipeline(claimsWith({}, { given_name: "Ada" }), GRANTED);
check(
  "inspector sanitizes when clean",
  !inspectedClean.blocked && inspectedClean.sanitized?.profile.given_name === "Ada"
);

// ---------------------------------------------------------------------------
console.log(`\ntripwire matrix: ${PASS} passed, ${FAIL} failed (of ${PASS + FAIL})`);
if (FAIL > 0) process.exit(1);
