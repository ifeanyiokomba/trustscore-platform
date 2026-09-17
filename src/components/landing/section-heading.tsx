"use client";

// TrustScore Stage 15 — shared landing section heading: eyebrow chip,
// display-serif headline, balanced wrapping, choreographed reveal.

import * as React from "react";
import { motion } from "framer-motion";
import { EASE, DUR } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  id,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  id?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left"
      )}
    >
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
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
        id={id}
        initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: DUR.base, ease: EASE, delay: 0.06 }}
        className="font-display mt-4 text-balance text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: DUR.base, ease: EASE, delay: 0.12 }}
          className="mt-4 text-pretty text-muted-foreground"
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}
