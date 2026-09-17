// TrustScore Stage 13 — Provider transport layer (LIVE-ready).
//
// The single wire boundary every provider call crosses when the platform is
// NOT in MOCK posture (audit §4.2 "swap only the transport"):
//   - HMAC-SHA256 request signing (x-ts-signature: t=…,v1=…) — shared-key
//     authenticity between platform and provider, same shape as the webhook
//     signature contract.
//   - Bounded timeouts (AbortController) + idempotency keys.
//   - Retries ONLY on 5xx/network errors (never on 4xx — those are the
//     provider's answer, not a fault), exponential backoff, max 2 retries.
//   - A circuit breaker per provider: 3 consecutive transport failures →
//     OPEN for 20s (fail fast, honest 503s upstream) → HALF_OPEN probe →
//     CLOSED. In-memory, single-instance posture (documented).
//   - Latency/error metrics per provider (p50/p95 over the last 100 calls,
//     error counts, last error) — surfaced in the admin provider console.
//
// Stage 14: every circuit state TRANSITION is also pushed onto an in-memory
// queue (drainCircuitTransitions) so the observability tick can persist the
// transition log + evaluate sustained-open alerts. The hot path only pushes
// a small object — no I/O in the request path.
//
// Honest-error discipline: every failure is a typed ProviderTransportError
// with a machine code. Callers translate these into honest 503s — never a
// silent fallback to a different provider's answer.

import { createHmac, randomUUID } from "crypto";

export type ProviderKey = "ninauth" | "phone" | "liveness";

export const PROVIDER_KEYS: ProviderKey[] = ["ninauth", "phone", "liveness"];

// Transport signing key — shared with the provider (loopback simulator reads
// the same env; the LIVE partner's value arrives via the credential vault).
export const TRANSPORT_HMAC_KEY =
  process.env.TRANSPORT_HMAC_KEY ?? "ts_backend_only_transport_hmac_key";

// Loopback base URL — the sandbox simulator mini-service (port 3032). The
// LIVE posture swaps this for the partner's real base URL per provider.
export const LOOPBACK_BASE_URL =
  process.env.LOOPBACK_BASE_URL ?? "http://127.0.0.1:3032";

const REQUEST_TIMEOUT_MS = 4_000;
const RETRY_BACKOFF_MS = [150, 600] as const;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 20_000;
const METRICS_SAMPLES = 100;

// ---------------------------------------------------------------------------
// Typed transport errors (machine codes — mapped to honest upstream 503s)
// ---------------------------------------------------------------------------

export type TransportErrorCode =
  | "CIRCUIT_OPEN"
  | "TIMEOUT"
  | "RETRIES_EXHAUSTED"
  | "AUTH_REJECTED"
  | "PROVIDER_HTTP_ERROR"
  | "NETWORK_ERROR";

export class ProviderTransportError extends Error {
  constructor(
    public code: TransportErrorCode,
    public provider: ProviderKey,
    public detail: string,
    public status?: number
  ) {
    super(`${code}:${provider}:${detail}`);
    this.name = "ProviderTransportError";
  }
}

// ---------------------------------------------------------------------------
// Circuit breaker + metrics (in-memory, survives HMR via globalThis)
// ---------------------------------------------------------------------------

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/** Stage 14 — a persisted circuit state transition (transport audit trail). */
export interface CircuitTransition {
  provider: ProviderKey;
  fromState: CircuitState;
  toState: CircuitState;
  reason: string; // transport error code | SUCCESS | RESET
  at: number; // epoch ms
}

interface ProviderBreaker {
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
  lastProbeAt: number | null;
  firstTripAt: number | null; // Stage 14: episode start (oldest trip since last CLOSED)
}

interface TransportGlobal {
  __tsProviderBreakers: Map<ProviderKey, ProviderBreaker>;
  __tsProviderMetrics: Map<ProviderKey, ProviderMetrics>;
  __tsCircuitTransitions: CircuitTransition[];
}

interface ProviderMetrics {
  calls: number;
  errors: number;
  samples: number[]; // latency ms, newest last, capped
  lastError: string | null;
  lastErrorAt: number | null;
  lastOkAt: number | null;
  lastLatencyMs: number | null;
}

const g = globalThis as unknown as TransportGlobal;
const breakers: Map<ProviderKey, ProviderBreaker> =
  g.__tsProviderBreakers ?? new Map();
