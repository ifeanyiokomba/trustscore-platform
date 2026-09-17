"use client";

// TrustScore Stage 13 — ProviderPostureCard: the provider transport console
// (ADMIN role, operational grant). Surfaces the LIVE-ready architecture:
//   - posture selector (MOCK default / sandbox LOOPBACK / LIVE honestly
//     disabled until partner credentials exist — the API refuses, the UI
//     says so),
//   - per-provider circuit-breaker state, latency p50/p95, error rate,
//     last error, reset,
//   - simulator health + fault injection (loopback only) so the transport's
//     failure paths can be exercised on demand,
//   - the credential vault (masked hints only — secrets are write-only).
//
// Honesty rules (non-negotiable): nothing live is ever claimed in this
// sandbox; every MOCK/LOOPBACK label is explicit; the LIVE option explains
// exactly what it lacks (credentials + base URLs) instead of pretending.

import * as React from "react";
import { motion } from "framer-motion";
import {
  Plug,
  Loader2,
  RotateCcw,
  Bug,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Radio,
  CheckCircle2,
  XCircle,
  Activity,
  Lock,
  Compass,
  ChevronDown,
  ListChecks,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  EngineAdminProviders,
  NinauthAlignmentReport,
  ProviderAdminEntry,
} from "@/lib/types";

const FAULT_MODES = [
  { mode: "none", label: "Healthy", hint: "Calls succeed normally" },
  { mode: "timeout", label: "Timeout", hint: "8s sleep — transport aborts at 4s, retries, then fails" },
  { mode: "error", label: "5xx errors", hint: "500 answers — retried then honest failure" },
  { mode: "auth", label: "Auth mismatch", hint: "401 — the provider's answer, never retried" },
  { mode: "slow", label: "Slow (900ms)", hint: "Watch p50/p95 climb" },
] as const;

function circuitChipClass(circuit: string): string {
  switch (circuit) {
    case "OPEN":
      return "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400";
    case "HALF_OPEN":
      return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    default:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
}

function CircuitDot({ circuit }: { circuit: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        circuit === "OPEN"
          ? "bg-red-500"
          : circuit === "HALF_OPEN"
            ? "bg-amber-500 animate-pulse"
            : "bg-emerald-500"
      )}
      aria-hidden="true"
    />
  );
}

