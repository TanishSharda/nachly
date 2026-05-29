"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Avoid stale hydration in local dev by disabling SW on localhost/dev.
    if ("serviceWorker" in navigator) {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (process.env.NODE_ENV !== "production" || isLocal) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => {
            reg.unregister().catch(() => {});
          });
        });
      } else {
        navigator.serviceWorker
          .register("/sw.js", { updateViaCache: "none" })
          .then((reg) => reg.update().catch(() => {}))
          .catch(() => {});
      }
    }

    // Check if already dismissed
    const wasDismissed = localStorage.getItem("naachly-pwa-dismissed");
    if (wasDismissed) {
      setTimeout(() => setDismissed(true), 0);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 5 seconds
      setTimeout(() => setShowPrompt(true), 5000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("naachly-pwa-dismissed", "true");
  };

  if (dismissed || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 z-[9999] sm:left-auto sm:right-4 sm:max-w-sm"
      >
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-nred-500/20 rounded-xl flex items-center justify-center shrink-0">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                <Image src="/brand-logo.svg" alt="Nachly logo" fill sizes="32px" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-white text-sm">Install Nachly</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Add to home screen for the full app experience — faster, offline support, no browser bar.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-zinc-500 hover:text-white transition-colors shrink-0 p-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 py-2.5 bg-nred-500 hover:bg-nred-600 text-[#041225] text-sm font-semibold rounded-xl transition-all active:scale-95"
            >
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 bg-white/5 text-zinc-400 text-sm rounded-xl hover:bg-white/10 transition-all"
            >
              Later
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