const metrics: Map<ProviderKey, ProviderMetrics> =
  g.__tsProviderMetrics ?? new Map();
const transitions: CircuitTransition[] = g.__tsCircuitTransitions ?? [];
g.__tsProviderBreakers = breakers;
g.__tsProviderMetrics = metrics;
g.__tsCircuitTransitions = transitions;

function pushTransition(
  provider: ProviderKey,
  fromState: CircuitState,
  toState: CircuitState,
  reason: string
): void {
  if (fromState === toState) return;
  transitions.push({ provider, fromState, toState, reason, at: Date.now() });
  // Bounded queue — the tick drains it every 60s; a fault-injection storm
  // must never grow this unbounded.
  if (transitions.length > 500) transitions.splice(0, transitions.length - 500);
}

/** Stage 14 — drain the persist-pending circuit transitions (tick-side). */
export function drainCircuitTransitions(): CircuitTransition[] {
  return transitions.splice(0, transitions.length);
}

function breakerFor(key: ProviderKey): ProviderBreaker {
  let b = breakers.get(key);
  if (!b) {
    b = {
      state: "CLOSED",
      consecutiveFailures: 0,
      openedAt: null,
      lastProbeAt: null,
      firstTripAt: null,
    };
    breakers.set(key, b);
  }
  return b;
}

function metricsFor(key: ProviderKey): ProviderMetrics {
  let m = metrics.get(key);
  if (!m) {
    m = {
      calls: 0,
      errors: 0,
      samples: [],
      lastError: null,
      lastErrorAt: null,
      lastOkAt: null,
      lastLatencyMs: null,
    };
    metrics.set(key, m);
  }
  return m;
}

function percentile(sorted: number[], p: 50 | 95): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

/** Derive the EFFECTIVE circuit state (time-based OPEN → HALF_OPEN). */
export function effectiveCircuitState(key: ProviderKey): CircuitState {
  const b = breakerFor(key);
  if (b.state === "OPEN" && b.openedAt !== null) {
    if (Date.now() - b.openedAt >= CIRCUIT_OPEN_MS) return "HALF_OPEN";
  }
  return b.state;
}

function recordSuccess(key: ProviderKey, latencyMs: number) {
  const b = breakerFor(key);
  const m = metricsFor(key);
  m.calls += 1;
  m.samples.push(latencyMs);
  if (m.samples.length > METRICS_SAMPLES) m.samples.shift();
  m.lastOkAt = Date.now();
  m.lastLatencyMs = latencyMs;
  // Success closes the circuit (also settles a HALF_OPEN probe).
  if (b.state !== "CLOSED") {
    pushTransition(key, b.state, "CLOSED", "SUCCESS");
  }
  b.state = "CLOSED";
  b.consecutiveFailures = 0;
  b.openedAt = null;
  b.firstTripAt = null;
}

function recordFailure(key: ProviderKey, code: TransportErrorCode, detail: string) {
  const b = breakerFor(key);
  const m = metricsFor(key);
  m.calls += 1;
  m.errors += 1;
  m.lastError = `${code} — ${detail}`;
  m.lastErrorAt = Date.now();
  b.consecutiveFailures += 1;
  if (b.state === "HALF_OPEN" || b.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    const from = b.state;
    // A HALF_OPEN re-trip belongs to the SAME episode as the trip that
    // opened it — "sustained open" is measured from the first trip.
    const continuing = from === "OPEN" || (from === "HALF_OPEN" && b.firstTripAt !== null);
    b.state = "OPEN";
    b.openedAt = Date.now();
    if (!continuing) b.firstTripAt = Date.now();
    pushTransition(key, from, "OPEN", code);
  }
}

function allowCall(key: ProviderKey): boolean {
  const state = effectiveCircuitState(key);
  if (state === "CLOSED") return true;
  if (state === "OPEN") return false;
  // HALF_OPEN: allow a single probe (per call — single-instance simplicity).
  const b = breakerFor(key);
  b.lastProbeAt = Date.now();
  return true;
}

