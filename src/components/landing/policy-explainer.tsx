"use client";

// TrustScore Stage 12 — PolicyExplainer (PUBLIC landing section, id="scoring").
// Renders the ACTIVE scoring policy in plain language, straight from the
// public transparency endpoint (/api/v1/engine/public — no session needed).
// Every number on screen is the live policy value: no hardcoded budgets.
// Honesty rules:
//   • the policy changes only through a new versioned policy covered by a
//     completed DPIA — that governance line is shown verbatim;
//   • automated significant decisions stay gated (shown with its note);
//   • if the policy can't be loaded we say so — never silent placeholders.

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Fingerprint,
  BadgeCheck,
  Users,
  History,
  AlertTriangle,
  ShieldQuestion,
  ShieldCheck,
  Landmark,
  Loader2,
  RotateCcw,
  Info,
  MessageSquareText,
  Braces,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PolicyRules {
  assuranceBase: number[];
  freshnessFullDays: number;
  freshnessMinFactor: number;
  credentialPoints: number;
  credentialMax: number;
  interactionPoints: number;
  interactionWindowDays: number;
  interactionMax: number;
  clearedPoints: number;
  clearedMax: number;
  riskPenaltyPer: number;
  riskMaxPenalty: number;
  riskHighAt: number;
  snapshotTtlHours: number;
  establishedMinLevel: number;
}

interface PublicEngineView {
  activePolicy: {
    version: number;
    activatedAt: string | null;
    changeSummary: string;
    rules: PolicyRules;
  } | null;
  policyHistory: {
    version: number;
    status: string;
    changeSummary: string;
    activatedAt: string | null;
  }[];
  dpia: {
    status: string;
    completedAt: string | null;
    residualRisk: string | null;
    summary: string | null;
  };
  automatedSignificantDecisions: boolean;
  gateNote: string;
  language: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

// ---------------------------------------------------------------------------
// Data hook — public endpoint, refreshable, honest error state.
// ---------------------------------------------------------------------------

function usePublicPolicy() {
  const [data, setData] = React.useState<PublicEngineView | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");

  const load = React.useCallback(() => {
    setState("loading");
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/engine/public", { cache: "no-store" });
        if (!cancelled && res.ok) {
          setData((await res.json()) as PublicEngineView);
          setState("ready");
        } else if (!cancelled) {
          setState("error");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => load(), [load]);
  return { data, state, reload: load };
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function PolicySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the live scoring policy">
      <div className="grid gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border/70 p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-1.5 w-full animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Loading the live policy from the transparency endpoint…
      </div>
    </div>
  );
}

function BudgetBar({
  max,
  negative = false,
  delay = 0,
}: {
  max: number;
  negative?: boolean;
  delay?: number;
}) {
  const pct = Math.max(4, Math.min(100, max));
  return (
    <div
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full",
        negative ? "bg-destructive/10" : "bg-muted"
      )}
      role="presentation"
    >
      <motion.div
        className={cn("absolute inset-y-0 left-0 rounded-full", negative ? "bg-destructive/70" : "bg-primary/80")}
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.7, delay, ease: "easeOut" }}
      />
    </div>
  );
}

const LADDER_LABELS = ["L0", "L1", "L2", "L3", "L4"];

// ---------------------------------------------------------------------------
// Stage 16 — the technical view: the exact ruleset object the engine loads,
// serialized from the ACTIVE policy record, unmodified. Plain language is
// the default; this is for the engineers, auditors and the curious.
// ---------------------------------------------------------------------------

