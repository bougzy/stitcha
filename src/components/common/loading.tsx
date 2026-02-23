"use client";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  FullPageLoader - centered full-screen with pulsing Stitcha logo           */
/* -------------------------------------------------------------------------- */

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAFAF8]">
      <div className="flex flex-col items-center gap-6">
        {/* Pulsing logo mark */}
        <div className="relative flex items-center justify-center">
          {/* Outer glow ring */}
          <div className="absolute h-20 w-20 animate-ping rounded-full bg-[#C75B39]/20" />
          {/* Logo container */}
          <div className="relative flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-lg">
            <span className="text-2xl font-bold text-white tracking-tight">S</span>
          </div>
        </div>
        {/* Brand name */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-xl font-semibold text-[#1A1A2E] tracking-tight">
            Stitcha
          </h1>
          <p className="text-sm text-[#1A1A2E]/50">Loading your workspace...</p>
        </div>
        {/* Loading bar */}
        <div className="h-1 w-48 overflow-hidden rounded-full bg-[#C75B39]/10">
          <div className="h-full w-1/2 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#C75B39]/0 via-[#C75B39] to-[#C75B39]/0" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SectionLoader - inline glass card with shimmer skeleton lines             */
/* -------------------------------------------------------------------------- */

interface SectionLoaderProps {
  lines?: number;
  className?: string;
}

export function SectionLoader({ lines = 3, className }: SectionLoaderProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-white/40 p-6 backdrop-blur-md",
        "shadow-[0_8px_32px_rgba(26,26,46,0.06)]",
        className
      )}
    >
      <div className="space-y-4">
        {/* Heading skeleton */}
        <div className="h-5 w-2/5 animate-pulse rounded-lg bg-[#1A1A2E]/8" />
        {/* Line skeletons */}
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div
              className="h-3.5 animate-pulse rounded-md bg-[#1A1A2E]/6"
              style={{
                width: `${85 - i * 12}%`,
                animationDelay: `${i * 150}ms`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SpinnerLoader - compact inline spinner                                    */
/* -------------------------------------------------------------------------- */

interface SpinnerLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const spinnerSizes = {
  sm: "h-4 w-4 border-[2px]",
  md: "h-6 w-6 border-[2.5px]",
  lg: "h-8 w-8 border-[3px]",
} as const;

export function SpinnerLoader({ size = "md", className }: SpinnerLoaderProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-[#C75B39]/25 border-t-[#C75B39]",
        spinnerSizes[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
