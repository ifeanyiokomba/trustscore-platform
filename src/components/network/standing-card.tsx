"use client";

// TrustScore Stage 10 — StandingCard: your network standing in numbers —
// degree (active attestations), counting partners (those actually feeding
// Verified Reputation right now), business verifications (Trust Decision API
// checks named in your receipts) and the proposal quota meter.

import { Waypoints, Building2, Gauge, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { NetworkMe } from "@/lib/types";

export function StandingCard({ me }: { me: NetworkMe }) {
  const quota = me.standing.quota;
  const quotaPct = Math.min(100, Math.round((quota.used / Math.max(1, quota.max)) * 100));
  const quotaLow = quota.used >= quota.max - 1;

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          <Gauge className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Network standing</CardTitle>
          <CardDescription className="truncate">What the network says today</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Waypoints className="h-3 w-3" aria-hidden="true" />
              Degree
            </dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-primary" data-testid="net-standing-degree">
              {me.standing.degree}
            </dd>
            <dd className="text-[10px] leading-snug text-muted-foreground">active attestations</dd>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-3 w-3" aria-hidden="true" />
              Business checks
            </dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums" data-testid="net-standing-business">
              {me.standing.businessChecks}
            </dd>
            <dd className="text-[10px] leading-snug text-muted-foreground">verified via the Trust API</dd>
          </div>
        </dl>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Counting toward your score</span>
            <span className="tabular-nums text-muted-foreground">
              {me.standing.countingPartners}/{me.standing.degree || 0} partners
            </span>
          </div>
          <Progress
            value={me.standing.degree === 0 ? 0 : (me.standing.countingPartners / me.standing.degree) * 100}
            className="h-2"
            aria-label={`${me.standing.countingPartners} of ${me.standing.degree} partners counting toward your score`}
          />
          <p className="text-[11px] leading-snug text-muted-foreground">
            An edge counts only while <span className="font-medium text-foreground">both</span> memberships are
            active and your partner holds L2+. Pausing stops it instantly.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Proposal quota ({quota.windowDays}-day window)</span>
            <span className={quotaLow ? "font-bold tabular-nums text-amber-600" : "tabular-nums text-muted-foreground"}>
              {quota.used}/{quota.max}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={quota.used}
            aria-valuemin={0}
            aria-valuemax={quota.max}
            aria-label="Proposal quota usage"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${quotaLow ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${quotaPct}%` }}
            />
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          {me.standing.reputationNote}
        </p>
      </CardContent>
    </Card>
  );
}
