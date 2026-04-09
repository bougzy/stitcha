"use client";

import { cn } from "@/lib/utils";
import type { MeasurementUnit } from "@/hooks/use-unit-preference";

interface UnitToggleProps {
  unit: MeasurementUnit;
  onToggle: () => void;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Compact inches ↔ CM toggle switch.
 * Used on all measurement views across the app.
 */
export function UnitToggle({ unit, onToggle, className, size = "md" }: UnitToggleProps) {
  const isInches = unit === "in";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${isInches ? "centimetres" : "inches"}`}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-background font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        size === "sm" ? "h-7 text-xs" : "h-8 text-sm",
        className
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full transition-colors",
          size === "sm" ? "px-2.5 py-0.5" : "px-3 py-1",
          isInches
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        in
      </span>
      <span
        className={cn(
          "flex items-center justify-center rounded-full transition-colors",
          size === "sm" ? "px-2.5 py-0.5" : "px-3 py-1",
          !isInches
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        cm
      </span>
    </button>
  );
}
