"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const FOOTER_COLS = [
  {
    title: "Product",
    links: [
      { label: "Trust Passport", href: "#product" },
      { label: "Check Before You Deal", href: "#product" },
      { label: "Trust Link & QR", href: "#product" },
      { label: "Trust Decision API", href: "#architecture" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Architecture", href: "#architecture" },
      { label: "Roadmap", href: "#roadmap" },
      { label: "System status", href: "/api/health" },
    ],
  },
  {
    title: "Trust & Compliance",
    links: [
      { label: "Security & Privacy", href: "#security" },
      { label: "NDPA alignment", href: "#security" },
      { label: "Consent-first design", href: "#security" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="font-bold tracking-tight">TrustScore</span>
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              We turn government-verified identity into reusable trust — not another
              KYC vendor.
            </p>
            <p className="text-xs text-muted-foreground">
              Identity layer powered by NINAuth (NIMC). No raw NIN is ever stored or
              shared by TrustScore.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-3 text-sm font-semibold">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TrustScore. All rights reserved.</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              Stage 5 · Trust Passport (mock providers)
            </span>
            <span>Privacy-first · Consent-first · Explainable-by-design</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
