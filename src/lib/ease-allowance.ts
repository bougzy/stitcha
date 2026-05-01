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
/*  Ease tables (in INCHES) per garment type and fit.                          */
/*  Values rounded to common 1/4" tailoring increments.                        */
/* -------------------------------------------------------------------------- */

const EASE_TABLES: Record<string, Record<FitType, EaseValues>> = {
  top: {
    fitted:   { bust: 2,    chest: 2,    waist: 1.25, shoulder: 0.25, wrist: 0.5, armLength: 0.5 },
    standard: { bust: 3,    chest: 3,    waist: 2,    shoulder: 0.5,  wrist: 0.75, armLength: 0.5 },
    loose:    { bust: 5,    chest: 5,    waist: 3,    shoulder: 0.75, wrist: 1.25, armLength: 0.75 },
  },
  dress: {
    fitted:   { bust: 2,    chest: 2,    waist: 1,    hips: 2,    shoulder: 0.25, wrist: 0.5 },
    standard: { bust: 3,    chest: 3,    waist: 2,    hips: 3,    shoulder: 0.5,  wrist: 0.75 },
    loose:    { bust: 5,    chest: 5,    waist: 4,    hips: 5,    shoulder: 0.75, wrist: 1.25 },
  },
  trousers: {
    fitted:   { waist: 0.75, hips: 1.5, thigh: 1.5, knee: 1.5, calf: 1.25, ankle: 0.75, inseam: 0.5 },
    standard: { waist: 1.25, hips: 2.5, thigh: 2.5, knee: 2.5, calf: 2,    ankle: 1.25, inseam: 0.5 },
    loose:    { waist: 2,    hips: 4,   thigh: 4,   knee: 4,   calf: 3,    ankle: 2,    inseam: 0.75 },
  },
  skirt: {
    fitted:   { waist: 0.75, hips: 1.5 },
    standard: { waist: 1.25, hips: 2.5 },
    loose:    { waist: 2,    hips: 4 },
  },
  agbada: {
    fitted:   { bust: 4,    chest: 4,    shoulder: 0.75, neck: 0.75 },
    standard: { bust: 7,    chest: 7,    shoulder: 1.5,  neck: 1.25 },
    loose:    { bust: 10,   chest: 10,   shoulder: 2.5,  neck: 1.5 },
  },
  suit: {
    fitted:   { bust: 3,    chest: 3,    waist: 2,    shoulder: 0.5,  wrist: 0.75 },
    standard: { bust: 4,    chest: 4,    waist: 2.5,  shoulder: 0.5,  wrist: 1 },
    loose:    { bust: 5.5,  chest: 5.5,  waist: 3,    shoulder: 0.75, wrist: 1.25 },
  },
  jumpsuit: {
    fitted:   { bust: 2,    chest: 2,    waist: 1.25, hips: 2,    thigh: 1.5, ankle: 0.75, inseam: 0.5 },
    standard: { bust: 3,    chest: 3,    waist: 2,    hips: 3,    thigh: 2.5, ankle: 1.25, inseam: 0.5 },
    loose:    { bust: 5,    chest: 5,    waist: 3,    hips: 5,    thigh: 4,   ankle: 2,    inseam: 0.75 },
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
        // Round to nearest 1/8" — practical tailoring resolution
        cutting: Math.round((bodyVal + easeVal) * 8) / 8,
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
