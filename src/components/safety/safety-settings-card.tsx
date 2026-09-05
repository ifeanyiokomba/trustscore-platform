"use client";

// TrustScore Stage 6 — SafetySettingsCard (subject-side).
// The standing SAFETY_CHECK consent: members decide whether they can be
// checked by handle/phone, and what the assessment reveals (profile,
// signals). Toggling off withdraws the consent — checks stop immediately.
// Below: who checked you (named receipts) and trust requests received
// (accept mints a scoped trust link — raw token shown ONCE — or decline).

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldQuestion,
  Loader2,
  AtSign,
  Phone,
  QrCode,
  Link2,
  Eye,
  ShieldCheck,
  Send,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { SafetyMe, TrustRequestAcceptResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

const METHOD_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  HANDLE: AtSign,
  PHONE: Phone,
  QR: QrCode,
  TRUST_LINK: Link2,
};

function ScopeRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  testId,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled: boolean;
  testId: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-3 transition-opacity",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={title}
        data-testid={testId}
      />
    </div>
  );
}

export function SafetySettingsCard() {
  const [me, setMe] = React.useState<SafetyMe | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [responding, setResponding] = React.useState<string | null>(null);
  const [accepted, setAccepted] = React.useState<{
    token: string;
    linkPath: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/safety/me", { cache: "no-store" });
      if (res.ok) setMe(await res.json());
      else setMe(null);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveSettings(next: {
    enabled: boolean;
    includeProfile: boolean;
    includeSignals: boolean;
    allowPhoneMatch: boolean;
  }) {
    setSaving(true);
    setMe((prev) => (prev ? { ...prev, settings: { ...prev.settings, ...next } } : prev));
    try {
      const res = await fetch("/api/v1/safety/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        const body = await res.json();
        setMe((prev) => (prev ? { ...prev, settings: body.settings } : prev));
      } else {
        void refresh();
      }
    } catch {
      void refresh();
    } finally {
      setSaving(false);
    }
  }

  async function respond(requestId: string, decision: "ACCEPT" | "DECLINE") {
    if (responding) return;
    setResponding(requestId);
    try {
      const res = await fetch(`/api/v1/safety/request/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        const body = (await res.json()) as TrustRequestAcceptResponse;
        if (body.decision === "ACCEPTED" && body.token) {
          setAccepted({ token: body.token, linkPath: body.linkPath ?? "" });
        }
        void refresh();
      }
    } catch {
      /* keep UI as-is */
    } finally {
      setResponding(null);
    }
  }

  async function copyToken() {
    if (!accepted) return;
    try {
      await navigator.clipboard.writeText(accepted.linkPath || accepted.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground" role="status">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading your safety-check settings…
        </CardContent>
      </Card>
    );
  }
  if (!me) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Could not load safety-check settings. Refresh the page to retry.
        </CardContent>
      </Card>
    );
  }

  const s = me.settings;
  const pendingRequests = me.requestsReceived.filter(
    (r) => r.status === "PENDING"
  );

  return (
    <Card className="ts-card-hover min-w-0 lg:col-span-3">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            s.enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <ShieldQuestion className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Safety Check consent</CardTitle>
          <CardDescription className="truncate">
            Decide whether members can check you before they deal
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />}
          <Switch
            checked={s.enabled}
            onCheckedChange={(v) =>
              void saveSettings({
                enabled: v,
                includeProfile: v ? s.includeProfile : false,
                includeSignals: v ? s.includeSignals : false,
                allowPhoneMatch: v ? s.allowPhoneMatch : false,
              })
            }
            aria-label="Allow safety checks on your handle"
            data-testid="safety-toggle"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Master consent line */}
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-xs leading-relaxed",
            s.enabled
              ? "border-primary/30 bg-primary/5 text-foreground"
              : "border-border bg-muted/30 text-muted-foreground"
          )}
          data-testid="safety-consent-state"
        >
          <ShieldCheck
            className={cn("mt-0.5 h-4 w-4 shrink-0", s.enabled ? "text-primary" : "")}
            aria-hidden="true"
          />
          {s.enabled ? (
            <span>
              Members can run a <span className="font-semibold">receipted</span> safety check on
              your handle{s.allowPhoneMatch ? " or verified phone number" : ""}. You see every
              check with the member&apos;s name. Consent granted{" "}
              {s.grantedAt ? timeAgo(s.grantedAt) : "recently"} — withdraw anytime, effective
              immediately (NDPA §31).
            </span>
          ) : (
            <span>
              Safety checks on your handle are <span className="font-semibold">off</span>. Members
              who want to deal with you can send a trust request instead — you choose whether to
              share. Turning this on creates a standing consent you can withdraw at any time.
            </span>
          )}
        </div>

        {/* Scope toggles */}
        {s.enabled && (
          <div className="grid gap-2.5 sm:grid-cols-3">
            <ScopeRow
              icon={AtSign}
              title="Show profile"
              description="Your display name and @handle on assessments"
              checked={s.includeProfile}
              onCheckedChange={(v) =>
                void saveSettings({ ...s, includeProfile: v })
              }
              disabled={saving}
              testId="safety-scope-profile"
            />
            <ScopeRow
              icon={Eye}
              title="Show signals"
              description="Signal chips (government ID, phone, biometric) with masked hints"
              checked={s.includeSignals}
              onCheckedChange={(v) =>
                void saveSettings({ ...s, includeSignals: v })
              }
              disabled={saving}
              testId="safety-scope-signals"
            />
            <ScopeRow
              icon={Phone}
              title="Phone number match"
              description="Members who know your number can match it to your profile"
              checked={s.allowPhoneMatch}
              onCheckedChange={(v) =>
                void saveSettings({ ...s, allowPhoneMatch: v })
              }
              disabled={saving}
              testId="safety-scope-phone"
            />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Checks received", value: me.stats.totalChecks },
            { label: "Last 7 days", value: me.stats.last7Days },
            { label: "Last check", value: me.stats.lastCheckAt ? timeAgo(me.stats.lastCheckAt) : "—" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="ts-stat-block rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5 text-center"
            >
              <p className="text-lg font-bold tabular-nums text-primary">{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Accepted trust link (once-only) */}
        {accepted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="safety-accepted-token"
            className="rounded-lg border border-primary/40 bg-primary/5 p-4"
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Trust link minted — copy it now, it is shown only once
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              10 opens · 7 days · every open receipted. Send it to the member who asked, or anyone
              you choose.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px]">
                {accepted.linkPath || accepted.token}
              </code>
              <Button size="sm" variant="outline" onClick={() => void copyToken()} data-testid="safety-copy-token">
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 text-primary" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Trust requests received */}
        {pendingRequests.length > 0 && (
          <div data-testid="safety-pending-requests">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Trust requests waiting for you
            </p>
            <ul className="mt-2 space-y-2">
              {pendingRequests.map((r) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Send className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    <p className="min-w-0 flex-1 text-xs">
                      <span className="font-semibold">{r.verifier?.displayName ?? "A member"}</span>{" "}
                      <span className="font-mono text-primary">@{r.verifier?.handle}</span>
                      <span className="text-muted-foreground"> asks for your Trust Card</span>
                    </p>
                    <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
                      expires in 7 days
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => void respond(r.id, "ACCEPT")}
                      disabled={responding === r.id}
                      data-testid={`safety-accept-${r.id}`}
                    >
                      {responding === r.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Accept &amp; share
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void respond(r.id, "DECLINE")}
                      disabled={responding === r.id}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {/* Checks received */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Who checked you
            </p>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              {me.checksReceived.length} receipt{me.checksReceived.length === 1 ? "" : "s"}
            </Badge>
          </div>
          {me.checksReceived.length === 0 ? (
            <div className="mt-2 rounded-lg border border-dashed border-border py-6 text-center">
              <FileText className="mx-auto h-6 w-6 text-muted-foreground/50" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">No one has checked you yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.enabled
                  ? "When a member runs a safety check on you, it lands here with their name."
                  : "Turn on safety checks to be checkable — or share a trust link instead."}
              </p>
            </div>
          ) : (
            <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1" data-testid="safety-received-list">
              {me.checksReceived.map((c) => {
                const Icon = METHOD_ICON[c.method] ?? AtSign;
                return (
                  <li
                    key={c.id}
                    data-testid="safety-received-row"
                    className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/25 px-3.5 py-2.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {c.verifier ? `@${c.verifier.handle}` : "A member"}
                        {c.verifier ? <span className="font-normal text-muted-foreground"> · {c.verifier.displayName}</span> : null}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        saw: {c.shown.headline ?? "—"}
                        {c.shown.signalsCount > 0 && ` · ${c.shown.signalsCount} signal${c.shown.signalsCount === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    <time
                      className="shrink-0 text-[10px] text-muted-foreground"
                      dateTime={c.checkedAt}
                      title={new Date(c.checkedAt).toLocaleString("en-NG")}
                    >
                      {timeAgo(c.checkedAt)}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
          {me.requestsReceived.length > 0 && (
            <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground">
              <Clock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              Older trust requests:{" "}
              {me.requestsReceived
                .map((r) => `@${r.verifier?.handle ?? "?"} — ${r.status.toLowerCase()}`)
                .join(" · ")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
