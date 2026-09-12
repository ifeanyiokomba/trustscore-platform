"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { Product } from "@/components/landing/product";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PolicyExplainer } from "@/components/landing/policy-explainer";
import { Architecture } from "@/components/landing/architecture";
import { Roadmap } from "@/components/landing/roadmap";
import { Security } from "@/components/landing/security";
import { AuthView } from "@/components/auth/auth-view";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { TrustViewer } from "@/components/public/trust-viewer";
import { useTrustStore } from "@/lib/store";

function LandingView() {
  return (
    <main id="main">
      <Hero />
      <Product />
      <HowItWorks />
      <PolicyExplainer />
      <Architecture />
      <Roadmap />
      <Security />
    </main>
  );
}

// Read the location once (SSR-safe via useSyncExternalStore). The trust
// token is an opaque random value — never a NIN/identifier.
const subscribeNoop = () => () => {};

export default function Home() {
  const { view, refreshMe } = useTrustStore();
  const search = React.useSyncExternalStore(
    subscribeNoop,
    () => window.location.search,
    () => ""
  );
  const trustToken = React.useMemo(() => {
    const t = new URLSearchParams(search).get("trust");
    return t && /^ts_[A-Za-z0-9_-]{10,80}$/.test(t) ? t : null;
  }, [search]);

  React.useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  // Public Trust Link view — anonymous, standalone (no auth surface).
  if (trustToken) {
    return (
      <div className="flex min-h-screen flex-col">
        <TrustViewer token={trustToken} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <div className="flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          {view === "auth" ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col"
            >
              <main id="main">
                <AuthView />
              </main>
            </motion.div>
          ) : view === "dashboard" ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col"
            >
              <main id="main">
                <DashboardView />
              </main>
            </motion.div>
          ) : (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col"
            >
              <LandingView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
