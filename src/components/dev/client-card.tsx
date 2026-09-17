"use client";

// TrustScore Stage 9 — ClientCard: the per-app B2B console.
// Sections: identity header (environment, plan, your role), live quota
// meter + 14-day usage bars, API keys (mint with ONE-TIME reveal, revoke),
// signed webhook config + delivery timeline, team RBAC, decision history
// (lazy-loaded), plan switch and LIVE upgrade (typed confirmation).
//
// Styling follows the Stage 8 engine console vocabulary: ts-inset panels,
// ts-card-hover, animated meters, mono prefixes, status chips with icons,
// collapsibles with custom scrollbars — emerald palette only.

import * as React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Loader2,
  KeyRound,
  Plus,
  ShieldOff,
  Webhook,
  Send,
  Users,
  ScrollText,
  ChevronDown,
  Copy,
  Check,
  Sparkles,
  Gauge,
  Zap,
  RotateCcw,
  Globe2,
  Info,
  CircleCheck,
  CircleAlert,
  Clock,
  Ban,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import type { DevClient, DevDecision, DevKey, DevTeamMember, DevPortal } from "@/lib/types";
import { cn } from "@/lib/utils";

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

const ROLE_META: Record<string, { label: string; className: string }> = {
  OWNER: { label: "Owner", className: "bg-primary/10 text-primary border-primary/30" },
  DEVELOPER: { label: "Developer", className: "bg-teal-600/10 text-teal-700 border-teal-600/40 dark:text-teal-300" },
  VIEWER: { label: "Viewer", className: "bg-muted text-muted-foreground border-border" },
};

