/* -------------------------------------------------------------------------- */
/*  Pattern Panel Generator                                                    */
/*  Turns a measurement set + garment type + fit into a list of cuttable       */
/*  rectangular panels (inches), with seam allowances baked in.                */
/*                                                                              */
/*  This is a starting point — not a full block-pattern engine. It produces    */
/*  the *bounding rectangles* a tailor needs to lay out fabric and a cut list  */
/*  with seam allowances added. Curves (princess seams, darts, armholes) are   */
/*  drafted by hand on top of these panels.                                    */
/* -------------------------------------------------------------------------- */

import { calculateEase, type FitType } from "./ease-allowance";
import { roundEighth } from "./units";

export interface PatternPanel {
  /** Human-readable panel name. */
  name: string;
  /** Panel width in inches, INCLUDING seam allowances. */
  width: number;
  /** Panel height/length in inches, INCLUDING seam allowances. */
  length: number;
  /** How many of this panel to cut. */
  quantity: number;
  /** Whether to cut on the fold (halves the actual fabric needed). */
  onFold?: boolean;
  /** Notes shown to the tailor: dart positions, grain direction, etc. */
  notes?: string;
}

export interface PatternPlan {
  garmentLabel: string;
  fitLabel: FitType;
  /** Standard seam allowance applied (inches). */
  seamAllowance: number;
  /** Hem allowance (inches). */
  hemAllowance: number;
  panels: PatternPanel[];
  /** Total fabric estimate (yards) at the given fabric width. */
  fabricYardage: number;
  /** Fabric width assumed (inches) — Nigerian fabric is usually 44–60". */
  fabricWidth: number;
  warnings: string[];
}

/* -------------------------------------------------------------------------- */
/*  Industry-standard allowances                                                */
/* -------------------------------------------------------------------------- */

const STANDARD_SEAM = 0.5;     // 1/2" — typical for woven garments
const STANDARD_HEM_BODICE = 1; // 1" hem on bodice/sleeves
const STANDARD_HEM_BOTTOM = 2; // 2" hem on skirts/trousers/dresses

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function r(v: number): number { return roundEighth(v); }

function need(label: string, val: number | undefined, warnings: string[]): number {
  if (typeof val === "number" && val > 0) return val;
  warnings.push(`Missing measurement: ${label}. Used a fallback estimate.`);
  return 0;
}

/* -------------------------------------------------------------------------- */
/*  Garment-specific panel generators                                           */
/* -------------------------------------------------------------------------- */

function topPanels(
  m: Record<string, number>,
  fit: FitType,
  warnings: string[],
): PatternPanel[] {
  const ease = calculateEase("top", fit, m);
  const bustC  = ease?.results.bust?.cutting  ?? need("bust",  m.bust,  warnings);
  const waistC = ease?.results.waist?.cutting ?? need("waist", m.waist, warnings);
  const blouseLen = need("blouseLength", m.blouseLength, warnings) || (need("backLength", m.backLength, warnings) * 1.6);
  const armCut = ease?.results.armLength?.cutting ?? need("armLength", m.armLength, warnings);
  const wristC = ease?.results.wrist?.cutting ?? need("wrist", m.wrist, warnings);
  const shoulder = ease?.results.shoulder?.cutting ?? need("shoulder", m.shoulder, warnings);

  // Bodice: half-bust (cut on fold) × full length
  const bodiceWidth = bustC / 2 + STANDARD_SEAM * 2;
  const bodiceLen   = blouseLen + STANDARD_SEAM + STANDARD_HEM_BODICE;

  // Sleeve: round-arm (or upper-arm × 1.4) × arm length
  const upperArm = m.roundArm ?? bustC * 0.16;
  const sleeveWidth = upperArm + STANDARD_SEAM * 2;
  const sleeveLen   = armCut + STANDARD_SEAM + STANDARD_HEM_BODICE;

  return [
    {
      name: "Front bodice",
      width:   r(bodiceWidth),
      length:  r(bodiceLen),
      quantity: 1,
      onFold: true,
      notes: `Bust ${bustC}" / Waist ${waistC}". Mark bust dart, shoulder ${shoulder}".`,
    },
    {
      name: "Back bodice",
      width:   r(bodiceWidth),
      length:  r(bodiceLen),
      quantity: 1,
      onFold: true,
      notes: `Mark back-neck curve, shoulder seam, and waist dart.`,
    },
    {
      name: "Sleeve",
      width:  r(sleeveWidth),
      length: r(sleeveLen),
      quantity: 2,
      notes: `Cap ease at top, taper to wrist ${wristC}".`,
    },
  ];
}

