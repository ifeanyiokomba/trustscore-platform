"use client";

// TrustScore Stage 4 — Biometric liveness modal (Smile-ID-class contract,
// MOCK transport). The capture is simulated in-sandbox (honestly labeled):
// a face-framing "camera" view with a scan sweep, then the provider verdict
// (liveness score + face match vs the government record) with score meters.

import * as React from "react";
import {
  ScanFace,
  Loader2,
  CheckCircle2,
  XCircle,
  Fingerprint,
  ShieldCheck,
  RefreshCw,
  Camera,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  LivenessStartResponse,
  LivenessCompleteResponse,
  ApiErrorBody,
} from "@/lib/types";

interface LivenessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

function ScoreMeter({ label, value, threshold }: { label: string; value: number; threshold: number }) {
  const ok = value >= threshold;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-mono font-semibold", ok ? "text-primary" : "text-destructive")}>
          {value}
          <span className="text-muted-foreground"> /100</span>
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} score ${value} of 100, pass threshold ${threshold}`}
      >
        <div
          className={cn(
            "ts-conf-fill h-full rounded-full",
            ok ? "bg-gradient-to-r from-primary/70 to-primary" : "bg-gradient-to-r from-amber-500/70 to-amber-500"
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">Pass threshold: {threshold}</p>
    </div>
  );
}

export function LivenessModal({ open, onOpenChange, onCompleted }: LivenessModalProps) {
  const [phase, setPhase] = React.useState<"intro" | "scanning" | "processing" | "result">("intro");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [startData, setStartData] = React.useState<LivenessStartResponse | null>(null);
  const [result, setResult] = React.useState<LivenessCompleteResponse | null>(null);
  const [scanProgress, setScanProgress] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setPhase("intro");
      setBusy(false);
      setError(null);
      setStartData(null);
      setResult(null);
      setScanProgress(0);
    }
  }, [open]);

  // scan sweep animation driver
  React.useEffect(() => {
    if (phase !== "scanning") return;
    const t = setInterval(() => setScanProgress((p) => Math.min(100, p + 4)), 90);
    return () => clearInterval(t);
  }, [phase]);

  const submitCaptureRef = React.useRef<() => Promise<void>>(async () => {});

  async function submitCapture() {
    if (!startData) return;
    const res = await fetch("/api/v1/identity/signals/biometrics/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: startData.session.id }),
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const err = data as ApiErrorBody | null;
      setError(err?.error?.message ?? "The liveness check could not be completed.");
      setPhase("result");
      return;
    }
    const body = data as LivenessCompleteResponse;
    setResult(body);
    setPhase("result");
    if (body.verdict.passed) {
      toast.success(
        body.assuranceLevel >= 4
          ? "Liveness passed — all signals agree (Level 4)"
          : `Liveness passed — Assurance Level ${body.assuranceLevel}`,
        { description: "Matched against your government record. No biometric data stored." }
      );
    } else {
      toast.error("Liveness check not passed", {
        description: "No biometric signal was added. You can retry.",
      });
    }
    onCompleted();
  }

  // keep the latest submitCapture reachable from the scan-completion effect
  React.useEffect(() => {
    submitCaptureRef.current = submitCapture;
  });

  React.useEffect(() => {
    if (phase === "scanning" && scanProgress >= 100) {
      setPhase("processing");
      void submitCaptureRef.current();
    }
  }, [scanProgress, phase]);

  async function handleStart() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/v1/identity/signals/biometrics/start", { method: "POST" });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    setBusy(false);
    if (!res.ok) {
      const err = data as ApiErrorBody | null;
      setError(err?.error?.message ?? "Could not start the liveness check.");
      return;
    }
    setStartData(data as LivenessStartResponse);
    setScanProgress(0);
    setPhase("scanning");
  }

  function handleRetry() {
    setPhase("intro");
    setError(null);
    setResult(null);
    setStartData(null);
    setScanProgress(0);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy && phase !== "scanning" && phase !== "processing") onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                phase === "result" && result?.verdict.passed
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary"
              )}
              aria-hidden="true"
            >
              <ScanFace className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base">Biometric liveness check</DialogTitle>
              <DialogDescription className="mt-0.5">
                {phase === "intro" && "Selfie liveness matched to your government record — Level 3"}
                {phase === "scanning" && "Hold still — capturing…"}
                {phase === "processing" && "Evaluating liveness + face match…"}
                {phase === "result" && "Provider verdict"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" role="alert">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Check failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {phase === "intro" && (
          <div className="space-y-4">
            {/* simulated camera preview */}
            <div className="relative mx-auto flex h-52 w-40 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-b from-muted/60 to-background" aria-hidden="true">
              <span className="absolute inset-x-4 top-4 h-1.5 rounded-full border border-primary/50 border-b-0" />
              <span className="absolute inset-x-4 bottom-4 h-1.5 rounded-full border border-primary/50 border-t-0" />
              <span className="absolute left-4 top-4 h-10 w-1.5 rounded-full border border-primary/50 border-r-0" />
              <span className="absolute right-4 top-4 h-10 w-1.5 rounded-full border border-primary/50 border-l-0" />
              <ScanFace className="h-16 w-16 text-primary/40" />
              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                <Camera className="h-3 w-3" /> simulated
              </span>
            </div>

            <ul className="space-y-1.5">
              {(startData?.session.instructions ?? [
                "Hold the phone at eye level in good, even lighting",
                "Center your face in the frame and hold still",
                "Remove glasses, hats or masks that obscure your face",
                "The check takes a few seconds — keep the frame until it completes",
              ]).map((line) => (
                <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  We store only the <span className="font-medium text-foreground">verdict</span> — liveness score
                  and face-match result. No selfie pixels or biometric templates are ever stored.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your face is compared against the record anchored by your NINAuth verification. You can withdraw
                  this consent anytime.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                {startData?.session.provider ?? "LIVENESS_MOCK"} · {startData?.session.providerMode ?? "MOCK"}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                Simulated capture — no camera is used in sandbox
              </span>
            </div>

            <Button className="w-full" onClick={handleStart} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              Start liveness check
            </Button>
          </div>
        )}

        {phase === "scanning" && (
          <div className="space-y-4" aria-live="polite">
            <div className="relative mx-auto flex h-52 w-40 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary/60 bg-gradient-to-b from-primary/10 to-background">
              <span className="absolute inset-x-4 top-4 h-1.5 rounded-full border border-primary/70 border-b-0" />
              <span className="absolute inset-x-4 bottom-4 h-1.5 rounded-full border border-primary/70 border-t-0" />
              <span className="absolute left-4 top-4 h-10 w-1.5 rounded-full border border-primary/70 border-r-0" />
              <span className="absolute right-4 top-4 h-10 w-1.5 rounded-full border border-primary/70 border-l-0" />
              <ScanFace className="h-16 w-16 text-primary/60" />
              {/* scan sweep */}
              <span className="ts-scanline" style={{ top: `${scanProgress}%` }} />
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-2.5 py-0.5 text-[10px] font-medium text-primary shadow-sm">
                {scanProgress < 40 ? "Positioning…" : scanProgress < 80 ? "Hold still…" : "Almost done…"}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-[width] duration-100"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Simulated capture (MOCK provider) — in LIVE mode the partner SDK captures on-device.
            </p>
          </div>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center gap-3 py-10" role="status">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Evaluating capture…</p>
            <p className="text-xs text-muted-foreground">Liveness + face-match against the government record</p>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-4">
            {result.verdict.passed ? (
              <div className="ts-signal-success rounded-xl border border-primary/30 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold">
                  Liveness passed — Assurance Level {result.assuranceLevel}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Consistent with your government record · valid 90 days · verdict-only storage
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-center">
                <XCircle className="mx-auto h-8 w-8 text-amber-500" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  Not passed — no biometric signal added
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.verdict.reason === "face_match_below_threshold"
                    ? "The selfie did not match your government record. Retry with even lighting, no glasses."
                    : "The liveness (anti-spoofing) check did not pass. Retry in a well-lit space."}
                </p>
              </div>
            )}

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <ScoreMeter label="Liveness (anti-spoofing)" value={result.verdict.livenessScore} threshold={70} />
              <ScoreMeter label="Face match vs government record" value={result.verdict.faceMatchScore} threshold={80} />
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                {startData?.session.provider ?? "LIVENESS_MOCK"} · MOCK
              </Badge>
              <span>Provider verdict contract — deterministic scores in sandbox</span>
            </div>

            <div className="flex gap-2">
              {!result.verdict.passed && (
                <Button variant="outline" className="flex-1" onClick={handleRetry}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Retry
                </Button>
              )}
              <Button className="flex-1" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
