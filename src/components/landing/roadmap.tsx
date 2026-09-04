"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

type StageStatus = "done" | "active" | "planned";

const STAGES: { id: string; title: string; status: StageStatus; detail: string }[] = [
  {
    id: "0",
    title: "Discovery & audit",
    status: "done",
    detail: "Repository audited, NINAuth access model validated, gap analysis + blueprint produced.",
  },
  {
    id: "1",
    title: "Platform foundation",
    status: "done",
    detail: "Accounts, sessions, auth APIs, design system, audit logging — shipped and re-audited.",
  },
  {
    id: "2",
    title: "NINAuth identity",
    status: "active",
    detail: "Verification sessions, OAuth/PKCE, consent recording — live behind a contract-first MOCK provider adapter.",
  },
  {
    id: "3",
    title: "Trust Identity",
    status: "planned",
    detail: "Assurance levels, hashed identifiers, consent-scoped attributes, evidence provenance.",
  },
  {
    id: "4",
    title: "Phone + biometric",
    status: "planned",
    detail: "Independent signals that agree — assurance escalates.",
  },
  {
    id: "5",
    title: "Trust Passport",
    status: "planned",
    detail: "Profile, score, credentials, QR card, share tokens, verification history, receipts.",
  },
  {
    id: "6",
    title: "Safety Check",
    status: "planned",
    detail: "Check before you deal — QR / link / username, sanitized assessments.",
  },
  {
    id: "7",
    title: "Reputation",
    status: "planned",
    detail: "Flags, evidence, resolution, appeals — with human review.",
  },
  {
    id: "8",
    title: "Trust engine",
    status: "planned",
    detail: "Rules-first explainable scoring, score states, DPIA gate.",
  },
  {
    id: "9",
    title: "B2B platform",
    status: "planned",
    detail: "Developer portal, API keys, webhooks, Trust Decision API.",
  },
  {
    id: "10",
    title: "Trust network",
    status: "planned",
    detail: "Verified interactions network — the long-term moat.",
  },
];

function StatusIcon({ status }: { status: StageStatus }) {
  if (status === "done")
    return <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-label="Completed" />;
  if (status === "active")
    return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-label="In progress" />;
  return <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" aria-label="Planned" />;
}

export function Roadmap() {
  return (
    <section
      id="roadmap"
      className="border-y border-border/70 bg-muted/30"
      aria-labelledby="roadmap-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Roadmap
          </p>
          <h2 id="roadmap-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Built stage-by-stage, tested at every gate
          </h2>
          <p className="mt-4 text-muted-foreground">
            No big-bang launches. Each stage ships, gets tested end-to-end, is re-audited,
            and only then does the next one begin.
          </p>
        </div>

        <motion.ol {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto mt-12 max-w-3xl space-y-1">
          {STAGES.map((s) => (
            <li
              key={s.id}
              className="relative flex gap-4 rounded-xl px-4 py-4 transition-colors hover:bg-accent/50"
            >
              <StatusIcon status={s.status} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {s.id.padStart(2, "0")}
                    </span>
                    {s.title}
                  </p>
                  {s.status === "active" && (
                    <Badge className="text-[10px]">In progress — this release</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
              </div>
              {s.status === "planned" && (
                <Lock className="mt-1 hidden h-3.5 w-3.5 text-muted-foreground/40 sm:block" aria-hidden="true" />
              )}
            </li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
