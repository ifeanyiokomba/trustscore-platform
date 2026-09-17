"use client";

// TrustScore Stage 8 — AdminConsoleCard: engine administration (ADMIN role,
// operational grant — like the Stage 7 reviewer grant, granted via
// `bun run admin:make <email>`, never self-service).
// Surfaces: snapshot-state distribution, policy version list, draft editor
// (rules clamped + validated server-side; live budget preview + warnings),
// DPIA checklist recorder, activation (hard-gated on a completed DPIA) and
// the automated-decision gate (typed confirmation + DPIA-gated enabling).

import * as React from "react";
import { motion } from "framer-motion";
import {
  Settings2,
  GitBranch,
  FileCheck2,
  ShieldCheck,
  Loader2,
  Plus,
  Zap,
  Info,
  FlaskConical,
  ChevronDown,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { EngineAdminOverview, PolicyInfo, PolicyRulesInfo, PolicySimulation } from "@/lib/types";
import { cn } from "@/lib/utils";

// Number-input rule fields surfaced in the draft editor (with clamp ranges
// mirroring the server-side validateRules contract).
const RULE_FIELDS: {
  key: keyof PolicyRulesInfo;
  label: string;
  min: number;
  max: number;
  step: number;
  hint: string;
}[] = [
  { key: "credentialPoints", label: "Credential points", min: 0, max: 20, step: 1, hint: "per fresh ACTIVE credential" },
  { key: "credentialMax", label: "Credential cap", min: 0, max: 40, step: 1, hint: "component ceiling" },
  { key: "interactionPoints", label: "Interaction points", min: 0, max: 10, step: 1, hint: "per distinct L2+ verifier" },
  { key: "interactionMax", label: "Interaction cap", min: 1, max: 20, step: 1, hint: "distinct verifiers counted" },
  { key: "clearedPoints", label: "Cleared-flag points", min: 0, max: 10, step: 1, hint: "per human-reviewed cleared flag" },
  { key: "clearedMax", label: "Cleared-flag cap", min: 1, max: 20, step: 1, hint: "flags counted" },
  { key: "riskPenaltyPer", label: "Risk penalty", min: 0, max: 50, step: 1, hint: "per confirmed flag" },
  { key: "riskMaxPenalty", label: "Risk cap", min: 0, max: 100, step: 1, hint: "total penalty ceiling" },
  { key: "snapshotTtlHours", label: "Snapshot TTL (h)", min: 1, max: 168, step: 1, hint: "freshness horizon" },
];

const CHECKLIST_LABELS: Record<string, string> = {
  scope: "Profiling scope mapped (data categories, sources, subjects)",
  special: "No special-category data without legal basis",
  necessity: "Proportionality & necessity of each input reviewed",
  rights: "NDPA rights paths verified (explanation, review, appeal, DSR)",
  bias: "Bias / disparate-impact review of weights",
  security: "Security measures for score data reviewed",
  human: "Human-in-the-loop for adverse outcomes",
  retention: "Retention & deletion aligned with DSR cascade",
};
const CHECKLIST_IDS = Object.keys(CHECKLIST_LABELS);

function policyDraftTemplate(active: PolicyRulesInfo | undefined): Partial<PolicyRulesInfo> {
  if (!active) return {};
  return {
    credentialPoints: active.credentialPoints,
    credentialMax: active.credentialMax,
    interactionPoints: active.interactionPoints,
    interactionMax: active.interactionMax,
    clearedPoints: active.clearedPoints,
    clearedMax: active.clearedMax,
    riskPenaltyPer: active.riskPenaltyPer,
    riskMaxPenalty: active.riskMaxPenalty,
    snapshotTtlHours: active.snapshotTtlHours,
  };
}

// ---------------------------------------------------------------------------
// Draft-vs-active rule diff (pure client-side comparison — governance affordance
// that needs no API call: the overview already carries both rule sets).
// ---------------------------------------------------------------------------

function PolicyDiff({ draft, active }: { draft: PolicyInfo; active?: PolicyInfo }) {
  if (!active) return null;
  const rows = RULE_FIELDS.map((f) => ({
    label: f.label,
    hint: f.hint,
    before: Number(active.rules[f.key]),
    after: Number(draft.rules[f.key]),
  })).filter((r) => r.before !== r.after);

  return (
    <Collapsible className="rounded-lg border border-dashed border-border">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-3 py-2 text-left">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold">
          <ArrowLeftRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Diff vs active v{active.version}
          <span className="font-normal text-muted-foreground">
            {rows.length > 0 ? `${rows.length} rule${rows.length > 1 ? "s" : ""} changed` : "no editable rule changed"}
          </span>
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {rows.length === 0 ? (
          <p className="px-3 pb-3 text-[11px] leading-relaxed text-muted-foreground">
            The editable rules match the active policy — only the change
            summary differs. A simulation would show zero movement.
          </p>
        ) : (
          <ul className="space-y-1 px-3 pb-3" data-testid="policy-diff">
            {rows.map((r) => {
              const delta = r.after - r.before;
              return (
                <li
                  key={r.label}
                  className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {r.label}
                    <span className="ml-1.5 font-normal text-muted-foreground">({r.hint})</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground line-through decoration-muted-foreground/50">
                    {r.before}
                  </span>
                  <span className="shrink-0 text-muted-foreground" aria-hidden="true">
                    →
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{r.after}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1 py-0.5 text-[10px] font-bold tabular-nums",
                      delta > 0
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AdminConsoleCard({
  overview,
  onChanged,
}: {
  overview: EngineAdminOverview;
  onChanged: () => Promise<void>;
}) {
  const { toast } = useToast();
  const active = overview.policies.find((p) => p.status === "ACTIVE");
  const [draftOpen, setDraftOpen] = React.useState(false);
  const [dpiaOpen, setDpiaOpen] = React.useState(false);
  const [gateConfirm, setGateConfirm] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  // Draft form state
  const [rules, setRules] = React.useState<Partial<PolicyRulesInfo>>(() =>
    policyDraftTemplate(active?.rules)
  );
  const [summary, setSummary] = React.useState("");

  // DPIA form state
  const [dpiaPolicyId, setDpiaPolicyId] = React.useState<string>("");
  const [dpiaSummary, setDpiaSummary] = React.useState("");
  const [dpiaResidual, setDpiaResidual] = React.useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [checks, setChecks] = React.useState<Record<string, boolean>>({});

  // Simulation state (read-only impact dry-run)
  const [simOpen, setSimOpen] = React.useState(false);
  const [simBusy, setSimBusy] = React.useState(false);
  const [simResult, setSimResult] = React.useState<PolicySimulation | null>(null);
  const [simError, setSimError] = React.useState<string | null>(null);

  async function runSimulation(policy: PolicyInfo) {
    setSimOpen(true);
    setSimBusy(true);
    setSimResult(null);
    setSimError(null);
    try {
      const res = await fetch(`/api/v1/engine/admin/policies/${policy.id}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await res.json().catch(() => ({}))) as {
        simulation?: PolicySimulation;
        error?: { message?: string };
      };
      if (res.ok && data.simulation) setSimResult(data.simulation);
      else setSimError(data.error?.message ?? "Simulation failed.");
    } catch {
      setSimError("Network error.");
    } finally {
      setSimBusy(false);
    }
  }

  const drafts = overview.policies.filter((p) => p.status === "DRAFT");
  const draftForDpia = dpiaPolicyId
    ? overview.policies.find((p) => p.id === dpiaPolicyId)
    : drafts[0];

  const budgetTotal =
    (active?.rules.assuranceBase[4] ?? 60) +
    (Number(rules.credentialMax) || 0) +
    (Number(rules.interactionMax) || 0) * (Number(rules.interactionPoints) || 0) +
    (Number(rules.clearedMax) || 0) * (Number(rules.clearedPoints) || 0);

  async function api(
    name: string,
    path: string,
    body: object,
    method = "POST"
  ): Promise<{ ok: boolean; message: string }> {
    setBusy(name);
    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        note?: string;
        error?: { message?: string };
      };
      const ok = res.ok;
      toast({
        title: ok ? "Done" : "Rejected",
        description: ok ? (data.note ?? "OK") : (data.error?.message ?? "Request failed"),
        variant: ok ? "default" : "destructive",
      });
      if (ok) await onChanged();
      return { ok, message: data.note ?? data.error?.message ?? "" };
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
      return { ok: false, message: "network" };
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="ts-card-hover min-w-0" data-testid="engine-admin">
      <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Settings2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Engine administration</CardTitle>
          <CardDescription className="truncate">
            Policy versions, DPIA records and the automated-decision gate —
            operational grant (ADMIN), never self-service
          </CardDescription>
        </div>
        <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-1.5"
              onClick={() => {
                setRules(policyDraftTemplate(active?.rules));
                setSummary("");
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New policy draft
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Draft a new scoring policy</DialogTitle>
              <DialogDescription>
                Rules are validated and clamped server-side; the draft activates
                only after a completed DPIA record. Published change summaries
                must be honest and specific.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {RULE_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={`rule-${f.key}`} className="text-xs">
                      {f.label}{" "}
                      <span className="font-normal text-muted-foreground">({f.hint})</span>
                    </Label>
                    <Input
                      id={`rule-${f.key}`}
                      type="number"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={(rules[f.key] as number) ?? ""}
                      onChange={(e) =>
                        setRules((r) => ({ ...r, [f.key]: Number(e.target.value) }))
                      }
                      className="tabular-nums"
                    />
                  </div>
                ))}
              </div>
              <div className="ts-inset rounded-lg px-3.5 py-3">
                <p className="text-xs font-semibold">
                  Projected budget:{" "}
                  <span
                    className={cn(
                      "tabular-nums",
                      budgetTotal > 100 ? "text-destructive" : "text-primary"
                    )}
                  >
                    {budgetTotal}/100
                  </span>{" "}
                  (identity {active?.rules.assuranceBase[4] ?? 60} + credentials{" "}
                  {Number(rules.credentialMax) || 0} + reputation{" "}
                  {(Number(rules.interactionMax) || 0) * (Number(rules.interactionPoints) || 0)} +
                  resolution{" "}
                  {(Number(rules.clearedMax) || 0) * (Number(rules.clearedPoints) || 0)})
                </p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {budgetTotal > 100
                    ? "Over 100 — the engine clamps final scores to 0–100, but the server will warn and you should re-balance."
                    : "The engine clamps every rule at write time; snapshots name the policy that produced them."}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="policy-summary" className="text-xs">
                  Change summary (published — min 30 chars)
                </Label>
                <Textarea
                  id="policy-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  placeholder="What changed, why, and what members will see differently…"
                  aria-describedby="policy-summary-hint"
                />
                <p id="policy-summary-hint" className="text-[10px] text-muted-foreground">
                  {summary.trim().length}/30 characters minimum
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={busy !== null || summary.trim().length < 30}
                onClick={async () => {
                  const r = await api("draft", "/api/v1/engine/admin/policies", {
                    rules,
                    changeSummary: summary,
                  });
                  if (r.ok) setDraftOpen(false);
                }}
              >
                {busy === "draft" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Create draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Snapshot state distribution */}
        <div className="ts-inset rounded-lg px-3.5 py-3.5">
          <p className="flex items-center gap-2 text-xs font-semibold">
            <GitBranch className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Snapshot lifecycle distribution
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {(["ACTIVE", "STALE", "FROZEN", "RETIRED"] as const).map((s) => (
              <span
                key={s}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-semibold tabular-nums",
                  s === "FROZEN"
                    ? "border-teal-600/40 bg-teal-600/10 text-teal-700 dark:text-teal-300"
                    : "border-border bg-muted/40 text-muted-foreground"
                )}
              >
                {s} · {overview.snapshots.byState[s] ?? 0}
              </span>
            ))}
            <span className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
              total · {overview.snapshots.total}
            </span>
          </div>
        </div>

        {/* Policy versions */}
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold">
            <GitBranch className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Policy versions
          </p>
          <ul className="mt-2.5 space-y-2.5">
            {overview.policies.map((p) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-lg border px-3.5 py-3",
                  p.status === "ACTIVE" ? "border-primary/40 bg-primary/5" : "border-border"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold">v{p.version}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-semibold",
                      p.status === "ACTIVE"
                        ? "bg-primary/15 text-primary"
                        : p.status === "DRAFT"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {p.status}
                  </Badge>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {p.status === "DRAFT"
                      ? "awaiting DPIA + activation"
                      : p.activatedAt
                        ? `activated ${new Date(p.activatedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`
                        : ""}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {p.changeSummary}
                </p>
                {p.status === "DRAFT" ? (
                  <>
                    <div className="mt-2.5">
                      <PolicyDiff draft={p} active={active} />
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => runSimulation(p)}
                        data-testid="simulate-btn"
                      >
                        <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                        Simulate impact
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => {
                          setDpiaPolicyId(p.id);
                          setDpiaSummary("");
                          setChecks({});
                          setDpiaOpen(true);
                        }}
                      >
                        <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Record DPIA
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="h-8 gap-1.5">
                            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                            Activate
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Activate policy v{p.version}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Activation retires the current active version. Every
                              member&apos;s score recomputes under the new rules on
                              their next read, and every new snapshot names this
                              policy. This action is audited and requires a
                              completed DPIA record for v{p.version}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                api("activate", `/api/v1/engine/admin/policies/${p.id}/activate`, {})
                              }
                            >
                              Activate v{p.version}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                ) : null}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* DPIA registry */}
        {overview.dpia.length > 0 ? (
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold">
              <FileCheck2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              DPIA registry
            </p>
            <ul className="mt-2.5 space-y-2">
              {overview.dpia.slice(0, 6).map((d) => (
                <li key={d.id} className="rounded-lg border border-border px-3.5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">
                      v{d.policyVersion ?? "—"}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold",
                        d.status === "COMPLETED"
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {d.status === "COMPLETED" ? "completed" : "in progress"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      residual {d.residualRisk}
                    </span>
                    {d.completedAt ? (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(d.completedAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {d.summary}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* The automated-decision gate */}
        <div
          className={cn(
            "rounded-lg border px-3.5 py-3.5",
            overview.gate.automatedSignificantDecisions
              ? "border-primary/40 bg-primary/5"
              : "border-border"
          )}
        >
          <p className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck
              className={cn(
                "h-4 w-4",
                overview.gate.automatedSignificantDecisions ? "text-primary" : "text-muted-foreground"
              )}
              aria-hidden="true"
            />
            Automated significant decisions:{" "}
            {overview.gate.automatedSignificantDecisions ? "ENABLED" : "DISABLED"}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {overview.gate.note}
          </p>
          {overview.gate.automatedSignificantDecisions ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-2.5 h-8"
              disabled={busy !== null}
              onClick={() => api("gate-off", "/api/v1/engine/admin/gate", { enabled: false, confirm: "" })}
            >
              {busy === "gate-off" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              Disable (always allowed)
            </Button>
          ) : (
            <div className="mt-2.5 space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="gate-confirm" className="text-xs">
                  Type <span className="font-mono font-semibold">I UNDERSTAND</span> to enable
                </Label>
                <Input
                  id="gate-confirm"
                  value={gateConfirm}
                  onChange={(e) => setGateConfirm(e.target.value)}
                  placeholder="I UNDERSTAND"
                  className="sm:max-w-xs"
                />
              </div>
              <Button
                size="sm"
                className="h-8"
                disabled={busy !== null || gateConfirm.trim() !== "I UNDERSTAND"}
                onClick={async () => {
                  const r = await api("gate-on", "/api/v1/engine/admin/gate", {
                    enabled: true,
                    confirm: gateConfirm,
                  });
                  if (r.ok) setGateConfirm("");
                }}
              >
                {busy === "gate-on" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                Enable under DPIA
              </Button>
              <p className="flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                Enabling requires a completed DPIA on the ACTIVE policy (NDPC guidance) and stays
                fully audited.
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* DPIA recorder dialog */}
      <Dialog open={dpiaOpen} onOpenChange={setDpiaOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Record a DPIA
              {draftForDpia ? ` for policy v${draftForDpia.version}` : ""}
            </DialogTitle>
            <DialogDescription>
              The record completes only when every checklist item is done — a
              completed DPIA is what unlocks activation (NDPC gate).
            </DialogDescription>
          </DialogHeader>
          {drafts.length === 0 && !draftForDpia ? (
            <p className="text-sm text-muted-foreground">
              Create a policy draft first — DPIAs are recorded against drafts.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="dpia-summary" className="text-xs">
                  Assessment summary (registry entry — min 60 chars)
                </Label>
                <Textarea
                  id="dpia-summary"
                  value={dpiaSummary}
                  onChange={(e) => setDpiaSummary(e.target.value)}
                  rows={4}
                  placeholder="Scope, risks identified, mitigations, residual risk rationale…"
                  aria-describedby="dpia-summary-hint"
                />
                <p id="dpia-summary-hint" className="text-[10px] text-muted-foreground">
                  {dpiaSummary.trim().length}/60 characters minimum
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Residual risk (post-mitigation)</Label>
                <Select
                  value={dpiaResidual}
                  onValueChange={(v) => setDpiaResidual(v as "LOW" | "MEDIUM" | "HIGH")}
                >
                  <SelectTrigger className="w-32" aria-label="Residual risk">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">LOW</SelectItem>
                    <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                    <SelectItem value="HIGH">HIGH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <fieldset className="space-y-2.5">
                <legend className="text-xs font-semibold">Governance checklist</legend>
                {CHECKLIST_IDS.map((id) => (
                  <label
                    key={id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      id={`chk-${id}`}
                      checked={checks[id] ?? false}
                      onCheckedChange={(v) => setChecks((c) => ({ ...c, [id]: v === true }))}
                      aria-label={CHECKLIST_LABELS[id]}
                    />
                    <span className="text-[11px] leading-snug text-muted-foreground">
                      {CHECKLIST_LABELS[id]}
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={
                busy !== null ||
                dpiaSummary.trim().length < 60 ||
                !draftForDpia
              }
              onClick={async () => {
                const r = await api("dpia", "/api/v1/engine/admin/dpia", {
                  policyId: draftForDpia?.id,
                  summary: dpiaSummary,
                  residualRisk: dpiaResidual,
                  checklist: CHECKLIST_IDS.map((id) => ({ id, done: checks[id] ?? false })),
                });
                if (r.ok) setDpiaOpen(false);
              }}
            >
              {busy === "dpia" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Save assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impact simulation dialog (read-only dry-run) */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" data-testid="simulate-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" aria-hidden="true" />
              Impact dry-run
              {simResult ? ` — draft v${simResult.draftVersion} vs active v${simResult.activeVersion}` : ""}
            </DialogTitle>
            <DialogDescription>
              Every member&apos;s score is recomputed in memory under the draft
              rules and compared with the active rules. Nothing is written —
              this is a governance rehearsal, not a change.
            </DialogDescription>
          </DialogHeader>

          {simBusy ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Recomputing the scored cohort in memory…
            </div>
          ) : simError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive" role="alert">
              {simError}
            </div>
          ) : simResult ? (
            <div className="space-y-4">
              {/* Headline stats */}
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="sim-stats">
                {[
                  { k: "Members simulated", v: `${simResult.cohort}`, sub: simResult.frozenExcluded > 0 ? `${simResult.frozenExcluded} frozen (appeal) excluded` : "no frozen members" },
                  { k: "Scores would move", v: `${simResult.moved}`, sub: `${simResult.cohort - simResult.moved} unchanged` },
                  { k: "Average score", v: `${simResult.avgBefore} → ${simResult.avgAfter}`, sub: `avg Δ ${simResult.avgDelta > 0 ? "+" : ""}${simResult.avgDelta}` },
                  { k: "Biggest rise", v: `+${simResult.maxUp}`, sub: simResult.maxUp === 0 ? "nothing rises" : "points" },
                  { k: "Biggest drop", v: `${simResult.maxDown}`, sub: simResult.maxDown === 0 ? "nothing drops" : "points" },
                  {
                    k: "Status bands",
                    v: `${simResult.transitions.reduce((a, t) => a + t.count, 0)}`,
                    sub: simResult.transitions.length === 0 ? "no band changes" : "members change band",
                  },
                ].map((cell) => (
                  <div key={cell.k} className="ts-stat-block rounded-lg border border-border px-3 py-2.5">
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{cell.k}</dt>
                    <dd className="mt-0.5 text-sm font-bold tabular-nums">{cell.v}</dd>
                    <dd className="text-[10px] text-muted-foreground">{cell.sub}</dd>
                  </div>
                ))}
              </dl>

              {/* Score-bucket histogram — before (muted) vs after (primary) */}
              <div className="ts-inset rounded-lg px-3.5 py-3">
                <p className="text-xs font-semibold">Score distribution</p>
                <div className="mt-2.5 space-y-2" data-testid="sim-buckets">
                  {(() => {
                    const maxCount = Math.max(1, ...simResult.buckets.map((b) => Math.max(b.before, b.after)));
                    return simResult.buckets.map((b) => (
                      <div key={b.label} className="grid grid-cols-[3rem_1fr] items-center gap-2">
                        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                          {b.label}
                        </span>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(b.before / maxCount) * 100}%` }}
                              transition={{ duration: 0.4 }}
                              className="h-2 rounded-full bg-muted-foreground/35 dark:bg-muted-foreground/55"
                              style={{ minWidth: b.before > 0 ? 4 : 0 }}
                            />
                            <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
                              {b.before}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(b.after / maxCount) * 100}%` }}
                              transition={{ duration: 0.4, delay: 0.1 }}
                              className="h-2 rounded-full bg-primary/80"
                              style={{ minWidth: b.after > 0 ? 4 : 0 }}
                            />
                            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-primary">
                              {b.after}
                            </span>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                <div className="mt-2.5 flex gap-4 text-[10px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/35 dark:bg-muted-foreground/55" aria-hidden="true" />
                    before (active rules)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary/80" aria-hidden="true" />
                    after (draft rules)
                  </span>
                </div>
              </div>

              {/* Status-band transitions */}
              {simResult.transitions.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold">Status-band transitions</p>
                  <ul className="mt-2 space-y-1.5" data-testid="sim-transitions">
                    {simResult.transitions.map((t) => (
                      <li
                        key={`${t.from}-${t.to}`}
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-[11px]"
                      >
                        <span className="font-mono text-[10px] text-muted-foreground">{t.from}</span>
                        <TrendingUp
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            t.to === "NEW" || t.to === "REVIEW_REQUIRED" || t.to === "HIGH_RISK"
                              ? "text-destructive"
                              : "text-primary"
                          )}
                          aria-hidden="true"
                        />
                        <span className="font-mono text-[10px] font-semibold">{t.to}</span>
                        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                          ×{t.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Top movers — masked identities */}
              {simResult.movers.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold">
                    Top movers
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      (identities masked — trends, not names)
                    </span>
                  </p>
                  <div className="ts-scrollbar mt-2 max-h-56 overflow-x-auto overflow-y-auto rounded-lg border border-border">
                    <table className="w-full min-w-[420px] text-[11px]">
                      <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                        <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                          <th scope="col" className="px-3 py-2 font-medium">Member</th>
                          <th scope="col" className="px-3 py-2 font-medium">Score</th>
                          <th scope="col" className="px-3 py-2 font-medium">Δ</th>
                          <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">Status</th>
                        </tr>
                      </thead>
                      <tbody data-testid="sim-movers">
                        {simResult.movers.map((m, i) => (
                          <motion.tr
                            key={`${m.label}-${i}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.04 }}
                            className="border-t border-border/60"
                          >
                            <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{m.label}</td>
                            <td className="px-3 py-1.5 tabular-nums">
                              <span className="text-muted-foreground">{m.before}</span>
                              <span className="mx-1 text-muted-foreground/60" aria-hidden="true">→</span>
                              <span className="font-bold">{m.after}</span>
                            </td>
                            <td className="px-3 py-1.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                                  m.delta > 0
                                    ? "bg-primary/10 text-primary"
                                    : "bg-destructive/10 text-destructive"
                                )}
                              >
                                {m.delta > 0 ? (
                                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                                )}
                                {m.delta > 0 ? "+" : ""}
                                {m.delta}
                              </span>
                            </td>
                            <td className="hidden px-3 py-1.5 font-mono text-[10px] text-muted-foreground sm:table-cell">
                              {m.statusBefore === m.statusAfter ? (
                                m.statusAfter
                              ) : (
                                <>
                                  {m.statusBefore}
                                  <span className="mx-1" aria-hidden="true">→</span>
                                  <span className="font-semibold text-foreground">{m.statusAfter}</span>
                                </>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  No member&apos;s score would move under these draft rules.
                </p>
              )}

              <p className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground" data-testid="sim-note">
                <Info className="mr-1.5 inline h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {simResult.note}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
