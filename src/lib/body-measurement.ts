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

interface BodyRatioSet {
  bustFromShoulder: number;
  chestFromShoulder: number;
  waistFromHipWidth: number;
  hipsFromHipWidth: number;
  bustHalfWidthRatio: number;
  waistHalfWidthRatio: number;
  hipHalfWidthRatio: number;
  chestDepthFactor: number;
  hipDepthFactor: number;
  waistDepthFactor: number;
  neckWidthFromEars: number;
  neckCircFactor: number;
  thighWidthFromHip: number;
  thighCircFactor: number;
  backLengthCurveCorrection: number;
  frontToBackRatio: number;
  averageBMI: number;
  wristFactor: number;
  calfFromKnee: number;
  calfCircFactor: number;
  kneeCircFactor: number;
}

const BASE_RATIOS: Record<BodyGender, BodyRatioSet> = {
  female: {
    bustFromShoulder: 2.65,
    chestFromShoulder: 2.60,
    waistFromHipWidth: 2.25,
    hipsFromHipWidth: 2.65,
    bustHalfWidthRatio: 0.54,
    waistHalfWidthRatio: 0.46,
    hipHalfWidthRatio: 0.60,
    chestDepthFactor: 0.92,
    hipDepthFactor: 1.15,
    waistDepthFactor: 0.80,
    neckWidthFromEars: 0.68,
    neckCircFactor: 0.34,
    thighWidthFromHip: 0.42,
    thighCircFactor: 2.35,
    backLengthCurveCorrection: 1.18,
    frontToBackRatio: 0.93,
    averageBMI: 24.5,
    wristFactor: 0.82,
    calfFromKnee: 0.90,
    calfCircFactor: 2.25,
    kneeCircFactor: 1.18,
  },
  male: {
    bustFromShoulder: 2.52,
    chestFromShoulder: 2.52,
    waistFromHipWidth: 2.45,
    hipsFromHipWidth: 2.42,
    bustHalfWidthRatio: 0.53,
    waistHalfWidthRatio: 0.50,
    hipHalfWidthRatio: 0.54,
    chestDepthFactor: 0.88,
    hipDepthFactor: 1.05,
    waistDepthFactor: 0.88,
    neckWidthFromEars: 0.72,
    neckCircFactor: 0.36,
    thighWidthFromHip: 0.36,
    thighCircFactor: 2.25,
    backLengthCurveCorrection: 1.12,
    frontToBackRatio: 0.96,
    averageBMI: 23.8,
    wristFactor: 0.88,
    calfFromKnee: 0.86,
    calfCircFactor: 2.15,
    kneeCircFactor: 1.12,
  },
};

/* -------------------------------------------------------------------------- */
/*  Dynamic Body Shape Detection & Ratio Adjustment                            */
/*  Adapts multipliers based on actual observed proportions instead of          */
/*  assuming every person matches the population average                        */
/* -------------------------------------------------------------------------- */

