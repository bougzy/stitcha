/* -------------------------------------------------------------------------- */
/*  Measurement Plausibility Checker — inches                                  */
/*  Validates AI-generated measurements for suspicious values.                 */
/* -------------------------------------------------------------------------- */

import { getPlausibleRanges, type BodyGender } from "./body-measurement";

export interface MeasurementWarning {
  field: string;
  message: string;
  severity: "warning" | "critical";
}

/**
 * Check measurements (inches) for plausibility issues.
 * `heightIn` is the subject's height in inches.
 */
export function checkPlausibility(
  measurements: Record<string, number>,
  heightIn: number,
  gender: BodyGender,
): MeasurementWarning[] {
  const warnings: MeasurementWarning[] = [];
  const ranges = getPlausibleRanges(heightIn, gender);

  // --- Per-field range checks ---
  const rangeEntries = Object.entries(ranges) as [string, { min: number; max: number }][];
  for (const [field, range] of rangeEntries) {
    const value = measurements[field];
    if (value === undefined || value === null) continue;
    const margin = (range.max - range.min) * 0.1;
    if (value < range.min) {
      warnings.push({
        field,
        message: `${value}" seems too low (expected ${range.min.toFixed(1)}–${range.max.toFixed(1)}")`,
        severity: value < range.min - margin ? "critical" : "warning",
      });
    } else if (value > range.max) {
      warnings.push({
        field,
        message: `${value}" seems too high (expected ${range.min.toFixed(1)}–${range.max.toFixed(1)}")`,
        severity: value > range.max + margin ? "critical" : "warning",
      });
    }
  }

  // --- Cross-measurement consistency ---
  const { bust, chest, waist, hips, shoulder, thigh, knee, calf, ankle, inseam, sleeveLength } = measurements;

  if (hips && waist) {
    if (gender === "female" && hips < waist) {
      warnings.push({ field: "hips", message: "Hips smaller than waist — unusual for female body type", severity: "critical" });
    } else if (gender === "male" && hips < waist * 0.9) {
      warnings.push({ field: "hips", message: "Hips significantly smaller than waist", severity: "warning" });
    }
  }
  if (gender === "male" && chest && waist && chest < waist * 0.92) {
    warnings.push({ field: "chest", message: "Chest smaller than waist — unusual for male body type", severity: "warning" });
  }
  if (shoulder && bust && shoulder > bust) {
    warnings.push({ field: "shoulder", message: "Shoulder width exceeds bust circumference — check measurement", severity: "critical" });
  }

  // Taper check
  if (thigh && knee && thigh < knee) {
    warnings.push({ field: "knee", message: "Knee larger than thigh — measurements may be swapped", severity: "critical" });
  }
  if (knee && calf && knee < calf) {
    warnings.push({ field: "calf", message: "Calf larger than knee — measurements may be swapped", severity: "critical" });
  }
  if (calf && ankle && calf < ankle) {
    warnings.push({ field: "ankle", message: "Ankle larger than calf — measurements may be swapped", severity: "critical" });
  }

  // Inseam ~ 38–52 % of height
  if (inseam && heightIn) {
    const ratio = inseam / heightIn;
    if (ratio < 0.38) {
      warnings.push({ field: "inseam", message: "Inseam seems short relative to height", severity: "warning" });
    } else if (ratio > 0.52) {
      warnings.push({ field: "inseam", message: "Inseam seems long relative to height", severity: "warning" });
    }
  }
  // Sleeve ~ 25–42 % of height
  if (sleeveLength && heightIn) {
    const ratio = sleeveLength / heightIn;
    if (ratio < 0.25) {
      warnings.push({ field: "sleeveLength", message: "Sleeve length seems short relative to height", severity: "warning" });
    } else if (ratio > 0.42) {
      warnings.push({ field: "sleeveLength", message: "Sleeve length seems long relative to height", severity: "warning" });
    }
  }

  return warnings;
}
