"use client";

// TrustScore Stage 5 — CredentialsCard (directive §6, wallet alignment).
// Platform-issued, evidence-backed assertions with masked claims only.
// Manual revocation sticks until the underlying signal is re-verified.

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Landmark,
  Phone,
  ScanFace,
  Ban,
  Loader2,
  ShieldCheck,
  FileCheck2,
  CalendarClock,
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
import type { CredentialInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ElementType> = {
  GOV_ID_VERIFIED: Landmark,
  PHONE_VERIFIED: Phone,
  LIVENESS_VERIFIED: ScanFace,
};

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function claimsSummary(c: CredentialInfo): string {
  switch (c.type) {
    case "GOV_ID_VERIFIED": {
      const n = typeof c.claims.attributesAsserted === "number" ? c.claims.attributesAsserted : 0;
      return `Government record verified via NINAuth (${String(c.claims.providerMode)}) · ${n} consent-scoped attribute${n === 1 ? "" : "s"}`;
    }
    case "PHONE_VERIFIED":
      return `OTP-verified phone ${c.claims.phoneHint ? `(${String(c.claims.phoneHint)})` : ""} · SIM-swap checked`;
    case "LIVENESS_VERIFIED":
      return "Liveness passed · face matched the government record · no templates stored";
    default:
      return "Platform-issued credential";
  }
}

export function CredentialsCard({
  credentials,
  onChanged,
}: {
  credentials: CredentialInfo[];
  onChanged: () => void;
}) {
  const [revoking, setRevoking] = React.useState<CredentialInfo | null>(null);
  const [busy, setBusy] = React.useState(false);

  const confirmRevoke = React.useCallback(async () => {
    if (!revoking) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/passport/credentials/${revoking.id}/revoke`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Credential revoked", {
          description: `${revoking.label} left your Trust Card. Re-verify the signal to re-earn it.`,
        });
        onChanged();
      } else {
        const body = await res.json().catch(() => null);
        toast.error("Could not revoke", {
          description: body?.error?.message ?? "Please try again.",
        });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setBusy(false);
      setRevoking(null);
    }
  }, [revoking, onChanged]);

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Award className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Credentials</CardTitle>
          <CardDescription className="truncate">
            Evidence-backed assertions on your passport — masked claims only
          </CardDescription>
        </div>
        <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/5 text-primary">
          {credentials.filter((c) => c.status === "ACTIVE").length} active
        </Badge>
      </CardHeader>
      <CardContent>
        {credentials.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">
              No credentials yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Verify your identity and signals (Overview tab) — credentials are issued automatically
              as evidence lands.
            </p>
          </div>
        ) : (
          <ul className="space-y-2" aria-label="Your credentials">
            <AnimatePresence initial={false}>
              {credentials.map((c, i) => {
                const Icon = TYPE_ICON[c.type] ?? Award;
                const days = daysUntil(c.expiresAt);
                const active = c.status === "ACTIVE";
                return (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                    className={cn(
                      "rounded-lg border px-4 py-3.5",
                      active
                        ? "ts-rung-active border-border"
                        : "border-dashed border-border bg-muted/30 opacity-75"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{c.label}</span>
                          {active ? (
                            days !== null && days <= 0 ? (
                              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
                                expired
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">
                                active{days !== null ? ` · ${days}d` : ""}
                              </Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="border-border bg-muted text-[10px] text-muted-foreground">
                              {c.manualRevoked ? "revoked by you" : "revoked"}
                            </Badge>
                          )}
                          <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                            issuer: {c.issuer} · {c.issuerMode}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-snug text-muted-foreground">
                          {claimsSummary(c)}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <FileCheck2 className="h-3 w-3" aria-hidden="true" />
                            evidence-linked
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" aria-hidden="true" />
                            issued {timeAgo(c.issuedAt)}
                          </span>
                        </p>
                      </div>
                      {active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setRevoking(c)}
                        >
                          <Ban className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Credentials carry <span className="font-medium text-foreground">masked claims only</span> —
          counts and hints, never attribute values or raw identifiers. They lapse automatically when
          their source evidence expires or is withdrawn.
        </p>
      </CardContent>

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this credential?</AlertDialogTitle>
            <AlertDialogDescription>
              {revoking?.label} will leave your Trust Card and public trust links immediately. It
              returns only if you re-verify the underlying signal. This action is audited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmRevoke();
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Revoke credential
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
