"use client";

import { useState, useMemo } from "react";
import {
  estimateFabric,
  FABRIC_WIDTHS,
  type FabricEstimate,
} from "@/lib/fabric-calculator";
import { GARMENT_PRESETS } from "@/lib/constants";
import type { Measurements } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

interface FabricCalculatorProps {
  measurements: Measurements;
  /** Pre-selected garment type (from order form). If omitted, user picks. */
  initialGarment?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function FabricCalculator({
  measurements,
  initialGarment,
}: FabricCalculatorProps) {
  const [garment, setGarment] = useState(initialGarment || "");
  const [fabricWidth, setFabricWidth] = useState<number>(FABRIC_WIDTHS[0].value);

  const estimate: FabricEstimate | null = useMemo(() => {
    if (!garment) return null;
    return estimateFabric(garment, measurements, fabricWidth);
  }, [garment, measurements, fabricWidth]);

  return (
    <div className="space-y-4">
      {/* Garment selector (only shown if not pre-selected) */}
      {!initialGarment && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#1A1A2E]/50">
            Garment Type
          </label>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {Object.entries(GARMENT_PRESETS)
              .filter(([key]) => key !== "all")
              .map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGarment(key)}
                  className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition-all ${
                    garment === key
                      ? "border-[#C75B39]/40 bg-[#C75B39]/10 text-[#C75B39]"
                      : "border-[#1A1A2E]/8 bg-white/50 text-[#1A1A2E]/60 hover:border-[#1A1A2E]/15"
                  }`}
                >
                  <span className="block text-base">{preset.icon}</span>
                  <span className="mt-0.5 block truncate">{preset.label.split("/")[0].trim()}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Fabric width selector */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#1A1A2E]/50">
          Fabric Width
        </label>
        <div className="flex gap-2">
          {FABRIC_WIDTHS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => setFabricWidth(w.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                fabricWidth === w.value
                  ? "border-[#D4A853]/40 bg-[#D4A853]/10 text-[#D4A853]"
                  : "border-[#1A1A2E]/8 bg-white/50 text-[#1A1A2E]/60 hover:border-[#1A1A2E]/15"
              }`}
            >
              {w.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {estimate && (
        <div className="space-y-3 rounded-xl border border-[#C75B39]/15 bg-gradient-to-br from-[#C75B39]/[0.04] to-[#D4A853]/[0.04] p-4">
          {/* Total */}
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1A1A2E]/40">
              Estimated Fabric Needed
            </p>
            <p className="mt-1 text-3xl font-bold text-[#C75B39]">
              {estimate.totalYards}{" "}
              <span className="text-sm font-medium text-[#C75B39]/60">yards</span>
            </p>
            <p className="text-xs text-[#1A1A2E]/40">
              ({estimate.totalMeters} meters)
            </p>
          </div>

          {/* Breakdown */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#1A1A2E]/35">
              Breakdown
            </p>
            <div className="space-y-1">
              {estimate.breakdown.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-[#1A1A2E]/55">{item.label}</span>
                  <span className="font-medium text-[#1A1A2E]/70">
                    {Math.round(item.cm)} cm
                  </span>
                </div>
              ))}
              <div className="mt-1 border-t border-[#1A1A2E]/8 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#1A1A2E]/40">
                    +12% cutting waste & shrinkage
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          {estimate.tips.length > 0 && (
            <div className="space-y-1">
              {estimate.tips.map((tip, i) => (
                <p key={i} className="text-[10px] leading-relaxed text-[#D4A853]">
                  * {tip}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {!garment && (
        <p className="py-4 text-center text-xs text-[#1A1A2E]/35">
          Select a garment type to see fabric estimate
        </p>
      )}

      {garment && !estimate && (
        <p className="py-4 text-center text-xs text-[#1A1A2E]/35">
          Fabric estimation not available for this garment type
        </p>
      )}
    </div>
  );
}
