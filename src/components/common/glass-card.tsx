"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  gradientBorder?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
} as const;

export function GlassCard({
  children,
  hover = false,
  gradientBorder = false,
  padding = "md",
  className,
  ...props
}: GlassCardProps) {
  if (gradientBorder) {
    return (
      <div
        className={cn(
          "rounded-2xl bg-gradient-to-br from-[#C75B39]/30 via-[#D4A853]/20 to-[#C75B39]/10 p-[1px]",
          hover &&
            "transition-shadow duration-300 hover:shadow-[0_8px_40px_rgba(199,91,57,0.12)]"
        )}
      >
        <div
          className={cn(
            "rounded-[calc(1rem-1px)] bg-white/50 backdrop-blur-md",
            "shadow-[0_8px_32px_rgba(26,26,46,0.06)]",
            paddingMap[padding],
            hover &&
              "transition-all duration-300 hover:bg-white/60",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-white/40 backdrop-blur-md",
        "shadow-[0_8px_32px_rgba(26,26,46,0.06)]",
        paddingMap[padding],
        hover &&
          "transition-all duration-200 hover:border-white/30 hover:bg-white/55 hover:shadow-[0_12px_40px_rgba(26,26,46,0.1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
