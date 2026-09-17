"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import { AnimatedNumber, EASE } from "@/lib/motion";

const PASSPORT_ROWS = [
  { icon: ShieldCheck, label: "Identity", value: "Government verified" },
  { icon: Phone, label: "Phone", value: "Verified" },
  { icon: ScanFace, label: "Biometric", value: "Verified" },
  { icon: GraduationCap, label: "Credentials", value: "3 verified" },
];

const HERO_STATS = [
  { value: 100, suffix: "M+", label: "NIN holders reachable via NINAuth" },
  { value: 0, suffix: "", label: "Raw NINs stored or shared" },
  { value: 100, suffix: "%", label: "Explainable trust signals" },
];

export function Hero() {
  const { user, setView } = useTrustStore();
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      {/* Stage 15 — layered atmosphere: aurora pools that breathe, the trust
          grid, and a film-grain pass to kill gradient banding. */}
      <div className="ts-aurora ts-aurora-drift absolute inset-0" aria-hidden="true" />
      <div className="ts-grid-bg absolute inset-0" aria-hidden="true" />
      <div className="ts-noise pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <Badge
                variant="outline"
                className="mb-6 gap-2 rounded-full border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="sm:hidden">The NIN-First trust layer</span>
                <span className="hidden sm:inline">The NIN-First trust layer for African digital commerce</span>
              </Badge>
            </motion.div>

            <motion.h1
              id="hero-heading"
              initial={{ opacity: 0, y: 26, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.08 }}
              className="font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.15rem]"
            >
              Before you deal,
              <br />
              <span className="relative inline-block bg-gradient-to-r from-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                verify the trust.
                {/* Hand-drawn emphasis — a quiet underline flourish */}
                <svg
                  className="absolute -bottom-2 left-0 w-full text-primary/50"
                  viewBox="0 0 300 12"
                  fill="none"
                  aria-hidden="true"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M3 9C60 3 150 2 297 7"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.75 }}
                  />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE, delay: 0.2 }}
              className="mt-7 text-lg leading-relaxed text-foreground/75"
            >
              TrustScore turns government-verified identity into{" "}
              <strong className="font-semibold text-foreground">reusable trust</strong>{" "}
              — a Trust Passport you share instead of your NIN, a Safety Check before
              money changes hands, and an explainable Trust Decision API for business.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE, delay: 0.3 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Button
                size="lg"
                className="ts-sheen group h-12 px-7 text-base ts-glow"
                onClick={() => setView(user ? "dashboard" : "auth")}
              >
                {user ? "Open your dashboard" : "Create your account"}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-7 text-base" asChild>
                <a href="#how-it-works">See how it works</a>
              </Button>
            </motion.div>

            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}
              className="mt-11 grid grid-cols-3 gap-4 border-t border-border pt-7"
            >
              {HERO_STATS.map((s, i) => (
                <div
                  key={s.label}
                  className="group rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50"
                >
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-3xl font-bold tracking-tight text-primary transition-transform duration-300 group-hover:scale-[1.04]">
                    <AnimatedNumber
                      value={s.value}
                      suffix={s.suffix}
                      delay={0.55 + i * 0.15}
                      duration={1.3}
                    />
                  </dd>
                  <dd className="mt-1.5 text-xs leading-snug text-muted-foreground">{s.label}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* Trust Passport concept preview — floats gently, tilts toward the
              cursor, and counts its score up on arrival. */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, ease: EASE, delay: 0.25 }}
            className="relative mx-auto w-full max-w-md [perspective:1200px]"
            aria-label="Trust Passport product preview"
          >
            {/* Layered halo behind the card */}
            <div
              className="ts-glow absolute -inset-4 rounded-[2rem] bg-primary/5"
              aria-hidden="true"
            />
            <motion.div
              animate={reduced ? undefined : { y: [0, -10, 0] }}
              whileHover={{ rotateX: -4, rotateY: 5, scale: 1.015 }}
              transition={{
                y: { duration: 7, repeat: Infinity, ease: "easeInOut" },
                rotateX: { type: "spring", stiffness: 320, damping: 28 },
                rotateY: { type: "spring", stiffness: 320, damping: 28 },
                scale: { type: "spring", stiffness: 320, damping: 28 },
              }}
              className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl [transform-style:preserve-3d]"
            >
              <div className="ts-shimmer absolute inset-0" aria-hidden="true" />
              <div className="relative p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
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

                <p className="mt-5 text-lg font-semibold">Ada O. · @ada</p>
                <p className="text-xs text-muted-foreground">
                  trustscore.ng/@ada · Identity verified 11 days ago
                </p>

                <ul className="mt-6 space-y-2.5">
                  {PASSPORT_ROWS.map((row, i) => (
                    <motion.li
                      key={row.label}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: EASE, delay: 0.6 + i * 0.12 }}
                      className="flex items-center justify-between rounded-lg border border-border/70 bg-background/70 px-3.5 py-2.5 transition-colors hover:border-primary/30"
                    >
                      <span className="flex items-center gap-2.5 text-sm font-medium">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                          <row.icon className="h-3.5 w-3.5 text-primary" />
                        </span>
                        {row.label}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-primary">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {row.value}
                      </span>
                    </motion.li>
                  ))}
                </ul>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 1.1 }}
                  className="relative mt-6 overflow-hidden rounded-xl border border-primary/25 bg-primary/5 p-4"
                >
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        TrustScore
                      </p>
                      <p className="ts-grad-text text-5xl font-extrabold">
                        <AnimatedNumber value={782} delay={1.2} duration={1.6} />
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">LOW RISK</p>
                      <p className="text-xs text-muted-foreground">Reputation: Established</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: EASE, delay: 1.35 }}
                  className="mt-5 grid grid-cols-2 gap-3"
                >
                  <Button variant="outline" className="w-full" disabled>
                    <Share2 className="mr-1.5 h-4 w-4" />
                    Share Passport
                  </Button>
                  <Button className="w-full" disabled>
                    <QrCode className="mr-1.5 h-4 w-4" />
                    Generate QR
                  </Button>
                </motion.div>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Product preview — live in your dashboard now (Stage 15)
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
