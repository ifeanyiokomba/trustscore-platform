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
import type { EngineAdminOverview, PolicyRulesInfo } from "@/lib/types";
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
                  <div className="mt-2.5 flex flex-wrap gap-2">
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
    </Card>
  );
}
