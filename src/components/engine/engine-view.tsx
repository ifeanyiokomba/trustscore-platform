"use client";

// TrustScore Stage 8 — EngineView (the Trust Engine tab).
// Composes the PUBLIC transparency surface (active scoring policy, DPIA
// registry, automated-decision gate), the member's own snapshot lifecycle
// state (incl. the frozen-while-appeal fairness note), and — for ADMIN-role
// members — the engine administration console (policy drafts, DPIA records,
// activation, gate) plus the Stage 13 provider transport console (posture,
// circuit breakers, vault). Admin access is an operational grant, like
// reviewers.

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PolicyPublicCard } from "@/components/engine/policy-public-card";
import { MyEngineCard } from "@/components/engine/my-engine-card";
import { AdminConsoleCard } from "@/components/engine/admin-console-card";
import { ProviderPostureCard } from "@/components/engine/provider-posture-card";
import type {
  EngineAdminOverview,
  EngineAdminProviders,
  EngineMe,
  EnginePublic,
} from "@/lib/types";

export interface EngineData {
  public: EnginePublic | null;
  me: EngineMe | null;
  admin: EngineAdminOverview | null;
  providers: EngineAdminProviders | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useEngineData(): EngineData {
  const [pub, setPub] = React.useState<EnginePublic | null>(null);
  const [me, setMe] = React.useState<EngineMe | null>(null);
  const [admin, setAdmin] = React.useState<EngineAdminOverview | null>(null);
  const [providers, setProviders] = React.useState<EngineAdminProviders | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const [pubRes, meRes] = await Promise.all([
        fetch("/api/v1/engine/public", { cache: "no-store" }),
        fetch("/api/v1/engine/me", { cache: "no-store" }),
      ]);
      if (pubRes.ok) setPub((await pubRes.json()) as EnginePublic);
      if (meRes.ok) {
        const meData = (await meRes.json()) as EngineMe;
        setMe(meData);
        // Admin visibility is role-based; the overview route 403s politely.
        const admRes = await fetch("/api/v1/engine/admin/overview", { cache: "no-store" });
        if (admRes.ok) {
          setAdmin((await admRes.json()) as EngineAdminOverview);
          const provRes = await fetch("/api/v1/engine/admin/providers", { cache: "no-store" });
          if (provRes.ok) setProviders((await provRes.json()) as EngineAdminProviders);
          else setProviders(null);
        } else {
          setAdmin(null);
          setProviders(null);
        }
      }
    } catch {
      setPub(null);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { public: pub, me, admin, providers, loading, refresh };
}

export function EngineTab() {
  const data = useEngineData();

  if (data.loading) {
    return (
      <Card>
        <CardContent
          className="flex items-center justify-center py-16 text-muted-foreground"
          role="status"
        >
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading the Trust Engine…
        </CardContent>
      </Card>
    );
  }

  if (!data.public) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Could not load the Trust Engine. Refresh the page to retry.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-3">
      {/* My snapshot lifecycle — state, policy provenance, freeze note */}
      <div className="min-w-0 lg:col-span-1">
        <MyEngineCard me={data.me} />
      </div>

      {/* The public rules — active policy + history + DPIA + gate */}
      <div className="min-w-0 lg:col-span-2">
        <PolicyPublicCard pub={data.public} />
      </div>

      {/* Engine administration (ADMIN role only — operational grant) */}
      {data.admin ? (
        <div className="min-w-0 lg:col-span-3">
          <AdminConsoleCard overview={data.admin} onChanged={data.refresh} />
        </div>
      ) : null}

      {/* Stage 13 — provider transports (ADMIN role only — posture, circuits, vault) */}
      {data.providers ? (
        <div className="min-w-0 lg:col-span-3">
          <ProviderPostureCard data={data.providers} onChanged={data.refresh} />
        </div>
      ) : null}
    </div>
  );
}
