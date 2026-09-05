"use client";

// TrustScore Stage 9 — ApiDocsCard: the Trust Decision API contract, in the
// portal. Quickstart curl, request/response fields, error codes, webhook
// signature verification (Node snippet) — plus the honesty notes a business
// needs (consent-gated, band-level, not-a-decision).

import * as React from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronDown, Copy, Check, Terminal, Webhook, ShieldQuestion } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/60 px-2.5 py-1.5">
        <span className="font-mono text-[10px] font-semibold text-muted-foreground">{label}</span>
        <button
          type="button"
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              /* clipboard unavailable */
            }
          }}
        >
          {copied ? (
            <Check className="h-3 w-3 text-primary" aria-hidden="true" />
          ) : (
            <Copy className="h-3 w-3" aria-hidden="true" />
          )}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="ts-scrollbar overflow-x-auto bg-muted/30 px-3 py-2.5 font-mono text-[10.5px] leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

const FIELD_ROWS: { name: string; type: string; note: string }[] = [
  { name: "handle", type: "string?", note: "Subject's @handle — gated by their standing SAFETY_CHECK consent." },
  { name: "phone", type: "string?", note: "Nigerian mobile (E.164). Hashed server-side and discarded — never stored or echoed." },
  { name: "link", type: "string?", note: "Trust link (URL or raw ts_ token) — token scopes govern the assessment." },
  { name: "qr", type: "string?", note: "QR Trust Card payload (URL or raw token) — same token semantics." },
];

const RESPONSE_ROWS: { name: string; note: string }[] = [
  { name: "decision.outcome", note: "OK · UNAVAILABLE (no consented profile — uniform shape) · DEAD_LINK." },
  { name: "decision.assessment", note: "Band-level: headline, status, riskBand, freshness, explanation lines. NEVER a score number." },
  { name: "quota", note: "{ plan, limit, remaining } — enforced daily at UTC midnight." },
  { name: "note", note: "The §37 honesty line: an assessment, not a decision — human review stays with you." },
  { name: "environment / providerMode", note: "SANDBOX|LIVE posture + MOCK provider honesty." },
];

const ERROR_ROWS: { code: string; status: string; note: string }[] = [
  { code: "UNAUTHENTICATED", status: "401", note: "Missing/revoked key — uniform, never reveals whether a key exists." },
  { code: "INVALID_JSON", status: "400", note: "Body was not valid JSON." },
  { code: "VALIDATION_ERROR", status: "422", note: "Not exactly one of handle/phone/link/qr, or malformed input." },
  { code: "RATE_LIMITED", status: "429", note: "60 requests/min per key (and per-IP limits on failed auth)." },
  { code: "QUOTA_EXCEEDED", status: "429", note: "Daily plan quota exhausted (FREE 40/day, STARTER 500/day)." },
];

const CURL_SAMPLE = `curl -X POST http://localhost:3000/api/v1/trust/check \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: tsk_sandbox_<your key>" \\
  -d '{"handle": "ada_okoro"}'`;

const VERIFY_SAMPLE = `// Node — verify a TrustScore webhook delivery
const crypto = require("crypto");

app.post("/hooks/trustscore", (req, res) => {
  const sig = req.headers["x-trustscore-signature"]; // "t=1693...,v1=ab12..."
  const [tPart, v1Part] = sig.split(",");
  const t = tPart.slice(2);
  const expected = crypto
    .createHmac("sha256", process.env.TRUSTSCORE_WEBHOOK_SECRET)
    .update(t + "." + rawBody) // rawBody = exact bytes received
    .digest("hex");
  if (v1Part.slice(3) === expected) {
    // authentic — process the event, then return 2xx FAST
    res.json({ ok: true });
  } else {
    res.status(400).end();
  }
});`;

