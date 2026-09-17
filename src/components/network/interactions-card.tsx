"use client";

// TrustScore Stage 10 — InteractionsCard: the attestations console.
// Propose a mutual verified interaction by handle (validated, quota'd),
// respond to incoming proposals (accept/decline), cancel outgoing ones and
// read the lifecycle history (declined / expired / revoked) — every state
// change is audited and honest.

import * as React from "react";
import { motion } from "framer-motion";
import { Handshake, Loader2, Send, Check, X, History, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { NetworkMe } from "@/lib/types";

const HISTORY_LABELS: Record<string, { label: string; tone: string }> = {
  DECLINED: { label: "Declined", tone: "text-amber-600" },
  EXPIRED: { label: "Expired", tone: "text-muted-foreground" },
  REVOKED: { label: "Revoked", tone: "text-destructive" },
};

export function InteractionsCard({ me, onChanged }: { me: NetworkMe; onChanged: () => Promise<void> }) {
  const { toast } = useToast();
  const [handle, setHandle] = React.useState("");
  const [proposing, setProposing] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const joined = me.membership.joined;

  async function propose() {
    const clean = handle.trim();
    if (!clean) return;
    setProposing(true);
    try {
      const res = await fetch("/api/v1/network/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: clean.replace(/^@/, "") }),
      });
      const body = (await res.json()) as { note?: string; error?: { message?: string } };
      if (res.ok) {
        toast({ title: "Proposal sent", description: body.note });
        setHandle("");
        await onChanged();
      } else {
        toast({ title: "Could not propose", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setProposing(false);
    }
  }

  async function respond(id: string, decision: "ACCEPT" | "DECLINE") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/network/interactions/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const body = (await res.json()) as { note?: string; error?: { message?: string } };
      if (res.ok) {
        toast({
          title: decision === "ACCEPT" ? "Mutual attestation active" : "Proposal declined",
          description: body.note,
        });
        await onChanged();
      } else {
        toast({ title: "Could not respond", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/network/interactions/${id}/revoke`, { method: "POST" });
      const body = (await res.json()) as { note?: string; error?: { message?: string } };
      if (res.ok) {
        toast({ title: "Proposal cancelled", description: body.note });
        await onChanged();
      } else {
        toast({ title: "Could not cancel", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  const hasAny =
    me.interactions.incoming.length > 0 ||
    me.interactions.outgoing.length > 0 ||
    me.interactions.history.length > 0;

  return (
    <Card className="ts-card-hover min-w-0" data-testid="net-interactions-card">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          <Handshake className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Verified interactions</CardTitle>
          <CardDescription className="truncate">
            Mutual attestations — both sides accept, either side can revoke
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Propose */}
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void propose();
          }}
        >
          <label htmlFor="net-propose-handle" className="sr-only">
            Member handle to propose a verified interaction
          </label>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-sm text-muted-foreground" aria-hidden="true">
              @
            </span>
            <Input
              id="net-propose-handle"
              className="pl-7 font-mono"
              placeholder="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={!joined || proposing}
              autoComplete="off"
              maxLength={40}
            />
          </div>
          <Button type="submit" disabled={!joined || proposing || !handle.trim()}>
            {proposing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Propose
          </Button>
        </form>
        {!joined ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
            Join the network (left card) to propose interactions. Proposals are quota-limited: 3 per 7 days —
            attestation quality over quantity.
          </p>
        ) : null}

        {/* Incoming */}
        {me.interactions.incoming.length > 0 ? (
          <section aria-label="Incoming proposals" className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Waiting for you ({me.interactions.incoming.length})
            </h4>
            {me.interactions.incoming.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-3"
                data-testid="net-incoming-row"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.from ? r.from.displayName : "A member"}{" "}
                    <span className="font-mono text-xs text-primary">@{r.from?.handle ?? "—"}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    proposes a mutual attestation · expires{" "}
                    {new Date(r.expiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    onClick={() => void respond(r.id, "ACCEPT")}
                    disabled={busyId === r.id}
                    data-testid="net-accept-btn"
                  >
                    {busyId === r.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void respond(r.id, "DECLINE")}
                    disabled={busyId === r.id}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Decline
                  </Button>
                </div>
              </motion.div>
            ))}
          </section>
        ) : null}

        {/* Outgoing */}
        {me.interactions.outgoing.length > 0 ? (
          <section aria-label="Sent proposals" className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sent — awaiting response ({me.interactions.outgoing.length})
            </h4>
            {me.interactions.outgoing.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/20 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <span className="font-mono text-xs text-primary">@{r.to?.handle ?? "—"}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    expires{" "}
                    {new Date(r.expiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void cancel(r.id)}
                  disabled={busyId === r.id}
                >
                  {busyId === r.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1.5 h-3.5 w-3.5" />}
                  Cancel
                </Button>
              </div>
            ))}
          </section>
        ) : null}

        {/* History */}
        {me.interactions.history.length > 0 ? (
          <section aria-label="Interaction history" className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              History
            </h4>
            <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {me.interactions.history.map((h) => {
                const meta = HISTORY_LABELS[h.status] ?? { label: h.status, tone: "text-muted-foreground" };
                return (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate text-muted-foreground">
                      {h.direction === "OUTGOING" ? "to" : "from"}{" "}
                      <span className="font-mono text-foreground">@{h.partnerHandle ?? "member"}</span>
                    </span>
                    <span className={`shrink-0 font-semibold ${meta.tone}`}>{meta.label}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {!hasAny && joined ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <Handshake className="mx-auto h-7 w-7 text-muted-foreground/60" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">No proposals yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Propose an interaction with a member you actually dealt with — after they accept, the attestation
              appears in your TrustGraph and can count toward Verified Reputation.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
