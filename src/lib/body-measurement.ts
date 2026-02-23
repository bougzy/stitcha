"use client";

/* -------------------------------------------------------------------------- */
/*  AI Body Measurement Module                                                 */
/*  Uses MediaPipe PoseLandmarker for real body landmark detection             */
/*  Calibrated for African & Nigerian body types                               */
/*  Runs entirely in the browser — photos never leave the device              */
/* -------------------------------------------------------------------------- */

/* ---- Landmark indices (MediaPipe Pose 33-point model) ---- */
const L = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/* ---- Types ---- */
interface Landmark {
  x: number; // normalized 0-1
  y: number;
  z: number;
  visibility?: number;
}

export interface MeasurementResult {
  measurements: Record<string, number>;
  confidence: number;
  landmarkQuality: number;
}

export type BodyGender = "male" | "female";

/* -------------------------------------------------------------------------- */
/*  African Body Type Calibration Constants                                     */
/*  Based on anthropometric studies of West African / Nigerian populations      */
/*  Sources: ISO 8559, WEAR studies, West African tailoring conventions         */
/*                                                                              */
/*  Key differences vs generic/Western models:                                  */
/*  - Women: Fuller bust and hips relative to waist (more pronounced curves)   */
/*  - Women: Slightly wider hips relative to shoulders                          */
/*  - Men: Broader shoulders, fuller chest, slightly shorter torso ratio        */
/*  - Both: Slightly longer limb proportions relative to torso                  */
/*  - Both: Different waist-to-hip ratios than Western averages                 */
/* -------------------------------------------------------------------------- */

const BODY_RATIOS = {
  female: {
    // Circumference multipliers from front-view width measurements
    bustFromShoulder: 2.65,       // Was 2.55 — African women: fuller bust
    chestFromShoulder: 2.60,      // Slightly less than bust
    waistFromHipWidth: 2.25,      // Was 2.35 — more defined waist
    hipsFromHipWidth: 2.65,       // Was 2.5 — fuller hips
    // Ellipse adjustments for side-view calculations
    bustHalfWidthRatio: 0.54,     // Was 0.52
    waistHalfWidthRatio: 0.46,    // Was 0.48 — narrower waist
    hipHalfWidthRatio: 0.60,      // Was 0.58 — wider hips
    chestDepthFactor: 0.92,       // Was 0.9
    hipDepthFactor: 1.15,         // Was 1.1 — more depth
    waistDepthFactor: 0.80,       // Was 0.85 — more defined waist
    // Neck: African women typically have slightly thicker necks
    neckWidthFromEars: 0.68,      // Was 0.65
    neckCircFactor: 0.34,         // Was 0.33
    // Thigh: Fuller thighs relative to hip
    thighWidthFromHip: 0.42,      // Was 0.38
    thighCircFactor: 2.35,        // Was 2.3
    // Back / front length curve correction
    backLengthCurveCorrection: 1.18,  // Was 1.15 — accounts for bust/posture
    frontToBackRatio: 0.93,           // Was 0.95 — slightly shorter front
    // Weight: Average BMI for Nigerian women (WHO/NPC data)
    averageBMI: 24.5,             // Was 22.5 — Nigerian avg is slightly higher
    // Wrist
    wristFactor: 0.82,           // Was 0.85
    // Calf
    calfFromKnee: 0.90,          // Was 0.88
    calfCircFactor: 2.25,        // Was 2.2
    // Knee
    kneeCircFactor: 1.18,        // Was 1.15
  },
  male: {
    // Circumference multipliers from front-view width measurements
    bustFromShoulder: 2.52,       // Men: broader chest relative to frame
    chestFromShoulder: 2.52,
    waistFromHipWidth: 2.45,      // Less waist definition than women
    hipsFromHipWidth: 2.42,       // Narrower hips relative to women
    // Ellipse adjustments
    bustHalfWidthRatio: 0.53,
    waistHalfWidthRatio: 0.50,
    hipHalfWidthRatio: 0.54,
    chestDepthFactor: 0.88,
    hipDepthFactor: 1.05,
    waistDepthFactor: 0.88,
    // Neck: Men have thicker necks
    neckWidthFromEars: 0.72,
    neckCircFactor: 0.36,
    // Thigh
    thighWidthFromHip: 0.36,
    thighCircFactor: 2.25,
    // Back / front length
    backLengthCurveCorrection: 1.12,
    frontToBackRatio: 0.96,
    // Weight: Average BMI for Nigerian men
    averageBMI: 23.8,
    // Wrist
    wristFactor: 0.88,
    // Calf
    calfFromKnee: 0.86,
    calfCircFactor: 2.15,
    // Knee
    kneeCircFactor: 1.12,
  },
} as const;

