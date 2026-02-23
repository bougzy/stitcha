"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#FAFAF8] px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#C75B39]/10">
        <WifiOff className="h-10 w-10 text-[#C75B39]" />
      </div>

      <h1 className="mt-6 text-2xl font-bold text-[#1A1A2E]">
        You&apos;re Offline
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#1A1A2E]/55">
        It looks like you&apos;ve lost your internet connection. Some features
        may not be available until you reconnect.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="mt-8 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-[0.98]"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>

      <p className="mt-6 text-xs text-[#1A1A2E]/35">
        Your data is safely stored and will sync when you&apos;re back online.
      </p>
    </div>
  );
}
