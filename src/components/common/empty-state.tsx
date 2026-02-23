"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        "rounded-2xl border border-white/20 bg-white/40 backdrop-blur-md",
        "shadow-[0_8px_32px_rgba(26,26,46,0.06)]",
        className
      )}
    >
      {/* Icon container */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
        <Icon className="h-8 w-8 text-[#C75B39]/70" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-[#1A1A2E]">{title}</h3>

      {/* Description */}
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-[#1A1A2E]/55">
        {description}
      </p>

      {/* Optional action */}
      {action && <div>{action}</div>}
    </div>
  );
}
