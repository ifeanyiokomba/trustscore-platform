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
import { SectionHeading } from "@/components/landing/section-heading";
import { useTrustStore } from "@/lib/store";
import { EASE, SPRING, staggerParent, fadeUp as fadeUpV } from "@/lib/motion";

export function Product() {
  const { user, setView } = useTrustStore();
  return (
    <section id="product" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24" aria-labelledby="product-heading">
      <SectionHeading
        eyebrow="Product"
        title="One trust identity. Many situations."
        description="Stop sending your NIN, BVN and documents around. Share a controlled verification experience instead."
      />
      <span id="product-heading" className="sr-only">
        Product pillars
      </span>

      <motion.div
        variants={staggerParent(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mt-12 grid gap-6 md:grid-cols-3"
      >
        {/* Pillar 1 — Trust Passport */}
        <motion.div variants={fadeUpV} whileHover={{ y: -6 }} transition={SPRING}>
          <Card className="group h-full border-primary/20 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/10">
            <CardHeader>
              <span className="ts-icon-tile flex h-12 w-12 items-center justify-center rounded-xl text-primary transition-transform duration-300 group-hover:scale-105">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <CardTitle className="font-display mt-4 text-xl font-semibold tracking-tight">Trust Passport</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Establish a verified Trust Identity once — government identity, phone,
                biometrics and credentials — then reuse it everywhere. You never send a
                NIN image or number to anyone again.
              </p>
              <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed" aria-label="Trust Passport example">
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
        <motion.div variants={fadeUpV} whileHover={{ y: -6 }} transition={SPRING}>
          <Card className="group h-full border-primary/20 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/10">
            <CardHeader>
              <span className="ts-icon-tile flex h-12 w-12 items-center justify-center rounded-xl text-primary transition-transform duration-300 group-hover:scale-105">
                <SearchCheck className="h-5 w-5" />
              </span>
              <CardTitle className="font-display mt-4 text-xl font-semibold tracking-tight">Check Before You Deal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                About to send someone ₦300,000? Check their Trust Identity first — by QR,
                Trust Link, or username. You get identity, risk and freshness — never raw
                personal data.
              </p>
              <div className="rounded-xl border border-border bg-background p-3 shadow-sm">
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
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-xs text-primary">
                Live now (Stage 6)
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pillar 3 — Trust Link + QR */}
        <motion.div variants={fadeUpV} whileHover={{ y: -6 }} transition={SPRING}>
          <Card className="group h-full border-primary/20 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/10">
            <CardHeader>
              <span className="ts-icon-tile flex h-12 w-12 items-center justify-center rounded-xl text-primary transition-transform duration-300 group-hover:scale-105">
                <Link2 className="h-5 w-5" />
              </span>
              <CardTitle className="font-display mt-4 text-xl font-semibold tracking-tight">Trust Link &amp; QR Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Every verified user gets <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">trustscore.ng/@username</code>{" "}
                and a QR Trust Card. Put it in your WhatsApp, Instagram bio, marketplace
                listing, invoice or shop counter.
              </p>
              <div className="group/qr rounded-lg border border-border bg-muted/50 p-3 text-center">
                <QrCode className="mx-auto h-10 w-10 text-primary transition-transform duration-500 group-hover/qr:rotate-3 group-hover/qr:scale-110" aria-hidden="true" />
                <p className="mt-2 text-xs font-medium">✓ Identity Verified · TrustScore 782</p>
                <p className="text-[11px] text-muted-foreground">Verify me before payment</p>
              </div>
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-xs text-primary">
                Live now (Stage 5)
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mt-12 text-center"
      >
        <Button size="lg" variant="outline" className="group h-12 px-6 text-base" onClick={() => setView(user ? "dashboard" : "auth")}>
          {user ? "Go to your dashboard" : "Reserve your @handle today"}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Stage 2 — accounts and NINAuth verification sessions (mock provider) are live
          now; the live partner transport activates with commercial NINAuth access.
        </p>
      </motion.div>
    </section>
  );
}
