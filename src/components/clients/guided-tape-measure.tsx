"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, CheckCircle2, Ruler, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cmToDisplayInches, parseMeasurementInput } from "@/lib/utils";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { UnitToggle } from "@/components/common/unit-toggle";

/**
 * GuidedTapeMeasure
 *
 * Step-by-step guided measurement entry that works on any phone, any lighting,
 * any location. No AI required. Just a tape measure and this screen.
 *
 * This is the PRIMARY measurement flow for all Free tier users and is
 * recommended even for Plus/Pro users when conditions are not ideal for AI scan.
 *
 * Each step shows:
 * - The measurement name
 * - A simple text diagram showing where to measure
 * - Pidgin English instruction
 * - An input field (in the user's preferred unit)
 * - Anomaly detection with gentle warning
 */

/* -------------------------------------------------------------------------- */
/*  Measurement steps definition                                               */
/* -------------------------------------------------------------------------- */

interface MeasurementStep {
  key: string;
  label: string;
  instruction: string;
  pidgin: string;
  diagram: string;
  min: number; // cm
  max: number; // cm
  required: boolean;
  group: "circumference" | "length" | "point-to-point";
}

const STEPS: MeasurementStep[] = [
  // Circumference
  {
    key: "bust", label: "Bust", group: "circumference",
    instruction: "Measure around the fullest part of the chest, keeping the tape parallel to the floor.",
    pidgin: "Wrap tape around the biggest part of the breast. Make sure tape dey level all around.",
    diagram: "── tape goes all the way around ──\n     [ fullest point of chest ]",
    min: 70, max: 150, required: true,
  },
  {
    key: "waist", label: "Waist", group: "circumference",
    instruction: "Measure around the natural waist — the narrowest part of the torso, usually above the belly button.",
    pidgin: "Find the small-small part of the tummy, above the belly button. Wrap tape around there.",
    diagram: "── tape goes all the way around ──\n   [ narrowest part of tummy ]",
    min: 55, max: 140, required: true,
  },
  {
    key: "hips", label: "Hips", group: "circumference",
    instruction: "Measure around the fullest part of the hips and buttocks, usually 7–9 inches below the waist.",
    pidgin: "Go down about 7–9 inches below the waist, then wrap tape around the fullest part of the yansh.",
    diagram: "── tape goes all the way around ──\n   [ fullest part of hips/yansh ]",
    min: 70, max: 160, required: true,
  },
  {
    key: "chest", label: "Chest (Under Arms)", group: "circumference",
    instruction: "Measure around the chest just under the armpits, keeping tape parallel to the floor.",
    pidgin: "Wrap tape under the armpit, across the chest. Make the tape flat and level.",
    diagram: "── tape just below armpit ──\n        [ across chest ]",
    min: 65, max: 145, required: false,
  },
  {
    key: "neck", label: "Neck", group: "circumference",
    instruction: "Measure around the base of the neck where the collar usually sits.",
    pidgin: "Wrap tape around the bottom of the neck, where shirt collar dey sit.",
    diagram: "── tape around base of neck ──",
    min: 28, max: 55, required: false,
  },
  // Lengths
  {
    key: "backLength", label: "Back Length", group: "length",
    instruction: "Measure from the prominent bone at the back of the neck straight down to the natural waist.",
    pidgin: "From the bone at the back of the neck, measure straight down to the waist.",
    diagram: "  [ back of neck bone ]\n         |\n         | (straight down)\n         |\n     [ waist line ]",
    min: 30, max: 55, required: true,
  },
  {
    key: "frontLength", label: "Front Length", group: "length",
    instruction: "Measure from the shoulder/collarbone to the natural waist at the front.",
    pidgin: "From the shoulder (front), measure down to the waist at the front.",
    diagram: "  [ shoulder point ]\n         |\n         | (straight down)\n         |\n     [ waist line ]",
    min: 28, max: 52, required: false,
  },
  {
    key: "armLength", label: "Arm Length", group: "length",
    instruction: "Measure from the shoulder point, over the bent elbow, down to the wrist bone.",
    pidgin: "Bend the arm small. Measure from shoulder point, over elbow, to wrist bone.",
    diagram: "  [ shoulder ]\n      |\n      | (over elbow)\n      |\n  [ wrist bone ]",
    min: 45, max: 75, required: false,
  },
  {
    key: "sleeveLength", label: "Sleeve Length", group: "length",
    instruction: "Measure from the shoulder seam down the arm to the wrist.",
    pidgin: "From shoulder seam, straight down the arm to the wrist.",
    diagram: "  [ shoulder seam ]\n        |\n        |\n    [ wrist ]",
    min: 42, max: 72, required: false,
  },
  {
    key: "shoulder", label: "Shoulder Width", group: "point-to-point",
    instruction: "Measure straight across the back from one shoulder point to the other.",
    pidgin: "Measure across the back from one shoulder edge to the other. Straight line.",
    diagram: "[ shoulder ] ──── across back ──── [ shoulder ]",
    min: 32, max: 58, required: true,
  },
  {
    key: "inseam", label: "Inseam", group: "length",
    instruction: "Measure from the crotch seam down the inside of the leg to the ankle.",
    pidgin: "From the join between the legs, measure down the inside of the leg to the ankle.",
    diagram: "  [ crotch ]\n      |\n      | (inside leg)\n      |\n  [ ankle ]",
    min: 55, max: 90, required: false,
  },
  {
    key: "thigh", label: "Thigh", group: "circumference",
    instruction: "Measure around the fullest part of the upper thigh.",
    pidgin: "Wrap tape around the biggest part of the upper leg.",
    diagram: "── tape around upper thigh ──\n   [ fullest part ]",
    min: 40, max: 90, required: false,
  },
  {
    key: "blouseLength", label: "Blouse Length", group: "length",
    instruction: "Measure from the back of the neck/nape down to where the blouse should end (usually below the hip).",
    pidgin: "From the back of the neck, measure down to where you want the blouse to end.",
    diagram: "  [ nape of neck ]\n        |\n        |\n  [ blouse hem ]",
    min: 45, max: 90, required: false,
  },
];

