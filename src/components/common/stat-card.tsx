"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  className,
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-white/40 p-5 backdrop-blur-md",
        "shadow-[0_8px_32px_rgba(26,26,46,0.06)]",
        "transition-all duration-300 hover:border-white/30 hover:bg-white/55 hover:shadow-[0_12px_40px_rgba(26,26,46,0.1)]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
          <Icon className="h-5 w-5 text-[#C75B39]" strokeWidth={1.5} />
        </div>

        {/* Trend indicator */}
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              isPositive
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-red-500/10 text-red-600"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {isPositive ? "+" : ""}
              {trend.value}%
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-[#1A1A2E]">
          {value}
        </p>
        <p className="mt-0.5 text-sm text-[#1A1A2E]/50">{label}</p>
      </div>

      {/* Trend label */}
      {trend?.label && (
        <p className="mt-2 text-xs text-[#1A1A2E]/40">{trend.label}</p>
      )}
    </div>
  );
}