function ms(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

function ProviderRow({
  entry,
  loopback,
  simFault,
  busy,
  onReset,
  onFault,
  onVaultSave,
  onVaultRevoke,
}: {
  entry: ProviderAdminEntry;
  loopback: boolean;
  simFault: string | null;
  busy: string | null;
  onReset: () => void;
  onFault: (mode: string) => void;
  onVaultSave: () => void;
  onVaultRevoke: () => void;
}) {
  const t = entry.transport;
  const cred = entry.credential;
  const currentFault = loopback ? simFault ?? "none" : "none";

  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-4 rounded-xl border border-border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto]"
      data-testid={`provider-row-${entry.key}`}
    >
      {/* Identity + transport state */}
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plug className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="min-w-0 truncate text-sm font-semibold">{entry.title}</p>
          <Badge variant="outline" className="shrink-0 border-primary/40 text-[10px] text-primary">
            {entry.providerName} · {entry.mode}
          </Badge>
        </div>
        <p className="text-xs leading-snug text-muted-foreground">{entry.role}</p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              circuitChipClass(t.circuit)
            )}
            data-testid={`circuit-${entry.key}`}
          >
            <CircuitDot circuit={t.circuit} />
            Circuit {t.circuit}
          </span>
          {t.consecutiveFailures > 0 && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {t.consecutiveFailures} consecutive failure{t.consecutiveFailures === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        {t.lastError && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="flex min-w-0 cursor-help items-center gap-1.5 truncate text-[11px] text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t.lastError}</span>
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">{t.lastError}</p>
                {t.lastErrorAt && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    at {new Date(t.lastErrorAt).toLocaleTimeString()}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Metrics + fault controls */}
      <div className="min-w-0 space-y-2.5">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4" data-testid={`metrics-${entry.key}`}>
          {[
            ["Calls", String(t.calls)],
            ["Errors", String(t.errors)],
            ["Error rate", `${t.errorRate}%`],
            ["p50 / p95", `${ms(t.p50)} / ${ms(t.p95)}`],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="truncate font-mono text-xs font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        {loopback && (
          <div className="space-y-1.5 pt-0.5">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Bug className="h-3 w-3" aria-hidden="true" /> Simulator fault (exercises the transport)
            </p>
            <div className="flex flex-wrap gap-2">
              {FAULT_MODES.map((f) => (
                <Button
                  key={f.mode}
                  type="button"
                  size="sm"
                  variant={currentFault === f.mode ? "default" : "outline"}
                  className={cn("h-8 gap-1 px-3 text-[11px] font-medium", currentFault === f.mode && f.mode !== "none" && "bg-red-600 hover:bg-red-600/90")}
                  aria-pressed={currentFault === f.mode}
                  title={f.hint}
                  disabled={busy !== null}
                  onClick={() => onFault(f.mode)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions + vault */}
      <div className="flex min-w-0 flex-col items-stretch justify-start gap-2 lg:w-44">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-full gap-1.5 border-foreground/20 text-xs font-medium"
          onClick={onReset}
          disabled={busy !== null || (t.calls === 0 && t.circuit === "CLOSED")}
        >
          {busy === `reset:${entry.key}` ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Reset circuit
        </Button>
        {cred ? (
          <div className="min-w-0 rounded-lg border border-border bg-background/70 p-2.5" data-testid={`vault-${entry.key}`}>
            <div className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <p className="truncate font-mono text-[11px] font-semibold">{cred.keyId}</p>
            </div>
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground" title={cred.hint}>
              {cred.hint}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1 h-6 w-full px-2 text-[11px] text-red-600 hover:text-red-700 dark:text-red-400"
              onClick={onVaultRevoke}
              disabled={busy !== null}
            >
              Revoke
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-full gap-1.5 border-foreground/20 text-xs font-medium"
            onClick={onVaultSave}
            disabled={busy !== null}
          >
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Vault credential
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Batch 1 — NINAuth LIVE alignment (G4/G5/G18): the operator-visible
// readiness checklist. Scope-mapping gaps, request-reason readiness, and the
// contract-matrix UNCONFIRMED/PARTIAL items — the honest path from MOCK to
// LIVE, nothing pretended.
// ---------------------------------------------------------------------------

function AlignmentStat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warn" | "good";
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "min-w-0 cursor-help rounded-lg border px-3 py-2",
              tone === "warn"
                ? "border-amber-500/40 bg-amber-500/5"
                : tone === "good"
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border bg-muted/20"
            )}
            tabIndex={0}
            role="note"
          >
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p
              className={cn(
                "truncate font-mono text-sm font-semibold",
                tone === "warn"
                  ? "text-amber-700 dark:text-amber-300"
                  : tone === "good"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-foreground"
              )}
            >
              {value}
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{hint}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function NinauthAlignmentSection({ report }: { report: NinauthAlignmentReport }) {
  const [open, setOpen] = React.useState(false);
  const sm = report.scopeMapping;
  const rr = report.requestReasons;
  const ci = report.contractItems;

  return (
    <div
      className="min-w-0 rounded-xl border border-border bg-muted/10"
      data-testid="ninauth-alignment"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-3 rounded-xl p-3.5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Compass className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">NINAuth LIVE alignment</span>
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">
              {ci.unconfirmed} unconfirmed · {ci.partial} partial
            </Badge>
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            Scope mapping, request-reason catalog, and the contract-matrix checklist the LIVE flip must clear —
            nothing here is guessed, every gap is labeled.
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-4 border-t border-border p-3.5"
        >
          {/* Readiness stats */}
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
            <AlignmentStat
              label="Live scopes"
              value={`${sm.liveScopeConfirmed}/${sm.totalCapabilities}`}
              hint={`Capability→scope mapping ${sm.configVersion}: ${sm.missingLiveScopes.length ? `unconfirmed: ${sm.missingLiveScopes.join(", ")}` : "complete"} — zero scope names are published officially; the LIVE gate refuses while any is null.`}
              tone={sm.liveScopeConfirmed === sm.totalCapabilities ? "good" : "warn"}
            />
            <AlignmentStat
              label="Request reasons"
              value={`${rr.enumerated}/${rr.officialCount}`}
              hint={`Documented catalog keys enumerated of the officially counted ${rr.officialCount} — ${rr.unconfirmed} remain UNCONFIRMED until the live endpoint is reachable (never guessed).`}
              tone={rr.unconfirmed === 0 ? "good" : "warn"}
            />
            <AlignmentStat
              label="Purposes mapped"
              value={`${rr.purposesMapped}/${rr.purposeOptions}`}
              hint={`Trust Decision purposes carrying a requestReason mapping (${rr.mappingsConfirmed} confirmed so far — all stubs until the partner sandbox validates them).`}
              tone={rr.allPurposesMapped ? "good" : "warn"}
            />
            <AlignmentStat
              label="Contract rows"
              value={`${ci.documented} doc`}
              hint={`Of the 33-row NINAuth contract matrix: ${ci.documented} DOCUMENTED (safe to build on), ${ci.partial} PARTIAL (missing URL/field/format), ${ci.unconfirmed} UNCONFIRMED (absent from all official sources).`}
            />
          </div>

          {/* The checklist */}
          <div className="min-w-0 space-y-1.5">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <ListChecks className="h-3 w-3" aria-hidden="true" />
              Sandbox-verification checklist ({report.items.length} items)
            </p>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1" data-testid="ninauth-alignment-items">
              {report.items.map((item) => (
                <li
                  key={item.id}
                  className="min-w-0 rounded-lg border border-border/70 bg-background/60 p-2.5"
                  data-testid={`alignment-item-${item.id}`}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-[9px] font-semibold uppercase tracking-wide",
                        item.status === "UNCONFIRMED"
                          ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      )}
                    >
                      {item.status}
                    </Badge>
                    <span className="truncate text-xs font-semibold">{item.area}</span>
                    <span className="truncate font-mono text-[10px] text-muted-foreground">{item.id}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-foreground/80">{item.missing}</p>
                  <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                    <span className="font-semibold text-foreground/60">Today:</span> {item.posture}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    <span className="font-semibold text-foreground/60">Resolve:</span> {item.resolution}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Checklist version {report.version} — sourced row-by-row from the NINAuth contract matrix
            (docs/research/NINAUTH_CONTRACT_MATRIX.md, fetched from official sources 2026-09-17). The LIVE posture
            gate enforces the scope-mapping half at flip time; the rest is the sandbox-verification agenda for when
            partner credentials exist.
          </p>
        </motion.div>
      )}
    </div>
  );
}

export function ProviderPostureCard({
  data,
  onChanged,
}: {
  data: EngineAdminProviders;
  onChanged: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [vaultFor, setVaultFor] = React.useState<ProviderAdminEntry | null>(null);
  const [keyId, setKeyId] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [note, setNote] = React.useState("");
  const [postureBusy, setPostureBusy] = React.useState<string | null>(null);

  async function api(
    name: string,
    path: string,
    method: string,
    body?: object
  ): Promise<{ ok: boolean; message: string }> {
    setBusy(name);
    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = (await res.json().catch(() => ({}))) as {
        note?: string;
        error?: { message?: string };
      };
      const ok = res.ok;
      toast({
        title: ok ? "Done" : "Rejected",
        description: ok ? (d.note ?? "OK") : (d.error?.message ?? "Request failed"),
        variant: ok ? "default" : "destructive",
      });
      if (ok) await onChanged();
      return { ok, message: d.note ?? d.error?.message ?? "" };
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
      return { ok: false, message: "network" };
    } finally {
      setBusy(null);
    }
  }

  async function setPosture(posture: "mock" | "loopback") {
    setPostureBusy(posture);
    try {
      const res = await fetch("/api/v1/engine/admin/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posture }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        note?: string;
        error?: { message?: string };
      };
      toast({
        title: res.ok ? "Posture switched" : "Rejected",
        description: d.note ?? d.error?.message ?? "",
        variant: res.ok ? "default" : "destructive",
      });
      if (res.ok) await onChanged();
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setPostureBusy(null);
    }
  }

  const sim = data.simulator;
  const loopback = data.posture === "loopback";

  const postureOptions = [
    {
      value: "mock" as const,
      title: "MOCK transports",
      detail: "In-process contract mocks — the default. No wire traffic.",
      icon: CheckCircle2,
      active: data.posture === "mock",
      selectable: true,
    },
    {
      value: "loopback" as const,
      title: "Sandbox loopback",
      detail: "The REAL transport path (signing, timeouts, retries, breakers) against the local simulator on :3032.",
      icon: Radio,
      active: loopback,
      selectable: sim.reachable,
    },
    {
      value: "live" as const,
      title: "LIVE partners",
      detail: data.liveAvailable
        ? "Partner endpoints + vault credentials."
        : "Needs partner credentials + base URLs — the API refuses the flip. Nothing live is claimed here.",
      icon: Lock,
      active: data.posture === "live",
      selectable: false, // honestly disabled in the sandbox UI
    },
  ];

  return (
    <Card className="ts-card-hover min-w-0" data-testid="provider-console">
      <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Plug className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Provider transports</CardTitle>
          <CardDescription className="truncate">
            Live-ready architecture — posture, circuit breakers, latency and the
            write-only credential vault (ADMIN grant, Stage 13)
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 text-[10px]",
              data.posture === "mock"
                ? "border-muted-foreground/30 text-muted-foreground"
                : "border-primary/40 text-primary"
            )}
            data-testid="posture-badge"
          >
            <Activity className="h-3 w-3" aria-hidden="true" />
            {data.posture.toUpperCase()} posture
          </Badge>
          {data.vaultDefaultKey && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1.5 border-amber-500/50 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    dev vault key
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="max-w-xs text-xs">
                    VAULT_MASTER_KEY is not set — credentials are encrypted under the
                    sandbox dev key. Production must set the env var before any real
                    credential is stored.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Posture selector */}
        <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3" data-testid="posture-selector">
          {postureOptions.map((opt) => (
            <motion.button
              key={opt.value}
              type="button"
              whileTap={opt.selectable ? { scale: 0.98 } : undefined}
              disabled={!opt.selectable || postureBusy !== null || opt.active}
              onClick={() => opt.selectable && opt.value !== "live" && setPosture(opt.value)}
              className={cn(
                "min-w-0 rounded-xl border p-4 text-left transition-colors",
                opt.active
                  ? "border-primary/50 bg-primary/10"
                  : opt.selectable
                    ? "border-border bg-muted/20 hover:border-primary/30 hover:bg-primary/5"
                    : "cursor-not-allowed border-border/60 bg-muted/10 opacity-75"
              )}
              aria-pressed={opt.active}
              data-testid={`posture-${opt.value}`}
            >
              <span className="flex items-center gap-2">
                <opt.icon
                  className={cn("h-4 w-4 shrink-0", opt.active ? "text-primary" : "text-muted-foreground")}
                  aria-hidden="true"
                />
                <span className="min-w-0 truncate text-sm font-semibold">{opt.title}</span>
                {postureBusy === opt.value && (
                  <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden="true" />
                )}
                {opt.active && !postureBusy && (
                  <Badge className="ml-auto shrink-0 bg-primary text-[9px] text-primary-foreground">ACTIVE</Badge>
                )}
                {!opt.selectable && !opt.active && (
                  <Badge variant="outline" className="ml-auto shrink-0 border-foreground/25 bg-muted text-[9px] font-semibold text-foreground/60">
                    NOT AVAILABLE
                  </Badge>
                )}
              </span>
              <span
                className={cn(
                  "mt-1.5 block text-[11px] leading-snug",
                  opt.selectable ? "text-muted-foreground" : "text-foreground/60"
                )}
              >
                {opt.detail}
              </span>
            </motion.button>
          ))}
        </div>
        <p
          className="rounded-lg bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground dark:text-foreground/60"
          data-testid="posture-note"
        >
          {data.postureNote}
        </p>

        {/* Simulator health strip */}
        <div
          className={cn(
            "flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border p-3.5",
            sim.reachable ? "border-border bg-muted/20" : "border-red-500/40 bg-red-500/5"
          )}
          data-testid="simulator-health"
        >
          <span className="flex min-w-0 items-center gap-2 text-xs font-semibold">
            {sim.reachable ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
            )}
            Simulator :{sim.port}
            <span className="font-normal text-muted-foreground">
              {sim.reachable
                ? `up ${Math.floor((sim.uptimeSec ?? 0) / 60)}m · fault ${sim.fault ?? "none"}`
                : sim.detail ?? "unreachable — start it with mini-services/provider-simulator/start.sh"}
            </span>
          </span>
          <span className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            {data.constants.requestTimeoutMs}ms timeout · {data.constants.retries} retries (
            {data.constants.backoffMs.join("/")}ms) · breaker {data.constants.circuitThreshold} fails →{" "}
            {data.constants.circuitOpenMs / 1000}s open
          </span>
        </div>

        {/* NINAuth LIVE alignment (Batch 1) */}
        {data.ninauthAlignment && <NinauthAlignmentSection report={data.ninauthAlignment} />}

        {/* Provider rows */}
        <div className="grid min-w-0 grid-cols-1 gap-3">
          {data.providers.map((entry) => (
            <ProviderRow
              key={entry.key}
              entry={entry}
              loopback={loopback}
              simFault={sim.fault}
              busy={busy}
              onReset={() => void api(`reset:${entry.key}`, `/api/v1/engine/admin/providers/${entry.key}/reset`, "POST")}
              onFault={(mode) =>
                void api(`fault:${entry.key}`, `/api/v1/engine/admin/providers/${entry.key}/fault`, "POST", { mode })
              }
              onVaultSave={() => {
                setVaultFor(entry);
                setKeyId("");
                setSecret("");
                setNote("");
              }}
              onVaultRevoke={() =>
                void api(`revoke:${entry.key}`, `/api/v1/engine/admin/providers/${entry.key}/credential`, "DELETE")
              }
            />
          ))}
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Circuit metrics are in-memory per provider (single-instance posture) and reset with the button above.
          The vault stores credentials AES-256-GCM encrypted under the platform master key — secrets are
          write-only: saved once, never returned again, surfaced as masked hints.
        </p>
      </CardContent>

      {/* Credential save dialog */}
      <Dialog open={vaultFor !== null} onOpenChange={(o) => !o && setVaultFor(null)}>
        <DialogContent className="sm:max-w-md" data-testid="vault-dialog">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <KeyRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base">Store {vaultFor?.title} credential</DialogTitle>
                <DialogDescription className="mt-0.5">
                  For the LIVE posture — the loopback simulator never reads it.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="vault-key-id">Key ID</Label>
              <Input
                id="vault-key-id"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder="partner-issued key identifier"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vault-secret">Secret</Label>
              <Input
                id="vault-secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="client secret / signing key"
                autoComplete="new-password"
              />
              <p className="text-[11px] leading-snug text-muted-foreground">
                Encrypted with AES-256-GCM before it touches the database. It is{" "}
                <span className="font-medium text-foreground">never shown again</span> — later reads surface only
                the masked hint.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vault-note">Provenance note (optional)</Label>
              <Input
                id="vault-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="who issued it, when, ticket link…"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVaultFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!vaultFor) return;
                const res = await api(
                  `vault:${vaultFor.key}`,
                  `/api/v1/engine/admin/providers/${vaultFor.key}/credential`,
                  "PUT",
                  { keyId, secret, note: note || undefined }
                );
                if (res.ok) setVaultFor(null);
              }}
              disabled={busy !== null || keyId.trim().length < 3 || secret.length < 12}
            >
              {busy?.startsWith("vault:") ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Encrypt &amp; store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
