"use client";

import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";

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
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground shadow-sm">
                <ShieldCheck className="h-4.5 w-4.5" />
              </span>
              <span className="font-display text-base font-bold tracking-tight">TrustScore</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              We turn government-verified identity into reusable trust — not another
              KYC vendor.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Identity layer powered by NINAuth (NIMC). No raw NIN is ever stored or
              shared by TrustScore.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/70">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="group/link inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      {l.label}
                      <ArrowUpRight
                        className="h-3 w-3 opacity-0 -translate-x-0.5 translate-y-0.5 transition-all duration-200 group-hover/link:opacity-60 group-hover/link:translate-x-0 group-hover/link:translate-y-0"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TrustScore. All rights reserved.</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              Stage 15 · Design Elevation (typography + motion design language)
            </span>
            <span>Privacy-first · Consent-first · Explainable-by-design</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
