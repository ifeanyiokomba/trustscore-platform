"use client";

// TrustScore Stage 5 — PassportTab (the Trust Passport surface).
// Composes: TrustScore card, QR Trust Card & trust links, credentials,
// verification history. Data is fetched fresh on every tab activation —
// the read model is cheap (local SQLite) and always honest.

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreCard } from "@/components/passport/score-card";
import { CredentialsCard } from "@/components/passport/credentials-card";
import { TrustShareCard } from "@/components/passport/trust-share-card";
import { VerificationHistory } from "@/components/passport/verification-history";
import { ScoreHistoryCard, useScoreHistory } from "@/components/passport/score-history-card";
import type { DsrRequestInfo, IdentityMe, PassportMe } from "@/lib/types";

export function usePassportData() {
  const [passport, setPassport] = React.useState<PassportMe | null>(null);
  const [dsrRequests, setDsrRequests] = React.useState<DsrRequestInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tick, setTick] = React.useState(0);

  const refresh = React.useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      // Full-screen loader ONLY on first load. Background refreshes keep the
      // existing data mounted — otherwise an open dialog (e.g. the once-only
      // trust-link token panel) would unmount mid-interaction.
      setLoading(passport === null);
      try {
        const [passportRes, dsrRes] = await Promise.all([
          fetch("/api/v1/passport/me", { cache: "no-store" }),
          fetch("/api/v1/passport/dsr", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (passportRes.ok) {
          setPassport(await passportRes.json());
        } else {
          setPassport(null);
        }
        if (dsrRes.ok) {
          const body = await dsrRes.json();
          setDsrRequests(body.requests ?? []);
        }
      } catch {
        if (!cancelled) setPassport(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick, passport]);

  return { passport, dsrRequests, loading, refresh };
}

export function PassportTab({
  identity,
  identityLoading,
}: {
  identity: IdentityMe | null;
  identityLoading: boolean;
}) {
  const { passport, loading, refresh } = usePassportData();
  const history = useScoreHistory();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16 text-muted-foreground" role="status">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Assembling your Trust Passport…
        </CardContent>
      </Card>
    );
  }

  if (!passport) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Could not load your Trust Passport. Refresh the page to retry.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-3">
      {/* Score + how to read it */}
      <div className="min-w-0 lg:col-span-2">
        <ScoreCard score={passport.score} trend={history.data?.spark} />
      </div>
      <div className="min-w-0 lg:col-span-1">
        <TrustShareCard passport={passport} onChanged={refresh} />
      </div>

      {/* Stage 11 — Score Insights (full-width): history, deltas, events, export */}
      <div className="min-w-0 lg:col-span-3">
        <ScoreHistoryCard data={history.data} loading={history.loading} />
      </div>

      {/* Credentials + history */}
      <div className="min-w-0 lg:col-span-2">
        <CredentialsCard credentials={passport.credentials} onChanged={refresh} />
      </div>
      <div className="min-w-0 lg:col-span-1">
        <VerificationHistory identity={identityLoading ? null : identity} />
      </div>
    </div>
  );
}
