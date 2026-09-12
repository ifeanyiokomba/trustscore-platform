"use client";

// TrustScore Stage 5 — SecurityCenter (directive §15 Identity Security
// Center + change alerts). Active sessions with remote revoke, notification
// feed with mark-read, and the security-event timeline.

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  MonitorSmartphone,
  Bell,
  CheckCheck,
  Loader2,
  Ban,
  Globe,
  History,
  TrendingDown,
  LineChart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { NotificationInfo, SessionInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
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
  SIGNAL_PHONE_VERIFIED: "Phone verified",
  SIGNAL_PHONE_FAILED: "Phone verification failed",
  SIGNAL_LIVENESS_STARTED: "Liveness check started",
  SIGNAL_LIVENESS_PASSED: "Liveness passed",
  SIGNAL_LIVENESS_FAILED: "Liveness check failed",
  SCORE_SNAPSHOT: "TrustScore snapshot",
  CREDENTIAL_ISSUED: "Credential issued",
  CREDENTIAL_REVOKED: "Credential revoked",
  SHARE_TOKEN_CREATED: "Trust link created",
  SHARE_TOKEN_VIEWED: "Trust Card viewed",
  SHARE_TOKEN_REVOKED: "Trust link revoked",
  SHARE_TOKEN_BLOCKED: "Blocked trust-link open",
  SESSION_REVOKED: "Session revoked",
  // Stage 6 — Safety Check
  SAFETY_CHECK_RUN: "A member ran a safety check on you",
  SAFETY_SETTINGS_UPDATED: "Safety-check settings updated",
  TRUST_REQUEST_SENT: "Trust request received",
  // Stage 7 — Reputation
  FLAG_SUBMITTED: "A member filed a flag against you",
  FLAG_RESPONSE: "You responded to a flag",
  FLAG_RESOLUTION: "A flag against you was decided (human review)",
  FLAG_WITHDRAWN: "A flag against you was withdrawn",
  APPEAL_FILED: "You appealed a confirmed flag",
  APPEAL_DECIDED: "An appeal on your flag was decided",
  // Stage 8 — Trust Engine
  POLICY_DRAFTED: "A scoring-policy draft was created",
  POLICY_ACTIVATED: "A new scoring policy version was activated",
  POLICY_SIMULATED: "A policy impact dry-run was simulated (nothing changed)",
  DPIA_RECORDED: "A DPIA assessment was recorded",
  ENGINE_GATE_TOGGLED: "The automated-decision gate was changed",
  // Stage 9 — B2B Platform
  DEV_CLIENT_CREATED: "You registered an API client (business app)",
  DEV_CLIENT_LIVE_ENABLED: "An API client switched to the LIVE posture",
  DEV_PLAN_CHANGED: "An API client plan changed",
  API_KEY_MINTED: "An API key was minted (raw key shown once, never stored)",
  API_KEY_REVOKED: "An API key was revoked",
  API_QUOTA_EXCEEDED: "A daily API quota was exhausted",
  WEBHOOK_CONFIGURED: "A webhook endpoint was configured",
  WEBHOOK_TEST_SENT: "A webhook test event was sent",
  DEV_TEAM_MEMBER_ADDED: "A teammate was added to an API client",
  DEV_TEAM_MEMBER_REMOVED: "A teammate was removed from an API client",
  TRUST_DECISION_API: "A Trust Decision API check ran through your client",
  // Stage 10 — Trust Network
  NETWORK_JOINED: "You joined the Trust Network",
  NETWORK_PAUSED: "You paused your Trust Network membership",
  NETWORK_INTERACTION_PROPOSED: "You proposed a verified interaction",
  NETWORK_INTERACTION_ACCEPTED: "A verified interaction became mutual",
  NETWORK_INTERACTION_DECLINED: "A verified-interaction proposal was declined",
  NETWORK_INTERACTION_REVOKED: "A verified interaction was revoked",
  NETWORK_SIGNAL_MINTED: "A shared signal was recorded (human-confirmed event)",
  NETWORK_SIGNAL_RETRACTED: "A shared signal was retracted (appeal overturned)",
  // Stage 11 — Score Insights
  SCORE_HISTORY_EXPORTED: "You exported your score history (CSV/JSON)",
  DSR_EXPORT_REQUESTED: "Data export requested",
  DSR_EXPORT_COMPLETED: "Data export delivered",
  DSR_DELETE_REQUESTED: "Account deletion requested",
  DSR_DELETE_COMPLETED: "Account deleted (NDPA §36)",
};

