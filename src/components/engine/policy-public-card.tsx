"use client";

// TrustScore Stage 8 — PolicyPublicCard: the rules-first transparency
// surface. Shows the ACTIVE scoring policy's exact budgets as a stacked
// contribution rail, the assurance ladder, the policy version history, the
// DPIA status and the automated-decision gate. No secrets — the policy IS
// the public contract ("inspectable engine").

import * as React from "react";
import { motion } from "framer-motion";
import {
  Scale,
  FileCheck2,
  History,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Landmark,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { EnginePublic, PolicyRulesInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const RULE_ROWS: {
  key: string;
  label: string;
  value: (rules: PolicyRulesInfo) => string;
}[] = [
  {
    key: "credentials",
    label: "Verified Credentials",
    value: (r) => `+${r.credentialPoints} per credential · cap ${r.credentialMax}`,
  },
  {
    key: "reputation",
    label: "Verified Reputation",
    value: (r) =>
      `+${r.interactionPoints} per distinct verifier · ${r.interactionWindowDays}-day window · cap ${r.interactionMax * r.interactionPoints}`,
  },
  {
    key: "resolution",
    label: "Resolution History",
    value: (r) => `+${r.clearedPoints} per cleared flag · cap ${r.clearedMax * r.clearedPoints}`,
  },
  {
    key: "risk",
    label: "Confirmed Risk",
    value: (r) =>
      `−${r.riskPenaltyPer} per human-confirmed flag · cap −${r.riskMaxPenalty} · HIGH_RISK at ${r.riskHighAt}+`,
  },
];

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function PolicyPublicCard({ pub }: { pub: EnginePublic }) {
  const policy = pub.activePolicy;
  const rules = policy?.rules;

  // Stacked contribution rail — the §36 budgets as proportional segments.
  const rail = rules
    ? [
        {
          key: "identity",
          label: `Identity ${rules.assuranceBase[4]}`,
          value: rules.assuranceBase[4],
          className: "ts-rail-identity",
        },
        {
          key: "credentials",
          label: `Credentials ${rules.credentialMax}`,
          value: rules.credentialMax,
          className: "ts-rail-credentials",
        },
        {
          key: "reputation",
          label: `Reputation ${rules.interactionMax * rules.interactionPoints}`,
          value: rules.interactionMax * rules.interactionPoints,
          className: "ts-rail-reputation",
        },
        {
          key: "resolution",
          label: `Resolution ${rules.clearedMax * rules.clearedPoints}`,
          value: rules.clearedMax * rules.clearedPoints,
          className: "ts-rail-resolution",
        },
      ]
    : [];
  const railTotal = rail.reduce((a, s) => a + s.value, 0) || 1;

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Scale className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">
            The scoring rules — public by design
          </CardTitle>
          <CardDescription className="truncate">
            {policy
              ? `Active policy v${policy.version} · activated ${timeAgo(policy.activatedAt)}`
              : "No active policy"}
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 gap-1.5 font-semibold",
            pub.dpia.status === "COMPLETED"
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400"
          )}
        >
          <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
          DPIA {pub.dpia.status === "COMPLETED" ? "completed" : "required"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        {policy && rules ? (
          <>
            {/* Contribution rail — how the 100 points are budgeted */}
            <div>
              <div
                className="flex h-3.5 w-full overflow-hidden rounded-full"
                role="img"
                aria-label={`Score budget: ${rail
                  .map((s) => `${s.label.replace(/\s\d+$/, "")} up to ${s.value}`)
                  .join(", ")}`}
              >
                {rail.map((seg, i) => (
                  <motion.div
                    key={seg.key}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    style={{ width: `${(seg.value / railTotal) * 100}%`, transformOrigin: "left" }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                    className={cn("h-full", seg.className, i > 0 && "border-l-2 border-background")}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                {rail.map((seg) => (
                  <span
                    key={seg.key}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"
                  >
                    <span
                      className={cn("h-2 w-2 rounded-full", seg.className)}
                      aria-hidden="true"
                    />
                    {seg.label}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-destructive/70" aria-hidden="true" />
                  Risk up to −{rules.riskMaxPenalty}
                </span>
              </div>
            </div>

            {/* Assurance ladder + exact rule rows */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="ts-inset rounded-lg px-3.5 py-3">
                <p className="text-xs font-semibold">Identity Assurance ladder</p>
                <div className="mt-2.5 space-y-1.5">
                  {[1, 2, 3, 4].map((lvl) => (
                    <div key={lvl} className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-[10px] font-bold text-muted-foreground">
                        L{lvl}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/80"
                          style={{ width: `${(rules.assuranceBase[lvl] / Math.max(1, rules.assuranceBase[4])) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[10px] font-bold tabular-nums">
                        {rules.assuranceBase[lvl]}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                  Freshness-scaled: full weight with ≥{rules.freshnessFullDays} days left,
                  floor {Math.round(rules.freshnessMinFactor * 100)}% at the horizon.
                </p>
              </div>
              <div className="ts-inset rounded-lg px-3.5 py-3">
                <p className="text-xs font-semibold">Component rules</p>
                <ul className="mt-2 space-y-1.5">
                  {RULE_ROWS.map((row) => (
                    <li key={row.key} className="text-[11px] leading-snug">
                      <span className="font-semibold">{row.label}</span>
                      <span className="text-muted-foreground"> — {row.value(rules)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                  Snapshot freshness: {rules.snapshotTtlHours}h · ESTABLISHED at
                  L{rules.establishedMinLevel}+ · status bands from recorded evidence only.
                </p>
              </div>
            </div>

            {/* What changed + DPIA summary */}
            <Collapsible className="rounded-lg border border-border">
              <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <History className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Policy v{policy.version} — what it says
                </span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="px-4 pb-4 text-[11px] leading-relaxed text-muted-foreground">
                  {policy.changeSummary}
                </p>
              </CollapsibleContent>
            </Collapsible>
          </>
        ) : (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            No active scoring policy — the engine is not scoring right now.
          </p>
        )}

        {/* DPIA + gate */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className={cn(
              "rounded-lg border px-3.5 py-3",
              pub.dpia.status === "COMPLETED"
                ? "border-primary/25 bg-primary/5"
                : "border-amber-500/40 bg-amber-500/5"
            )}
          >
            <p className="flex items-center gap-2 text-xs font-semibold">
              <Landmark className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              DPIA{" "}
              {pub.dpia.status === "COMPLETED"
                ? `completed ${timeAgo(pub.dpia.completedAt)}`
                : "required before changes"}
            </p>
            <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
              {pub.dpia.summary ??
                "A Data Protection Impact Assessment must cover the policy before it can change."}
            </p>
            {pub.dpia.residualRisk ? (
              <p className="mt-1.5 text-[10px] font-medium text-muted-foreground">
                Residual risk: {pub.dpia.residualRisk}
              </p>
            ) : null}
          </div>
          <div
            className={cn(
              "rounded-lg border px-3.5 py-3",
              pub.automatedSignificantDecisions
                ? "border-primary/25 bg-primary/5"
                : "border-border bg-muted/30"
            )}
          >
            <p className="flex items-center gap-2 text-xs font-semibold">
              {pub.automatedSignificantDecisions ? (
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              )}
              Automated significant decisions
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {pub.gateNote}
            </p>
          </div>
        </div>

        {/* Policy history */}
        {pub.policyHistory.length > 1 ? (
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold">
              <History className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Policy history ({pub.policyHistory.length} versions)
            </p>
            <ol className="mt-2.5 space-y-2">
              {pub.policyHistory.slice(0, 5).map((p) => (
                <li
                  key={p.version}
                  className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2"
                >
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                      p.status === "ACTIVE"
                        ? "bg-primary/15 text-primary"
                        : p.status === "DRAFT"
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted/60 text-muted-foreground/80"
                    )}
                  >
                    v{p.version}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {p.status.toLowerCase()} · {timeAgo(p.activatedAt ?? null)}
                    </p>
                    <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {p.changeSummary}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <p className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {pub.language}
        </p>
      </CardContent>
    </Card>
  );
}
