"use client";

// TrustScore Stage 15 — Design Elevation.
// The shared motion design language: one easing curve, one spring, one set
// of reveal variants. Every animated surface in the product pulls from here
// so the whole page moves with a single, coherent choreography.

import * as React from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from "framer-motion";

/** Signature easing — easeOutQuint. Fast start, long silky settle. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Signature spring — used for hover lifts and playful micro-interactions. */
export const SPRING = { type: "spring", stiffness: 320, damping: 28 } as const;

/** Durations (seconds) — keep everything under 0.6s; trust builds fast. */
export const DUR = { fast: 0.3, base: 0.45, slow: 0.6 } as const;

/** Stagger gap between siblings in a choreographed group. */
export const STAGGER = 0.07;

/** Fade + rise — the default reveal for blocks of content. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE },
  },
};

/** Pure fade — for elements where movement would distract (data surfaces). */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base, ease: EASE } },
};

/** Soft scale-in — for hero artifacts and dialog-like moments. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DUR.slow, ease: EASE },
  },
};

/** Blur-in — a premium entrance for display headlines. */
export const riseBlur: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE },
  },
};

/** Parent orchestrator — stagger its `motion.*` children. */
export function staggerParent(delay = 0, stagger = STAGGER): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
}

const VIEWPORT_ONCE = { once: true, margin: "-80px" } as const;

/**
 * Reveal — the standard scroll-into-view wrapper. Respects
 * prefers-reduced-motion globally via <MotionConfig> in the root layout,
 * and falls back to no transform when JS reports reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT_ONCE}
      variants={fadeUp}
      transition={{ delay }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/**
 * AnimatedNumber — counts up to `value` when it scrolls into view.
 * Renders plain text when reduced motion is preferred. Uses tabular
 * numerals so the digits never jitter while settling.
 */
export function AnimatedNumber({
  value,
  duration = 1.4,
  delay = 0,
  prefix = "",
  suffix = "",
  format,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(() =>
    (format ?? String)(reduced ? value : 0)
  );

  React.useEffect(() => {
    if (reduced || !inView) return;
    const controls = animate(0, value, {
      duration,
      delay,
      ease: EASE,
      onUpdate: (v) => setDisplay((format ?? String)(Math.round(v))),
    });
    return () => controls.stop();
  }, [inView, reduced, value, duration, delay, format]);

  // Once reduced-motion users land, show the final value immediately.
  React.useEffect(() => {
    if (reduced) setDisplay((format ?? String)(value));
  }, [reduced, value, format]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/**
 * useScrolled — tiny scroll sentinel for the floating nav elevation.
 * (No re-render storm: flips a boolean at most twice per crossing.)
 */
export function useScrolled(threshold = 12): boolean {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/** A motion value helper for gentle continuous float (hero artifacts). */
export function useFloatState(): boolean {
  const reduced = useReducedMotion();
  return !reduced;
}
