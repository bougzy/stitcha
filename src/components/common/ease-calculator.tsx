"use client";

import { useState, useMemo } from "react";
import {
  calculateEase,
  FIT_OPTIONS,
  type FitType,
  type EaseCalculation,
} from "@/lib/ease-allowance";
import { GARMENT_PRESETS, MEASUREMENT_TYPES } from "@/lib/constants";
import type { Measurements } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

interface EaseCalculatorProps {
  measurements: Measurements;
  /** Pre-selected garment type. If omitted, user picks. */
  initialGarment?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function EaseCalculator({
  measurements,
  initialGarment,
}: EaseCalculatorProps) {
  const [garment, setGarment] = useState(initialGarment || "");
  const [fit, setFit] = useState<FitType>("standard");

  const result: EaseCalculation | null = useMemo(() => {
    if (!garment) return null;
    const mRecord: Record<string, number | undefined> = {};
    for (const mt of MEASUREMENT_TYPES) {
      mRecord[mt.key] = measurements[mt.key as keyof Measurements] as
        | number
        | undefined;
    }
    return calculateEase(garment, fit, mRecord);
  }, [garment, fit, measurements]);

  const resultEntries = result
    ? Object.entries(result.results)
    : [];

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
                  <span className="mt-0.5 block truncate">
                    {preset.label.split("/")[0].trim()}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Fit selector */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#1A1A2E]/50">
          Fit Preference
        </label>
        <div className="flex gap-2">
          {FIT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFit(option.value)}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-left transition-all ${
                fit === option.value
                  ? "border-[#D4A853]/40 bg-[#D4A853]/10"
                  : "border-[#1A1A2E]/8 bg-white/50 hover:border-[#1A1A2E]/15"
              }`}
            >
              <span
                className={`block text-xs font-semibold ${
                  fit === option.value
                    ? "text-[#D4A853]"
                    : "text-[#1A1A2E]/60"
                }`}
              >
                {option.label}
              </span>
              <span className="block text-[10px] text-[#1A1A2E]/40">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {result && resultEntries.length > 0 && (
        <div className="rounded-xl border border-[#D4A853]/15 bg-gradient-to-br from-[#D4A853]/[0.04] to-[#C75B39]/[0.04] p-4">
          <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-[#1A1A2E]/40">
            Cutting Measurements ({result.fitLabel} fit)
          </p>

          {/* Header */}
          <div className="mb-2 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-widest text-[#1A1A2E]/30">
            <span className="flex-1">Measurement</span>
            <span className="w-14 text-right">Body</span>
            <span className="w-14 text-center">+ Ease</span>
            <span className="w-16 text-right">Cut at</span>
          </div>

          {/* Rows */}
          <div className="space-y-1">
            {resultEntries.map(([key, r]) => {
              const mt = MEASUREMENT_TYPES.find((t) => t.key === key);
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-lg bg-white/60 px-2.5 py-1.5"
                >
                  <span className="flex-1 text-xs text-[#1A1A2E]/60">
                    {mt?.label || key}
                  </span>
                  <span className="w-14 text-right text-xs text-[#1A1A2E]/40">
                    {r.body}
                  </span>
                  <span className="w-14 text-center text-xs font-medium text-[#D4A853]">
                    +{r.ease}
                  </span>
                  <span className="w-16 text-right text-sm font-bold text-[#C75B39]">
                    {r.cutting}
                    <span className="ml-0.5 text-[9px] font-normal text-[#1A1A2E]/30">
                      cm
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-center text-[10px] text-[#1A1A2E]/30">
            Ease values are industry standard — adjust based on fabric stretch and style
          </p>
        </div>
      )}

      {!garment && (
        <p className="py-4 text-center text-xs text-[#1A1A2E]/35">
          Select a garment type to see ease allowances
        </p>
      )}

      {garment && result && resultEntries.length === 0 && (
        <p className="py-4 text-center text-xs text-[#1A1A2E]/35">
          No matching measurements found for ease calculation. Enter body measurements first.
        </p>
      )}
    </div>
  );
}
