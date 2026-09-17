"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  FileCheck2,
  Fingerprint,
  ScanFace,
  QrCode,
  ArrowRight,
  Lock,
  Search,
  Gavel,
  Cpu,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/landing/section-heading";
import { EASE, staggerParent, fadeUp as fadeUpV } from "@/lib/motion";

const FLOW_STEPS: { icon: typeof Smartphone; title: string; body: React.ReactNode }[] = [
  {
    icon: Smartphone,
    title: "1 · You tap “Continue with NINAuth”",
    body: <>No forms. No document uploads. TrustScore hands off to <strong className="font-semibold text-foreground/90">Nigeria&apos;s official identity consent gateway</strong> — owned and operated by NIMC.</>,
  },
  {
    icon: KeyRound,
    title: "2 · You consent in your NINAuth app",
    body: <>NINAuth shows exactly which fields are requested, by whom, and why. You approve with a <strong className="font-semibold text-foreground/90">QR scan or a time-limited share code</strong>. Your raw NIN is never exposed.</>,
  },
  {
    icon: FileCheck2,
    title: "3 · TrustScore validates the proof",
    body: <>Our backend exchanges the authorization code (PKCE) and <strong className="font-semibold text-foreground/90">validates the returned tokens</strong> — never trusting a client-side decode.</>,
  },
  {
    icon: Fingerprint,
    title: "4 · Your Trust Identity is established",
    body: <>We record consent-scoped attributes and time-bound evidence with full provenance. Freshness is tracked — <strong className="font-semibold text-foreground/90">“verified 11 days ago”, not just “verified”</strong>.</>,
  },
  {
    icon: ScanFace,
    title: "5 · Signals stack, assurance climbs",
    body: <>Bind your phone via OTP, run a liveness selfie — each signal is <strong className="font-semibold text-foreground/90">a consent you can withdraw</strong>. Assurance only reaches the top when independent signals agree.</>,
  },
  {
    icon: QrCode,
    title: "6 · You carry a Trust Passport",
    body: <>A live TrustScore with an NDPA-explained breakdown, credentials, and a QR Trust Card you can share as a <strong className="font-semibold text-foreground/90">scoped, expiring link</strong>. Every open is receipted — you always know who checked you.</>,
  },
  {
    icon: Search,
    title: "7 · Others check before they deal",
    body: <>A member can run a consent-gated safety check — by your handle, a trust link, or a QR scan — and see a sanitized assessment: <strong className="font-semibold text-foreground/90">“No confirmed adverse signals found”, never “safe”</strong>. You control it, and every check is receipted with their name.</>,
  },
  {
    icon: Gavel,
    title: "8 · Flags get human review",
    body: <>A serious concern can be flagged with evidence — by a verified member only, capped and anti-gamed. The subject responds, <strong className="font-semibold text-foreground/90">a human reviewer decides</strong>, and a confirmed flag can be appealed for 14 days. While an appeal is pending, the score is frozen so it cannot move against you.</>,
  },
  {
    icon: Cpu,
    title: "9 · The engine is rules-first",
    body: <>The scoring policy is <strong className="font-semibold text-foreground/90">public, versioned and inspectable</strong> — every score names the policy that produced it. Changes ship only behind a completed DPIA, and automated significant decisions stay gated off until governance says otherwise.</>,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative border-y border-border/70 bg-muted/30"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="Consent-first, NINAuth-native verification"
          description="NINAuth is Nigeria's official identity consent gateway (NIMC). We align with it — QR and share-code flows, scoped fields, explicit purpose — instead of fighting the ecosystem."
        />

        <div className="relative mt-14">
          {/* The rail — a vertical trust line down the grid that draws itself
              as the reader scrolls the journey. Hidden on mobile stacks. */}
          <motion.div
            aria-hidden="true"
            className="ts-rail absolute bottom-6 left-[7.25rem] top-2 hidden w-px origin-top rounded-full md:block lg:left-[9.25rem]"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 1.4, ease: EASE }}
          />
          <motion.ol
            variants={staggerParent(0.05, 0.06)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4"
          >
            {FLOW_STEPS.map((step, i) => (
              <motion.li key={step.title} variants={fadeUpV} className="group relative">
                <Card className="ts-card-hover h-full border-border/80">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <span className="ts-icon-tile relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-primary transition-transform duration-300 group-hover:scale-110">
                        <step.icon className="h-5 w-5" />
                      </span>
                      <span
                        className="font-display text-2xl font-semibold leading-none text-foreground/12 transition-colors duration-300 group-hover:text-primary/40"
                        aria-hidden="true"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold leading-snug">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </CardContent>
                </Card>
              </motion.li>
            ))}
          </motion.ol>
        </div>

        <motion.div
          variants={staggerParent(0.15)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-12 grid gap-4 lg:grid-cols-2"
        >
          <motion.div variants={fadeUpV} className="group flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/10">
            <span className="ts-icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-primary">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Security model</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                OAuth 2.0 / OIDC with PKCE. Client secrets live only in the backend. ID
                tokens are validated — not merely decoded. Aligned with NINAuth&apos;s
                published standards (FIDO UAF, WebAuthn, W3C DID/VC).
              </p>
            </div>
          </motion.div>
          <motion.div variants={fadeUpV} className="group flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/10">
            <span className="ts-icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Custody model</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                NINAuth records stay in NIMC-authorized infrastructure. TrustScore holds{" "}
                <strong className="font-semibold">verified evidence and references</strong>{" "}
                — never your raw NIN.
              </p>
            </div>
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-9 text-center text-xs text-muted-foreground"
        >
          <ArrowRight className="mr-1 inline h-3 w-3" />
          Stages 2–3 are live: the full OAuth + PKCE + consent contract, assurance
          ladder, hashed identifiers and consent-scoped attributes run against a mock
          NINAuth provider adapter while commercial partner access is finalized.
        </motion.p>
      </div>
    </section>
  );
}
