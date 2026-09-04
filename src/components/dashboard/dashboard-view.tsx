"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  AtSign,
  Mail,
  CalendarDays,
  User,
  BadgeCheck,
  Loader2,
  LogOut,
  Bell,
  History,
  Network,
  EyeOff,
  CalendarClock,
  FileCheck2,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IdentityCard } from "@/components/dashboard/identity-card";
import { AssuranceLadder } from "@/components/dashboard/assurance-ladder";
import { AttributesCard } from "@/components/dashboard/attributes-card";
import { EvidenceCard } from "@/components/dashboard/evidence-card";
import { SignalsCard } from "@/components/dashboard/signals-card";
import { PhoneVerifyModal } from "@/components/auth/phone-modal";
import { LivenessModal } from "@/components/auth/liveness-modal";
import { useTrustStore } from "@/lib/store";
import type { ActivityEvent, IdentityMe } from "@/lib/types";

const ACTION_LABELS: Record<string, string> = {
  AUTH_REGISTER: "Account created",
  AUTH_LOGIN: "Signed in",
  AUTH_LOGIN_FAILED: "Failed sign-in attempt",
  AUTH_LOGOUT: "Signed out",
  IDENTITY_SESSION_CREATED: "Verification session started",
  IDENTITY_CONSENT_GRANTED: "Identity consent granted",
  IDENTITY_CONSENT_DENIED: "Identity consent denied",
  IDENTITY_VERIFIED: "Trust Identity established",
  IDENTITY_SESSION_FAILED: "Verification failed",
  IDENTITY_CONSENT_WITHDRAWN: "Consent withdrawn (NDPA right)",
  SIGNAL_PHONE_STARTED: "Phone verification started",
  SIGNAL_PHONE_RESENT: "New SMS code sent",
  SIGNAL_PHONE_VERIFIED: "Phone verified — Level 2",
  SIGNAL_PHONE_FAILED: "Phone verification failed",
  SIGNAL_LIVENESS_STARTED: "Liveness check started",
  SIGNAL_LIVENESS_PASSED: "Liveness passed",
  SIGNAL_LIVENESS_FAILED: "Liveness check failed",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

export function DashboardView() {
  const { user, setView, signOut, pending } = useTrustStore();
  const [activity, setActivity] = React.useState<ActivityEvent[] | null>(null);
  const [activityLoading, setActivityLoading] = React.useState(true);
  const [identityData, setIdentityData] = React.useState<IdentityMe | null>(null);
  const [identityLoading, setIdentityLoading] = React.useState(true);
  const [phoneModalOpen, setPhoneModalOpen] = React.useState(false);
  const [livenessModalOpen, setLivenessModalOpen] = React.useState(false);

  const refreshIdentity = React.useCallback(async () => {
    setIdentityLoading(true);
    try {
      const res = await fetch("/api/v1/identity/me", { cache: "no-store" });
      if (res.ok) {
        setIdentityData(await res.json());
      } else {
        setIdentityData(null);
      }
    } catch {
      setIdentityData(null);
    } finally {
      setIdentityLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!user) return;
    void refreshIdentity();
  }, [user, refreshIdentity]);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setActivityLoading(true);
      try {
        const res = await fetch("/api/v1/auth/activity", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const body = await res.json();
        if (!cancelled) setActivity(body.events ?? []);
      } catch {
        if (!cancelled) setActivity([]);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, identityData]);

  if (!user) return null;

  const hasIdentity = identityData?.identity.status === "VERIFIED";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-5xl px-4 py-10 sm:px-6"
      aria-labelledby="dash-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Stage 4 · Trust Signals
          </p>
          <h1 id="dash-heading" className="mt-1 text-3xl font-bold tracking-tight">
            Welcome back, {user.displayName.split(" ")[0]}
          </h1>
        </div>
        <Button variant="outline" onClick={() => setView("landing")}>
          Back to home
        </Button>
      </div>

      {identityLoading ? (
        <div className="mt-8 flex items-center justify-center rounded-xl border border-dashed border-border py-16 text-muted-foreground" role="status">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading your Trust Identity…
        </div>
      ) : (
        <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-3">
          {/* Account card */}
          <Card className="ts-card-hover min-w-0 lg:col-span-1">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">Your account</CardTitle>
                <CardDescription className="truncate">Platform foundation account</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <dt className="sr-only">Name</dt>
                  <dd className="font-medium">{user.displayName}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <dt className="sr-only">Email</dt>
                  <dd className="min-w-0 truncate text-muted-foreground">{user.email}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <dt className="sr-only">Handle</dt>
                  <dd className="font-mono text-primary">trustscore.ng/@{user.handle}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <dt className="sr-only">Member since</dt>
                  <dd className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              </dl>
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="min-w-0 text-xs font-medium">
                  Status: <span className="text-primary">{user.status}</span> — handle reserved
                  for your future Trust Link.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => signOut()}
                disabled={pending}
              >
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                Sign out
              </Button>
            </CardContent>
          </Card>

          {/* Trust Identity — spine with fingerprints + consent withdrawal */}
          <div className="min-w-0 lg:col-span-2">
            <IdentityCard data={identityData} onChanged={refreshIdentity} />
          </div>

          {/* Stage 3 — Assurance ladder */}
          <div className="min-w-0 lg:col-span-1">
            <AssuranceLadder ladder={identityData?.ladder ?? []} />
          </div>

          {/* Stage 4 — Trust signals (phone + biometric + cross-signal) */}
          <div className="min-w-0 lg:col-span-2">
            <SignalsCard
              signals={identityData?.signals ?? null}
              loading={identityLoading}
              hasIdentity={hasIdentity}
              onPhoneVerify={() => setPhoneModalOpen(true)}
              onLiveness={() => setLivenessModalOpen(true)}
              onChanged={refreshIdentity}
            />
          </div>

          {/* Stage 3 — Consent-scoped attributes */}
          <div className="min-w-0 lg:col-span-2">
            <AttributesCard
              attributes={identityData?.attributes ?? []}
              consents={identityData?.consents ?? []}
              hasIdentity={hasIdentity}
              onChanged={refreshIdentity}
            />
          </div>

          {/* Stage 3 — Evidence records */}
          <div className="min-w-0 lg:col-span-1">
            <EvidenceCard evidence={identityData?.evidence ?? []} />
          </div>

          {/* Stage 4 — Signals privacy explainer */}
          <Card className="ts-card-hover min-w-0 lg:col-span-1">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <EyeOff className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">How your signals are protected</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    Your phone number is stored as a <span className="font-medium text-foreground">salted fingerprint</span> —
                    never the raw number. Biometrics store the <span className="font-medium text-foreground">verdict only</span>,
                    never selfie pixels or templates.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    Every signal carries a <span className="font-medium text-foreground">90-day freshness horizon</span> —
                    stale signals drop out of the ladder automatically.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <FileCheck2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    Each binding is a <span className="font-medium text-foreground">standing consent</span> (NDPA §31):
                    withdraw it and the signal is revoked instantly, with the action audited.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Network className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    L4 requires <span className="font-medium text-foreground">cross-signal agreement</span> — no SIM-swap
                    flags, a matching face, fresh signals. One document alone never gets there.
                  </span>
                </li>
              </ul>
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                Phone and biometric providers are honestly labeled <span className="font-semibold text-primary">MOCK</span> —
                contract-first adapters that activate LIVE once partner credentials exist.
              </p>
            </CardContent>
          </Card>

          {/* Security center preview */}
          <Card className="ts-card-hover min-w-0 lg:col-span-2">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <History className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">Account activity</CardTitle>
                <CardDescription className="truncate">
                  Security Center preview — every action on your account is audited
                </CardDescription>
              </div>
              <Bell className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground" role="status">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading activity…
                </div>
              ) : activity && activity.length > 0 ? (
                <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1" aria-label="Recent account activity">
                  {activity.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            ev.action === "AUTH_LOGIN_FAILED"
                              ? "bg-amber-500"
                              : ev.action === "IDENTITY_CONSENT_WITHDRAWN"
                                ? "bg-amber-500"
                                : "bg-primary"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate">{ACTION_LABELS[ev.action] ?? ev.action}</span>
                      </span>
                      <time className="shrink-0 text-xs text-muted-foreground" dateTime={ev.createdAt}>
                        {timeAgo(ev.createdAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No activity recorded yet.
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                Full Identity Security Center (change alerts, active sessions, notifications)
                arrives in Stage 5. Audit data is redacted — no PII in event metadata.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stage 4 modals */}
      <PhoneVerifyModal
        open={phoneModalOpen}
        onOpenChange={setPhoneModalOpen}
        onVerified={refreshIdentity}
      />
      <LivenessModal
        open={livenessModalOpen}
        onOpenChange={setLivenessModalOpen}
        onCompleted={refreshIdentity}
      />
    </motion.section>
  );
}