function computeDynamicRatios(
  front: Landmark[],
  gender: BodyGender,
  frontW: number,
  frontH: number
): BodyRatioSet {
  const base: BodyRatioSet = { ...BASE_RATIOS[gender] };

  const shoulderPx = dist2D(front[L.LEFT_SHOULDER], front[L.RIGHT_SHOULDER], frontW, frontH);
  const hipPx = dist2D(front[L.LEFT_HIP], front[L.RIGHT_HIP], frontW, frontH);

  if (shoulderPx <= 0 || hipPx <= 0) return base;

  const shoulderToHipRatio = shoulderPx / hipPx;

  if (gender === "female") {
    // Pear shape: wider hips relative to shoulders
    if (shoulderToHipRatio < 0.95) {
      const intensity = Math.min(0.15, (0.95 - shoulderToHipRatio) * 1.0);
      base.hipsFromHipWidth += intensity;
      base.hipHalfWidthRatio += intensity * 0.2;
      base.hipDepthFactor += intensity * 0.4;
      base.bustFromShoulder -= intensity * 0.3;
      base.thighWidthFromHip += intensity * 0.15;
    }
    // Inverted triangle: wide shoulders, narrower hips
    if (shoulderToHipRatio > 1.10) {
      const intensity = Math.min(0.12, (shoulderToHipRatio - 1.10) * 0.8);
      base.bustFromShoulder += intensity;
      base.chestFromShoulder += intensity;
      base.hipsFromHipWidth -= intensity;
      base.hipHalfWidthRatio -= intensity * 0.15;
    }
    // Hourglass: balanced shoulders and hips with defined waist
    if (shoulderToHipRatio >= 0.95 && shoulderToHipRatio <= 1.05) {
      base.bustFromShoulder += 0.05;
      base.hipsFromHipWidth += 0.05;
      base.waistFromHipWidth -= 0.05;
      base.waistHalfWidthRatio -= 0.02;
    }
  } else {
    // Male: V-shape (broad shoulders) vs rectangular
    if (shoulderToHipRatio > 1.15) {
      const intensity = Math.min(0.10, (shoulderToHipRatio - 1.15) * 0.7);
      base.bustFromShoulder += intensity;
      base.chestFromShoulder += intensity;
      base.waistFromHipWidth -= intensity * 0.5;
    }
    // Stocky build: shoulders close to hips
    if (shoulderToHipRatio < 1.0) {
      const intensity = Math.min(0.08, (1.0 - shoulderToHipRatio) * 0.6);
      base.waistFromHipWidth += intensity;
      base.hipsFromHipWidth += intensity;
      base.thighWidthFromHip += intensity * 0.1;
    }
  }

  // Clamp all circumference multipliers to sane ranges
  base.bustFromShoulder = Math.max(2.0, Math.min(3.2, base.bustFromShoulder));
  base.chestFromShoulder = Math.max(2.0, Math.min(3.2, base.chestFromShoulder));
  base.waistFromHipWidth = Math.max(2.0, Math.min(3.0, base.waistFromHipWidth));
  base.hipsFromHipWidth = Math.max(2.0, Math.min(3.2, base.hipsFromHipWidth));

  return base;
}

/* -------------------------------------------------------------------------- */
/*  Side photo depth estimation                                                */
/*  In a true side view, left/right landmarks collapse to the same point.      */
/*  We measure the horizontal extent of the body silhouette instead.           */
/* -------------------------------------------------------------------------- */

function estimateSideDepth(
  side: Landmark[],
  sideW: number,
  sideScale: number,
  level: "bust" | "waist" | "hip"
): number {
  let landmarks: Landmark[];

  if (level === "bust") {
    // Use shoulder, elbow, and nose for front-to-back chest depth
    landmarks = [side[L.LEFT_SHOULDER], side[L.RIGHT_SHOULDER], side[L.NOSE], side[L.LEFT_ELBOW]];
  } else if (level === "hip") {
    landmarks = [side[L.LEFT_HIP], side[L.RIGHT_HIP], side[L.LEFT_KNEE]];
  } else {
    // Waist: use shoulder and hip midpoints
    landmarks = [side[L.LEFT_SHOULDER], side[L.RIGHT_SHOULDER], side[L.LEFT_HIP], side[L.RIGHT_HIP]];
  }

  const validLandmarks = landmarks.filter(l => l && (l.visibility ?? 0) > 0.3);
  if (validLandmarks.length < 2) return 0; // signal to use fallback

  const xs = validLandmarks.map(l => l.x * sideW);
  const depthPx = Math.max(...xs) - Math.min(...xs);
  const depthCm = depthPx * sideScale;

  // If depth is unreasonably small, the side photo may not be a true profile
  return depthCm >= 12 ? depthCm : 0; // 0 signals fallback
}

/* -------------------------------------------------------------------------- */
/*  Cross-validation: nudge measurements that violate anatomical rules         */
/* -------------------------------------------------------------------------- */

function crossValidateAndNudge(
  m: Record<string, number>,
  gender: BodyGender
): Record<string, number> {
  const r = { ...m };

  // Rule 1: Bust should be >= waist
  if (r.bust < r.waist) {
    const avg = (r.bust + r.waist) / 2;
    r.bust = avg + 2;
    r.waist = avg - 2;
  }

  // Rule 2: Hips >= waist for females (typically 5-15cm larger)
  if (gender === "female" && r.hips < r.waist) {
    r.hips = r.waist + 4;
  }

  // Rule 3: Thigh > knee > calf > ankle (taper rule)
  if (r.thigh <= r.knee) {
    const avg = (r.thigh + r.knee) / 2;
    r.thigh = avg + 1;
    r.knee = avg - 1;
  }
  if (r.knee <= r.calf) {
    r.calf = r.knee - 2;
  }
  if (r.calf <= r.ankle) {
    r.ankle = r.calf - 2;
  }

  // Rule 4: Chest within 5cm of bust
  if (Math.abs(r.chest - r.bust) > 5) {
    r.chest = r.bust - 1;
  }

  // Rule 5: Front length should be 88-100% of back length
  const fbRatio = r.frontLength / r.backLength;
  if (fbRatio > 1.0) {
    r.frontLength = r.backLength * 0.95;
  } else if (fbRatio < 0.85) {
    r.frontLength = r.backLength * 0.92;
  }

  return r;
}

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

