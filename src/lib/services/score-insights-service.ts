// TrustScore Stage 11 — ScoreInsightsService.
// "Why did my score change?" — the member-facing score HISTORY read model:
// every retained snapshot (oldest → newest), the component-level deltas
// between consecutive snapshots, and the audited events that were recorded
// between them. Plus a self-service CSV/JSON export of the series.
//
// Honesty rules (NDPA §37 discipline, directive §50):
//   • Events between two snapshots are CORRELATED context — recorded causes
//     in the window, not a proven causal verdict. The UI must say exactly
//     that. We never render safety language.
//   • Only redacted audit ACTIONS are surfaced — no PII, no flag text, no
//     rationale, no partner identities. Labels are fixed strings.
//   • The full raw series was already DSR-exportable (Stage 5/8); this adds
//     a lightweight, member-initiated series export that is audited.
//   • Frozen windows: the freeze is a lifecycle fact — if a snapshot row is
//     FROZEN it appears verbatim in history (the score could not move).

import { db } from "@/lib/db";
import { deriveState } from "@/lib/services/engine-service";
import type { ScoreComponent } from "@/lib/services/trustscore-service";

export interface HistorySnapshot {
  id: string;
  version: number;
  score: number;
  confidence: number;
  status: string;
  riskBand: string;
  trigger: string;
  computedAt: string;
  state: string;
  policyVersion: number | null;
  components: ScoreComponent[];
}

export interface HistoryEvent {
  action: string;
  label: string;
  componentKey: string | null; // which component this event typically feeds
  at: string;
}

export interface ComponentDelta {
  key: string;
  label: string;
  from: number;
  to: number;
  delta: number;
}

export interface ScoreChange {
  id: string;
  computedAt: string;
  fromScore: number;
  toScore: number;
  delta: number;
  fromConfidence: number;
  toConfidence: number;
  trigger: string;
  fromPolicy: number | null;
  toPolicy: number | null;
  policyChanged: boolean;
  state: string; // display state of the NEW snapshot
  componentDeltas: ComponentDelta[]; // all five, in component order
  events: HistoryEvent[]; // bounded (first 8) + eventCount for "+N more"
  eventCount: number;
}

export interface ScoreHistorySummary {
  snapshotCount: number;
  changeCount: number;
  firstAt: string | null;
  latestAt: string | null;
  firstScore: number | null;
  latestScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  netChange: number;
  upChanges: number;
  downChanges: number;
  flatChanges: number;
}

export interface ScoreHistory {
  history: HistorySnapshot[]; // oldest → newest (max SNAPSHOT_RETAIN)
  changes: ScoreChange[]; // newest → newest-1 … oldest pair first? NO:
  // chronological (oldest change first) — the UI renders newest on top.
  summary: ScoreHistorySummary;
  spark: { at: string; score: number }[]; // oldest → newest, for the sparkline
}

// ---------------------------------------------------------------------------
// Event catalog — fixed labels only (no PII, no free text from the DB).
// componentKey maps the event to the score component it typically feeds so
// the UI can draw the causal picture; POLICY events touch the whole score.
// ---------------------------------------------------------------------------

