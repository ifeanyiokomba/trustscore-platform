"use client";

// TrustScore Stage 14 — TransportHistoryCard: the transport observability
// console (ADMIN role, operational grant). Surfaces what Stage 13 left as a
// documented watch item ("circuit state + transport metrics are in-memory —
// a dev restart zeroes them"):
//   - per-provider metrics SNAPSHOT history (persisted by the internal tick
//     every 60s, or on demand via "Snapshot now") as an error-rate sparkline
//     with circuit-state markers,
//   - the circuit TRANSITION log (trip / half-open / re-trip / recovered /
//     reset with the reason code) — the transport layer's audit trail,
//   - sustained-open alerting: the episode banner + the admin-tunable
//     threshold (alerts fire when a non-closed episode outlives it),
//   - recovery notifications when a circuit closes again.
//
// Honesty rules: MOCK posture never alerts (no wire traffic exists to be
// unhealthy) and the card says so; empty history says exactly why (the tick
// writes the first snapshot within 60s); nothing live is ever claimed.

import * as React from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Loader2,
  Camera,
  Timer,
  BellRing,
  BellOff,
  History,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  CircuitEventEntry,
  EngineTransportHistory,
  TransportHistoryProvider,
  TransportSnapshotEntry,
} from "@/lib/types";

const W = 160;
const H = 36;
const PAD = 3;

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function stateChipClass(state: string): string {
  switch (state) {
    case "OPEN":
      return "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400";
    case "HALF_OPEN":
      return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    default:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
}

/** Error-rate sparkline with circuit-state markers (Stage 8 visual language). */
function ErrorSparkline({ snapshots }: { snapshots: TransportSnapshotEntry[] }) {
  const n = snapshots.length;
  if (n === 0) {
    return (
      <div className="flex h-12 items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 text-[11px] text-muted-foreground">
        No snapshots yet — the internal tick writes one every 60s, or press “Snapshot now”.
      </div>
    );
  }
  const rates = snapshots.map((s) => s.errorRate);
  const maxR = Math.max(10, ...rates); // ≥10% scale — small rates must not read as catastrophic
  const xFor = (i: number) => (n === 1 ? W / 2 : PAD + (i / (n - 1)) * (W - 2 * PAD));
  const yFor = (r: number) => H - PAD - (r / maxR) * (H - 2 * PAD);
  const pts = snapshots.map((s, i) => ({ x: xFor(i), y: yFor(s.errorRate), s }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1].x.toFixed(1)} ${H - PAD} L${pts[0].x.toFixed(1)} ${H - PAD} Z`;
  const openPts = pts.filter((p) => p.s.circuit === "OPEN" || p.s.circuit === "HALF_OPEN");
  const last = pts[n - 1];
  const lastErr = snapshots[n - 1].errors;
  const lastCalls = snapshots[n - 1].calls;

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-12 w-full"
        role="img"
        aria-label={`Error-rate trend over ${n} transport snapshot${n === 1 ? "" : "s"}: latest ${snapshots[n - 1].errorRate}%${openPts.length ? `, ${openPts.length} snapshot${openPts.length === 1 ? "" : "s"} with a non-closed circuit` : ", circuit closed throughout"}.`}
      >
        <defs>
          <linearGradient id="ts-err-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* 0% baseline */}
        <line
          x1={PAD}
          x2={W - PAD}
          y1={H - PAD}
          y2={H - PAD}
          className="stroke-border"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <path d={area} fill="url(#ts-err-fill)" />
        <motion.path
          d={line}
          fill="none"
          className="stroke-red-500"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
        {openPts.map((p, i) => (
          <circle
            key={`open-${i}`}
            cx={p.x}
            cy={p.y}
            r="2.4"
            className={p.s.circuit === "OPEN" ? "fill-red-500" : "fill-amber-500"}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <circle cx={last.x} cy={last.y} r="2.4" className="fill-red-600" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="text-[10px] leading-none text-muted-foreground">
        error rate · scale 0–{maxR}% · last snapshot {lastCalls} call{lastCalls === 1 ? "" : "s"} / {lastErr} error
        {lastErr === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function EventTimeline({ events }: { events: CircuitEventEntry[] }) {
  if (events.length === 0) {
    return (
      <p className="text-[11px] leading-snug text-muted-foreground">
        No circuit transitions recorded yet — a healthy transport stays CLOSED.
      </p>
    );
  }
  return (
    <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1" data-testid="circuit-events">
      {events.map((e, i) => (
        <li
          key={i}
          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-[11px]"
        >
          <span className="font-mono text-[10px] text-muted-foreground">{timeOf(e.createdAt)}</span>
          <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-semibold", stateChipClass(e.fromState))}>
            {e.fromState}
          </span>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-semibold", stateChipClass(e.toState))}>
            {e.toState}
          </span>
          <span className="truncate font-mono text-[10px] text-muted-foreground" title={e.reason}>
            {e.reason}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ProviderHistoryRow({ entry, sustainedMs }: { entry: TransportHistoryProvider; sustainedMs: number }) {
  const alert = entry.alert;
  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-4 rounded-xl border border-border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      data-testid={`history-row-${entry.key}`}
    >
      <div className="min-w-0 space-y-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LineChart className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <p className="min-w-0 truncate text-sm font-semibold">{entry.title}</p>
          <Badge variant="outline" className="shrink-0 border-foreground/20 text-[10px] text-muted-foreground">
            {entry.snapshots.length} snapshot{entry.snapshots.length === 1 ? "" : "s"} · {entry.events.length} event
            {entry.events.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <ErrorSparkline snapshots={entry.snapshots} />
      </div>
      <div className="min-w-0 space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <History className="h-3 w-3" aria-hidden="true" /> Circuit transitions (newest first)
        </p>
        <EventTimeline events={entry.events} />
        {alert ? (
          alert.alertedAt ? (
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] font-medium text-red-700 dark:text-red-300"
              data-testid={`alert-banner-${entry.key}`}
            >
              <BellRing className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Sustained-open alert sent to admins at {timeOf(alert.alertedAt)} — episode started {timeOf(alert.firstTripAt)}
            </div>
          ) : (
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-700 dark:text-amber-300"
              data-testid={`episode-banner-${entry.key}`}
            >
              <BellOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Episode in progress since {timeOf(alert.firstTripAt)} — alert fires at +{Math.round(sustainedMs / 1000)}s
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

export function TransportHistoryCard({
  data,
  onChanged,
}: {
  data: EngineTransportHistory | null;
  onChanged: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [local, setLocal] = React.useState<EngineTransportHistory | null>(data);
  const [snapBusy, setSnapBusy] = React.useState(false);
  const [thrBusy, setThrBusy] = React.useState(false);
  const [thrInput, setThrInput] = React.useState("");

  React.useEffect(() => {
    setLocal(data);
    if (data) setThrInput(String(Math.round(data.sustainedMs / 1000)));
  }, [data]);

  async function snapshotNow() {
    setSnapBusy(true);
    try {
      const res = await fetch("/api/v1/engine/admin/providers/history", { method: "POST" });
      const d = (await res.json().catch(() => ({}))) as EngineTransportHistory & {
        tick?: { snapshotsPersisted: number; eventsPersisted: number; alertsRaised: string[]; recoveriesSent: string[] };
        error?: { message?: string };
      };
      if (res.ok) {
        setLocal(d);
        const t = d.tick;
        toast({
          title: "Snapshot taken",
          description: t
            ? `${t.snapshotsPersisted} snapshot${t.snapshotsPersisted === 1 ? "" : "s"} · ${t.eventsPersisted} transition${t.eventsPersisted === 1 ? "" : "s"} persisted` +
              (t.alertsRaised.length ? ` · alerts raised: ${t.alertsRaised.join(", ")}` : "") +
              (t.recoveriesSent.length ? ` · recovered: ${t.recoveriesSent.join(", ")}` : "")
            : "Done",
        });
      } else {
        toast({ title: "Rejected", description: d.error?.message ?? "Request failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setSnapBusy(false);
    }
  }

  async function saveThreshold() {
    const sec = Number(thrInput);
    if (!Number.isFinite(sec) || sec < 5 || sec > 600) {
      toast({
        title: "Invalid threshold",
        description: "Enter a whole number of seconds between 5 and 600.",
        variant: "destructive",
      });
      return;
    }
    setThrBusy(true);
    try {
      const res = await fetch("/api/v1/engine/admin/providers/alerting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sustainedMs: Math.round(sec * 1000) }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        note?: string;
        error?: { message?: string };
      };
      toast({
        title: res.ok ? "Threshold saved" : "Rejected",
        description: d.note ?? d.error?.message ?? "",
        variant: res.ok ? "default" : "destructive",
      });
      if (res.ok) {
        setLocal((prev) => (prev ? { ...prev, sustainedMs: Math.round(sec * 1000) } : prev));
        await onChanged();
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setThrBusy(false);
    }
  }

  if (!local) return null;
  const isMock = local.posture === "mock";

  return (
    <Card className="ts-card-hover min-w-0" data-testid="transport-history">
      <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LineChart className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Transport observability</CardTitle>
          <CardDescription className="truncate">
            Snapshot history + the circuit transition log, persisted by the internal tick — sustained-open
            alerts reach every admin (Stage 14)
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 text-[10px]",
              isMock ? "border-muted-foreground/30 text-muted-foreground" : "border-primary/40 text-primary"
            )}
            data-testid="history-posture-badge"
          >
            {isMock ? "MOCK — no wire traffic" : `${local.posture.toUpperCase()} — wire active`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Controls: snapshot now + sustained threshold */}
        <div
          className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3.5 sm:flex-row sm:items-end sm:justify-between"
          data-testid="observability-controls"
        >
          <div className="min-w-0 space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <Timer className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              Sustained-open alert threshold
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={5}
                max={600}
                step={1}
                value={thrInput}
                onChange={(e) => setThrInput(e.target.value)}
                className="h-9 w-20 font-mono text-xs"
                aria-label="Sustained-open alert threshold in seconds"
                data-testid="threshold-input"
              />
              <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                seconds open → alert <span className="font-mono text-[10px]">(5–600)</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-foreground/20 text-xs font-medium"
                onClick={() => void saveThreshold()}
                disabled={thrBusy}
              >
                {thrBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                Save
              </Button>
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">
              A circuit episode (OPEN → HALF_OPEN → re-trip counts as one) that outlives this threshold raises a SYSTEM
              notification to every admin. Default {Math.round(local.defaultSustainedMs / 1000)}s; current{" "}
              {Math.round(local.sustainedMs / 1000)}s.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 gap-1.5 text-xs font-medium"
            onClick={() => void snapshotNow()}
            disabled={snapBusy}
            data-testid="snapshot-now"
          >
            {snapBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Snapshot now
          </Button>
        </div>

        {/* Per-provider history */}
        <div className="grid min-w-0 grid-cols-1 gap-3">
          {local.providers.map((entry) => (
            <ProviderHistoryRow key={entry.key} entry={entry} sustainedMs={local.sustainedMs} />
          ))}
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          The internal worker tick (:3031) persists a snapshot per provider every 60s and drains the circuit
          transition queue — history survives dev restarts (the live counters themselves stay in-memory,
          single-instance posture). Recovery notifications fire when an alerted circuit closes again.{" "}
          {isMock
            ? "MOCK posture never alerts: there is no wire traffic to be unhealthy — flip to sandbox loopback to exercise the failure paths."
            : "Wire traffic is active — inject a simulator fault in the provider console above to watch a trip, the transition log and the sustained-open alert."}
        </p>
      </CardContent>
    </Card>
  );
}
