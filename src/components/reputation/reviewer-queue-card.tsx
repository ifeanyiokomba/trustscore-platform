"use client";

// TrustScore Stage 7 — ReviewerQueueCard (HUMAN review surface, REVIEWER role).
// Queue: full party identities (L badges), claim, evidence from both sides,
// subject response; decision dialog (CONFIRMED / UNFOUNDED / DISMISSED +
// published rationale). Appeals: original case + appeal grounds; UPHELD /
// OVERTURNED decision. Honest labels: human review only — no automated
// significant decisions (that gate belongs to Stage 8's DPIA).

import * as React from "react";
import { motion } from "framer-motion";
import {
  Gavel,
  Scale,
  Inbox,
  Loader2,
  FileText,
  Link2,
  Clock,
  MessageSquare,
  ShieldCheck,
  UserRound,
  BadgeCheck,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { ReviewQueue, ReviewQueueFlag, ReviewQueueAppeal } from "@/lib/types";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

function LBadge({ level }: { level: number }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] font-bold",
        level >= 2
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      L{level}
    </Badge>
  );
}

function PartyLine({
  role,
  handle,
  displayName,
  level,
}: {
  role: string;
  handle: string;
  displayName: string;
  level?: number;
}) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="shrink-0 font-semibold uppercase tracking-wide text-[9px]">{role}</span>
      <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate font-medium text-foreground">{displayName}</span>
      <span className="truncate font-mono">@{handle}</span>
      {level !== undefined ? <LBadge level={level} /> : null}
    </p>
  );
}

