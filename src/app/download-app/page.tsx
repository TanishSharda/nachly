"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DeferredPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function DownloadAppPage() {
  const router = useRouter();
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

  useEffect(() => {
    if (isStandalone) {
      router.replace("/auth");
    }
  }, [isStandalone, router]);

  const handleDownload = async () => {
    if (isStandalone) return;
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl border border-nred-500/30 bg-black/40 p-6 text-center backdrop-blur-sm sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-nred-200/75">Nachly</p>
        <h1 className="mt-3 text-3xl font-black text-white">Nachly works best on mobile</h1>
        <p className="mt-3 text-sm text-zinc-300">
          Open the app for the smoothest training, camera capture, and recording experience.
        </p>

        <div className="mt-7">
          <button
            type="button"
            onClick={() => void handleDownload()}
            className="tap-feedback inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-nred-500 to-lime-500 px-4 py-3 text-sm font-semibold text-[#041225] transition hover:brightness-105"
          >
            {isStandalone ? "App Installed" : "Download App"}
          </button>
          {!deferredPrompt && !isStandalone ? (
            <p className="mt-3 text-xs text-zinc-400">
              If no install prompt appears, use your browser menu and tap &quot;Add to Home Screen&quot;.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
