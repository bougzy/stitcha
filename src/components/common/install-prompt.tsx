"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem("pwa-install-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm animate-slide-up lg:bottom-6 lg:left-auto lg:right-6">
      <div className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/80 p-4 shadow-[0_12px_40px_rgba(26,26,46,0.12)] backdrop-blur-xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39] to-[#D4A853]">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1A1A2E]">
            Install Stitcha
          </p>
          <p className="text-xs text-[#1A1A2E]/50">
            Add to home screen for faster access
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-4 py-2 text-xs font-semibold text-white shadow-md transition-all active:scale-95"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-[#1A1A2E]/40 hover:bg-[#1A1A2E]/5"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
