// GET /api/v1/admin/security-posture — sec-batch-A.
//
// ADMIN-only live read of the platform's security posture: which guarded
// secrets are running on dev defaults, provider MOCK/LIVE posture, CSP mode,
// rate-limiter topology. This is the surface that makes the previously
// dead `vaultUsesDefaultKey` flag (and every other honesty signal) actually
// observable by an operator.
//
// DISCIPLINE: this route returns BOOLEANS AND LABELS ONLY — no secret values,
// no hints, no lengths, nothing a caller could use to guess entropy. Reading
// posture is not audited (pure read, no state change).

import { NextRequest } from "next/server";
import { jsonError, jsonOk, newRequestId } from "@/lib/platform/http";
import { getSessionUser } from "@/lib/platform/session";
import { secretPosture, assertSecretsAtBoot } from "@/lib/platform/boot-guard";
import { vaultUsesDefaultKey } from "@/lib/providers/credential-vault";
import { NINAUTH_MODE } from "@/lib/providers/ninauth";
import { PHONE_MODE } from "@/lib/providers/phone-provider";
import { LIVENESS_MODE } from "@/lib/providers/liveness-provider";
import { GOOGLE_MODE } from "@/lib/providers/google";

export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  const user = await getSessionUser(req);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "No active session.", requestId);
  if (user.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Security posture is restricted to platform admins.", requestId);
  }

  // Evaluate posture fresh on every read (a mid-flight env change is visible
  // without a restart; the boot-time refusal itself stays cached).
  assertSecretsAtBoot();
  const secrets = secretPosture();

  const production = process.env.NODE_ENV === "production";
  const forceNonce = process.env.TS_FORCE_NONCE_CSP === "1";
  const cspMode =
    production || forceNonce
      ? "nonce"
      : "dev-compat (unsafe-inline scripts allowed; HMR requirement)";

  return jsonOk({
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    bootGuard: {
      // In production the platform refuses to serve at all when any guarded
      // secret is missing/defaulted/weak — this field describes the mode.
      enforced: production,
      strictFlag: process.env.TS_BOOT_GUARD_STRICT === "1",
    },
    secrets: secrets.map((s) => ({
      env: s.env,
      label: s.label,
      set: s.set,
      runningOnDevDefault: s.isDefault,
      // weak = would be REFUSED at a production boot (unset/known-weak/short).
      wouldFailProductionBoot: s.weak,
    })),
    allSecretsProductionReady: secrets.every((s) => !s.weak),
    vaultUsesDefaultKey,
    providers: {
      ninauth: NINAUTH_MODE,
      phone: PHONE_MODE,
      liveness: LIVENESS_MODE,
      google: GOOGLE_MODE,
    },
    csp: {
      mode: cspMode,
      scriptSrc:
        production || forceNonce
          ? "'self' 'nonce-<per-request>' 'strict-dynamic'"
          : "'self' 'unsafe-inline' ('unsafe-eval' in dev)",
      styleSrc: "'self' 'unsafe-inline'",
    },
    rateLimiting: {
      implementation: "in-memory fixed window (per-process, single instance)",
      loginPerIp: "8/min per client IP",
      loginPerAccount: "8 failures / 15 min per identifier (failure-only budget)",
      trustedProxyHops: process.env.TS_TRUSTED_PROXY_HOPS ?? "1",
      note: "Multi-instance requires the Redis swap (deferred, G13/G14)",
    },
    requestId,
  });
}
