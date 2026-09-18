"use client";

// TrustScore AUTH batch (auth-6) — shared phone OTP step + mock delivery chip.
//
// MOCK posture is labeled honestly: OTP codes are "delivered" through this
// chip (the sandbox has no SMS transport). Production swaps in the real
// transport and the chip disappears. Raw phone numbers are NEVER shown —
// only the masked hint the API returns.

import * as React from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Loader2, MessageSquare, ArrowLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

/** A small honestly-labeled MOCK delivery chip: "MOCK SMS: 123456" (or email)
 *  with a copy button. Production removes it. */
export function MockCodeChip({
  label,
  code,
  className,
}: {
  label: string;
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard unavailable — the code is visible to copy manually */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-[11px] font-medium leading-tight text-amber-700 dark:text-amber-300">
        {label}:{" "}
        <span className="font-mono font-semibold tracking-[0.18em]">{code}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 shrink-0 gap-1 px-2 text-[11px] text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
        onClick={() => void copy()}
        aria-label={`Copy ${label} code`}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * The phone OTP step: masked number hint, MOCK SMS chip, 6-digit input
 * (auto-focused, numeric), Verify action, and a back link. Purely presentational —
 * the caller owns the session/network state.
 */
export function PhoneOtpStep({
  phoneHint,
  mockOtp,
  value,
  onValueChange,
  onVerify,
  onBack,
  backLabel = "Use a different number",
  busy = false,
  error,
  verifyLabel = "Verify",
  disabled = false,
}: {
  phoneHint: string;
  mockOtp: string | null;
  value: string;
  onValueChange: (otp: string) => void;
  onVerify: () => void;
  onBack: () => void;
  backLabel?: string;
  busy?: boolean;
  error?: string | null;
  verifyLabel?: string;
  disabled?: boolean;
}) {
  const complete = value.length === 6;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          Enter the 6-digit code sent to{" "}
          <span className="font-mono font-semibold">{phoneHint}</span>
        </p>
        <p className="text-xs leading-snug text-muted-foreground">
          Codes expire in 5 minutes. We store only a salted fingerprint of your
          number — never the number itself.
        </p>
      </div>

      {mockOtp && (
        <MockCodeChip label="MOCK SMS" code={mockOtp} />
      )}

      <div className="space-y-2">
        <label htmlFor="phone-otp" className="sr-only">
          6-digit verification code
        </label>
        <InputOTP
          id="phone-otp"
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          value={value}
          onChange={onValueChange}
          disabled={busy || disabled}
          autoFocus
          autoComplete="one-time-code"
          className="aria-invalid:border-destructive"
          aria-invalid={!!error}
          containerClassName="justify-between sm:justify-start"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <Button
        type="button"
        onClick={onVerify}
        disabled={busy || disabled || !complete}
        className="min-h-11 w-full"
        size="lg"
        data-testid="phone-otp-verify"
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying…
          </>
        ) : (
          verifyLabel
        )}
      </Button>

      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="flex min-h-11 items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {backLabel}
      </button>
    </div>
  );
}
