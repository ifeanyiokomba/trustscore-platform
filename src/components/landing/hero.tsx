"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  BadgeCheck,
  Phone,
  ScanFace,
  GraduationCap,
  ArrowRight,
  QrCode,
  Share2,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTrustStore } from "@/lib/store";

const PASSPORT_ROWS = [
  { icon: ShieldCheck, label: "Identity", value: "Government verified" },
  { icon: Phone, label: "Phone", value: "Verified" },
  { icon: ScanFace, label: "Biometric", value: "Verified" },
  { icon: GraduationCap, label: "Credentials", value: "3 verified" },
];

const HERO_STATS = [
  { value: "100M+", label: "NIN holders reachable via NINAuth" },
  { value: "0", label: "Raw NINs stored or shared" },
  { value: "100%", label: "Explainable trust signals" },
];

export function Hero() {
  const { user, setView } = useTrustStore();

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      <div className="ts-grid-bg absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Copy */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="outline"
                className="mb-5 gap-1.5 rounded-full border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
              >
                <Sparkles className="h-3.5 w-3.5" />
                The NIN-First trust layer for African digital commerce
              </Badge>
            </motion.div>

            <motion.h1
              id="hero-heading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl"
            >
              Before you deal,
              <br />
              <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                verify the trust.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="mt-5 text-lg text-muted-foreground"
            >
              TrustScore turns government-verified identity into{" "}
              <strong className="font-semibold text-foreground">reusable trust</strong>{" "}
              — a Trust Passport you share instead of your NIN, a Safety Check before
              money changes hands, and an explainable Trust Decision API for business.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Button
                size="lg"
                className="h-12 px-6 text-base ts-glow"
                onClick={() => setView(user ? "dashboard" : "auth")}
              >
                {user ? "Open your dashboard" : "Create your account"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6 text-base" asChild>
                <a href="#how-it-works">See how it works</a>
              </Button>
            </motion.div>

            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6"
            >
              {HERO_STATS.map((s) => (
                <div key={s.label} className="group rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-2xl font-bold text-primary transition-transform group-hover:scale-105">{s.value}</dd>
                  <dd className="mt-1 text-xs text-muted-foreground">{s.label}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* Trust Passport concept preview */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative mx-auto w-full max-w-md"
            aria-label="Trust Passport product preview"
          >
            <div className="ts-glow absolute -inset-3 rounded-3xl bg-primary/5" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="ts-shimmer absolute inset-0" aria-hidden="true" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Trust Passport
                  </p>
                  <Badge
                    variant="outline"
                    className="gap-1 border-primary/40 bg-primary/10 text-primary"
                  >
                    <BadgeCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                </div>

                <p className="mt-4 text-lg font-semibold">Ada O. · @ada</p>
                <p className="text-xs text-muted-foreground">
                  trustscore.ng/@ada · Identity verified 11 days ago
                </p>

                <ul className="mt-5 space-y-3">
                  {PASSPORT_ROWS.map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center justify-between rounded-lg border border-border/70 bg-background/70 px-3.5 py-2.5"
                    >
                      <span className="flex items-center gap-2.5 text-sm font-medium">
                        <row.icon className="h-4 w-4 text-primary" />
                        {row.label}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-primary">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {row.value}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex items-end justify-between rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      TrustScore
                    </p>
                    <p className="ts-grad-text text-5xl font-extrabold tabular-nums">782</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">LOW RISK</p>
                    <p className="text-xs text-muted-foreground">Reputation: Established</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full" disabled>
                    <Share2 className="mr-1.5 h-4 w-4" />
                    Share Passport
                  </Button>
                  <Button className="w-full" disabled>
                    <QrCode className="mr-1.5 h-4 w-4" />
                    Generate QR
                  </Button>
                </div>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Product preview — live in your dashboard now (Stage 9)
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
