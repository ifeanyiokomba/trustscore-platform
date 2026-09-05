"use client";

// TrustScore Stage 7 — ReputationView (the Reputation tab).
// Composes: reputation standing (verified interactions, resolution history,
// confirmed risk), flags against the member (respond / appeal), flag filing
// (anti-gaming gated) and — for REVIEWER-role members — the human review
// queue. Reputation is PLATFORM-NATIVE data: no provider, so no MOCK label.
// The locked language discipline applies: no "safe", no public accusations.

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StandingCard } from "@/components/reputation/standing-card";
import { FlagsAgainstCard } from "@/components/reputation/flags-against-card";
import { FileFlagCard } from "@/components/reputation/file-flag-card";
import { ReviewerQueueCard } from "@/components/reputation/reviewer-queue-card";
import type {
  ReputationMe,
  ReviewQueue,
  ScoreContributionInfo,
  TrustScoreInfo,
} from "@/lib/types";

export interface ReputationData {
  me: ReputationMe | null;
  queue: ReviewQueue | null;
  score: TrustScoreInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

// Shared hook: /reputation/me (+ review queue for reviewers) and the score
// snapshot (for live component points on the standing card).
export function useReputationData(): ReputationData {
  const [me, setMe] = React.useState<ReputationMe | null>(null);
  const [queue, setQueue] = React.useState<ReviewQueue | null>(null);
  const [score, setScore] = React.useState<TrustScoreInfo | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const [meRes, scoreRes] = await Promise.all([
        fetch("/api/v1/reputation/me", { cache: "no-store" }),
        fetch("/api/v1/passport/me", { cache: "no-store" }),
      ]);
      let queueData: ReviewQueue | null = null;
      if (meRes.ok) {
        const meData = (await meRes.json()) as ReputationMe;
        setMe(meData);
        if (meData.role === "REVIEWER") {
          const qRes = await fetch("/api/v1/reputation/review", { cache: "no-store" });
          if (qRes.ok) queueData = (await qRes.json()) as ReviewQueue;
        }
      } else {
        setMe(null);
      }
      setQueue(queueData);
      if (scoreRes.ok) {
        const passport = (await scoreRes.json()) as { score?: TrustScoreInfo };
        setScore(passport.score ?? null);
      } else {
        setScore(null);
      }
    } catch {
      setMe(null);
      setQueue(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { me, queue, score, loading, refresh };
}

export function ReputationTab() {
  const data = useReputationData();

  if (data.loading) {
    return (
      <Card>
        <CardContent
          className="flex items-center justify-center py-16 text-muted-foreground"
          role="status"
        >
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading your reputation…
        </CardContent>
      </Card>
    );
  }

  if (!data.me) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Could not load your reputation. Refresh the page to retry.
        </CardContent>
      </Card>
    );
  }

  // Score component points for the standing card (from the live snapshot).
  const byKey = new Map((data.score?.components ?? []).map((c) => [c.key, c]));
  const contribution: ScoreContributionInfo = {
    verifiedInteractions: Number(byKey.get("verifiedReputation")?.note?.match(/\d+/)?.[0] ?? 0),
    reputationPoints: byKey.get("verifiedReputation")?.value ?? 0,
    resolutionPoints: byKey.get("resolutionHistory")?.value ?? 0,
    confirmedPenalty: byKey.get("confirmedRisk")?.value ?? 0,
  };

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-3">
      {/* Standing: verified interactions + resolution + risk */}
      <div className="min-w-0 lg:col-span-1">
        <StandingCard
          me={data.me}
          contribution={contribution}
          status={data.score?.status}
        />
      </div>

      {/* Flags against the member — respond + appeal */}
      <div className="min-w-0 lg:col-span-2">
        <FlagsAgainstCard flags={data.me.flagsAgainstMe} onChanged={data.refresh} />
      </div>

      {/* File a flag + my filed flags */}
      <div className="min-w-0 lg:col-span-2">
        <FileFlagCard me={data.me} onChanged={data.refresh} />
      </div>

      {/* Human review queue (REVIEWER role only) */}
      {data.me.role === "REVIEWER" ? (
        <div className="min-w-0 lg:col-span-3">
          <ReviewerQueueCard
            queue={data.queue}
            onChanged={data.refresh}
          />
        </div>
      ) : null}
    </div>
  );
}
