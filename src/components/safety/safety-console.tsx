"use client";

// TrustScore Stage 6 — SafetyConsole (verifier-side "Check Before You Deal").
// A signed-in member checks a counterparty by @handle, phone (consent-gated
// hash match — the raw number never leaves the request), a trust link, or a
// QR Trust Card scan payload. The assessment is SANITIZED: status, risk band,
// assurance level, signal chips, freshness, NDPA-style explanation — and the
// locked language: "No confirmed adverse signals found". NEVER "safe".
// Unavailable handles offer a Trust Request instead (one ask, 7-day expiry).

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldQuestion,
  AtSign,
  Phone,
  Link2,
  QrCode,
  Loader2,
  Search,
  ShieldCheck,
  ScanFace,
  BadgeCheck,
  Clock,
  FileCheck2,
  Send,
  CheckCircle2,
  Info,
  History,
  Flag,
  UserRound,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  SafetyCheckRunResponse,
  SafetyAssessment,
  SafetyChecksResponse,
  IdentityMe,
} from "@/lib/types";
import { FlagDialog } from "@/components/reputation/file-flag-card";
import { TabIntro, TabSurface } from "@/components/dashboard/tab-intro";
import { cn } from "@/lib/utils";

type Method = "handle" | "phone" | "link" | "qr";

const METHODS: { key: Method; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "handle", label: "@Handle", icon: AtSign },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "link", label: "Trust link", icon: Link2 },
  { key: "qr", label: "QR scan", icon: QrCode },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-muted text-muted-foreground border-border" },
  VERIFIED: { label: "Verified", className: "bg-primary/10 text-primary border-primary/30" },
  ESTABLISHED: { label: "Established", className: "bg-primary/15 text-primary border-primary/40" },
  CAUTION: {
    label: "Caution",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400",
  },
  HIGH_RISK: {
    label: "High risk",
    className: "bg-destructive/10 text-destructive border-destructive/40",
  },
  REVIEW_REQUIRED: {
    label: "Review required",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400",
  },
};

const RISK_META: Record<string, { label: string; className: string }> = {
  LOW: { label: "Low band", className: "text-primary" },
  MEDIUM: { label: "Medium band", className: "text-amber-600 dark:text-amber-400" },
  HIGH: { label: "High band", className: "text-destructive" },
};

const METHOD_LABEL: Record<string, string> = {
  HANDLE: "Handle check",
  PHONE: "Phone match",
  TRUST_LINK: "Trust link",
  QR: "QR scan",
};

