/* -------------------------------------------------------------------------- */
/*  Fabric & Material Calculator                                              */
/*  Estimates yardage needed based on measurements, garment, and fabric width */
/* -------------------------------------------------------------------------- */

/** Standard fabric widths in Nigeria (in centimeters) */
export const FABRIC_WIDTHS = [
  { value: 114, label: '45" (Ankara Standard)', shortLabel: '45"' },
  { value: 137, label: '54" (Medium Width)', shortLabel: '54"' },
  { value: 152, label: '60" (Wide / Lace)', shortLabel: '60"' },
] as const;

interface Measurements {
  bust?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  armLength?: number;
  inseam?: number;
  neck?: number;
  chest?: number;
  backLength?: number;
  frontLength?: number;
  sleeveLength?: number;
  wrist?: number;
  thigh?: number;
  knee?: number;
  calf?: number;
  ankle?: number;
  height?: number;
  weight?: number;
}

export interface FabricEstimate {
  totalYards: number;
  totalMeters: number;
  breakdown: { label: string; cm: number }[];
  tips: string[];
  garmentLabel: string;
}

const CM_PER_YARD = 91.44;
const SEAM_ALLOWANCE = 4; // cm per seam
const WASTE_FACTOR = 1.12; // 12% for cutting waste, alignment, shrinkage

function widthsNeeded(bodyCircumference: number, fabricWidthCm: number): number {
  // How many fabric widths are needed to go around the body
  const halfCirc = bodyCircumference / 2 + SEAM_ALLOWANCE * 2;
  return Math.ceil(halfCirc / (fabricWidthCm - SEAM_ALLOWANCE * 2));
}

/* -------------------------------------------------------------------------- */
/*  Per-garment estimators                                                    */
/* -------------------------------------------------------------------------- */

function estimateTop(m: Measurements, fw: number): FabricEstimate {
  const bodyLength = Math.max(m.frontLength || 65, m.backLength || 65) + SEAM_ALLOWANCE * 2;
  const circumference = Math.max(m.bust || 90, m.chest || 90) + 10;
  const wn = widthsNeeded(circumference, fw);
  const bodyFabric = bodyLength * wn;

  const sleeveLen = (m.sleeveLength || m.armLength || 60) + SEAM_ALLOWANCE * 2;
  const sleeveFabric = sleeveLen * 2;

  const breakdown = [
    { label: "Body panels", cm: bodyFabric },
    { label: "Sleeves (×2)", cm: sleeveFabric },
    { label: "Collar & facings", cm: 20 },
  ];

  const totalCm = breakdown.reduce((s, b) => s + b.cm, 0) * WASTE_FACTOR;

  return {
    totalYards: Math.ceil((totalCm / CM_PER_YARD) * 4) / 4,
    totalMeters: Math.round(totalCm) / 100,
    breakdown,
    tips: ["Add 0.25 yards extra if pattern matching is needed."],
    garmentLabel: "Top / Blouse",
  };
}

function estimateDress(m: Measurements, fw: number): FabricEstimate {
  const fullLength = m.height ? m.height * 0.62 : (m.frontLength || 65) + 45;
  const circumference = Math.max(m.bust || 92, m.hips || 96) + 12;
  const wn = widthsNeeded(circumference, fw);
  const bodyFabric = (fullLength + SEAM_ALLOWANCE * 2) * wn;

  const sleeveLen = (m.sleeveLength || m.armLength || 55) + SEAM_ALLOWANCE * 2;
  const sleeveFabric = sleeveLen * 2;

  const breakdown = [
    { label: "Bodice + Skirt panels", cm: bodyFabric },
    { label: "Sleeves (×2)", cm: sleeveFabric },
    { label: "Collar, zip & facings", cm: 25 },
  ];

  const totalCm = breakdown.reduce((s, b) => s + b.cm, 0) * WASTE_FACTOR;

  return {
    totalYards: Math.ceil((totalCm / CM_PER_YARD) * 4) / 4,
    totalMeters: Math.round(totalCm) / 100,
    breakdown,
    tips: [
      "Floor-length gowns may need 0.5–1 yard more.",
      "Flared or A-line styles require extra width.",
    ],
    garmentLabel: "Dress / Gown",
  };
}

function estimateTrousers(m: Measurements, fw: number): FabricEstimate {
  const legLength = (m.inseam || (m.height ? m.height * 0.45 : 80)) + 30; // inseam + rise
  const hipCircumference = (m.hips || m.waist || 90) + 10;
  const wn = widthsNeeded(hipCircumference, fw);
  const legFabric = (legLength + SEAM_ALLOWANCE * 2) * wn * 2; // 2 legs

  const breakdown = [
    { label: "Front & back legs (×2)", cm: legFabric },
    { label: "Waistband & pockets", cm: 30 },
  ];

  const totalCm = breakdown.reduce((s, b) => s + b.cm, 0) * WASTE_FACTOR;

  return {
    totalYards: Math.ceil((totalCm / CM_PER_YARD) * 4) / 4,
    totalMeters: Math.round(totalCm) / 100,
    breakdown,
    tips: ["Wide-leg styles need 0.5 yards more than fitted styles."],
    garmentLabel: "Trousers / Pants",
  };
}

