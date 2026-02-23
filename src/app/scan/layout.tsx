import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Stitcha | Body Measurement Scan",
  description:
    "Take your body measurement photos for your designer. Quick, easy, and accurate.",
};

export const viewport: Viewport = {
  themeColor: "#c75b39",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function ScanLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#FAFAF8]">
      {/* Background mesh gradient */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          backgroundImage: [
            "radial-gradient(at 15% 10%, rgba(199, 91, 57, 0.12) 0%, transparent 55%)",
            "radial-gradient(at 85% 85%, rgba(212, 168, 83, 0.10) 0%, transparent 55%)",
            "radial-gradient(at 50% 50%, rgba(245, 230, 211, 0.25) 0%, transparent 70%)",
          ].join(", "),
        }}
      />

      {/* Content container */}
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 safe-top safe-bottom">
        {/* Stitcha branding header */}
        <header className="flex items-center justify-center pb-2 pt-6">
          <div className="flex items-center gap-2.5">
            {/* Logo mark */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-md">
              <span className="text-base font-bold text-white tracking-tight">
                S
              </span>
            </div>
            {/* Brand name */}
            <span className="text-xl font-bold tracking-tight text-[#1A1A2E]">
              Stitcha
            </span>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex flex-1 flex-col py-4">
          {children}
        </main>

        {/* Footer */}
        <footer className="pb-6 pt-3 text-center">
          <p className="text-[11px] text-[#1A1A2E]/30">
            Powered by Stitcha — AI Body Measurement
          </p>
        </footer>
      </div>
    </div>
  );
}
