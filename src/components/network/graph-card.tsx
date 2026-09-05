"use client";

// TrustScore Stage 10 — GraphCard: the TrustGraph, an SVG radial
// visualization of your mutual verified interactions. You sit at the center;
// ACTIVE partners orbit as nodes (sized by assurance level, amber when their
// membership paused — the edge stops counting), PENDING invitations appear
// as dashed outline nodes. Edges animate a slow dash-flow; selecting a node
// reveals the attestation detail (level, since, revoke). An sr-only list
// mirrors the graph for screen readers.

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Network, ShieldCheck, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { NetworkGraphNode, NetworkMe } from "@/lib/types";

const W = 420;
const H = 320;
const CX = W / 2;
const CY = H / 2;
const RX = 148;
const RY = 108;

function levelLabel(level: number): string {
  return `L${level}`;
}

function nodeRadius(level: number): number {
  return 15 + Math.min(3, Math.max(0, level - 1)) * 4;
}

// Trim a center→partner segment so the edge stops at each node's border
// (the line never pierces the node fill).
function trimEdge(
  x1: number, y1: number, x2: number, y2: number, r1: number, r2: number
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: x1 + ux * (r1 + 2),
    y1: y1 + uy * (r1 + 2),
    x2: x2 - ux * (r2 + 2),
    y2: y2 - uy * (r2 + 2),
  };
}