/** Admin: reset a provider's circuit + metrics. */
export function resetProviderTransport(key: ProviderKey): void {
  const b = breakerFor(key);
  if (b.state !== "CLOSED") {
    pushTransition(key, b.state, "CLOSED", "RESET");
  }
  breakers.set(key, {
    state: "CLOSED",
    consecutiveFailures: 0,
    openedAt: null,
    lastProbeAt: null,
    firstTripAt: null,
  });
  metrics.set(key, {
    calls: 0,
    errors: 0,
    samples: [],
    lastError: null,
    lastErrorAt: null,
    lastOkAt: null,
    lastLatencyMs: null,
  });
}

/** Admin read model: circuit + latency/error metrics per provider. */
export function providerTransportStatus(key: ProviderKey) {
  const b = breakerFor(key);
  const m = metricsFor(key);
  const sorted = [...m.samples].sort((a, z) => a - z);
  const state = effectiveCircuitState(key);
  return {
    circuit: state,
    circuitSince: state === b.state ? b.openedAt : Date.now(),
    consecutiveFailures: b.consecutiveFailures,
    calls: m.calls,
    errors: m.errors,
    errorRate: m.calls > 0 ? Math.round((m.errors / m.calls) * 100) : 0,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    lastLatencyMs: m.lastLatencyMs,
    lastError: m.lastError,
    lastErrorAt: m.lastErrorAt ? new Date(m.lastErrorAt).toISOString() : null,
    lastOkAt: m.lastOkAt ? new Date(m.lastOkAt).toISOString() : null,
    /** Stage 14 — episode start (first trip of the current non-CLOSED run). */
    firstTripAt: b.firstTripAt,
  };
}

// ---------------------------------------------------------------------------
// Request signing (same v1 HMAC shape as webhook signatures)
// ---------------------------------------------------------------------------

export function signTransportPayload(body: string, timestampMs: number): string {
  const signed = `${timestampMs}.${body}`;
  const v1 = createHmac("sha256", TRANSPORT_HMAC_KEY).update(signed).digest("hex");
  return `t=${timestampMs},v1=${v1}`;
}

// ---------------------------------------------------------------------------
// providerFetch — the one wire function
// ---------------------------------------------------------------------------

export interface ProviderCallResult<T> {
  data: T;
  latencyMs: number;
  attempts: number;
}

async function singleAttempt(
  key: ProviderKey,
  path: string,
  body: string,
  timeoutMs: number
): Promise<{ status: number; text: string }> {
  const ts = Date.now();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-ts-signature": signTransportPayload(body, ts),
    "x-ts-provider": key,
    "x-ts-idempotency-key": randomUUID(),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${LOOPBACK_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST a provider call through the transport (signing, timeout, retry,
 * circuit breaker, metrics). Only non-MOCK postures use this.
 * 4xx responses are the provider's ANSWER — returned to the caller (with
 * AUTH_REJECTED for 401/403), never retried. 5xx + network errors retry
 * (max 2, backoff 150ms/600ms) then fail honestly.
 */
export async function providerCall<T>(
  key: ProviderKey,
  path: string,
  payload: Record<string, unknown>,
  opts?: { timeoutMs?: number }
): Promise<ProviderCallResult<T>> {
  if (!allowCall(key)) {
    throw new ProviderTransportError(
      "CIRCUIT_OPEN",
      key,
      `circuit open — failing fast after ${CIRCUIT_FAILURE_THRESHOLD} consecutive failures`
    );
  }

  const body = JSON.stringify(payload);
  const timeoutMs = opts?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const startedAt = Date.now();
  let attempts = 0;
  let lastCode: TransportErrorCode = "NETWORK_ERROR";
  let lastDetail = "no attempt completed";

  for (let i = 0; i <= RETRY_BACKOFF_MS.length; i++) {
    attempts += 1;
    try {
      const { status, text } = await singleAttempt(key, path, body, timeoutMs);
      if (status >= 200 && status < 300) {
        let data: T;
        try {
          data = JSON.parse(text) as T;
        } catch {
          throw new ProviderTransportError(
            "PROVIDER_HTTP_ERROR",
            key,
            `provider returned non-JSON body (status ${status})`
          );
        }
        const latencyMs = Date.now() - startedAt;
        recordSuccess(key, latencyMs);
        return { data, latencyMs, attempts };
      }
      if (status === 401 || status === 403) {
        // The provider rejected our signature/credentials — an ANSWER, not a
        // fault. Do not retry; surface honestly.
        recordFailure(key, "AUTH_REJECTED", `status ${status}`);
        throw new ProviderTransportError(
          "AUTH_REJECTED",
          key,
          `provider rejected the signed request (status ${status})`,
          status
        );
      }
      if (status >= 400 && status < 500) {
        // Other 4xx: the provider's answer — returned, not retried.
        const latencyMs = Date.now() - startedAt;
        recordSuccess(key, latencyMs); // transport worked; the contract answered
        let detail = text.slice(0, 200);
        try {
          const parsed = JSON.parse(text) as { error?: { message?: string; code?: string } };
          detail = parsed.error?.message ?? parsed.error?.code ?? detail;
        } catch {
          /* keep raw text */
        }
        throw new ProviderTransportError(
          "PROVIDER_HTTP_ERROR",
          key,
          detail,
          status
        );
      }
      // 5xx — retryable transport fault.
      lastCode = "PROVIDER_HTTP_ERROR";
      lastDetail = `status ${status}`;
    } catch (err) {
      if (err instanceof ProviderTransportError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        lastCode = "TIMEOUT";
        lastDetail = `no response within ${timeoutMs}ms`;
      } else {
        lastCode = "NETWORK_ERROR";
        lastDetail = err instanceof Error ? err.message : "network fault";
      }
    }
    if (i < RETRY_BACKOFF_MS.length) {
      await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS[i]));
    }
  }

  recordFailure(key, lastCode, lastDetail);
  throw new ProviderTransportError(
    lastCode === "PROVIDER_HTTP_ERROR" ? "RETRIES_EXHAUSTED" : lastCode,
    key,
    `${lastDetail} (after ${attempts} attempts)`
  );
}

