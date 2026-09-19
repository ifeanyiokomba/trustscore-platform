"use client";

// TrustScore Stage 5 / Batch 5 — TrustReceiptsCard (who checked your Trust Card).
// Every public open is logged: viewer label, channel, what was shown, when,
// and WHICH link was opened. No PII is collected about viewers — only salted
// IP hashes for abuse dedupe (never displayed). Batch 5 adds channel badges
// (link / member / API), shown.confidence, date grouping, header stats and
// link-provenance chips (live scopes vs dead link).

import * as React from "react";
import { motion } from "framer-motion";
import {
  ReceiptText,
  Eye,
  ShieldCheck,
  Inbox,
  Link as LinkIcon,
  Link2Off,
  Webhook,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReceiptsStats, TrustReceiptInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHANNEL_META: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  TRUST_LINK: {
    label: "link",
    icon: LinkIcon,
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  SAFETY_CHECK: {
    label: "member",
    icon: ShieldCheck,
    className: "border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  API_CHECK: {
    label: "API",
    icon: Webhook,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

function channelMeta(channel: string) {
  return (
    CHANNEL_META[channel] ?? {
      label: channel.toLowerCase().replace(/_/g, " "),
      icon: Eye,
      className: "border-border bg-muted text-muted-foreground",
    }
  );
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function ReceiptsCard({
  receipts,
  stats,
}: {
  receipts: TrustReceiptInfo[];
  stats?: ReceiptsStats | null;
}) {
  // Batch 5 — date-grouped view of every receipt the read model returns (20).
  const groups = React.useMemo(() => {
    const byDay = new Map<string, TrustReceiptInfo[]>();
    for (const r of receipts) {
      const key = dayKey(r.viewedAt);
      const list = byDay.get(key);
      if (list) list.push(r);
      else byDay.set(key, [r]);
    }
    return Array.from(byDay.entries());
  }, [receipts]);

  const channelSummary = React.useMemo(() => {
    if (!stats) return null;
    const parts: string[] = [];
    for (const [channel, label] of [
      ["TRUST_LINK", "link"],
      ["SAFETY_CHECK", "member"],
      ["API_CHECK", "API"],
    ] as const) {
      const n = stats.byChannel[channel] ?? 0;
      if (n > 0) parts.push(`${n} ${label}`);
    }
    return parts.length ? parts.join(" · ") : null;
  }, [stats]);

  const totalRetained = stats?.total ?? receipts.length;

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ReceiptText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Trust receipts</CardTitle>
          <CardDescription className="truncate">
            Who checked your Trust Card, and what they saw
          </CardDescription>
          {channelSummary && (
            <p className="mt-1 text-[11px] font-medium tabular-nums text-muted-foreground">
              {totalRetained} open{totalRetained === 1 ? "" : "s"} · {channelSummary}
            </p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/5 text-primary">
          {receipts.length} check{receipts.length === 1 ? "" : "s"}
        </Badge>
      </CardHeader>
      <CardContent>
        {receipts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-7 text-center">
            <Inbox className="mx-auto h-7 w-7 text-muted-foreground/50" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">No one has opened a link yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a trust link — every open lands here instantly.
            </p>
          </div>
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto pr-1 ts-scrollbar" aria-label="Trust receipts">
            {groups.map(([day, rows]) => (
              <section key={day} aria-label={`Receipts from ${day}`}>
                <h5 className="sticky top-0 z-[1] -mx-1 mb-1 bg-background/95 px-1 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                  {day}
                </h5>
                <ul className="space-y-1.5">
                  {rows.map((r, i) => {
                    const meta = channelMeta(r.channel);
                    const ChannelIcon = meta.icon;
                    const linkDead =
                      r.linkStatus === "REVOKED" || r.linkStatus === "EXPIRED";
                    return (
                      <motion.li
                        key={r.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.3) }}
                        data-testid="receipt-row"
                        className="rounded-lg border border-border/70 bg-muted/25 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            data-testid={`receipt-channel-${r.channel}`}
                            title={`${r.channel} open`}
                            className={cn(
                              "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-[10px] font-semibold uppercase tracking-wide",
                              meta.className
                            )}
                          >
                            <ChannelIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only">Channel:</span>
                            {meta.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold">{r.viewerLabel}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              saw{" "}
                              <span className="tabular-nums">
                                score {String(r.shown.score ?? "—")}/100 · {String(r.shown.status ?? "—")} · {String(r.shown.riskBand ?? "—")} band
                                {typeof r.shown.confidence === "number"
                                  ? ` · confidence ${r.shown.confidence}%`
                                  : ""}
                              </span>
                            </p>
                          </div>
                          <time className="shrink-0 text-[10px] text-muted-foreground" dateTime={r.viewedAt}>
                            {timeAgo(r.viewedAt)}
                          </time>
                        </div>
                        {r.linkStatus !== null && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
                            {r.linkStatus === "ACTIVE" ? (
                              r.linkScopes.map((s) => (
                                <span
                                  key={s}
                                  data-testid="receipt-token-chip"
                                  className="rounded-full border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary"
                                >
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span
                                data-testid="receipt-token-chip"
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground"
                              >
                                <Link2Off className="h-3 w-3" aria-hidden="true" />
                                dead link{r.linkStatus === "REVOKED" ? " (revoked)" : ""}
                              </span>
                            )}
                          </div>
                        )}
                      </motion.li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Receipts record the <span className="font-medium text-foreground">fact of the check</span>,
            never viewer PII. Viewers are told the check was recorded — honesty both ways.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
