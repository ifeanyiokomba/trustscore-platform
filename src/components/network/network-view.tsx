"use client";

// TrustScore Stage 10 — NetworkView (the Trust Network tab).
// Composes: membership/consent card (join/pause), the TrustGraph (SVG radial
// visualization of mutual verified interactions), standing summary (degree,
// counting partners, business verifications, proposal quota), the
// interactions console (propose/respond/revoke), own shared signals (with
// dispute path) and the pan-African provider registry. Honesty labels
// (MOCK partner feeds) are surfaced everywhere.

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MembershipCard } from "@/components/network/membership-card";
import { GraphCard } from "@/components/network/graph-card";
import { StandingCard } from "@/components/network/standing-card";
import { InteractionsCard } from "@/components/network/interactions-card";
import { SignalsCard } from "@/components/network/signals-card";
import { ProvidersCard } from "@/components/network/providers-card";
import type { NetworkMe, ProviderRegistry } from "@/lib/types";

export interface NetworkData {
  me: NetworkMe | null;
  providers: ProviderRegistry | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useNetworkData(): NetworkData {
  const [me, setMe] = React.useState<NetworkMe | null>(null);
  const [providers, setProviders] = React.useState<ProviderRegistry | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const [meRes, provRes] = await Promise.all([
        fetch("/api/v1/network/me", { cache: "no-store" }),
        fetch("/api/v1/network/providers", { cache: "no-store" }),
      ]);
      if (meRes.ok) setMe((await meRes.json()) as NetworkMe);
      else setMe(null);
      if (provRes.ok) setProviders((await provRes.json()) as ProviderRegistry);
      else setProviders(null);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { me, providers, loading, refresh };
}

export function NetworkTab() {
  const data = useNetworkData();

  if (data.loading) {
    return (
      <Card>
        <CardContent
          className="flex items-center justify-center py-16 text-muted-foreground"
          role="status"
        >
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading the Trust Network…
        </CardContent>
      </Card>
    );
  }

  if (!data.me) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Could not load the Trust Network. Refresh the page to retry.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-3">
      {/* Membership + consent (opt-in control) */}
      <div className="min-w-0 lg:col-span-1">
        <MembershipCard me={data.me} onChanged={data.refresh} />
      </div>

      {/* The TrustGraph — the visual heart of the tab */}
      <div className="min-w-0 lg:col-span-2">
        <GraphCard me={data.me} onChanged={data.refresh} />
      </div>

      {/* Standing summary — degree, counting partners, quota */}
      <div className="min-w-0 lg:col-span-1">
        <StandingCard me={data.me} />
      </div>

      {/* Interactions console — propose / respond / revoke */}
      <div className="min-w-0 lg:col-span-2">
        <InteractionsCard me={data.me} onChanged={data.refresh} />
      </div>

      {/* Own shared signals + k-anonymity explainer */}
      <div className="min-w-0 lg:col-span-1">
        <SignalsCard me={data.me} />
      </div>

      {/* Pan-African provider registry */}
      <div className="min-w-0 lg:col-span-3">
        <ProvidersCard registry={data.providers} />
      </div>
    </div>
  );
}
