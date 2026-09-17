"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, FileSearch, Scale, Layers, Monitor, Smartphone, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/landing/section-heading";
import { staggerParent, fadeUp as fadeUpV, SPRING } from "@/lib/motion";

const LAYERS = [
  {
    icon: ShieldCheck,
    layer: "Layer 1 — Identity",
    question: "Who are you?",
    body: "Powered by NIN/NINAuth: government-verified identity with explicit, recorded consent. The foundation — not the product.",
  },
  {
    icon: FileSearch,
    layer: "Layer 2 — Evidence",
    question: "What can be established about you?",
    body: "Credentials, phone, biometrics, verified interactions, dispute outcomes — every signal time-bound, sourced and explainable.",
  },
  {
    icon: Scale,
    layer: "Layer 3 — Trust",
    question: "What does the evidence imply — here?",
    body: "Our own reputation, risk and decision engine. Context-aware trust decisions, not one universal number.",
  },
];

const STACK = [
  {
    icon: Monitor,
    title: "Consumer Web",
    tech: "Next.js 16",
    body: "Public Trust Passport pages, share links, QR verification, account management, B2B portal.",
    status: "You are here",
  },
  {
    icon: Smartphone,
    title: "Mobile App",
    tech: "Flutter",
    body: "NINAuth verification, Trust Passport, Safety Check, scan QR, history, security center. Same API, native experience.",
    status: "Blueprint ready",
  },
  {
    icon: Server,
    title: "Platform API",
    tech: "FastAPI target",
    body: "Domain services — Identity, Consent, Verification, Evidence, Trust — with Postgres, Redis and queues in production.",
    status: "Contract mirrored in /api/v1",
  },
];

export function Architecture() {
  return (
    <section id="architecture" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24" aria-labelledby="arch-heading">
      <SectionHeading
        eyebrow="Architecture"
        title="Three layers, one trust platform"
        description="The separation of Identity, Evidence and Trust is the central architecture principle — it is what makes TrustScore a trust layer instead of a KYC vendor."
      />

      <motion.div
        variants={staggerParent(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mt-12 grid gap-6 md:grid-cols-3"
      >
        {LAYERS.map((l, i) => (
          <motion.div key={l.layer} variants={fadeUpV} whileHover={{ y: -6 }} transition={SPRING}>
            <Card className="group relative h-full overflow-hidden">
              {/* The layer's gradient crown — thicker and brighter on hover */}
              <div
                className="absolute inset-x-0 top-0 h-1 origin-left bg-gradient-to-r from-primary to-emerald-400 transition-transform duration-500 group-hover:scale-x-110"
                aria-hidden="true"
              />
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <span className="ts-icon-tile flex h-12 w-12 items-center justify-center rounded-xl text-primary transition-transform duration-300 group-hover:scale-105">
                    <l.icon className="h-5 w-5" />
                  </span>
                  <span
                    className="font-display text-4xl font-semibold leading-none text-foreground/10 transition-colors duration-300 group-hover:text-primary/30"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                </div>
                <CardTitle className="font-display mt-4 text-lg font-semibold tracking-tight">{l.layer}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-sm font-semibold italic text-primary">&ldquo;{l.question}&rdquo;</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{l.body}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={staggerParent(0.15)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="mt-12"
      >
        <motion.div variants={fadeUpV}>
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-primary" />
                One platform, three experiences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {STACK.map((s) => (
                  <div
                    key={s.title}
                    className="group rounded-xl border border-border bg-muted/40 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <s.icon className="h-4 w-4 text-primary transition-transform duration-300 group-hover:scale-110" />
                        {s.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-medium text-primary">
                        {s.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {s.tech}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </section>
  );
}
