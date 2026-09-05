"use client";

import { readError, useTrustStore } from "@/lib/store";
import type { SessionUser } from "@/lib/types";

// Typed client for the Stage-1 auth contract (mirrors the future FastAPI /v1/* surface).

export async function apiRegister(input: {
  email: string;
  password: string;
  displayName: string;
  handle: string;
  acceptTerms: boolean;
}): Promise<SessionUser> {
  const { setPending, setError, setUser } = useTrustStore.getState();
  setPending(true);
  setError(null);
  try {
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const message = await readError(res);
      setError(message);
      throw new Error(message);
    }
    const body = await res.json();
    setUser(body.user);
    return body.user as SessionUser;
  } finally {
    setPending(false);
  }
}

export async function apiLogin(input: {
  email: string;
  password: string;
}): Promise<SessionUser> {
  const { setPending, setError, setUser } = useTrustStore.getState();
  setPending(true);
  setError(null);
  try {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const message = await readError(res);
      setError(message);
      throw new Error(message);
    }
    const body = await res.json();
    setUser(body.user);
    return body.user as SessionUser;
  } finally {
    setPending(false);
  }
}