function EvidenceList({
  evidence,
}: {
  evidence: { id: string; role: string; kind: string; content: string; createdAt: string }[];
}) {
  if (evidence.length === 0) return null;
  const reporter = evidence.filter((e) => e.role === "REPORTER");
  const subject = evidence.filter((e) => e.role === "SUBJECT");
  const block = (title: string, items: typeof evidence, tone: string) =>
    items.length === 0 ? null : (
      <div className="min-w-0">
        <p className={cn("text-[10px] font-bold uppercase tracking-wide", tone)}>{title}</p>
        <ul className="mt-1 space-y-1" role="list">
          {items.map((e) => {
            const Icon = e.kind === "LINK" ? Link2 : FileText;
            const isResponse = e.role === "SUBJECT" && e.kind === "TEXT" && items[0] === e;
            return (
              <li
                key={e.id}
                className="flex items-start gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground"
              >
                {isResponse ? (
                  <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <Icon className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                )}
                <span className="min-w-0 break-words">{e.content}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {block("Reporter's evidence", reporter, "text-muted-foreground")}
      {block("Subject's response + evidence", subject, "text-primary")}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decision dialog (flag)
// ---------------------------------------------------------------------------

function DecisionDialog({
  flag,
  open,
  onOpenChange,
  onDone,
}: {
  flag: ReviewQueueFlag;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void | Promise<void>;
}) {
  const [outcome, setOutcome] = React.useState<string>("");
  const [rationale, setRationale] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setOutcome("");
      setRationale("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (!["CONFIRMED", "UNFOUNDED", "DISMISSED"].includes(outcome)) {
      setError("Choose an outcome.");
      return;
    }
    if (rationale.trim().length < 20) {
      setError("Publish a rationale of at least 20 characters — both parties will read it.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reputation/review/${flag.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, rationale: rationale.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (res.ok) {
        toast.success(
          outcome === "CONFIRMED" ? "Flag confirmed" : "Flag cleared",
          {
            description:
              outcome === "CONFIRMED"
                ? "The subject's score now carries a confirmed risk signal (−25); they can appeal for 14 days."
                : "The flag contributes to the subject's resolution history (+2).",
          }
        );
        onOpenChange(false);
        await onDone();
      } else {
        setError(body.error?.message ?? "Could not record the decision.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" data-testid="decision-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Gavel className="h-4 w-4 text-primary" aria-hidden="true" />
            Decide the flag
          </DialogTitle>
          <DialogDescription>
            @{flag.reporter.handle} → @{flag.subject.handle} · {flag.category} · filed{" "}
            {timeAgo(flag.createdAt)}
            {flag.subjectRespondedAt ? ` · responded ${timeAgo(flag.subjectRespondedAt)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs leading-relaxed">
            {flag.description}
          </div>
          <EvidenceList evidence={flag.evidence} />
          <div className="space-y-2">
            <p className="text-xs font-semibold">Outcome</p>
            <RadioGroup value={outcome} onValueChange={setOutcome} className="gap-2">
              <div className="flex items-start gap-2 rounded-lg border border-border px-3 py-2.5">
                <RadioGroupItem value="CONFIRMED" id="out-confirmed" className="mt-0.5" />
                <Label htmlFor="out-confirmed" className="cursor-pointer text-xs font-normal leading-relaxed">
                  <span className="font-semibold text-destructive">Confirm</span> — the evidence
                  supports the concern. Confirmed risk signal (−25) on the subject&apos;s score;
                  they can appeal for 14 days.
                </Label>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border px-3 py-2.5">
                <RadioGroupItem value="UNFOUNDED" id="out-unfounded" className="mt-0.5" />
                <Label htmlFor="out-unfounded" className="cursor-pointer text-xs font-normal leading-relaxed">
                  <span className="font-semibold text-primary">Unfounded</span> — the claim does
                  not hold. The flag is cleared and counts toward the subject&apos;s resolution
                  history.
                </Label>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border px-3 py-2.5">
                <RadioGroupItem value="DISMISSED" id="out-dismissed" className="mt-0.5" />
                <Label htmlFor="out-dismissed" className="cursor-pointer text-xs font-normal leading-relaxed">
                  <span className="font-semibold">Dismiss</span> — serious process, but this case
                  should not continue (e.g. not verifiable, outside scope). Cleared with no score
                  effect beyond resolution history.
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <label htmlFor="decision-rationale" className="mb-1.5 block text-xs font-semibold">
              Published rationale <span className="text-muted-foreground">(min 20 chars)</span>
            </label>
            <Textarea
              id="decision-rationale"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What evidence weighed, and why — both parties will read this."
              aria-describedby={error ? "decision-error" : undefined}
            />
          </div>
          {error ? (
            <p
              id="decision-error"
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
          <Button onClick={submit} disabled={pending} data-testid="decision-submit">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gavel className="mr-2 h-4 w-4" />}
            Record decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Appeal decision dialog
// ---------------------------------------------------------------------------

function AppealDecisionDialog({
  appeal,
  open,
  onOpenChange,
  onDone,
}: {
  appeal: ReviewQueueAppeal;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void | Promise<void>;
}) {
  const [outcome, setOutcome] = React.useState<string>("");
  const [note, setNote] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setOutcome("");
      setNote("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (!["UPHELD", "OVERTURNED"].includes(outcome)) {
      setError("Choose an outcome.");
      return;
    }
    if (note.trim().length < 20) {
      setError("Publish a note of at least 20 characters — the appellant will read it.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reputation/appeals/${appeal.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, note: note.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (res.ok) {
        toast.success(outcome === "OVERTURNED" ? "Appeal overturned" : "Appeal upheld", {
          description:
            outcome === "OVERTURNED"
              ? "The flag now reads as cleared; the risk penalty is removed."
              : "The confirmation stands.",
        });
        onOpenChange(false);
        await onDone();
      } else {
        setError(body.error?.message ?? "Could not record the decision.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
            Decide the appeal
          </DialogTitle>
          <DialogDescription>
            @{appeal.flag.subject.handle} appeals the CONFIRMED flag filed by @
            {appeal.flag.reporter.handle} · filed {timeAgo(appeal.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Appeal grounds
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {appeal.reason}
            </p>
          </div>
          <EvidenceList evidence={appeal.flag.evidence} />
          <div className="space-y-2">
            <p className="text-xs font-semibold">Outcome</p>
            <RadioGroup value={outcome} onValueChange={setOutcome} className="gap-2">
              <div className="flex items-start gap-2 rounded-lg border border-border px-3 py-2.5">
                <RadioGroupItem value="UPHELD" id="ap-upheld" className="mt-0.5" />
                <Label htmlFor="ap-upheld" className="cursor-pointer text-xs font-normal leading-relaxed">
                  <span className="font-semibold text-destructive">Uphold</span> — the
                  confirmation stands after re-examination.
                </Label>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border px-3 py-2.5">
                <RadioGroupItem value="OVERTURNED" id="ap-overturned" className="mt-0.5" />
                <Label
                  htmlFor="ap-overturned"
                  className="cursor-pointer text-xs font-normal leading-relaxed"
                >
                  <span className="font-semibold text-primary">Overturn</span> — the flag reads as
                  cleared; the risk penalty is removed and it counts toward resolution history.
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <label htmlFor="appeal-note" className="mb-1.5 block text-xs font-semibold">
              Published note <span className="text-muted-foreground">(min 20 chars)</span>
            </label>
            <Textarea
              id="appeal-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What the re-examination found — the appellant will read this."
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
            Record decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

export function ReviewerQueueCard({
  queue,
  onChanged,
}: {
  queue: ReviewQueue | null;
  onChanged: () => void | Promise<void>;
}) {
  const [decide, setDecide] = React.useState<ReviewQueueFlag | null>(null);
  const [appealDecide, setAppealDecide] = React.useState<ReviewQueueAppeal | null>(null);

  return (
    <Card className="ts-card-hover min-w-0" data-testid="reviewer-queue-card">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Inbox className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">
            Human review queue
            <Badge variant="outline" className="ml-2 border-primary/40 bg-primary/10 text-[10px] font-bold text-primary">
              REVIEWER
            </Badge>
          </CardTitle>
          <CardDescription className="truncate">
            Every decision is yours, attributed and published — never automated
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            {queue?.reviewerHandleNote ??
              "Decisions are attributed to you as reviewer and published to both parties. You cannot decide a case you filed."}{" "}
            No automated significant decisions are made on this platform (NDPC guidance; DPIA gate
            belongs to Stage 8).
          </span>
        </p>

        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Gavel className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Open cases ({queue?.queue.length ?? 0})
          </p>
          {!queue || queue.queue.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
              Queue is empty — no flags awaiting a decision.
            </p>
          ) : (
            <ul className="mt-2 space-y-3" role="list">
              {queue.queue.map((f) => (
                <motion.li
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="min-w-0 rounded-xl border border-border px-3.5 py-3"
                  data-testid="review-queue-row"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {f.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold",
                        f.status === "UNDER_REVIEW"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {f.status === "UNDER_REVIEW" ? "Ready — subject responded" : "Awaiting subject response"}
                    </Badge>
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {timeAgo(f.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <PartyLine
                      role="Reporter"
                      handle={f.reporter.handle}
                      displayName={f.reporter.displayName}
                      level={f.reporter.assuranceLevel}
                    />
                    <PartyLine
                      role="Subject"
                      handle={f.subject.handle}
                      displayName={f.subject.displayName}
                      level={f.subject.assuranceLevel}
                    />
                  </div>
                  <p className="mt-2 line-clamp-3 rounded-lg bg-muted/40 px-3 py-2 text-[11px] leading-relaxed">
                    {f.description}
                  </p>
                  <div className="mt-2">
                    <EvidenceList evidence={f.evidence} />
                  </div>
                  <Button
                    size="sm"
                    className="mt-2.5 h-8"
                    onClick={() => setDecide(f)}
                    data-testid="decide-cta"
                  >
                    <Gavel className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Decide
                  </Button>
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Pending appeals ({queue?.appeals.length ?? 0})
          </p>
          {!queue || queue.appeals.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
              No pending appeals.
            </p>
          ) : (
            <ul className="mt-2 space-y-3" role="list">
              {queue.appeals.map((a) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="min-w-0 rounded-xl border border-amber-500/30 px-3.5 py-3"
                  data-testid="appeal-queue-row"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 bg-amber-500/10 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                    >
                      APPEAL · {a.flag.category}
                    </Badge>
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {timeAgo(a.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <PartyLine
                      role="Appellant"
                      handle={a.flag.subject.handle}
                      displayName={a.flag.subject.displayName}
                    />
                    <PartyLine
                      role="Reporter"
                      handle={a.flag.reporter.handle}
                      displayName={a.flag.reporter.displayName}
                    />
                  </div>
                  <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed">
                    <span className="font-semibold">Appeal grounds:</span> {a.reason}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2.5 h-8 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                    onClick={() => setAppealDecide(a)}
                    data-testid="appeal-decide-cta"
                  >
                    <Scale className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Decide appeal
                  </Button>
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Reviewer access is an operational grant — never a self-service setting.
        </p>
      </CardContent>

      {decide ? (
        <DecisionDialog
          flag={decide}
          open={decide !== null}
          onOpenChange={(v) => !v && setDecide(null)}
          onDone={onChanged}
        />
      ) : null}
      {appealDecide ? (
        <AppealDecisionDialog
          appeal={appealDecide}
          open={appealDecide !== null}
          onOpenChange={(v) => !v && setAppealDecide(null)}
          onDone={onChanged}
        />
      ) : null}
    </Card>
  );
}
