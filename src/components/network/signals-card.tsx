"use client";

// TrustScore Stage 10 — SignalsCard: your own shared-signal record (FraudNet
// class, subject-side). Real signals mint only from human-confirmed flags
// (the 14-day appeal path is the dispute route and an overturn retracts the
// signal automatically); MOCK partner rows are honest demo data. Includes
// the k-anonymity explainer — checkers never see details, only counts.

import { motion } from "framer-motion";
import { Radar, ShieldAlert, ShieldCheck, Scale, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { NetworkMe } from "@/lib/types";

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: "bg-destructive/10 text-destructive",
  MEDIUM: "bg-amber-500/10 text-amber-600",
  LOW: "bg-primary/10 text-primary",
};

export function SignalsCard({ me }: { me: NetworkMe }) {
  const joined = me.membership.joined;

  return (
    <Card className="ts-card-hover min-w-0" data-testid="net-signals-card">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          <Radar className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Shared signals about you</CardTitle>
          <CardDescription className="truncate">FraudNet-class · band-level only</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {joined && me.signals.length > 0 ? (
          <ul className="space-y-2.5" data-testid="net-signals-list">
            {me.signals.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-muted/20 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <ShieldAlert
                      className={`h-4 w-4 ${s.severity === "HIGH" ? "text-destructive" : "text-amber-600"}`}
                      aria-hidden="true"
                    />
                    {s.kind === "CONFIRMED_ADVERSE" ? "Confirmed adverse event" : s.kind}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      SEVERITY_STYLES[s.severity] ?? SEVERITY_STYLES.LOW
                    }`}
                  >
                    {s.severity}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.note}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground/70">{s.platform}</span>
                  {s.platformMode === "MOCK" ? (
                    <span className="rounded border border-border px-1.5 py-0.5 font-semibold text-primary">
                      MOCK
                    </span>
                  ) : null}
                  <span>· {s.windowDays}d window</span>
                  <span>· recorded {new Date(s.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                </div>
                {s.dispute ? (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-[10px] leading-snug text-muted-foreground">
                    <Scale className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                    Dispute: {s.dispute.note}
                  </p>
                ) : null}
              </motion.li>
            ))}
          </ul>
        ) : (
          <div
            className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-center"
            data-testid="net-signals-empty"
          >
            <ShieldCheck className="mx-auto h-7 w-7 text-primary/70" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">
              {joined ? "No shared signals on record" : "Signals appear when you join"}
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              {joined
                ? "Nothing adverse has been shared about you. Signals mint only from human-confirmed events — never raw complaints, never check-only data."
                : "Join the network to see the signals (if any) platforms have shared about you — and dispute them through the flag appeal path."}
            </p>
          </div>
        )}

        {/* k-anonymity explainer */}
        <div className="rounded-xl border border-border bg-muted/30 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-bold">
            <Lock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            How checkers see signals — k-anonymity
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{me.kAnonymity.note}</p>
          <div className="mt-2.5 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span>
              minimum cohort <span className="font-bold text-foreground">k = {me.kAnonymity.minK}</span>
            </span>
            <span>
              window <span className="font-bold text-foreground">{me.kAnonymity.windowDays}d</span>
            </span>
          </div>
        </div>

        {/* partner-feed honesty label */}
        <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
          {me.honesty.note}
        </p>
      </CardContent>
    </Card>
  );
}
