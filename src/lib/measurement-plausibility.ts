/* -------------------------------------------------------------------------- */
/*  Measurement Plausibility Checker                                          */
/*  Validates AI-generated measurements for suspicious values                 */
/*  Separate file to avoid pulling MediaPipe into dashboard bundle            */
/* -------------------------------------------------------------------------- */

import { getPlausibleRanges, type BodyGender } from "./body-measurement";

export interface MeasurementWarning {
  field: string;
  message: string;
  severity: "warning" | "critical";
}

/**
 * Check measurements for plausibility issues.
 * Returns warnings for out-of-range and cross-measurement inconsistencies.
 */
export function checkPlausibility(
  measurements: Record<string, number>,
  heightCm: number,
  gender: BodyGender
): MeasurementWarning[] {
  const warnings: MeasurementWarning[] = [];
  const ranges = getPlausibleRanges(heightCm, gender);

  // --- Per-field range checks ---
  const rangeEntries = Object.entries(ranges) as [string, { min: number; max: number }][];
  for (const [field, range] of rangeEntries) {
    const value = measurements[field];
    if (value === undefined || value === null) continue;

    // Near the boundary = warning, outside = critical
    const margin = (range.max - range.min) * 0.1;
    if (value < range.min) {
      warnings.push({
        field,
        message: `${value} cm seems too low (expected ${Math.round(range.min)}–${Math.round(range.max)} cm)`,
        severity: value < range.min - margin ? "critical" : "warning",
      });
    } else if (value > range.max) {
      warnings.push({
        field,
        message: `${value} cm seems too high (expected ${Math.round(range.min)}–${Math.round(range.max)} cm)`,
        severity: value > range.max + margin ? "critical" : "warning",
      });
    }
  }

  // --- Cross-measurement consistency checks ---

  const { bust, chest, waist, hips, shoulder, thigh, knee, calf, ankle, inseam, sleeveLength } = measurements;

  // Hips should be larger than waist (especially for females)
  if (hips && waist) {
    if (gender === "female" && hips < waist) {
      warnings.push({
        field: "hips",
        message: "Hips smaller than waist — unusual for female body type",
        severity: "critical",
      });
    } else if (gender === "male" && hips < waist * 0.9) {
      warnings.push({
        field: "hips",
        message: "Hips significantly smaller than waist",
        severity: "warning",
      });
    }
  }

  // Chest >= waist for males
  if (gender === "male" && chest && waist && chest < waist * 0.92) {
    warnings.push({
      field: "chest",
      message: "Chest smaller than waist — unusual for male body type",
      severity: "warning",
    });
  }

  // Shoulder should be greater than bust/chest circumference divided by pi (~width)
  if (shoulder && bust && shoulder > bust) {
    warnings.push({
      field: "shoulder",
      message: "Shoulder width exceeds bust circumference — check measurement",
      severity: "critical",
    });
  }

  // Taper check: thigh > knee > calf > ankle
  if (thigh && knee && thigh < knee) {
    warnings.push({
      field: "knee",
      message: "Knee larger than thigh — measurements may be swapped",
      severity: "critical",
    });
  }
  if (knee && calf && knee < calf) {
    warnings.push({
      field: "calf",
      message: "Calf larger than knee — measurements may be swapped",
      severity: "critical",
    });
  }
  if (calf && ankle && calf < ankle) {
    warnings.push({
      field: "ankle",
      message: "Ankle larger than calf — measurements may be swapped",
      severity: "critical",
    });
  }

  // Inseam should be roughly 42-47% of height
  if (inseam && heightCm) {
    const ratio = inseam / heightCm;
    if (ratio < 0.38) {
      warnings.push({
        field: "inseam",
        message: "Inseam seems short relative to height",
        severity: "warning",
      });
    } else if (ratio > 0.52) {
      warnings.push({
        field: "inseam",
        message: "Inseam seems long relative to height",
        severity: "warning",
      });
    }
  }

  // Sleeve should be roughly 30-36% of height
  if (sleeveLength && heightCm) {
    const ratio = sleeveLength / heightCm;
    if (ratio < 0.25) {
      warnings.push({
        field: "sleeveLength",
        message: "Sleeve length seems short relative to height",
        severity: "warning",
      });
    } else if (ratio > 0.42) {
      warnings.push({
        field: "sleeveLength",
        message: "Sleeve length seems long relative to height",
        severity: "warning",
      });
    }
  }

  return warnings;
}
