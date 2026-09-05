"use client";

// TrustScore Stage 8 — MyEngineCard: the member's snapshot lifecycle.
// State machine surfaced honestly: ACTIVE (fresh) / STALE (past horizon —
// recomputes on next read) / FROZEN (appeal pending — the score cannot move
// up or down until a human decides; NDPA §37 fairness). Names the policy
// version that produced the current score (provenance) and shows the
// automated-decision gate state.
//
// Stage 8.1 additions: score-over-time sparkline (animated SVG draw over the
// member's immutable snapshot rows) + a lifecycle log (each row = one
// snapshot: state, score, delta, trigger, policy version).

import * as React from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Snowflake,
  RefreshCw,
  ShieldCheck,
  ScrollText,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EngineMe } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE_META: Record<string, { label: string; hint: string; className: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: "Active",
    hint: "Fresh and canonical — recomputed whenever your evidence changes.",
    className: "bg-primary/10 text-primary border-primary/30",
    icon: <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  STALE: {
    label: "Stale",
    hint: "Past its freshness horizon — it refreshes automatically the next time you or a verifier reads it.",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400",
    icon: <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  FROZEN: {
    label: "Frozen",
    hint: "An appeal is under human review — your score cannot move up or down until the reviewer decides.",
    className: "bg-teal-600/10 text-teal-700 border-teal-600/40 dark:text-teal-300",
    icon: <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  RETIRED: {
    label: "Retired",
    hint: "Superseded by a newer snapshot — kept in your history and DSR export.",
    className: "bg-muted text-muted-foreground border-border",
    icon: <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />,
  },
};

const TRIGGER_LABEL: Record<string, string> = {
  INITIAL: "first snapshot",
  MATERIAL_CHANGE: "recomputed on a profile change",
  PERIODIC: "periodic refresh",
  APPEAL_RESOLVED: "recomputed after an appeal decision",
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function shortTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Score-over-time sparkline — pure SVG over the member's snapshot history.
// Area fill + animated line draw + per-point focus dots. The latest point
// gets an emphasized ring (teal when FROZEN).
// ---------------------------------------------------------------------------

function Sparkline({ history }: { history: NonNullable<EngineMe["history"]> }) {
  const n = history.length;
  if (n < 2) {
    return (
      <div className="ts-inset rounded-lg px-3.5 py-3 text-[11px] leading-relaxed text-muted-foreground">
        Your score-over-time chart appears here once you have at least two
        snapshots — each recomputation is kept as an immutable history row.
      </div>
    );
  }

  const W = 260;
  const H = 64;
  const PAD_X = 6;
  const PAD_Y = 8;
  const x = (i: number) => PAD_X + (i / (n - 1)) * (W - 2 * PAD_X);
  const y = (score: number) => H - PAD_Y - (score / 100) * (H - 2 * PAD_Y);
  const points = history.map((h, i) => ({ ...h, cx: x(i), cy: y(h.score) }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[n - 1].cx.toFixed(1)},${H - 2} L${points[0].cx.toFixed(1)},${H - 2} Z`;
  const latest = points[n - 1];
  const first = points[0];
  const minScore = Math.min(...history.map((h) => h.score));
  const maxScore = Math.max(...history.map((h) => h.score));

  return (
    <div
      className="ts-inset rounded-lg px-3.5 py-3"
      data-testid="score-sparkline"
      role="img"
      aria-label={`Score over time: from ${first.score} to ${latest.score} across ${n} snapshots, range ${minScore}–${maxScore}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">Score over time</p>
        <span className="flex items-center gap-1.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {latest.score >= first.score ? (
            <TrendingUp className="h-3 w-3 text-primary" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-3 w-3 text-destructive" aria-hidden="true" />
          )}
          {first.score} → {latest.score}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1.5 h-16 w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ts-spark-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--primary)", stopOpacity: 0.26 }} />
            <stop offset="100%" style={{ stopColor: "var(--primary)", stopOpacity: 0.02 }} />
          </linearGradient>
        </defs>
        {/* faint gridlines at 0 / 50 / 100 */}
        {[0, 50, 100].map((s) => (
          <line
            key={s}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={y(s)}
            y2={y(s)}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        ))}
        <motion.path
          d={areaPath}
          fill="url(#ts-spark-area)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
        {points.map((p, i) => (
          <g key={i}>
            <motion.circle
              cx={p.cx}
              cy={p.cy}
              r={i === n - 1 ? 3.4 : 2.2}
              className={cn(
                i === n - 1
                  ? p.state === "FROZEN"
                    ? "fill-teal-600 stroke-background dark:fill-teal-300"
                    : "fill-primary stroke-background"
                  : p.state === "FROZEN"
                    ? "fill-teal-600/70 stroke-teal-600 dark:fill-teal-300/70 dark:stroke-teal-300"
                    : "fill-background stroke-primary"
              )}
              strokeWidth={i === n - 1 ? 2 : 1.5}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35 + i * 0.05, duration: 0.25 }}
            />
            <title>
              {`${shortDate(p.computedAt)} — score ${p.score} (${p.status.toLowerCase().replace("_", " ")}, ${p.state.toLowerCase()}${p.policyVersion ? `, policy v${p.policyVersion}` : ""})`}
            </title>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
        <span>{shortDate(first.computedAt)}</span>
        <span>
          {n} snapshot{n > 1 ? "s" : ""} · range {minScore}–{maxScore}
        </span>
        <span>{shortDate(latest.computedAt)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lifecycle log — one row per snapshot (newest first, scrollable).
// ---------------------------------------------------------------------------

function LifecycleLog({ history }: { history: NonNullable<EngineMe["history"]> }) {
  if (history.length < 2) return null;
  const rows = history.slice().reverse();
  return (
    <div data-testid="lifecycle-log">
      <p className="flex items-center gap-2 text-xs font-semibold">
        <ScrollText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        Lifecycle log
        <span className="font-normal text-muted-foreground">
          ({history.length} snapshots, newest first)
        </span>
      </p>
      <ol className="ts-scrollbar mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
        {rows.map((h, i) => {
          const prev = rows[i + 1];
          const delta = prev ? h.score - prev.score : null;
          const meta = STATE_META[h.state] ?? STATE_META.RETIRED;
          return (
            <li
              key={`${h.computedAt}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
            >
              <Badge
                variant="outline"
                className={cn("shrink-0 gap-1 px-1.5 text-[9px] font-semibold", meta.className)}
              >
                {meta.icon}
                {meta.label}
              </Badge>
              <span className="shrink-0 text-[11px] font-bold tabular-nums">{h.score}</span>
              {delta !== null && delta !== 0 ? (
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-0.5 text-[10px] font-semibold tabular-nums",
                    delta > 0 ? "text-primary" : "text-destructive"
                  )}
                >
                  {delta > 0 ? (
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                  )}
                  {delta > 0 ? "+" : ""}
                  {delta}
                </span>
              ) : delta === 0 ? (
                <Minus className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : null}
              <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                {h.policyVersion ? (
                  <span className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] font-semibold">
                    v{h.policyVersion}
                  </span>
                ) : null}
                <span className="tabular-nums">{shortTime(h.computedAt)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
        {TRIGGER_LABEL[rows[0].trigger] ? `Latest: ${TRIGGER_LABEL[rows[0].trigger]}. ` : ""}
        Snapshots are immutable rows — your full history is in your DSR export.
      </p>
    </div>
  );
}

export function MyEngineCard({ me }: { me: EngineMe | null }) {
  const state = me?.snapshot?.state
    ? (STATE_META[me.snapshot.state] ?? STATE_META.ACTIVE)
    : null;
  const history = me?.history ?? [];

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Cpu className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">My score&apos;s lifecycle</CardTitle>
          <CardDescription className="truncate">
            Where your TrustScore stands in the engine
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {state && me?.snapshot ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="ts-inset rounded-lg px-3.5 py-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className={cn("gap-1.5 font-semibold", state.className)}>
                {state.icon}
                {state.label}
              </Badge>
              <span className="text-[11px] font-medium text-muted-foreground">
                Policy v{me.snapshot.policyVersion ?? "—"}
              </span>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
              {state.hint}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <dt className="text-muted-foreground">Computed</dt>
                <dd className="font-medium tabular-nums">
                  {new Date(me.snapshot.computedAt).toLocaleString("en-NG", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Refreshes by</dt>
                <dd className="font-medium tabular-nums">
                  {new Date(me.snapshot.expiresAt).toLocaleString("en-NG", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            </dl>
            <p className="mt-2.5 text-[10px] leading-snug text-muted-foreground">
              Trigger:{" "}
              {TRIGGER_LABEL[me.snapshot.trigger] ?? "periodic refresh"}
            </p>
          </motion.div>
        ) : (
          <div className="ts-inset rounded-lg px-3.5 py-3.5 text-[11px] leading-relaxed text-muted-foreground">
            No score snapshot yet — your first TrustScore is computed the first
            time you open your Trust Passport.
          </div>
        )}

        {/* Score-over-time sparkline (immutable history rows) */}
        <Sparkline history={history} />

        {me?.frozenNote ? (
          <div
            role="status"
            className="rounded-lg border border-teal-600/40 bg-teal-600/5 px-3.5 py-3"
          >
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-foreground">
              <Snowflake className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-300" aria-hidden="true" />
              <span>{me.frozenNote}</span>
            </p>
          </div>
        ) : null}

        {/* Lifecycle log */}
        <LifecycleLog history={history} />

        {/* Policy provenance */}
        <div className="rounded-lg border border-border px-3.5 py-3">
          <p className="flex items-center gap-2 text-xs font-semibold">
            <ScrollText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Scored under policy v{me?.policy?.version ?? "—"}
          </p>
          {me?.policy?.changeSummary ? (
            <p className="mt-1.5 line-clamp-4 text-[11px] leading-relaxed text-muted-foreground">
              {me.policy.changeSummary}
            </p>
          ) : null}
        </div>

        {/* Gate transparency */}
        <div
          className={cn(
            "rounded-lg border px-3.5 py-3",
            me?.automatedSignificantDecisions
              ? "border-primary/30 bg-primary/5"
              : "border-border bg-muted/30"
          )}
        >
          <p className="flex items-center gap-2 text-xs font-semibold">
            {me?.automatedSignificantDecisions ? (
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            ) : (
              <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            )}
            {me?.automatedSignificantDecisions
              ? "Automated decisions: enabled under DPIA"
              : "Automated decisions: disabled"}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {me?.automatedSignificantDecisions
              ? "Automated significant decisions run under a completed DPIA; every decision stays explainable and appealable (NDPA §37)."
              : "By policy, TrustScore never takes significant automated decisions about you — adverse outcomes always route to human review."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