function describeDevice(ua: string): string {
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /Chrome\//.test(ua) && !/Chromium/.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Browser";
  const os =
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad/.test(ua) ? "iOS" :
    /Linux/.test(ua) ? "Linux" : "unknown OS";
  return `${browser} · ${os}`;
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

const NOTIF_TONE: Record<string, { icon: React.ElementType; className: string }> = {
  SECURITY: { icon: ShieldCheck, className: "text-primary bg-primary/10" },
  VERIFICATION: { icon: CheckCheck, className: "text-primary bg-primary/10" },
  SYSTEM: { icon: Bell, className: "text-muted-foreground bg-muted" },
  // Stage 12 — material score-change receipts (amber, actionable)
  SCORE: { icon: TrendingDown, className: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
};

export function SecurityCenter({
  sessions,
  activeSessionCount,
  notifications,
  securityEvents,
  currentSessionId,
  onChanged,
  onOpenScoreInsights,
}: {
  sessions: SessionInfo[];
  activeSessionCount?: number;
  notifications: NotificationInfo[];
  securityEvents: { id: string; action: string; createdAt: string }[];
  currentSessionId: string | null;
  onChanged: () => void;
  onOpenScoreInsights?: () => void;
}) {
  const [revoking, setRevoking] = React.useState<SessionInfo | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [marking, setMarking] = React.useState(false);

  const confirmRevoke = React.useCallback(async () => {
    if (!revoking) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/security/sessions/${revoking.id}/revoke`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Session revoked", {
          description: "That device was signed out of your account.",
        });
        onChanged();
      } else {
        const body = await res.json().catch(() => null);
        toast.error("Could not revoke session", {
          description: body?.error?.message ?? "Please try again.",
        });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setBusy(false);
      setRevoking(null);
    }
  }, [revoking, onChanged]);

  const markAllRead = React.useCallback(async () => {
    setMarking(true);
    try {
      const res = await fetch("/api/v1/passport/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        onChanged();
      }
    } catch {
      // silent — non-critical
    } finally {
      setMarking(false);
    }
  }, [onChanged]);

  const unread = notifications.filter((n) => n.readAt === null).length;

  return (
    <>
      <Card className="ts-card-hover min-w-0">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MonitorSmartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">Active sessions</CardTitle>
            <CardDescription className="truncate">
              Devices currently signed in — revoke any you don&apos;t recognize
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/5 text-primary">
            {activeSessionCount ?? sessions.length} live
          </Badge>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No active sessions.</p>
          ) : (
            <ul className="space-y-2" aria-label="Active sessions">
              {sessions.map((s, i) => {
                const isCurrent = s.id === currentSessionId;
                return (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    data-testid="session-row"
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3",
                      isCurrent
                        ? "ts-rung-active border-primary/30"
                        : "border-border bg-muted/30"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isCurrent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <MonitorSmartphone className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {describeDevice(s.userAgent || "unknown device")}
                        </span>
                        {isCurrent && (
                          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-[10px] text-primary">
                            this device
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                        <span>signed in {timeAgo(s.createdAt)}</span>
                        {s.ipHashPrefix && (
                          <span className="inline-flex items-center gap-1">
                            <Globe className="h-3 w-3" aria-hidden="true" />
                            ip⁚ {s.ipHashPrefix}
                          </span>
                        )}
                      </p>
                    </div>
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setRevoking(s)}
                      >
                        <Ban className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Revoke
                      </Button>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {(activeSessionCount ?? sessions.length) > sessions.length
              ? `Showing the ${sessions.length} most recent devices — ${activeSessionCount ?? 0} sessions are live in total. `
              : ""}
            IPs are stored only as <span className="font-medium text-foreground">salted hashes</span> —
            we couldn&apos;t read them back if we wanted to. Sign-ins trigger a change alert in your
            notifications.
          </p>
        </CardContent>
      </Card>

      <Card className="ts-card-hover min-w-0">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">Change alerts</CardTitle>
            <CardDescription className="truncate">
              Sign-ins, verifications, links, credentials — straight to you
            </CardDescription>
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => void markAllRead()}
              disabled={marking}
            >
              {marking ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              )}
              Mark all read
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No notifications yet — they arrive as your account changes.
            </p>
          ) : (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1" aria-label="Notifications">
              {notifications.map((n) => {
                const tone = NOTIF_TONE[n.type] ?? NOTIF_TONE.SYSTEM;
                const ToneIcon = tone.icon;
                const isScore = n.type === "SCORE";
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-3.5 py-3",
                      n.readAt === null
                        ? isScore
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-primary/25 bg-primary/5"
                        : "border-border/70 bg-muted/20"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        tone.className
                      )}
                    >
                      <ToneIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate text-xs font-semibold", n.readAt === null && "text-foreground")}>
                          {n.title}
                        </span>
                        <time className="shrink-0 text-[10px] text-muted-foreground" dateTime={n.createdAt}>
                          {timeAgo(n.createdAt)}
                        </time>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {n.body}
                      </p>
                      {isScore && onOpenScoreInsights ? (
                        <button
                          type="button"
                          onClick={onOpenScoreInsights}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        >
                          <LineChart className="h-3 w-3" aria-hidden="true" />
                          View in Score Insights
                        </button>
                      ) : null}
                    </div>
                    {n.readAt === null && (
                      <span
                        className={cn(
                          "ts-pulse mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          isScore ? "bg-amber-500" : "bg-primary"
                        )}
                        aria-label="unread"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="ts-card-hover min-w-0">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">Security timeline</CardTitle>
            <CardDescription className="truncate">
              Audited events on your account — redacted, no PII in metadata
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {securityEvents.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ol className="relative max-h-72 space-y-1 overflow-y-auto border-l border-border pl-4 pr-1" aria-label="Security event timeline">
              {securityEvents.map((e) => (
                <li key={e.id} className="relative py-1.5 text-xs">
                  <span
                    className={cn(
                      "absolute -left-[21px] top-2.5 h-2 w-2 rounded-full",
                      e.action.includes("FAILED") || e.action.includes("BLOCKED")
                        ? "bg-amber-500"
                        : "bg-primary"
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-foreground">
                    {EVENT_LABELS[e.action] ?? e.action}
                  </span>
                  <time className="ml-2 text-[10px] text-muted-foreground" dateTime={e.createdAt}>
                    {timeAgo(e.createdAt)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
            <AlertDialogDescription>
              The device {revoking ? describeDevice(revoking.userAgent) : ""} will be signed out
              immediately. If it was you, no harm done — you can always sign back in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmRevoke();
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Revoke session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
