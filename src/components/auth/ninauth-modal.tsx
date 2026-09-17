"use client";

// TrustScore Stage 16 — NinAuthModal: the passwordless "Continue with
// NINAuth" sign-in experience. It simulates the NINAuth app side of the
// OAuth flow exactly as the developer guide models authentication:
//   start → approve inside NINAuth (binding identity + granular scopes)
//        → signed assertion → TrustScore account bind / link / create.
//
// MOCK posture is labeled honestly: the simulated app binds to an email the
// user confirms here (the stand-in for the biometrically-bound NINAuth
// identity). In LIVE posture the real NINAuth app shows this same consent
// contract and redirects with the code — this modal's approval section
// disappears, nothing else changes.
//
// Brand rule (NINAuth developer guide): the auth action uses the NINAuth
// white/green treatment, never an arbitrary color.

import * as React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FileCheck2,
  Lock,
  Mail,
  Fingerprint,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTrustStore } from "@/lib/store";
import type { ConsentScreenInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface NinAuthSessionInfo {
  id: string;
  status: string;
  authorizationUrl: string;
  purpose: string;
  provider: string;
  providerMode: string;
  expiresAt: string;
  ttlMs: number;
}

export interface NinAuthModalProps {
  open: boolean;
  session: NinAuthSessionInfo | null;
  consent: ConsentScreenInfo | null;
  /** Pre-fill from the email field the user may already have typed. */
  initialEmail: string;
  onDismiss: () => void;
}

export function NinAuthModal({
  open,
  session,
  consent,
  initialEmail,
  onDismiss,
}: NinAuthModalProps) {
  const { setUser } = useTrustStore();
  const [msLeft, setMsLeft] = React.useState(0);
  const [email, setEmail] = React.useState(initialEmail);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [optionalOn, setOptionalOn] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setEmail(initialEmail);
    setEmailError(null);
    setOptionalOn({}); // privacy-first: optional scopes start OFF
    setError(null);
  }, [open, session?.id, initialEmail]);

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

  async function decide(decision: "GRANT" | "DENY") {
    if (!session) return;
    if (decision === "GRANT") {
      const mail = email.trim().toLowerCase();
      if (!EMAIL_RE.test(mail)) {
        setEmailError("Enter the email your NINAuth identity is bound to");
        return;
      }
      setEmailError(null);
      setBusy(true);
      setError(null);
      try {
        // 1. The (mock) NINAuth app issues the one-time code on approval.
        const approveRes = await fetch(
          `/api/v1/auth/ninauth/${session.id}/approve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              decision: "GRANT",
              email: mail,
              grantedScopes,
            }),
          }
        );
        const approved = await approveRes.json();
        if (!approveRes.ok) {
          setError(approved?.error?.message ?? "NINAuth did not approve the sign-in.");
          return;
        }
        // 2. The callback contract: code + state → assertion validation →
        //    account bind/link/create → session cookie.
        const cbRes = await fetch(`/api/v1/auth/ninauth/${session.id}/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: approved.code, state: approved.state }),
        });
        const finished = await cbRes.json();
        if (!cbRes.ok) {
          setError(finished?.error?.message ?? "The NINAuth sign-in failed. Start again.");
          return;
        }
        setUser(finished.user);
        onDismiss();
      } catch {
        setError("Network error — try again.");
      } finally {
        setBusy(false);
      }
    } else {
      // DENY — no account access, audited, and the modal closes.
      setBusy(true);
      try {
        await fetch(`/api/v1/auth/ninauth/${session.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: "DENY", email: "deny@ninauth.local" }),
        });
      } catch {
        /* best-effort */
      } finally {
        setBusy(false);
        onDismiss();
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onDismiss()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Fingerprint className="h-5 w-5" />
            </span>
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-amber-500/10 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
            >
              MOCK NINAUTH APP
            </Badge>
          </div>
          <DialogTitle className="text-left text-lg leading-snug">
            Continue with NINAuth
          </DialogTitle>
          <DialogDescription className="text-left text-xs">
            This simulates the NINAuth app (NIMC). You confirm the identity that
            signs in and approve exactly what TrustScore may receive — the same
            consent contract the real app shows.
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
                {expired ? "Sign-in window expired" : "Approve within"}
              </span>
              <span className={cn("font-mono font-semibold", !expired && "text-foreground")}>
                {formatCountdown(msLeft)}
              </span>
            </div>

            {/* Binding identity — the mock stand-in for the biometrically-
                bound NINAuth identity. LIVE: this field disappears. */}
            <div className="space-y-2">
              <Label htmlFor="ninauth-email" className="text-xs">
                Your NINAuth identity <span className="text-muted-foreground">(email in mock mode)</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="ninauth-email"
                  className="pl-9"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!emailError}
                  disabled={busy}
                />
              </div>
              {emailError ? (
                <p className="text-xs text-destructive">{emailError}</p>
              ) : (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Existing accounts with this email are linked to NINAuth sign-in;
                  new identities create a passwordless account. Your raw NIN is
                  never seen or stored — only a masked reference.
                </p>
              )}
            </div>

            {/* Consent fields — core (locked) + optional (opt-in) */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What TrustScore will receive
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
                    Optional — used only to name a new account:
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
                Passwordless by design — no password is ever set or needed.
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

            {/* Actions — NINAuth brand treatment: white approve, quiet deny */}
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                onClick={() => void decide("GRANT")}
                disabled={busy || expired}
                className="flex-1 gap-2 border border-emerald-600/40 bg-white text-emerald-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-800 dark:bg-white dark:text-emerald-700 dark:hover:bg-emerald-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Approve &amp; continue
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => void decide("DENY")}
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
