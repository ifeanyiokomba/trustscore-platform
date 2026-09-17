"use client";

// TrustScore Stage 9 — DevView (the Developers tab).
// The B2B surface of the platform: register API clients (business apps),
// mint API keys, configure signed webhooks, watch usage against plan quotas,
// manage the team, and read the Trust Decision API contract — all inside the
// member dashboard. Every surface is honestly labeled (SANDBOX/LIVE posture,
// mock billing, MOCK providers).
//
// Compliance notes carried into the UI:
//  * subjects control API checks via their standing SAFETY_CHECK consent —
//    the banner says so, because businesses must know checks are consent-gated
//  * the Trust Decision API is an assessment surface, never an automated
//    decision (NDPA §37 note ships with every API response too)

import * as React from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Code2,
  Plus,
  Info,
  Server,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ClientCard } from "@/components/dev/client-card";
import { ApiDocsCard } from "@/components/dev/api-docs-card";
import { TabIntro } from "@/components/dashboard/tab-intro";
import type { DevClient, DevPortal } from "@/lib/types";

export interface DevData {
  portal: DevPortal | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useDevData(): DevData {
  const [portal, setPortal] = React.useState<DevPortal | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/dev/me", { cache: "no-store" });
      if (res.ok) setPortal((await res.json()) as DevPortal);
      else setPortal(null);
    } catch {
      setPortal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { portal, loading, refresh };
}

function CreateClientCard({
  canCreate,
  maxClients,
  onCreated,
}: {
  canCreate: boolean;
  maxClients: number;
  onCreated: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/v1/dev/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = (await res.json()) as { error?: { message?: string } };
      if (res.ok) {
        toast({
          title: "API client registered",
          description: `"${name.trim()}" is live in SANDBOX. Mint an API key to start calling the Trust Decision API.`,
        });
        setName("");
        await onCreated();
      } else {
        toast({
          title: "Could not register the client",
          description: body.error?.message ?? "Check the name (3–60 characters).",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Plus className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Register an API client</CardTitle>
          <CardDescription className="leading-snug">
            Your business&apos;s integration on TrustScore
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="client-name" className="text-xs">
              Client name (shown in subject receipts — name your business honestly)
            </Label>
            <div className="flex gap-2">
              <Input
                id="client-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MarketSquare Checkout"
                minLength={3}
                maxLength={60}
                required
                disabled={pending || !canCreate}
                className="min-w-0"
              />
              <Button type="submit" disabled={pending || !canCreate || name.trim().length < 3}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
                Create
              </Button>
            </div>
          </div>
        </form>
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-3" role="note">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              New clients start in <strong>SANDBOX</strong>. The Trust Decision API
              checks people who <strong>consented</strong> to safety checks — subjects
              can turn that off at any time, and every completed check is receipted
              to them with your client&apos;s name.
            </span>
          </p>
        </div>
        {!canCreate ? (
          <p className="text-[11px] text-muted-foreground">
            You own the maximum of {maxClients} API clients. Revoke or hand over a
            client before registering another.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function DevTab() {
  const data = useDevData();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (data.loading) {
    return (
      <Card>
        <CardContent
          className="flex items-center justify-center py-16 text-muted-foreground"
          role="status"
        >
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading the Developer Portal…
        </CardContent>
      </Card>
    );
  }

  if (!data.portal) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Could not load the Developer Portal. Refresh the page to retry.
        </CardContent>
      </Card>
    );
  }

  const owned = data.portal.clients.filter((c) => c.role === "OWNER").length;

  return (
    <motion.div
      initial={mounted ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <TabIntro
        eyebrow="Stage 9 · B2B platform"
        title="Build on verified trust"
        description="API keys, webhooks, teams and the Trust Decision endpoint — the same engine that powers the passport, behind your own product."
      />

      {/* Honesty banner — the B2B surface states its own limits */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3.5" role="note">
        <p className="flex items-start gap-2.5 text-xs leading-relaxed">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Developer Portal — honest by design.</strong>{" "}
            {data.portal.honesty} Plan quotas and key caps are enforced for real;{" "}
            <strong className="font-semibold">billing is a mock-up</strong> (no payment
            processor is connected), and the Trust Decision API returns{" "}
            <strong className="font-semibold">assessments, not decisions</strong> —
            significant decisions about a person stay with your human reviewers (NDPA §37).
          </span>
        </p>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        {/* Per-client consoles */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {data.portal.clients.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Code2 className="mx-auto h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">No API clients yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Register your first client to mint API keys, configure webhooks and
                  start calling <code className="font-mono">POST /api/v1/trust/check</code>.
                </p>
              </CardContent>
            </Card>
          ) : (
            data.portal.clients.map((c: DevClient) => (
              <ClientCard key={c.id} client={c} onChanged={data.refresh} limits={data.portal!.limits} />
            ))
          )}
        </div>

        {/* Create + docs rail */}
        <div className="min-w-0 space-y-6">
          <CreateClientCard
            canCreate={owned < data.portal.limits.maxClients}
            maxClients={data.portal.limits.maxClients}
            onCreated={data.refresh}
          />
          <ApiDocsCard />
        </div>
      </div>
    </motion.div>
  );
}
