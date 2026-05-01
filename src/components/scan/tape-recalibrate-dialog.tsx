"use client";

/* -------------------------------------------------------------------------- */
/*  TapeRecalibrateDialog                                                       */
/*                                                                              */
/*  Designer or client measures ONE circumference with a tape (in inches) and  */
/*  the AI's whole circumference set is rescaled proportionally. This is the   */
/*  single biggest in-app accuracy boost: anchor a real measurement, recover   */
/*  every other one.                                                            */
/* -------------------------------------------------------------------------- */

import { useState } from "react";
import { Ruler, X, Check } from "lucide-react";
import { recalibrateWithTape } from "@/lib/body-measurement";
import { parseInchesInput } from "@/lib/units";

const ANCHOR_FIELDS: { key: string; label: string }[] = [
  { key: "waist",     label: "Waist (easiest)" },
  { key: "bust",      label: "Bust" },
  { key: "hips",      label: "Hips" },
  { key: "chest",     label: "Chest" },
  { key: "underBust", label: "Under bust" },
  { key: "thigh",     label: "Thigh" },
  { key: "neck",      label: "Neck" },
  { key: "wrist",     label: "Wrist" },
];

interface Props {
  open: boolean;
  measurements: Record<string, number>;
  onClose: () => void;
  onApplied: (recalibrated: Record<string, number>) => void;
}

export function TapeRecalibrateDialog({ open, measurements, onClose, onApplied }: Props) {
  const [anchor, setAnchor] = useState("waist");
  const [tapeInput, setTapeInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const aiValue = measurements[anchor];

  function handleApply() {
    setError(null);
    const inches = parseInchesInput(tapeInput);
    if (inches == null || inches <= 0) {
      setError("Enter a valid number — for example 32 or 32.5 or 32 1/2");
      return;
    }
    const result = recalibrateWithTape(measurements, anchor, inches);
    if (!result) {
      setError("That value seems off compared to the AI estimate. Double-check the field and unit.");
      return;
    }
    onApplied(result.recalibrated);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-label="Recalibrate measurements with a tape"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/30 bg-white/95 p-5 shadow-[0_24px_60px_rgba(26,26,46,0.25)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39]/15 to-[#D4A853]/15">
            <Ruler className="h-5 w-5 text-[#C75B39]" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-[#1A1A2E]">Verify with a tape</h3>
            <p className="mt-0.5 text-xs text-[#1A1A2E]/55">
              Measure ONE field with a tape — we&apos;ll rescale every other circumference to match.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#1A1A2E]/40 hover:bg-[#1A1A2E]/5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#1A1A2E]/60">
              Which measurement did you tape?
            </label>
            <select
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              className="glass-input flex h-10 w-full rounded-xl px-3 text-sm focus-visible:outline-none"
            >
              {ANCHOR_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            {typeof aiValue === "number" && (
              <p className="mt-1 text-[11px] text-[#1A1A2E]/40">
                AI estimate: {aiValue.toFixed(1)}"
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#1A1A2E]/60">
              Your tape value (inches)
            </label>
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              placeholder="e.g. 32 or 32 1/2"
              value={tapeInput}
              onChange={(e) => setTapeInput(e.target.value)}
              className="glass-input flex h-12 w-full rounded-xl px-4 text-lg font-semibold focus-visible:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <p className="rounded-xl bg-[#1A1A2E]/[0.04] px-3 py-2 text-[11px] text-[#1A1A2E]/55">
            Length measurements (back length, sleeve, inseam) are not changed —
            only circumferences are rescaled.
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#1A1A2E]/10 bg-white/60 text-sm font-medium text-[#1A1A2E]/70 active:bg-white/80"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] text-sm font-semibold text-white shadow-md active:scale-[0.98]"
          >
            <Check className="h-4 w-4" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