/** Non-POST GET through the transport (inbox reads) — signed, timed out, no retry. */
export async function providerGet<T>(
  key: ProviderKey,
  path: string,
  opts?: { timeoutMs?: number }
): Promise<ProviderCallResult<T>> {
  if (!allowCall(key)) {
    throw new ProviderTransportError("CIRCUIT_OPEN", key, "circuit open — failing fast");
  }
  const ts = Date.now();
  const sig = signTransportPayload(`GET ${path}`, ts);
  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const res = await fetch(`${LOOPBACK_BASE_URL}${path}`, {
      method: "GET",
      headers: { "x-ts-signature": sig, "x-ts-provider": key },
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      recordFailure(key, "AUTH_REJECTED", `status ${res.status}`);
      throw new ProviderTransportError("AUTH_REJECTED", key, `rejected (status ${res.status})`, res.status);
    }
    if (res.status === 200) {
      const latencyMs = Date.now() - startedAt;
      recordSuccess(key, latencyMs);
      return { data: JSON.parse(text) as T, latencyMs, attempts: 1 };
    }
    const latencyMs = Date.now() - startedAt;
    recordSuccess(key, latencyMs);
    throw new ProviderTransportError("PROVIDER_HTTP_ERROR", key, `status ${res.status}`, res.status);
  } catch (err) {
    if (err instanceof ProviderTransportError) throw err;
    const isAbort = err instanceof Error && err.name === "AbortError";
    const code: TransportErrorCode = isAbort ? "TIMEOUT" : "NETWORK_ERROR";
    const detail = isAbort ? `no response within ${timeoutMs}ms` : String(err);
    recordFailure(key, code, detail);
    throw new ProviderTransportError(code, key, detail);
  } finally {
    clearTimeout(timer);
  }
}

export const TRANSPORT_CONSTANTS = {
  REQUEST_TIMEOUT_MS,
  RETRY_BACKOFF_MS: [...RETRY_BACKOFF_MS],
  CIRCUIT_FAILURE_THRESHOLD,
  CIRCUIT_OPEN_MS,
  METRICS_SAMPLES,
} as const;

// ---------------------------------------------------------------------------
// Stage 14 — sustained-open episode bookkeeping (read by the observability
// service; kept here beside the breaker it describes).
// ---------------------------------------------------------------------------

/**
 * The current non-CLOSED episode start for a provider (epoch ms), or null
 * when the breaker is CLOSED. Uses firstTripAt so OPEN → HALF_OPEN → re-trip
 * counts as ONE sustained episode (the honest reading of "sustained open").
 */
export function circuitEpisodeStart(key: ProviderKey): number | null {
  const b = breakerFor(key);
  if (b.state === "CLOSED") return null;
  return b.firstTripAt ?? b.openedAt;
}