function dressPanels(
  m: Record<string, number>,
  fit: FitType,
  warnings: string[],
): PatternPanel[] {
  const ease = calculateEase("dress", fit, m);
  const bustC  = ease?.results.bust?.cutting  ?? need("bust",  m.bust,  warnings);
  const waistC = ease?.results.waist?.cutting ?? need("waist", m.waist, warnings);
  const hipsC  = ease?.results.hips?.cutting  ?? need("hips",  m.hips,  warnings);
  const fullLen = need("fullLength", m.fullLength, warnings) || (need("backLength", m.backLength, warnings) * 4);
  const sleeveLen = ease?.results.sleeveLength?.cutting ?? m.sleeveLength ?? 0;

  // Combined bodice + skirt as a single dress front (cut on fold)
  const widest = Math.max(bustC, waistC, hipsC);
  const dressWidth = widest / 2 + STANDARD_SEAM * 2;

  return [
    {
      name: "Front dress panel",
      width:  r(dressWidth),
      length: r(fullLen + STANDARD_SEAM + STANDARD_HEM_BOTTOM),
      quantity: 1,
      onFold: true,
      notes: `Bust ${bustC}" → Waist ${waistC}" → Hips ${hipsC}". Bust dart at side, waist dart at front.`,
    },
    {
      name: "Back dress panel",
      width:  r(dressWidth),
      length: r(fullLen + STANDARD_SEAM + STANDARD_HEM_BOTTOM),
      quantity: 1,
      onFold: true,
      notes: `Add CB zipper or split hem if needed.`,
    },
    sleeveLen > 0 ? {
      name: "Sleeve",
      width:  r((m.roundArm ?? bustC * 0.16) + STANDARD_SEAM * 2),
      length: r(sleeveLen + STANDARD_SEAM + STANDARD_HEM_BODICE),
      quantity: 2,
      notes: "Set-in sleeve. Cap ease ~1\".",
    } : null,
  ].filter(Boolean) as PatternPanel[];
}

function trousersPanels(
  m: Record<string, number>,
  fit: FitType,
  warnings: string[],
): PatternPanel[] {
  const ease = calculateEase("trousers", fit, m);
  const waistC  = ease?.results.waist?.cutting  ?? need("waist", m.waist, warnings);
  const hipsC   = ease?.results.hips?.cutting   ?? need("hips",  m.hips,  warnings);
  const thighC  = ease?.results.thigh?.cutting  ?? need("thigh", m.thigh, warnings);
  const ankleC  = ease?.results.ankle?.cutting  ?? m.ankle ?? thighC * 0.6;
  const inseam  = ease?.results.inseam?.cutting ?? need("inseam", m.inseam, warnings);
  const crotch  = m.crotchLength ?? 12;

  // Trouser front/back: half-hip width × (inseam + crotch rise)
  const halfHip = hipsC / 2;
  const legLen  = inseam + crotch / 2;
  const legWidth = Math.max(halfHip, thighC / 2 + 1) + STANDARD_SEAM * 2;

  return [
    {
      name: "Trouser front",
      width:  r(legWidth),
      length: r(legLen + STANDARD_SEAM + STANDARD_HEM_BOTTOM),
      quantity: 2,
      notes: `Waist ${waistC}" / Hip ${hipsC}". Front pleat or dart, taper to ankle ${ankleC}".`,
    },
    {
      name: "Trouser back",
      width:  r(legWidth + 0.5),
      length: r(legLen + STANDARD_SEAM + STANDARD_HEM_BOTTOM),
      quantity: 2,
      notes: "Slightly wider than front. Add back darts.",
    },
    {
      name: "Waistband",
      width:  r(waistC + STANDARD_SEAM * 2),
      length: r(2 * 2 + STANDARD_SEAM * 2), // 2" finished, doubled
      quantity: 1,
      notes: "Interface for stiffness.",
    },
  ];
}

function skirtPanels(
  m: Record<string, number>,
  fit: FitType,
  warnings: string[],
): PatternPanel[] {
  const ease = calculateEase("skirt", fit, m);
  const waistC = ease?.results.waist?.cutting ?? need("waist", m.waist, warnings);
  const hipsC  = ease?.results.hips?.cutting  ?? need("hips",  m.hips,  warnings);
  const len = need("halfLength", m.halfLength, warnings) || need("knee", m.knee, warnings) * 1.2;

  return [
    {
      name: "Front skirt",
      width:  r(hipsC / 2 + STANDARD_SEAM * 2),
      length: r(len + STANDARD_SEAM + STANDARD_HEM_BOTTOM),
      quantity: 1,
      onFold: true,
      notes: `Taper from hip ${hipsC}" to waist ${waistC}".`,
    },
    {
      name: "Back skirt",
      width:  r(hipsC / 2 + STANDARD_SEAM * 2),
      length: r(len + STANDARD_SEAM + STANDARD_HEM_BOTTOM),
      quantity: 1,
      onFold: true,
      notes: "Add CB zipper or vent if pencil skirt.",
    },
    {
      name: "Waistband",
      width:  r(waistC + STANDARD_SEAM * 2),
      length: r(2 * 2 + STANDARD_SEAM * 2),
      quantity: 1,
    },
  ];
}

