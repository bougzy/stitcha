"use client";

import {
  Clock,
  CheckCircle2,
  Scissors,
  Shirt,
  UserCheck,
  Sparkles,
  Package,
  Truck,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Status step configuration                                                 */
/* -------------------------------------------------------------------------- */

interface StatusStep {
  value: OrderStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_STEPS: StatusStep[] = [
  { value: "pending", label: "Pending", icon: Clock },
  { value: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { value: "cutting", label: "Cutting", icon: Scissors },
  { value: "sewing", label: "Sewing", icon: Shirt },
  { value: "fitting", label: "Fitting", icon: UserCheck },
  { value: "finishing", label: "Finishing", icon: Sparkles },
  { value: "ready", label: "Ready", icon: Package },
  { value: "delivered", label: "Delivered", icon: Truck },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getStepState(
  stepIndex: number,
  activeIndex: number
): "completed" | "active" | "future" {
  if (stepIndex < activeIndex) return "completed";
  if (stepIndex === activeIndex) return "active";
  return "future";
}

/* -------------------------------------------------------------------------- */
/*  StatusProgress component                                                  */
/* -------------------------------------------------------------------------- */

interface StatusProgressProps {
  status: OrderStatus;
  className?: string;
}

export function StatusProgress({ status, className }: StatusProgressProps) {
  const activeIndex = STATUS_STEPS.findIndex((s) => s.value === status);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className={cn("flex items-center justify-center gap-3 py-4", className)}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
          <CircleDot className="h-5 w-5 text-red-500" />
        </div>
        <span className="text-sm font-semibold text-red-500">
          Order Cancelled
        </span>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: horizontal progress */}
      <div className="hidden md:block">
        <div className="flex items-center">
          {STATUS_STEPS.map((step, index) => {
            const state = getStepState(index, activeIndex);
            const Icon = step.icon;
            const isLast = index === STATUS_STEPS.length - 1;

            return (
              <div
                key={step.value}
                className={cn("flex items-center", !isLast && "flex-1")}
              >
                {/* Step circle + label */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full",
                      "transition-all duration-300",
                      state === "completed" &&
                        "bg-emerald-500 text-white shadow-md shadow-emerald-500/25",
                      state === "active" &&
                        "bg-[#C75B39] text-white shadow-md shadow-[#C75B39]/25 ring-4 ring-[#C75B39]/15",
                      state === "future" &&
                        "bg-[#1A1A2E]/8 text-[#1A1A2E]/30"
                    )}
                  >
                    {state === "completed" ? (
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-[11px] font-medium whitespace-nowrap",
                      state === "completed" && "text-emerald-600",
                      state === "active" && "text-[#C75B39] font-semibold",
                      state === "future" && "text-[#1A1A2E]/30"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="mx-2 mt-[-20px] h-0.5 flex-1 rounded-full bg-[#1A1A2E]/8">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        state === "completed"
                          ? "w-full bg-emerald-500"
                          : state === "active"
                          ? "w-1/2 bg-gradient-to-r from-emerald-500 to-[#C75B39]"
                          : "w-0"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical progress */}
      <div className="md:hidden">
        <div className="flex flex-col">
          {STATUS_STEPS.map((step, index) => {
            const state = getStepState(index, activeIndex);
            const Icon = step.icon;
            const isLast = index === STATUS_STEPS.length - 1;

            return (
              <div key={step.value} className="flex">
                {/* Step icon + connector column */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      "transition-all duration-300",
                      state === "completed" &&
                        "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25",
                      state === "active" &&
                        "bg-[#C75B39] text-white shadow-sm shadow-[#C75B39]/25 ring-3 ring-[#C75B39]/15",
                      state === "future" &&
                        "bg-[#1A1A2E]/8 text-[#1A1A2E]/25"
                    )}
                  >
                    {state === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  {!isLast && (
                    <div className="my-0.5 h-5 w-0.5 rounded-full bg-[#1A1A2E]/8">
                      <div
                        className={cn(
                          "w-full rounded-full transition-all duration-500",
                          state === "completed"
                            ? "h-full bg-emerald-500"
                            : state === "active"
                            ? "h-1/2 bg-gradient-to-b from-emerald-500 to-[#C75B39]"
                            : "h-0"
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="ml-3 flex min-h-[32px] items-center pb-5 last:pb-0">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      state === "completed" && "text-emerald-600",
                      state === "active" && "text-[#C75B39] font-semibold",
                      state === "future" && "text-[#1A1A2E]/30"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