const WEBHOOK_SAMPLE = `{
  "id": "evt_…",
  "event": "TRUST_CHECK_COMPLETED",
  "created": "2026-09-05T08:00:00.000Z",
  "data": {
    "requestId": "…",
    "outcome": "OK",
    "method": "HANDLE",
    "subject": "@ada_okoro",
    "assessment": { "headline": "…", "status": "ESTABLISHED", "riskBand": "LOW" },
    "note": "This endpoint returns an assessment, not a decision…"
  }
}`;

export function ApiDocsCard() {
  const [open, setOpen] = React.useState(false);
  return (
    <Card className="ts-card-hover min-w-0">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpen className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Trust Decision API</CardTitle>
          <CardDescription className="truncate">
            POST /api/v1/trust/check · quickstart &amp; contract
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="ts-inset rounded-lg px-3.5 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold">
              <Terminal className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Quickstart
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Mint a key, then check a counterparty before dealing with them — one
              field per call. Every response carries the freshness of the underlying
              snapshot (24h horizon).
            </p>
            <div className="mt-2.5">
              <CodeBlock code={CURL_SAMPLE} label="check-by-handle.sh" />
            </div>
            <CollapsibleTrigger className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                aria-hidden="true"
              />
              {open ? "Hide the full contract" : "Full request/response contract"}
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 space-y-3.5"
            >
              <div>
                <p className="text-[11px] font-semibold">Request — exactly one input field</p>
                <dl className="mt-1.5 space-y-1">
                  {FIELD_ROWS.map((f) => (
                    <div key={f.name} className="rounded-lg border border-border px-2.5 py-1.5">
                      <dt className="flex items-baseline gap-2">
                        <code className="font-mono text-[10px] font-bold text-primary">{f.name}</code>
                        <span className="font-mono text-[9px] text-muted-foreground">{f.type}</span>
                      </dt>
                      <dd className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{f.note}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <p className="text-[11px] font-semibold">Response (200)</p>
                <dl className="mt-1.5 space-y-1">
                  {RESPONSE_ROWS.map((f) => (
                    <div key={f.name} className="rounded-lg border border-border px-2.5 py-1.5">
                      <dt className="font-mono text-[10px] font-bold text-primary">{f.name}</dt>
                      <dd className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{f.note}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <p className="text-[11px] font-semibold">Errors</p>
                <dl className="mt-1.5 space-y-1">
                  {ERROR_ROWS.map((f) => (
                    <div key={f.code} className="flex items-baseline gap-2 rounded-lg border border-border px-2.5 py-1.5">
                      <dt className="flex items-baseline gap-2">
                        <code className="font-mono text-[10px] font-bold text-destructive">{f.code}</code>
                        <span className="font-mono text-[9px] font-semibold text-muted-foreground">{f.status}</span>
                      </dt>
                      <dd className="text-[10.5px] leading-snug text-muted-foreground">{f.note}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <Webhook className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Webhook payload — TRUST_CHECK_COMPLETED
                </p>
                <div className="mt-1.5">
                  <CodeBlock code={WEBHOOK_SAMPLE} label="delivery body" />
                </div>
                <div className="mt-2">
                  <CodeBlock code={VERIFY_SAMPLE} label="verify-signature.js" />
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                  Signatures are timestamped HMAC-SHA256 over the raw body:{" "}
                  <code className="font-mono">v1 = HMAC(secret, `${"t"}.${"rawBody"}`)</code>.
                  Failed deliveries retry at +1m, +5m, +25m, +2h, then stop (honest terminal).
                </p>
              </div>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
        <p className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-[10px] leading-relaxed">
          <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>Consent-gated:</strong> subjects opt in via safety-check settings and
            can opt out at any time — an opted-out subject returns the same uniform
            &quot;no profile available&quot; as an unknown one. Responses never include a score
            number and never say &quot;safe&quot;: the locked language is{" "}
            <em>&quot;No confirmed adverse signals found&quot;</em> plus the not-a-guarantee disclaimer.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