function agbadaPanels(
  m: Record<string, number>,
  fit: FitType,
  warnings: string[],
): PatternPanel[] {
  const ease = calculateEase("agbada", fit, m);
  const bustC = ease?.results.bust?.cutting ?? need("bust", m.bust, warnings);
  const fullLen = need("fullLength", m.fullLength, warnings);
  // Agbada has wide flowing sleeves — width per side ≈ full-length × 0.55
  const sleeveSpan = fullLen * 0.55;

  return [
    {
      name: "Agbada front",
      width:  r(bustC / 2 + 4 + STANDARD_SEAM * 2), // extra 4" drape
      length: r(fullLen + STANDARD_SEAM + STANDARD_HEM_BOTTOM),
      quantity: 1,
      onFold: true,
      notes: "Centre-front opening. Embroidery placement marked here.",
    },
    {
      name: "Agbada back",
      width:  r(bustC / 2 + 4 + STANDARD_SEAM * 2),
      length: r(fullLen + STANDARD_SEAM + STANDARD_HEM_BOTTOM),
      quantity: 1,
      onFold: true,
    },
    {
      name: "Sleeve drape",
      width:  r(sleeveSpan + STANDARD_SEAM * 2),
      length: r(fullLen * 0.5 + STANDARD_SEAM + STANDARD_HEM_BODICE),
      quantity: 2,
      notes: "Wide flowing sleeve — extra width gives the drape.",
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Yardage estimate                                                            */
/*  Sums panel area, divides by fabric width, adds 10% wastage.                */
/* -------------------------------------------------------------------------- */

function estimateYardage(panels: PatternPanel[], fabricWidthIn: number): number {
  let runningLengthIn = 0;
  for (const p of panels) {
    const layoutWidth = p.onFold ? p.width * 2 : p.width;
    const piecesPerRow = Math.max(1, Math.floor(fabricWidthIn / layoutWidth));
    const rows = Math.ceil(p.quantity / piecesPerRow);
    runningLengthIn += rows * p.length;
  }
  // 10% wastage
  const total = runningLengthIn * 1.10;
  return Math.ceil((total / 36) * 4) / 4; // round up to nearest 1/4 yard
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                  */
/* -------------------------------------------------------------------------- */

const ALIASES: Record<string, "top" | "dress" | "trousers" | "skirt" | "agbada"> = {
  top: "top", shirt: "top", blouse: "top",
  dress: "dress", gown: "dress",
  trousers: "trousers", pants: "trousers", suit: "trousers",
  skirt: "skirt",
  agbada: "agbada", kaftan: "agbada", jumpsuit: "trousers",
};

export function generatePatternPlan(
  measurements: Record<string, number>,
  garmentType: string,
  fit: FitType = "standard",
  fabricWidthIn: number = 60,
): PatternPlan | null {
  const key = ALIASES[garmentType.toLowerCase().trim()];
  if (!key) return null;

  const warnings: string[] = [];
  let panels: PatternPanel[] = [];

  switch (key) {
    case "top":      panels = topPanels(measurements, fit, warnings); break;
    case "dress":    panels = dressPanels(measurements, fit, warnings); break;
    case "trousers": panels = trousersPanels(measurements, fit, warnings); break;
    case "skirt":    panels = skirtPanels(measurements, fit, warnings); break;
    case "agbada":   panels = agbadaPanels(measurements, fit, warnings); break;
  }

  return {
    garmentLabel: garmentType,
    fitLabel: fit,
    seamAllowance: STANDARD_SEAM,
    hemAllowance: STANDARD_HEM_BOTTOM,
    panels,
    fabricYardage: estimateYardage(panels, fabricWidthIn),
    fabricWidth: fabricWidthIn,
    warnings,
  };
}

/** Convenience formatter: a tailor-friendly cut list string. */
export function formatCutList(plan: PatternPlan): string {
  const lines: string[] = [
    `*Cut list — ${plan.garmentLabel} (${plan.fitLabel} fit)*`,
    `Seam allowance: ${plan.seamAllowance}"  ·  Hem: ${plan.hemAllowance}"`,
    `Fabric needed: ~${plan.fabricYardage} yards @ ${plan.fabricWidth}" wide`,
    "",
  ];
  for (const p of plan.panels) {
    lines.push(`• ${p.name} × ${p.quantity}${p.onFold ? " (on fold)" : ""}`);
    lines.push(`    ${p.width}" wide × ${p.length}" long`);
    if (p.notes) lines.push(`    ↳ ${p.notes}`);
  }
  if (plan.warnings.length) {
    lines.push("");
    lines.push("*Notes:*");
    for (const w of plan.warnings) lines.push(`  ⚠ ${w}`);
  }
  return lines.join("\n");
}
