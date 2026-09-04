"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Eye, FileText, UserCheck, Bell, Lock, ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const PILLARS = [
  {
    icon: Lock,
    title: "Engineered privacy",
    points: [
      "scrypt password hashing with per-user salts",
      "httpOnly, sameSite session cookies — tokens stored only as hashes",
      "Rate limiting and zod validation on every endpoint",
      "No raw NIN, BVN or phone numbers in URLs, logs or analytics",
    ],
  },
  {
    icon: Eye,
    title: "Transparency by design",
    points: [
      "Every trust result explains its signals — never a mystery number",
      "“No confirmed adverse signals found” — we never claim “safe”",
      "Audit trail for every account action",
      "Mock or preview features are always labeled as such",
    ],
  },
  {
    icon: UserCheck,
    title: "Your data, your rights",
    points: [
      "NDPA-aligned: access, rectification, erasure, portability",
      "Consent recorded: who, why, which fields, when, which provider",
      "Human review path for contested decisions",
      "Data-subject requests honored within 30 days",
    ],
  },
  {
    icon: ScrollText,
    title: "Partner-grade compliance",
    points: [
      "Aligned to NINAuth partner obligations: purpose-limited use, informed consent",
      "Logging, monitoring, compliance reporting, audit readiness",
      "NIMC retains custody of identity records — we keep evidence, not raw data",
      "DPIA gate before any automated significant decision ships",
    ],
  },
];

export function Security() {
  return (
    <section id="security" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="security-heading">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Security &amp; Privacy
        </p>
        <h2 id="security-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Trust has to be earned — starting with ours
        </h2>
        <p className="mt-4 text-muted-foreground">
          A trust product that mishandles data is a contradiction. Privacy and consent are
          architectural requirements here, not features.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {PILLARS.map((p, i) => (
          <motion.div key={p.title} {...fadeUp} transition={{ duration: 0.45, delay: i * 0.06 }}>
            <Card className="h-full">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </span>
                <CardTitle className="text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {p.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.5 }}
        className="mt-10 grid gap-3 sm:grid-cols-3"
      >
        {[
          { icon: Bell, label: "Identity change alerts arrive Stage 5" },
          { icon: FileText, label: "Trust receipts arrive Stage 6" },
          { icon: ShieldCheck, label: "Continuous verification freshness built-in from Stage 3" },
        ].map((n) => (
          <div
            key={n.label}
            className="flex items-center gap-2.5 rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground"
          >
            <n.icon className="h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
            {n.label}
          </div>
        ))}
      </motion.div>
    </section>
  );
}
