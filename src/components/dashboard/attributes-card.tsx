"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IdCard,
  Fingerprint,
  Ban,
  Loader2,
  ShieldOff,
  UserRound,
  CalendarRange,
  MapPin,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AttributeInfo, ConsentRecord } from "@/lib/types";

const KEY_META: Record<string, { label: string; icon: React.ElementType }> = {
  given_name: { label: "Given name", icon: UserRound },
  family_name: { label: "Family name", icon: UserRound },
  birth_year: { label: "Birth year", icon: CalendarRange },
  state_of_origin: { label: "State of origin", icon: MapPin },
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function AttributesCard({
  attributes,
  consents,
  hasIdentity,
  onChanged,
}: {
  attributes: AttributeInfo[];
  consents: ConsentRecord[];
  hasIdentity: boolean;
  onChanged: () => void;
}) {
  const [confirmConsent, setConfirmConsent] = React.useState<ConsentRecord | null>(null);
  const [withdrawing, setWithdrawing] = React.useState(false);

  const consentById = React.useMemo(() => {
    const m = new Map<string, ConsentRecord>();
    for (const c of consents) m.set(c.id, c);
    return m;
  }, [consents]);

  const active = attributes.filter((a) => a.status === "ACTIVE");
  const revoked = attributes.filter((a) => a.status === "REVOKED");

  async function doWithdraw() {
    if (!confirmConsent) return;
    setWithdrawing(true);
    try {
      const res = await fetch(
        `/api/v1/identity/consents/${confirmConsent.id}/withdraw`,
        { method: "POST" }
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error("Withdrawal failed", {
          description: body?.error?.message ?? "Please try again.",
        });
        return;
      }
      toast.success(body.identityRevoked ? "Trust Identity revoked" : "Consent withdrawn", {
        description: body.identityRevoked
          ? "Your identity, attributes and evidence were revoked. You can re-verify anytime."
          : `${body.revokedAttributes} attribute${body.revokedAttributes === 1 ? "" : "s"} revoked.`,
      });
      setConfirmConsent(null);
      onChanged();
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IdCard className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Verified attributes</CardTitle>
          <CardDescription className="truncate">
            Consent-scoped fields from your NIN record — provenance on every row
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "ml-auto shrink-0 text-xs",
            active.length > 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "text-muted-foreground"
          )}
        >
          <Fingerprint className="mr-1 h-3 w-3" />
          {active.length} active
        </Badge>
      </CardHeader>
      <CardContent>
        {!hasIdentity ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ShieldOff className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium">No identity yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-snug text-muted-foreground">
              Attributes appear after you verify with NINAuth and opt in to share
              profile scopes during consent. You choose exactly which fields to share.
            </p>
          </div>
        ) : attributes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
            <p className="text-sm font-medium">Verification-only consent</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-snug text-muted-foreground">
              You granted core scopes only — no profile fields were shared. Re-verify
              and opt in to <span className="font-mono text-[10px]">profile.name</span> /{" "}
              <span className="font-mono text-[10px]">profile.demographics</span> to add attributes.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2" aria-label="Verified identity attributes">
            <AnimatePresence initial={false}>
              {attributes.map((a, i) => {
                const meta = KEY_META[a.key] ?? { label: a.key, icon: BadgeCheck };
                const Icon = meta.icon;
                const consent = consentById.get(a.consentId);
                const isRevoked = a.status === "REVOKED";
                return (
                  <motion.li
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: 0.05 * i, duration: 0.25 }}
                    className={cn(
                      "group relative overflow-hidden rounded-lg border px-3 py-2.5",
                      isRevoked
                        ? "border-border/60 bg-muted/20 opacity-60"
                        : "border-border bg-background hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isRevoked ? "text-muted-foreground/50" : "text-primary/70"
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate text-xs font-medium text-muted-foreground">
                          {meta.label}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-px font-mono text-[9px] text-muted-foreground">
                        {a.scope}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1 truncate text-sm font-semibold",
                        isRevoked ? "text-muted-foreground line-through" : "text-foreground"
                      )}
                    >
                      {a.value}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {isRevoked ? "Revoked" : `Asserted ${timeAgo(a.assertedAt)}`} · {a.source}
                    </p>
                    {!isRevoked && consent && !consent.withdrawnAt && (
                      <button
                        type="button"
                        onClick={() => setConfirmConsent(consent)}
                        className="absolute right-2 top-2 hidden rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:block focus-visible:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Withdraw consent for ${meta.label}`}
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        {revoked.length > 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {revoked.length} revoked attribute{revoked.length === 1 ? "" : "s"} retained as
            audit history — values are hidden and never shared.
          </p>
        )}

        {/* Consent withdrawal confirm */}
        <Dialog open={!!confirmConsent} onOpenChange={(o) => !withdrawing && setConfirmConsent(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Withdraw this consent?</DialogTitle>
              <DialogDescription>
                Withdrawing revokes every attribute this consent produced. If it&apos;s the
                consent that established your Trust Identity, your identity, evidence and
                identifiers are revoked too — you can re-verify anytime. This is your
                NDPA right and it takes effect immediately.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setConfirmConsent(null)}
                disabled={withdrawing}
                className="sm:order-1"
              >
                Keep consent
              </Button>
              <Button
                variant="destructive"
                onClick={doWithdraw}
                disabled={withdrawing}
                className="sm:order-2"
              >
                {withdrawing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="mr-2 h-4 w-4" />
                )}
                Withdraw consent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
