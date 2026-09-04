"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AtSign,
  Lock,
  Mail,
  User,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTrustStore } from "@/lib/store";
import { apiLogin, apiRegister } from "@/lib/api-client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_RE = /^[a-z0-9_]{3,24}$/;

function fieldError(value: string, kind: "email" | "password" | "handle" | "displayName" | string): string | null {
  if (!value.trim()) return "Required";
  if (kind === "email" && !EMAIL_RE.test(value.trim())) return "Enter a valid email address";
  if (kind === "password" && value.length < 8) return "At least 8 characters";
  if (kind === "handle" && !HANDLE_RE.test(value.trim()))
    return "3–24 chars: lowercase letters, numbers, underscore";
  if (kind === "displayName" && value.trim().length < 2) return "At least 2 characters";
  return null;
}

export function AuthView() {
  const { setView, error, setError } = useTrustStore();
  const [tab, setTab] = React.useState<"signin" | "signup">("signup");

  // shared fields
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  // register fields
  const [displayName, setDisplayName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [acceptTerms, setAcceptTerms] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [validation, setValidation] = React.useState<Record<string, string | null>>({});

  React.useEffect(() => {
    setError(null);
    setValidation({});
  }, [tab, setError]);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    const v: Record<string, string | null> = {
      displayName: fieldError(displayName, "displayName"),
      handle: fieldError(handle, "handle"),
      email: fieldError(email, "email"),
      password: fieldError(password, "password"),
    };
    if (confirm !== password) v.confirm = "Passwords do not match";
    if (!acceptTerms) v.terms = "Please accept the Terms & Privacy Policy";
    setValidation(v);
    if (Object.values(v).some(Boolean)) return;

    setSubmitting(true);
    try {
      await apiRegister({
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
        handle: handle.trim().toLowerCase(),
        acceptTerms,
      });
    } catch {
      /* error already surfaced in store */
    } finally {
      setSubmitting(false);
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    const v: Record<string, string | null> = {
      email: fieldError(email, "email"),
      password: fieldError(password, "password"),
    };
    setValidation(v);
    if (Object.values(v).some(Boolean)) return;

    setSubmitting(true);
    try {
      await apiLogin({ email: email.trim().toLowerCase(), password });
    } catch {
      /* error already surfaced in store */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="relative flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-12"
      aria-labelledby="auth-heading"
    >
      <div className="ts-grid-bg absolute inset-0" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <button
          onClick={() => setView("landing")}
          className="mb-4 flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        <Card className="ts-glow border-primary/20 shadow-xl">
          <CardHeader className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <CardTitle id="auth-heading" className="mt-4 text-2xl">
              {tab === "signup" ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {tab === "signup"
                ? "Reserve your @handle today — then verify your Trust Identity with NINAuth (mock provider) in the dashboard."
                : "Sign in to your TrustScore account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(t) => setTab(t as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">Create account</TabsTrigger>
                <TabsTrigger value="signin">Sign in</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={onRegister} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="reg-name"
                        className="pl-9"
                        placeholder="Ada Obi"
                        autoComplete="name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        aria-invalid={!!validation.displayName}
                        required
                      />
                    </div>
                    {validation.displayName && (
                      <p className="text-xs text-destructive">{validation.displayName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-handle">Your Trust handle</Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="reg-handle"
                        className="pl-9"
                        placeholder="ada"
                        autoComplete="off"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        aria-invalid={!!validation.handle}
                        required
                      />
                    </div>
                    {handle && HANDLE_RE.test(handle) && (
                      <p className="flex items-center gap-1 text-xs text-primary">
                        <BadgeCheck className="h-3 w-3" />
                        trustscore.ng/@{handle}
                      </p>
                    )}
                    {validation.handle && (
                      <p className="text-xs text-destructive">{validation.handle}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="reg-email"
                        className="pl-9"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={!!validation.email}
                        required
                      />
                    </div>
                    {validation.email && (
                      <p className="text-xs text-destructive">{validation.email}</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          id="reg-password"
                          className="pl-9"
                          type="password"
                          placeholder="8+ characters"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          aria-invalid={!!validation.password}
                          required
                        />
                      </div>
                      {validation.password && (
                        <p className="text-xs text-destructive">{validation.password}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">Confirm</Label>
                      <Input
                        id="reg-confirm"
                        type="password"
                        placeholder="Repeat password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        aria-invalid={!!validation.confirm}
                        required
                      />
                      {validation.confirm && (
                        <p className="text-xs text-destructive">{validation.confirm}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="reg-terms"
                        checked={acceptTerms}
                        onCheckedChange={(c) => setAcceptTerms(c === true)}
                        aria-invalid={!!validation.terms}
                      />
                      <Label htmlFor="reg-terms" className="text-xs font-normal leading-snug text-muted-foreground">
                        I accept the Terms of Service and Privacy Policy, and consent to
                        TrustScore processing my account data under the Nigeria Data
                        Protection Act.
                      </Label>
                    </div>
                    {validation.terms && (
                      <p className="text-xs text-destructive">{validation.terms}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account…
                      </>
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signin" className="mt-4">
                <form onSubmit={onLogin} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="signin-email"
                        className="pl-9"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={!!validation.email}
                        required
                      />
                    </div>
                    {validation.email && (
                      <p className="text-xs text-destructive">{validation.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="signin-password"
                        className="pl-9"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={!!validation.password}
                        required
                      />
                    </div>
                    {validation.password && (
                      <p className="text-xs text-destructive">{validation.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
              Stage 1 accounts use email &amp; password with hardened sessions. NINAuth
              identity verification is live in your dashboard (mock provider).
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
