// TrustScore Stage 14 — Transport observability service.
//
// Closes the Stage 13 watch item "circuit state + transport metrics are
// in-memory (a dev restart zeroes them)": the internal tick (and an admin
// "snapshot now" action) now persists
//   - TransportSnapshot rows — periodic per-provider metrics snapshots, so
//     transport health HISTORY survives restarts (the live counters stay
//     in-memory, single-instance posture — documented honestly), and
//   - CircuitEvent rows — the circuit-breaker transition audit trail
//     (trip / half-open / re-trip / recovered / reset, with the reason code).
//
// Sustained-open alerting: when a provider's breaker has been non-CLOSED for
// longer than the admin-tunable threshold (PlatformSetting
// "transport.alert.sustainedMs", default 45s — several trip→half-open→re-trip
// cycles), every ADMIN gets a SYSTEM notification. One alert per episode
// (deduped via the persisted episode state in PlatformSetting
// "transport.alerts"), plus a recovery notification when the circuit closes.
// Episode state is DB-backed so dedupe survives restarts.
//
// Honesty rules: MOCK posture never alerts (no wire traffic exists to be
// unhealthy); a restart-closed circuit that was alerted DOES send a recovery
// note (the circuit genuinely is closed again); the queue is bounded.

import { db } from "@/lib/db";
import {
  PROVIDER_KEYS,
  drainCircuitTransitions,
  providerTransportStatus,
  circuitEpisodeStart,
  type CircuitTransition,
  type ProviderKey,
} from "@/lib/providers/transport";
import { getProviderPosture } from "@/lib/providers/provider-posture";

export const SUSTAINED_MS_KEY = "transport.alert.sustainedMs";
export const ALERT_STATE_KEY = "transport.alerts";
export const DEFAULT_SUSTAINED_MS = 45_000;
export const MIN_SUSTAINED_MS = 5_000;
export const MAX_SUSTAINED_MS = 600_000;
const SNAPSHOTS_KEPT = 360; // per provider — 6h at 60s cadence
const EVENTS_KEPT = 300; // per provider

export interface AlertEpisode {
  firstTripAt: string; // ISO
  alertedAt: string | null; // ISO
}

export type AlertStateMap = Partial<Record<ProviderKey, AlertEpisode>>;

// ---------------------------------------------------------------------------
// Threshold (admin-tunable, 5s cache — same posture discipline as the
// provider posture setting)
// ---------------------------------------------------------------------------

const globalForObs = globalThis as unknown as {
  __tsSustainedMs?: { value: number; readAt: number };
};

export async function getSustainedThresholdMs(): Promise<number> {
  const cached = globalForObs.__tsSustainedMs;
  if (cached && Date.now() - cached.readAt < 5_000) return cached.value;
  const row = await db.platformSetting.findUnique({ where: { key: SUSTAINED_MS_KEY } });
  let value = DEFAULT_SUSTAINED_MS;
  if (row) {
    try {
      const parsed = JSON.parse(row.value) as { sustainedMs?: number };
      if (
        typeof parsed.sustainedMs === "number" &&
        parsed.sustainedMs >= MIN_SUSTAINED_MS &&
        parsed.sustainedMs <= MAX_SUSTAINED_MS
      ) {
        value = parsed.sustainedMs;
      }
    } catch {
      /* malformed falls back to the default — honest posture */
    }
  }
  globalForObs.__tsSustainedMs = { value, readAt: Date.now() };
  return value;
}

export async function setSustainedThresholdMs(ms: number): Promise<void> {
  await db.platformSetting.upsert({
    where: { key: SUSTAINED_MS_KEY },
    create: { key: SUSTAINED_MS_KEY, value: JSON.stringify({ sustainedMs: ms }) },
    update: { value: JSON.stringify({ sustainedMs: ms }) },
  });
  globalForObs.__tsSustainedMs = { value: ms, readAt: Date.now() };
}

async function readAlertState(): Promise<AlertStateMap> {
  const row = await db.platformSetting.findUnique({ where: { key: ALERT_STATE_KEY } });
  if (!row) return {};
  try {
    return JSON.parse(row.value) as AlertStateMap;
  } catch {
    return {};
  }
}

