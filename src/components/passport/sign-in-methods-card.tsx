"use client";

// TrustScore AUTH batch (auth-6) — SignInMethodsCard (Privacy & Security tab).
//
// The canonical registry of "what can sign you in": username, email, phone,
// Google. Rows come from GET /api/v1/auth/identifiers (masked hints only —
// raw phones and Google subjects never leave the server). Actions:
//   - EMAIL unverified → inline verify flow (mock email code surfaced honestly)
//   - GOOGLE not linked → the Google consent modal in LINK mode
//   - PHONE not linked → phone/start {purpose LINK} → verify (contract: the
//     verify response ends the link flow)
//   - GOOGLE/PHONE linked → Remove (guarded by the LAST_IDENTIFIER rule)
//   - Sign out from all devices (revokes every session)

import * as React from "react";
import { motion } from "framer-motion";
import {
  AtSign,
  Mail,
  Phone,
  Chrome,
  BadgeCheck,
  Loader2,
  ShieldCheck,
  Smartphone,
  LogOut,
  KeyRound,
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
import {
  apiListIdentifiers,
  apiUnlinkIdentifier,
  apiEmailVerifyRequest,
  apiEmailVerifyConfirm,
  apiPhoneOtpStart,
  apiPhoneOtpVerify,
  apiGoogleStart,
  apiLogoutAll,
  type PhoneOtpSessionInfo,
  type GoogleSessionInfo,
} from "@/lib/api-client";
import { MockCodeChip, PhoneOtpStep } from "@/components/auth/phone-otp-step";
import { GoogleConsentModal } from "@/components/auth/google-consent-modal";
import { useTrustStore } from "@/lib/store";
import type { AuthIdentifierInfo } from "@/lib/types";

type IdentifierIcon = React.ElementType;

const TYPE_ICON: Record<string, IdentifierIcon> = {
  USERNAME: AtSign,
  EMAIL: Mail,
  PHONE: Phone,
  GOOGLE: Chrome,
};

const TYPE_HINT_FALLBACK: Record<string, (user: { handle: string; email: string | null }) => string | null> = {
  USERNAME: (u) => `@${u.handle}`,
  EMAIL: (u) => u.email,
  PHONE: () => null,
  GOOGLE: () => null,
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function SignInMethodsCard() {
  const { user } = useTrustStore();
  const [identifiers, setIdentifiers] = React.useState<AuthIdentifierInfo[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // EMAIL verification sub-flow.
  const [emailCode, setEmailCode] = React.useState("");
  const [emailMock, setEmailMock] = React.useState<string | null>(null);
  const [emailBusy, setEmailBusy] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);

  // PHONE link sub-flow: "idle" | "entry" | "otp".
  const [phoneMode, setPhoneMode] = React.useState<"idle" | "entry" | "otp">("idle");
  const [phoneInput, setPhoneInput] = React.useState("");
  const [phoneFieldError, setPhoneFieldError] = React.useState<string | null>(null);
  const [phoneSession, setPhoneSession] = React.useState<PhoneOtpSessionInfo | null>(null);
  const [phoneMockOtp, setPhoneMockOtp] = React.useState<string | null>(null);
  const [phoneOtp, setPhoneOtp] = React.useState("");
  const [phoneOtpError, setPhoneOtpError] = React.useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = React.useState(false);

  // GOOGLE link modal.
  const [googleOpen, setGoogleOpen] = React.useState(false);
  const [googleSession, setGoogleSession] = React.useState<GoogleSessionInfo | null>(null);

  // Unlink / logout-all confirms.
  const [removing, setRemoving] = React.useState<"GOOGLE" | "PHONE" | null>(null);
  const [confirmingLogoutAll, setConfirmingLogoutAll] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const res = await apiListIdentifiers();
    if (res.ok) {
      setIdentifiers(res.data.identifiers);
      setLoadError(null);
    } else {
      setLoadError(res.error.message);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const emailRow = identifiers?.find((i) => i.type === "EMAIL") ?? null;
  const googleRow = identifiers?.find((i) => i.type === "GOOGLE") ?? null;
  const phoneRow = identifiers?.find((i) => i.type === "PHONE") ?? null;

  // --- EMAIL verification ----------------------------------------------------
  async function startEmailVerify() {
    setEmailBusy(true);
    setEmailError(null);
    try {
      const res = await apiEmailVerifyRequest();
      if (res.ok) {
        setEmailMock(res.data.mockCode);
        setEmailCode("");
      } else {
        setEmailError(res.error.message);
      }
    } catch {
      setEmailError("Network error — try again.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function confirmEmailVerify() {
    setEmailBusy(true);
    setEmailError(null);
    try {
      const res = await apiEmailVerifyConfirm({ code: emailCode.trim() });
      if (res.ok) {
        toast.success("Email verified", {
          description: "Verified email unlocks Google auto-linking and email recovery.",
        });
        setEmailMock(null);
        setEmailCode("");
        await refresh();
      } else {
        setEmailError(res.error.message);
      }
    } catch {
      setEmailError("Network error — try again.");
    } finally {
      setEmailBusy(false);
    }
  }

  // --- PHONE link --------------------------------------------------------------
  async function startPhoneLink(e: React.FormEvent) {
    e.preventDefault();
    const raw = phoneInput.trim();
    if (raw.replace(/[\s()\-.]/g, "").length < 7) {
      setPhoneFieldError("Enter a valid Nigerian mobile number.");
      return;
    }
    setPhoneFieldError(null);
    setPhoneBusy(true);
    try {
      const res = await apiPhoneOtpStart({ phone: raw, purpose: "LINK" });
      if (res.ok) {
        setPhoneSession(res.session);
        setPhoneMockOtp(res.mockOtp);
        setPhoneOtp("");
        setPhoneOtpError(null);
        setPhoneMode("otp");
      } else {
        setPhoneFieldError(res.error.message);
      }
    } catch {
      setPhoneFieldError("Network error — try again.");
    } finally {
      setPhoneBusy(false);
    }
  }

  async function verifyPhoneLink() {
    if (!phoneSession) return;
    setPhoneBusy(true);
    setPhoneOtpError(null);
    try {
      const res = await apiPhoneOtpVerify({ sessionId: phoneSession.id, otp: phoneOtp });
      if (!res.ok) {
        setPhoneOtpError(res.error.message);
        return;
      }
      if ("user" in res) {
        // LINK purpose never returns a user — defensive only.
        setPhoneOtpError("That code is invalid or expired.");
        return;
      }
      // Contract: for purpose LINK, the verify response ends the flow —
      // verification is the proof; the identifier list is re-read from the
      // registry (the source of truth).
      toast.success("Phone code verified", {
        description: "Your number was verified with a one-time code.",
      });
      setPhoneMode("idle");
      setPhoneSession(null);
      setPhoneMockOtp(null);
      setPhoneOtp("");
      await refresh();
    } catch {
      setPhoneOtpError("Network error — try again.");
    } finally {
      setPhoneBusy(false);
    }
  }

  // --- GOOGLE link --------------------------------------------------------------
  async function startGoogleLink() {
    const res = await apiGoogleStart();
    if (res.ok) {
      setGoogleSession(res.data.session);
      setGoogleOpen(true);
    } else {
      toast.error("Could not start Google linking", { description: res.error.message });
    }
  }

  // --- Unlink / logout-all --------------------------------------------------------
  async function confirmUnlink() {
    if (!removing) return;
    setBusy(true);
    try {
      const res = await apiUnlinkIdentifier(removing);
      if (res.ok) {
        toast.success(
          removing === "GOOGLE" ? "Google account unlinked" : "Phone number unlinked",
          { description: "You can no longer sign in with that method." }
        );
        await refresh();
      } else {
        toast.error("Could not remove sign-in method", { description: res.error.message });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  }

  async function confirmLogoutAll() {
    setBusy(true);
    try {
      const res = await apiLogoutAll();
      if (res.ok) {
        toast.success("Signed out everywhere", {
          description: `${res.data.sessionsRevoked} session${res.data.sessionsRevoked === 1 ? "" : "s"} ended.`,
        });
        // apiLogoutAll clears the store user → the app returns to landing.
      } else {
        toast.error("Could not sign out", { description: res.error.message });
      }
    } catch {
      toast.error("Network error", { description: "Please try again." });
    } finally {
      setBusy(false);
      setConfirmingLogoutAll(false);
    }
  }

  function renderRow(row: AuthIdentifierInfo, index: number) {
    const Icon = TYPE_ICON[row.type] ?? KeyRound;
    const hint =
      row.hint ?? (user && TYPE_HINT_FALLBACK[row.type]?.(user)) ?? null;
    return (
      <motion.li
        key={row.type}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="rounded-lg border border-border bg-muted/30 px-4 py-3"
        data-testid={`identifier-row-${row.type.toLowerCase()}`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-medium">{row.label}</span>
              {row.isPrimary && (
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-[10px] text-primary">
                  primary
                </Badge>
              )}
              {row.verified ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-600/40 bg-emerald-500/10 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                >
                  <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                  Verified
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-500/50 bg-amber-500/10 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                >
                  Unverified
                </Badge>
              )}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
              {hint && <span className="font-mono">{hint}</span>}
              <span>linked {formatDate(row.linkedAt)}</span>
            </p>
          </div>

          {/* Row actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            {row.type === "EMAIL" && !row.verified && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => void startEmailVerify()}
                disabled={emailBusy}
              >
                {emailBusy && !emailMock ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <BadgeCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                )}
                Verify
              </Button>
            )}
            {(row.type === "GOOGLE" || row.type === "PHONE") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setRemoving(row.type as "GOOGLE" | "PHONE")}
              >
                Remove
              </Button>
            )}
          </div>
        </div>

        {/* EMAIL inline verification */}
        {row.type === "EMAIL" && !row.verified && emailMock && (
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-background p-3">
            <MockCodeChip label="MOCK email" code={emailMock} />
            <div className="space-y-2">
              <Label htmlFor="email-verify-code" className="text-xs">
                6-digit code from the email
              </Label>
              <div className="flex gap-2">
                <Input
                  id="email-verify-code"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                  aria-invalid={!!emailError}
                  className="font-mono tracking-[0.18em]"
                  disabled={emailBusy}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-11 shrink-0"
                  onClick={() => void confirmEmailVerify()}
                  disabled={emailBusy || emailCode.length !== 6}
                >
                  {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Confirm"}
                </Button>
              </div>
              {emailError && (
                <p className="text-xs text-destructive" role="alert">{emailError}</p>
              )}
            </div>
          </div>
        )}
        {row.type === "EMAIL" && !row.verified && !emailMock && emailError && (
          <p className="mt-2 text-xs text-destructive" role="alert">{emailError}</p>
        )}
      </motion.li>
    );
  }

  function renderPlaceholderRow(
    type: "GOOGLE" | "PHONE",
    index: number
  ) {
    const Icon = TYPE_ICON[type];
    return (
      <motion.li
        key={`${type}-placeholder`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="rounded-lg border border-dashed border-border px-4 py-3"
        data-testid={`identifier-placeholder-${type.toLowerCase()}`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground/70">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-muted-foreground">
              {type === "GOOGLE" ? "Google" : "Phone"}
            </span>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {type === "GOOGLE"
                ? "Passwordless sign-in with your Google Account"
                : "One-time-code sign-in with your number"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            onClick={() =>
              type === "GOOGLE" ? void startGoogleLink() : setPhoneMode("entry")
            }
            data-testid={`link-${type.toLowerCase()}-button`}
          >
            {type === "GOOGLE" ? "Link Google" : "Link phone"}
          </Button>
        </div>

        {/* PHONE inline link flow */}
        {type === "PHONE" && phoneMode === "entry" && (
          <form onSubmit={startPhoneLink} className="mt-3 space-y-2 rounded-lg border border-border bg-background p-3" noValidate>
            <Label htmlFor="link-phone-input" className="text-xs">
              Phone number
            </Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="link-phone-input"
                className="pl-9"
                type="tel"
                inputMode="tel"
                placeholder="0803 123 4567"
                autoComplete="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                aria-invalid={!!phoneFieldError}
                disabled={phoneBusy}
              />
            </div>
            {phoneFieldError && (
              <p className="text-xs text-destructive" role="alert">{phoneFieldError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="h-11 flex-1" disabled={phoneBusy}>
                {phoneBusy ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  "Send code"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11"
                onClick={() => {
                  setPhoneMode("idle");
                  setPhoneFieldError(null);
                }}
                disabled={phoneBusy}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {type === "PHONE" && phoneMode === "otp" && phoneSession && (
          <div className="mt-3 rounded-lg border border-border bg-background p-3">
            <PhoneOtpStep
              phoneHint={phoneSession.phoneHint}
              mockOtp={phoneMockOtp}
              value={phoneOtp}
              onValueChange={setPhoneOtp}
              onVerify={() => void verifyPhoneLink()}
              onBack={() => {
                setPhoneMode("entry");
                setPhoneSession(null);
                setPhoneMockOtp(null);
                setPhoneOtp("");
                setPhoneOtpError(null);
              }}
              busy={phoneBusy}
              error={phoneOtpError}
              verifyLabel="Verify"
            />
          </div>
        )}
      </motion.li>
    );
  }

  const rows: React.ReactNode[] = [];
  if (identifiers) {
    identifiers.forEach((row, i) => rows.push(renderRow(row, i)));
    if (!googleRow) rows.push(renderPlaceholderRow("GOOGLE", rows.length));
    if (!phoneRow) rows.push(renderPlaceholderRow("PHONE", rows.length));
  }

  return (
    <>
      <Card className="ts-card-hover min-w-0">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">Sign-in &amp; recovery methods</CardTitle>
            <CardDescription className="truncate">
              Everything that can sign you in — masked, auditable, removable
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground" role="status">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading your sign-in methods…
            </div>
          ) : loadError ? (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => void refresh()}>
                Retry
              </Button>
            </div>
          ) : (
            <ul className="space-y-2" aria-label="Sign-in methods">
              {rows}
            </ul>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Never the raw number.</span>{" "}
            Phones are stored as salted fingerprints and shown only as masked
            hints. Auth methods never affect your trust score — login is not
            verification.
          </p>

          <Button
            variant="outline"
            className="mt-4 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmingLogoutAll(true)}
            data-testid="logout-all-button"
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Sign out from all devices
          </Button>
        </CardContent>
      </Card>

      {/* Google link modal (LINK mode — the caller is already authenticated) */}
      <GoogleConsentModal
        open={googleOpen}
        mode="link"
        session={googleSession}
        initialEmail={user?.email ?? ""}
        onDismiss={() => {
          setGoogleOpen(false);
          setGoogleSession(null);
        }}
        onDone={() => void refresh()}
        onRestart={() => void startGoogleLink()}
      />

      {/* Unlink confirm */}
      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removing === "GOOGLE" ? "Google" : "phone"} sign-in?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer be able to sign in with{" "}
              {removing === "GOOGLE" ? "that Google account" : "that phone number"}.
              Keep at least one way in — an account can&apos;t orphan itself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmUnlink();
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign out everywhere confirm */}
      <AlertDialog open={confirmingLogoutAll} onOpenChange={setConfirmingLogoutAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out from all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              Every active session — including this one — will be revoked
              immediately. Use this if a device you don&apos;t recognize is signed
              in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Stay signed in</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmLogoutAll();
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              Sign out everywhere
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