/* ---- Math helpers ---- */
function dist2D(a: Landmark, b: Landmark, w: number, h: number): number {
  const dx = (a.x - b.x) * w;
  const dy = (a.y - b.y) * h;
  return Math.sqrt(dx * dx + dy * dy);
}

function midY(a: Landmark, b: Landmark): number {
  return (a.y + b.y) / 2;
}

function midX(a: Landmark, b: Landmark): number {
  return (a.x + b.x) / 2;
}

/** Ramanujan's approximation for ellipse circumference */
function ellipseCirc(a: number, b: number): number {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Clamp a value within a plausible range based on height */
function clampMeasurement(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/* -------------------------------------------------------------------------- */
/*  Plausibility ranges — sanity checks for measurements (in cm)               */
/*  Prevents obviously wrong results from being returned                       */
/* -------------------------------------------------------------------------- */

function getPlausibleRanges(heightCm: number, gender: BodyGender) {
  const h = heightCm;
  const isFemale = gender === "female";
  return {
    bust:        { min: h * 0.45, max: h * 0.80 },
    chest:       { min: h * 0.45, max: h * 0.80 },
    waist:       { min: h * 0.35, max: h * 0.75 },
    hips:        { min: h * 0.48, max: h * 0.85 },
    shoulder:    { min: h * 0.20, max: h * 0.35 },
    armLength:   { min: h * 0.28, max: h * 0.42 },
    inseam:      { min: h * 0.38, max: h * 0.55 },
    neck:        { min: isFemale ? 28 : 32, max: isFemale ? 44 : 52 },
    backLength:  { min: h * 0.18, max: h * 0.32 },
    frontLength: { min: h * 0.16, max: h * 0.30 },
    sleeveLength:{ min: h * 0.27, max: h * 0.41 },
    wrist:       { min: 12, max: 24 },
    thigh:       { min: h * 0.25, max: h * 0.50 },
    knee:        { min: h * 0.18, max: h * 0.32 },
    calf:        { min: h * 0.16, max: h * 0.30 },
    ankle:       { min: 16, max: 32 },
  };
}

/* -------------------------------------------------------------------------- */
/*  PoseLandmarker initialisation                                              */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PoseLandmarkerType = any;

export async function initPoseLandmarker(): Promise<PoseLandmarkerType> {
  // Dynamic import — only loads in the browser
  const vision = await import("@mediapipe/tasks-vision");
  const { PoseLandmarker, FilesetResolver } = vision;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
  );

  // Use the full model for better accuracy on diverse body types
  const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    numPoses: 1,
  });

  return poseLandmarker;
}

/* -------------------------------------------------------------------------- */
/*  Detect landmarks from an image element                                     */
/* -------------------------------------------------------------------------- */

export async function detectLandmarks(
  poseLandmarker: PoseLandmarkerType,
  img: HTMLImageElement
): Promise<Landmark[] | null> {
  const result = poseLandmarker.detect(img);
  if (!result.landmarks || result.landmarks.length === 0) return null;
  return result.landmarks[0] as Landmark[];
}

/* -------------------------------------------------------------------------- */
/*  Load image from data-URL into an HTMLImageElement                          */
/* -------------------------------------------------------------------------- */

export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/* -------------------------------------------------------------------------- */
/*  Calculate body measurements from front + side landmarks                    */
/*  Gender-aware calibration for African / Nigerian body types                 */
/* -------------------------------------------------------------------------- */