export function getPlausibleRanges(heightCm: number, gender: BodyGender) {
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
/*  Photo Quality Validation                                                    */
/*  Checks brightness and sharpness before AI analysis                         */
/* -------------------------------------------------------------------------- */

export interface PhotoQualityResult {
  ok: boolean;
  issues: string[];
}

/** Perceived luminance from pixel data (0-255 scale) */
function checkImageBrightness(data: Uint8ClampedArray): { ok: boolean; issue?: string } {
  let totalLuminance = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    // Perceived luminance: 0.299R + 0.587G + 0.114B
    totalLuminance += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  const avg = totalLuminance / pixelCount;
  if (avg < 40) return { ok: false, issue: "Photo is too dark — move to a brighter area or turn on a light" };
  if (avg > 220) return { ok: false, issue: "Photo is overexposed — avoid direct bright light behind you" };
  return { ok: true };
}

/** Laplacian variance for blur detection (higher = sharper) */
function checkImageSharpness(data: Uint8ClampedArray, width: number, height: number): { ok: boolean; issue?: string } {
  // Convert to grayscale and compute Laplacian variance
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Laplacian kernel: [0,1,0; 1,-4,1; 0,1,0]
      const laplacian =
        gray[idx - width] + gray[idx + width] +
        gray[idx - 1] + gray[idx + 1] -
        4 * gray[idx];
      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;

  // Threshold ~100 — below this the image is too blurry
  if (variance < 100) return { ok: false, issue: "Photo appears blurry — hold the camera steady or tap to focus" };
  return { ok: true };
}

/** Validate photo quality: brightness + sharpness. Loads image to canvas for analysis. */
export async function validatePhotoQuality(dataUrl: string): Promise<PhotoQualityResult> {
  const issues: string[] = [];
  try {
    const img = await loadImage(dataUrl);
    // Use a smaller canvas for performance (max 640px)
    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: true, issues: [] };
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    const brightness = checkImageBrightness(imageData.data);
    if (!brightness.ok && brightness.issue) issues.push(brightness.issue);

    const sharpness = checkImageSharpness(imageData.data, w, h);
    if (!sharpness.ok && sharpness.issue) issues.push(sharpness.issue);
  } catch {
    // If quality check fails, don't block — just skip
  }
  return { ok: issues.length === 0, issues };
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
  const R = computeDynamicRatios(front, gender, frontW, frontH);
  const ranges = getPlausibleRanges(heightCm, gender);

  /* ---- Scale factor from known height ---- */
  const noseY = front[L.NOSE].y;
  const shoulderMidY = midY(front[L.LEFT_SHOULDER], front[L.RIGHT_SHOULDER]);

  // Improved head-top estimation using ear landmarks
  const leftEarY = front[L.LEFT_EAR]?.y ?? noseY;
  const rightEarY = front[L.RIGHT_EAR]?.y ?? noseY;
  const earMidY = (leftEarY + rightEarY) / 2;
  const earVisibility = Math.max(
    front[L.LEFT_EAR]?.visibility ?? 0,
    front[L.RIGHT_EAR]?.visibility ?? 0
  );
  // Ears are at roughly mid-head height. Crown is ~2.2x the nose-to-ear distance above nose.
  const noseToEarDist = Math.abs(noseY - earMidY);
  const headAboveNose = (earVisibility > 0.3 && noseToEarDist > 0.005)
    ? noseToEarDist * 2.2
    : (shoulderMidY - noseY) * 0.55; // fallback to old method
  const headTopY = Math.max(0, noseY - headAboveNose);
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
  // Improved waist position: use elbow Y as reference when available
  // At rest, elbows typically align near the natural waist
  let waistRatio = gender === "female" ? 0.53 : 0.55;
  const hipMidY = midY(front[L.LEFT_HIP], front[L.RIGHT_HIP]);
  if (side) {
    const elbowY = midY(
      side[L.LEFT_ELBOW] ?? front[L.LEFT_ELBOW],
      side[L.RIGHT_ELBOW] ?? front[L.RIGHT_ELBOW]
    );
    const sideShoulderY = midY(
      side[L.LEFT_SHOULDER] ?? front[L.LEFT_SHOULDER],
      side[L.RIGHT_SHOULDER] ?? front[L.RIGHT_SHOULDER]
    );
    const sideHipY = midY(
      side[L.LEFT_HIP] ?? front[L.LEFT_HIP],
      side[L.RIGHT_HIP] ?? front[L.RIGHT_HIP]
    );
    if (elbowY > sideShoulderY && elbowY < sideHipY) {
      // Elbow typically aligns slightly below the waist
      const elbowRatio = (elbowY - sideShoulderY) / (sideHipY - sideShoulderY);
      waistRatio = Math.max(0.40, Math.min(0.65, elbowRatio - 0.03));
    }
  }
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
    const sideEarMidY = ((side[L.LEFT_EAR]?.y ?? sideNoseY) + (side[L.RIGHT_EAR]?.y ?? sideNoseY)) / 2;
    const sideEarVis = Math.max(side[L.LEFT_EAR]?.visibility ?? 0, side[L.RIGHT_EAR]?.visibility ?? 0);
    const sideNoseToEar = Math.abs(sideNoseY - sideEarMidY);
    const sideHeadAbove = (sideEarVis > 0.3 && sideNoseToEar > 0.005)
      ? sideNoseToEar * 2.2
      : (sideShouldMidY - sideNoseY) * 0.55;
    const sideHeadTopY = Math.max(0, sideNoseY - sideHeadAbove);
    const sideFeetY = Math.max(side[L.LEFT_ANKLE].y, side[L.RIGHT_ANKLE].y);
    const sideBodyPx = (sideFeetY - sideHeadTopY) * sideH;
    const sideScale = sideBodyPx > 0 ? heightCm / sideBodyPx : scale;

    // Improved side depth: measure horizontal body extent at each level
    let chestDepthCm = estimateSideDepth(side, sideW, sideScale, "bust");
    let hipDepthCm = estimateSideDepth(side, sideW, sideScale, "hip");

    // Fallback to old factor-based method if side depth is unreliable
    if (chestDepthCm <= 0) {
      const sideShoulderWidthPx = dist2D(side[L.LEFT_SHOULDER], side[L.RIGHT_SHOULDER], sideW, sideH);
      chestDepthCm = sideShoulderWidthPx * sideScale * R.chestDepthFactor;
      chestDepthCm = Math.max(chestDepthCm, 18); // minimum realistic chest depth
    }
    if (hipDepthCm <= 0) {
      const sideHipWidthPx = dist2D(side[L.LEFT_HIP], side[L.RIGHT_HIP], sideW, sideH);
      hipDepthCm = sideHipWidthPx * sideScale * R.hipDepthFactor;
      hipDepthCm = Math.max(hipDepthCm, 18);
    }

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

  /* ---- Weight estimate (uses waist-to-height ratio for accuracy) ---- */
  const heightM = heightCm / 100;
  const waistToHeightRatio = waist / heightCm;
  // Adjust BMI estimate based on actual waist circumference relative to height
  // Average waist-to-height ratio is ~0.45; deviation shifts BMI estimate
  const bmiAdjustment = (waistToHeightRatio - 0.45) * 15;
  const estimatedBMI = R.averageBMI + bmiAdjustment;
  const weight = clampMeasurement(estimatedBMI * heightM * heightM, 35, 200);

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

  // Cross-validate and nudge anatomically inconsistent measurements
  const raw = {
    bust, waist, hips, shoulder, armLength, inseam, neck, chest,
    backLength, frontLength, sleeveLength, wrist, thigh, knee, calf, ankle,
    height: heightCm, weight,
  };
  const validated = crossValidateAndNudge(raw, gender);

  return {
    measurements: {
      bust: round1(validated.bust),
      waist: round1(validated.waist),
      hips: round1(validated.hips),
      shoulder: round1(validated.shoulder),
      armLength: round1(validated.armLength),
      inseam: round1(validated.inseam),
      neck: round1(validated.neck),
      chest: round1(validated.chest),
      backLength: round1(validated.backLength),
      frontLength: round1(validated.frontLength),
      sleeveLength: round1(validated.sleeveLength),
      wrist: round1(validated.wrist),
      thigh: round1(validated.thigh),
      knee: round1(validated.knee),
      calf: round1(validated.calf),
      ankle: round1(validated.ankle),
      height: round1(heightCm),
      weight: round1(validated.weight),
    },
    confidence: round1(confidence),
    landmarkQuality: round1(avgVisibility),
  };
}
