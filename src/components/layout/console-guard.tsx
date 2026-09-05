"use client";

// TrustScore — console guard: captures uncaught errors and console.error
// calls into window.__consoleErrors so browser E2E scripts can assert a
// clean console. Installed once in the root layout.

import * as React from "react";

export function ConsoleGuard() {
  React.useEffect(() => {
    const w = window as unknown as { __consoleErrors?: string[] };
    if (!w.__consoleErrors) w.__consoleErrors = [];
    const originalError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      try {
        w.__consoleErrors!.push(args.map((a) => String(a)).join(" ").slice(0, 300));
      } catch {
        // never let the guard itself throw
      }
      originalError(...args);
    };
    const onError = (e: ErrorEvent) => {
      try {
        w.__consoleErrors!.push(`uncaught: ${e.message}`.slice(0, 300));
      } catch {
        // ignore
      }
    };
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("error", onError);
      console.error = originalError;
    };
  }, []);
  return null;
}
