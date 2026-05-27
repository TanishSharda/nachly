"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface DeferredPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function GlobalDownloadButton() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const inStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(inStandaloneMode);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Only show on Explore page
  if (pathname !== "/learn/feed" || isStandalone) return null;

  const handleDownload = async () => {
    if (isStandalone) return;
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    window.location.href = "/download-app";
  };

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      className="fixed right-6 bottom-[100px] z-[70] rounded-full border border-gold/20 bg-obsidian-100/80 px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold text-gold backdrop-blur-md shadow-2xl transition-all duration-500 hover:bg-gold hover:text-obsidian hover:scale-105 active:scale-95 md:bottom-12"
    >
      Download App
    </button>
  );
}
