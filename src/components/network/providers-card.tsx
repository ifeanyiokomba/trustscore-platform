"use client";

// TrustScore Stage 10 — ProvidersCard: the pan-African country-provider
// registry (read model). Depth meters per corridor (government identity /
// phone OTP / biometric liveness), honest MOCK_LIVE vs PLANNED labels and a
// plain-language note per country. NG is the only live corridor (contract-
// first MOCK); everything else is PLANNED — no coverage is overstated.

import { motion } from "framer-motion";
import { Globe2, MapPin, CheckCircle2, Compass } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProviderRegistry } from "@/lib/types";

function DepthMeter({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5" title={`${label}: depth ${value}/3`}>
      <span className="sr-only">{`${label} depth ${value} of 3`}</span>
      <div className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-3.5 rounded-full ${
              i <= value ? (value >= 3 ? "bg-primary" : "bg-primary/60") : "bg-muted"
            }`}
          />
        ))}
      </div>
      <span className="w-14 text-[10px] leading-none text-muted-foreground">
        {label} <span className="font-semibold text-foreground/70">{value}/3</span>
      </span>
    </span>
  );
}

export function ProvidersCard({ registry }: { registry: ProviderRegistry | null }) {
  return (
    <Card className="ts-card-hover min-w-0" data-testid="net-providers-card">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          <Globe2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Pan-African provider registry</CardTitle>
          <CardDescription className="truncate">
            Where verification depth exists — and where it is merely planned
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {registry ? (
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="net-providers-list">
            {registry.providers.map((p, i) => (
              <motion.li
                key={p.code}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl border p-4 ${
                  p.mode === "MOCK_LIVE" ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      {p.name}
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-bold">
                        {p.code}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{p.idTypeName}</p>
                  </div>
                  {p.mode === "MOCK_LIVE" ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      MOCK_LIVE
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Compass className="h-3 w-3" aria-hidden="true" />
                      Planned
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  <DepthMeter value={p.depths.gov} label="Identity" />
                  <DepthMeter value={p.depths.phone} label="Phone" />
                  <DepthMeter value={p.depths.liveness} label="Liveness" />
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">{p.note}</p>
              </motion.li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="rounded-xl border border-border p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-48" />
                <Skeleton className="mt-3 h-3 w-40" />
                <Skeleton className="mt-2 h-8 w-full" />
              </li>
            ))}
          </ul>
        )}
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
          {registry?.honesty ??
            "The registry is a read model — verification flows remain Nigeria-only until a partner adapter ships."}
        </p>
      </CardContent>
    </Card>
  );
}
