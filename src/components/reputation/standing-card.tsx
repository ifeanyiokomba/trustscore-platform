"use client";

// TrustScore Stage 7 — StandingCard (reputation standing summary).
// Shows the three live score components this stage activates: Verified
// Reputation (verified interactions), Resolution History (cleared flags) and
// Confirmed Risk (human-confirmed flags). Honest zeros everywhere; platform-
// native data so no MOCK badge. NEVER asserts "safe" or "trustworthy".

import * as React from "react";
import { motion } from "framer-motion";
import {
  Landmark,
  Users,
  Gavel,
  ShieldAlert,
  Info,
  BadgeCheck,
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
import type { ReputationMe, ScoreContributionInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StandingCard({
  me,
  contribution,
  status,
}: {
  me: ReputationMe;
  contribution: ScoreContributionInfo;
  status?: string;
}) {
  const stats = me.stats;
  const rows = [
    {
      icon: Users,
      key: "rep",
      label: "Verified Reputation",
      value: contribution.reputationPoints,
      max: 15,
      note:
        contribution.verifiedInteractions > 0
          ? `${contribution.verifiedInteractions} distinct verified member${
              contribution.verifiedInteractions === 1 ? "" : "s"
            } ran consent-backed checks on you in the last 90 days (+3 each, cap 5).`
          : "No consent-backed checks by verified members in the last 90 days — an honest zero, not a negative signal.",
      tone: "primary" as const,
    },
    {
      icon: Gavel,
      key: "res",
      label: "Resolution History",
      value: contribution.resolutionPoints,
      max: 10,
      note:
        stats.clearedAgainstMe > 0
          ? `${stats.clearedAgainstMe} flag${
              stats.clearedAgainstMe === 1 ? " was" : "s were"
            } raised against you and cleared by human review (+2 each, cap 5).`
          : "No human-reviewed flag resolutions on record yet — an honest zero, not a negative signal.",
      tone: "primary" as const,
    },
    {
      icon: ShieldAlert,
      key: "risk",
      label: "Confirmed Risk",
      value: contribution.confirmedPenalty, // negative
      max: 0,
      note:
        stats.confirmedAgainstMe > 0
          ? `${stats.confirmedAgainstMe} confirmed flag${
              stats.confirmedAgainstMe === 1 ? "" : "s"
            } after human review — appealable for 14 days (−25 each, cap −50).`
          : "No confirmed adverse signals found — a statement about recorded evidence only.",
      tone: "destructive" as const,
    },
  ];

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Landmark className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Reputation standing</CardTitle>
          <CardDescription className="truncate">
            Platform-native — earned by human review, not providers
          </CardDescription>
        </div>
        {status && status !== "NEW" ? (
          <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/10 text-primary">
            <BadgeCheck className="mr-1 h-3 w-3" aria-hidden="true" />
            {status === "ESTABLISHED" ? "Established" : status === "REVIEW_REQUIRED" ? "Review required" : status}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r, i) => (
          <motion.div
            key={r.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
            className="ts-inset rounded-lg p-3"
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              <r.icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  r.tone === "destructive" ? "text-destructive" : "text-primary"
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate">{r.label}</span>
              <span
                className={cn(
                  "ml-auto shrink-0 text-xs font-bold tabular-nums",
                  r.value < 0 ? "text-destructive" : "text-foreground"
                )}
              >
                {r.value < 0 ? `−${Math.abs(r.value)}` : `${r.value}/${r.max}`}
              </span>
            </div>
            {r.max > 0 ? (
              <Progress
                value={Math.round((Math.max(0, r.value) / r.max) * 100)}
                className="mt-2 h-1.5"
                aria-label={`${r.label}: ${r.value}`}
              />
            ) : null}
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{r.note}</p>
          </motion.div>
        ))}

        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Flags never affect your score automatically —{" "}
            <span className="font-medium text-foreground">a human decides every case</span>, and
            you can respond and appeal. This reputation layer is native platform data (no
            external provider), so it carries no MOCK label.
          </p>
        </div>

        <p className="text-[11px] leading-snug text-muted-foreground">
          {stats.openAgainstMe > 0
            ? `${stats.openAgainstMe} open case${stats.openAgainstMe === 1 ? "" : "s"} against you — respond below.`
            : "No open cases against you."}
        </p>
      </CardContent>
    </Card>
  );
}
