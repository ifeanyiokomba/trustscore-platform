"use client";

// TrustScore Stage 10 — MembershipCard: the opt-in control for the Trust
// Network. Joining mints a standing NETWORK consent (NDPA §31 — withdrawal
// = pause, effective immediately); the card states exactly what membership
// does and does not do, in plain language.

import * as React from "react";
import { motion } from "framer-motion";
import { Waypoints, Loader2, Pause, Play, ShieldCheck, Fingerprint, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { NetworkMe } from "@/lib/types";

export function MembershipCard({ me, onChanged }: { me: NetworkMe; onChanged: () => Promise<void> }) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const joined = me.membership.joined;

  async function setMembership(status: "ACTIVE" | "PAUSED") {
    setPending(true);
    try {
      const res = await fetch("/api/v1/network/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await res.json()) as { note?: string; error?: { message?: string } };
      if (res.ok) {
        toast({ title: status === "ACTIVE" ? "You joined the Trust Network" : "Membership paused", description: body.note });
        await onChanged();
      } else {
        toast({ title: "Could not change membership", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            joined ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          }`}
          aria-hidden="true"
        >
          <Waypoints className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Network membership</CardTitle>
          <CardDescription className="truncate">
            {joined ? "Active — opt-in consent standing" : "Opt-in — you are not a member yet"}
          </CardDescription>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            joined
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
          aria-label={joined ? "Membership active" : "Not a member"}
        >
          {joined ? "ACTIVE" : "OFF"}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
          <li className="flex items-start gap-2">
            <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Joining is a <span className="font-medium text-foreground">standing consent</span> (NDPA §31):
              mutual verified interactions can count toward your{" "}
              <span className="font-medium text-foreground">Verified Reputation</span> — the same score
              component as consented checks, never a hidden number.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Attestations are <span className="font-medium text-foreground">mutual</span> (both members must
              accept, both must be L2+) and either side can revoke at any time.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Undo2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Pausing is <span className="font-medium text-foreground">effective immediately</span> — your
              edges stop counting and no shared signals are returned in checks.
            </span>
          </li>
        </ul>

        <div className="flex gap-2">
          {joined ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => void setMembership("PAUSED")}
                disabled={pending}
              >
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />}
                Pause membership
              </Button>
              <p className="sr-only" role="status">
                {pending ? "Updating membership…" : ""}
              </p>
            </>
          ) : (
            <Button className="flex-1" onClick={() => void setMembership("ACTIVE")} disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Join the Trust Network
            </Button>
          )}
        </div>

        {me.membership.joinedAt ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] leading-snug text-muted-foreground"
          >
            Member since{" "}
            {new Date(me.membership.joinedAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            . Consent withdrawal is one click — the same right you exercise for every signal.
          </motion.p>
        ) : (
          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            Partner platforms in this sandbox are <span className="font-semibold text-primary">MOCK</span> demo
            participants — the sharing contract is real, the feeds are honest mock-ups.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