function estimateSkirt(m: Measurements, fw: number): FabricEstimate {
  const skirtLength = m.height ? m.height * 0.37 : (m.knee || 55) + 10;
  const circumference = (m.hips || 96) + 10;
  const wn = widthsNeeded(circumference, fw);
  const bodyFabric = (skirtLength + SEAM_ALLOWANCE * 2) * wn;

  const breakdown = [
    { label: "Skirt panels", cm: bodyFabric },
    { label: "Waistband & facing", cm: 20 },
  ];

  const totalCm = breakdown.reduce((s, b) => s + b.cm, 0) * WASTE_FACTOR;

  return {
    totalYards: Math.ceil((totalCm / CM_PER_YARD) * 4) / 4,
    totalMeters: Math.round(totalCm) / 100,
    breakdown,
    tips: [
      "Circle skirts need significantly more fabric.",
      "Pencil skirts can use 0.25 yards less.",
    ],
    garmentLabel: "Skirt",
  };
}

function estimateAgbada(m: Measurements, fw: number): FabricEstimate {
  const bodyLength = Math.max(m.backLength || 80, m.frontLength || 80) + 25;
  const circumference = Math.max(m.bust || 100, m.chest || 100) + 15;

  // Agbada has 3 layers: inner shirt (dansiki), trousers, outer agbada
  const innerShirt = bodyLength * widthsNeeded(circumference, fw);
  const outerAgbada = (bodyLength + 15) * 3; // wide flowing garment
  const cap = 35;

  const breakdown = [
    { label: "Inner shirt (Dansiki)", cm: innerShirt },
    { label: "Outer Agbada", cm: outerAgbada },
    { label: "Cap (Fila)", cm: cap },
  ];

  const totalCm = breakdown.reduce((s, b) => s + b.cm, 0) * WASTE_FACTOR;

  return {
    totalYards: Math.ceil((totalCm / CM_PER_YARD) * 4) / 4,
    totalMeters: Math.round(totalCm) / 100,
    breakdown,
    tips: [
      "Heavily embroidered agbada may need extra for embroidery panel.",
      "Does not include trousers — add 1.5 yards for a matching set.",
    ],
    garmentLabel: "Agbada / Kaftan",
  };
}

function estimateSuit(m: Measurements, fw: number): FabricEstimate {
  const bodyLength = Math.max(m.frontLength || 70, m.backLength || 70) + SEAM_ALLOWANCE * 2 + 10;
  const circumference = Math.max(m.bust || 96, m.chest || 96) + 14;
  const wn = widthsNeeded(circumference, fw);
  const jacketFabric = bodyLength * wn;

  const sleeveLen = (m.sleeveLength || m.armLength || 62) + SEAM_ALLOWANCE * 2;
  const sleeveFabric = sleeveLen * 2;
  const liningFabric = jacketFabric * 0.85;

  const breakdown = [
    { label: "Jacket body", cm: jacketFabric },
    { label: "Sleeves (×2)", cm: sleeveFabric },
    { label: "Collar, lapels & pockets", cm: 35 },
    { label: "Lining (separate fabric)", cm: liningFabric },
  ];

  const totalCm = breakdown.reduce((s, b) => s + b.cm, 0) * WASTE_FACTOR;

  return {
    totalYards: Math.ceil((totalCm / CM_PER_YARD) * 4) / 4,
    totalMeters: Math.round(totalCm) / 100,
    breakdown,
    tips: [
      "Lining is usually a separate (lighter) fabric — budget for it separately.",
      "Does not include trousers — add ~1.5 yards for matching trousers.",
    ],
    garmentLabel: "Suit / Blazer",
  };
}

function estimateJumpsuit(m: Measurements, fw: number): FabricEstimate {
  const topLength = Math.max(m.frontLength || 65, m.backLength || 65) + SEAM_ALLOWANCE * 2;
  const legLength = (m.inseam || (m.height ? m.height * 0.45 : 78)) + SEAM_ALLOWANCE * 2;
  const circumference = Math.max(m.bust || 92, m.hips || 96) + 12;
  const wn = widthsNeeded(circumference, fw);

  const topFabric = topLength * wn;
  const legFabric = legLength * wn * 2;
  const sleeveLen = (m.sleeveLength || m.armLength || 55) + SEAM_ALLOWANCE * 2;
  const sleeveFabric = sleeveLen * 2;

  const breakdown = [
    { label: "Bodice", cm: topFabric },
    { label: "Legs (×2)", cm: legFabric },
    { label: "Sleeves (×2)", cm: sleeveFabric },
    { label: "Facings & zipper area", cm: 25 },
  ];

  const totalCm = breakdown.reduce((s, b) => s + b.cm, 0) * WASTE_FACTOR;

  return {
    totalYards: Math.ceil((totalCm / CM_PER_YARD) * 4) / 4,
    totalMeters: Math.round(totalCm) / 100,
    breakdown,
    tips: ["Wide-leg jumpsuits need up to 1 yard extra."],
    garmentLabel: "Jumpsuit",
  };
}

/* -------------------------------------------------------------------------- */
/*  Main entry point                                                          */
/* -------------------------------------------------------------------------- */

const GARMENT_MAP: Record<string, (m: Measurements, fw: number) => FabricEstimate> = {
  top: estimateTop,
  shirt: estimateTop,
  blouse: estimateTop,
  dress: estimateDress,
  gown: estimateDress,
  trousers: estimateTrousers,
  pants: estimateTrousers,
  skirt: estimateSkirt,
  agbada: estimateAgbada,
  kaftan: estimateAgbada,
  suit: estimateSuit,
  blazer: estimateSuit,
  jumpsuit: estimateJumpsuit,
};

/**
 * Estimate fabric yardage for a given garment and measurements.
 * Returns null if garment type is not recognized.
 */
export function estimateFabric(
  garmentType: string,
  measurements: Measurements,
  fabricWidthCm: number
): FabricEstimate | null {
  const key = garmentType.toLowerCase().trim();
  const estimator = GARMENT_MAP[key];
  if (!estimator) return null;
  return estimator(measurements, fabricWidthCm);
}