/* -------------------------------------------------------------------------- */
/*  Props                                                                      */
/* -------------------------------------------------------------------------- */

interface GuidedTapeMeasureProps {
  gender?: "male" | "female";
  onComplete: (measurements: Record<string, number>) => void;
  onCancel?: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function GuidedTapeMeasure({ gender = "female", onComplete, onCancel }: GuidedTapeMeasureProps) {
  const { unit, toggle } = useUnitPreference();
  const [stepIndex,    setStepIndex]    = useState(0);
  const [values,       setValues]       = useState<Record<string, string>>({});
  const [savedValues,  setSavedValues]  = useState<Record<string, number>>({});
  const [inputError,   setInputError]   = useState<string | null>(null);
  const [warning,      setWarning]      = useState<string | null>(null);
  const [showSummary,  setShowSummary]  = useState(false);

  const currentStep = STEPS[stepIndex];
  const totalSteps  = STEPS.length;
  const progress    = Math.round((Object.keys(savedValues).length / STEPS.filter((s) => s.required).length) * 100);

  function validateValue(cm: number, step: MeasurementStep): string | null {
    if (cm < step.min) return `This seems too small for ${step.label}. Min is about ${cmToDisplayInches(step.min)}" (${step.min} cm).`;
    if (cm > step.max) return `This seems too large for ${step.label}. Max is about ${cmToDisplayInches(step.max)}" (${step.max} cm).`;
    return null;
  }

  function handleNext() {
    const raw = values[currentStep.key] || "";

    if (!raw && currentStep.required) {
      setInputError(`${currentStep.label} is required. Please measure and enter the value.`);
      return;
    }

    if (raw) {
      const cm = parseMeasurementInput(raw, unit);
      if (cm === null || cm <= 0) {
        setInputError("Please enter a valid number.");
        return;
      }
      const warn = validateValue(cm, currentStep);
      if (warn && !warning) {
        setWarning(warn);
        return; // show warning, require confirmation
      }
      setSavedValues((prev) => ({ ...prev, [currentStep.key]: cm }));
    }

    setInputError(null);
    setWarning(null);

    if (stepIndex < totalSteps - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setShowSummary(true);
    }
  }

  function handleSkip() {
    setInputError(null);
    setWarning(null);
    if (stepIndex < totalSteps - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setShowSummary(true);
    }
  }

  function handleBack() {
    setInputError(null);
    setWarning(null);
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  function handleConfirmWarning() {
    const raw = values[currentStep.key] || "";
    const cm  = parseMeasurementInput(raw, unit);
    if (cm !== null && cm > 0) {
      setSavedValues((prev) => ({ ...prev, [currentStep.key]: cm }));
    }
    setWarning(null);
    if (stepIndex < totalSteps - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setShowSummary(true);
    }
  }

  function handleComplete() {
    onComplete(savedValues);
  }

  /* ---- Summary view ---- */
  if (showSummary) {
    const entries = STEPS.filter((s) => savedValues[s.key]).map((s) => ({
      label: s.label,
      cm:    savedValues[s.key],
    }));

    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="mt-2 text-lg font-bold text-[#1A1A2E]">Measurements Complete</h3>
          <p className="text-sm text-[#1A1A2E]/50">{entries.length} measurements recorded</p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-[#1A1A2E]/40">Review your measurements</p>
          <UnitToggle unit={unit} onToggle={toggle} size="sm" />
        </div>

        <div className="max-h-64 overflow-y-auto rounded-xl border border-[#1A1A2E]/8 bg-white/40">
          {entries.map(({ label, cm }) => (
            <div key={label} className="flex items-center justify-between border-b border-[#1A1A2E]/5 px-3 py-2 last:border-0">
              <span className="text-sm text-[#1A1A2E]/70">{label}</span>
              <span className="font-mono text-sm font-semibold text-[#1A1A2E]">
                {unit === "in"
                  ? `${cmToDisplayInches(cm)}"`
                  : `${cm.toFixed(1)} cm`}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleComplete}>
            <CheckCircle2 className="h-4 w-4" />
            Save Measurements
          </Button>
          <Button variant="outline" onClick={() => { setShowSummary(false); setStepIndex(0); }}>
            Re-measure
          </Button>
        </div>
      </motion.div>
    );
  }

  /* ---- Step view ---- */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="h-5 w-5 text-[#C75B39]" />
          <span className="text-sm font-semibold text-[#1A1A2E]">
            Step {stepIndex + 1} of {totalSteps}
          </span>
        </div>
        <UnitToggle unit={unit} onToggle={toggle} size="sm" />
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-[#1A1A2E]/8">
        <div
          className="h-full rounded-full bg-[#C75B39] transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.key}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-[#1A1A2E]/8 bg-white/50 p-5 shadow-sm"
        >
          {/* Measurement name */}
          <h3 className="text-xl font-bold text-[#1A1A2E]">{currentStep.label}</h3>
          {!currentStep.required && (
            <span className="text-[10px] font-medium text-[#1A1A2E]/35">Optional</span>
          )}

          {/* Diagram */}
          <pre className="mt-3 rounded-lg bg-[#1A1A2E]/5 p-3 font-mono text-xs text-[#1A1A2E]/60 whitespace-pre-wrap">
            {currentStep.diagram}
          </pre>

          {/* Instructions */}
          <p className="mt-3 text-sm text-[#1A1A2E]/70">{currentStep.instruction}</p>
          <p className="mt-1 text-xs italic text-[#1A1A2E]/45">
            🇳🇬 {currentStep.pidgin}
          </p>

          {/* Input */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-[#1A1A2E]/60">
              Enter {currentStep.label} in {unit === "in" ? "inches" : "centimetres"}
            </label>
            <div className="relative">
              <input
                type="number"
                step={unit === "in" ? "0.5" : "0.1"}
                inputMode="decimal"
                placeholder={unit === "in" ? "e.g. 38" : "e.g. 96.5"}
                value={values[currentStep.key] || ""}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, [currentStep.key]: e.target.value }));
                  setInputError(null);
                  setWarning(null);
                }}
                className="glass-input flex h-12 w-full rounded-xl px-4 text-lg font-semibold text-[#1A1A2E] placeholder:text-[#1A1A2E]/25 focus-visible:outline-none pr-14"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#1A1A2E]/40">
                {unit}
              </span>
            </div>

            {/* Saved value reference */}
            {savedValues[currentStep.key] && (
              <p className="mt-1 text-xs text-emerald-600">
                ✓ Previously saved: {unit === "in"
                  ? `${cmToDisplayInches(savedValues[currentStep.key])}"`
                  : `${savedValues[currentStep.key].toFixed(1)} cm`}
              </p>
            )}

            {/* Error */}
            {inputError && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3 w-3" /> {inputError}
              </p>
            )}

            {/* Warning — measurement seems unusual */}
            {warning && (
              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200/50 p-2.5">
                <p className="text-xs text-amber-700 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {warning}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleConfirmWarning}
                    className="text-xs font-semibold text-amber-700 underline"
                  >
                    It&apos;s correct, continue
                  </button>
                  <span className="text-amber-400">·</span>
                  <button
                    onClick={() => setWarning(null)}
                    className="text-xs text-amber-600"
                  >
                    Let me re-measure
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-2">
        {stepIndex > 0 && (
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {!currentStep.required && (
          <Button variant="outline" size="sm" onClick={handleSkip} className="text-[#1A1A2E]/50">
            Skip
          </Button>
        )}
        <Button className="flex-1" onClick={handleNext}>
          {stepIndex === totalSteps - 1 ? "Review & Save" : "Next"}
          {stepIndex < totalSteps - 1 && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full text-center text-xs text-[#1A1A2E]/35 hover:text-[#1A1A2E]/60"
        >
          Cancel measurement session
        </button>
      )}
    </div>
  );
}