function TechnicalSheet({ data }: { data: PublicEngineView }) {
  const rules = data.activePolicy?.rules;
  if (!rules) return null;
  const gov: { k: string; v: string }[] = [
    {
      k: "policyVersion",
      v: data.activePolicy ? `v${data.activePolicy.version} · ACTIVE` : "—",
    },
    {
      k: "activatedAt",
      v: data.activePolicy?.activatedAt
        ? new Date(data.activePolicy.activatedAt).toISOString()
        : "—",
    },
    { k: "changeSummary", v: data.activePolicy?.changeSummary ?? "—" },
    { k: "dpia.status", v: data.dpia.status ?? "—" },
    {
      k: "dpia.completedAt",
      v: data.dpia.completedAt ? new Date(data.dpia.completedAt).toISOString() : "—",
    },
    { k: "dpia.residualRisk", v: data.dpia.residualRisk ?? "—" },
    {
      k: "automatedSignificantDecisions",
      v: data.automatedSignificantDecisions ? "true" : "false (gated)",
    },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
      data-testid="policy-technical-sheet"
    >
      <Card>
        <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0 p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Braces className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="font-mono text-sm">scoringPolicy.rules</CardTitle>
            <CardDescription className="font-mono text-[11px]">
              serialized from the ACTIVE policy record — the exact object the engine loads
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 bg-primary/10 font-mono font-bold text-primary">
            v{data.activePolicy?.version}
          </Badge>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <dl className="grid gap-x-10 font-mono text-xs sm:grid-cols-2">
            {Object.entries(rules).map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/70 py-2"
              >
                <dt className="min-w-0 truncate text-muted-foreground" title={k}>
                  {k}
                </dt>
                <dd className="shrink-0 font-bold tabular-nums text-foreground">
                  {Array.isArray(v) ? `[${v.join(", ")}]` : String(v)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 grid gap-x-10 gap-y-1 font-mono text-[11px] sm:grid-cols-2">
            {gov.map((g) => (
              <div key={g.k} className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/50 py-1.5">
                <dt className="min-w-0 truncate text-muted-foreground/80" title={g.k}>
                  {g.k}
                </dt>
                <dd className="min-w-0 truncate font-semibold text-foreground/85" title={g.v}>
                  {g.v}
                </dd>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-sans text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Every value above is read live from the transparency endpoint — nothing here is a
              cached or hardcoded copy. Policy values only change through a new versioned policy
              covered by a completed DPIA; the engine refuses to score without one.
            </span>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function PolicyExplainer() {
  const { data, state, reload } = usePublicPolicy();
  const rules = data?.activePolicy?.rules;
  // Stage 16 — plain language by default; the technical sheet is one tap
  // away for engineers and auditors. No persistence: every visit starts
  // plain, which is also what SSR renders.
  const [view, setView] = React.useState<"plain" | "technical">("plain");

  return (
    <section id="scoring" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="scoring-heading">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          The scoring policy is public
        </p>
        <h2 id="scoring-heading" className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          No mystery numbers — the exact rules, published
        </h2>
        <p className="mt-4 text-muted-foreground">
          TrustScore is five components added and subtracted under versioned budgets. This is the
          live policy every score on the platform is computed with right now — the same view your
          Trust Passport explains against.
        </p>
      </div>

      {/* Stage 16 — the view toggle: plain language ⇄ technical sheet */}
      <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="mt-8 flex justify-center">
        <div
          role="group"
          aria-label="Policy explainer view"
          className="ts-inset inline-flex items-center gap-1 rounded-full p-1"
          data-testid="policy-view-toggle"
        >
          <button
            type="button"
            onClick={() => setView("plain")}
            aria-pressed={view === "plain"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              view === "plain"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
            Plain language
          </button>
          <button
            type="button"
            onClick={() => setView("technical")}
            aria-pressed={view === "technical"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              view === "technical"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Braces className="h-3.5 w-3.5" aria-hidden="true" />
            Technical
          </button>
        </div>
      </motion.div>

      {/* Version + governance strip */}
      <motion.div {...fadeUp} transition={{ duration: 0.45 }} className="mt-10">
        <div className="ts-inset flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-primary/40 bg-primary/10 px-2 font-bold text-primary">
              <Landmark className="h-3 w-3" aria-hidden="true" />
              {data?.activePolicy ? `Policy v${data.activePolicy.version} · ACTIVE` : "Policy"}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "px-2 font-semibold",
                data?.dpia.status === "COMPLETED"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              )}
            >
              DPIA {data?.dpia.status ?? "…"}
              {data?.dpia.residualRisk ? ` · residual ${data.dpia.residualRisk}` : ""}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "px-2 font-semibold",
                data && !data.automatedSignificantDecisions
                  ? "border-border bg-muted/60 text-muted-foreground dark:text-foreground/70"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              )}
            >
              automated decisions {data ? (data.automatedSignificantDecisions ? "enabled" : "gated OFF") : "…"}
            </Badge>
          </div>
          <p className="max-w-md text-[11px] font-medium leading-snug text-foreground/75">
            {data?.dpia.status === "COMPLETED" && data.dpia.completedAt
              ? `DPIA completed ${new Date(data.dpia.completedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} · policy activated ${
                  data.activePolicy?.activatedAt
                    ? new Date(data.activePolicy.activatedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
                    : "—"
                }`
              : data?.gateNote ?? "Governance state loads with the policy."}
          </p>
        </div>
      </motion.div>

      {/* The five components, budgets and rules — live values (plain) or the
          exact serialized ruleset (technical). AnimatePresence keeps the swap
          soft; reduced-motion users get an instant switch via MotionConfig. */}
      <div className="mt-6">
        {state === "loading" && <PolicySkeleton />}
        {state === "error" && (
          <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <p className="text-sm font-semibold">The live policy could not be loaded.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The transparency endpoint answered with an error — nothing here is ever a cached
              guess.
            </p>
            <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={reload}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          </div>
        )}
        {state === "ready" && rules && (
          <AnimatePresence mode="wait" initial={false}>
            {view === "technical" && data ? (
              <TechnicalSheet key="technical" data={data} />
            ) : (
              <motion.div
                key="plain"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              {/* Identity Assurance */}
            <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.03 }}>
              <Card className="h-full">
                <CardHeader className="space-y-2.5 p-5">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle className="text-sm">Identity Assurance</CardTitle>
                  </div>
                  <BudgetBar max={rules.assuranceBase[4]} />
                  <p className="text-xs font-bold tabular-nums text-muted-foreground">
                    max +{rules.assuranceBase[4]}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 p-5 pt-0">
                  <div className="flex items-center gap-1">
                    {LADDER_LABELS.map((l, i) => (
                      <span
                        key={l}
                        className={cn(
                          "flex-1 rounded py-1 text-center text-[10px] font-bold tabular-nums",
                          rules.assuranceBase[i] > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {l}·{rules.assuranceBase[i]}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs font-medium leading-snug text-foreground/75">
                    Your NINAuth verification level sets the base. Freshness scales it down to ×
                    {rules.freshnessMinFactor} as the government record approaches{" "}
                    {rules.freshnessFullDays === 1 ? "expiry" : `${rules.freshnessFullDays} days from expiry`}.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Verified Credentials */}
            <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.09 }}>
              <Card className="h-full">
                <CardHeader className="space-y-2.5 p-5">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle className="text-sm">Verified Credentials</CardTitle>
                  </div>
                  <BudgetBar max={rules.credentialMax} delay={0.05} />
                  <p className="text-xs font-bold tabular-nums text-muted-foreground">
                    max +{rules.credentialMax}
                  </p>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-xs font-medium leading-snug text-foreground/75">
                    +{rules.credentialPoints} per fresh ACTIVE credential (verified phone, verified
                    government identity, biometric liveness). Credentials never outlive their
                    source evidence — lapsing drops them out.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Verified Reputation */}
            <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.15 }}>
              <Card className="h-full">
                <CardHeader className="space-y-2.5 p-5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle className="text-sm">Verified Reputation</CardTitle>
                  </div>
                  <BudgetBar max={rules.interactionMax * rules.interactionPoints} delay={0.1} />
                  <p className="text-xs font-bold tabular-nums text-muted-foreground">
                    max +{rules.interactionMax * rules.interactionPoints}
                  </p>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-xs font-medium leading-snug text-foreground/75">
                    +{rules.interactionPoints} per distinct consented verifier (L2+) in a{" "}
                    {rules.interactionWindowDays}-day window, up to {rules.interactionMax}. Trust
                    Network attestations count as verifiers too — reputation is earned
                    continuously, never banked once.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Resolution History */}
            <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.21 }}>
              <Card className="h-full">
                <CardHeader className="space-y-2.5 p-5">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle className="text-sm">Resolution History</CardTitle>
                  </div>
                  <BudgetBar max={rules.clearedMax * rules.clearedPoints} delay={0.15} />
                  <p className="text-xs font-bold tabular-nums text-muted-foreground">
                    max +{rules.clearedMax * rules.clearedPoints}
                  </p>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-xs font-medium leading-snug text-foreground/75">
                    +{rules.clearedPoints} per flag a human reviewer cleared (unfounded, dismissed
                    or overturned on appeal) — up to {rules.clearedMax}. Getting wrongly flagged and
                    cleared leaves you slightly BETTER off, not worse.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Confirmed Risk */}
            <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.27 }}>
              <Card className="h-full">
                <CardHeader className="space-y-2.5 p-5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                    <CardTitle className="text-sm">Confirmed Risk</CardTitle>
                  </div>
                  <BudgetBar max={rules.riskMaxPenalty} negative delay={0.2} />
                  <p className="text-xs font-bold tabular-nums text-muted-foreground">
                    max −{rules.riskMaxPenalty}
                  </p>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-xs font-medium leading-snug text-foreground/75">
                    −{rules.riskPenaltyPer} per human-confirmed flag, capped at −
                    {rules.riskMaxPenalty}. At {rules.riskHighAt}+ confirmed flags the passport
                    shows HIGH_RISK. Every confirmed flag carries a reason and an appeal path —
                    never an unexplained penalty.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Thresholds + governance detail — plain view only (the technical
          sheet carries its own governance block) */}
      {state === "ready" && rules && view === "plain" && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.05 }}>
            <Card className="h-full">
              <CardHeader className="flex-row items-center gap-3 space-y-0 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Scale className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <CardTitle className="text-sm">Status thresholds</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-2 text-xs font-medium leading-snug text-foreground/75">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                    ESTABLISHED requires identity level L{rules.establishedMinLevel}+ — a verified
                    government identity, not just account age.
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                    Snapshots stay fresh for {rules.snapshotTtlHours}h; the last 50 are retained so
                    every historical score stays explainable — page back through them in Score
                    Insights.
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                    Scores are 0–100. The number is a summary of recorded evidence — the platform
                    never says “this person is safe”.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.11 }}>
            <Card className="h-full">
              <CardHeader className="flex-row items-center gap-3 space-y-0 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldQuestion className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <CardTitle className="text-sm">How the policy changes</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs font-medium leading-snug text-foreground/75">{data?.language}</p>
                <ul className="mt-3 space-y-2">
                  {(data?.policyHistory ?? []).slice(0, 4).map((p) => (
                    <li key={p.version} className="flex items-center gap-2 text-[11px]">
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-1.5 text-[9px] font-bold",
                          p.status === "ACTIVE"
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : p.status === "RETIRED"
                              ? "border-border bg-muted/60 text-muted-foreground"
                              : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        )}
                      >
                        v{p.version} · {p.status.toLowerCase()}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground" title={p.changeSummary}>
                        {p.changeSummary}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.17 }}>
            <Card className="h-full">
              <CardHeader className="flex-row items-center gap-3 space-y-0 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Info className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <CardTitle className="text-sm">Your rights around scores</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-2 text-xs font-medium leading-snug text-foreground/75">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                    Material drops notify you the moment they happen — with the exact from → to
                    numbers and where the explanation lives.
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                    “Why did my score change?” — component deltas and the audited events in every
                    window, exportable as CSV/JSON.
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                    Confirmed flags are appealable; a pending appeal FREEZES the score (it cannot
                    move, up or down, until the human decision lands).
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </section>
  );
}