export function calculateMeasurements(
  front: Landmark[],
  side: Landmark[] | null,
  heightCm: number,
  frontW: number,
  frontH: number,
  sideW?: number,
  sideH?: number,
  gender: BodyGender = "female"
): MeasurementResult {
  const R = BODY_RATIOS[gender];
  const ranges = getPlausibleRanges(heightCm, gender);

  /* ---- Scale factor from known height ---- */
  const noseY = front[L.NOSE].y;
  const shoulderMidY = midY(front[L.LEFT_SHOULDER], front[L.RIGHT_SHOULDER]);
  // Estimate top of head (above nose by ~55% of nose-to-shoulder distance)
  const headTopY = Math.max(0, noseY - (shoulderMidY - noseY) * 0.55);
  // Feet = lowest visible point
  const feetY = Math.max(
    front[L.LEFT_ANKLE].y,
    front[L.RIGHT_ANKLE].y,
    front[L.LEFT_HEEL]?.y ?? front[L.LEFT_ANKLE].y,
    front[L.RIGHT_HEEL]?.y ?? front[L.RIGHT_ANKLE].y
  );
  const bodyHeightPx = (feetY - headTopY) * frontH;
  const scale = bodyHeightPx > 0 ? heightCm / bodyHeightPx : 1;

  const cm = (px: number) => px * scale;

  /* ---- Shoulder width ---- */
  const shoulderPx = dist2D(front[L.LEFT_SHOULDER], front[L.RIGHT_SHOULDER], frontW, frontH);
  const shoulder = clampMeasurement(cm(shoulderPx), ranges.shoulder.min, ranges.shoulder.max);

  /* ---- Arm length (average L+R: shoulder → elbow → wrist) ---- */
  const leftArmPx =
    dist2D(front[L.LEFT_SHOULDER], front[L.LEFT_ELBOW], frontW, frontH) +
    dist2D(front[L.LEFT_ELBOW], front[L.LEFT_WRIST], frontW, frontH);
  const rightArmPx =
    dist2D(front[L.RIGHT_SHOULDER], front[L.RIGHT_ELBOW], frontW, frontH) +
    dist2D(front[L.RIGHT_ELBOW], front[L.RIGHT_WRIST], frontW, frontH);
  const armLength = clampMeasurement(cm((leftArmPx + rightArmPx) / 2), ranges.armLength.min, ranges.armLength.max);

  /* ---- Sleeve length ---- */
  const sleeveLength = clampMeasurement(armLength * 0.97, ranges.sleeveLength.min, ranges.sleeveLength.max);

  /* ---- Inseam (hip centre → knee → ankle, average L+R) ---- */
  const hipCenterY = midY(front[L.LEFT_HIP], front[L.RIGHT_HIP]);
  const hipCenterX = midX(front[L.LEFT_HIP], front[L.RIGHT_HIP]);
  const hipCenter: Landmark = { x: hipCenterX, y: hipCenterY, z: 0 };
  const leftInseam =
    dist2D(hipCenter, front[L.LEFT_KNEE], frontW, frontH) +
    dist2D(front[L.LEFT_KNEE], front[L.LEFT_ANKLE], frontW, frontH);
  const rightInseam =
    dist2D(hipCenter, front[L.RIGHT_KNEE], frontW, frontH) +
    dist2D(front[L.RIGHT_KNEE], front[L.RIGHT_ANKLE], frontW, frontH);
  const inseam = clampMeasurement(cm((leftInseam + rightInseam) / 2), ranges.inseam.min, ranges.inseam.max);

  /* ---- Back / front length (shoulder midpoint → waist estimate) ---- */
  const waistRatio = gender === "female" ? 0.53 : 0.55; // Women: waist sits slightly higher
  const hipMidY = midY(front[L.LEFT_HIP], front[L.RIGHT_HIP]);
  const waistY = shoulderMidY + (hipMidY - shoulderMidY) * waistRatio;
  const backLengthPx = (waistY - shoulderMidY) * frontH;
  const backLength = clampMeasurement(
    cm(backLengthPx) * R.backLengthCurveCorrection,
    ranges.backLength.min,
    ranges.backLength.max
  );
  const frontLength = clampMeasurement(
    backLength * R.frontToBackRatio,
    ranges.frontLength.min,
    ranges.frontLength.max
  );

  /* ---- Hip width (from front landmarks) ---- */
  const hipWidthPx = dist2D(front[L.LEFT_HIP], front[L.RIGHT_HIP], frontW, frontH);
  const hipWidthCm = cm(hipWidthPx);

  /* ---- Circumference estimates ---- */
  let bust: number, waist: number, hips: number, chest: number;

  if (side && sideW && sideH) {
    // Use both views for elliptical circumference (most accurate)
    const sideNoseY = side[L.NOSE].y;
    const sideShouldMidY = midY(side[L.LEFT_SHOULDER], side[L.RIGHT_SHOULDER]);
    const sideHeadTopY = Math.max(0, sideNoseY - (sideShouldMidY - sideNoseY) * 0.55);
    const sideFeetY = Math.max(side[L.LEFT_ANKLE].y, side[L.RIGHT_ANKLE].y);
    const sideBodyPx = (sideFeetY - sideHeadTopY) * sideH;
    const sideScale = sideBodyPx > 0 ? heightCm / sideBodyPx : scale;
    const sCm = (px: number) => px * sideScale;

    // Side body depth at chest level
    const sideShoulderWidthPx = dist2D(side[L.LEFT_SHOULDER], side[L.RIGHT_SHOULDER], sideW, sideH);
    const chestDepthCm = sCm(sideShoulderWidthPx) * R.chestDepthFactor;

    // Side body depth at hip level
    const sideHipWidthPx = dist2D(side[L.LEFT_HIP], side[L.RIGHT_HIP], sideW, sideH);
    const hipDepthCm = sCm(sideHipWidthPx) * R.hipDepthFactor;

    const waistDepthCm = (chestDepthCm + hipDepthCm) / 2 * R.waistDepthFactor;

    // Ellipse circumferences (half-widths), gender-calibrated
    const bustHalfW = shoulder * R.bustHalfWidthRatio;
    const waistHalfW = hipWidthCm * R.waistHalfWidthRatio;
    const hipHalfW = hipWidthCm * R.hipHalfWidthRatio;

    bust = ellipseCirc(bustHalfW, chestDepthCm / 2);
    chest = bust;
    waist = ellipseCirc(waistHalfW, waistDepthCm / 2);
    hips = ellipseCirc(hipHalfW, hipDepthCm / 2);
  } else {
    // Fallback: gender-calibrated anthropometric ratio estimation
    bust = shoulder * R.bustFromShoulder;
    chest = shoulder * R.chestFromShoulder;
    waist = hipWidthCm * R.waistFromHipWidth;
    hips = hipWidthCm * R.hipsFromHipWidth;
  }

  // Clamp circumferences to plausible ranges
  bust = clampMeasurement(bust, ranges.bust.min, ranges.bust.max);
  chest = clampMeasurement(chest, ranges.chest.min, ranges.chest.max);
  waist = clampMeasurement(waist, ranges.waist.min, ranges.waist.max);
  hips = clampMeasurement(hips, ranges.hips.min, ranges.hips.max);

  /* ---- Neck circumference (gender-calibrated) ---- */
  const earDist = dist2D(front[L.LEFT_EAR], front[L.RIGHT_EAR], frontW, frontH);
  const neckWidth = cm(earDist) * R.neckWidthFromEars;
  const neck = clampMeasurement(neckWidth * Math.PI * R.neckCircFactor, ranges.neck.min, ranges.neck.max);

  /* ---- Thigh circumference (gender-calibrated) ---- */
  const thighWidthEstimate = hipWidthCm * R.thighWidthFromHip;
  const thigh = clampMeasurement(thighWidthEstimate * R.thighCircFactor, ranges.thigh.min, ranges.thigh.max);

  /* ---- Knee circumference ---- */
  const kneeWidthPx = dist2D(front[L.LEFT_KNEE], front[L.RIGHT_KNEE], frontW, frontH);
  const kneeWidth = cm(kneeWidthPx);
  const knee = clampMeasurement(kneeWidth * R.kneeCircFactor, ranges.knee.min, ranges.knee.max);

  /* ---- Calf ---- */
  const calfWidth = kneeWidth * R.calfFromKnee;
  const calf = clampMeasurement(calfWidth * R.calfCircFactor, ranges.calf.min, ranges.calf.max);

  /* ---- Ankle ---- */
  const ankleWidthPx = dist2D(front[L.LEFT_ANKLE], front[L.RIGHT_ANKLE], frontW, frontH);
  const ankle = clampMeasurement(cm(ankleWidthPx) * 1.0, ranges.ankle.min, ranges.ankle.max);

  /* ---- Wrist ---- */
  const wristWidthPx = dist2D(front[L.LEFT_WRIST], front[L.RIGHT_WRIST], frontW, frontH);
  const wrist = clampMeasurement(cm(wristWidthPx) * R.wristFactor, ranges.wrist.min, ranges.wrist.max);

  /* ---- Weight estimate (gender-calibrated for Nigerian population) ---- */
  const heightM = heightCm / 100;
  const weight = R.averageBMI * heightM * heightM;

  /* ---- Confidence score ---- */
  const keyIndices = [
    L.LEFT_SHOULDER, L.RIGHT_SHOULDER,
    L.LEFT_HIP, L.RIGHT_HIP,
    L.LEFT_KNEE, L.RIGHT_KNEE,
    L.LEFT_ANKLE, L.RIGHT_ANKLE,
    L.LEFT_ELBOW, L.RIGHT_ELBOW,
    L.LEFT_WRIST, L.RIGHT_WRIST,
  ];
  const avgVisibility =
    keyIndices.reduce((sum, i) => sum + (front[i]?.visibility ?? 0), 0) / keyIndices.length;

  // Side photo boosts confidence significantly
  const sideBonus = side ? 0.12 : 0;
  // Full model gives higher base confidence
  const confidence = Math.min(0.95, Math.max(0.55, avgVisibility * 0.85 + sideBonus));

  return {
    measurements: {
      bust: round1(bust),
      waist: round1(waist),
      hips: round1(hips),
      shoulder: round1(shoulder),
      armLength: round1(armLength),
      inseam: round1(inseam),
      neck: round1(neck),
      chest: round1(chest),
      backLength: round1(backLength),
      frontLength: round1(frontLength),
      sleeveLength: round1(sleeveLength),
      wrist: round1(wrist),
      thigh: round1(thigh),
      knee: round1(knee),
      calf: round1(calf),
      ankle: round1(ankle),
      height: round1(heightCm),
      weight: round1(weight),
    },
    confidence: round1(confidence),
    landmarkQuality: round1(avgVisibility),
  };
}
