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
  Hourglass,
  KeyRound,
  History,
  Loader2,
  LogOut,
  Bell,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrustStore } from "@/lib/store";
import type { ActivityEvent } from "@/lib/types";

const ACTION_LABELS: Record<string, string> = {
  AUTH_REGISTER: "Account created",
  AUTH_LOGIN: "Signed in",
  AUTH_LOGIN_FAILED: "Failed sign-in attempt",
  AUTH_LOGOUT: "Signed out",
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
  }, [user]);

  if (!user) return null;

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
            Stage 1 · Platform Foundation
          </p>
          <h1 id="dash-heading" className="mt-1 text-3xl font-bold tracking-tight">
            Welcome back, {user.displayName.split(" ")[0]}
          </h1>
        </div>
        <Button variant="outline" onClick={() => setView("landing")}>
          Back to home
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Account card */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Your account</CardTitle>
              <CardDescription>Stage 1 foundation</CardDescription>
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
                <dd className="truncate text-muted-foreground">{user.email}</dd>
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
            <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
              <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-xs font-medium">
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

        {/* Trust Identity (Stage 2 preview) */}
        <Card className="border-dashed lg:col-span-2">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Fingerprint className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Trust Identity</CardTitle>
              <CardDescription>Your verified identity spine</CardDescription>
            </div>
            <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">
              <Hourglass className="mr-1 h-3 w-3" />
              Arrives Stage 2
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border bg-muted/40 p-5 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="h-6 w-6" />
              </span>
              <p className="mt-4 text-sm font-semibold">No Trust Identity established yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                When NINAuth verification ships (Stage 2), you&apos;ll verify through
                Nigeria&apos;s official identity consent gateway — QR or share code, with
                explicit consent — and your Trust Identity will unlock the Trust Passport,
                Safety Check and Trust Link.
              </p>
              <Button className="mt-5" disabled aria-disabled="true">
                Continue with NINAuth
                <Badge variant="secondary" className="ml-2 text-[10px]">Stage 2</Badge>
              </Button>
            </div>
            <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary/60" aria-hidden="true" />
                Government identity verification
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary/60" aria-hidden="true" />
                Consent-scoped attributes only
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary/60" aria-hidden="true" />
                No raw NIN ever stored
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary/60" aria-hidden="true" />
                Freshness tracked from day one
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Security center preview */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Account activity</CardTitle>
              <CardDescription>
                Security Center preview — every action on your account is audited
              </CardDescription>
            </div>
            <Bell className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          ev.action === "AUTH_LOGIN_FAILED" ? "bg-amber-500" : "bg-primary"
                        }`}
                        aria-hidden="true"
                      />
                      {ACTION_LABELS[ev.action] ?? ev.action}
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
    </motion.section>
  );
}
