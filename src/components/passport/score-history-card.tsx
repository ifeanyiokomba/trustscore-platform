"use client";

// TrustScore Stage 11 — ScoreHistoryCard ("Why did my score change?").
// The member-facing score INSIGHTS surface: sparkline of every retained
// snapshot, the component-level deltas between consecutive snapshots, and
// the audited events recorded inside each window. Deep-styled on purpose —
// deltas, connectors, tooltips, motion — but the honesty rules hold:
//   • window events are CORRELATED context, never a causal verdict;
//   • fixed label strings only (no PII, no flag text, no rationale);
//   • the export is the member's own series (CSV/JSON), audited server-side.

import * as React from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Download,
  FileJson,
  FileSpreadsheet,
  Info,
  History,
  ShieldQuestion,
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
import type { ScoreChange, ScoreHistory } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Data hook — fetched once on mount, refreshable.
// ---------------------------------------------------------------------------

export function useScoreHistory() {
  const [data, setData] = React.useState<ScoreHistory | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/passport/score-history", { cache: "no-store" });
        if (!cancelled && res.ok) setData(await res.json());
        if (!cancelled && !res.ok) setData(null);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => refresh(), [refresh]);

  return { data, loading, refresh };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) +
    ` · ${d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}`
  );
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} h ago`;
  return `${Math.floor(secs / 86400)} d ago`;
}

const TRIGGER_META: Record<string, { label: string; className: string }> = {
  INITIAL: { label: "first snapshot", className: "border-border bg-muted/60 text-muted-foreground" },
  MATERIAL_CHANGE: { label: "profile change", className: "border-primary/40 bg-primary/10 text-primary" },
  PERIODIC: { label: "periodic refresh", className: "border-border bg-muted/60 text-muted-foreground" },
};

// Component dots — tiny decorative markers; the label carries the meaning.
const COMPONENT_DOT: Record<string, string> = {
  identityAssurance: "bg-emerald-600 dark:bg-emerald-400",
  verifiedCredentials: "bg-teal-600 dark:bg-teal-400",
  verifiedReputation: "bg-amber-500 dark:bg-amber-400",
  resolutionHistory: "bg-stone-500 dark:bg-stone-400",
  confirmedRisk: "bg-rose-500 dark:bg-rose-400",
};

function DeltaBadge({ delta, size = "sm" }: { delta: number; size?: "sm" | "lg" }) {
  const up = delta > 0;
  const flat = delta === 0;
  const Icon = up ? TrendingUp : flat ? Minus : TrendingDown;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-bold tabular-nums",
        size === "lg" ? "px-2.5 py-1 text-sm" : "text-[11px]",
        flat
          ? "border-border bg-muted/60 text-muted-foreground"
          : up
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-destructive/40 bg-destructive/10 text-destructive"
      )}
    >
      <Icon className={size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden="true" />
      {flat ? "no change" : `${up ? "+" : "−"}${Math.abs(delta)}`}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Sparkline — responsive SVG (vector-effect keeps strokes uniform), with
// hover/focus zones + tooltip, min/max guides and an emphasized last point.
// ---------------------------------------------------------------------------

function Sparkline({ spark }: { spark: { at: string; score: number }[] }) {
  const [active, setActive] = React.useState<number | null>(null);
  const n = spark.length;

  if (n === 0) return null;

  const W = 600;
  const H = 120;
  const PAD = 8;
  const scores = spark.map((p) => p.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min;
  const yFor = (score: number) =>
    range === 0 ? H / 2 : PAD + (1 - (score - min) / range) * (H - 2 * PAD);
  const xFor = (i: number) => (n === 1 ? W / 2 : PAD + (i / (n - 1)) * (W - 2 * PAD));

  const pts = spark.map((p, i) => ({ x: xFor(i), y: yFor(p.score), ...p }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;

  // Non-overlapping pointer zones (midpoint boundaries), as % of width.
  const pctFor = (i: number) => (n === 1 ? 50 : (xFor(i) / W) * 100);
  const bounds = pts.map((_, i) => {
    if (n === 1) return { l: 0, w: 100 };
    const l = i === 0 ? 0 : (pctFor(i - 1) + pctFor(i)) / 2;
    const r = i === n - 1 ? 100 : (pctFor(i) + pctFor(i + 1)) / 2;
    return { l, w: r - l };
  });
  const activeP = active !== null ? pts[active] : null;

  return (
    <div className="relative pt-8">
      {/* Tooltip — centered on the active point, edge-clamped. The outer
          plain div owns left/translate (framer-motion must not own transform
          here or it would clobber the centering math); the inner motion.div
          animates opacity only. */}
      {activeP
        ? (() => {
            const pct = (activeP.x / W) * 100;
            const clamp =
              pct < 12 ? "translateX(0)" : pct > 88 ? "translateX(-100%)" : "translateX(-50%)";
            return (
              <div
                className="pointer-events-none absolute top-0 z-10"
                style={{ left: `${pct.toFixed(1)}%`, transform: clamp }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  role="status"
                  className="ts-inset flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm"
                >
                  <span className="ts-grad-text tabular-nums">{activeP.score}</span>
                  <span className="text-muted-foreground">{timeAgo(activeP.at)}</span>
                </motion.div>
              </div>
            );
          })()
        : null}

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-24 w-full sm:h-28"
          role="img"
          aria-label={`Score trend chart: ${n} snapshot${n === 1 ? "" : "s"}, from ${spark[0].score} to ${spark[n - 1].score}, lowest ${min}, highest ${max}.`}
        >
          <defs>
            <linearGradient id="ts-spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--trust)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--trust)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* min / max guides (flat series → single center guide) */}
          {range > 0 ? (
            <>
              <line x1={PAD} x2={W - PAD} y1={yFor(min)} y2={yFor(min)} className="stroke-border" strokeDasharray="4 6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <line x1={PAD} x2={W - PAD} y1={yFor(max)} y2={yFor(max)} className="stroke-border" strokeDasharray="4 6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </>
          ) : (
            <line x1={PAD} x2={W - PAD} y1={H / 2} y2={H / 2} className="stroke-border" strokeDasharray="4 6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          )}
          <path d={area} fill="url(#ts-spark-fill)" />
          <motion.path
            d={line}
            fill="none"
            className="stroke-primary"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
          {/* historical points */}
          {pts.map((p, i) => (
            <circle
              key={`pt-${i}`}
              cx={p.x}
              cy={p.y}
              r={active === i ? 4.5 : 2.5}
              className={cn(
                "transition-all",
                i === n - 1 ? "fill-primary stroke-background" : "fill-primary/70 stroke-background",
                active === i && "fill-primary"
              )}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* hover / focus zones — one per snapshot, keyboard accessible */}
        <div className="absolute inset-0">
          {pts.map((p, i) => (
            <button
              key={`zone-${i}`}
              type="button"
              aria-label={`Snapshot ${i + 1} of ${n}: score ${p.score}, ${timeLabel(p.at)}`}
              className="h-full cursor-default rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              style={{ position: "absolute", left: `${bounds[i].l}%`, width: `${bounds[i].w}%` }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onMouseDown={(e) => e.preventDefault()}
            />
          ))}
        </div>

        {/* last-point pulse */}
        {n > 0 ? (
          <motion.span
            aria-hidden="true"
            className="absolute h-2.5 w-2.5 rounded-full bg-primary/40"
            style={{
              left: `calc(${((pts[n - 1].x / W) * 100).toFixed(1)}% - 5px)`,
              top: `${(pts[n - 1].y / H) * 100}%`,
              transform: "translateY(-50%)",
            }}
            animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
        ) : null}
      </div>

      {/* faint x-axis context — first & last snapshot dates */}
      <div className="mt-1 flex items-baseline justify-between text-[10px] tabular-nums text-muted-foreground/70">
        <span className="truncate">{timeAgo(spark[0].at)}</span>
        <span className="truncate">{n > 1 ? timeLabel(spark[n - 1].at).split(" · ")[0] : ""}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component delta row — from → to with a directional track segment.
// ---------------------------------------------------------------------------

function ComponentDeltaRow({
  label,
  from,
  to,
  delta,
  max,
}: {
  label: string;
  from: number;
  to: number;
  delta: number;
  max: number;
}) {
  // Scale: engine max when positive; confirmedRisk rows cap |value| at 30.
  const scale = max > 0 ? max : 30;
  const pos = (v: number) => Math.max(0, Math.min(100, (Math.abs(v) / scale) * 100));
  const a = pos(from);
  const b = pos(to);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-semibold text-foreground">{label}</span>
        <span className="shrink-0 text-[11px] font-bold tabular-nums text-muted-foreground">
          {from < 0 ? `−${Math.abs(from)}` : from}
          <ArrowRight className="mx-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
          <span className={cn(delta < 0 ? "text-destructive" : "text-foreground")}>
            {to < 0 ? `−${Math.abs(to)}` : to}
          </span>
        </span>
      </div>
      <div className="relative mt-1.5 h-1.5 rounded-full bg-muted">
        <span
          aria-hidden="true"
          className={cn(
            "absolute h-1.5 rounded-full",
            delta === 0
              ? "bg-muted-foreground/40"
              : delta > 0
                ? "bg-primary"
                : "bg-destructive/70"
          )}
          style={{ left: `${lo}%`, width: `${Math.max(1.5, hi - lo)}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-background bg-muted-foreground/60"
          style={{ left: `calc(${a}% - 5px)` }}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-background",
            delta === 0 ? "bg-muted-foreground/60" : delta > 0 ? "bg-primary" : "bg-destructive"
          )}
          style={{ left: `calc(${b}% - 5px)` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change timeline entry
// ---------------------------------------------------------------------------

function ChangeEntry({ change }: { change: ScoreChange }) {
  const trigger = TRIGGER_META[change.trigger] ?? TRIGGER_META.PERIODIC;
  const movers = change.componentDeltas.filter((d) => d.delta !== 0);
  const frozen = change.state === "FROZEN";

  // NOTE: the parent renders this inside a motion.li — so this root MUST be
  // a div (li>li would be invalid HTML and trips a hydration warning).
  return (
    <div className="relative rounded-lg py-3 pl-1">
      <span
        aria-hidden="true"
        className={cn(
          "absolute -left-[26px] top-5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background",
          frozen
            ? "bg-teal-500"
            : change.delta > 0
              ? "bg-primary"
              : change.delta < 0
                ? "bg-destructive"
                : "bg-muted-foreground/50"
        )}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <DeltaBadge delta={change.delta} />
        <span className="text-sm font-bold tabular-nums">
          {change.fromScore}
          <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-muted-foreground align-[-2px]" aria-hidden="true" />
          {change.toScore}
        </span>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", trigger.className)}>
          {trigger.label}
        </span>
        {change.policyChanged ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            re-scored under policy v{change.fromPolicy ?? "?"} → v{change.toPolicy ?? "?"}
          </span>
        ) : (
          change.toPolicy !== null && (
            <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              policy v{change.toPolicy}
            </span>
          )
        )}
        {frozen ? (
          <span className="rounded-full border border-teal-600/40 bg-teal-600/10 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
            frozen snapshot (appeal window)
          </span>
        ) : null}
        <time className="ml-auto text-[10px] text-muted-foreground" dateTime={change.computedAt}>
          {timeLabel(change.computedAt)} · {timeAgo(change.computedAt)}
        </time>
      </div>

      {/* component movers — compact chips */}
      {movers.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {movers.map((d) => (
            <span
              key={d.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                d.delta > 0
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              )}
            >
              <span
                aria-hidden="true"
                className={cn("h-1.5 w-1.5 rounded-full", COMPONENT_DOT[d.key] ?? "bg-muted-foreground")}
              />
              {d.label} {d.delta > 0 ? "+" : "−"}
              {Math.abs(d.delta)}
            </span>
          ))}
        </div>
      ) : null}

      {/* window events — correlated context, not a verdict */}
      {change.eventCount > 0 ? (
        <div className="mt-2 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recorded between these snapshots
          </p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {change.events.map((e, i) => (
              <li
                key={`${change.id}-ev-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border/70"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    COMPONENT_DOT[e.componentKey ?? ""] ?? "bg-muted-foreground"
                  )}
                />
                {e.label}
              </li>
            ))}
            {change.eventCount > change.events.length ? (
              <li className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground ring-1 ring-border/70">
                +{change.eventCount - change.events.length} more
              </li>
            ) : null}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-[10px] italic text-muted-foreground">
          No audited score-relevant events recorded in this window.
        </p>
      )}
      <span className="sr-only">
        {`Score changed from ${change.fromScore} to ${change.toScore}, ${change.delta >= 0 ? "up" : "down"} by ${Math.abs(change.delta)} points. ${change.eventCount} audited events recorded between the snapshots.`}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export function ScoreHistoryCard({
  data,
  loading,
}: {
  data: ScoreHistory | null;
  loading: boolean;
}) {
  const summary = data?.summary;
  const changesDesc = React.useMemo(
    () => (data ? [...data.changes].reverse() : []), // newest first
    [data]
  );
  const latest = changesDesc[0];
  const latestComps = React.useMemo(() => {
    const m = new Map<string, number>();
    if (data?.history.length) {
      for (const c of data.history[data.history.length - 1].components) m.set(c.key, c.max);
    }
    return m;
  }, [data]);

  return (
    <Card className="ts-card-hover min-w-0 lg:col-span-3">
      <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LineChart className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Why did my score change?</CardTitle>
          <CardDescription className="truncate">
            Every snapshot you&apos;ve had, what moved, and what was recorded in between
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
            <History className="mr-1 h-3 w-3" aria-hidden="true" />
            {summary?.snapshotCount ?? 0} snapshot{(summary?.snapshotCount ?? 0) === 1 ? "" : "s"}
          </Badge>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-[11px]"
            title="Download the full series as CSV"
          >
            <a href="/api/v1/passport/score-history/export?format=csv" download>
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              CSV
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-[11px]"
            title="Download the full history as JSON"
          >
            <a href="/api/v1/passport/score-history/export?format=json" download>
              <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
              JSON
            </a>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3 py-6" role="status" aria-label="Loading score history">
            <div className="h-24 animate-pulse rounded-lg bg-muted/60 sm:h-28" />
            <div className="h-16 animate-pulse rounded-lg bg-muted/40" />
            <div className="h-40 animate-pulse rounded-lg bg-muted/30" />
          </div>
        ) : !data || data.history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ShieldQuestion className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm font-medium text-muted-foreground">
              No score history yet
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Your first TrustScore snapshot is created the first time your passport is read.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Sparkline + summary strip */}
            <div className="ts-inset rounded-xl px-4 pb-3 pt-2">
              <Sparkline spark={data.spark} />
              <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 sm:grid-cols-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Now</p>
                  <p className="ts-grad-text text-lg font-black leading-tight tabular-nums">
                    {summary?.latestScore ?? "—"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Since first</p>
                  <p
                    className={cn(
                      "text-lg font-black leading-tight tabular-nums",
                      (summary?.netChange ?? 0) > 0
                        ? "text-primary"
                        : (summary?.netChange ?? 0) < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                    )}
                  >
                    {(summary?.netChange ?? 0) >= 0 ? "+" : "−"}
                    {Math.abs(summary?.netChange ?? 0)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Range</p>
                  <p className="text-lg font-black leading-tight tabular-nums text-muted-foreground">
                    {summary?.minScore ?? "–"}–{summary?.maxScore ?? "–"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Changes</p>
                  <p className="text-lg font-black leading-tight tabular-nums text-muted-foreground">
                    {summary?.upChanges ?? 0} up · {summary?.downChanges ?? 0} down
                  </p>
                </div>
              </div>
            </div>

            {/* Latest change breakdown */}
            {latest ? (
              <div className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Latest change
                  </p>
                  <DeltaBadge delta={latest.delta} size="lg" />
                  <span className="text-[11px] text-muted-foreground">
                    {timeLabel(latest.computedAt)} · {timeAgo(latest.computedAt)}
                  </span>
                </div>
                <div className="mt-3 grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                  {latest.componentDeltas.map((d) => (
                    <ComponentDeltaRow
                      key={d.key}
                      label={d.label}
                      from={d.from}
                      to={d.to}
                      delta={d.delta}
                      max={latestComps.get(d.key) ?? 0}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Only one snapshot so far
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your history builds as your evidence changes — verifications, checks, resolutions.
                </p>
              </div>
            )}

            {/* Timeline */}
            {changesDesc.length > 0 ? (
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <History className="h-3.5 w-3.5" aria-hidden="true" />
                  Change timeline
                  <span className="font-medium normal-case tracking-normal">
                    (newest first · last {data.history.length} snapshots retained)
                  </span>
                </p>
                <ol
                  className="ts-scrollbar relative max-h-96 space-y-1.5 overflow-y-auto border-l border-border pl-5 pr-1"
                  aria-label="Score change timeline, newest first"
                >
                  {changesDesc.map((c, i) => (
                    <motion.li
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.35), duration: 0.3 }}
                    >
                      <ChangeEntry change={c} />
                    </motion.li>
                  ))}
                </ol>
              </div>
            ) : null}

            {/* Honest-language note + export hint */}
            <p className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Events listed between snapshots are the <span className="font-medium text-foreground">audited record of what happened</span> —
                correlated context, not a causal verdict (NDPA §37). Raw identifiers never leave the audit trail.{" "}
                <span className="font-medium text-foreground">Export the full series</span>{" "}
                <Download className="inline h-3 w-3 align-[-1px]" aria-hidden="true" /> as CSV or JSON — your data, portable on demand.
              </span>
            </p>

            <span className="sr-only">
              {`Score history: ${summary?.snapshotCount ?? 0} snapshots retained, ${summary?.changeCount ?? 0} changes (${summary?.upChanges ?? 0} up, ${summary?.downChanges ?? 0} down, ${summary?.flatChanges ?? 0} flat). Current score ${summary?.latestScore ?? "unknown"}.`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
