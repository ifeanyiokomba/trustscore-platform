"use client";

// TrustScore Stage 5 — TrustReceiptsCard (who checked your Trust Card).
// Every public open is logged: viewer label, what was shown, when. No PII
// is collected about viewers — only salted IP hashes for abuse dedupe.

import * as React from "react";
import { motion } from "framer-motion";
import { ReceiptText, Eye, ShieldCheck, Inbox } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TrustReceiptInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export function ReceiptsCard({ receipts }: { receipts: TrustReceiptInfo[] }) {
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
          <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1" aria-label="Trust receipts">
            {receipts.slice(0, 12).map((r, i) => (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                data-testid="receipt-row"
                className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/25 px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{r.viewerLabel}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    saw{" "}
                    <span className="tabular-nums">
                      score {String(r.shown.score ?? "—")}/100 · {String(r.shown.status ?? "—")} · {String(r.shown.riskBand ?? "—")} band
                    </span>
                  </p>
                </div>
                <time className="shrink-0 text-[10px] text-muted-foreground" dateTime={r.viewedAt}>
                  {timeAgo(r.viewedAt)}
                </time>
              </motion.li>
            ))}
          </ul>
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
