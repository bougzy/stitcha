"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  score: number; // 0–1
  isAiEstimated?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * Visual confidence indicator for individual AI measurements.
 * 🟢 0.85–1.00: High confidence
 * 🟡 0.60–0.84: Moderate — consider verifying
 * 🔴 0.00–0.59: Low — manual entry recommended
 *
 * If aiEstimated is true, always shows a yellow "AI Estimated" tag
 * regardless of numeric score.
 */
export function ConfidenceBadge({
  score,
  isAiEstimated = false,
  className,
  compact = false,
}: ConfidenceBadgeProps) {
  const pct = Math.round(score * 100);

  if (isAiEstimated) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400",
          className
        )}
        title="This value was estimated by AI using body proportion algorithms. Verify with a tape measure."
      >
        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
        {compact ? "Est." : "AI Estimated — verify with tape"}
      </span>
    );
  }

  if (pct >= 85) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400",
          className
        )}
        title={`High confidence (${pct}%)`}
      >
        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
        {compact ? `${pct}%` : `High (${pct}%)`}
      </span>
    );
  }

  if (pct >= 60) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400",
          className
        )}
        title={`Moderate confidence (${pct}%) — consider verifying`}
      >
        <Info className="h-3 w-3 flex-shrink-0" />
        {compact ? `${pct}%` : `Moderate (${pct}%)`}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400",
        className
      )}
      title={`Low confidence (${pct}%) — manual entry recommended`}
    >
      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
      {compact ? `${pct}%` : `Low (${pct}%) — enter manually`}
    </span>
  );
}

/** Small dot-only indicator for compact measurement tables */
export function ConfidenceDot({ score }: { score: number }) {
  const pct = score * 100;
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full flex-shrink-0",
        pct >= 85 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-500"
      )}
      title={`Confidence: ${Math.round(pct)}%`}
    />
  );
}
