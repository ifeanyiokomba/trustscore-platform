"use client";

// TrustScore Stage 8 — MyEngineCard: the member's snapshot lifecycle.
// State machine surfaced honestly: ACTIVE (fresh) / STALE (past horizon —
// recomputes on next read) / FROZEN (appeal pending — the score cannot move
// up or down until a human decides; NDPA §37 fairness). Names the policy
// version that produced the current score (provenance) and shows the
// automated-decision gate state.

import * as React from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Snowflake,
  RefreshCw,
  ShieldCheck,
  ScrollText,
  Info,
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

export function MyEngineCard({ me }: { me: EngineMe | null }) {
  const state = me?.snapshot?.state
    ? (STATE_META[me.snapshot.state] ?? STATE_META.ACTIVE)
    : null;

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
              {me.snapshot.trigger === "MATERIAL_CHANGE"
                ? "recomputed on a profile change"
                : me.snapshot.trigger === "INITIAL"
                  ? "first snapshot"
                  : "periodic refresh"}
            </p>
          </motion.div>
        ) : (
          <div className="ts-inset rounded-lg px-3.5 py-3.5 text-[11px] leading-relaxed text-muted-foreground">
            No score snapshot yet — your first TrustScore is computed the first
            time you open your Trust Passport.
          </div>
        )}

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
