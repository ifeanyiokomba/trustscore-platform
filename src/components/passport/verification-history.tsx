"use client";

// TrustScore Stage 5 — VerificationHistory (timeline of evidence + sessions).
// Merges the evidence records (with provenance + freshness) and the NINAuth
// verification session outcomes into one chronological view.

import * as React from "react";
import { motion } from "framer-motion";
import {
  History,
  Landmark,
  Phone,
  ScanFace,
  FileCheck2,
  CircleDot,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IdentityMe } from "@/lib/types";
import { cn } from "@/lib/utils";

const EVIDENCE_META: Record<string, { label: string; icon: React.ElementType }> = {
  NINAUTH_ID_TOKEN: { label: "Government ID token (NINAuth)", icon: Landmark },
  PHONE_OTP: { label: "Phone OTP verification", icon: Phone },
  LIVENESS: { label: "Biometric liveness", icon: ScanFace },
};

const SESSION_LABEL: Record<string, { label: string; tone: string }> = {
  COMPLETED: { label: "NINAuth flow completed", tone: "text-primary" },
  FAILED: { label: "NINAuth flow failed", tone: "text-amber-600 dark:text-amber-400" },
  CONSENT_DENIED: { label: "Consent denied (by you)", tone: "text-amber-600 dark:text-amber-400" },
  EXPIRED: { label: "NINAuth flow expired", tone: "text-muted-foreground" },
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) +
    ` · ${d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}`;
}

export function VerificationHistory({ identity }: { identity: IdentityMe | null }) {
  type Entry = {
    id: string;
    kind: "evidence" | "session";
    at: string;
    icon: React.ElementType;
    title: string;
    sub: string;
    status: string;
    tone: string;
  };

  const entries: Entry[] = React.useMemo(() => {
    if (!identity) return [];
    const list: Entry[] = [];
    for (const e of identity.evidence) {
      const meta = EVIDENCE_META[e.type] ?? { label: e.type, icon: FileCheck2 };
      list.push({
        id: `ev-${e.id}`,
        kind: "evidence",
        at: e.collectedAt,
        icon: meta.icon,
        title: meta.label,
        sub: `${e.provider} (${e.providerMode}) · confidence ${e.confidence}%`,
        status: e.status,
        tone: e.status === "ACTIVE" ? "text-primary" : "text-muted-foreground",
      });
    }
    const s = identity.lastSession;
    if (s) {
      const meta = SESSION_LABEL[s.status] ?? {
        label: `NINAuth flow · ${s.status.toLowerCase()}`,
        tone: "text-muted-foreground",
      };
      list.push({
        id: `ss-${s.id}`,
        kind: "session",
        at: s.createdAt,
        icon: CircleDot,
        title: meta.label,
        sub: `${s.flow === "QR" ? "QR flow" : "Share-code flow"} · ${s.events.length} audited steps`,
        status: s.status,
        tone: meta.tone,
      });
    }
    return list.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [identity]);

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <History className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Verification history</CardTitle>
          <CardDescription className="truncate">
            Every verification event, with provider provenance
          </CardDescription>
        </div>
        <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/5 text-primary">
          {entries.length} event{entries.length === 1 ? "" : "s"}
        </Badge>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No verification history yet — start with NINAuth on the Overview tab.
          </p>
        ) : (
          <ol className="relative max-h-96 space-y-1 overflow-y-auto border-l border-border pl-5 pr-1" aria-label="Verification history">
            {entries.map((e, i) => {
              const Icon = e.icon;
              return (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.06, 0.4) }}
                  className="relative rounded-lg py-2.5 pl-1"
                >
                  <span
                    className={cn(
                      "absolute -left-[26px] top-4 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background",
                      e.tone === "text-primary" ? "bg-primary" : "bg-muted-foreground/50"
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span className="text-sm font-medium">{e.title}</span>
                        <time className="text-[10px] text-muted-foreground" dateTime={e.at}>
                          {timeLabel(e.at)}
                        </time>
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                        <span>{e.sub}</span>
                        {e.kind === "evidence" && (
                          <span className={cn("inline-flex items-center gap-1 font-medium", e.tone)}>
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {e.status === "ACTIVE" ? "active" : e.status.toLowerCase()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