function signalIcon(type: string) {
  if (type === "PHONE") return Phone;
  if (type === "BIOMETRIC") return ScanFace;
  return ShieldCheck;
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

function AssuranceDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Assurance level L${level} of L4`}>
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={cn(
            "h-1.5 w-3.5 rounded-full transition-colors",
            n <= level ? "bg-primary" : "bg-border"
          )}
        />
      ))}
      <span className="ml-1.5 text-[11px] font-semibold text-primary">L{level}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// The assessment panel — what a completed check shows
// ---------------------------------------------------------------------------

function AssessmentPanel({
  assessment,
  self,
  onFlag,
  canFile,
}: {
  assessment: SafetyAssessment;
  self: boolean;
  onFlag: (subjectHandle: string) => void;
  canFile: boolean;
}) {
  const status = STATUS_META[assessment.summary.status] ?? STATUS_META.NEW;
  const risk = RISK_META[assessment.summary.riskBand] ?? RISK_META.LOW;
  const [explOpen, setExplOpen] = React.useState(false);

  const assessedAgo = timeAgo(assessment.freshness.assessedAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      data-testid="safety-assessment"
      className="overflow-hidden rounded-xl border border-primary/25 bg-card shadow-sm"
    >
      {/* Headline band */}
      <div className="ts-assessment-band border-b border-primary/20 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("border font-semibold", status.className)}>{status.label}</Badge>
          <Badge variant="outline" className={cn("border", risk.className)}>
            {risk.label}
          </Badge>
          <AssuranceDots level={assessment.summary.assuranceLevel} />
          <span className="ml-auto text-[11px] font-medium text-muted-foreground">
            {METHOD_LABEL[assessment.method] ?? assessment.method}
          </span>
        </div>
        <p className="font-display mt-3 text-lg font-semibold leading-snug tracking-tight" data-testid="safety-headline">
          {assessment.headline}
        </p>
        {(assessment.subject?.displayName || assessment.subject?.handle) && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            {assessment.subject.displayName}
            {assessment.subject.handle && (
              <span className="font-mono text-primary">@{assessment.subject.handle}</span>
            )}
          </p>
        )}
        {self && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Info className="h-3 w-3" aria-hidden="true" />
            Your own profile — no receipt is written for self-checks.
          </p>
        )}
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        {/* Signals + credentials row */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Verified signals
            </p>
            {assessment.signals && assessment.signals.length > 0 ? (
              <ul className="mt-2 space-y-1.5" data-testid="safety-signals">
                {assessment.signals.map((s, i) => {
                  const Icon = signalIcon(s.type);
                  return (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 truncate font-medium">{s.hint}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {timeAgo(s.verifiedAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                No signals shared for this check.
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Evidence footprint
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-semibold tabular-nums">{assessment.credentialsCount}</span>
              <span className="text-muted-foreground">
                active credential{assessment.credentialsCount === 1 ? "" : "s"}
              </span>
            </p>
            {assessment.score && (
              <p className="mt-2 flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-muted-foreground">Score</span>
                <span className="font-semibold tabular-nums text-primary">
                  {assessment.score.score}/100
                </span>
                <span className="text-[11px] text-muted-foreground">
                  · confidence {assessment.score.confidence}%
                </span>
              </p>
            )}
            <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
              <Clock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              Assessment computed {assessedAgo}
              {assessment.freshness.fresh ? " · still fresh" : " · past its 24h horizon"}
              {assessment.attributes && assessment.attributes.length > 0 && (
                <> · {assessment.attributes.length} shared attribute{assessment.attributes.length === 1 ? "" : "s"}</>
              )}
            </p>
          </div>
        </div>

        {/* Explanation (NDPA §37 style — collapsible) */}
        <Collapsible open={explOpen} onOpenChange={setExplOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between px-2 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Why this assessment? (read the evidence)
              </span>
              <span aria-hidden="true">{explOpen ? "−" : "+"}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-1 space-y-2 rounded-lg border border-border/70 bg-muted/25 p-3.5">
              {assessment.explanation.map((line, i) => (
                <li key={i} className="text-[11px] leading-relaxed text-muted-foreground">
                  {line}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>

        {/* Locked language + receipt notice */}
        <div className="rounded-lg border border-border bg-background p-3.5">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            {assessment.language.disclaimer}
          </p>
          {!self && (
            <p className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <Send className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              This check was receipted: the member sees who checked and what was shown.
            </p>
          )}
          {!self && assessment.subject?.handle ? (
            <div className="mt-3 border-t border-border/70 pt-3">
              {canFile ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onFlag(assessment.subject!.handle!)}
                  data-testid="report-concern-cta"
                >
                  <Flag className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Report a serious concern about @{assessment.subject.handle}
                </Button>
              ) : (
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  <Flag className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  Flagging requires L2 verification (anti-gaming by design) — verify your identity
                  in the Overview tab to unlock it.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// The console
// ---------------------------------------------------------------------------

export function SafetyConsole() {
  const [method, setMethod] = React.useState<Method>("handle");
  const [value, setValue] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<SafetyCheckRunResponse | null>(null);
  const [flagSubject, setFlagSubject] = React.useState<string | null>(null);
  const [canFile, setCanFile] = React.useState(false);
  const [myLevel, setMyLevel] = React.useState(0);
  const [requestState, setRequestState] = React.useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent" }
    | { kind: "already" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [history, setHistory] = React.useState<SafetyChecksResponse | null>(null);

  const refreshHistory = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/safety/checks", { cache: "no-store" });
      if (res.ok) setHistory(await res.json());
    } catch {
      /* history is non-critical */
    }
  }, []);

  React.useEffect(() => {
    void refreshHistory();
    // Stage 7: flag eligibility (L2 gate) for the report-concern action.
    void (async () => {
      try {
        const res = await fetch("/api/v1/reputation/me", { cache: "no-store" });
        if (res.ok) {
          const me = (await res.json()) as { canFileFlags?: boolean; myAssuranceLevel?: number };
          setCanFile(Boolean(me.canFileFlags));
          setMyLevel(me.myAssuranceLevel ?? 0);
        }
      } catch {
        /* gate falls back to closed */
      }
    })();
  }, [refreshHistory]);

  async function runCheck() {
    if (!value.trim() || running) return;
    setRunning(true);
    setResult(null);
    setRequestState({ kind: "idle" });
    try {
      const body: Record<string, string> = {};
      if (method === "phone") body.phone = value.trim();
      else if (method === "link") body.link = value.trim();
      else if (method === "qr") body.qr = value.trim();
      else body.handle = value.trim().replace(/^@/, "");
      const res = await fetch("/api/v1/safety/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as SafetyCheckRunResponse & {
        error?: { message: string };
      };
      if (!res.ok) {
        setResult({
          outcome: "UNAVAILABLE",
          message: data.error?.message ?? "The check could not run. Try again.",
        });
      } else {
        setResult(data);
      }
      void refreshHistory();
    } catch {
      setResult({ outcome: "UNAVAILABLE", message: "Network error — try again." });
    } finally {
      setRunning(false);
    }
  }

  async function sendRequest() {
    const handle = value.trim().replace(/^@/, "").toLowerCase();
    if (!handle || requestState.kind === "sending") return;
    setRequestState({ kind: "sending" });
    try {
      const res = await fetch("/api/v1/safety/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      if (res.status === 201) {
        setRequestState({ kind: "sent" });
        void refreshHistory();
      } else if (res.status === 409) {
        setRequestState({ kind: "already" });
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        setRequestState({
          kind: "error",
          message: data.error?.message ?? "The request could not be sent.",
        });
      }
    } catch {
      setRequestState({ kind: "error", message: "Network error — try again." });
    }
  }

  const unavailableHandle = result?.outcome === "UNAVAILABLE" && method === "handle" && value.trim();

  return (
    <>
      <TabIntro
        eyebrow="Stage 6 · Verifier console"
        title="Check before you deal"
        description="Run a consented check by handle, phone fingerprint, Trust Link or QR — sanitized assessments only, with a receipt written to both sides."
      />
      <TabSurface className="grid min-w-0 gap-6 lg:grid-cols-5">
      {/* Check runner */}
      <div className="min-w-0 lg:col-span-3">
        <Card className="ts-card-hover min-w-0">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldQuestion className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">Check before you deal</CardTitle>
              <CardDescription className="truncate">
                Sanitized assessment of a member&apos;s Trust Identity — receipted, consent-backed
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <Tabs value={method} onValueChange={(v) => setMethod(v as Method)}>
              <TabsList aria-label="Check method" className="grid h-auto w-full grid-cols-4 p-1">
                {METHODS.map((m) => (
                  <TabsTrigger
                    key={m.key}
                    value={m.key}
                    data-testid={`safety-method-${m.key}`}
                    className="gap-1.5 py-1.5 text-xs font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                  >
                    <m.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{m.label}</span>
                    <span className="sm:hidden">{m.label.split(" ")[0]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="handle" className="mt-4">
                <label htmlFor="safety-input" className="text-xs font-medium text-muted-foreground">
                  Member handle
                </label>
                <div className="relative mt-1.5">
                  <AtSign
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="safety-input"
                    data-testid="safety-input"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void runCheck()}
                    placeholder="e.g. ada"
                    className="pl-9"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  The member controls this: handle checks need their standing consent, and every
                  check is receipted to them with your name.
                </p>
              </TabsContent>

              <TabsContent value="phone" className="mt-4">
                <label htmlFor="safety-input-phone" className="text-xs font-medium text-muted-foreground">
                  Their Nigerian mobile number
                </label>
                <Input
                  id="safety-input-phone"
                  data-testid="safety-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void runCheck()}
                  placeholder="0803 000 0000"
                  className="mt-1.5 font-mono"
                  autoComplete="off"
                  inputMode="tel"
                />
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  We match a <span className="font-semibold text-foreground">salted fingerprint</span> of
                  the number against verified members who opted in. The raw number is never stored,
                  logged or echoed — and no-match looks exactly like not-opted-in.
                </p>
              </TabsContent>

              <TabsContent value="link" className="mt-4">
                <label htmlFor="safety-input-link" className="text-xs font-medium text-muted-foreground">
                  Trust link (URL or token)
                </label>
                <Input
                  id="safety-input-link"
                  data-testid="safety-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void runCheck()}
                  placeholder="https://… /?trust=ts_… or ts_…"
                  className="mt-1.5 font-mono text-xs"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  The link&apos;s scopes govern exactly what you see; the open is counted against
                  its view limit and receipted to the owner with your name.
                </p>
              </TabsContent>

              <TabsContent value="qr" className="mt-4">
                <label htmlFor="safety-input-qr" className="text-xs font-medium text-muted-foreground">
                  QR Trust Card scan payload
                </label>
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5">
                  <QrCode className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Scan their QR Trust Card with your phone camera and paste the link it opens
                    (in this sandbox: any <span className="font-mono">/?trust=ts_…</span> URL).
                  </p>
                </div>
                <Input
                  id="safety-input-qr"
                  data-testid="safety-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void runCheck()}
                  placeholder="Paste the scanned trust link…"
                  className="mt-2 font-mono text-xs"
                  autoComplete="off"
                  spellCheck={false}
                />
              </TabsContent>
            </Tabs>

            <Button
              onClick={() => void runCheck()}
              disabled={running || !value.trim()}
              className="h-11 w-full font-semibold"
              data-testid="safety-run"
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Run safety check
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result area */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={`${result.outcome}-${result.checkId ?? "x"}`}
              data-testid="safety-result"
              data-checkid={result.checkId ?? "none"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              {result.outcome === "OK" && result.assessment && (
                <AssessmentPanel assessment={result.assessment} self={false} onFlag={(h) => setFlagSubject(h)} canFile={canFile} />
              )}
              {result.outcome === "SELF" && result.assessment && (
                <AssessmentPanel assessment={result.assessment} self onFlag={(h) => setFlagSubject(h)} canFile={canFile} />
              )}
              {result.outcome === "UNAVAILABLE" && (
                <div
                  data-testid="safety-unavailable"
                  className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {result.message}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    This is deliberate: TrustScore never reveals whether a handle exists, and
                    members choose whether they can be checked. No data was returned or stored
                    about this lookup.
                  </p>
                  {unavailableHandle && (
                    <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-4">
                      <p className="text-xs font-semibold text-primary">
                        Ask them to share their Trust Card instead
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                        A trust request is one polite ask: they accept (a scoped, receipted link is
                        minted) or decline. It expires after 7 days.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => void sendRequest()}
                          disabled={requestState.kind === "sending" || requestState.kind === "sent"}
                          data-testid="safety-request-btn"
                        >
                          {requestState.kind === "sending" ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-3.5 w-3.5" />
                          )}
                          Send trust request
                        </Button>
                        {requestState.kind === "sent" && (
                          <span
                            className="flex items-center gap-1.5 text-xs font-medium text-primary"
                            data-testid="safety-request-sent"
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            Request sent — they have 7 days to respond.
                          </span>
                        )}
                        {requestState.kind === "already" && (
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                            You already have a pending request with this member.
                          </span>
                        )}
                        {requestState.kind === "error" && (
                          <span className="text-xs font-medium text-destructive">
                            {requestState.message}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {result.outcome === "DEAD_LINK" && (
                <div
                  data-testid="safety-dead-link"
                  className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldAlert
                      className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                      aria-hidden="true"
                    />
                    This trust link is no longer live
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {result.reason === "REVOKED"
                      ? "The owner revoked it."
                      : result.reason === "VIEW_LIMIT"
                        ? "It reached its view limit."
                        : "It expired."}{" "}
                    Ask the member for a fresh link — every link is scoped, counted and receipted.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History + requests */}
      <div className="min-w-0 lg:col-span-2">
        <Card className="ts-card-hover min-w-0">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">Your checks</CardTitle>
              <CardDescription className="truncate">History of checks you ran</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {history && history.checks.length > 0 ? (
              <ul
                className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1"
                data-testid="safety-history"
              >
                {history.checks.map((c) => {
                  const st = STATUS_META[c.status ?? ""] ?? STATUS_META.NEW;
                  return (
                    <li
                      key={c.id}
                      data-testid="safety-history-row"
                      className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/25 px-3.5 py-2.5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {c.method === "QR" ? (
                          <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : c.method === "PHONE" ? (
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : c.method === "TRUST_LINK" ? (
                          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <AtSign className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">
                          {c.self
                            ? "Self-check"
                            : c.subject
                              ? `@${c.subject.handle}`
                              : "Unknown member"}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {c.headline ?? "—"}
                        </p>
                      </div>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold", st.className)}
                        >
                          {st.label}
                        </span>
                        <time className="text-[9px] text-muted-foreground" dateTime={c.checkedAt}>
                          {timeAgo(c.checkedAt)}
                        </time>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-border py-7 text-center">
                <Search className="mx-auto h-6 w-6 text-muted-foreground/50" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">No checks yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Run your first check — every result is kept here.
                </p>
              </div>
            )}

            {/* Sent trust requests */}
            {history && history.requests.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Trust requests you sent
                </p>
                <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {history.requests.map((r) => (
                    <li
                      key={r.id}
                      data-testid="safety-request-row"
                      className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/25 px-3.5 py-2.5"
                    >
                      <Send className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">
                          {r.subject ? `@${r.subject.handle}` : "Member"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">sent {timeAgo(r.createdAt)}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold",
                          r.status === "PENDING"
                            ? "border-primary/30 bg-primary/5 text-primary"
                            : r.status === "ACCEPTED"
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {r.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage 7 — flag filing (prefilled with the checked subject) */}
        <FlagDialog
          open={flagSubject !== null}
          onOpenChange={(v) => !v && setFlagSubject(null)}
          prefillSubject={flagSubject ?? undefined}
          canFile={canFile}
          myAssuranceLevel={myLevel}
          onFiled={() => undefined}
        />
      </div>
      </TabSurface>
    </>
  );
}
