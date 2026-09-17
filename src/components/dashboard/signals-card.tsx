"use client";

// TrustScore Stage 4 — Trust signals card: phone binding, biometric liveness,
// cross-signal consistency. Withdrawals go through the confirm dialog (same
// destructive-action discipline as the identity card).

import * as React from "react";
import { motion } from "framer-motion";
import {
  Phone,
  ScanFace,
  Network,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Plus,
  RefreshCw,
  Check,
  X,
  Fingerprint,
  BadgeCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import type { SignalsMe, ApiErrorBody } from "@/lib/types";

function timeLeft(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "expired";
  return `Valid ${days} more day${days === 1 ? "" : "s"}`;
}

function statusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Active",
        className: "border-primary/40 bg-primary/10 text-primary",
      };
    case "REVOKED":
      return {
        label: "Withdrawn",
        className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      };
    case "EXPIRED":
      return {
        label: "Expired",
        className: "border-muted bg-muted/40 text-muted-foreground",
      };
    default:
      return { label: "Not set up", className: "border-dashed border-border text-muted-foreground" };
  }
}

interface SignalsCardProps {
  signals: SignalsMe | null;
  loading: boolean;
  hasIdentity: boolean;
  onPhoneVerify: () => void;
  onLiveness: () => void;
  onChanged: () => void;
}

