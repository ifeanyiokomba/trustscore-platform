"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Eye, FileText, UserCheck, Bell, Lock, ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "@/components/landing/section-heading";
import { staggerParent, fadeUp as fadeUpV, SPRING } from "@/lib/motion";

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
    <section id="security" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24" aria-labelledby="security-heading">
      <SectionHeading
        eyebrow="Security & Privacy"
        title="Trust has to be earned — starting with ours"
        description="A trust product that mishandles data is a contradiction. Privacy and consent are architectural requirements here, not features."
      />

      <motion.div
        variants={staggerParent(0.1, 0.08)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mt-12 grid gap-6 sm:grid-cols-2"
      >
        {PILLARS.map((p) => (
          <motion.div key={p.title} variants={fadeUpV} whileHover={{ y: -4 }} transition={SPRING}>
            <Card className="group h-full transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/5">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <span className="ts-icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary transition-transform duration-300 group-hover:scale-105">
                  <p.icon className="h-5 w-5" />
                </span>
                <CardTitle className="font-display text-base font-semibold tracking-tight">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {p.points.map((point) => (
                    <li key={point} className="group/item flex items-start gap-2 text-sm text-muted-foreground">
                      <ShieldCheck
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80 transition-colors duration-200 group-hover/item:text-primary"
                        aria-hidden="true"
                      />
                      <span className="transition-colors duration-200 group-hover/item:text-foreground/90">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={staggerParent(0.2)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="mt-10 grid gap-3 sm:grid-cols-3"
      >
        {[
          { icon: Bell, label: "Identity change alerts arrive Stage 5" },
          { icon: FileText, label: "Trust receipts arrive Stage 6" },
          { icon: ShieldCheck, label: "Continuous verification freshness built-in from Stage 3" },
        ].map((n) => (
          <motion.div
            key={n.label}
            variants={fadeUpV}
            className="group flex items-center gap-2.5 rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground transition-colors duration-300 hover:border-primary/40 hover:text-foreground"
          >
            <n.icon className="h-4 w-4 shrink-0 text-primary/70 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
            {n.label}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
