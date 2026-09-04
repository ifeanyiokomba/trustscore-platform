"use client";

import * as React from "react";
import {
  ShieldCheck,
  BadgeCheck,
  Lock,
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  Clock,
  FileCheck2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import type { ConsentScreenInfo, VerificationSessionInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Deterministic decorative QR placeholder — clearly labeled MOCK.
function MockQr({ seed }: { seed: string }) {
  const cells = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const out: boolean[] = [];
    let state = h || 1;
    for (let i = 0; i < 144; i++) {
      state = (state * 1103515245 + 12345) >>> 0;
      out.push(((state >>> 16) & 1) === 1);
    }
    return out;
  }, [seed]);

  return (
    <div
      className="grid grid-cols-12 gap-[2px] rounded-lg border-2 border-foreground/80 bg-white p-2 dark:bg-white"
      role="img"
      aria-label="Decorative mock QR code — not scannable"
    >
      {cells.map((on, i) => (
        <span
          key={i}
          className={cn(
            "aspect-square rounded-[1px]",
            on ? "bg-foreground/90" : "bg-white"
          )}
        />
      ))}
    </div>
  );
}

export interface ConsentModalProps {
  open: boolean;
  session: VerificationSessionInfo | null;
  consent: ConsentScreenInfo | null;
  busy: boolean;
  error: string | null;
  onDecision: (decision: "GRANT" | "DENY", grantedScopes?: string[]) => void;
  onDismiss: () => void;
}

export function ConsentModal({
  open,
  session,
  consent,
  busy,
  error,
  onDecision,
  onDismiss,
}: ConsentModalProps) {
  const [msLeft, setMsLeft] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  // Stage 3 — granular consent: optional scopes are opt-in (privacy-first
  // default OFF). Core scopes are required and locked.
  const [optionalOn, setOptionalOn] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!open) return;
    setOptionalOn({}); // reset to privacy-first defaults each time
  }, [open, session?.id]);

  React.useEffect(() => {
    if (!open || !session) return;
    const tick = () => setMsLeft(new Date(session.expiresAt).getTime() - Date.now());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [open, session]);

  const expired = msLeft <= 0;

  const coreFields = (consent?.fields ?? []).filter((f) => f.core);
  const optionalFields = (consent?.fields ?? []).filter((f) => !f.core);
  const grantedScopes = [
    ...coreFields.map((f) => f.scope),
    ...optionalFields.filter((f) => optionalOn[f.scope]).map((f) => f.scope),
  ];
  const attributeCount = optionalFields
    .filter((f) => optionalOn[f.scope])
    .reduce((n, f) => n + (f.scope === "profile.name" || f.scope === "profile.demographics" ? 2 : 0), 0);

  async function copyShareCode() {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onDismiss()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-amber-500/10 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
            >
              MOCK PROVIDER
            </Badge>
          </div>
          <DialogTitle className="text-left text-lg leading-snug">
            {consent?.requester ?? "TrustScore"} wants to verify your identity
          </DialogTitle>
          <DialogDescription className="text-left text-xs">
            This simulates the consent screen in your NINAuth app (NIMC). The real
            app shows the same contract: requester, data fields, and purpose.
          </DialogDescription>
        </DialogHeader>

        {session && consent && (
          <div className="space-y-4">
            {/* Countdown */}
            <div
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
                expired
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-muted/50 text-muted-foreground"
              )}
              role="status"
              aria-live="polite"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {expired ? "Session expired" : "Session expires in"}
              </span>
              <span className={cn("font-mono font-semibold", !expired && "text-foreground")}>
                {formatCountdown(msLeft)}
              </span>
            </div>

            {/* QR / share code panel */}
            <div className="grid grid-cols-[auto,1fr] items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
              <MockQr seed={session.id} />
              <div className="min-w-0 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <QrCode className="h-3.5 w-3.5" />
                  Scan or share code
                </p>
                <button
                  type="button"
                  onClick={copyShareCode}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-sm font-semibold tracking-wider transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Copy share code ${session.shareCode}`}
                >
                  {session.shareCode}
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  )}
                </button>
                <p className="truncate text-[10px] text-muted-foreground" title={session.authorizationUrl}>
                  {session.authorizationUrl}
                </p>
              </div>
            </div>

            {/* Consent fields — core (locked) + optional (opt-in checkboxes) */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Data that will be shared
              </p>
              {coreFields.map((f) => (
                <div
                  key={f.scope}
                  className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5"
                >
                  <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-border bg-muted/60 text-[10px] font-medium text-muted-foreground"
                  >
                    Required
                  </Badge>
                </div>
              ))}
              {optionalFields.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    Optional — opt in to add these verified attributes to your profile:
                  </p>
                  {optionalFields.map((f) => {
                    const on = !!optionalOn[f.scope];
                    return (
                      <label
                        key={f.scope}
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                          on
                            ? "border-primary/40 bg-primary/5"
                            : "border-border hover:border-primary/25"
                        )}
                      >
                        <Checkbox
                          checked={on}
                          onCheckedChange={(c) =>
                            setOptionalOn((prev) => ({ ...prev, [f.scope]: c === true }))
                          }
                          className="mt-0.5"
                          aria-label={`Share ${f.label}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{f.label}</p>
                          <p className="text-xs text-muted-foreground">{f.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Purpose:</span>{" "}
                {consent.purpose.replaceAll("_", " ").toLowerCase()}
              </p>
              <p>
                <span className="font-medium text-foreground">Policy version:</span>{" "}
                <span className="font-mono">{consent.policyVersion}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Your raw NIN is never shared — only a masked verification reference.
              </p>
            </div>

            {error && (
              <p
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                onClick={() => onDecision("GRANT", grantedScopes)}
                disabled={busy || expired}
                className="flex-1"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve{attributeCount > 0 ? ` · ${attributeCount} attributes` : ""}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => onDecision("DENY")}
                disabled={busy || expired}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Deny
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