const DELIVERY_META: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  DELIVERED: {
    label: "Delivered",
    className: "bg-primary/10 text-primary border-primary/30",
    icon: <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  PENDING: {
    label: "Pending",
    className: "bg-muted text-muted-foreground border-border",
    icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  RETRYING: {
    label: "Retrying",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400",
    icon: <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  EXHAUSTED: {
    label: "Exhausted",
    className: "bg-destructive/10 text-destructive border-destructive/40",
    icon: <Ban className="h-3.5 w-3.5" aria-hidden="true" />,
  },
};

const OUTCOME_META: Record<string, { label: string; className: string }> = {
  OK: { label: "OK", className: "bg-primary/10 text-primary border-primary/30" },
  UNAVAILABLE: { label: "No profile", className: "bg-muted text-muted-foreground border-border" },
  DEAD_LINK: { label: "Dead link", className: "bg-amber-500/10 text-amber-600 border-amber-500/40 dark:text-amber-400" },
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Usage bars — 14 days of daily check counts (errors in destructive tone).
// ---------------------------------------------------------------------------

function UsageBars({ usage }: { usage: DevClient["usage"] }) {
  const max = Math.max(1, ...usage.map((d) => d.checks));
  const total = usage.reduce((s, d) => s + d.checks, 0);
  return (
    <div className="ts-inset rounded-lg px-3.5 py-3" data-testid="usage-bars">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">Checks per day · last 14 days</p>
        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
          {total} total · quota meter live
        </span>
      </div>
      <div
        className="mt-2 flex h-14 items-end gap-1"
        role="img"
        aria-label={`Daily checks over the last 14 days, ${total} total, peak ${max}`}
      >
        {usage.map((d) => (
          <div key={d.day} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
            <motion.div
              className={cn(
                "w-full rounded-sm",
                d.errors > 0 ? "bg-destructive/70" : "bg-primary/70",
                "group-hover:bg-primary"
              )}
              initial={{ height: 0 }}
              animate={{ height: `${d.checks === 0 ? 4 : Math.max(8, (d.checks / max) * 100)}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ minHeight: 4 }}
            />
            <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] font-medium tabular-nums shadow-md group-hover:block">
              {new Date(d.day).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}:{" "}
              {d.checks} check{d.checks === 1 ? "" : "s"}
              {d.errors > 0 ? ` · ${d.errors} error${d.errors === 1 ? "" : "s"}` : ""}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-medium text-muted-foreground">
        <span>{new Date(usage[0].day).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
        <span>today</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keys section
// ---------------------------------------------------------------------------

function KeysSection({ client, onChanged }: { client: DevClient; onChanged: () => Promise<void> }) {
  const { toast } = useToast();
  const canManage = client.role === "OWNER" || client.role === "DEVELOPER";
  const [mintOpen, setMintOpen] = React.useState(false);
  const [keyName, setKeyName] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [minted, setMinted] = React.useState<{ rawKey: string; name: string } | null>(null);
  const [revoking, setRevoking] = React.useState<string | null>(null);

  const mint = async () => {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/v1/dev/clients/${client.id}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      const body = (await res.json()) as {
        key?: { rawKey: string; name: string };
        error?: { message?: string };
      };
      if (res.ok && body.key) {
        setMinted({ rawKey: body.key.rawKey, name: body.key.name });
        setKeyName("");
        await onChanged();
      } else {
        toast({
          title: "Could not mint the key",
          description: body.error?.message ?? "Check the label (3–40 characters).",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  const revoke = async (keyId: string) => {
    if (revoking) return;
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/v1/dev/keys/${keyId}/revoke`, { method: "POST" });
      const body = (await res.json()) as { error?: { message?: string } };
      if (res.ok) {
        toast({
          title: "Key revoked",
          description: "Requests with that key now fail with a uniform 401.",
        });
        await onChanged();
      } else {
        toast({ title: "Could not revoke", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setRevoking(null);
    }
  };

  return (
    <section aria-labelledby={`keys-${client.id}`} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`keys-${client.id}`} className="flex items-center gap-2 text-xs font-semibold">
          <KeyRound className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          API keys
          <span className="font-normal text-muted-foreground">
            ({client.keys.filter((k) => k.status === "ACTIVE").length} active)
          </span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          disabled={!canManage}
          onClick={() => {
            setMinted(null);
            setMintOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Mint key
        </Button>
      </div>

      {client.keys.length === 0 ? (
        <p className="ts-inset rounded-lg px-3.5 py-3 text-[11px] text-muted-foreground">
          No keys yet. Mint one to authenticate <code className="font-mono">X-API-Key</code> requests.
        </p>
      ) : (
        <ul className="ts-scrollbar max-h-56 space-y-1.5 overflow-y-auto pr-1" data-testid="keys-list">
          {client.keys.map((k: DevKey) => (
            <li
              key={k.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border px-2.5 py-2"
            >
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-tight">
                {k.keyPrefix}…
              </code>
              <span className="min-w-0 truncate text-[11px] font-medium">{k.name}</span>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 px-1.5 text-[9px] font-semibold",
                  k.status === "ACTIVE"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted text-muted-foreground line-through border-border"
                )}
              >
                {k.status}
              </Badge>
              <span className="ml-auto flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
                <span className="tabular-nums">{k.totalRequests} calls</span>
                <span>· {timeAgo(k.lastUsedAt)}</span>
              </span>
              {k.status === "ACTIVE" && canManage ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={revoking === k.id}
                    >
                      {revoking === k.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <ShieldOff className="h-3 w-3" aria-hidden="true" />
                      )}
                      Revoke
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke “{k.name}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The very next request carrying this key fails with a uniform 401.
                        This cannot be undone — mint a new key if you need one. Raw keys
                        are never stored, so nothing else changes.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep the key</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => void revoke(k.id)}
                      >
                        Revoke now
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={mintOpen} onOpenChange={(open) => { setMintOpen(open); if (!open) setMinted(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
              {minted ? "Your new API key" : "Mint an API key"}
            </DialogTitle>
            <DialogDescription>
              {minted
                ? "Shown once, never again — copy it into your secrets store now."
                : "The raw key is generated server-side and returned exactly once. Only its sha256 hash is stored."}
            </DialogDescription>
          </DialogHeader>
          {minted ? (
            <div className="space-y-3" data-testid="minted-key-reveal">
              <div className="rounded-lg border border-primary/40 bg-primary/5 px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {minted.name}
                </p>
                <code className="mt-1.5 block break-all font-mono text-xs leading-relaxed">
                  {minted.rawKey}
                </code>
              </div>
              <div className="flex items-center justify-between gap-2">
                <CopyButton value={minted.rawKey} label="Copy key" />
                <p className="text-right text-[10px] leading-snug text-muted-foreground">
                  sha256-at-rest · 365-day expiry · scope TRUST_CHECK
                </p>
              </div>
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed">
                Treat it like a password. Rotate by minting a new key and revoking this one.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="key-name" className="text-xs">
                  Key label (what is this key for?)
                </Label>
                <Input
                  id="key-name"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. checkout-service"
                  minLength={3}
                  maxLength={40}
                  disabled={pending}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {minted ? (
              <Button onClick={() => { setMintOpen(false); setMinted(null); }}>Done — I saved it</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setMintOpen(false)}>Cancel</Button>
                <Button onClick={() => void mint()} disabled={pending || keyName.trim().length < 3}>
                  {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Mint once-only key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Webhook section — URL config, one-time secret, test event, deliveries
// ---------------------------------------------------------------------------

function WebhookSection({ client, onChanged }: { client: DevClient; onChanged: () => Promise<void> }) {
  const { toast } = useToast();
  const canManage = client.role === "OWNER" || client.role === "DEVELOPER";
  const [url, setUrl] = React.useState(client.webhook.url ?? "");
  const [rotate, setRotate] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [secret, setSecret] = React.useState<string | null>(null);

  React.useEffect(() => setUrl(client.webhook.url ?? ""), [client.webhook.url, client.id]);

  const save = async () => {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/v1/dev/clients/${client.id}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), rotateSecret: rotate }),
      });
      const body = (await res.json()) as {
        secret?: string;
        error?: { message?: string };
      };
      if (res.ok) {
        setSecret(body.secret ?? null);
        toast({
          title: body.secret ? "Webhook saved — new signing secret" : "Webhook saved",
          description: url.trim() === "" ? "Deliveries disabled." : "Events will be signed and retried up to 5 times.",
        });
        await onChanged();
      } else {
        toast({
          title: "Could not save the webhook",
          description: body.error?.message ?? "Check the URL.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setPending(false);
      setRotate(false);
    }
  };

  const sendTest = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const res = await fetch(`/api/v1/dev/clients/${client.id}/webhook/test`, { method: "POST" });
      const body = (await res.json()) as {
        delivery?: { status: string; statusCode: number | null };
        error?: { message?: string };
      };
      if (res.ok && body.delivery) {
        const d = body.delivery;
        toast({
          title:
            d.status === "DELIVERED"
              ? `Test delivered — endpoint answered ${d.statusCode}`
              : `Test attempt recorded (${d.status.toLowerCase()})`,
          description:
            d.status === "DELIVERED"
              ? "Verify the signature your endpoint saw (shown in the delivery log below)."
              : "Retries run automatically — check the delivery log below.",
        });
        await onChanged();
      } else {
        toast({
          title: "Could not send the test event",
          description: body.error?.message ?? "Configure a webhook URL first.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section aria-labelledby={`wh-${client.id}`} className="space-y-3">
      <p id={`wh-${client.id}`} className="flex items-center gap-2 text-xs font-semibold">
        <Webhook className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        Webhook events
        <Badge
          variant="outline"
          className={cn(
            "px-1.5 text-[9px] font-semibold",
            client.webhook.url
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-muted text-muted-foreground border-border"
          )}
        >
          {client.webhook.url ? "configured" : "off"}
        </Badge>
      </p>

      <div className="space-y-2">
        <Label htmlFor={`wh-url-${client.id}`} className="text-[11px] text-muted-foreground">
          Endpoint URL — sandbox self-test:{" "}
          <code className="font-mono">http://localhost:3000/api/v1/dev/webhook-sink</code>
        </Label>
        <div className="flex gap-2">
          <Input
            id={`wh-url-${client.id}`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-service.example/hooks/trustscore"
            disabled={pending || !canManage}
            className="min-w-0 font-mono text-xs"
            maxLength={512}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-9 shrink-0 gap-1.5"
            disabled={pending || !canManage}
            onClick={() => void save()}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Webhook className="h-3.5 w-3.5" aria-hidden="true" />}
            Save
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {canManage ? (
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Checkbox
                checked={rotate}
                onCheckedChange={(v) => setRotate(v === true)}
                disabled={pending}
                aria-label="Rotate the signing secret on save"
              />
              Rotate signing secret on save
            </label>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 px-2 text-[11px]"
            disabled={testing || !canManage || !client.webhook.url}
            onClick={() => void sendTest()}
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
            Send test event
          </Button>
        </div>
      </div>

      {secret ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-primary/40 bg-primary/5 px-3.5 py-3"
          data-testid="wh-secret-reveal"
          role="alert"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            New signing secret — shown once
          </p>
          <code className="mt-1.5 block break-all font-mono text-xs leading-relaxed">{secret}</code>
          <div className="mt-2 flex items-center justify-between gap-2">
            <CopyButton value={secret} label="Copy secret" />
            <p className="text-right text-[10px] text-muted-foreground">
              v1 = HMAC-SHA256(secret, &quot;$t&quot; + &quot;.&quot; + body)
            </p>
          </div>
        </motion.div>
      ) : null}

      {/* Delivery timeline */}
      {client.webhook.recentDeliveries.length > 0 ? (
        <div data-testid="delivery-log">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Recent deliveries (newest first · retried at +1m, +5m, +25m, +2h)
          </p>
          <ol className="ts-scrollbar mt-1.5 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {client.webhook.recentDeliveries.map((d) => {
              const meta = DELIVERY_META[d.status] ?? DELIVERY_META.PENDING;
              return (
                <li key={d.id} className="rounded-lg border border-border px-2.5 py-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge variant="outline" className={cn("shrink-0 gap-1 px-1.5 text-[9px] font-semibold", meta.className)}>
                      {meta.icon}
                      {meta.label}
                    </Badge>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] font-semibold">
                      {d.event}
                    </code>
                    {d.statusCode !== null ? (
                      <span
                        className={cn(
                          "text-[10px] font-bold tabular-nums",
                          d.statusCode >= 200 && d.statusCode < 300 ? "text-primary" : "text-destructive"
                        )}
                      >
                        {d.statusCode}
                      </span>
                    ) : null}
                    <span className="text-[10px] text-muted-foreground">
                      attempt {d.attempts}/5{d.durationMs !== null ? ` · ${d.durationMs}ms` : ""}
                    </span>
                    <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                      {timeAgo(d.createdAt)}
                    </span>
                  </div>
                  <Collapsible className="mt-1.5">
                    <CollapsibleTrigger className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline">
                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
                      payload + signature
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ts-scrollbar mt-1.5 max-h-40 overflow-auto rounded-md bg-muted/60 p-2">
                        <pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed">
                          {JSON.stringify(d.payload, null, 2)}
                        </pre>
                        {d.signature ? (
                          <p className="mt-1.5 break-all border-t border-border pt-1.5 font-mono text-[9px] text-muted-foreground">
                            X-TrustScore-Signature: {d.signature}
                          </p>
                        ) : null}
                        {d.responseSnippet ? (
                          <p className="mt-1.5 break-all border-t border-border pt-1.5 font-mono text-[9px] text-muted-foreground">
                            endpoint said: {d.responseSnippet.slice(0, 160)}
                          </p>
                        ) : null}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <p className="ts-inset rounded-lg px-3.5 py-2.5 text-[11px] text-muted-foreground">
          {client.webhook.url
            ? "No deliveries yet — they appear the moment a trust check completes or a test event is sent."
            : "Set an endpoint URL to receive signed TRUST_CHECK_COMPLETED events."}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Team section (OWNER manages; roles enforced server-side)
// ---------------------------------------------------------------------------

function TeamSection({ client, onChanged }: { client: DevClient; onChanged: () => Promise<void> }) {
  const { toast } = useToast();
  const isOwner = client.role === "OWNER";
  const [identifier, setIdentifier] = React.useState("");
  const [role, setRole] = React.useState("VIEWER");
  const [pending, setPending] = React.useState(false);
  const [removing, setRemoving] = React.useState<string | null>(null);

  const add = async () => {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/v1/dev/clients/${client.id}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), role }),
      });
      const body = (await res.json()) as { error?: { message?: string } };
      if (res.ok) {
        toast({
          title: "Teammate added",
          description: `They now see "${client.name}" in their Developers tab as ${role.toLowerCase()}.`,
        });
        setIdentifier("");
        await onChanged();
      } else {
        toast({
          title: "Could not add the teammate",
          description: body.error?.message ?? "Check the handle or email.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  const remove = async (memberId: string) => {
    if (removing) return;
    setRemoving(memberId);
    try {
      const res = await fetch(`/api/v1/dev/clients/${client.id}/team/${memberId}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { error?: { message?: string } };
      if (res.ok) {
        toast({ title: "Teammate removed", description: "Their portal access to this client is gone." });
        await onChanged();
      } else {
        toast({ title: "Could not remove", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section aria-labelledby={`team-${client.id}`} className="space-y-3">
      <p id={`team-${client.id}`} className="flex items-center gap-2 text-xs font-semibold">
        <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        Team
        <span className="font-normal text-muted-foreground">
          ({client.team.length} member{client.team.length === 1 ? "" : "s"} · roles enforced server-side)
        </span>
      </p>
      <ul className="space-y-1.5">
        {client.team.map((m: DevTeamMember) => {
          const meta = ROLE_META[m.role] ?? ROLE_META.VIEWER;
          return (
            <li
              key={m.id}
              className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase">
                {m.displayName.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">
                  {m.displayName}
                  {m.isYou ? <span className="ml-1.5 text-[10px] font-semibold text-primary">(you)</span> : null}
                </p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">@{m.handle}</p>
              </div>
              <Badge variant="outline" className={cn("shrink-0 px-1.5 text-[9px] font-semibold", meta.className)}>
                {meta.label}
              </Badge>
              {isOwner && m.role !== "OWNER" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={removing === m.id}
                  onClick={() => void remove(m.id)}
                >
                  {removing === m.id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : "Remove"}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {isOwner ? (
        <div className="flex flex-wrap gap-2">
          <Input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="@handle or email"
            disabled={pending}
            className="min-w-0 flex-1 text-xs"
            aria-label="Teammate handle or email"
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-9 w-[130px] shrink-0 text-xs" aria-label="Role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VIEWER">Viewer — read-only</SelectItem>
              <SelectItem value="DEVELOPER">Developer — keys + webhook</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-9 shrink-0"
            disabled={pending || identifier.trim().length < 3}
            onClick={() => void add()}
          >
            {pending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Users className="mr-2 h-3.5 w-3.5" />}
            Add
          </Button>
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Decisions history (lazy)
// ---------------------------------------------------------------------------

function DecisionsSection({ client }: { client: DevClient }) {
  const [decisions, setDecisions] = React.useState<DevDecision[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/v1/dev/clients/${client.id}/decisions`, { cache: "no-store" });
      if (res.ok) {
        const body = (await res.json()) as { decisions: DevDecision[] };
        setDecisions(body.decisions);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  return (
    <Collapsible onOpenChange={(open) => { if (open && decisions === null && !loading) void load(); }}>
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold hover:text-primary">
          <ScrollText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Decision history
          <span className="font-normal text-muted-foreground">({client.decisionsCount} recorded)</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" aria-hidden="true" />
        </CollapsibleTrigger>
        {decisions !== null ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-3 w-3" aria-hidden="true" />}
            Refresh
          </Button>
        ) : null}
      </div>
      <CollapsibleContent>
        <div className="mt-2" data-testid="decisions-list">
          {loading && decisions === null ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-[11px] text-muted-foreground" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Loading decisions…
            </div>
          ) : error ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-[11px] text-muted-foreground">
              Could not load the decision history. Try refreshing.
            </p>
          ) : decisions !== null && decisions.length === 0 ? (
            <p className="ts-inset rounded-lg px-3.5 py-3 text-[11px] text-muted-foreground">
              No checks yet. Every Trust Decision API call lands here — with the exact
              assessment that was returned, masked inputs and the request id.
            </p>
          ) : decisions !== null ? (
            <ol className="ts-scrollbar max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {decisions.map((d) => {
                const oMeta = OUTCOME_META[d.outcome] ?? OUTCOME_META.UNAVAILABLE;
                const headline =
                  (d.assessment as { headline?: string } | null)?.headline ?? null;
                const purposeText = d.purpose
                  ? d.purpose.replace(/_/g, " ")
                  : null;
                return (
                  <li key={d.id} className="rounded-lg border border-border px-2.5 py-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge variant="outline" className={cn("shrink-0 px-1.5 text-[9px] font-semibold", oMeta.className)}>
                        {oMeta.label}
                      </Badge>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] font-semibold">
                        {d.method}
                      </code>
                      {purposeText ? (
                        <span
                          className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary"
                          data-testid="decision-purpose"
                        >
                          {purposeText}
                        </span>
                      ) : null}
                      <span className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">
                        {d.inputHint}
                      </span>
                      <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {timeAgo(d.createdAt)}
                      </span>
                    </div>
                    {headline ? (
                      <p className="mt-1 truncate text-[11px] font-medium">{headline}</p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Environment + plan (OWNER)
// ---------------------------------------------------------------------------

function PlanSection({ client, onChanged }: { client: DevClient; onChanged: () => Promise<void> }) {
  const { toast } = useToast();
  const isOwner = client.role === "OWNER";
  const [liveOpen, setLiveOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [pending, setPending] = React.useState<"live" | "plan" | null>(null);

  const goLive = async () => {
    if (pending) return;
    setPending("live");
    try {
      const res = await fetch(`/api/v1/dev/clients/${client.id}/live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText.trim() }),
      });
      const body = (await res.json()) as { error?: { message?: string } };
      if (res.ok) {
        toast({
          title: "Environment switched to LIVE",
          description: "New keys mint as tsk_live_… — webhooks now require https (no localhost).",
        });
        setLiveOpen(false);
        setConfirmText("");
        await onChanged();
      } else {
        toast({
          title: "Could not switch to LIVE",
          description: body.error?.message ?? "Check the confirmation text.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const changePlan = async (plan: string) => {
    if (pending || plan === client.plan) return;
    setPending("plan");
    try {
      const res = await fetch(`/api/v1/dev/clients/${client.id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = (await res.json()) as { error?: { message?: string } };
      if (res.ok) {
        toast({
          title: `Plan set to ${plan}`,
          description:
            plan === "STARTER"
              ? "500 checks/day, 5 active keys. Billing stays an honest mock-up."
              : "40 checks/day, 2 active keys. Billing stays an honest mock-up.",
        });
        await onChanged();
      } else {
        toast({ title: "Could not change the plan", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  return (
    <section aria-labelledby={`plan-${client.id}`} className="space-y-3">
      <p id={`plan-${client.id}`} className="flex items-center gap-2 text-xs font-semibold">
        <Gauge className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        Environment &amp; plan
      </p>

      {/* LIVE upgrade */}
      {client.environment === "SANDBOX" ? (
        isOwner ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3.5 py-3">
            <p className="flex items-center gap-2 text-[11px] font-semibold">
              <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              SANDBOX → LIVE
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              LIVE tightens the posture: https-only webhooks (localhost rejected) and
              <code className="mx-1 font-mono">tsk_live_</code> keys. Underlying identity
              providers remain contract-first MOCK — nothing else pretends to change.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2.5 h-8 gap-1.5"
              disabled={pending === "live"}
              onClick={() => setLiveOpen(true)}
            >
              <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
              Switch to LIVE
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Environment changes are OWNER-only. Current: SANDBOX.
          </p>
        )
      ) : (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-3">
          <p className="flex items-center gap-2 text-[11px] font-semibold">
            <Globe2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            LIVE posture active
            <span className="font-normal text-muted-foreground">
              (https webhooks · tsk_live_ keys)
            </span>
          </p>
        </div>
      )}

      {/* Plan switch */}
      {isOwner ? (
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5">
          <span className="text-[11px] font-medium">Plan:</span>
          {(["FREE", "STARTER"] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={client.plan === p ? "default" : "outline"}
              className="h-7 px-2.5 text-[10px] font-semibold"
              disabled={pending === "plan" || client.plan === p}
              onClick={() => void changePlan(p)}
            >
              {p}
            </Button>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground">mock billing — quotas real</span>
        </div>
      ) : null}

      <Dialog open={liveOpen} onOpenChange={(open) => { setLiveOpen(open); if (!open) setConfirmText(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              Switch “{client.name}” to LIVE
            </DialogTitle>
            <DialogDescription>
              Type <strong>I UNDERSTAND</strong> to confirm. LIVE is an integration-posture
              label — the platform&apos;s identity providers stay contract-first MOCK until
              partner credentials exist, and we will say so on every API response.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="I UNDERSTAND"
            aria-label="Type I UNDERSTAND to confirm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiveOpen(false)}>Cancel</Button>
            <Button
              disabled={confirmText.trim() !== "I UNDERSTAND" || pending === "live"}
              onClick={() => void goLive()}
            >
              {pending === "live" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

export function ClientCard({
  client,
  onChanged,
  limits,
}: {
  client: DevClient;
  onChanged: () => Promise<void>;
  limits: DevPortal["limits"];
}) {
  const quotaPct = Math.min(100, Math.round((client.quota.usedToday / Math.max(1, client.quota.plan)) * 100));
  const quotaLow = client.quota.remaining <= Math.max(3, Math.round(client.quota.plan * 0.15));
  const activeKeys = client.keys.filter((k) => k.status === "ACTIVE").length;
  const planCap = limits.plans[client.plan]?.keys ?? 2;
  const envLive = client.environment === "LIVE";

  return (
    <Card className="ts-card-hover min-w-0" data-testid={`dev-client-${client.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{client.name}</CardTitle>
          <CardDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge
              variant="outline"
              className={cn(
                "h-5 px-1.5 text-[9px] font-bold uppercase tracking-wide",
                envLive
                  ? "border-primary/50 bg-primary text-primary-foreground"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {client.environment}
            </Badge>
            <span className="text-[10px] font-semibold text-primary">{client.plan}</span>
            <span className="text-[10px]">·</span>
            <span className="text-[10px]">
              you are <strong className="font-semibold">{ROLE_META[client.role]?.label ?? client.role}</strong>
            </span>
            <span className="text-[10px]">·</span>
            <span className="text-[10px]">since {new Date(client.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Quota meter + stats */}
        <div className="ts-inset rounded-lg px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold">
              <Gauge className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Today&apos;s quota
            </p>
            <span className="text-[11px] font-bold tabular-nums">
              {client.quota.usedToday}
              <span className="font-normal text-muted-foreground"> / {client.quota.plan} checks</span>
            </span>
          </div>
          <div className="mt-2">
            <Progress
              value={quotaPct}
              className={cn("h-2", quotaLow ? "[&>div]:bg-amber-500" : undefined)}
              aria-label={`${quotaPct}% of today's ${client.quota.plan}-check quota used`}
            />
          </div>
          <p className={cn("mt-1.5 text-[10px] font-medium", quotaLow ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {quotaLow
              ? `Low — ${client.quota.remaining} left before today's UTC reset. The ${client.plan} plan allows ${client.quota.plan}/day.`
              : `${client.quota.remaining} remaining · ${client.plan} plan · resets at UTC midnight`}
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-2.5 text-center">
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Keys</dt>
              <dd className="text-sm font-bold tabular-nums">
                {activeKeys}
                <span className="text-[10px] font-normal text-muted-foreground">/{planCap}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Checks</dt>
              <dd className="text-sm font-bold tabular-nums">{client.decisionsCount}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Webhook</dt>
              <dd className="flex items-center justify-center gap-1 text-sm font-bold">
                {client.webhook.url ? (
                  <span className="flex items-center gap-1 text-primary">
                    <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="text-[11px]">on</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="text-[11px]">off</span>
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <UsageBars usage={client.usage} />

        <div className="h-px bg-border" role="separator" />

        <KeysSection client={client} onChanged={onChanged} />

        <div className="h-px bg-border" role="separator" />

        <WebhookSection client={client} onChanged={onChanged} />

        <div className="h-px bg-border" role="separator" />

        <TeamSection client={client} onChanged={onChanged} />

        <div className="h-px bg-border" role="separator" />

        <DecisionsSection client={client} />

        <div className="h-px bg-border" role="separator" />

        <PlanSection client={client} onChanged={onChanged} />

        <p className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          Every check your client runs is receipted to the subject with this client&apos;s
          name, and only consented subjects return assessments — everyone else gets a
          uniform &quot;no profile available&quot;.
        </p>
      </CardContent>
    </Card>
  );
}
