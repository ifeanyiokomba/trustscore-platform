"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, FileSearch, Scale, Layers, Monitor, Smartphone, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

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
    <section id="architecture" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="arch-heading">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Architecture
        </p>
        <h2 id="arch-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Three layers, one trust platform
        </h2>
        <p className="mt-4 text-muted-foreground">
          The separation of Identity, Evidence and Trust is the central architecture
          principle — it is what makes TrustScore a trust layer instead of a KYC vendor.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {LAYERS.map((l, i) => (
          <motion.div key={l.layer} {...fadeUp} transition={{ duration: 0.45, delay: i * 0.08 }}>
            <Card className="relative h-full overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-emerald-400" aria-hidden="true" />
              <CardHeader>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <l.icon className="h-5 w-5" />
                </span>
                <CardTitle className="mt-3 text-lg">{l.layer}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold italic text-primary">&ldquo;{l.question}&rdquo;</p>
                <p className="mt-2 text-sm text-muted-foreground">{l.body}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mt-12">
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
                <div key={s.title} className="rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <s.icon className="h-4 w-4 text-primary" />
                      {s.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-medium text-primary">
                      {s.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {s.tech}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
