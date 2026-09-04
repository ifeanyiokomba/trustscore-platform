"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  FileClock,
  Landmark,
  ShieldCheck,
  Hourglass,
  Gauge,
  Link2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EvidenceInfo } from "@/lib/types";

const TYPE_META: Record<string, { label: string; icon: React.ElementType }> = {
  NINAUTH_ID_TOKEN: { label: "NINAuth ID token", icon: Landmark },
  PHONE_OTP: { label: "Phone OTP", icon: ShieldCheck },
  LIVENESS: { label: "Liveness check", icon: ShieldCheck },
};

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function EvidenceCard({ evidence }: { evidence: EvidenceInfo[] }) {
  const [now] = React.useState(() => Date.now());
  const active = evidence.filter((e) => e.status === "ACTIVE");

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileClock className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Verification evidence</CardTitle>
          <CardDescription className="truncate">
            Provenance chain — session, consent, provider, freshness
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "ml-auto shrink-0 text-xs",
            active.length > 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "text-muted-foreground"
          )}
        >
          <Link2 className="mr-1 h-3 w-3" />
          {active.length} active
        </Badge>
      </CardHeader>
      <CardContent>
        {evidence.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Hourglass className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium">No evidence yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-snug text-muted-foreground">
              Evidence records are created when a verification completes. Each one
              carries its full provenance: which session, under which consent,
              from which provider, valid until when.
            </p>
          </div>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1" aria-label="Verification evidence records">
            {evidence.map((e, i) => {
              const meta = TYPE_META[e.type] ?? { label: e.type, icon: ShieldCheck };
              const Icon = meta.icon;
              const days = daysUntil(e.expiresAt);
              const isStale = e.expiresAt !== null && new Date(e.expiresAt).getTime() < now;
              const isRevoked = e.status === "REVOKED";
              return (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.28 }}
                  className={cn(
                    "rounded-lg border px-3.5 py-3",
                    isRevoked
                      ? "border-border/60 bg-muted/20"
                      : isStale
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-background"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isRevoked ? "text-muted-foreground/50" : "text-primary"
                      )}
                      aria-hidden="true"
                    />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">{meta.label}</p>
                    {isRevoked ? (
                      <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">
                        Revoked
                      </Badge>
                    ) : isStale ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-500/50 bg-amber-500/10 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                      >
                        Stale
                      </Badge>
                    ) : days !== null ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-primary/40 bg-primary/10 text-[10px] font-semibold text-primary"
                      >
                        Fresh · {days}d
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{e.summary}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">Confidence</span>
                      <span
                        className="inline-block h-1 w-16 overflow-hidden rounded-full bg-muted"
                        aria-hidden="true"
                      >
                        <span
                          className="ts-conf-fill block h-full rounded-full"
                          style={{ width: `${e.confidence}%` }}
                        />
                      </span>
                      <span className="font-mono">{e.confidence}%</span>
                    </span>
                    <span className="truncate">
                      {e.provider} · <span className="font-mono">{e.providerMode}</span>
                    </span>
                    <time dateTime={e.collectedAt}>
                      {new Date(e.collectedAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
          Raw ID tokens are validated then discarded — only redacted evidence
          summaries persist. No PII in evidence records (directive §38).
        </p>
      </CardContent>
    </Card>
  );
}
