"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  SearchCheck,
  Link2,
  QrCode,
  BadgeCheck,
  ArrowRight,
  ShieldQuestion,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTrustStore } from "@/lib/store";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-muted-foreground">{description}</p>}
    </div>
  );
}

export function Product() {
  const { user, setView } = useTrustStore();
  return (
    <section id="product" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="product-heading">
      <SectionHeading
        eyebrow="Product"
        title="One trust identity. Many situations."
        description="Stop sending your NIN, BVN and documents around. Share a controlled verification experience instead."
      />
      <span id="product-heading" className="sr-only">
        Product pillars
      </span>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {/* Pillar 1 — Trust Passport */}
        <motion.div {...fadeUp} transition={{ duration: 0.45 }}>
          <Card className="h-full border-primary/20 transition-shadow hover:shadow-lg">
            <CardHeader>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <CardTitle className="mt-3 text-xl">Trust Passport</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Establish a verified Trust Identity once — government identity, phone,
                biometrics and credentials — then reuse it everywhere. You never send a
                NIN image or number to anyone again.
              </p>
              <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-[11px] leading-relaxed" aria-label="Trust Passport example">
{`✓ Government Identity Verified
✓ Phone Verified   ✓ Biometric Verified
✓ Credentials Verified
Reputation: Established
TrustScore: 782 · LOW RISK`}
              </pre>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Live now (Stage 5)
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pillar 2 — Check Before You Deal */}
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.08 }}>
          <Card className="h-full border-primary/20 transition-shadow hover:shadow-lg">
            <CardHeader>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SearchCheck className="h-5 w-5" />
              </span>
              <CardTitle className="mt-3 text-xl">Check Before You Deal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                About to send someone ₦300,000? Check their Trust Identity first — by QR,
                Trust Link, or username. You get identity, risk and freshness — never raw
                personal data.
              </p>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Trust assessment
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li className="flex items-center gap-1.5">
                    <BadgeCheck className="h-3 w-3 text-primary" /> Identity: VERIFIED
                  </li>
                  <li className="flex items-center gap-1.5">
                    <BadgeCheck className="h-3 w-3 text-primary" /> Phone: VERIFIED
                  </li>
                  <li className="flex items-center gap-1.5">
                    <ShieldQuestion className="h-3 w-3 text-amber-500" /> Reputation: NEW
                  </li>
                </ul>
                <p className="mt-2 text-xs font-medium">
                  TrustScore 734 · Risk LOW
                </p>
                <p className="mt-1 text-[11px] italic text-muted-foreground">
                  &ldquo;No confirmed adverse signals found.&rdquo;
                </p>
              </div>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Ships Stage 6
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pillar 3 — Trust Link + QR */}
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.16 }}>
          <Card className="h-full border-primary/20 transition-shadow hover:shadow-lg">
            <CardHeader>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Link2 className="h-5 w-5" />
              </span>
              <CardTitle className="mt-3 text-xl">Trust Link & QR Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Every verified user gets <code className="rounded bg-muted px-1.5 py-0.5 text-xs">trustscore.ng/@username</code>{" "}
                and a QR Trust Card. Put it in your WhatsApp, Instagram bio, marketplace
                listing, invoice or shop counter.
              </p>
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                <QrCode className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
                <p className="mt-2 text-xs font-medium">✓ Identity Verified · TrustScore 782</p>
                <p className="text-[11px] text-muted-foreground">Verify me before payment</p>
              </div>
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-xs text-primary">
                Live now (Stage 5)
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mt-10 text-center">
        <Button size="lg" variant="outline" onClick={() => setView(user ? "dashboard" : "auth")}>
          {user ? "Go to your dashboard" : "Reserve your @handle today"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Stage 2 — accounts and NINAuth verification sessions (mock provider) are live
          now; the live partner transport activates with commercial NINAuth access.
        </p>
      </motion.div>
    </section>
  );
}
