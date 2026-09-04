import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as Sonner } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
          <Sonner />
        </ThemeProvider>
      </body>
    </html>
  );
}
