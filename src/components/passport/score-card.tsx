"use client";

// TrustScore Stage 5 — ScoreCard (directive §35/§36 score contract UI).
// Gauge + component breakdown + confidence + freshness + NDPA §37
// explanation. NEVER renders safety language — "No confirmed adverse
// signals found" is the ceiling, by design (directive §50).

import * as React from "react";
import { motion } from "framer-motion";
import {
  Gauge,
  Activity,
  Sparkles,
  Info,
  CalendarClock,
  Scale,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { TrustScoreInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  NEW: {
    label: "New",
    className: "bg-muted text-muted-foreground border-border",
  },
  VERIFIED: {
    label: "Verified",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  ESTABLISHED: {
    label: "Established",
    className: "bg-primary/15 text-primary border-primary/40",
  },
  CAUTION: {
    label: "Caution",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400",
  },
  HIGH_RISK: {
    label: "High risk",
    className: "bg-destructive/10 text-destructive border-destructive/40",
  },
  REVIEW_REQUIRED: {
    label: "Review required",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400",
  },
};

const RISK_META: Record<string, { label: string; className: string }> = {
  LOW: { label: "Low risk band", className: "text-primary" },
  MEDIUM: { label: "Medium risk band", className: "text-amber-600 dark:text-amber-400" },
  HIGH: { label: "High risk band", className: "text-destructive" },
};

function freshnessLine(score: TrustScoreInfo): string {
  const mins = Math.max(0, Math.round((Date.parse(score.expiresAt) - Date.now()) / 60000));
  const computedMins = Math.max(0, Math.round((Date.now() - Date.parse(score.computedAt)) / 60000));
  const computed =
    computedMins < 1
      ? "just now"
      : computedMins < 60
        ? `${computedMins} min ago`
        : `${Math.round(computedMins / 60)} h ago`;
  const until = mins < 60 ? `${mins} min` : `${Math.round(mins / 60)} h`;
  return `Computed ${computed} · refreshes in ${until}`;
}

export function ScoreCard({ score }: { score: TrustScoreInfo }) {
  const status = STATUS_META[score.status] ?? STATUS_META.NEW;
  const risk = RISK_META[score.riskBand] ?? RISK_META.LOW;

  // Gauge geometry
  const R = 78;
  const CIRC = 2 * Math.PI * R;
  const filled = (score.score / 100) * CIRC;

  return (
    <Card className="ts-card-hover min-w-0 overflow-hidden">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Gauge className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">TrustScore</CardTitle>
          <CardDescription className="truncate">
            Your portable trust snapshot — evidence-weighted, never a safety verdict
          </CardDescription>
        </div>
        <Badge variant="outline" className={cn("shrink-0 font-semibold", status.className)}>
          {status.label}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
          {/* Gauge */}
          <div
            className="relative mx-auto h-[190px] w-[190px]"
            role="img"
            aria-label={`TrustScore ${score.score} out of 100, ${status.label}`}
          >
            <svg viewBox="0 0 190 190" className="h-full w-full -rotate-90">
              <circle
                cx="95"
                cy="95"
                r={R}
                fill="none"
                strokeWidth="12"
                className="stroke-muted"
              />
              <motion.circle
                cx="95"
                cy="95"
                r={R}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                className="stroke-primary"
                strokeDasharray={CIRC}
                initial={{ strokeDashoffset: CIRC }}
                animate={{ strokeDashoffset: CIRC - filled }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="ts-grad-text text-5xl font-black tabular-nums"
              >
                {score.score}
              </motion.span>
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                / 100
              </span>
              <span className={cn("mt-1 text-[11px] font-semibold", risk.className)}>
                {risk.label}
              </span>
            </div>
          </div>

          {/* Component breakdown */}
          <div className="min-w-0 space-y-3.5">
            {score.components.map((c, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
                className="min-w-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-foreground">
                    {c.label}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-bold tabular-nums",
                      c.value < 0 ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {c.value < 0 ? `−${Math.abs(c.value)}` : `${c.value}/${c.max}`}
                  </span>
                </div>
                <Progress
                  value={c.value < 0 ? 0 : Math.round((c.value / Math.max(1, c.max)) * 100)}
                  className={cn("mt-1.5 h-1.5", c.key === "confirmedRisk" && "opacity-40")}
                  aria-label={`${c.label}: ${c.value}`}
                />
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{c.note}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Confidence + freshness strip */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="ts-inset rounded-lg px-3.5 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Activity className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Confidence {score.confidence}/100
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="ts-conf-fill h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${score.confidence}%` }}
                transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              How much fresh evidence backs the score right now.
            </p>
          </div>
          <div className="ts-inset rounded-lg px-3.5 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <CalendarClock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Freshness · v{score.version}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {freshnessLine(score)}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Trigger:{" "}
              {score.trigger === "MATERIAL_CHANGE"
                ? "recomputed on a profile change"
                : score.trigger === "INITIAL"
                  ? "first snapshot"
                  : "periodic refresh"}
            </p>
          </div>
        </div>

        {/* NDPA §37 explanation */}
        <Collapsible className="mt-4 rounded-lg border border-border">
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
            <span className="flex items-center gap-2 text-xs font-semibold">
              <Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              How this score was computed
              <span className="text-[10px] font-medium text-muted-foreground">(NDPA §37)</span>
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="space-y-2 px-4 pb-4">
              {score.explanation.map((line, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground"
                >
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>

        <p className="mt-3 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            A TrustScore summarizes{" "}
            <span className="font-medium text-foreground">recorded verification evidence</span> —
            it is not a guarantee that a person is safe to deal with. Scores react to your profile
            instantly; confirmed flags can be <span className="font-medium text-foreground">appealed for 14 days</span>{" "}
            after a human decision.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
