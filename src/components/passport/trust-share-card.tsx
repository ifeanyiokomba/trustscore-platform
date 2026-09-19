"use client";

// TrustScore Stage 5 — TrustCard + ShareTokens (directive §5 Trust Passport).
// The QR trust card is the "show your phone" artifact: a branded card with a
// QR that opens the public Trust Link. The RAW share token appears exactly
// ONCE (at creation, in this dialog); the DB keeps only sha256.

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import {
  QrCode,
  Share2,
  Copy,
  Download,
  Loader2,
  ShieldCheck,
  Clock,
  Eye,
  Ban,
  LinkIcon,
  ShieldAlert,
  CheckCircle2,
  Info,
  BarChart3,
  Webhook,
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
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { PassportMe, ShareTokenAnalytics, ShareTokenCreated, ShareTokenInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCOPE_META: Record<string, string> = {
  PROFILE: "Profile (name, handle)",
  SIGNALS: "Verified signals (masked)",
  ATTRIBUTES: "Government attributes",
  SCORE: "TrustScore + assurance level",
};

const TTL_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "24", label: "24 hours" },
  { value: "72", label: "3 days" },
  { value: "168", label: "7 days" },
];

const VIEW_OPTIONS = [
  { value: "1", label: "1 view" },
  { value: "3", label: "3 views" },
  { value: "5", label: "5 views" },
  { value: "20", label: "20 views" },
];

