/* -------------------------------------------------------------------------- */
/*  Ease Allowance Calculator                                                 */
/*  Adds wearing ease + design ease based on garment type and fit preference  */
/* -------------------------------------------------------------------------- */

export type FitType = "fitted" | "standard" | "loose";

interface EaseValues {
  bust?: number;
  waist?: number;
  hips?: number;
  chest?: number;
  shoulder?: number;
  neck?: number;
  armLength?: number;
  sleeveLength?: number;
  wrist?: number;
  thigh?: number;
  knee?: number;
  calf?: number;
  ankle?: number;
  inseam?: number;
}

/* -------------------------------------------------------------------------- */
/*  Ease tables (in cm) per garment type and fit                              */
/*  These are standard wearing + design ease values used by pattern makers    */
/* -------------------------------------------------------------------------- */

const EASE_TABLES: Record<string, Record<FitType, EaseValues>> = {
  top: {
    fitted: { bust: 5, chest: 5, waist: 3, shoulder: 0.5, wrist: 1.5, armLength: 1 },
    standard: { bust: 8, chest: 8, waist: 5, shoulder: 1, wrist: 2, armLength: 1.5 },
    loose: { bust: 13, chest: 13, waist: 8, shoulder: 1.5, wrist: 3, armLength: 2 },
  },
  dress: {
    fitted: { bust: 5, chest: 5, waist: 2.5, hips: 5, shoulder: 0.5, wrist: 1.5 },
    standard: { bust: 8, chest: 8, waist: 5, hips: 8, shoulder: 1, wrist: 2 },
    loose: { bust: 13, chest: 13, waist: 10, hips: 13, shoulder: 1.5, wrist: 3 },
  },
  trousers: {
    fitted: { waist: 2, hips: 4, thigh: 4, knee: 4, calf: 3, ankle: 2, inseam: 1 },
    standard: { waist: 3, hips: 6, thigh: 6, knee: 6, calf: 5, ankle: 3, inseam: 1.5 },
    loose: { waist: 5, hips: 10, thigh: 10, knee: 10, calf: 8, ankle: 5, inseam: 2 },
  },
  skirt: {
    fitted: { waist: 2, hips: 4 },
    standard: { waist: 3, hips: 6 },
    loose: { waist: 5, hips: 10 },
  },
  agbada: {
    fitted: { bust: 10, chest: 10, shoulder: 2, neck: 2 },
    standard: { bust: 18, chest: 18, shoulder: 4, neck: 3 },
    loose: { bust: 25, chest: 25, shoulder: 6, neck: 4 },
  },
  suit: {
    fitted: { bust: 8, chest: 8, waist: 5, shoulder: 1, wrist: 2 },
    standard: { bust: 10, chest: 10, waist: 6, shoulder: 1.5, wrist: 2.5 },
    loose: { bust: 14, chest: 14, waist: 8, shoulder: 2, wrist: 3 },
  },
  jumpsuit: {
    fitted: { bust: 5, chest: 5, waist: 3, hips: 5, thigh: 4, ankle: 2, inseam: 1 },
    standard: { bust: 8, chest: 8, waist: 5, hips: 8, thigh: 6, ankle: 3, inseam: 1.5 },
    loose: { bust: 13, chest: 13, waist: 8, hips: 13, thigh: 10, ankle: 5, inseam: 2 },
  },
};

/* Alias map for garment types */
const GARMENT_ALIASES: Record<string, string> = {
  top: "top",
  shirt: "top",
  blouse: "top",
  dress: "dress",
  gown: "dress",
  trousers: "trousers",
  pants: "trousers",
  skirt: "skirt",
  agbada: "agbada",
  kaftan: "agbada",
  suit: "suit",
  blazer: "suit",
  jumpsuit: "jumpsuit",
};

/* -------------------------------------------------------------------------- */
/*  Measurement keys used in ease calculations                                */
/* -------------------------------------------------------------------------- */

const EASE_MEASUREMENT_KEYS = [
  "bust",
  "waist",
  "hips",
  "chest",
  "shoulder",
  "neck",
  "armLength",
  "sleeveLength",
  "wrist",
  "thigh",
  "knee",
  "calf",
  "ankle",
  "inseam",
] as const;

export type EaseMeasurementKey = (typeof EASE_MEASUREMENT_KEYS)[number];

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export interface EaseResult {
  /** Original body measurement */
  body: number;
  /** Ease amount added */
  ease: number;
  /** Final cutting measurement */
  cutting: number;
}

export interface EaseCalculation {
  garmentLabel: string;
  fitLabel: string;
  results: Record<string, EaseResult>;
}

export const FIT_OPTIONS: { value: FitType; label: string; description: string }[] = [
  { value: "fitted", label: "Fitted", description: "Close to body, minimal ease" },
  { value: "standard", label: "Standard", description: "Comfortable everyday fit" },
  { value: "loose", label: "Loose", description: "Relaxed, extra room" },
];

/**
 * Calculate cutting measurements with ease allowance.
 * Returns null if garment type is not recognized.
 */
export function calculateEase(
  garmentType: string,
  fit: FitType,
  measurements: Record<string, number | undefined>
): EaseCalculation | null {
  const key = GARMENT_ALIASES[garmentType.toLowerCase().trim()];
  if (!key || !EASE_TABLES[key]) return null;

  const easeValues = EASE_TABLES[key][fit];
  const results: Record<string, EaseResult> = {};

  for (const mk of EASE_MEASUREMENT_KEYS) {
    const bodyVal = measurements[mk];
    const easeVal = easeValues[mk as keyof EaseValues];
    if (bodyVal && easeVal) {
      results[mk] = {
        body: bodyVal,
        ease: easeVal,
        cutting: Math.round((bodyVal + easeVal) * 10) / 10,
      };
    }
  }

  const fitOption = FIT_OPTIONS.find((f) => f.value === fit);

  return {
    garmentLabel: garmentType,
    fitLabel: fitOption?.label || fit,
    results,
  };
}
