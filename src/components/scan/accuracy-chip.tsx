"use client";

/* -------------------------------------------------------------------------- */
/*  AccuracyChip                                                                */
/*                                                                              */
/*  Honest, in-flow indicator of how accurate the current scan is going to    */
/*  be — so the user knows BEFORE they finish what to expect.                 */
/*                                                                              */
/*    🟢 card     — Card calibration locked the scale. ±1cm typical.          */
/*    🟡 verified — Height-anchored but the user will tape-verify before save.*/
/*    🟠 height   — Height-only. Warn: ±5-10cm possible, recommend tape.       */
/* -------------------------------------------------------------------------- */

import { Sparkles, Ruler, AlertTriangle } from "lucide-react";

export type AccuracyMode = "card" | "verified" | "height";

interface AccuracyChipProps {
  mode: AccuracyMode;
  className?: string;
}

const COPY: Record<AccuracyMode, { label: string; detail: string; tone: string }> = {
  card: {
    label: "Card calibrated",
    detail: "±1cm typical accuracy",
    tone: "border-emerald-300/60 bg-emerald-50/70 text-emerald-700",
  },
  verified: {
    label: "Will be tape-verified",
    detail: "±2cm after one tape check",
    tone: "border-amber-300/60 bg-amber-50/70 text-amber-700",
  },
  height: {
    label: "Height-only",
    detail: "±5–10cm — verify with tape",
    tone: "border-orange-400/60 bg-orange-50/70 text-orange-700",
  },
};

const ICONS: Record<AccuracyMode, React.ComponentType<{ className?: string }>> = {
  card: Sparkles,
  verified: Ruler,
  height: AlertTriangle,
};

export function AccuracyChip({ mode, className }: AccuracyChipProps) {
  const cfg = COPY[mode];
  const Icon = ICONS[mode];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold ${cfg.tone} ${
        className || ""
      }`}
    >
      <Icon className="h-3 w-3" />
      <span>{cfg.label}</span>
      <span className="opacity-70">·</span>
      <span className="opacity-70">{cfg.detail}</span>
    </div>
  );
}
