"use client";

// TrustScore Stage 4 — Phone verification modal (SMS OTP, contract-first
// MOCK transport). Three steps: consent + number entry → OTP entry (with the
// honestly-labeled MOCK delivery panel) → success + ladder escalation.

import * as React from "react";
import {
  Phone,
  ShieldCheck,
  MessageSquare,
  Loader2,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Fingerprint,
  AlertCircle,
  ChevronRight,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  PhoneStartResponse,
  PhoneConfirmResponse,
  PhoneInboxResponse,
  ApiErrorBody,
} from "@/lib/types";

function extractCode(message: string): string {
  const m = message.match(/\b(\d{6})\b/);
  return m ? m[1] : "";
}

function countdown(msLeft: number): string {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface PhoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

export function PhoneVerifyModal({ open, onOpenChange, onVerified }: PhoneModalProps) {
  const [step, setStep] = React.useState<"entry" | "otp" | "done">("entry");
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [startData, setStartData] = React.useState<PhoneStartResponse | null>(null);
  const [attemptsLeft, setAttemptsLeft] = React.useState<number | null>(null);
  const [cooldownSec, setCooldownSec] = React.useState(0);
  const [expiryMs, setExpiryMs] = React.useState<number>(0);
  const [tick, setTick] = React.useState(0);
  const [confirmResult, setConfirmResult] = React.useState<PhoneConfirmResponse | null>(null);
  // Stage 13 — sandbox SMS inbox (loopback posture: the code lives in the
  // carrier's inbox, never echoed by the API — the LIVE delivery contract).
  const [inbox, setInbox] = React.useState<PhoneInboxResponse | null>(null);
  const [inboxBusy, setInboxBusy] = React.useState(false);
  const loopback = startData?.delivery.mode === "LIVE";

  async function loadInbox() {
    setInboxBusy(true);
    try {
      const res = await fetch("/api/v1/identity/signals/phone/inbox", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as PhoneInboxResponse & {
        error?: { message?: string };
      };
      if (res.ok) {
        setInbox(data);
        toast.success("Sandbox inbox refreshed", {
          description: `${data.messages.length} message${data.messages.length === 1 ? "" : "s"} received for ${data.phoneHint ?? "your number"}.`,
        });
      } else {
        toast.error("Inbox unavailable", {
          description: data.error?.message ?? "Could not read the sandbox inbox.",
        });
      }
    } catch {
      toast.error("Inbox unavailable", { description: "Network error." });
    } finally {
      setInboxBusy(false);
    }
  }

  // reset on open
  React.useEffect(() => {
    if (open) {
      setStep("entry");
      setPhone("");
      setCode("");
      setBusy(false);
      setError(null);
      setStartData(null);
      setAttemptsLeft(null);
      setCooldownSec(30);
      setConfirmResult(null);
      setInbox(null);
    }
  }, [open]);

  // cooldown + expiry ticker
  React.useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      setCooldownSec((s) => (s > 0 ? s - 1 : 0));
      setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [open]);

  async function apiCall(path: string, body: object): Promise<{ ok: boolean; status: number; data: unknown }> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  }

  async function handleStart() {
    setError(null);
    setBusy(true);
    const { ok, status, data } = await apiCall("/api/v1/identity/signals/phone/start", { phone });
    setBusy(false);
    if (!ok) {
      const err = data as ApiErrorBody | null;
      setError(err?.error?.message ?? "Could not start verification.");
      return;
    }
    const body = data as PhoneStartResponse;
    setStartData(body);
    setAttemptsLeft(body.verification.attemptsLeft);
    setExpiryMs(new Date(body.verification.expiresAt).getTime() - Date.now());
    setCooldownSec(30);
    setStep("otp");
  }

  async function handleResend() {
    if (!startData || cooldownSec > 0) return;
    setError(null);
    setBusy(true);
    const { ok, data } = await apiCall("/api/v1/identity/signals/phone/resend", {
      verificationId: startData.verification.id,
    });
    setBusy(false);
    if (!ok) {
      const err = data as ApiErrorBody | null;
      setError(err?.error?.message ?? "Could not resend the code.");
      return;
    }
    const body = data as PhoneStartResponse;
    setStartData(body);
    setAttemptsLeft(body.verification.attemptsLeft);
    setExpiryMs(new Date(body.verification.expiresAt).getTime() - Date.now());
    setCooldownSec(30);
    setCode("");
    toast.success("New code sent", {
      description: "The previous code is no longer valid.",
    });
  }

  async function handleConfirm() {
    if (!startData || code.length !== 6) return;
    setError(null);
    setBusy(true);
    const { ok, data } = await apiCall("/api/v1/identity/signals/phone/confirm", {
      verificationId: startData.verification.id,
      code,
    });
    setBusy(false);
    if (!ok) {
      const err = data as (ApiErrorBody & { error?: { code?: string } }) | null;
      setError(err?.error?.message ?? "Verification failed.");
      if (err?.error?.code === "OTP_INVALID") {
        setAttemptsLeft((n) => (n === null ? null : Math.max(0, n - 1)));
        setCode("");
      }
      if (err?.error?.code === "LOCKED" || err?.error?.code === "EXPIRED") {
        setAttemptsLeft(0);
      }
      return;
    }
    const body = data as PhoneConfirmResponse;
    setConfirmResult(body);
    setStep("done");
    if (body.escalated) {
      toast.success("Phone verified — Assurance Level 2", {
        description: "Your number is bound to your Trust Identity as a fingerprint only.",
      });
    }
    onVerified();
  }

  const previewCode = startData && !loopback ? extractCode(startData.delivery.message) : "";
  const inboxCode = inbox?.messages?.[0] ? extractCode(inbox.messages[0].text) : "";
  const msLeft = expiryMs - tick * 1000;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                step === "done" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
              )}
              aria-hidden="true"
            >
              {step === "done" ? <CheckCircle2 className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base">
                {step === "entry" && "Verify your phone"}
                {step === "otp" && "Enter the code we sent"}
                {step === "done" && "Phone verified"}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {step === "entry" && "Bind your number via SMS OTP — Assurance Level 2"}
                {step === "otp" && startData?.verification.phoneHint}
                {step === "done" && "Bound to your Trust Identity"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Check failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "entry" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-input">Nigerian mobile number</Label>
              <div className="flex items-center gap-2">
                <span className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm font-medium text-muted-foreground">
                  +234
                </span>
                <Input
                  id="phone-input"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="801 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && phone.trim().length >= 10 && handleStart()}
                  aria-describedby="phone-help"
                />
              </div>
              <p id="phone-help" className="text-xs text-muted-foreground">
                NG mobile numbers (MTN, Airtel, Glo, 9mobile…). Local 0-prefix, +234 or bare format.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  We store only a <span className="font-medium text-foreground">salted fingerprint</span> of your
                  number — never the number itself — plus a masked hint for display.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  By continuing you consent to a one-time SMS check (NDPA §31). You can withdraw anytime and the
                  signal is revoked.
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleStart}
              disabled={busy || phone.trim().length < 10}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
              Send verification code
            </Button>
          </div>
        )}

        {step === "otp" && startData && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-1">
              <InputOTP maxLength={6} value={code} onChange={setCode} disabled={busy}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-live="polite">
                <span>
                  Expires in <span className="font-mono font-medium text-foreground">{countdown(msLeft)}</span>
                </span>
                {attemptsLeft !== null && attemptsLeft > 0 && (
                  <span>
                    {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left
                  </span>
                )}
              </div>
            </div>

            {/* Delivery panel — honestly labeled per posture:
                MOCK echoes the message (sandbox test surface);
                loopback/LIVE never echo the code — the sandbox SMS inbox
                holds what the carrier received (Stage 13). */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3" data-testid="delivery-panel">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  {loopback ? "Sandbox carrier" : "Simulated SMS"}
                </span>
                <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                  {startData.delivery.provider} · {startData.delivery.mode}
                </Badge>
              </div>
              <p className="mt-2 rounded-md bg-background/80 px-3 py-2 text-xs leading-relaxed">
                {startData.delivery.message}
              </p>

              {loopback ? (
                <div className="mt-2.5 space-y-2" data-testid="sandbox-inbox">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full gap-1.5 text-xs"
                    onClick={loadInbox}
                    disabled={inboxBusy}
                  >
                    {inboxBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Open sandbox SMS inbox
                  </Button>
                  {inbox && (
                    <div className="space-y-1.5">
                      {inbox.messages.length === 0 ? (
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          No messages yet — the carrier should have received one for {inbox.phoneHint}.
                        </p>
                      ) : (
                        inbox.messages.slice(0, 2).map((m) => (
                          <div
                            key={m.id}
                            className="rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed"
                          >
                            {m.text}
                          </div>
                        ))
                      )}
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        {inbox.note}
                      </p>
                      {inboxCode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary"
                          onClick={() => {
                            setCode(inboxCode);
                            toast.info("Code filled from the sandbox inbox");
                          }}
                        >
                          <ChevronRight className="mr-1 h-3 w-3" /> Use the code from the inbox
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                    In sandbox the code is surfaced here for testing. In LIVE mode it is only delivered to your
                    handset — never shown in the app.
                  </p>
                  {previewCode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-7 text-xs text-primary"
                      onClick={() => {
                        setCode(previewCode);
                        toast.info("Code filled from the simulated SMS");
                      }}
                    >
                      <ChevronRight className="mr-1 h-3 w-3" /> Use this code
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleResend}
                disabled={busy || cooldownSec > 0 || (startData.verification.resendsLeft ?? 0) <= 0}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", busy && "animate-spin")} />
                {cooldownSec > 0 ? `Resend in ${cooldownSec}s` : "Resend code"}
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={busy || code.length !== 6}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Verify
              </Button>
            </div>
          </div>
        )}

        {step === "done" && confirmResult && (
          <div className="space-y-4">
            <div className="ts-signal-success rounded-xl border border-primary/30 p-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold">
                {confirmResult.verification.phoneHint} is bound to your identity
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Assurance Level {confirmResult.assuranceLevel} · valid 90 days · stored as a fingerprint only
              </p>
              {confirmResult.simSwapRisk === "HIGH" && (
                <p className="mt-2 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400">
                  SIM-swap risk detected — cross-signal consistency will stay limited until the line stabilises.
                </p>
              )}
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-primary" aria-hidden="true" />
                Add a biometric liveness check to reach Level 3.
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-primary" aria-hidden="true" />
                Withdraw this consent anytime from the Trust signals card.
              </li>
            </ul>
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
