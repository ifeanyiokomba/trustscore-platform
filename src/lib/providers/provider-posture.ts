// TrustScore Stage 13 — Provider posture (mock | loopback | live).
//
// The posture is a platform setting (PlatformSetting key "providers.posture"),
// NOT an env var — it flips at runtime through the admin console without a
// restart, and every read is cached in-memory for 5s (single instance,
// documented). Default: "mock" — every existing stage matrix stays green.
//
//   mock     — the contract-first MOCK transports (Stages 2–4 behavior,
//              honest labels everywhere; the default sandbox posture).
//   loopback — the REAL transport code path (signing, timeouts, retries,
//              circuit breaker, metrics) pointed at the local provider
//              simulator mini-service :3032. Exercises everything LIVE will
//              use except the partner itself.
//   live     — the partner's real endpoints + vault credentials. Honestly
//              gated: requires PROVIDER_LIVE_ENABLED=true, per-provider base
//              URLs AND an ACTIVE vault credential for each provider. The
//              sandbox has none of these, so the API answers 422 instead of
//              pretending.

import { db } from "@/lib/db";
import {
  PROVIDER_KEYS,
  providerTransportStatus,
  LOOPBACK_BASE_URL,
  type ProviderKey,
} from "@/lib/providers/transport";
import { listCredentials } from "@/lib/providers/credential-vault";

export const PROVIDER_POSTURE_KEY = "providers.posture";

export type ProviderPosture = "mock" | "loopback" | "live";

export const PROVIDER_LABELS: Record<ProviderKey, { title: string; role: string }> = {
  ninauth: {
    title: "NINAuth (government identity)",
    role: "OAuth 2.0 + PKCE session, authorization code, token exchange, ID-token validation",
  },
  phone: {
    title: "SMS carrier (phone OTP)",
    role: "E.164 delivery of one-time codes; SIM-swap risk posture at bind time",
  },
  liveness: {
    title: "Biometric liveness partner",
    role: "Job create → capture submit → verdict (anti-spoofing + face match)",
  },
};

export function providerNameFor(key: ProviderKey, posture: ProviderPosture): string {
  switch (posture) {
    case "mock":
      return key === "ninauth" ? "NINAUTH_MOCK" : key === "phone" ? "SMS_MOCK" : "LIVENESS_MOCK";
    case "loopback":
      return key === "ninauth"
        ? "NINAUTH_LOOPBACK"
        : key === "phone"
          ? "SMS_LOOPBACK"
          : "LIVENESS_LOOPBACK";
    case "live":
      return key === "ninauth" ? "NINAUTH_LIVE" : key === "phone" ? "SMS_LIVE" : "LIVENESS_LIVE";
  }
}

// ---------------------------------------------------------------------------
// Posture read (5s in-memory cache) + write
// ---------------------------------------------------------------------------

const globalForPosture = globalThis as unknown as {
  __tsProviderPosture?: { value: ProviderPosture; readAt: number };
};

export async function getProviderPosture(): Promise<ProviderPosture> {
  const cached = globalForPosture.__tsProviderPosture;
  if (cached && Date.now() - cached.readAt < 5_000) return cached.value;
  const row = await db.platformSetting.findUnique({
    where: { key: PROVIDER_POSTURE_KEY },
  });
  let value: ProviderPosture = "mock";
  if (row) {
    try {
      const parsed = JSON.parse(row.value) as { posture?: string };
      if (parsed.posture === "mock" || parsed.posture === "loopback" || parsed.posture === "live") {
        value = parsed.posture;
      }
    } catch {
      /* malformed setting falls back to mock — honest default */
    }
  }
  globalForPosture.__tsProviderPosture = { value, readAt: Date.now() };
  return value;
}

export function invalidatePostureCache(): void {
  globalForPosture.__tsProviderPosture = undefined;
}

export function isLoopback(posture: ProviderPosture): boolean {
  return posture === "loopback";
}

export class PostureError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "PostureError";
  }
}

