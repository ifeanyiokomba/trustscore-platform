import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ConsoleGuard } from "@/components/layout/console-guard";
import { MotionConfig } from "framer-motion";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Stage 15 — the display voice: Fraunces, a warm authoritative serif with
// optical sizing. Headlines carry institutional gravitas; Geist keeps the
// UI and data surfaces crisp and modern.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrustScore — Verify before you deal",
  description:
    "TrustScore turns government-verified identity (NINAuth) into reusable trust: Trust Passport, Check Before You Deal, and the Trust Decision API. Nigeria-first.",
  keywords: [
    "TrustScore",
    "NINAuth",
    "NIN",
    "trust",
    "identity verification",
    "Nigeria",
    "Trust Passport",
    "safety check",
  ],
  authors: [{ name: "TrustScore" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "TrustScore — Verify before you deal",
    description:
      "Government-verified identity becomes reusable trust. Trust Passport, Safety Check, Trust Decision API.",
    siteName: "TrustScore",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d9f6e" },
    { media: "(prefers-color-scheme: dark)", color: "#052e22" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {/* Stage 15 — the product-wide motion contract: users who prefer
              reduced motion get instant, transform-free transitions. */}
          <MotionConfig reducedMotion="user">
            <ConsoleGuard />
            {children}
            <Toaster />
            <Sonner />
          </MotionConfig>
        </ThemeProvider>
      </body>
    </html>
  );
}
