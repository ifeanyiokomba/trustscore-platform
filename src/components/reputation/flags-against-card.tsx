"use client";

// TrustScore Stage 7 — FlagsAgainstCard (the subject's defense surface).
// Each flag: category chip, masked reporter, description, evidence, status
// timeline, respond dialog (OPEN only), appeal dialog (CONFIRMED + window).
// The reporter is MASKED here (retaliation shield; full record in DSR export).
// Locked language: outcomes are statements about reviewed evidence only.

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag,
  Siren,
  Gavel,
  Scale,
  MessageSquare,
  Loader2,
  Clock,
  EyeOff,
  ChevronDown,
  Send,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Link2,
  Undo2,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { FlagAgainstMe } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  FRAUD: Siren,
  IMPERSONATION: EyeOff,
  NON_PAYMENT: Undo2,
  SCAM: AlertTriangle,
  HARASSMENT: MessageSquare,
  OTHER: Flag,
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  OPEN: {
    label: "Open — awaiting your response",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400",
  },
  UNDER_REVIEW: {
    label: "Under human review",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  RESOLVED_CONFIRMED: {
    label: "Confirmed after review",
    className: "bg-destructive/10 text-destructive border-destructive/40",
  },
  RESOLVED_UNFOUNDED: {
    label: "Cleared — unfounded",
    className: "bg-primary/15 text-primary border-primary/40",
  },
  RESOLVED_DISMISSED: {
    label: "Cleared — dismissed",
    className: "bg-primary/15 text-primary border-primary/40",
  },
  WITHDRAWN: {
    label: "Withdrawn by reporter",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000));
}

