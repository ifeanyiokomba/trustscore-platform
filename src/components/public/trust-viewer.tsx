"use client";

// TrustScore Stage 5 — Public Trust Viewer (the `?trust=` client route).
// Renders the PUBLIC trust card for an anonymous viewer. Language is locked:
// "No confirmed adverse signals found" + an explicit not-a-safety-guarantee
// disclaimer (directive §50). The viewer is told the check was receipted.

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  QrCode,
  BadgeCheck,
  ShieldAlert,
  Landmark,
  Phone,
  ScanFace,
  Fingerprint,
  Clock,
  ReceiptText,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PublicTrustCard } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIGNAL_ICON: Record<string, React.ElementType> = {
  NIN_FINGERPRINT: Landmark,
  PHONE: Phone,
  BIOMETRIC: ScanFace,
};

const SIGNAL_LABEL: Record<string, string> = {
  NIN_FINGERPRINT: "Government ID",
  PHONE: "Phone",
  BIOMETRIC: "Biometric",
};

const STATUS_CLASS: Record<string, string> = {
  NEW: "bg-muted text-muted-foreground border-border",
  VERIFIED: "bg-primary/10 text-primary border-primary/30",
  ESTABLISHED: "bg-primary/15 text-primary border-primary/40",
  CAUTION: "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400",
  HIGH_RISK: "bg-destructive/10 text-destructive border-destructive/40",
  REVIEW_REQUIRED: "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400",
};

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ok"; card: PublicTrustCard }
  | { phase: "invalid"; message: string }
  | { phase: "dead"; message: string }
  | { phase: "rate"; message: string };

export function TrustViewer({ token }: { token: string }) {
  const [state, setState] = React.useState<LoadState>({ phase: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/passport/public/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.ok) {
          const body = await res.json();
          setState({ phase: "ok", card: body.card as PublicTrustCard });
        } else {
          const body = await res.json().catch(() => null);
          const code = body?.error?.code ?? "";
          if (code === "LINK_DEAD") {
            setState({ phase: "dead", message: body?.error?.message ?? "This trust link is no longer active." });
          } else if (code === "RATE_LIMITED") {
            setState({ phase: "rate", message: body?.error?.message ?? "Too many checks. Try again shortly." });
          } else {
            setState({ phase: "invalid", message: "This trust link is invalid." });
          }
        }
      } catch {
        if (!cancelled) setState({ phase: "invalid", message: "Could not reach TrustScore." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main
      id="main"
      className="ts-grid-bg mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 py-12 sm:py-16"
    >
      {/* Brand header */}
      <div className="flex items-center gap-2 self-start">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold leading-none">TrustScore</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            Trust Card
          </p>
        </div>
      </div>

      {state.phase === "loading" && (
        <div className="mt-16 flex flex-col items-center gap-3 text-muted-foreground" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm">Opening trust card…</p>
        </div>
      )}

      {state.phase === "ok" && <TrustCardBody card={state.card} />}

      {(state.phase === "invalid" || state.phase === "dead" || state.phase === "rate") && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
        >
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            {state.phase === "rate" ? (
              <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            ) : (
              <QrCode className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            )}
          </span>
          <h1 className="mt-4 text-lg font-bold">
            {state.phase === "invalid" ? "Invalid trust link" : state.phase === "dead" ? "Link no longer active" : "Too many checks"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{state.message}</p>
          <p className="mt-6 text-xs leading-relaxed text-foreground/70">
            Trust links are single-purpose, view-limited and expiring by design. Ask the owner for
            a fresh link if you need to verify them again.
          </p>
        </motion.div>
      )}

      {/* Legal footer */}
      <footer className="mt-auto pt-12 text-center">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          TrustScore · NIN-first identity verification · Lagos, Nigeria
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          No NIN or raw identifiers are ever contained in trust links. NDPA 2023 compliant.
        </p>
      </footer>
    </main>
  );
}

function TrustCardBody({ card }: { card: PublicTrustCard }) {
  const score = card.score;
  const status = score?.status ?? "NEW";
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-8 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      aria-label="Public trust card"
    >
      {/* Card header band */}
      <div className="ts-trust-card relative px-6 py-5">
        <div className="ts-shimmer pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            TrustScore · Trust Card
          </p>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            live view
          </span>
        </div>
        {card.profile && (
          <div className="relative mt-3 flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg font-bold text-white">
              {card.profile.displayName.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold leading-tight text-white">
                {card.profile.displayName}
              </p>
              <p className="truncate font-mono text-xs text-white/80">
                @{card.profile.handle}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5 p-6">
        {/* Score block */}
        {score ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-baseline gap-1.5">
              <span className="ts-grad-text text-5xl font-black tabular-nums">{score.score}</span>
              <span className="text-xs font-medium text-muted-foreground">/100</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("font-semibold", STATUS_CLASS[status] ?? STATUS_CLASS.NEW)}>
                  {status}
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  confidence {score.confidence}%
                </Badge>
                {card.assurance && (
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-emerald-700 dark:text-emerald-400">
                    L{card.assurance.level} assurance
                  </Badge>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden="true" />
                score computed {timeAgo(card.freshness.computedAt)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            The owner chose not to share their score through this link.
          </p>
        )}

        {/* Verified signals */}
        {card.signals && card.signals.length > 0 && (
          <section aria-label="Verified signals">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Verified signals
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {card.signals.map((s) => {
                const Icon = SIGNAL_ICON[s.type] ?? Fingerprint;
                return (
                  <li
                    key={s.type}
                    className="ts-rung-active flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span className="font-medium">
                      {SIGNAL_LABEL[s.type] ?? s.type}
                      {s.hint ? ` · ${s.hint.replace(/^(Government ID|Phone|Biometric) · /, "")}` : ""}
                    </span>
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Attributes (only when shared) */}
        {card.attributes && card.attributes.length > 0 && (
          <section aria-label="Shared attributes">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Government-verified attributes
            </h2>
            <dl className="mt-2 grid grid-cols-2 gap-2">
              {card.attributes.map((a) => (
                <div key={a.key} className="ts-inset rounded-lg px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {a.key.replace(/_/g, " ")}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold">{a.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Credentials count */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Active credentials
          </span>
          <span className="text-sm font-bold tabular-nums text-foreground">
            {card.credentialsCount}
          </span>
        </div>

        {/* Adverse-signals language (locked) */}
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {card.language.adverse}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {card.language.disclaimer}
            </p>
          </div>
        </div>

        {/* Receipt notice */}
        <p className="flex items-center gap-2 text-xs font-medium text-foreground/75">
          <ReceiptText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {card.viewerNotice}
        </p>

        {/* Provider honesty */}
        <p className="flex items-start gap-2 border-t border-border pt-3 text-[11px] leading-relaxed text-foreground/70">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          Verification signals are produced by contract-first provider adapters (MOCK until live
          partner credentials activate). Reporting this profile opens with the safety pipeline.
        </p>
      </div>
    </motion.article>
  );
}