export async function setProviderPosture(posture: ProviderPosture): Promise<void> {
  if (posture === "live") {
    // Honest LIVE gate — none of these hold in the sandbox, by design.
    if (process.env.PROVIDER_LIVE_ENABLED !== "true") {
      throw new PostureError(
        "LIVE_NOT_ENABLED",
        422,
        "LIVE posture requires PROVIDER_LIVE_ENABLED=true plus per-provider base URLs and an ACTIVE vault credential for every provider. The sandbox has none of these — nothing live is claimed."
      );
    }
    const missingBase: string[] = [];
    if (!process.env.NINAUTH_BASE_URL) missingBase.push("NINAUTH_BASE_URL");
    if (!process.env.PHONE_BASE_URL) missingBase.push("PHONE_BASE_URL");
    if (!process.env.LIVENESS_BASE_URL) missingBase.push("LIVENESS_BASE_URL");
    if (missingBase.length) {
      throw new PostureError(
        "LIVE_BASE_URL_MISSING",
        422,
        `LIVE posture requires ${missingBase.join(", ")} to be set.`
      );
    }
    for (const key of PROVIDER_KEYS) {
      const active = await db.providerCredential.findFirst({
        where: { provider: key, status: "ACTIVE" },
      });
      if (!active) {
        throw new PostureError(
          "LIVE_CREDENTIAL_MISSING",
          422,
          `LIVE posture requires an ACTIVE vault credential for ${key} (none is stored).`
        );
      }
    }
  }

  await db.platformSetting.upsert({
    where: { key: PROVIDER_POSTURE_KEY },
    create: { key: PROVIDER_POSTURE_KEY, value: JSON.stringify({ posture }) },
    update: { value: JSON.stringify({ posture }) },
  });
  invalidatePostureCache();
}

// ---------------------------------------------------------------------------
// Simulator health (unsigned direct probe — the simulator's /health endpoint)
// ---------------------------------------------------------------------------

export interface SimulatorHealth {
  reachable: boolean;
  port: number;
  fault: string | null;
  uptimeSec: number | null;
  detail?: string;
}

export async function simulatorHealth(): Promise<SimulatorHealth> {
  const port = Number(LOOPBACK_BASE_URL.split(":").pop() ?? 3032);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2_000);
    try {
      const res = await fetch(`${LOOPBACK_BASE_URL}/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const body = (await res.json()) as { ok?: boolean; fault?: string; uptimeSec?: number };
      return {
        reachable: res.status === 200 && body.ok === true,
        port,
        fault: body.fault ?? null,
        uptimeSec: body.uptimeSec ?? null,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    return {
      reachable: false,
      port,
      fault: null,
      uptimeSec: null,
      detail: err instanceof Error ? err.message : "unreachable",
    };
  }
}

// ---------------------------------------------------------------------------
// Admin read model
// ---------------------------------------------------------------------------

export function postureNote(posture: ProviderPosture): string {
  switch (posture) {
    case "mock":
      return "MOCK transports (default). All provider calls resolve in-process against the contract-first mocks — honest labels everywhere, no wire traffic.";
    case "loopback":
      return "Sandbox loopback: the REAL transport path (HMAC-signed calls, timeouts, retries, circuit breakers, metrics) pointed at the local provider simulator on :3032. Exercises everything LIVE will use except the partner itself.";
    case "live":
      return "LIVE partner endpoints with vault credentials. (Not available in this sandbox — the API refuses the flip honestly.)";
  }
}

export async function getProvidersAdmin() {
  const [posture, vault, sim] = await Promise.all([
    getProviderPosture(),
    listCredentials(),
    simulatorHealth(),
  ]);
  const vaultByProvider = new Map(vault.filter((v) => v.status === "ACTIVE").map((v) => [v.provider, v]));
  return {
    posture,
    postureNote: postureNote(posture),
    liveAvailable:
      process.env.PROVIDER_LIVE_ENABLED === "true" &&
      Boolean(process.env.NINAUTH_BASE_URL) &&
      Boolean(process.env.PHONE_BASE_URL) &&
      Boolean(process.env.LIVENESS_BASE_URL) &&
      PROVIDER_KEYS.every((k) => vaultByProvider.has(k)),
    providers: PROVIDER_KEYS.map((key) => ({
      key,
      title: PROVIDER_LABELS[key].title,
      role: PROVIDER_LABELS[key].role,
      providerName: providerNameFor(key, posture),
      mode: posture === "mock" ? "MOCK" : "LIVE",
      transport: providerTransportStatus(key),
      credential: vaultByProvider.get(key) ?? null,
    })),
    vault,
    simulator: sim,
    vaultDefaultKey: !process.env.VAULT_MASTER_KEY,
    constants: {
      requestTimeoutMs: 4_000,
      retries: 2,
      backoffMs: [150, 600],
      circuitThreshold: 3,
      circuitOpenMs: 20_000,
    },
  };
}