function EvidenceRow({
  kind,
  content,
}: {
  kind: string;
  content: string;
}) {
  const Icon = kind === "LINK" ? Link2 : FileText;
  return (
    <li className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
      <Icon className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 break-words">{content}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Respond dialog — the subject's side of the story (OPEN → UNDER_REVIEW)
// ---------------------------------------------------------------------------

function RespondDialog({
  flag,
  open,
  onOpenChange,
  onDone,
}: {
  flag: FlagAgainstMe;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [response, setResponse] = React.useState("");
  const [evidence, setEvidence] = React.useState<{ kind: string; content: string }[]>([]);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    if (response.trim().length < 20) {
      setError("Your response must be at least 20 characters — the reviewer needs your side.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reputation/flags/${flag.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: response.trim(),
          evidence: evidence
            .filter((e) => e.content.trim().length >= 5)
            .map((e) => ({ kind: e.kind, content: e.content.trim() })),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (res.ok) {
        toast.success("Response submitted", {
          description: "A human reviewer now examines both sides. You will be notified of the outcome.",
        });
        onOpenChange(false);
        onDone();
      } else {
        setError(body.error?.message ?? "Could not submit your response.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
            Respond to the flag
          </DialogTitle>
          <DialogDescription>
            {flag.categoryLabel} · filed {timeAgo(flag.createdAt)} by a masked reporter (
            {flag.reporter.maskedHandle}). Your response goes to a human reviewer — it never
            becomes public.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="flag-response" className="mb-1.5 block text-xs font-semibold">
              Your side of the story <span className="text-muted-foreground">(min 20 chars)</span>
            </label>
            <Textarea
              id="flag-response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Stick to facts the reviewer can check: what happened, when, and any proof you can attach below."
              aria-describedby={error ? "respond-error" : undefined}
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {response.length}/2000
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Supporting evidence (optional)</span>
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
                    setEvidence((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, kind: v } : x))
                    )
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
                  aria-label={`Remove evidence ${i + 1}`}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          {error ? (
            <p
              id="respond-error"
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit response
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Appeal dialog — NDPA §37 redress for a CONFIRMED flag
// ---------------------------------------------------------------------------

function AppealDialog({
  flag,
  open,
  onOpenChange,
  onDone,
}: {
  flag: FlagAgainstMe;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const left = daysLeft(flag.appealWindowEndsAt);

  async function submit() {
    if (reason.trim().length < 20) {
      setError("Explain your appeal in at least 20 characters — the reviewer needs your grounds.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reputation/flags/${flag.id}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (res.ok) {
        toast.success("Appeal filed", {
          description: "A fresh human review will re-examine the case. You will be notified.",
        });
        onOpenChange(false);
        onDone();
      } else {
        setError(body.error?.message ?? "Could not file the appeal.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
            Appeal the confirmation
          </DialogTitle>
          <DialogDescription>
            One appeal per flag, {left !== null ? `${left} day${left === 1 ? "" : "s"} left` : "14-day window"}.
            A reviewer re-examines the original evidence, your response and your grounds. If the
            appeal succeeds, the risk penalty is removed and the flag reads as cleared.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="ts-inset rounded-lg px-3 py-2.5">
            <p className="text-[11px] font-semibold">Reviewer&apos;s original rationale</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {flag.resolution?.rationale}
            </p>
          </div>
          <div>
            <label htmlFor="appeal-reason" className="mb-1.5 block text-xs font-semibold">
              Grounds for appeal <span className="text-muted-foreground">(min 20 chars)</span>
            </label>
            <Textarea
              id="appeal-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="What did the reviewer miss? New facts, missing context, procedural concerns…"
              aria-describedby={error ? "appeal-error" : undefined}
            />
          </div>
          {error ? (
            <p
              id="appeal-error"
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scale className="mr-2 h-4 w-4" />}
            File appeal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

export function FlagsAgainstCard({
  flags,
  onChanged,
}: {
  flags: FlagAgainstMe[];
  onChanged: () => void | Promise<void>;
}) {
  const [respondFlag, setRespondFlag] = React.useState<FlagAgainstMe | null>(null);
  const [appealFlag, setAppealFlag] = React.useState<FlagAgainstMe | null>(null);

  return (
    <Card className="ts-card-hover min-w-0" data-testid="flags-against-card">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Gavel className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Flags against you</CardTitle>
          <CardDescription className="truncate">
            Every case is human-reviewed — you always get the last word first
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {flags.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <ShieldCheck className="mx-auto h-6 w-6 text-primary/60" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">No flags on record</p>
            <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
              No confirmed adverse signals found — a statement about recorded evidence only, never
              a guarantee. If a member files a flag, you&apos;ll be notified and can respond before
              any human decision.
            </p>
          </div>
        ) : (
          <ul className="max-h-[26rem] space-y-3 overflow-y-auto pr-1" role="list">
            <AnimatePresence initial={false}>
              {flags.map((f) => {
                const CatIcon = CATEGORY_ICON[f.category] ?? Flag;
                const status = STATUS_META[f.status] ?? STATUS_META.OPEN;
                const appealLeft = daysLeft(f.appealWindowEndsAt);
                return (
                  <motion.li
                    key={f.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="min-w-0 rounded-xl border border-border"
                    data-testid="flag-against-row"
                  >
                    <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3.5 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <CatIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        {f.categoryLabel}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] font-semibold", status.className)}>
                        {status.label}
                      </Badge>
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {timeAgo(f.createdAt)}
                      </span>
                    </div>
                    <div className="space-y-2.5 px-3.5 py-3">
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Filed by <span className="font-mono font-medium text-foreground">{f.reporter.maskedHandle}</span>{" "}
                        (L{f.reporter.assuranceLevel} reporter) — masked to prevent retaliation; the
                        full record is in your data export.
                      </p>
                      <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs leading-relaxed">
                        {f.description}
                      </p>
                      {f.evidence.length > 0 ? (
                        <Collapsible>
                          <CollapsibleTrigger className="group flex items-center gap-1 text-[11px] font-semibold text-primary">
                            <ChevronDown
                              className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180"
                              aria-hidden="true"
                            />
                            Reporter&apos;s evidence ({f.evidence.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <ul className="mt-2 space-y-1.5" role="list">
                              {f.evidence.map((e) => (
                                <EvidenceRow key={e.id} kind={e.kind} content={e.content} />
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : null}

                      {f.myResponse ? (
                        <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
                          <p className="text-[11px] font-semibold text-primary">
                            Your response · {timeAgo(f.myResponse.at)}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            {f.myResponse.content}
                          </p>
                        </div>
                      ) : null}

                      {f.resolution ? (
                        <div
                          className={cn(
                            "rounded-lg border px-3 py-2",
                            f.resolution.outcome === "CONFIRMED"
                              ? "border-destructive/30 bg-destructive/5"
                              : "border-primary/25 bg-primary/5"
                          )}
                        >
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                            <Gavel
                              className={cn(
                                "h-3 w-3",
                                f.resolution.outcome === "CONFIRMED" ? "text-destructive" : "text-primary"
                              )}
                              aria-hidden="true"
                            />
                            Human decision · {f.resolution.outcome} · {timeAgo(f.resolution.decidedAt)}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            {f.resolution.rationale}
                          </p>
                        </div>
                      ) : null}

                      {f.appeal ? (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <Scale className="h-3 w-3" aria-hidden="true" />
                            Appeal · {f.appeal.status}
                            {f.appeal.decidedAt ? ` · ${timeAgo(f.appeal.decidedAt)}` : ""}
                          </p>
                          {f.appeal.decisionNote ? (
                            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                              {f.appeal.decisionNote}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Pending — a fresh reviewer is re-examining the case.
                            </p>
                          )}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {f.canRespond ? (
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => setRespondFlag(f)}
                            data-testid="respond-cta"
                          >
                            <MessageSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            Respond
                          </Button>
                        ) : null}
                        {f.canAppeal ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                            onClick={() => setAppealFlag(f)}
                            data-testid="appeal-cta"
                          >
                            <Scale className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            Appeal
                            {appealLeft !== null ? ` (${appealLeft}d)` : ""}
                          </Button>
                        ) : null}
                        {f.status === "RESOLVED_CONFIRMED" && !f.canAppeal && !f.appeal ? (
                          <span className="text-[11px] text-muted-foreground">
                            Appeal window closed.
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>

      {respondFlag ? (
        <RespondDialog
          flag={respondFlag}
          open={respondFlag !== null}
          onOpenChange={(v) => !v && setRespondFlag(null)}
          onDone={() => void onChanged()}
        />
      ) : null}
      {appealFlag ? (
        <AppealDialog
          flag={appealFlag}
          open={appealFlag !== null}
          onOpenChange={(v) => !v && setAppealFlag(null)}
          onDone={() => void onChanged()}
        />
      ) : null}
    </Card>
  );
}