async function writeAlertState(state: AlertStateMap): Promise<void> {
  await db.platformSetting.upsert({
    where: { key: ALERT_STATE_KEY },
    create: { key: ALERT_STATE_KEY, value: JSON.stringify(state) },
    update: { value: JSON.stringify(state) },
  });
}

// ---------------------------------------------------------------------------
// Snapshot + transitions persistence (the tick body)
// ---------------------------------------------------------------------------

export interface ObservabilityTickResult {
  snapshotsPersisted: number;
  eventsPersisted: number;
  alertsRaised: string[]; // provider keys
  recoveriesSent: string[]; // provider keys
  pruned: boolean;
}

async function persistTransitions(drain: CircuitTransition[]): Promise<number> {
  if (!drain.length) return 0;
  await db.circuitEvent.createMany({
    data: drain.map((t) => ({
      provider: t.provider,
      fromState: t.fromState,
      toState: t.toState,
      reason: t.reason,
      createdAt: new Date(t.at),
    })),
  });
  return drain.length;
}

async function pruneProvider(provider: ProviderKey): Promise<void> {
  const [snapCount, evtCount] = await Promise.all([
    db.transportSnapshot.count({ where: { provider } }),
    db.circuitEvent.count({ where: { provider } }),
  ]);
  if (snapCount > SNAPSHOTS_KEPT) {
    const oldest = await db.transportSnapshot.findMany({
      where: { provider },
      orderBy: { createdAt: "desc" },
      skip: SNAPSHOTS_KEPT,
      select: { createdAt: true },
      take: 1,
    });
    if (oldest.length) {
      await db.transportSnapshot.deleteMany({
        where: { provider, createdAt: { lt: oldest[0].createdAt } },
      });
    }
  }
  if (evtCount > EVENTS_KEPT) {
    const oldest = await db.circuitEvent.findMany({
      where: { provider },
      orderBy: { createdAt: "desc" },
      skip: EVENTS_KEPT,
      select: { createdAt: true },
      take: 1,
    });
    if (oldest.length) {
      await db.circuitEvent.deleteMany({
        where: { provider, createdAt: { lt: oldest[0].createdAt } },
      });
    }
  }
}

async function notifyAdmins(title: string, body: string): Promise<void> {
  const admins = await db.userAccount.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  if (!admins.length) return;
  await db.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type: "SYSTEM", title, body })),
  });
}

/**
 * The observability tick body — drains + persists circuit transitions,
 * writes a metrics snapshot per provider, prunes history and evaluates
 * sustained-open alerts/recoveries. Bounded, fault-tolerant: callers wrap
 * in try/catch (the webhook tick must keep working when this degrades).
 */