export function GraphCard({ me, onChanged }: { me: NetworkMe; onChanged: () => Promise<void> }) {
  const { toast } = useToast();
  const [selected, setSelected] = React.useState<NetworkGraphNode | null>(null);
  const [pending, setPending] = React.useState(false);

  const nodes = me.graph.nodes.slice(0, 14);
  const incoming = me.interactions.incoming.slice(0, 6);
  const joined = me.membership.joined;

  // Positions: even spacing around the ellipse.
  const positions = React.useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const total = nodes.length + incoming.length;
    nodes.forEach((n, i) => {
      const a = (i / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
      map.set(n.userId, { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) });
    });
    incoming.forEach((r, i) => {
      const a = ((nodes.length + i) / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
      map.set(`req:${r.id}`, { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) });
    });
    return map;
  }, [nodes, incoming]);

  async function revokeEdge(node: NetworkGraphNode) {
    const edge = me.graph.edges.find((e) => e.to === node.userId);
    if (!edge) return;
    setPending(true);
    try {
      const res = await fetch(`/api/v1/network/interactions/${edge.id}/revoke`, { method: "POST" });
      const body = (await res.json()) as { note?: string; error?: { message?: string } };
      if (res.ok) {
        toast({ title: "Interaction revoked", description: body.note });
        setSelected(null);
        await onChanged();
      } else {
        toast({ title: "Could not revoke", description: body.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="ts-card-hover min-w-0" data-testid="trust-graph-card">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          <Network className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Your TrustGraph</CardTitle>
          <CardDescription className="truncate">
            {me.standing.degree > 0
              ? `${me.standing.degree} verified interaction${me.standing.degree === 1 ? "" : "s"} · ${me.standing.countingPartners} counting toward your score`
              : "Mutual verified interactions — your reputation network"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!joined ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <UserRound className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">Join the network to build your graph</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              The TrustGraph is opt-in. Once you join, attestations you and your counterparties accept appear
              here — and can count toward Verified Reputation (never a negative signal).
            </p>
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-auto w-full max-w-lg select-none"
              role="img"
              aria-label={`Trust graph: you, ${nodes.length} verified interaction partners, ${incoming.length} pending invitation${incoming.length === 1 ? "" : "s"}`}
            >
              <defs>
                <radialGradient id="ts-net-core" cx="50%" cy="42%" r="65%">
                  <stop offset="0%" stopColor="var(--ts-net-core-hi, #10b981)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--ts-net-core-hi, #10b981)" stopOpacity="0" />
                </radialGradient>
                <filter id="ts-net-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* orbit guide */}
              <ellipse
                cx={CX}
                cy={CY}
                rx={RX}
                ry={RY}
                fill="none"
                stroke="currentColor"
                className="text-muted-foreground/40"
                strokeWidth="1"
                strokeDasharray="3 6"
              />

              {/* edges to ACTIVE partners (drawn first, trimmed at node borders) */}
              {nodes.map((n) => {
                const p = positions.get(n.userId);
                if (!p) return null;
                const counting = n.membership === "ACTIVE" && n.level >= 2;
                const t = trimEdge(CX, CY, p.x, p.y, 30, nodeRadius(n.level));
                return (
                  <line
                    key={`e-${n.userId}`}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke="currentColor"
                    className={counting ? "text-primary/60" : "text-amber-500/50"}
                    strokeWidth={counting ? 2 : 1.5}
                    strokeDasharray={counting ? "none" : "5 5"}
                  >
                    {counting ? (
                      <animate
                        attributeName="stroke-dasharray"
                        values="0 200; 6 200; 0 200"
                        dur="6s"
                        repeatCount="indefinite"
                      />
                    ) : null}
                  </line>
                );
              })}

              {/* dashed edges to pending invitations (trimmed at node borders) */}
              {incoming.map((r) => {
                const p = positions.get(`req:${r.id}`);
                if (!p) return null;
                const t = trimEdge(CX, CY, p.x, p.y, 30, 14);
                return (
                  <line
                    key={`er-${r.id}`}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke="currentColor"
                    className="text-muted-foreground/40"
                    strokeWidth="1.5"
                    strokeDasharray="2 7"
                  />
                );
              })}

              {/* center node: you */}
              <g>
                <circle cx={CX} cy={CY} r="64" fill="url(#ts-net-core)" />
                <circle
                  cx={CX}
                  cy={CY}
                  r="30"
                  className="fill-primary text-primary"
                  stroke="currentColor"
                  strokeWidth="2"
                  filter="url(#ts-net-glow)"
                />
                <text
                  x={CX}
                  y={CY + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-primary-foreground text-[11px] font-bold"
                >
                  YOU
                </text>
              </g>

              {/* partner nodes */}
              {nodes.map((n) => {
                const p = positions.get(n.userId);
                if (!p) return null;
                const counting = n.membership === "ACTIVE" && n.level >= 2;
                const r = nodeRadius(n.level);
                const isSel = selected?.userId === n.userId;
                return (
                  <g
                    key={n.userId}
                    transform={`translate(${p.x} ${p.y})`}
                    className="cursor-pointer"
                    onClick={() => setSelected(isSel ? null : n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(isSel ? null : n);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Partner ${n.displayName} (@${n.handle}), ${levelLabel(n.level)}, membership ${n.membership}`}
                  >
                    <circle
                      r={r + 4}
                      fill="transparent"
                      stroke={isSel ? "currentColor" : "transparent"}
                      className={isSel ? "text-primary" : ""}
                      strokeWidth="2"
                    />
                    <circle
                      r={r}
                      className={
                        counting
                          ? "fill-primary/15 stroke-primary"
                          : "fill-amber-500/10 stroke-amber-500"
                      }
                      strokeWidth="2"
                      strokeDasharray={counting ? "none" : "4 4"}
                    />
                    <text
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground text-[10px] font-semibold"
                    >
                      {levelLabel(n.level)}
                    </text>
                    <text
                      y={r + 13}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[8.5px] font-medium"
                    >
                      @{n.handle.length > 12 ? `${n.handle.slice(0, 11)}…` : n.handle}
                    </text>
                  </g>
                );
              })}

              {/* pending invitation nodes */}
              {incoming.map((r) => {
                const p = positions.get(`req:${r.id}`);
                if (!p) return null;
                return (
                  <g key={`r-${r.id}`} transform={`translate(${p.x} ${p.y})`}>
                    <circle
                      r="14"
                      className="fill-muted/40 stroke-muted-foreground/50"
                      strokeWidth="1.5"
                      strokeDasharray="3 4"
                    />
                    <text
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground text-[10px] font-bold"
                    >
                      ?
                    </text>
                    <text
                      y="26"
                      textAnchor="middle"
                      className="fill-muted-foreground text-[8.5px] font-medium"
                    >
                      invite
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-5 rounded bg-primary/70" aria-hidden="true" />
                counting edge
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-5 rounded border-t border-dashed border-amber-500/70" aria-hidden="true" />
                not counting (paused or under L2+)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-5 rounded border-t border-dotted border-muted-foreground" aria-hidden="true" />
                pending invitation
              </span>
            </div>

            {/* selected partner detail */}
            <AnimatePresence initial={false}>
              {selected ? (
                <motion.div
                  key={selected.userId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-primary/25 bg-primary/5 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{selected.displayName}</p>
                      <p className="font-mono text-xs text-primary">@{selected.handle}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                        selected.membership === "ACTIVE" && selected.level >= 2
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-500/10 text-amber-600"
                      )}
                    >
                      {selected.membership === "ACTIVE" ? levelLabel(selected.level) : "PAUSED"}
                    </span>
                  </div>
                  <div className="mt-2.5 grid gap-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      Attested since{" "}
                      {new Date(selected.since).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {selected.membership === "ACTIVE" && selected.level >= 2
                        ? " — counting toward Verified Reputation"
                        : " — not counting (partner paused or below L2+)"}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void revokeEdge(selected)}
                      disabled={pending}
                    >
                      {pending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <X className="mr-2 h-3.5 w-3.5" />}
                      Revoke attestation
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* screen-reader mirror of the graph */}
            <ul className="sr-only">
              {nodes.map((n) => (
                <li key={`sr-${n.userId}`}>
                  Verified interaction with {n.displayName} (@{n.handle}), assurance
                  {" "}{levelLabel(n.level)}, membership {n.membership}, since{" "}
                  {new Date(n.since).toLocaleDateString("en-NG")}.
                </li>
              ))}
              {incoming.map((r) => (
                <li key={`sr-r-${r.id}`}>
                  Pending invitation from {r.from ? `${r.from.displayName} (@${r.from.handle})` : "a member"}.
                </li>
              ))}
              {nodes.length === 0 && incoming.length === 0 ? (
                <li>No verified interactions or invitations yet.</li>
              ) : null}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
