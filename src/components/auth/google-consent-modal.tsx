"use client";

// TrustScore AUTH batch (auth-6) — GoogleConsentModal: the "Continue with
// Google" experience. It simulates the Google account-picker + consent screen
// side of the OAuth flow:
//   start → (this modal: pick account → approve) → grant {code, state}
//        → callback → account resolution (LOGIN / auto-LINK / LINK_REQUIRED /
//   REGISTER). LINK_REQUIRED never silently merges — the user proves ownership
//   with their password, then the Google identity is linked explicitly.
//
// Two modes:
//   - "signin" (auth screen, anonymous): callback signs the user in; on
//     LINK_REQUIRED the modal collects the password, signs in silently, links,
//     and only then switches the app to the dashboard.
//   - "link" (Security Center, already authenticated): callback auto-links on
//     verified-email match; on LINK_REQUIRED the explicit /google/link call
//     runs directly (the caller is already authenticated).
//
// MOCK posture is labeled honestly (the badge). In LIVE posture the real
// Google consent screen replaces this modal entirely.

import * as React from "react";
import {
  XCircle,
  Loader2,
  Clock,
  Lock,
  Mail,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTrustStore } from "@/lib/store";
import {
  apiGoogleGrant,
  apiGoogleCallback,
  apiGoogleLink,
  apiLoginIdentifier,
  type GoogleSessionInfo,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** The official multi-color Google "G" (inline SVG — no external assets). */
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export interface GoogleConsentModalProps {
  open: boolean;
  /** "signin" — auth screen (anonymous); "link" — Security Center (authed). */
  mode: "signin" | "link";
  session: GoogleSessionInfo | null;
  /** Pre-fill from the email field the user may already have typed. */
  initialEmail?: string;
  onDismiss: () => void;
  /** Flow completed — the parent refreshes (identifier list etc.). */
  onDone?: () => void;
  /** Parent re-runs /auth/google/start and passes the fresh session. */
  onRestart?: () => void;
}

export function GoogleConsentModal({
  open,
  mode,
  session,
  initialEmail = "",
  onDismiss,
  onDone,
  onRestart,
}: GoogleConsentModalProps) {
  const { setUser } = useTrustStore();
  const [msLeft, setMsLeft] = React.useState(0);
  const [email, setEmail] = React.useState(initialEmail);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // LINK_REQUIRED continuation state.
  const [linkHint, setLinkHint] = React.useState<string | null>(null);
  const [googleSessionId, setGoogleSessionId] = React.useState<string | null>(null);
  const [password, setPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setEmail(initialEmail);
    setEmailError(null);
    setError(null);
    setLinkHint(null);
    setGoogleSessionId(null);
    setPassword("");
    setPasswordError(null);
  }, [open, session?.id, initialEmail]);

  React.useEffect(() => {
    if (!open || !session) return;
    const tick = () => setMsLeft(new Date(session.expiresAt).getTime() - Date.now());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [open, session]);

  const expired = msLeft <= 0;

  function resetToConsent() {
    setLinkHint(null);
    setGoogleSessionId(null);
    setPassword("");
    setPasswordError(null);
  }

  async function deny() {
    if (!session) return;
    setBusy(true);
    try {
      // The grant endpoint requires an email even on deny (the decision is
      // what matters; the email is never used for a DENY).
      const mail = EMAIL_RE.test(email.trim().toLowerCase())
        ? email.trim().toLowerCase()
        : "deny@google.test";
      await apiGoogleGrant(session.id, { decision: "DENY", email: mail });
    } catch {
      /* best-effort */
    } finally {
      setBusy(false);
      toast.info(mode === "link" ? "Google linking cancelled." : "Google sign-in cancelled.");
      onDismiss();
    }
  }

  async function decide() {
    if (!session) return;
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) {
      setEmailError("Enter the Google email to sign in with");
      return;
    }
    setEmailError(null);
    setBusy(true);
    setError(null);
    try {
      // 1. The (mock) Google side issues the one-time code on approval.
      const grant = await apiGoogleGrant(session.id, { decision: "GRANT", email: mail });
      if (!grant.ok) {
        setError(grant.error.message);
        return;
      }

      // LINK MODE (Security Center, already authenticated): bind the granted
      // Google identity DIRECTLY to the caller's account. Never call the
      // anonymous callback here — a Google email that doesn't match the
      // account's email would register a NEW account and switch the session
      // (silent account takeover by UX, exactly what the spec forbids).
      if (mode === "link") {
        const link = await apiGoogleLink({ googleSessionId: session.id });
        if (link.ok) {
          toast.success("Google account linked", {
            description: "You can now sign in with Google.",
          });
          onDone?.();
          onDismiss();
          return;
        }
        setError(link.error.message);
        return;
      }

      // 2. SIGN-IN MODE — the callback contract: code + state → resolution →
      // session cookie.
      const cb = await apiGoogleCallback(session.id, {
        code: grant.data.code,
        state: grant.data.state,
      });

      if (cb.ok) {
        // LOGIN / LINKED / REGISTERED — signed in (cookie set, store updated
        // by the helper for the caller's truthful session).
        const { outcome } = cb.data;
        toast.success(
          outcome === "LOGIN"
            ? "Signed in with Google"
            : outcome === "LINKED"
              ? "Google linked to your account"
              : "Account created with Google",
          { description: "Passwordless — Google asserts your identity." }
        );
        onDone?.();
        onDismiss();
        return;
      }

      // LINK_REQUIRED — an account exists with that email (unverified).
      if (cb.linkRequired) {
        setLinkHint(cb.linkRequired.emailHint);
        setGoogleSessionId(cb.linkRequired.googleSessionId);
        return;
      }

      setError(cb.error.message);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  /** LINK_REQUIRED continuation (signin mode): prove ownership with the
   *  password, link the Google identity, then switch to the dashboard. */
  async function confirmWithPassword() {
    if (!googleSessionId || !email.trim()) return;
    if (!password) {
      setPasswordError("Enter your account password");
      return;
    }
    setPasswordError(null);
    setBusy(true);
    setError(null);
    try {
      const login = await apiLoginIdentifier(
        { identifier: email.trim().toLowerCase(), password },
        { silent: true } // sign the store in only after the link succeeds
      );
      if (!login.ok) {
        setPasswordError("Incorrect password — check it and try again.");
        return;
      }
      const link = await apiGoogleLink({ googleSessionId });
      if (!link.ok) {
        setError(link.error.message);
        return;
      }
      setUser(login.user); // now safe: the whole flow completed
      toast.success("Google linked to your account", {
        description: "You'll sign in with Google next time.",
      });
      onDone?.();
      onDismiss();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onDismiss()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border">
              <GoogleG className="h-6 w-6" />
            </span>
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-amber-500/10 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
            >
              MOCK GOOGLE
            </Badge>
          </div>
          <DialogTitle className="text-left text-lg leading-snug">
            Sign in to TrustScore with your Google Account
          </DialogTitle>
          <DialogDescription className="text-left text-xs">
            This simulates Google&apos;s account picker and consent screen. You
            choose the account that signs in — the same contract the real
            screen shows.
          </DialogDescription>
        </DialogHeader>

        {session && (
          <div className="space-y-4">
            {/* Countdown */}
            <div
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
                expired
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-muted/50 text-muted-foreground"
              )}
              role="status"
              aria-live="polite"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {expired ? "Consent window expired" : "Approve within"}
              </span>
              <span className={cn("font-mono font-semibold", !expired && "text-foreground")}>
                {formatCountdown(msLeft)}
              </span>
            </div>

            {expired && (
              <div
                className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300"
                role="alert"
              >
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">This sign-in window expired.</p>
                  <p>Start again to get a fresh consent screen.</p>
                </div>
                {onRestart && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 border-amber-500/40 bg-transparent text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                    onClick={onRestart}
                    disabled={busy}
                  >
                    Start again
                  </Button>
                )}
              </div>
            )}

            {/* Account picker — the mock stand-in for the real Google account
                chooser. LIVE: this field disappears. */}
            <div className="space-y-2">
              <Label htmlFor="google-email" className="text-xs">
                Choose the Google account to simulate{" "}
                <span className="text-muted-foreground">(email)</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="google-email"
                  className="pl-9"
                  type="email"
                  placeholder="you@gmail.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!emailError}
                  disabled={busy || expired || linkHint !== null}
                />
              </div>
              {emailError ? (
                <p className="text-xs text-destructive">{emailError}</p>
              ) : (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Existing accounts with this email are linked to Google sign-in;
                  new emails create a passwordless account. Google never shares
                  your password with TrustScore.
                </p>
              )}
            </div>

            {/* Consent copy from the start response */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What TrustScore will receive
              </p>
              <div className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Your Google account ID and email address</p>
                  <p className="text-xs text-muted-foreground">{session.consentScreen.sharing}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Scopes</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {session.consentScreen.scopes.join(", ")}
                  </p>
                </div>
              </div>
            </div>

            {/* LINK_REQUIRED continuation — password proof, never a silent merge */}
            {linkHint && (
              <>
                <Separator />
                <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3">
                  <p className="text-xs leading-snug" role="note">
                    <span className="font-semibold">An account exists with </span>
                    <span className="font-mono">{linkHint}</span>
                    <span className="font-semibold">. Sign in with your password to link Google to it.</span>
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="google-link-password" className="text-xs">
                      Account password
                    </Label>
                    <Input
                      id="google-link-password"
                      type="password"
                      placeholder="Your TrustScore password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={!!passwordError}
                      disabled={busy}
                      autoFocus
                    />
                    {passwordError && (
                      <p className="text-xs text-destructive" role="alert">
                        {passwordError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      onClick={() => void confirmWithPassword()}
                      disabled={busy}
                      className="flex-1"
                      data-testid="google-link-confirm"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Linking…
                        </>
                      ) : (
                        "Sign in & link Google"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetToConsent}
                      disabled={busy}
                      className="flex-1"
                    >
                      Use a different email
                    </Button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <p
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            <Separator />

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Purpose:</span>{" "}
                {session.consentScreen.purpose}
              </p>
              <p className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" aria-hidden="true" />
                TrustScore never sees your Google password — only the account ID
                and email you approve here.
              </p>
            </div>

            {/* Actions — Google card treatment: white grant, quiet deny */}
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                onClick={() => void decide()}
                disabled={busy || expired || linkHint !== null}
                className="flex-1 gap-2 border border-neutral-300 bg-white text-neutral-800 shadow-sm transition-all hover:-translate-y-px hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-500 dark:bg-white dark:text-neutral-800 dark:hover:bg-neutral-50"
                data-testid="google-grant"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Continuing…
                  </>
                ) : (
                  <>
                    <GoogleG className="h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => void deny()}
                disabled={busy || expired}
                className="flex-1"
                data-testid="google-deny"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Deny
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
