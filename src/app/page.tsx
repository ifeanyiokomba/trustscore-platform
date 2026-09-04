"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { Product } from "@/components/landing/product";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Architecture } from "@/components/landing/architecture";
import { Roadmap } from "@/components/landing/roadmap";
import { Security } from "@/components/landing/security";
import { AuthView } from "@/components/auth/auth-view";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { useTrustStore } from "@/lib/store";

function LandingView() {
  return (
    <main id="main">
      <Hero />
      <Product />
      <HowItWorks />
      <Architecture />
      <Roadmap />
      <Security />
    </main>
  );
}

export default function Home() {
  const { view, refreshMe } = useTrustStore();

  React.useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

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
