"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Landmark,
  Phone,
  ScanFace,
  Network,
  Check,
  Lock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssuranceRung } from "@/lib/types";

const RUNG_ICONS: Record<string, React.ElementType> = {
  government: Landmark,
  phone: Phone,
  biometric: ScanFace,
  cross_signal: Network,
};

export function AssuranceLadder({ ladder }: { ladder: AssuranceRung[] }) {
  const achievedCount = ladder.filter((r) => r.achieved).length;

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Assurance ladder</CardTitle>
          <CardDescription className="truncate">
            Levels build as signals agree — never from one source alone
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "ml-auto shrink-0 text-xs",
            achievedCount > 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "text-muted-foreground"
          )}
        >
          L{achievedCount} / L4
        </Badge>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-2.5" aria-label="Identity assurance levels">
          {/* connector rail: base + progress fill up to achieved level */}
          <span
            className="absolute bottom-5 left-[19px] top-5 w-0.5 rounded bg-border"
            aria-hidden="true"
          />
          {achievedCount > 0 && (
            <span
                           className="ts-rail-fill absolute left-[18px] top-5 w-[3px] rounded bg-gradient-to-b from-primary/90 to-primary/50"
              style={{ height: `calc(${(achievedCount / ladder.length) * 100}% - 4px)` }}
              aria-hidden="true"
            />
          )}
          {ladder.map((rung, i) => {
            const Icon = RUNG_ICONS[rung.key] ?? Landmark;
            return (
              <motion.li
                key={rung.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.3 }}
                className={cn(
                  "group/rung relative flex items-start gap-3 rounded-xl border p-3 transition-colors",
                  rung.achieved
                    ? "ts-rung-active border-solid"
                    : "border-dashed border-border bg-muted/20"
                )}
                aria-current={rung.achieved ? "step" : undefined}
              >
                <span
                  className={cn(
                    "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                    rung.achieved
                      ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  {rung.achieved ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        rung.achieved ? "text-primary" : "text-foreground/80"
                      )}
                    >
                      <span className="mr-1.5 font-mono text-xs">L{rung.level}</span>
                      {rung.title}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
                        rung.achieved
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {rung.achieved ? "Achieved" : rung.stage}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    {rung.detail}
                  </p>
                </div>
                {!rung.achieved && (
                  <Icon
                    className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover/rung:text-primary/60"
                    aria-hidden="true"
                  />
                )}
              </motion.li>
            );
          })}
        </ol>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
          <p className="text-[11px] leading-snug text-muted-foreground">
            Phone and biometric signals are live (Stage 4) — bind them from the <span className="font-medium text-foreground">Trust signals</span> card. Higher assurance requires <span className="font-medium text-foreground">agreement across signals</span> — a single document never pushes you past L1.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
