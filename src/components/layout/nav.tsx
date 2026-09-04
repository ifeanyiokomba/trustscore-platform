"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  LogOut,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTrustStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const LANDING_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#architecture", label: "Architecture" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "#security", label: "Security & Privacy" },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

// Proper top-level component (never created during render).
// `onNavigate` closes the parent mobile Sheet after any auth action.
function AuthActions({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { authLoading, user, setView, signOut, pending } = useTrustStore();

  if (authLoading) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="Loading session">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }
  if (user) {
    return (
      <div className={cn("flex items-center gap-2", compact && "w-full")}>
        <Button
          variant={compact ? "default" : "outline"}
          size={compact ? "default" : "sm"}
          className={compact ? "w-full" : ""}
          onClick={() => {
            onNavigate?.();
            setView("dashboard");
          }}
        >
          <LayoutDashboard className="mr-1.5 h-4 w-4" />
          Dashboard
        </Button>
        <Button
          variant="ghost"
          size={compact ? "default" : "sm"}
          className={compact ? "w-full" : ""}
          onClick={() => {
            onNavigate?.();
            void signOut();
          }}
          disabled={pending}
        >
          <LogOut className="mr-1.5 h-4 w-4" />
          Sign out
        </Button>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-2", compact && "w-full flex-col")}>
      <Button
        variant={compact ? "outline" : "ghost"}
        size={compact ? "default" : "sm"}
        className={compact ? "w-full" : ""}
        onClick={() => {
          onNavigate?.();
          setView("auth");
        }}
      >
        Sign in
      </Button>
      <Button
        size={compact ? "default" : "sm"}
        className={compact ? "w-full" : ""}
        onClick={() => {
          onNavigate?.();
          setView("auth");
        }}
      >
        Get started
      </Button>
    </div>
  );
}

export function Nav() {
  const { view } = useTrustStore();
  const [open, setOpen] = React.useState(false);

  const showLandingLinks = view === "landing";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="TrustScore home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight">TrustScore</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              NIN-First · Nigeria
            </span>
          </span>
        </Link>

        {showLandingLinks && (
          <ul className="hidden items-center gap-1 lg:flex">
            {LANDING_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-1.5">
          <span className="mr-1 hidden rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary md:inline-flex">
            Stage 4 · Trust Signals
          </span>
          <div className="hidden sm:block">
            <AuthActions />
          </div>
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-4">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-left">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  TrustScore
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Navigation menu — product sections and account actions
                </SheetDescription>
              </SheetHeader>
              {showLandingLinks && (
                <ul className="mt-4 space-y-1">
                  {LANDING_LINKS.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 border-t border-border pt-4">
                <div className="sm:hidden">
                  <AuthActions compact onNavigate={() => setOpen(false)} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
