// TrustScore sec-batch-A — boot-time secret posture guard.
//
// Every security-critical secret that historically fell back to a hardcoded
// dev constant now routes through `guardedSecret()`. The guard:
//
//   - DEV: falls back to the dev constant AND logs ONE loud warning naming
//     every defaulted secret (honest posture, visible in dev.log). The dev
//     constants themselves are safe to expose only because the sandbox runs
//     MOCK providers with no real person data — production is different.
//
//   - PRODUCTION: REFUSES TO OPERATE. `assertSecretsAtBoot()` throws at first
//     module load (middleware + every provider import), failing requests with
//     a 500 rather than silently protecting identity fingerprints with a
//     constant that lives in the public repo's history. A value fails the
//     check when it is missing, equal to its dev default, equal to a known
//     `.env.example` placeholder, or shorter than 16 characters.
//
// Why this matters (external review, sec-batch-A): SIGNAL_PEPPER turns raw
// phone numbers and NIN references into the peppered fingerprints the whole
// privacy pitch rests on; a silent default fallback makes every fingerprint
// reversible by anyone who has read the source. VAULT_MASTER_KEY guards every
// provider credential at rest. Same class for the NINAuth/loopback signing
// secrets. `vaultUsesDefaultKey` and friends now read from this module, so
// the "honesty signal" is enforced, not just displayed.

export interface SecretSpec {
  /** Environment variable that must carry the real value in production. */
  env: string;
  /** Dev-only fallback constant (public, safe only in sandbox posture). */
  devDefault: string;
  /** Human explanation of what the secret protects. */
  label: string;
}

export const SECRET_SPECS: readonly SecretSpec[] = [
  {
    env: "VAULT_MASTER_KEY",
    devDefault: "ts_dev_only_vault_master_key",
    label: "AES-256-GCM master key for the provider credential vault",
  },
  {
    env: "SIGNAL_PEPPER",
    devDefault: "ts_backend_only_signal_pepper",
    label: "pepper for identifier fingerprints (phone / NIN references)",
  },
  {
    env: "NINAUTH_CLIENT_SECRET",
    devDefault: "ts_backend_only_mock_partner_secret",
    label: "NINAuth partner client secret (mock ID-token signing in sandbox)",
  },
  {
    env: "LOOPBACK_SIGNING_SECRET",
    devDefault: "ts_backend_only_loopback_signing_secret",
    label: "loopback provider-simulator ID-token signing secret",
  },
] as const;

// Values that must never reach production: dev defaults above plus the
// placeholder strings shipped in .env.example (someone copying the example
// file without editing it is exactly the "one forgotten env var" failure).
const WEAK_VALUES = new Set([
  ...SECRET_SPECS.map((s) => s.devDefault),
  "dev-only-pepper-change-me",
  "loopback-dev-secret",
  "dev-transport-hmac-key",
  "dev-webhook-secret",
  "change-me",
  "changeme",
  "secret",
  "password",
]);

const MIN_PRODUCTION_LENGTH = 16;

const specByEnv = new Map(SECRET_SPECS.map((s) => [s.env, s]));

export interface SecretPosture {
  env: string;
  label: string;
  /** True when the env var is present (value never leaves the process). */
  set: boolean;
  /** True when unset AND the dev default is in use. */
  isDefault: boolean;
  /** True when the value would be rejected in production (unset/known-weak/short). */
  weak: boolean;
}

function evaluate(spec: SecretSpec): SecretPosture {
  const value = process.env[spec.env];
  const set = value !== undefined && value !== "";
  return {
    env: spec.env,
    label: spec.label,
    set,
    isDefault: !set,
    weak:
      !set ||
      value!.length < MIN_PRODUCTION_LENGTH ||
      WEAK_VALUES.has(value!),
  };
}

/** Posture for every guarded secret — booleans and labels only, never values. */
export function secretPosture(): SecretPosture[] {
  return SECRET_SPECS.map(evaluate);
}

/** True when any guarded secret is running on its dev default. */
export function anyDefaultSecrets(): boolean {
  return SECRET_SPECS.some((spec) => !process.env[spec.env]);
}

/** Posture read for the vault honesty flag (was previously wired to nothing). */
export function secretIsDefault(env: string): boolean {
  const spec = specByEnv.get(env);
  if (!spec) return false;
  return !process.env[env];
}

const isStrict = () =>
  process.env.NODE_ENV === "production" || process.env.TS_BOOT_GUARD_STRICT === "1";

let asserted = false;

/**
 * Boot-time assertion. Called at module scope from middleware and from every
 * guarded provider module, so the check runs before the first byte of any
 * security-relevant work:
 *   - production (or TS_BOOT_GUARD_STRICT=1): THROWS when any guarded secret
 *     is missing, defaulted, known-weak or too short. The platform would
 *     rather fail closed in an obvious way than protect fingerprints with a
 *     public constant.
 *   - dev: logs one loud warning listing every defaulted secret.
 * Idempotent per process (and per hot-reloaded module instance).
 */
export function assertSecretsAtBoot(): void {
  if (asserted) return;
  asserted = true;

  const strict = isStrict();
  const bad = SECRET_SPECS.map(evaluate).filter((p) => p.weak);

  if (strict && bad.length > 0) {
    throw new Error(
      [
        "[boot-guard] REFUSING TO START: security-critical secrets are unset/weak in a production boot:",
        ...bad.map((p) => `  - ${p.env} (${p.label}) — set a strong value (≥${MIN_PRODUCTION_LENGTH} chars, not a dev default or .env.example placeholder)`),
        "The identity layer (peppered fingerprints, credential vault, token signing) must never run on public dev constants.",
      ].join("\n")
    );
  }

  if (bad.length > 0) {
    // Dev honesty: visible in dev.log on every cold start.
    console.warn(
      [
        "[boot-guard] DEV POSTURE — security secrets running on public dev constants (fine for MOCK sandbox, fatal in production):",
        ...bad.map((p) => `  - ${p.env}: ${p.label}`),
      ].join("\n")
    );
  } else {
    console.info("[boot-guard] all guarded secrets configured (no dev defaults in use).");
  }
}

/**
 * Read a guarded secret with the dev fallback — and the production refusal.
 * Replaces every `process.env.X ?? "ts_dev_only_..."` pattern in providers.
 */
export function guardedSecret(env: string): string {
  assertSecretsAtBoot();
  const spec = specByEnv.get(env);
  if (!spec) {
    throw new Error(`[boot-guard] guardedSecret("${env}") is not a registered secret spec`);
  }
  return process.env[env] ?? spec.devDefault;
}