function useCountdown(iso: string | null): string {
  const [label, setLabel] = React.useState("");
  React.useEffect(() => {
    if (!iso) {
      setLabel("");
      return;
    }
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("expired");
        return;
      }
      const h = Math.floor(ms / 3600_000);
      const m = Math.floor((ms % 3600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setLabel(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [iso]);
  return label;
}

function ShareDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [ttl, setTtl] = React.useState("24");
  const [maxViews, setMaxViews] = React.useState("5");
  const [scopes, setScopes] = React.useState<string[]>(["PROFILE", "SIGNALS", "ATTRIBUTES", "SCORE"]);
  const [creating, setCreating] = React.useState(false);
  const [created, setCreated] = React.useState<ShareTokenCreated | null>(null);
  const [qrSvg, setQrSvg] = React.useState<string>("");
  const countdown = useCountdown(created?.expiresAt ?? null);
  const [copied, setCopied] = React.useState<"link" | "token" | null>(null);

  React.useEffect(() => {
    if (!open) {
      // Reset the dialog state after it closes.
      const t = window.setTimeout(() => {
        setCreated(null);
        setQrSvg("");
        setCopied(null);
      }, 300);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    if (!created) return;
    const url = `${window.location.origin}${created.linkPath}`;
    QRCode.toString(url, {
      type: "svg",
      margin: 1,
      width: 232,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setQrSvg)
      .catch(() => setQrSvg(""));
  }, [created]);

  const create = React.useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/passport/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ttlHours: Number(ttl),
          maxViews: Number(maxViews),
          scopes,
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as ShareTokenCreated;
        setCreated(body);
        onCreated();
        toast.success("Trust link created", {
          description: "The token is shown once — save or share it now.",
        });
      } else {
        const body = await res.json().catch(() => null);
        toast.error("Could not create link", {
          description: body?.error?.message ?? "Please try again.",
        });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setCreating(false);
    }
  }, [ttl, maxViews, scopes, onCreated]);

  const copy = React.useCallback(async (what: "link" | "token") => {
    if (!created) return;
    const text =
      what === "link" ? `${window.location.origin}${created.linkPath}` : created.token;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1600);
      toast.success(what === "link" ? "Link copied" : "Token copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  }, [created]);

  const downloadPng = React.useCallback(async () => {
    if (!created) return;
    try {
      const url = `${window.location.origin}${created.linkPath}`;
      const dataUrl = await QRCode.toDataURL(url, {
        margin: 2,
        width: 640,
        color: { dark: "#000000", light: "#ffffff" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "trustscore-qr.png";
      a.click();
      toast.success("QR image saved");
    } catch {
      toast.error("Could not render the QR image");
    }
  }, [created]);

  const toggleScope = (s: string) => {
    setScopes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {!created ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" aria-hidden="true" />
                Create a Trust Link
              </DialogTitle>
              <DialogDescription>
                A scoped, expiring link (plus QR) that opens your public Trust Card.
                The token is shown <span className="font-semibold text-foreground">once</span>;
                we store only its hash.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" htmlFor="ttl-select">
                    Valid for
                  </label>
                  <Select value={ttl} onValueChange={setTtl}>
                    <SelectTrigger id="ttl-select" aria-label="Link validity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TTL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" htmlFor="views-select">
                    Max opens
                  </label>
                  <Select value={maxViews} onValueChange={setMaxViews}>
                    <SelectTrigger id="views-select" aria-label="Maximum opens">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEW_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1.5 text-xs font-semibold">
                  What the viewer may see
                </legend>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  {Object.entries(SCOPE_META).map(([key, label]) => {
                    const on = scopes.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleScope(key)}
                        aria-pressed={on}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                          on
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {on ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                        ) : (
                          <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" aria-hidden="true" />
                        )}
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  At least one field must be shared.
                </p>
              </fieldset>
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Every open is <span className="font-medium text-foreground">counted and receipted</span> —
                  you will see who checked you and when. Revoke the link anytime to kill it instantly.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => void create()}
                disabled={creating || scopes.length === 0}
                className="w-full"
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Create Trust Link
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                Trust Link created
              </DialogTitle>
              <DialogDescription>
                Save it now — this token is never shown again. Expires in{" "}
                <span className="font-semibold text-foreground tabular-nums">{countdown}</span>{" "}
                · {created.maxViews} open{created.maxViews === 1 ? "" : "s"} allowed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="ts-trust-card relative overflow-hidden rounded-xl">
                <div className="ts-shimmer pointer-events-none absolute inset-0" aria-hidden="true" />
                <div className="relative flex flex-col items-center gap-3 px-5 py-5">
                  <div className="flex w-full items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      TrustScore · Trust Card
                    </span>
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      {scopes.join(" · ")}
                    </span>
                  </div>
                  {qrSvg ? (
                    <div
                      className="rounded-lg bg-white p-2.5 shadow-lg"
                      aria-label="QR code opening the public Trust Card"
                      role="img"
                      data-testid="qr-code"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  ) : (
                    <div className="flex h-[232px] w-[232px] items-center justify-center rounded-lg bg-white/90">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-800" aria-hidden="true" />
                    </div>
                  )}
                  <p className="text-[10px] leading-snug text-white/80">
                    Scan to open the live Trust Card · every open is receipted
                  </p>
                </div>
              </div>
              <div
                data-testid="raw-token"
                className="ts-inset break-all rounded-lg px-3 py-2.5 font-mono text-[11px] leading-relaxed"
              >
                {created.token}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => void copy("link")}>
                  {copied === "link" ? (
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  ) : (
                    <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Copy link
                </Button>
                <Button variant="outline" size="sm" onClick={() => void copy("token")}>
                  {copied === "token" ? (
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  ) : (
                    <LinkIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Copy token
                </Button>
                <Button variant="outline" size="sm" onClick={() => void downloadPng()}>
                  <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  QR (.png)
                </Button>
              </div>
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                The link reveals only the fields you selected, shows{" "}
                <span className="font-medium text-foreground">no raw identifiers</span>, and dies on
                its own at expiry.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Batch 5 — Link analytics dialog (owner-only view of one link's receipts)
// ---------------------------------------------------------------------------

const ANALYTICS_CHANNELS: { key: string; label: string }[] = [
  { key: "TRUST_LINK", label: "Link opens" },
  { key: "SAFETY_CHECK", label: "Member checks" },
  { key: "API_CHECK", label: "API checks" },
];

function latencyLabel(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

function AnalyticsDialog({
  token,
  open,
  onOpenChange,
}: {
  token: ShareTokenInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = React.useState<ShareTokenAnalytics | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/v1/passport/share/${token.id}/analytics`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && body?.analytics) {
          setData(body.analytics as ShareTokenAnalytics);
        } else {
          setError(body?.error?.message ?? "Could not load analytics.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Network error — please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token.id]);

  const dead = (data?.status ?? token.status) !== "ACTIVE";
  const channelTotal = Math.max(
    1,
    ...ANALYTICS_CHANNELS.map((c) => data?.opensByChannel?.[c.key] ?? 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
            Link analytics
          </DialogTitle>
          <DialogDescription>
            How this trust link performed — derived from its trust receipts. Counts and
            receipt labels only; viewers are never identified.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading analytics…
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Status + scopes */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  dead
                    ? "border-border bg-muted text-muted-foreground"
                    : "border-primary/30 bg-primary/10 text-primary"
                )}
              >
                {data.status === "REVOKED" ? "revoked" : data.status === "EXPIRED" || dead ? "expired" : "live"}
              </Badge>
              {data.scopes.map((s) => (
                <Badge key={s} variant="outline" className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  {s}
                </Badge>
              ))}
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg border border-border bg-muted/25 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Opens</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums" data-testid="share-analytics-opens">
                  {data.views}
                  <span className="text-xs font-medium text-muted-foreground"> / {data.maxViews}</span>
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/25 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Views left</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums" data-testid="share-analytics-views-left">
                  {data.viewsLeft}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/25 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unique viewers</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums" data-testid="share-analytics-unique-viewers">
                  {data.uniqueViewers}
                </p>
                <p className="text-[10px] text-muted-foreground">distinct devices / IPs</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/25 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">First open</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums" data-testid="share-analytics-latency">
                  {latencyLabel(data.firstOpenLatencyMinutes)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {data.firstViewedAt ? `after link creation` : "never opened"}
                </p>
              </div>
            </div>

            {/* Channel breakdown mini-bars */}
            <div className="space-y-2" aria-label="Opens by channel">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Opens by channel
              </p>
              {ANALYTICS_CHANNELS.map((c) => {
                const n = data.opensByChannel?.[c.key] ?? 0;
                return (
                  <div key={c.key} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[11px] text-muted-foreground">{c.label}</span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${Math.round((n / channelTotal) * 100)}%` }}
                        data-testid={`share-analytics-channel-${c.key}`}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-[11px] font-semibold tabular-nums">{n}</span>
                  </div>
                );
              })}
            </div>

            {/* Recent opens timeline */}
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Recent opens
              </p>
              {data.recentOpens.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  No opens recorded yet.
                </p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 ts-scrollbar" data-testid="share-analytics-recent">
                  {data.recentOpens.map((o, i) => {
                    const OpenIcon =
                      o.channel === "SAFETY_CHECK" ? ShieldCheck : o.channel === "API_CHECK" ? Webhook : LinkIcon;
                    return (
                      <li
                        key={`${o.viewedAt}-${i}`}
                        className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-[11px]"
                      >
                        <OpenIcon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate font-medium">{o.viewerLabel}</span>
                        <time className="shrink-0 text-muted-foreground" dateTime={o.viewedAt}>
                          {timeAgoShort(o.viewedAt)}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Analytics are computed from your trust receipts (salted-IP dedupe for the
              unique-viewer count — the hashes themselves are never shown or exported).
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TokenRow({
  token,
  onRevoke,
}: {
  token: ShareTokenInfo;
  onRevoke: (t: ShareTokenInfo) => void;
}) {
  const countdown = useCountdown(token.expiresAt);
  const [analyticsOpen, setAnalyticsOpen] = React.useState(false);
  const dead = token.status !== "ACTIVE";
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      data-testid="share-token-row"
      className={cn(
        "rounded-lg border px-4 py-3",
        dead ? "border-dashed border-border bg-muted/30 opacity-70" : "ts-rung-active border-border"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {token.scopes.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className={cn(
                  "text-[9px] uppercase tracking-wide",
                  dead ? "border-border text-muted-foreground" : "border-primary/30 bg-primary/5 text-primary"
                )}
              >
                {s}
              </Badge>
            ))}
            <Badge variant="outline" className="text-[9px] uppercase tracking-wide text-muted-foreground">
              {dead
                ? token.status === "REVOKED"
                  ? "revoked"
                  : "expired"
                : countdown === "expired"
                  ? "expiring…"
                  : "live"}
            </Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye className="h-3 w-3" aria-hidden="true" />
              {token.views}/{token.maxViews} opens
            </span>
            {!dead && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {countdown} left
              </span>
            )}
            {token.lastViewedAt && (
              <span className="tabular-nums">
                last open{" "}
                {timeAgoShort(token.lastViewedAt)}
              </span>
            )}
          </div>
          {!dead && (
            <Progress
              value={(token.views / Math.max(1, token.maxViews)) * 100}
              className="mt-2 h-1"
              aria-label={`${token.views} of ${token.maxViews} opens used`}
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            aria-label={`Link analytics: ${token.scopes.join(", ")} link`}
            title="Link analytics"
            data-testid="share-analytics-trigger"
            onClick={() => setAnalyticsOpen(true)}
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          </Button>
          {!dead && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onRevoke(token)}
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Revoke
            </Button>
          )}
        </div>
      </div>
      <AnalyticsDialog token={token} open={analyticsOpen} onOpenChange={setAnalyticsOpen} />
    </motion.li>
  );
}

function timeAgoShort(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export function TrustShareCard({
  passport,
  onChanged,
}: {
  passport: PassportMe | null;
  onChanged: () => void;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [revoking, setRevoking] = React.useState<ShareTokenInfo | null>(null);
  const [busy, setBusy] = React.useState(false);

  const activeTokens = (passport?.shareTokens ?? []).filter((t) => t.status === "ACTIVE");
  const deadTokens = (passport?.shareTokens ?? []).filter((t) => t.status !== "ACTIVE");

  const confirmRevoke = React.useCallback(async () => {
    if (!revoking) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/passport/share/${revoking.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Trust link revoked", {
          description: "It now opens as revoked for anyone who tries it.",
        });
        onChanged();
      } else {
        const body = await res.json().catch(() => null);
        toast.error("Could not revoke", { description: body?.error?.message ?? "Please try again." });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setBusy(false);
      setRevoking(null);
    }
  }, [revoking, onChanged]);

  const status = passport?.score.status ?? "NEW";

  return (
    <Card className="ts-card-hover min-w-0 overflow-hidden">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <QrCode className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">QR Trust Card &amp; Trust Links</CardTitle>
          <CardDescription className="truncate">
            Let anyone verify you in one scan — scoped, expiring, receipted
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="shrink-0">
          <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Share
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Static trust-card visual (preview; QR comes with a live link) */}
        <div className="ts-trust-card relative overflow-hidden rounded-xl">
          <div className="ts-shimmer pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative flex items-center gap-4 px-5 py-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white p-2.5 shadow-lg"
              aria-hidden="true"
            >
              <QrCode className="h-full w-full text-emerald-950" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                TrustScore · Trust Card
              </p>
              <p className="mt-1 truncate text-lg font-bold leading-tight text-white">
                {passport?.profile?.displayName ?? "—"}
                <span className="ml-2 font-mono text-xs font-medium text-white/75">
                  @{passport?.profile?.handle ?? "—"}
                </span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {status}
                </span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white">
                  score {passport?.score.score ?? 0}/100
                </span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">
                  L{passport?.assurance.level ?? 0} assurance
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Active links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Active trust links
          </h4>
          {activeTokens.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">
              No live links. Create one to share your card — every open is counted and receipted.
            </p>
          ) : (
            <ul className="mt-2 space-y-2" aria-label="Active trust links">
              <AnimatePresence initial={false}>
                {activeTokens.map((t) => (
                  <TokenRow key={t.id} token={t} onRevoke={setRevoking} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {/* Dead links (history, compact) */}
        {deadTokens.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-foreground">
              {deadTokens.length} expired / revoked link{deadTokens.length === 1 ? "" : "s"} (history)
            </summary>
            <ul className="mt-2 space-y-1.5">
              {deadTokens.slice(0, 5).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground"
                >
                  <span className="truncate">
                    {t.scopes.join(" · ")} — {t.status === "REVOKED" ? "revoked" : "expired"}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {t.views}/{t.maxViews} opens
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>

      <ShareDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={onChanged} />

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this trust link?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone opening it afterwards sees a &ldquo;revoked by owner&rdquo; notice — instantly.
              This cannot be undone.
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
              Revoke link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
