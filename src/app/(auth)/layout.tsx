import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#FAFAF8] px-4 py-12">
      {/* Background mesh gradient */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#C75B39]/[0.06] blur-[120px]" />
        <div className="absolute top-1/3 -left-24 h-[400px] w-[400px] rounded-full bg-[#D4A853]/[0.05] blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[350px] w-[350px] rounded-full bg-[#F5E6D3]/[0.08] blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-lg">
              <span className="text-base font-bold text-white">S</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#1A1A2E]">
              Stitcha
            </span>
          </Link>
        </div>

        {/* Glass card wrapper */}
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(26,26,46,0.08)] backdrop-blur-xl">
          {children}
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-[#1A1A2E]/40 transition-colors hover:text-[#C75B39]"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
