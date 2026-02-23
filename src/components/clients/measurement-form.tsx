"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Ruler,
  Save,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeasurementGuide, MeasurementGuideToggle } from "@/components/clients/measurement-guide";
import {
  GARMENT_PRESETS,
  MEASUREMENT_TYPES,
  SIZE_CHART_FEMALE,
  SIZE_CHART_MALE,
  type SizeChartEntry,
} from "@/lib/constants";
import { measurementSchema, type MeasurementInput } from "@/lib/validations";
import type { Measurements } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Props                                                                      */
/* -------------------------------------------------------------------------- */

interface MeasurementFormProps {
  initialData?: Partial<Measurements>;
  previousData?: Partial<Measurements> | null;
  clientGender?: "male" | "female";
  onSubmit: (data: MeasurementInput) => void | Promise<void>;
  loading?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getRelevantFields(garment: string): string[] {
  return GARMENT_PRESETS[garment]?.fields ?? GARMENT_PRESETS.all.fields;
}

/** Detect a standard size from bust/waist/hips */
function detectSize(
  gender: "male" | "female",
  bust?: number,
  waist?: number,
  hips?: number
): { size: string; notes: string[] } | null {
  if (!bust && !waist && !hips) return null;

  const chart: SizeChartEntry[] =
    gender === "female" ? SIZE_CHART_FEMALE : SIZE_CHART_MALE;

  let bestMatch: SizeChartEntry | null = null;
  let bestScore = Infinity;
  const notes: string[] = [];

  for (const entry of chart) {
    let score = 0;
    let count = 0;
    if (bust) {
      const mid = (entry.bust[0] + entry.bust[1]) / 2;
      score += Math.abs(bust - mid);
      count++;
    }
    if (waist) {
      const mid = (entry.waist[0] + entry.waist[1]) / 2;
      score += Math.abs(waist - mid);
      count++;
    }
    if (hips) {
      const mid = (entry.hips[0] + entry.hips[1]) / 2;
      score += Math.abs(hips - mid);
      count++;
    }
    if (count > 0) {
      const avg = score / count;
      if (avg < bestScore) {
        bestScore = avg;
        bestMatch = entry;
      }
    }
  }

  if (!bestMatch) return null;

  // Check which body areas deviate from the matched size
  if (bust) {
    if (bust > bestMatch.bust[1])
      notes.push(`Bust is ${(bust - bestMatch.bust[1]).toFixed(1)}cm above ${bestMatch.label} range`);
    else if (bust < bestMatch.bust[0])
      notes.push(`Bust is ${(bestMatch.bust[0] - bust).toFixed(1)}cm below ${bestMatch.label} range`);
  }
  if (waist) {
    if (waist > bestMatch.waist[1])
      notes.push(`Waist is ${(waist - bestMatch.waist[1]).toFixed(1)}cm above ${bestMatch.label} range`);
    else if (waist < bestMatch.waist[0])
      notes.push(`Waist is ${(bestMatch.waist[0] - waist).toFixed(1)}cm below ${bestMatch.label} range`);
  }
  if (hips) {
    if (hips > bestMatch.hips[1])
      notes.push(`Hips ${(hips - bestMatch.hips[1]).toFixed(1)}cm above ${bestMatch.label} range`);
    else if (hips < bestMatch.hips[0])
      notes.push(`Hips ${(bestMatch.hips[0] - hips).toFixed(1)}cm below ${bestMatch.label} range`);
  }

  return { size: bestMatch.label, notes };
}

/** Compare two measurement sets and return differences */
function compareMeasurements(
  current: Record<string, number | undefined>,
  previous: Partial<Measurements>
): { key: string; label: string; diff: number; prev: number; curr: number }[] {
  const changes: { key: string; label: string; diff: number; prev: number; curr: number }[] = [];

  for (const mt of MEASUREMENT_TYPES) {
    const prev = previous[mt.key as keyof Measurements] as number | undefined;
    const curr = current[mt.key] as number | undefined;
    if (prev && curr && prev !== curr) {
      const diff = curr - prev;
      if (Math.abs(diff) >= 0.5) {
        changes.push({ key: mt.key, label: mt.label, diff, prev, curr });
      }
    }
  }
  return changes;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function MeasurementForm({
  initialData,
  previousData,
  clientGender = "female",
  onSubmit,
  loading = false,
}: MeasurementFormProps) {
  const [selectedGarment, setSelectedGarment] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MeasurementInput>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      bust: initialData?.bust ?? undefined,
      waist: initialData?.waist ?? undefined,
      hips: initialData?.hips ?? undefined,
      shoulder: initialData?.shoulder ?? undefined,
      armLength: initialData?.armLength ?? undefined,
      inseam: initialData?.inseam ?? undefined,
      neck: initialData?.neck ?? undefined,
      chest: initialData?.chest ?? undefined,
      backLength: initialData?.backLength ?? undefined,
      frontLength: initialData?.frontLength ?? undefined,
      sleeveLength: initialData?.sleeveLength ?? undefined,
      wrist: initialData?.wrist ?? undefined,
      thigh: initialData?.thigh ?? undefined,
      knee: initialData?.knee ?? undefined,
      calf: initialData?.calf ?? undefined,
      ankle: initialData?.ankle ?? undefined,
      height: initialData?.height ?? undefined,
      weight: initialData?.weight ?? undefined,
    },
  });

  const allValues = watch();

  /* ---- Visible fields based on garment selection ---- */
  const visibleFields = useMemo(() => {
    if (!selectedGarment) return null;
    return getRelevantFields(selectedGarment);
  }, [selectedGarment]);

  const filteredMeasurements = useMemo(() => {
    if (!visibleFields) return MEASUREMENT_TYPES;
    return MEASUREMENT_TYPES.filter((m) => visibleFields.includes(m.key));
  }, [visibleFields]);

  /* ---- Size recommendation ---- */
  const sizeRecommendation = useMemo(() => {
    const bust = typeof allValues.bust === "number" && !isNaN(allValues.bust) ? allValues.bust : undefined;
    const waist = typeof allValues.waist === "number" && !isNaN(allValues.waist) ? allValues.waist : undefined;
    const hips = typeof allValues.hips === "number" && !isNaN(allValues.hips) ? allValues.hips : undefined;
    return detectSize(clientGender, bust, waist, hips);
  }, [allValues.bust, allValues.waist, allValues.hips, clientGender]);

  /* ---- Change alerts ---- */
  const changes = useMemo(() => {
    if (!previousData) return [];
    const currentVals: Record<string, number | undefined> = {};
    for (const mt of MEASUREMENT_TYPES) {
      const val = allValues[mt.key as keyof MeasurementInput];
      currentVals[mt.key] = typeof val === "number" && !isNaN(val) ? val : undefined;
    }
    return compareMeasurements(currentVals, previousData);
  }, [allValues, previousData]);

  /* ---- Auto-skip garment selector if editing existing AI scan data ---- */
  useEffect(() => {
    if (initialData?.source === "ai_scan" && !selectedGarment) {
      setSelectedGarment("all");
    }
  }, [initialData?.source, selectedGarment]);

  /* ================================================================== */
  /*  GARMENT SELECTION STEP                                             */
  /* ================================================================== */

  if (!selectedGarment) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 rounded-lg bg-[#C75B39]/5 px-3 py-2">
          <Ruler className="h-4 w-4 text-[#C75B39]" />
          <span className="text-xs font-medium text-[#1A1A2E]/70">
            What are you making?
          </span>
        </div>

        <p className="text-sm text-[#1A1A2E]/55">
          Select the garment type to see only the measurements you need.
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(GARMENT_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedGarment(key)}
              className="flex items-center gap-3 rounded-xl border border-[#1A1A2E]/8 bg-white/40 p-3.5 text-left transition-all duration-150 hover:border-[#C75B39]/25 hover:bg-white/60 active:scale-[0.98]"
            >
              <span className="text-xl">{preset.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#1A1A2E]">
                  {preset.label}
                </p>
                <p className="text-[10px] text-[#1A1A2E]/40">
                  {preset.fields.length} measurements
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#1A1A2E]/25" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ================================================================== */
  /*  MEASUREMENT FORM                                                   */
  /* ================================================================== */

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Garment badge + change button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-lg bg-[#C75B39]/5 px-3 py-2">
          <span className="text-base">
            {GARMENT_PRESETS[selectedGarment]?.icon ?? "📐"}
          </span>
          <span className="text-xs font-medium text-[#1A1A2E]/70">
            {GARMENT_PRESETS[selectedGarment]?.label ?? "All Measurements"}
          </span>
          {initialData?.source === "ai_scan" && (
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">
              AI
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSelectedGarment(null)}
          className="text-xs font-medium text-[#C75B39] transition-colors hover:text-[#C75B39]/70"
        >
          Change garment
        </button>
      </div>

      {/* ---- Size recommendation ---- */}
      {sizeRecommendation && (
        <div className="rounded-xl border border-[#D4A853]/15 bg-gradient-to-r from-[#D4A853]/[0.04] to-[#C75B39]/[0.04] p-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#D4A853]" />
            <p className="text-sm font-semibold text-[#1A1A2E]">
              Estimated size:{" "}
              <span className="text-[#C75B39]">
                {sizeRecommendation.size}
              </span>
            </p>
          </div>
          {sizeRecommendation.notes.length > 0 && (
            <div className="mt-2 space-y-1">
              {sizeRecommendation.notes.map((note, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-[#D4A853]" />
                  <p className="text-[11px] text-[#1A1A2E]/55">{note}</p>
                </div>
              ))}
              <p className="mt-1.5 text-[10px] text-[#1A1A2E]/40">
                Adjust pattern accordingly for a better fit
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---- Change alerts (compared to previous measurements) ---- */}
      {changes.length > 0 && (
        <div className="rounded-xl border border-amber-300/20 bg-amber-50/30 p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-amber-700">
              Changes from last measurement
            </p>
          </div>
          <div className="space-y-1.5">
            {changes.map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between rounded-lg bg-white/60 px-2.5 py-1.5"
              >
                <span className="text-xs text-[#1A1A2E]/70">{c.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#1A1A2E]/40">
                    {c.prev}
                  </span>
                  <span className="text-[#1A1A2E]/25">&rarr;</span>
                  <span className="text-xs font-medium text-[#1A1A2E]">
                    {c.curr}
                  </span>
                  <span
                    className={`flex items-center text-[10px] font-semibold ${
                      c.diff > 0 ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    {c.diff > 0 ? (
                      <ArrowUp className="h-2.5 w-2.5" />
                    ) : (
                      <ArrowDown className="h-2.5 w-2.5" />
                    )}
                    {Math.abs(c.diff).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Height and Weight (always shown) ---- */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#1A1A2E]">
            Height
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              placeholder="0"
              {...register("height", { valueAsNumber: true })}
              className="glass-input flex h-10 w-full rounded-lg px-3 py-2 pr-10 text-sm text-[#1A1A2E] placeholder:text-[#1A1A2E]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#1A1A2E]/40">
              cm
            </span>
          </div>
          {errors.height && (
            <p className="text-xs text-destructive">{errors.height.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#1A1A2E]">
            Weight
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              placeholder="0"
              {...register("weight", { valueAsNumber: true })}
              className="glass-input flex h-10 w-full rounded-lg px-3 py-2 pr-10 text-sm text-[#1A1A2E] placeholder:text-[#1A1A2E]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#1A1A2E]/40">
              kg
            </span>
          </div>
          {errors.weight && (
            <p className="text-xs text-destructive">{errors.weight.message}</p>
          )}
        </div>
      </div>

      {/* ---- Garment-specific measurement fields ---- */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1A1A2E]">
          Body Measurements
          {selectedGarment !== "all" && (
            <span className="text-[10px] font-normal text-[#1A1A2E]/40">
              ({filteredMeasurements.length} fields for{" "}
              {GARMENT_PRESETS[selectedGarment]?.label})
            </span>
          )}
        </h4>

        {/* Visual measurement guide */}
        {focusedField && (
          <div className="mb-3">
            <MeasurementGuide
              activeField={focusedField}
              gender={clientGender}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredMeasurements.map((measurement) => (
            <div key={measurement.key} className="space-y-1.5">
              <div className="flex items-center gap-1">
                <label className="block text-xs font-medium text-[#1A1A2E]/70">
                  {measurement.label}
                </label>
                <MeasurementGuideToggle
                  measurementKey={measurement.key}
                  gender={clientGender}
                />
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  {...register(measurement.key as keyof MeasurementInput, {
                    valueAsNumber: true,
                  })}
                  onFocus={() => setFocusedField(measurement.key)}
                  onBlur={() => setFocusedField(null)}
                  className="glass-input flex h-9 w-full rounded-lg px-3 py-1.5 pr-10 text-sm text-[#1A1A2E] placeholder:text-[#1A1A2E]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#1A1A2E]/40">
                  {measurement.unit}
                </span>
              </div>
              {errors[measurement.key as keyof MeasurementInput] && (
                <p className="text-[10px] text-destructive">
                  {errors[measurement.key as keyof MeasurementInput]?.message}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <Button type="submit" className="w-full" loading={loading}>
        <Save className="h-4 w-4" />
        Save Measurements
      </Button>
    </form>
  );
}
