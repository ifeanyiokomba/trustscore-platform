"use client";

// TrustScore Stage 7 — FileFlagCard + FlagDialog.
// FlagDialog is the ONE flag-submission surface (used here and from the
// Safety Check console after a check). Anti-gaming gates are surfaced
// honestly: the L2 requirement is shown up-front, duplicates / weekly quota
// errors render inline. My filed flags list shows status + withdraw (OPEN).

import * as React from "react";
import { motion } from "framer-motion";
import {
  Flag,
  Loader2,
  Send,
  FileText,
  Link2,
  Info,
  ShieldCheck,
  Undo2,
  History,
  ShieldAlert,
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { FlagFiledByMe, ReputationMe } from "@/lib/types";
import { cn } from "@/lib/utils";

export const FLAG_CATEGORIES_UI = [
  { value: "FRAUD", label: "Fraud or deception" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "NON_PAYMENT", label: "Payment or delivery failure" },
  { value: "SCAM", label: "Scam" },
  { value: "HARASSMENT", label: "Harassment or abuse" },
  { value: "OTHER", label: "Other serious concern" },
] as const;

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

// ---------------------------------------------------------------------------
// FlagDialog — the shared submission surface
// ---------------------------------------------------------------------------

export function FlagDialog({
  open,
  onOpenChange,
  prefillSubject,
  canFile,
  myAssuranceLevel,
  onFiled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefillSubject?: string;
  canFile: boolean;
  myAssuranceLevel: number;
  onFiled: () => void | Promise<void>;
}) {
  const [subject, setSubject] = React.useState(prefillSubject ?? "");
  const [category, setCategory] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [evidence, setEvidence] = React.useState<{ kind: string; content: string }[]>([
    { kind: "TEXT", content: "" },
  ]);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSubject(prefillSubject ?? "");
      setCategory("");
      setDescription("");
      setEvidence([{ kind: "TEXT", content: "" }]);
      setError(null);
    }
  }, [open, prefillSubject]);

  async function submit() {
    if (!/^[a-zA-Z0-9_@]{3,25}$/.test(subject.trim())) {
      setError("Enter the member's @handle (letters, numbers, underscores).");
      return;
    }
    if (!category) {
      setError("Choose a category.");
      return;
    }
    if (description.trim().length < 40) {
      setError("Describe the concern in at least 40 characters — flags are serious.");
      return;
    }
    const validEvidence = evidence
      .map((e) => ({ kind: e.kind, content: e.content.trim() }))
      .filter((e) => e.content.length >= 5);
    if (validEvidence.length === 0) {
      setError("At least one piece of evidence is required (min 5 characters).");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/reputation/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectHandle: subject.trim(),
          category,
          description: description.trim(),
          evidence: validEvidence,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (res.ok) {
        toast.success("Flag filed", {
          description:
            "The member is notified and can respond. A human reviewer decides — flags never affect a score automatically.",
        });
        onOpenChange(false);
        await onFiled();
      } else {
        setError(body.error?.message ?? "Could not file the flag.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="flag-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-primary" aria-hidden="true" />
            File a flag
          </DialogTitle>
          <DialogDescription>
            A flag is a report to TrustScore — never a public accusation. The member is notified,
            can respond, and a human reviewer decides. False reporting is a serious matter.
          </DialogDescription>
        </DialogHeader>

        {!canFile ? (
          <div
            role="alert"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400"
          >
            <p className="flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Verification required (L2)
            </p>
            <p className="mt-1">
              Filing flags requires a verified identity — currently L{myAssuranceLevel}. Verify your
              government ID and phone (Overview tab) first. This keeps reporting human and
              accountable: anonymous flag wars are impossible by design.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="flag-subject" className="mb-1.5 block text-xs font-semibold">
                Member&apos;s handle
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-muted-foreground">@</span>
                <Input
                  id="flag-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="their_handle"
                  className="h-9 text-xs"
                  maxLength={26}
                  aria-describedby="flag-subject-hint"
                />
              </div>
              <p id="flag-subject-hint" className="mt-1 text-[10px] text-muted-foreground">
                You can flag an existing check result directly from the Safety Check console.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold" htmlFor="flag-category">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="flag-category" className="h-9 text-xs" aria-label="Flag category">
                  <SelectValue placeholder="What kind of concern?" />
                </SelectTrigger>
                <SelectContent>
                  {FLAG_CATEGORIES_UI.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="flag-description" className="mb-1.5 block text-xs font-semibold">
                What happened <span className="text-muted-foreground">(min 40 chars)</span>
              </label>
              <Textarea
                id="flag-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Facts the reviewer can check: what happened, when, amounts, channels…"
                aria-describedby={error ? "flag-error" : undefined}
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {description.length}/2000
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">
                  Evidence <span className="text-muted-foreground">(min 1, max 5)</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[11px]"
                  onClick={() =>
                    setEvidence((prev) =>
                      prev.length >= 5 ? prev : [...prev, { kind: "TEXT", content: "" }]
                    )
                  }
                >
                  + Add
                </Button>
              </div>
              {evidence.map((e, i) => (
                <div key={i} className="flex gap-2">
                  <Select
                    value={e.kind}
                    onValueChange={(v) =>
                      setEvidence((prev) => prev.map((x, j) => (j === i ? { ...x, kind: v } : x)))
                    }
                  >
                    <SelectTrigger className="h-9 w-24 shrink-0 text-xs" aria-label="Evidence kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="LINK">Link</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={e.content}
                    onChange={(ev) =>
                      setEvidence((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, content: ev.target.value } : x))
                      )
                    }
                    placeholder={e.kind === "LINK" ? "https://…" : "A fact the reviewer can check"}
                    className="h-9 text-xs"
                    maxLength={2000}
                    aria-label={`Evidence ${i + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 shrink-0 px-2 text-muted-foreground"
                    onClick={() => setEvidence((prev) => prev.filter((_, j) => j !== i))}
                    disabled={evidence.length <= 1}
                    aria-label={`Remove evidence ${i + 1}`}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Anti-gaming rules apply: one open flag per member, {3} per 7 days, and evidence is
                mandatory. Your identity is masked to them; theirs is masked to you.
              </span>
            </p>
            {error ? (
              <p
                id="flag-error"
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !canFile} data-testid="flag-submit">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            File flag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// FileFlagCard — CTA + my filed flags
// ---------------------------------------------------------------------------

const FILED_STATUS_META: Record<string, { label: string; className: string }> = {
  OPEN: {
    label: "Open — awaiting their response",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400",
  },
  UNDER_REVIEW: {
    label: "Under human review",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  RESOLVED_CONFIRMED: {
    label: "Confirmed",
    className: "bg-destructive/10 text-destructive border-destructive/40",
  },
  RESOLVED_UNFOUNDED: {
    label: "Unfounded",
    className: "bg-muted text-muted-foreground border-border",
  },
  RESOLVED_DISMISSED: {
    label: "Dismissed",
    className: "bg-muted text-muted-foreground border-border",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function FileFlagCard({
  me,
  onChanged,
}: {
  me: ReputationMe;
  onChanged: () => void | Promise<void>;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [withdrawFlag, setWithdrawFlag] = React.useState<FlagFiledByMe | null>(null);
  const [withdrawPending, setWithdrawPending] = React.useState(false);

  async function doWithdraw() {
    if (!withdrawFlag) return;
    setWithdrawPending(true);
    try {
      const res = await fetch(`/api/v1/reputation/flags/${withdrawFlag.id}/withdraw`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (res.ok) {
        toast.success("Flag withdrawn", {
          description: "It has no effect on the member's TrustScore. They have been notified.",
        });
        setWithdrawFlag(null);
        await onChanged();
      } else {
        toast.error("Could not withdraw", {
          description: body.error?.message ?? "Please try again.",
        });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setWithdrawPending(false);
    }
  }

  return (
    <Card className="ts-card-hover min-w-0" data-testid="file-flag-card">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Flag className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Report a serious concern</CardTitle>
          <CardDescription className="truncate">
            Evidence-backed flags, human review, appealable outcomes
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="ts-inset rounded-lg px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                {me.canFileFlags
                  ? "You can file flags — your identity is verified (L2+)"
                  : `Flags require L2 verification — you are L${me.myAssuranceLevel}`}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {me.canFileFlags
                  ? `Anti-gaming limits: one open flag per member, ${me.flagWindow.max} per ${me.flagWindow.days} days, evidence always required. Reporter identities stay masked.`
                  : "Verify your government ID and phone (Overview tab) to unlock flagging — anonymous flag wars are impossible by design."}
              </p>
            </div>
            <ShieldCheck
              className={cn("h-5 w-5 shrink-0", me.canFileFlags ? "text-primary" : "text-muted-foreground")}
              aria-hidden="true"
            />
          </div>
          <Button
            className="mt-3 w-full"
            onClick={() => setDialogOpen(true)}
            disabled={!me.canFileFlags}
            data-testid="file-flag-cta"
          >
            <Flag className="mr-2 h-4 w-4" aria-hidden="true" />
            File a flag
          </Button>
        </div>

        {/* My filed flags */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <History className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Flags you filed
          </p>
          {me.flagsFiledByMe.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
              No flags filed. Flag only serious, evidenced concerns — reviewers examine every case
              and both parties see the outcome.
            </p>
          ) : (
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1" role="list">
              {me.flagsFiledByMe.map((f) => {
                const status = FILED_STATUS_META[f.status] ?? FILED_STATUS_META.OPEN;
                return (
                  <motion.li
                    key={f.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="min-w-0 rounded-lg border border-border px-3 py-2.5"
                    data-testid="my-flag-row"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">
                        @{f.subjectHandle}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px]", status.className)}>
                        {status.label}
                      </Badge>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {timeAgo(f.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {f.categoryLabel} · {f.evidenceCount} evidence item
                      {f.evidenceCount === 1 ? "" : "s"}
                    </p>
                    {f.resolution ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {f.resolution.outcome}:
                        </span>{" "}
                        {f.resolution.rationale}
                      </p>
                    ) : null}
                    {f.appeal ? (
                      <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                        Subject appealed — {f.appeal.status.toLowerCase()}.
                      </p>
                    ) : null}
                    {f.canWithdraw ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1.5 h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => setWithdrawFlag(f)}
                        data-testid="withdraw-cta"
                      >
                        <Undo2 className="mr-1 h-3 w-3" aria-hidden="true" />
                        Withdraw
                      </Button>
                    ) : null}
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>

      <FlagDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        canFile={me.canFileFlags}
        myAssuranceLevel={me.myAssuranceLevel}
        onFiled={onChanged}
      />

      <AlertDialog
        open={withdrawFlag !== null}
        onOpenChange={(v) => !v && setWithdrawFlag(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this flag?</AlertDialogTitle>
            <AlertDialogDescription>
              The flag against @{withdrawFlag?.subjectHandle} will be closed with zero score
              effect and the member will be notified. Withdrawal is only possible before they
              respond.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawPending}>Keep it open</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doWithdraw()} disabled={withdrawPending}>
              {withdrawPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Withdraw flag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
