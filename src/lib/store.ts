"use client";

import { create } from "zustand";
import type { SessionUser } from "@/lib/types";

export type AppView = "landing" | "auth" | "dashboard";

interface AuthState {
  view: AppView;
  user: SessionUser | null;
  authLoading: boolean; // true while resolving the initial session
  pending: boolean; // true during auth mutations
  error: string | null;
  setView: (v: AppView) => void;
  setUser: (u: SessionUser | null) => void;
  setPending: (p: boolean) => void;
  setError: (e: string | null) => void;
  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error?.message) return body.error.message;
  } catch {
    /* fall through */
  }
  return "Something went wrong. Please try again.";
}

export const useTrustStore = create<AuthState>((set, get) => ({
  view: "landing",
  user: null,
  authLoading: true,
  pending: false,
  error: null,

  setView: (v) => set({ view: v, error: null }),
  setUser: (user) =>
    set({ user, view: user ? "dashboard" : "landing", authLoading: false }),
  setPending: (pending) => set({ pending }),
  setError: (error) => set({ error }),

  refreshMe: async () => {
    try {
      const res = await fetch("/api/v1/auth/me", { cache: "no-store" });
      if (res.ok) {
        const body = await res.json();
        set({ user: body.user, view: "dashboard", authLoading: false });
      } else {
        set({ user: null, authLoading: false });
      }
    } catch {
      set({ user: null, authLoading: false });
    }
  },

  signOut: async () => {
    set({ pending: true });
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      /* best-effort */
    }
    set({ user: null, view: "landing", pending: false, error: null });
  },
}));

export { readError };