export function SignalsCard({
  signals,
  loading,
  hasIdentity,
  onPhoneVerify,
  onLiveness,
  onChanged,
}: SignalsCardProps) {
  const [withdrawTarget, setWithdrawTarget] = React.useState<{ consentId: string; label: string } | null>(null);
  const [withdrawBusy, setWithdrawBusy] = React.useState(false);

  async function handleWithdraw() {
    if (!withdrawTarget) return;
    setWithdrawBusy(true);
    const res = await fetch(`/api/v1/identity/consents/${withdrawTarget.consentId}/withdraw`, {
      method: "POST",
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    setWithdrawBusy(false);
    setWithdrawTarget(null);
    if (!res.ok) {
      const err = data as ApiErrorBody | null;
      toast.error("Withdrawal failed", { description: err?.error?.message ?? "Please try again." });
      return;
    }
    const body = data as { revokedIdentifiers?: number };
    toast.success("Signal withdrawn", {
      description: `${body.revokedIdentifiers ?? 1} signal binding(s) revoked — the ladder de-escalates immediately.`,
    });
    onChanged();
  }

  if (loading) {
    return (
      <Card className="ts-card-hover min-w-0">
        <CardContent className="flex items-center justify-center py-16 text-muted-foreground" role="status">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your trust signals…
        </CardContent>
      </Card>
    );
  }

  const phone = signals?.phone;
  const biometric = signals?.biometric;
  const crossSignal = signals?.crossSignal;
  const phoneStatus = statusBadge(phone?.status ?? "NONE");
  const biometricStatus = statusBadge(biometric?.status ?? "NONE");

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Network className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Trust signals</CardTitle>
          <CardDescription className="truncate">
            Phone + biometric bindings — assurance escalates as signals agree
          </CardDescription>
        </div>
        <Badge variant="outline" className="ml-auto shrink-0 border-primary/40 bg-primary/5 text-[10px] text-primary">
          Stage 4
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasIdentity ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <Fingerprint className="h-6 w-6 text-muted-foreground/60" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground/80">Signals unlock after Level 1</p>
            <p className="max-w-xs text-xs leading-snug text-muted-foreground">
              Verify your government identity through NINAuth first — a phone or selfie alone never
              establishes identity.
            </p>
          </div>
        ) : (
          <>
            {/* ---- Phone signal ---- */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "rounded-xl border p-3.5",
                phone?.status === "ACTIVE"
                  ? "border-primary/30 bg-primary/5"
                  : phone?.status === "REVOKED" || phone?.status === "EXPIRED"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border bg-muted/20"
              )}
              aria-label="Phone signal"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    phone?.status === "ACTIVE"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  <Phone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">Verified phone</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {phone?.hint ?? "No number bound yet"}
                  </p>
                </div>
                <Badge variant="outline" className={cn("shrink-0 text-[10px]", phoneStatus.className)}>
                  {phoneStatus.label}
                </Badge>
              </div>

              {phone?.status === "ACTIVE" && (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3 text-primary" aria-hidden="true" />
                    OTP-verified
                  </span>
                  <span>{timeLeft(phone.expiresAt)}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px font-semibold",
                      phone.simSwapRisk === "HIGH"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : phone.simSwapRisk === "MEDIUM"
                          ? "bg-amber-500/10 text-amber-600/80 dark:text-amber-400/80"
                          : "bg-primary/10 text-primary"
                    )}
                  >
                    SIM-swap: {phone.simSwapRisk?.toLowerCase() ?? "low"}
                  </span>
                  {phone.consentId && (
                    <button
                      className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                      onClick={() =>
                        setWithdrawTarget({ consentId: phone.consentId!, label: "phone" })
                      }
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              )}

              {(phone?.status === "NONE" || phone?.status === "REVOKED" || phone?.status === "EXPIRED") && (
                <Button
                  variant={phone?.status === "NONE" ? "default" : "outline"}
                  size="sm"
                  className="mt-2.5 w-full"
                  onClick={onPhoneVerify}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {phone?.status === "NONE" ? "Verify phone (L2)" : "Re-bind a phone (L2)"}
                </Button>
              )}
            </motion.div>

            {/* ---- Biometric signal ---- */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
              className={cn(
                "rounded-xl border p-3.5",
                biometric?.status === "ACTIVE"
                  ? "border-primary/30 bg-primary/5"
                  : biometric?.status === "REVOKED" || biometric?.status === "EXPIRED"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border bg-muted/20"
              )}
              aria-label="Biometric signal"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    biometric?.status === "ACTIVE"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  <ScanFace className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">Biometric liveness</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {biometric?.status === "ACTIVE"
                      ? "Selfie matched to your government record"
                      : "Not checked yet"}
                  </p>
                </div>
                <Badge variant="outline" className={cn("shrink-0 text-[10px]", biometricStatus.className)}>
                  {biometricStatus.label}
                </Badge>
              </div>

              {biometric?.status === "ACTIVE" && biometric.lastScores && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BadgeCheck className="h-3 w-3 text-primary" aria-hidden="true" />
                      Liveness {biometric.lastScores.liveness}/100
                    </span>
                    <span>Face match {biometric.lastScores.faceMatch}/100</span>
                    <span>{timeLeft(biometric.expiresAt)}</span>
                    {biometric.consentId && (
                      <button
                        className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                        onClick={() =>
                          setWithdrawTarget({ consentId: biometric.consentId!, label: "biometric" })
                        }
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div
                      className="ts-conf-fill h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                      style={{ width: `${Math.min(100, biometric.lastScores.confidence)}%` }}
                    />
                  </div>
                </div>
              )}

              {(biometric?.status === "NONE" || biometric?.status === "REVOKED" || biometric?.status === "EXPIRED") && (
                <Button
                  variant={biometric?.status === "NONE" ? "default" : "outline"}
                  size="sm"
                  className="mt-2.5 w-full"
                  onClick={onLiveness}
                >
                  <ScanFace className="mr-1.5 h-3.5 w-3.5" />
                  {biometric?.status === "NONE" ? "Run liveness check (L3)" : "Re-run liveness (L3)"}
                </Button>
              )}
            </motion.div>

            {/* ---- Cross-signal consistency ---- */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.16 }}
              className={cn(
                "rounded-xl border p-3.5",
                crossSignal?.consistent
                  ? "ts-signal-success border-primary/30"
                  : "border-dashed border-border bg-muted/20"
              )}
              aria-label="Cross-signal consistency"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    crossSignal?.consistent
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  {crossSignal?.consistent ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">Cross-signal consistency</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {crossSignal?.consistent
                      ? "All signals agree — Level 4 unlocked"
                      : `Level ${crossSignal?.eligibleLevel ?? 0} — signals still building`}
                  </p>
                </div>
                {crossSignal?.consistent && (
                  <Badge variant="outline" className="shrink-0 border-primary/40 bg-primary/10 text-[10px] text-primary">
                    <Check className="mr-1 h-3 w-3" /> L4
                  </Badge>
                )}
              </div>

              <ul className="mt-2.5 space-y-1">
                {(crossSignal?.checks ?? []).map((check) => (
                  <li key={check.key} className="flex items-start gap-2 text-[11px] leading-snug">
                    {check.ok ? (
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                    ) : (
                      <X className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                    )}
                    <span className={check.ok ? "text-foreground/80" : "text-muted-foreground"}>
                      {check.label}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* provider honesty labels */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {signals?.providers.phone.name ?? "SMS_MOCK"} · {signals?.providers.phone.mode ?? "MOCK"}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {signals?.providers.liveness.name ?? "LIVENESS_MOCK"} ·{" "}
                {signals?.providers.liveness.mode ?? "MOCK"}
              </Badge>
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" aria-hidden="true" /> LIVE transports arrive with partner
                credentials
              </span>
            </div>
          </>
        )}
      </CardContent>

      {/* Withdrawal confirm (destructive action discipline) */}
      <AlertDialog
        open={withdrawTarget !== null}
        onOpenChange={(o) => !withdrawBusy && !o && setWithdrawTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this {withdrawTarget?.label} consent?</AlertDialogTitle>
            <AlertDialogDescription>
              The {withdrawTarget?.label} signal will be unbound immediately and your assurance level will drop.
              Your underlying accounts and data are untouched — you can re-verify anytime. This exercises your
              NDPA §31 right to withdraw consent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawBusy}>Keep signal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={withdrawBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleWithdraw();
              }}
            >
              {withdrawBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Withdraw signal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
