"use client";

// TrustScore Stage 5 — PrivacyTab (Privacy & Security surface).
// Composes: DSR self-service, Identity Security Center (sessions, change
// alerts, security timeline), trust receipts. Account deletion signs the
// user out — the cookie is already cleared server-side.

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TabIntro } from "@/components/dashboard/tab-intro";
import { DsrCard } from "@/components/passport/dsr-card";
import { SecurityCenter } from "@/components/passport/security-center";
import { SignInMethodsCard } from "@/components/passport/sign-in-methods-card";
import { ReceiptsCard } from "@/components/passport/receipts-card";
import { SafetySettingsCard } from "@/components/safety/safety-settings-card";
import { usePassportData } from "@/components/passport/passport-view";
import { useTrustStore } from "@/lib/store";

export function PrivacyTab({ onOpenScoreInsights }: { onOpenScoreInsights?: () => void }) {
  const { passport, dsrRequests, loading, refresh } = usePassportData();
  const { signOut } = useTrustStore();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16 text-muted-foreground" role="status">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading your privacy &amp; security surface…
        </CardContent>
      </Card>
    );
  }

  if (!passport) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Could not load your privacy tools. Refresh the page to retry.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <TabIntro
        eyebrow="Your data, your rules"
        title="Privacy & Security"
        description="Sessions, trust receipts, consent records and DSR self-service — your NDPA rights, one tap away, with an audit trail behind every action."
      />
      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
      {/* Stage 6 — Safety Check consent + received checks */}
      <SafetySettingsCard />

      {/* DSR rights */}
      <div className="min-w-0 lg:col-span-2">
        <DsrCard
          requests={dsrRequests}
          onExportDone={refresh}
          onDeleted={() => signOut()}
        />
      </div>

      {/* Trust receipts */}
      <div className="min-w-0 lg:col-span-1">
        <ReceiptsCard receipts={passport.receipts} />
      </div>

      {/* Security center */}
      <div className="min-w-0 lg:col-span-2">
        <SecurityCenter
          sessions={passport.sessions}
          activeSessionCount={passport.activeSessionCount}
          notifications={passport.notifications}
          securityEvents={passport.securityEvents}
          currentSessionId={passport.sessions.find((s) => s.current)?.id ?? null}
          onChanged={refresh}
          onOpenScoreInsights={onOpenScoreInsights}
        />
      </div>

      {/* AUTH batch — sign-in & recovery methods (identifier registry) */}
      <div className="min-w-0 lg:col-span-1">
        <SignInMethodsCard />
      </div>
      </div>
    </>
  );
}