export async function runObservabilityTick(): Promise<ObservabilityTickResult> {
  const posture = await getProviderPosture();
  const drain = drainCircuitTransitions();
  const eventsPersisted = await persistTransitions(drain);

  const rows = PROVIDER_KEYS.map((key) => {
    const t = providerTransportStatus(key);
    return {
      provider: key,
      posture,
      circuit: t.circuit,
      calls: t.calls,
      errors: t.errors,
      errorRate: t.errorRate,
      p50: t.p50,
      p95: t.p95,
    };
  });
  await db.transportSnapshot.createMany({ data: rows });

  const alertsRaised: string[] = [];
  const recoveriesSent: string[] = [];
  const [thresholdMs, alertState] = await Promise.all([
    getSustainedThresholdMs(),
    readAlertState(),
  ]);
  const now = Date.now();
  let stateChanged = false;

  for (const key of PROVIDER_KEYS) {
    const episodeStart = circuitEpisodeStart(key);
    const episode = alertState[key];

    if (episodeStart !== null) {
      const state = alertState[key] ?? { firstTripAt: new Date(episodeStart).toISOString(), alertedAt: null };
      if (!episode) {
        alertState[key] = state;
        stateChanged = true;
      }
      const sustainedFor = now - episodeStart;
      const shouldAlert =
        posture !== "mock" && // honest: no wire traffic in MOCK — nothing to alert on
        state.alertedAt === null &&
        sustainedFor >= thresholdMs;
      if (shouldAlert) {
        state.alertedAt = new Date().toISOString();
        alertState[key] = state;
        stateChanged = true;
        alertsRaised.push(key);
        const t = providerTransportStatus(key);
        await notifyAdmins(
          `Provider circuit sustained open — ${key}`,
          `The ${key} provider circuit has been open for ${Math.round(sustainedFor / 1000)}s ` +
            `(${t.calls} calls, ${t.errors} errors, last error: ${t.lastError ?? "unknown"}). ` +
            `Verify calls fail honestly (503) while the breaker is open. — Trust Engine observability (Stage 14)`
        );
      }
    } else if (episode && episode.alertedAt) {
      // Circuit is CLOSED now and this episode had alerted → recovery note.
      delete alertState[key];
      stateChanged = true;
      recoveriesSent.push(key);
      await notifyAdmins(
        `Provider circuit recovered — ${key}`,
        `The ${key} provider circuit is closed again (recovered or reset). ` +
          `The episode that started ${new Date(episode.firstTripAt).toLocaleTimeString()} and alerted ` +
          `at ${new Date(episode.alertedAt).toLocaleTimeString()} is over. — Trust Engine observability (Stage 14)`
      );
    } else if (episode) {
      // Stale bookkeeping (e.g. restart closed the breaker before the
      // threshold elapsed) — clear it quietly.
      delete alertState[key];
      stateChanged = true;
    }
  }

  if (stateChanged) await writeAlertState(alertState);

  // Prune occasionally (every 10th tick) — cheap amortized history bounds.
  const shouldPrune = Math.floor(now / 60_000) % 10 === 0;
  if (shouldPrune) {
    await Promise.all(PROVIDER_KEYS.map((k) => pruneProvider(k)));
  }

  return {
    snapshotsPersisted: rows.length,
    eventsPersisted,
    alertsRaised,
    recoveriesSent,
    pruned: shouldPrune,
  };
}

// ---------------------------------------------------------------------------
// Admin read model — history for the provider console
// ---------------------------------------------------------------------------

export interface TransportHistoryEntry {
  key: ProviderKey;
  title: string;
  snapshots: {
    createdAt: string;
    circuit: string;
    calls: number;
    errors: number;
    errorRate: number;
    p50: number | null;
    p95: number | null;
  }[];
  events: {
    createdAt: string;
    fromState: string;
    toState: string;
    reason: string;
  }[];
  alert: AlertEpisode | null;
}

export async function getTransportHistory(): Promise<{
  sustainedMs: number;
  defaultSustainedMs: number;
  posture: string;
  providers: TransportHistoryEntry[];
  titles: Record<ProviderKey, string>;
}> {
  const { PROVIDER_LABELS } = await import("@/lib/providers/provider-posture");
  const [thresholdMs, alertState, posture] = await Promise.all([
    getSustainedThresholdMs(),
    readAlertState(),
    getProviderPosture(),
  ]);

  const providers = await Promise.all(
    PROVIDER_KEYS.map(async (key) => {
      const [snapshots, events] = await Promise.all([
        db.transportSnapshot.findMany({
          where: { provider: key },
          orderBy: { createdAt: "desc" },
          take: 60,
        }),
        db.circuitEvent.findMany({
          where: { provider: key },
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
      ]);
      return {
        key,
        title: PROVIDER_LABELS[key].title,
        snapshots: snapshots
          .map((s) => ({
            createdAt: s.createdAt.toISOString(),
            circuit: s.circuit,
            calls: s.calls,
            errors: s.errors,
            errorRate: s.errorRate,
            p50: s.p50,
            p95: s.p95,
          }))
          .reverse(), // oldest → newest for the sparkline
        events: events.map((e) => ({
          createdAt: e.createdAt.toISOString(),
          fromState: e.fromState,
          toState: e.toState,
          reason: e.reason,
        })),
        alert: alertState[key] ?? null,
      } satisfies TransportHistoryEntry;
    })
  );

  return {
    sustainedMs: thresholdMs,
    defaultSustainedMs: DEFAULT_SUSTAINED_MS,
    posture,
    providers,
    titles: Object.fromEntries(
      PROVIDER_KEYS.map((k) => [k, PROVIDER_LABELS[k].title])
    ) as Record<ProviderKey, string>,
  };
}