const EVENT_CATALOG: Record<string, { label: string; componentKey: string | null }> = {
  // Identity spine → Identity Assurance
  IDENTITY_VERIFIED: { label: "Trust Identity established", componentKey: "identityAssurance" },
  IDENTITY_CONSENT_GRANTED: { label: "Identity consent granted", componentKey: "identityAssurance" },
  IDENTITY_CONSENT_WITHDRAWN: { label: "Identity consent withdrawn", componentKey: "identityAssurance" },
  IDENTITY_SESSION_CREATED: { label: "Verification session started", componentKey: "identityAssurance" },
  IDENTITY_SESSION_FAILED: { label: "Verification session failed", componentKey: "identityAssurance" },
  // Signals → Identity Assurance + Verified Credentials
  SIGNAL_PHONE_VERIFIED: { label: "Phone number verified", componentKey: "verifiedCredentials" },
  SIGNAL_PHONE_FAILED: { label: "Phone verification failed", componentKey: null },
  SIGNAL_LIVENESS_PASSED: { label: "Biometric liveness passed", componentKey: "verifiedCredentials" },
  SIGNAL_LIVENESS_FAILED: { label: "Liveness check failed", componentKey: null },
  // Credentials
  CREDENTIAL_ISSUED: { label: "Credential issued", componentKey: "verifiedCredentials" },
  CREDENTIAL_REVOKED: { label: "Credential revoked", componentKey: "verifiedCredentials" },
  // Interactions → Verified Reputation
  SAFETY_CHECK_RUN: { label: "A member ran a consented check on you", componentKey: "verifiedReputation" },
  TRUST_REQUEST_SENT: { label: "Trust request received", componentKey: "verifiedReputation" },
  TRUST_REQUEST_ACCEPTED: { label: "A trust request was accepted", componentKey: "verifiedReputation" },
  TRUST_REQUEST_DECLINED: { label: "A trust request was declined", componentKey: null },
  // Flags / appeals → Resolution History + Confirmed Risk
  FLAG_SUBMITTED: { label: "A member filed a flag against you", componentKey: "confirmedRisk" },
  FLAG_WITHDRAWN: { label: "A flag against you was withdrawn", componentKey: "confirmedRisk" },
  FLAG_RESPONSE: { label: "You responded to a flag", componentKey: "resolutionHistory" },
  FLAG_RESOLUTION: { label: "A flag against you was decided by human review", componentKey: "confirmedRisk" },
  APPEAL_FILED: { label: "You appealed a confirmed flag (score frozen)", componentKey: "resolutionHistory" },
  APPEAL_DECIDED: { label: "An appeal on your flag was decided", componentKey: "confirmedRisk" },
  // Trust Network → Verified Reputation
  NETWORK_JOINED: { label: "You joined the Trust Network", componentKey: "verifiedReputation" },
  NETWORK_PAUSED: { label: "You paused Trust Network membership", componentKey: "verifiedReputation" },
  NETWORK_INTERACTION_ACCEPTED: { label: "A mutual attestation became active", componentKey: "verifiedReputation" },
  NETWORK_INTERACTION_REVOKED: { label: "A mutual attestation was revoked", componentKey: "verifiedReputation" },
  NETWORK_SIGNAL_MINTED: { label: "A shared signal was recorded against you (k-anonymized)", componentKey: "confirmedRisk" },
  NETWORK_SIGNAL_RETRACTED: { label: "A shared signal was retracted", componentKey: "confirmedRisk" },
  // Policy → the whole score
  POLICY_ACTIVATED: { label: "A new public scoring policy version was activated", componentKey: null },
};

const EVENTS_WINDOW_LIMIT = 8; // events shown per change before "+N more"
const HISTORY_LIMIT = 20; // mirrors SNAPSHOT_RETAIN

