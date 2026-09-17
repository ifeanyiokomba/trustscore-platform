"use client";

// TrustScore Stage 16 — Surface Elevation.
// TabIntro: the display voice (Fraunces eyebrow + headline + contract line)
// brought into every deep dashboard surface. Tabs remount on switch, so the
// entrance replays with the shared motion language — instant, branded, honest.
// TabSurface: the matching mount animation for the content grid below it.

import * as React from "react";
import { motion } from "framer-motion";
import { EASE, DUR } from "@/lib/motion";

export function TabIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  /** Right-side slot — actions, live badges, counters. */
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-border/70 pb-5">
      <div className="min-w-0 max-w-2xl">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.fast, ease: EASE }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary"
        >
          <span
            className="h-1 w-1 rounded-full bg-primary ts-pulse"
            aria-hidden="true"
          />
          {eyebrow}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: DUR.base, ease: EASE, delay: 0.05 }}
          className="font-display mt-2.5 text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-[1.7rem]"
        >
          {title}
        </motion.h2>
        {description ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.base, ease: EASE, delay: 0.1 }}
            className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground"
          >
            {description}
          </motion.p>
        ) : null}
      </div>
      {children ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: DUR.base, ease: EASE, delay: 0.15 }}
          className="min-w-0"
        >
          {children}
        </motion.div>
      ) : null}
    </div>
  );
}

/**
 * TabSurface — mounts the tab's content grid with the same fade-and-rise
 * entrance, slightly delayed so the intro leads and the surface follows.
 */
export function TabSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE, delay: 0.08 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
