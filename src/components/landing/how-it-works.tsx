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

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const FLOW_STEPS = [
  {
    icon: Smartphone,
    title: "1 · You tap “Continue with NINAuth”",
    body: "No forms. No document uploads. TrustScore hands off to Nigeria's official identity consent gateway — owned and operated by NIMC.",
  },
  {
    icon: KeyRound,
    title: "2 · You consent in your NINAuth app",
    body: "NINAuth shows exactly which fields are requested, by whom, and why. You approve with a QR scan or a time-limited share code. Your raw NIN is never exposed.",
  },
  {
    icon: FileCheck2,
    title: "3 · TrustScore validates the proof",
    body: "Our backend exchanges the authorization code (PKCE) and validates the returned tokens — never trusting a client-side decode.",
  },
  {
    icon: Fingerprint,
    title: "4 · Your Trust Identity is established",
    body: "We record consent-scoped attributes and time-bound evidence with full provenance. Freshness is tracked — “verified 11 days ago”, not just “verified”.",
  },
  {
    icon: ScanFace,
    title: "5 · Signals stack, assurance climbs",
    body: "Bind your phone via OTP, run a liveness selfie — each signal is a consent you can withdraw. Assurance only reaches the top when independent signals agree.",
  },
  {
    icon: QrCode,
    title: "6 · You carry a Trust Passport",
    body: "A live TrustScore with an NDPA-explained breakdown, credentials, and a QR Trust Card you can share as a scoped, expiring link. Every open is receipted — you always know who checked you.",
  },
  {
    icon: Search,
    title: "7 · Others check before they deal",
    body: "A member can run a consent-gated safety check — by your handle, a trust link, or a QR scan — and see a sanitized assessment: “No confirmed adverse signals found”, never “safe”. You control it, and every check is receipted with their name.",
  },
  {
    icon: Gavel,
    title: "8 · Flags get human review",
    body: "A serious concern can be flagged with evidence — by a verified member only, capped and anti-gamed. The subject responds, a human reviewer decides, and a confirmed flag can be appealed for 14 days. While an appeal is pending, the score is frozen so it cannot move against you.",
  },
  {
    icon: Cpu,
    title: "9 · The engine is rules-first",
    body: "The scoring policy is public, versioned and inspectable — every score names the policy that produced it. Changes ship only behind a completed DPIA, and automated significant decisions stay gated off until governance says otherwise.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-border/70 bg-muted/30"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 id="how-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Consent-first, NINAuth-native verification
          </h2>
          <p className="mt-4 text-muted-foreground">
            NINAuth is Nigeria&apos;s official identity consent gateway (NIMC). We align
            with it — QR and share-code flows, scoped fields, explicit purpose — instead
            of fighting the ecosystem.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              {...fadeUp}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="group"
            >
              <Card className="ts-card-hover h-full border-border/80">
                <CardContent className="p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold leading-snug">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            </motion.li>
          ))}
        </ol>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="mt-10 grid gap-4 lg:grid-cols-2"
        >
          <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-5">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">Security model</p>
              <p className="mt-1 text-sm text-muted-foreground">
                OAuth 2.0 / OIDC with PKCE. Client secrets live only in the backend. ID
                tokens are validated — not merely decoded. Aligned with NINAuth&apos;s
                published standards (FIDO UAF, WebAuthn, W3C DID/VC).
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">Custody model</p>
              <p className="mt-1 text-sm text-muted-foreground">
                NINAuth records stay in NIMC-authorized infrastructure. TrustScore holds{" "}
                <strong className="font-semibold">verified evidence and references</strong>{" "}
                — never your raw NIN.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="mt-8 text-center text-xs text-muted-foreground"
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