function parseComponents(raw: string): ScoreComponent[] {
  try {
    const parsed = JSON.parse(raw) as ScoreComponent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getScoreHistory(userId: string): Promise<ScoreHistory> {
  const rows = await db.trustScoreSnapshot.findMany({
    where: { userId },
    orderBy: { computedAt: "asc" },
    take: HISTORY_LIMIT,
  });

  // Policy provenance: resolve policyId → version once (few policies exist).
  const policyIds = [...new Set(rows.map((r) => r.policyId).filter((p): p is string => !!p))];
  const policies = policyIds.length
    ? await db.scoringPolicy.findMany({ where: { id: { in: policyIds } }, select: { id: true, version: true } })
    : [];
  const policyVersionById = new Map(policies.map((p) => [p.id, p.version]));

  // Audit events for this user, oldest-first — one query covers all windows.
  const relevantActions = Object.keys(EVENT_CATALOG);
  const since = rows.length > 1 ? rows[0].computedAt : new Date(0);
  const events = await db.auditEvent.findMany({
    where: {
      actorId: userId,
      action: { in: relevantActions },
      createdAt: { gt: since },
    },
    orderBy: { createdAt: "asc" },
    select: { action: true, createdAt: true },
  });

  const history: HistorySnapshot[] = rows.map((r) => ({
    id: r.id,
    version: r.version,
    score: r.score,
    confidence: r.confidence,
    status: r.status,
    riskBand: r.riskBand,
    trigger: r.trigger,
    computedAt: r.computedAt.toISOString(),
    state: deriveState(r),
    policyVersion: r.policyId ? policyVersionById.get(r.policyId) ?? null : null,
    components: parseComponents(r.components),
  }));

  const changes: ScoreChange[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const next = rows[i];
    const prevComps = parseComponents(prev.components);
    const nextComps = parseComponents(next.components);
    const keys = new Set([...prevComps.map((c) => c.key), ...nextComps.map((c) => c.key)]);

    const componentDeltas: ComponentDelta[] = [];
    for (const key of keys) {
      const p = prevComps.find((c) => c.key === key);
      const n = nextComps.find((c) => c.key === key);
      componentDeltas.push({
        key,
        label: (p ?? n)?.label ?? key,
        from: p?.value ?? 0,
        to: n?.value ?? 0,
        delta: (n?.value ?? 0) - (p?.value ?? 0),
      });
    }
    // Stable component order (engine order first, unknown keys after).
    const ORDER = ["identityAssurance", "verifiedCredentials", "verifiedReputation", "resolutionHistory", "confirmedRisk"];
    componentDeltas.sort((a, b) => {
      const ai = ORDER.indexOf(a.key);
      const bi = ORDER.indexOf(b.key);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const windowEvents = events
      .filter((e) => e.createdAt > prev.computedAt && e.createdAt <= next.computedAt)
      .map((e) => ({
        action: e.action,
        label: EVENT_CATALOG[e.action]?.label ?? e.action,
        componentKey: EVENT_CATALOG[e.action]?.componentKey ?? null,
        at: e.createdAt.toISOString(),
      }));

    const fromPolicy = prev.policyId ? policyVersionById.get(prev.policyId) ?? null : null;
    const toPolicy = next.policyId ? policyVersionById.get(next.policyId) ?? null : null;

    changes.push({
      id: next.id,
      computedAt: next.computedAt.toISOString(),
      fromScore: prev.score,
      toScore: next.score,
      delta: next.score - prev.score,
      fromConfidence: prev.confidence,
      toConfidence: next.confidence,
      trigger: next.trigger,
      fromPolicy,
      toPolicy,
      policyChanged: (toPolicy ?? 0) !== (fromPolicy ?? 0),
      state: deriveState(next),
      componentDeltas,
      events: windowEvents.slice(0, EVENTS_WINDOW_LIMIT),
      eventCount: windowEvents.length,
    });
  }

  const scores = rows.map((r) => r.score);
  const first = rows[0];
  const latest = rows[rows.length - 1];
  const summary: ScoreHistorySummary = {
    snapshotCount: rows.length,
    changeCount: changes.length,
    firstAt: first?.computedAt.toISOString() ?? null,
    latestAt: latest?.computedAt.toISOString() ?? null,
    firstScore: first?.score ?? null,
    latestScore: latest?.score ?? null,
    minScore: rows.length ? Math.min(...scores) : null,
    maxScore: rows.length ? Math.max(...scores) : null,
    netChange: rows.length ? latest.score - first.score : 0,
    upChanges: changes.filter((c) => c.delta > 0).length,
    downChanges: changes.filter((c) => c.delta < 0).length,
    flatChanges: changes.filter((c) => c.delta === 0).length,
  };

  return {
    history,
    changes, // chronological (oldest change first)
    summary,
    spark: rows.map((r) => ({ at: r.computedAt.toISOString(), score: r.score })),
  };
}

// ---------------------------------------------------------------------------
// Self-service export — CSV (spreadsheet-friendly series) or JSON (full
// history + changes, same shape as the view payload). Audited by the caller.
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  "computedAt",
  "score",
  "confidence",
  "status",
  "riskBand",
  "trigger",
  "state",
  "policyVersion",
  "identityAssurance",
  "verifiedCredentials",
  "verifiedReputation",
  "resolutionHistory",
  "confirmedRisk",
] as const;

function csvEscape(v: string | number | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function buildScoreHistoryExport(
  userId: string,
  format: "csv" | "json"
): Promise<{ filename: string; contentType: string; body: string; records: number }> {
  const data = await getScoreHistory(userId);
  const date = new Date().toISOString().slice(0, 10);
  const records = data.history.length;

  if (format === "json") {
    return {
      filename: `trustscore-history-${date}.json`,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          note: "Your TrustScore snapshot history (up to the 20 most recent snapshots retained). Component values are the engine's five-part breakdown; deltas compare consecutive snapshots. Events are the audited actions recorded between snapshots — correlated context, not a causal verdict (NDPA §37).",
          summary: data.summary,
          history: data.history,
          changes: data.changes,
        },
        null,
        2
      ),
      records,
    };
  }

  const lines: string[] = [CSV_COLUMNS.join(",")];
  for (const h of data.history) {
    const byKey = new Map(h.components.map((c) => [c.key, c.value]));
    lines.push(
      [
        h.computedAt,
        h.score,
        h.confidence,
        h.status,
        h.riskBand,
        h.trigger,
        h.state,
        h.policyVersion,
        byKey.get("identityAssurance") ?? "",
        byKey.get("verifiedCredentials") ?? "",
        byKey.get("verifiedReputation") ?? "",
        byKey.get("resolutionHistory") ?? "",
        byKey.get("confirmedRisk") ?? "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return {
    filename: `trustscore-history-${date}.csv`,
    contentType: "text/csv; charset=utf-8",
    body: lines.join("\n") + "\n",
    records,
  };
}
