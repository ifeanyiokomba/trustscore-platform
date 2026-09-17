"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  KeyRound,
  ShieldCheck,
  BadgeCheck,
  RefreshCw,
  Clock,
  Loader2,
  CircleDot,
  CheckCircle2,
  XCircle,
  Hourglass,
  Lock,
  Ban,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ConsentModal } from "@/components/auth/consent-modal";
import { toast } from "sonner";
import type {
  ConsentRecord,
  ConsentScreenInfo,
  IdentityMe,
  VerificationSessionInfo,
  VerificationTimelineEvent,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const EVENT_META: Record<string, { label: string; icon: React.ElementType; tone: "ok" | "info" | "warn" }> = {
  SESSION_CREATED: { label: "Session created", icon: CircleDot, tone: "info" },
  CONSENT_SCREEN_PRESENTED: { label: "Consent screen shown", icon: CircleDot, tone: "info" },
  CONSENT_GRANTED: { label: "Consent granted in NINAuth app", icon: BadgeCheck, tone: "ok" },
  CONSENT_DENIED: { label: "Consent denied", icon: XCircle, tone: "warn" },
  CODE_ISSUED: { label: "One-time code issued (60s)", icon: KeyRound, tone: "info" },
  CODE_EXCHANGED: { label: "Code exchanged · PKCE verified", icon: CheckCircle2, tone: "ok" },
  TOKEN_VALIDATED: { label: "ID token validated (signature · issuer · audience · nonce)", icon: CheckCircle2, tone: "ok" },
  IDENTITY_VERIFIED: { label: "Trust Identity established", icon: ShieldCheck, tone: "ok" },
  SESSION_FAILED: { label: "Session failed", icon: XCircle, tone: "warn" },
  SESSION_EXPIRED: { label: "Session expired", icon: Hourglass, tone: "warn" },
};

function freshnessLabel(verifiedAt: string | null): string {
  if (!verifiedAt) return "";
  const diffMs = Date.now() - new Date(verifiedAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Verified just now";
  if (mins < 60) return `Verified ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Verified ${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `Verified ${days} ${days === 1 ? "day" : "days"} ago`;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function Timeline({ events }: { events: VerificationTimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        No verification events yet.
      </p>
    );
  }
  return (
    <ol className="relative max-h-64 space-y-1 overflow-y-auto pr-1" aria-label="Verification timeline">
      <span
        className="absolute bottom-4 left-[11px] top-3 w-px bg-border"
        aria-hidden="true"
      />
      {events.map((e, i) => {
        const meta = EVENT_META[e.eventType] ?? { label: e.eventType, icon: CircleDot, tone: "info" as const };
        const Icon = meta.icon;
        const isLatest = i === events.length - 1;
        return (
          <li key={e.id} className="relative flex items-start gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/40">
            <span
              className={cn(
                "z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border bg-background",
                meta.tone === "ok" && "border-primary/40 text-primary",
                meta.tone === "warn" && "border-amber-500/50 text-amber-600 dark:text-amber-400",
                meta.tone === "info" && "border-border text-muted-foreground",
                isLatest && "ts-pulse"
              )}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium leading-snug">{meta.label}</p>
              <time className="text-[10px] text-muted-foreground" dateTime={e.createdAt}>
                {new Date(e.createdAt).toLocaleTimeString("en-NG", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function IdentityCard({
  data,
  onChanged,
}: {
  data: IdentityMe | null;
  onChanged: () => void;
}) {
  const [starting, setStarting] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [session, setSession] = React.useState<VerificationSessionInfo | null>(null);
  const [consent, setConsent] = React.useState<ConsentScreenInfo | null>(null);
  const [flowError, setFlowError] = React.useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = React.useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = React.useState<ConsentRecord | null>(null);

  // Request ALL known scopes (core + optional) so the consent modal can offer
  // granular opt-ins — the user trims to the granted subset at consent time.
  async function startVerification() {
    setStarting(true);
    setFlowError(null);
    try {
      const res = await fetch("/api/v1/identity/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scopes: [
            "identity.basic",
            "identity.nin_status",
            "profile.name",
            "profile.demographics",
          ],
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFlowError(body?.error?.message ?? "Could not start verification.");
        return;
      }
      setSession(body.session);
      setConsent(body.consent);
      setModalOpen(true);
    } catch {
      setFlowError("Network error — please try again.");
    } finally {
      setStarting(false);
    }
  }

  async function handleDecision(decision: "GRANT" | "DENY", grantedScopes?: string[]) {
    if (!session) return;
    setBusy(true);
    setFlowError(null);
    try {
      const consentRes = await fetch(
        `/api/v1/identity/sessions/${session.id}/consent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, ...(decision === "GRANT" && { scopes: grantedScopes }) }),
        }
      );
      const consentBody = await consentRes.json();
      if (!consentRes.ok) {
        setFlowError(consentBody?.error?.message ?? "Consent step failed.");
        return;
      }
      if (decision === "DENY") {
        setModalOpen(false);
        setSession(null);
        setConsent(null);
        toast.info("Consent denied", {
          description: "No identity data was shared. You can restart verification anytime.",
        });
        onChanged();
        return;
      }

      // GRANT → run the OAuth callback contract (code + state → PKCE exchange → token validation)
      const cbRes = await fetch(
        `/api/v1/identity/sessions/${session.id}/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: consentBody.code, state: consentBody.state }),
        }
      );
      const cbBody = await cbRes.json();
      if (!cbRes.ok) {
        setFlowError(cbBody?.error?.message ?? "Verification failed.");
        onChanged();
        return;
      }

      const attrs = (consentBody.grantedScopes ?? []).filter((s: string) =>
        s.startsWith("profile.")
      ).length;
      setModalOpen(false);
      setSession(null);
      setConsent(null);
      toast.success("Trust Identity established", {
        description:
          attrs > 0
            ? `Government identity verified via NINAuth (mock) — Assurance Level 1 with ${attrs * 2} consent-scoped attributes.`
            : "Government identity verified via NINAuth (mock) — Assurance Level 1.",
      });
      onChanged();
    } catch {
      setFlowError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function withdrawConsentRecord(consentId: string) {
    setWithdrawingId(consentId);
    try {
      const res = await fetch(`/api/v1/identity/consents/${consentId}/withdraw`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error("Withdrawal failed", {
          description: body?.error?.message ?? "Please try again.",
        });
        return;
      }
      toast.success(body.identityRevoked ? "Trust Identity revoked" : "Consent withdrawn", {
        description: body.identityRevoked
          ? "Identity, attributes and evidence revoked. Re-verify anytime."
          : `${body.revokedAttributes} attribute${body.revokedAttributes === 1 ? "" : "s"} revoked.`,
      });
      onChanged();
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setWithdrawingId(null);
    }
  }

  const identity = data?.identity;
  const isVerified = identity?.status === "VERIFIED";
  const freshness = freshnessLabel(identity?.verifiedAt ?? null);
  const validityDays = daysUntil(identity?.expiresAt ?? null);
  const activeIdentifiers = (data?.identifiers ?? []).filter((i) => i.status === "ACTIVE");

  return (
    <>
      <Card
        className={cn(
          "ts-card-hover min-w-0 border-dashed",
          isVerified && "border-primary/30 border-solid"
        )}
      >
        <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              isVerified ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {isVerified ? <Fingerprint className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">Trust Identity</CardTitle>
            <CardDescription className="truncate">Your verified identity spine</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "ml-auto shrink-0 text-xs",
              isVerified
                ? "border-primary/40 bg-primary/10 text-primary"
                : identity?.status === "REVOKED"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "text-muted-foreground"
            )}
          >
            {isVerified ? (
              <>
                <BadgeCheck className="mr-1 h-3 w-3" />
                Level {identity?.assuranceLevel} · NINAuth
              </>
            ) : identity?.status === "REVOKED" ? (
              "Revoked — re-verify"
            ) : identity?.status === "EXPIRED" ? (
              "Expired — re-verify"
            ) : (
              "MOCK provider"
            )}
          </Badge>
        </CardHeader>
        <CardContent>
          {isVerified ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              {/* Verified state */}
              <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 p-5">
                <div className="ts-shimmer absolute inset-0" aria-hidden="true" />
                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <span className="ts-pulse inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                      Government identity verified
                    </p>
                    <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                      {identity?.providerIdentityRef}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{freshness}</p>
                    {validityDays !== null && (
                      <p className="text-xs font-medium">
                        Valid {validityDays > 0 ? `${validityDays} more days` : "— re-verify now"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Stage 3 — hashed identifiers panel */}
              {activeIdentifiers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Identity fingerprints
                  </p>
                  {activeIdentifiers.map((id) => (
                    <div
                      key={id.id}
                      className="ts-inset flex items-center gap-3 rounded-lg px-3 py-2.5"
                    >
                      <Hash className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{id.hint}</p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          sha256 · {id.hashPrefix}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {daysUntil(id.expiresAt) ?? "—"}d
                      </span>
                    </div>
                  ))}
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    Stored as one-way hashes — future Safety Checks match without
                    ever seeing the raw value.
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
                  <p className="text-xs text-muted-foreground">
                    No raw NIN stored — masked reference only
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
                  <p className="min-w-0 truncate text-xs text-muted-foreground">
                    Provider: {identity?.provider} ({identity?.providerMode})
                  </p>
                </div>
              </div>

              {/* Consent records — with Stage 3 withdrawal (NDPA) */}
              {data?.consents && data.consents.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Consent records
                  </p>
                  {data.consents.slice(0, 3).map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
                        c.withdrawnAt ? "border-border/60 bg-muted/20 opacity-70" : "border-border"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 truncate text-muted-foreground">
                          {c.requester} · {c.scopes.length} scopes ·{" "}
                          <span className="min-w-0 truncate font-mono">{c.policyVersion}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <time className="text-muted-foreground" dateTime={c.grantedAt}>
                          {new Date(c.grantedAt).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                          })}
                        </time>
                        {c.withdrawnAt ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Withdrawn
                          </Badge>
                        ) : (
                          <button
                            type="button"
                            data-consent-id={c.id}
                            onClick={() => setConfirmWithdraw(c)}
                            disabled={withdrawingId === c.id}
                            className="flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            aria-label="Withdraw consent"
                          >
                            {withdrawingId === c.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Ban className="h-3 w-3" />
                            )}
                            Withdraw
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline */}
              {data?.lastSession && data.lastSession.events.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Verification timeline
                  </p>
                  <Timeline events={data.lastSession.events} />
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={startVerification}
                disabled={starting}
              >
                {starting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Re-verify
                <span className="hidden sm:inline">(refreshes validity to 90 days)</span>
              </Button>
              {flowError && (
                <p
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                  role="alert"
                >
                  {flowError}
                </p>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-5 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <KeyRound className="h-6 w-6" />
                </span>
                <p className="mt-4 text-sm font-semibold">
                  {identity?.status === "REVOKED"
                    ? "Trust Identity revoked"
                    : identity?.status === "EXPIRED"
                      ? "Verification expired"
                      : "No Trust Identity established yet"}
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {identity?.status === "REVOKED" || identity?.status === "EXPIRED"
                    ? "Re-verify through Nigeria's official identity consent gateway to restore your Trust Identity."
                    : "Verify through Nigeria's official identity consent gateway — a QR or share code, one approval in your NINAuth app, and you're done. No forms, no document uploads."}
                </p>
                <Button
                  className="mt-5 min-h-11"
                  onClick={startVerification}
                  disabled={starting}
                >
                  {starting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Continue with NINAuth
                    </>
                  )}
                </Button>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Mock provider — the live partner transport activates with NINAuth
                  partner access.
                </p>
              </div>
              {flowError && (
                <p
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                  role="alert"
                >
                  {flowError}
                </p>
              )}
              <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary/60" aria-hidden="true" />
                  Government identity verification
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary/60" aria-hidden="true" />
                  Consent-scoped attributes only
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary/60" aria-hidden="true" />
                  No raw NIN ever stored
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary/60" aria-hidden="true" />
                  Freshness tracked from day one
                </li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {modalOpen && (
          <ConsentModal
            open={modalOpen}
            session={session}
            consent={consent}
            busy={busy}
            error={flowError}
            onDecision={handleDecision}
            onDismiss={() => {
              if (busy) return;
              setModalOpen(false);
              setFlowError(null);
              onChanged();
            }}
          />
        )}
      </AnimatePresence>

      {/* NDPA consent withdrawal — destructive, always confirmed */}
      <AlertDialog
        open={!!confirmWithdraw}
        onOpenChange={(o) => {
          if (!withdrawingId) setConfirmWithdraw(o ? confirmWithdraw : null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this consent?</AlertDialogTitle>
            <AlertDialogDescription>
              Withdrawing revokes every attribute this consent produced. If it
              established your Trust Identity, your identity, evidence and
              fingerprints are revoked too — you can re-verify anytime. This is
              your NDPA right and it takes effect immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!withdrawingId}>Keep consent</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmWithdraw) void withdrawConsentRecord(confirmWithdraw.id);
              }}
              disabled={!!withdrawingId}
            >
              {withdrawingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Withdraw consent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
