"use client";

/* -------------------------------------------------------------------------- */
/*  AI Body Measurement Module — Tier-1                                        */
/*                                                                              */
/*  Pipeline:                                                                   */
/*   1. Pose-quality gate     → block capture until pose is good               */
/*   2. Multi-frame capture   → median of N frames (noise ÷ √N)                */
/*   3. Reference-card scale  → ID-card detection beats self-reported height   */
/*   4. Segmentation widths   → measure body silhouette, not joint distance    */
/*   5. Anatomical validation → cross-check + nudge inconsistent values        */
/*   6. Inches output         → Nigerian tailoring is inch-native              */
/*   7. Tape recalibration    → one tape value rescales the whole scan         */
/*                                                                              */
/*  All photos stay on-device. Math runs internally in cm (because height,     */
/*  the calibration anchor, is given in cm) and outputs inches.                */
/* -------------------------------------------------------------------------- */

import { cmToIn, inToCm, roundEighth } from "./units";

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
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface MeasurementResult {
  /** All values are inches, rounded to 1/8". */
  measurements: Record<string, number>;
  confidence: number;
  landmarkQuality: number;
  confidenceScores: Record<string, number>;
  aiEstimatedFields: string[];
  /** "card" | "height" — which scale source was used */
  scaleSource?: "card" | "height";
  /** Soft warnings about the scan (bulky clothing, etc.) that aren't strict
   *  failures but suggest the customer/designer verify with tape. */
  clothingWarnings?: string[];
}

export type BodyGender = "male" | "female";
/** Customer self-reports their build so the AI applies the right ratio
 *  multipliers to fields we infer from population averages. */
export type BodyType = "slim" | "athletic" | "curvy" | "plus";

/** A captured frame: landmarks + optional segmentation mask + image dims. */
export interface CapturedFrame {
  landmarks: Landmark[];
  /** Pixel-aligned binary segmentation mask (1 = body, 0 = background). */
  segmentationMask?: Uint8Array | null;
  width: number;
  height: number;
}

/* -------------------------------------------------------------------------- */
/*  African body-type calibration                                              */
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
/*  Body-type adjustments                                                       */
/*                                                                              */
/*  Customer self-identifies their build; we tweak the population-average      */
/*  ratios up or down. Mostly affects derived fields (underBust, roundArm,    */
/*  etc.) where we infer from chest/hip rather than measure the silhouette    */
/*  directly. For silhouette-based circumferences the mask wins and these    */
/*  multipliers play a minor role.                                             */
/* -------------------------------------------------------------------------- */

interface BodyTypeAdjustment {
  bustMul: number;
  waistMul: number;
  hipsMul: number;
  thighMul: number;
  /** Adjust the assumed body BMI used for the rough weight estimate. */
  bmiOffset: number;
}

const BODY_TYPE_ADJUSTMENTS: Record<BodyType, BodyTypeAdjustment> = {
  slim:     { bustMul: 0.95, waistMul: 0.90, hipsMul: 0.94, thighMul: 0.92, bmiOffset: -3 },
  athletic: { bustMul: 0.98, waistMul: 0.95, hipsMul: 0.98, thighMul: 1.00, bmiOffset: -1 },
  curvy:    { bustMul: 1.05, waistMul: 1.00, hipsMul: 1.08, thighMul: 1.05, bmiOffset: +2 },
  plus:     { bustMul: 1.12, waistMul: 1.12, hipsMul: 1.15, thighMul: 1.12, bmiOffset: +6 },
};

function applyBodyType(base: BodyRatioSet, type: BodyType): BodyRatioSet {
  const adj = BODY_TYPE_ADJUSTMENTS[type];
  return {
    ...base,
    bustFromShoulder:   base.bustFromShoulder   * adj.bustMul,
    chestFromShoulder:  base.chestFromShoulder  * adj.bustMul,
    waistFromHipWidth:  base.waistFromHipWidth  * adj.waistMul,
    hipsFromHipWidth:   base.hipsFromHipWidth   * adj.hipsMul,
    bustHalfWidthRatio: base.bustHalfWidthRatio * adj.bustMul,
    waistHalfWidthRatio: base.waistHalfWidthRatio * adj.waistMul,
    hipHalfWidthRatio:   base.hipHalfWidthRatio   * adj.hipsMul,
    thighWidthFromHip:   base.thighWidthFromHip   * adj.thighMul,
    averageBMI:          base.averageBMI + adj.bmiOffset,
  };
}

function computeDynamicRatios(
  front: Landmark[],
  gender: BodyGender,
  frontW: number,
  frontH: number,
): BodyRatioSet {
  const base: BodyRatioSet = { ...BASE_RATIOS[gender] };

  const shoulderPx = dist2D(front[L.LEFT_SHOULDER], front[L.RIGHT_SHOULDER], frontW, frontH);
  const hipPx = dist2D(front[L.LEFT_HIP], front[L.RIGHT_HIP], frontW, frontH);
  if (shoulderPx <= 0 || hipPx <= 0) return base;

  const ratio = shoulderPx / hipPx;

  if (gender === "female") {
    if (ratio < 0.95) {
      const k = Math.min(0.15, (0.95 - ratio) * 1.0);
      base.hipsFromHipWidth += k;
      base.hipHalfWidthRatio += k * 0.2;
      base.hipDepthFactor += k * 0.4;
      base.bustFromShoulder -= k * 0.3;
      base.thighWidthFromHip += k * 0.15;
    }
    if (ratio > 1.10) {
      const k = Math.min(0.12, (ratio - 1.10) * 0.8);
      base.bustFromShoulder += k;
      base.chestFromShoulder += k;
      base.hipsFromHipWidth -= k;
      base.hipHalfWidthRatio -= k * 0.15;
    }
    if (ratio >= 0.95 && ratio <= 1.05) {
      base.bustFromShoulder += 0.05;
      base.hipsFromHipWidth += 0.05;
      base.waistFromHipWidth -= 0.05;
      base.waistHalfWidthRatio -= 0.02;
    }
  } else {
    if (ratio > 1.15) {
      const k = Math.min(0.10, (ratio - 1.15) * 0.7);
      base.bustFromShoulder += k;
      base.chestFromShoulder += k;
      base.waistFromHipWidth -= k * 0.5;
    }
    if (ratio < 1.0) {
      const k = Math.min(0.08, (1.0 - ratio) * 0.6);
      base.waistFromHipWidth += k;
      base.hipsFromHipWidth += k;
      base.thighWidthFromHip += k * 0.1;
    }
  }

  base.bustFromShoulder = clamp(base.bustFromShoulder, 2.0, 3.2);
  base.chestFromShoulder = clamp(base.chestFromShoulder, 2.0, 3.2);
  base.waistFromHipWidth = clamp(base.waistFromHipWidth, 2.0, 3.0);
  base.hipsFromHipWidth = clamp(base.hipsFromHipWidth, 2.0, 3.2);
  return base;
}

/* -------------------------------------------------------------------------- */
/*  Math helpers                                                                */
/* -------------------------------------------------------------------------- */

function dist2D(a: Landmark, b: Landmark, w: number, h: number): number {
  const dx = (a.x - b.x) * w;
  const dy = (a.y - b.y) * h;
  return Math.sqrt(dx * dx + dy * dy);
}
function midY(a: Landmark, b: Landmark): number { return (a.y + b.y) / 2; }
function midX(a: Landmark, b: Landmark): number { return (a.x + b.x) / 2; }
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function ellipseCirc(a: number, b: number): number {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/** Robust median of an array (mutates a copy). */
function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((x, y) => x - y);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/* -------------------------------------------------------------------------- */
/*  Pose-quality gate                                                           */
/*  Run on each live frame to decide whether to allow capture.                 */
/* -------------------------------------------------------------------------- */

export interface PoseQualityIssue {
  code:
    | "no_pose"
    | "head_clipped"
    | "feet_clipped"
    | "phone_tilted"
    | "subject_tilted"
    | "arms_too_close"
    | "low_visibility"
    | "subject_too_close"
    | "subject_too_far";
  message: string;
}

export interface PoseQualityReport {
  ok: boolean;
  issues: PoseQualityIssue[];
}

export function evaluatePoseQuality(
  landmarks: Landmark[] | null,
  imageWidth: number,
  imageHeight: number,
  /** Optional device pitch in degrees (from DeviceOrientation). */
  devicePitchDeg?: number,
): PoseQualityReport {
  const issues: PoseQualityIssue[] = [];
  if (!landmarks || landmarks.length < 33) {
    issues.push({ code: "no_pose", message: "Stand fully in the frame" });
    return { ok: false, issues };
  }

  const head = landmarks[L.NOSE];
  const lAnkle = landmarks[L.LEFT_ANKLE];
  const rAnkle = landmarks[L.RIGHT_ANKLE];
  const lSh = landmarks[L.LEFT_SHOULDER];
  const rSh = landmarks[L.RIGHT_SHOULDER];
  const lHip = landmarks[L.LEFT_HIP];
  const rHip = landmarks[L.RIGHT_HIP];
  const lWrist = landmarks[L.LEFT_WRIST];
  const rWrist = landmarks[L.RIGHT_WRIST];

  // Head not clipped at top
  if (head.y < 0.04) issues.push({ code: "head_clipped", message: "Move back — your head is cut off" });
  // Feet not clipped at bottom
  if (Math.max(lAnkle.y, rAnkle.y) > 0.97)
    issues.push({ code: "feet_clipped", message: "Move back — your feet are cut off" });

  // Subject vertical: shoulder line within ±3°
  const dySh = (lSh.y - rSh.y) * imageHeight;
  const dxSh = (lSh.x - rSh.x) * imageWidth;
  const shoulderTilt = Math.abs(Math.atan2(dySh, dxSh) * (180 / Math.PI));
  if (shoulderTilt > 4 && shoulderTilt < 176)
    issues.push({ code: "subject_tilted", message: "Stand straight, shoulders level" });

  // Phone-pitch nudge — directional. Phone tilted UP (looking at ceiling)
  // means the operator is holding it too low; tilted DOWN means too high.
  // Beta is 0° when phone is flat, 90° when upright. We pass (beta - 90)
  // as devicePitchDeg, so 0° = upright, +ve = tilted-back (looking up).
  if (devicePitchDeg !== undefined) {
    if (devicePitchDeg > 8) {
      issues.push({
        code: "phone_tilted",
        message: "Phone tilted up — raise it to chest height of the person",
      });
    } else if (devicePitchDeg < -8) {
      issues.push({
        code: "phone_tilted",
        message: "Phone tilted down — lower it to chest height of the person",
      });
    }
  }

  // Arms separated from torso (so silhouette can read body width at chest)
  const torsoHalf = Math.abs(lSh.x - rSh.x) / 2;
  const torsoCx = (lSh.x + rSh.x) / 2;
  const lArmAway = Math.abs(lWrist.x - torsoCx) > torsoHalf * 1.25;
  const rArmAway = Math.abs(rWrist.x - torsoCx) > torsoHalf * 1.25;
  if (!(lArmAway && rArmAway))
    issues.push({ code: "arms_too_close", message: "Hold arms slightly out from your body" });

  // Visibility
  const keyVis = [lSh, rSh, lHip, rHip, lAnkle, rAnkle].map(l => l.visibility ?? 0);
  const avgVis = keyVis.reduce((a, b) => a + b, 0) / keyVis.length;
  if (avgVis < 0.6) issues.push({ code: "low_visibility", message: "Stand where the camera can see your full body" });

  // Subject coverage: shoulder-width as fraction of frame width
  const shFrac = Math.abs(lSh.x - rSh.x);
  if (shFrac > 0.42) issues.push({ code: "subject_too_close", message: "Move back from the camera" });
  if (shFrac < 0.12) issues.push({ code: "subject_too_far", message: "Move closer to the camera" });

  return { ok: issues.length === 0, issues };
}

/* -------------------------------------------------------------------------- */
/*  Multi-frame median pose                                                     */
/*  Combine N frames into one robust pose.                                     */
/* -------------------------------------------------------------------------- */

export function medianPose(frames: CapturedFrame[]): CapturedFrame | null {
  if (frames.length === 0) return null;
  if (frames.length === 1) return frames[0];

  const ref = frames[0];
  const N = ref.landmarks.length;
  const merged: Landmark[] = [];

  for (let i = 0; i < N; i++) {
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    const vs: number[] = [];
    for (const f of frames) {
      const lm = f.landmarks[i];
      if (!lm) continue;
      const v = lm.visibility ?? 0;
      // weight by visibility: drop frames where this landmark wasn't seen
      if (v < 0.3) continue;
      xs.push(lm.x);
      ys.push(lm.y);
      zs.push(lm.z);
      vs.push(v);
    }
    if (xs.length === 0) {
      merged.push(ref.landmarks[i]);
    } else {
      merged.push({
        x: median(xs),
        y: median(ys),
        z: median(zs),
        visibility: median(vs),
      });
    }
  }

  // Pick the segmentation mask with highest body-pixel count (most complete)
  let bestMask: Uint8Array | null | undefined = null;
  let bestCount = -1;
  for (const f of frames) {
    if (!f.segmentationMask) continue;
    let c = 0;
    for (let i = 0; i < f.segmentationMask.length; i++) c += f.segmentationMask[i] ? 1 : 0;
    if (c > bestCount) { bestCount = c; bestMask = f.segmentationMask; }
  }

  return {
    landmarks: merged,
    segmentationMask: bestMask ?? null,
    width: ref.width,
    height: ref.height,
  };
}

/* -------------------------------------------------------------------------- */
/*  Segmentation-based body width at a Y row                                    */
/*  Returns body width in PIXELS at the specified normalized Y (0..1).          */
/*  Returns NaN if the row is empty or the mask is missing.                    */
/* -------------------------------------------------------------------------- */

export function widthAtY(
  mask: Uint8Array | null | undefined,
  width: number,
  height: number,
  yNorm: number,
  /** Search a small vertical band around y to be robust. */
  bandPx: number = 4,
): number {
  if (!mask) return NaN;
  const y0 = clamp(Math.round(yNorm * height) - bandPx, 0, height - 1);
  const y1 = clamp(Math.round(yNorm * height) + bandPx, 0, height - 1);

  // Take the WIDEST run in the band (usually we want the arm-free chest line;
  // if arms are out, the band's max width includes them — we mitigate this in
  // the caller by selecting Y rows above/below the wrists).
  let best = 0;
  for (let y = y0; y <= y1; y++) {
    let leftEdge = -1;
    let rightEdge = -1;
    const rowOff = y * width;
    for (let x = 0; x < width; x++) {
      if (mask[rowOff + x]) { leftEdge = x; break; }
    }
    if (leftEdge < 0) continue;
    for (let x = width - 1; x >= 0; x--) {
      if (mask[rowOff + x]) { rightEdge = x; break; }
    }
    const w = rightEdge - leftEdge;
    if (w > best) best = w;
  }
  return best > 0 ? best : NaN;
}

/* -------------------------------------------------------------------------- */
/*  Reference-card scale calibration                                            */
/*  An ISO/IEC 7810 ID-1 card is 85.60 × 53.98 mm (8.560 × 5.398 cm).           */
/*  Caller supplies the card's bounding box in pixels (from a manual tap or    */
/*  a contour detector). Returns cm-per-pixel.                                 */
/* -------------------------------------------------------------------------- */

export const ID_CARD_LONG_CM = 8.56;
export const ID_CARD_SHORT_CM = 5.398;

export interface CardBox {
  /** Long side of the card in pixels (whichever dimension that is). */
  longSidePx: number;
  /** Short side in pixels (used for sanity check). */
  shortSidePx: number;
}

export function scaleFromCard(box: CardBox): number | null {
  if (!box || box.longSidePx <= 0 || box.shortSidePx <= 0) return null;
  // Aspect ratio sanity: ID-1 long/short ≈ 1.586 — accept 1.4–1.8
  const aspect = box.longSidePx / box.shortSidePx;
  if (aspect < 1.4 || aspect > 1.8) return null;
  // Average two scale estimates
  const sLong = ID_CARD_LONG_CM / box.longSidePx;
  const sShort = ID_CARD_SHORT_CM / box.shortSidePx;
  return (sLong + sShort) / 2;
}

/* -------------------------------------------------------------------------- */
/*  Plausibility ranges (IN INCHES)                                            */
/* -------------------------------------------------------------------------- */

export function getPlausibleRanges(heightIn: number, gender: BodyGender) {
  const h = heightIn;
  const isFemale = gender === "female";
  return {
    bust:        { min: h * 0.45, max: h * 0.80 },
    chest:       { min: h * 0.45, max: h * 0.80 },
    waist:       { min: h * 0.35, max: h * 0.75 },
    hips:        { min: h * 0.48, max: h * 0.85 },
    shoulder:    { min: h * 0.20, max: h * 0.35 },
    armLength:   { min: h * 0.28, max: h * 0.42 },
    inseam:      { min: h * 0.38, max: h * 0.55 },
    neck:        { min: isFemale ? 11.0 : 12.6, max: isFemale ? 17.3 : 20.5 },
    backLength:  { min: h * 0.18, max: h * 0.32 },
    frontLength: { min: h * 0.16, max: h * 0.30 },
    sleeveLength:{ min: h * 0.27, max: h * 0.41 },
    wrist:       { min: 4.7,  max: 9.5 },
    thigh:       { min: h * 0.25, max: h * 0.50 },
    knee:        { min: h * 0.18, max: h * 0.32 },
    calf:        { min: h * 0.16, max: h * 0.30 },
    ankle:       { min: 6.3,  max: 12.6 },
  };
}

/* -------------------------------------------------------------------------- */
/*  PoseLandmarker init — full model + segmentation enabled                    */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PoseLandmarkerType = any;

export async function initPoseLandmarker(
  runningMode: "IMAGE" | "VIDEO" = "IMAGE",
): Promise<PoseLandmarkerType> {
  const vision = await import("@mediapipe/tasks-vision");
  const { PoseLandmarker, FilesetResolver } = vision;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",
  );

  return PoseLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
      delegate: "GPU",
    },
    runningMode,
    numPoses: 1,
    outputSegmentationMasks: true,
  });
}

export async function detectLandmarks(
  poseLandmarker: PoseLandmarkerType,
  img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  /** Required when runningMode === "VIDEO" */
  videoTimestampMs?: number,
): Promise<{ landmarks: Landmark[] | null; segmentationMask: Uint8Array | null }> {
  const result = videoTimestampMs !== undefined
    ? poseLandmarker.detectForVideo(img, videoTimestampMs)
    : poseLandmarker.detect(img);

  const lms: Landmark[] | null =
    result.landmarks && result.landmarks.length > 0
      ? (result.landmarks[0] as Landmark[])
      : null;

  // Convert MPImage segmentation mask → Uint8Array binary
  let mask: Uint8Array | null = null;
  if (result.segmentationMasks && result.segmentationMasks.length > 0) {
    const m = result.segmentationMasks[0];
    try {
      const floatArr: Float32Array | undefined =
        typeof m.getAsFloat32Array === "function" ? m.getAsFloat32Array() : undefined;
      if (floatArr) {
        mask = new Uint8Array(floatArr.length);
        for (let i = 0; i < floatArr.length; i++) mask[i] = floatArr[i] > 0.5 ? 1 : 0;
      }
    } finally {
      if (typeof m.close === "function") m.close();
    }
  }

  return { landmarks: lms, segmentationMask: mask };
}

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
/*  Photo quality validation (brightness + sharpness)                          */
/* -------------------------------------------------------------------------- */

export interface PhotoQualityResult {
  ok: boolean;
  issues: string[];
}

function checkImageBrightness(data: Uint8ClampedArray): { ok: boolean; issue?: string } {
  let total = 0;
  const px = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  const avg = total / px;
  if (avg < 40) return { ok: false, issue: "Photo is too dark — find a brighter spot" };
  if (avg > 220) return { ok: false, issue: "Photo is overexposed — avoid bright light behind you" };
  return { ok: true };
}

function checkImageSharpness(data: Uint8ClampedArray, w: number, h: number): { ok: boolean; issue?: string } {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
  }
  let sum = 0, sumSq = 0, count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const lap = gray[idx - w] + gray[idx + w] + gray[idx - 1] + gray[idx + 1] - 4 * gray[idx];
      sum += lap; sumSq += lap * lap; count++;
    }
  }
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  if (variance < 120) return { ok: false, issue: "Photo is blurry — hold the camera steady" };
  return { ok: true };
}

export async function validatePhotoQuality(dataUrl: string): Promise<PhotoQualityResult> {
  const issues: string[] = [];
  try {
    const img = await loadImage(dataUrl);
    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: true, issues: [] };
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const b = checkImageBrightness(data.data);
    if (!b.ok && b.issue) issues.push(b.issue);
    const s = checkImageSharpness(data.data, w, h);
    if (!s.ok && s.issue) issues.push(s.issue);
  } catch {
    /* skip */
  }
  return { ok: issues.length === 0, issues };
}

/* -------------------------------------------------------------------------- */
/*  Anatomical cross-validation (works in inches)                              */
/* -------------------------------------------------------------------------- */

function crossValidateAndNudge(
  m: Record<string, number>,
  gender: BodyGender,
): Record<string, number> {
  const r = { ...m };

  // Bust >= waist
  if (r.bust < r.waist) {
    const avg = (r.bust + r.waist) / 2;
    r.bust = avg + 0.8;   // ≈ 2 cm
    r.waist = avg - 0.8;
  }
  // Hips >= waist for female
  if (gender === "female" && r.hips < r.waist) r.hips = r.waist + 1.6;
  // Taper: thigh > knee > calf > ankle
  if (r.thigh <= r.knee) {
    const avg = (r.thigh + r.knee) / 2;
    r.thigh = avg + 0.4;
    r.knee = avg - 0.4;
  }
  if (r.knee <= r.calf) r.calf = r.knee - 0.8;
  if (r.calf <= r.ankle) r.ankle = r.calf - 0.8;
  // Chest within ~2" of bust
  if (Math.abs(r.chest - r.bust) > 2) r.chest = r.bust - 0.4;
  // Front length 88–100% of back length
  const fb = r.frontLength / r.backLength;
  if (fb > 1.0) r.frontLength = r.backLength * 0.95;
  else if (fb < 0.85) r.frontLength = r.backLength * 0.92;

  return r;
}

/* -------------------------------------------------------------------------- */
/*  Core measurement calculation                                                */
/*                                                                              */
/*  Inputs:                                                                     */
/*    front, side       — CapturedFrame (landmarks + optional mask)            */
/*    heightCm          — user-entered height (fallback scale)                  */
/*    cardScaleCmPerPx  — optional precise scale from ID card                  */
/*    gender                                                                    */
/* -------------------------------------------------------------------------- */

export function calculateMeasurements(
  front: CapturedFrame,
  side: CapturedFrame | null,
  heightCm: number,
  gender: BodyGender = "female",
  cardScaleCmPerPx?: number | null,
  bodyType: BodyType | null = null,
): MeasurementResult {
  const fLm = front.landmarks;
  const sLm = side?.landmarks;
  const fW = front.width;
  const fH = front.height;
  const sW = side?.width ?? 0;
  const sH = side?.height ?? 0;

  const dyn = computeDynamicRatios(fLm, gender, fW, fH);
  const R = bodyType ? applyBodyType(dyn, bodyType) : dyn;

  /* ---- Scale: card beats height every time ---- */
  let scale: number; // cm per pixel of the FRONT image
  let scaleSource: "card" | "height";

  if (cardScaleCmPerPx && cardScaleCmPerPx > 0) {
    scale = cardScaleCmPerPx;
    scaleSource = "card";
  } else {
    const noseY = fLm[L.NOSE].y;
    const shoulderMidY = midY(fLm[L.LEFT_SHOULDER], fLm[L.RIGHT_SHOULDER]);
    const leftEarY = fLm[L.LEFT_EAR]?.y ?? noseY;
    const rightEarY = fLm[L.RIGHT_EAR]?.y ?? noseY;
    const earMidY = (leftEarY + rightEarY) / 2;
    const earVis = Math.max(fLm[L.LEFT_EAR]?.visibility ?? 0, fLm[L.RIGHT_EAR]?.visibility ?? 0);
    const noseToEar = Math.abs(noseY - earMidY);
    const headAbove = (earVis > 0.3 && noseToEar > 0.005)
      ? noseToEar * 2.2
      : (shoulderMidY - noseY) * 0.55;
    const headTopY = Math.max(0, noseY - headAbove);
    const feetY = Math.max(
      fLm[L.LEFT_ANKLE].y, fLm[L.RIGHT_ANKLE].y,
      fLm[L.LEFT_HEEL]?.y ?? fLm[L.LEFT_ANKLE].y,
      fLm[L.RIGHT_HEEL]?.y ?? fLm[L.RIGHT_ANKLE].y,
    );
    const bodyHeightPx = (feetY - headTopY) * fH;
    scale = bodyHeightPx > 0 ? heightCm / bodyHeightPx : 1;
    scaleSource = "height";
  }

  const cmFromPx = (px: number) => px * scale;
  const heightIn = cmToIn(heightCm);
  const ranges = getPlausibleRanges(heightIn, gender);

  /* ---- Shoulder width ---- */
  const shoulderPx = dist2D(fLm[L.LEFT_SHOULDER], fLm[L.RIGHT_SHOULDER], fW, fH);
  const shoulderCm = cmFromPx(shoulderPx);

  /* ---- Arm length (avg L+R) ---- */
  const lArmPx = dist2D(fLm[L.LEFT_SHOULDER], fLm[L.LEFT_ELBOW], fW, fH)
              + dist2D(fLm[L.LEFT_ELBOW],    fLm[L.LEFT_WRIST], fW, fH);
  const rArmPx = dist2D(fLm[L.RIGHT_SHOULDER], fLm[L.RIGHT_ELBOW], fW, fH)
              + dist2D(fLm[L.RIGHT_ELBOW],    fLm[L.RIGHT_WRIST], fW, fH);
  const armLengthCm = cmFromPx((lArmPx + rArmPx) / 2);
  const sleeveLengthCm = armLengthCm * 0.97;

  /* ---- Inseam ---- */
  const hipCx = midX(fLm[L.LEFT_HIP], fLm[L.RIGHT_HIP]);
  const hipCy = midY(fLm[L.LEFT_HIP], fLm[L.RIGHT_HIP]);
  const hipCenter: Landmark = { x: hipCx, y: hipCy, z: 0 };
  const lInseamPx = dist2D(hipCenter, fLm[L.LEFT_KNEE], fW, fH)
                  + dist2D(fLm[L.LEFT_KNEE], fLm[L.LEFT_ANKLE], fW, fH);
  const rInseamPx = dist2D(hipCenter, fLm[L.RIGHT_KNEE], fW, fH)
                  + dist2D(fLm[L.RIGHT_KNEE], fLm[L.RIGHT_ANKLE], fW, fH);
  const inseamCm = cmFromPx((lInseamPx + rInseamPx) / 2);

  /* ---- Back / front length ---- */
  let waistRatio = gender === "female" ? 0.53 : 0.55;
  const shoulderMidY = midY(fLm[L.LEFT_SHOULDER], fLm[L.RIGHT_SHOULDER]);
  const hipMidY = midY(fLm[L.LEFT_HIP], fLm[L.RIGHT_HIP]);
  if (sLm) {
    const elbowY = midY(sLm[L.LEFT_ELBOW] ?? fLm[L.LEFT_ELBOW], sLm[L.RIGHT_ELBOW] ?? fLm[L.RIGHT_ELBOW]);
    const sShY = midY(sLm[L.LEFT_SHOULDER] ?? fLm[L.LEFT_SHOULDER], sLm[L.RIGHT_SHOULDER] ?? fLm[L.RIGHT_SHOULDER]);
    const sHipY = midY(sLm[L.LEFT_HIP] ?? fLm[L.LEFT_HIP], sLm[L.RIGHT_HIP] ?? fLm[L.RIGHT_HIP]);
    if (elbowY > sShY && elbowY < sHipY) {
      const ebr = (elbowY - sShY) / (sHipY - sShY);
      const eb = clamp(ebr - 0.03, 0.40, 0.65);
      waistRatio = waistRatio * 0.3 + eb * 0.7;
    }
  }
  const waistY = shoulderMidY + (hipMidY - shoulderMidY) * waistRatio;
  const backLengthCm = cmFromPx((waistY - shoulderMidY) * fH) * R.backLengthCurveCorrection;
  const frontLengthCm = backLengthCm * R.frontToBackRatio;

  /* ---- Body widths: silhouette FIRST, joint ratios as fallback ---- */
  // Y rows for measurement bands
  const bustY = shoulderMidY + (hipMidY - shoulderMidY) * 0.18;
  const waistYn = waistY;
  const hipYn = shoulderMidY + (hipMidY - shoulderMidY) * 0.95;

  function widthCmFromMaskAt(yNorm: number): number {
    const px = widthAtY(front.segmentationMask, fW, fH, yNorm, 5);
    return isNaN(px) ? NaN : cmFromPx(px);
  }

  const bustWidthMaskCm = widthCmFromMaskAt(bustY);
  const waistWidthMaskCm = widthCmFromMaskAt(waistYn);
  const hipWidthMaskCm = widthCmFromMaskAt(hipYn);

  const hipWidthFallbackCm = cmFromPx(dist2D(fLm[L.LEFT_HIP], fLm[L.RIGHT_HIP], fW, fH));

  // Choose source per band
  const bustWidthCm = isFinite(bustWidthMaskCm) ? bustWidthMaskCm : shoulderCm; // shoulder is decent proxy
  const waistWidthCm = isFinite(waistWidthMaskCm) ? waistWidthMaskCm : hipWidthFallbackCm * 0.92;
  const hipWidthCm = isFinite(hipWidthMaskCm) ? hipWidthMaskCm : hipWidthFallbackCm;

  /* -------------------------------------------------------------------- */
  /*  Bulky-clothing detection                                              */
  /*                                                                        */
  /*  If the silhouette is much wider than the skeleton joint distances     */
  /*  suggest, the customer is wearing loose clothing and the mask is      */
  /*  capturing fabric, not body. Threshold tuned so a fitted shirt        */
  /*  comfortably passes (ratio ~1.10-1.20) but an oversized blouse fails. */
  /* -------------------------------------------------------------------- */
  const clothingWarnings: string[] = [];
  if (front.segmentationMask && shoulderCm > 0) {
    // Bust mask should be roughly equal to shoulder width for fitted clothing.
    // Above 1.30× = warn. Above 1.45× = strong warn.
    if (isFinite(bustWidthMaskCm)) {
      const ratio = bustWidthMaskCm / shoulderCm;
      if (ratio > 1.45) {
        clothingWarnings.push(
          "Top looks loose — bust may read 4-6\" wider than your body. Re-scan in a fitted shirt for accuracy.",
        );
      } else if (ratio > 1.30) {
        clothingWarnings.push(
          "Top may be slightly loose — bust could be 2-3\" wider than your body.",
        );
      }
    }
    // Hip mask should be roughly equal to hip joint width × 1.15 (hips flare).
    // Above 1.55 = warn.
    if (isFinite(hipWidthMaskCm) && hipWidthFallbackCm > 0) {
      const ratio = hipWidthMaskCm / hipWidthFallbackCm;
      if (ratio > 1.55) {
        clothingWarnings.push(
          "Bottoms / dress looks loose — hip width may read wider than your body.",
        );
      }
    }
  }

  /* ---- Side-view depth (silhouette FIRST, factor fallback) ---- */
  function sideWidthCmAt(yNorm: number): number {
    if (!side?.segmentationMask) return NaN;
    const sScale = (() => {
      // Re-derive scale on side image from height
      const sNoseY = sLm![L.NOSE].y;
      const sShY = midY(sLm![L.LEFT_SHOULDER], sLm![L.RIGHT_SHOULDER]);
      const sHeadAbove = (sShY - sNoseY) * 0.55;
      const sHeadTopY = Math.max(0, sNoseY - sHeadAbove);
      const sFeetY = Math.max(sLm![L.LEFT_ANKLE].y, sLm![L.RIGHT_ANKLE].y);
      const sBodyPx = (sFeetY - sHeadTopY) * sH;
      return sBodyPx > 0 ? heightCm / sBodyPx : scale;
    })();
    const px = widthAtY(side.segmentationMask, sW, sH, yNorm, 5);
    return isNaN(px) ? NaN : px * sScale;
  }

  const bustDepthMaskCm = sideWidthCmAt(0.32);
  const waistDepthMaskCm = sideWidthCmAt(0.50);
  const hipDepthMaskCm = sideWidthCmAt(0.62);

  const chestDepthCm = isFinite(bustDepthMaskCm)
    ? bustDepthMaskCm
    : Math.max(shoulderCm * R.chestDepthFactor, 18);
  const hipDepthCm = isFinite(hipDepthMaskCm)
    ? hipDepthMaskCm
    : Math.max(hipWidthFallbackCm * R.hipDepthFactor, 18);
  const waistDepthCm = isFinite(waistDepthMaskCm)
    ? waistDepthMaskCm
    : ((chestDepthCm + hipDepthCm) / 2) * R.waistDepthFactor;

  /* ---- Circumferences via ellipse, using TRUE silhouette half-widths ---- */
  let bustCm = ellipseCirc(bustWidthCm / 2, chestDepthCm / 2);
  let chestCm = bustCm;
  let waistCm = ellipseCirc(waistWidthCm / 2, waistDepthCm / 2);
  let hipsCm = ellipseCirc(hipWidthCm / 2, hipDepthCm / 2);

  /* ---- Fallback when no side photo at all ---- */
  if (!sLm) {
    bustCm = isFinite(bustWidthMaskCm)
      ? ellipseCirc(bustWidthCm / 2, bustWidthCm / 2 * (gender === "female" ? 0.85 : 0.78))
      : shoulderCm * R.bustFromShoulder;
    chestCm = bustCm;
    waistCm = isFinite(waistWidthMaskCm)
      ? ellipseCirc(waistWidthCm / 2, waistWidthCm / 2 * 0.78)
      : hipWidthFallbackCm * R.waistFromHipWidth;
    hipsCm = isFinite(hipWidthMaskCm)
      ? ellipseCirc(hipWidthCm / 2, hipWidthCm / 2 * (gender === "female" ? 0.95 : 0.82))
      : hipWidthFallbackCm * R.hipsFromHipWidth;
  }

  /* ---- Convert to inches and clamp to plausible ranges ---- */
  let bust = clamp(cmToIn(bustCm),  ranges.bust.min,  ranges.bust.max);
  let chest = clamp(cmToIn(chestCm), ranges.chest.min, ranges.chest.max);
  let waist = clamp(cmToIn(waistCm), ranges.waist.min, ranges.waist.max);
  let hips = clamp(cmToIn(hipsCm),  ranges.hips.min,  ranges.hips.max);
  const shoulder = clamp(cmToIn(shoulderCm), ranges.shoulder.min, ranges.shoulder.max);
  const armLength = clamp(cmToIn(armLengthCm), ranges.armLength.min, ranges.armLength.max);
  const sleeveLength = clamp(cmToIn(sleeveLengthCm), ranges.sleeveLength.min, ranges.sleeveLength.max);
  const inseam = clamp(cmToIn(inseamCm), ranges.inseam.min, ranges.inseam.max);
  const backLength = clamp(cmToIn(backLengthCm), ranges.backLength.min, ranges.backLength.max);
  const frontLength = clamp(cmToIn(frontLengthCm), ranges.frontLength.min, ranges.frontLength.max);

  /* ---- Neck ---- */
  const earDistPx = dist2D(fLm[L.LEFT_EAR], fLm[L.RIGHT_EAR], fW, fH);
  const neckDiameterCm = cmFromPx(earDistPx) * R.neckWidthFromEars;
  let neckCm: number;
  if (sLm) {
    const neckDepthCm = neckDiameterCm * (gender === "female" ? 0.85 : 0.90);
    neckCm = ellipseCirc(neckDiameterCm / 2, neckDepthCm / 2);
  } else {
    neckCm = neckDiameterCm * Math.PI;
  }
  const neck = clamp(cmToIn(neckCm), ranges.neck.min, ranges.neck.max);

  /* ---- Thigh ---- */
  const thighWidthCm = hipWidthCm * R.thighWidthFromHip;
  const thigh = clamp(cmToIn(thighWidthCm * R.thighCircFactor), ranges.thigh.min, ranges.thigh.max);

  /* ---- Knee / Calf / Ankle / Wrist ---- */
  const kneePx = dist2D(fLm[L.LEFT_KNEE], fLm[L.RIGHT_KNEE], fW, fH);
  const kneeWidthCm = cmFromPx(kneePx);
  const knee = clamp(cmToIn(kneeWidthCm * R.kneeCircFactor), ranges.knee.min, ranges.knee.max);
  const calfWidthCm = kneeWidthCm * R.calfFromKnee;
  const calf = clamp(cmToIn(calfWidthCm * R.calfCircFactor), ranges.calf.min, ranges.calf.max);
  const anklePx = dist2D(fLm[L.LEFT_ANKLE], fLm[L.RIGHT_ANKLE], fW, fH);
  const ankle = clamp(cmToIn(cmFromPx(anklePx)), ranges.ankle.min, ranges.ankle.max);
  const wristPx = dist2D(fLm[L.LEFT_WRIST], fLm[L.RIGHT_WRIST], fW, fH);
  const wrist = clamp(cmToIn(cmFromPx(wristPx) * R.wristFactor), ranges.wrist.min, ranges.wrist.max);

  /* ---- Weight (kg) — kept for analytics, not displayed prominently ---- */
  const heightM = heightCm / 100;
  const waistToHeight = (inToCm(waist)) / heightCm;
  const bmi = R.averageBMI + (waistToHeight - 0.45) * 15;
  const weightKg = clamp(bmi * heightM * heightM, 35, 200);

  /* ---- Derived measurements (in inches) ---- */
  const underBust = roundEighth(clamp(
    bust * (gender === "female" ? 0.875 : 0.96),
    gender === "female" ? 23.6 : 27.6,
    gender === "female" ? 43.3 : 51.2,
  ));
  const roundArmWidthCm = hipWidthCm * R.thighWidthFromHip * 0.62;
  const roundArm = roundEighth(clamp(cmToIn(roundArmWidthCm * 2.0), 8.7, 21.7));
  const halfSleeve = roundEighth(clamp(armLength * 0.55, 9.8, 19.7));
  const halfLength = roundEighth(clamp(backLength, ranges.backLength.min, ranges.backLength.max));
  const blouseLength = roundEighth(clamp(backLength * 2.1, 17.7, 35.4));
  const fullLength = roundEighth(clamp(heightIn * 0.865, 51.2, 74.8));
  const shoulderToBust = roundEighth(clamp(frontLength * 0.56, 7.1, 11.8));
  const shoulderToHip = roundEighth(clamp(backLength * 1.62, 13.8, 27.6));
  const crotchLength = roundEighth(clamp(inseam * 0.22 + waist / 6, 8.7, 15.0));

  /* ---- Confidence ---- */
  const keyIdx = [
    L.LEFT_SHOULDER, L.RIGHT_SHOULDER, L.LEFT_HIP, L.RIGHT_HIP,
    L.LEFT_KNEE, L.RIGHT_KNEE, L.LEFT_ANKLE, L.RIGHT_ANKLE,
    L.LEFT_ELBOW, L.RIGHT_ELBOW, L.LEFT_WRIST, L.RIGHT_WRIST,
  ];
  const avgVis = keyIdx.reduce((s, i) => s + (fLm[i]?.visibility ?? 0), 0) / keyIdx.length;
  const sideBonus = sLm ? 0.10 : 0;
  const cardBonus = scaleSource === "card" ? 0.06 : 0;
  const maskBonus = front.segmentationMask ? 0.05 : 0;
  const confidence = clamp(avgVis * 0.80 + sideBonus + cardBonus + maskBonus, 0.55, 0.97);

  const visPair = (a: number, b: number) =>
    Math.min((fLm[a]?.visibility ?? 0) + (fLm[b]?.visibility ?? 0), 1);
  const shVis = visPair(L.LEFT_SHOULDER, L.RIGHT_SHOULDER);
  const hipVis = visPair(L.LEFT_HIP, L.RIGHT_HIP);
  const kneeVis = visPair(L.LEFT_KNEE, L.RIGHT_KNEE);
  const ankleVis = visPair(L.LEFT_ANKLE, L.RIGHT_ANKLE);
  const wristVis = visPair(L.LEFT_WRIST, L.RIGHT_WRIST);
  const elbowVis = visPair(L.LEFT_ELBOW, L.RIGHT_ELBOW);

  const maskBoost = front.segmentationMask ? 0.10 : 0;

  const confScores: Record<string, number> = {
    bust:          roundEighth(Math.min(0.97, shVis * 0.65 + (sLm ? 0.22 : 0) + maskBoost + cardBonus)),
    chest:         roundEighth(Math.min(0.97, shVis * 0.65 + (sLm ? 0.22 : 0) + maskBoost + cardBonus)),
    waist:         roundEighth(Math.min(0.95, hipVis * 0.6 + (sLm ? 0.20 : 0) + maskBoost + cardBonus)),
    hips:          roundEighth(Math.min(0.95, hipVis * 0.65 + (sLm ? 0.18 : 0) + maskBoost + cardBonus)),
    shoulder:      roundEighth(Math.min(0.95, shVis + cardBonus)),
    armLength:     roundEighth(Math.min(0.92, (shVis + elbowVis + wristVis) / 3 + cardBonus)),
    neck:          roundEighth(Math.min(0.85, shVis * 0.75)),
    backLength:    roundEighth(Math.min(0.88, (shVis + hipVis) / 2)),
    frontLength:   roundEighth(Math.min(0.85, (shVis + hipVis) / 2)),
    sleeveLength:  roundEighth(Math.min(0.90, (shVis + elbowVis + wristVis) / 3 + cardBonus)),
    wrist:         roundEighth(Math.min(0.82, wristVis)),
    thigh:         roundEighth(Math.min(0.82, hipVis * 0.8)),
    knee:          roundEighth(Math.min(0.84, kneeVis)),
    calf:          roundEighth(Math.min(0.78, kneeVis * 0.85)),
    ankle:         roundEighth(Math.min(0.82, ankleVis)),
    inseam:        roundEighth(Math.min(0.90, (hipVis + kneeVis + ankleVis) / 3 + cardBonus)),
    underBust:     0.68,
    roundArm:      0.62,
    halfSleeve:    0.72,
    halfLength:    roundEighth(Math.min(0.85, (shVis + hipVis) / 2)),
    blouseLength:  0.65,
    fullLength:    0.70,
    shoulderToBust: 0.60,
    shoulderToHip:  0.65,
    crotchLength:   0.52,
  };

  const aiEstimatedFields = [
    "underBust", "roundArm", "blouseLength", "halfLength",
    "crotchLength", "shoulderToBust", "shoulderToHip",
  ];

  /* ---- Cross-validate (in inches) and round to 1/8" ---- */
  const raw = {
    bust, chest, waist, hips, shoulder, armLength, sleeveLength, inseam,
    neck, backLength, frontLength, wrist, thigh, knee, calf, ankle,
    height: heightIn, weight: weightKg,
  };
  const validated = crossValidateAndNudge(raw, gender);

  return {
    measurements: {
      bust:          roundEighth(validated.bust),
      chest:         roundEighth(validated.chest),
      waist:         roundEighth(validated.waist),
      hips:          roundEighth(validated.hips),
      shoulder:      roundEighth(validated.shoulder),
      armLength:     roundEighth(validated.armLength),
      inseam:        roundEighth(validated.inseam),
      neck:          roundEighth(validated.neck),
      backLength:    roundEighth(validated.backLength),
      frontLength:   roundEighth(validated.frontLength),
      sleeveLength:  roundEighth(validated.sleeveLength),
      wrist:         roundEighth(validated.wrist),
      thigh:         roundEighth(validated.thigh),
      knee:          roundEighth(validated.knee),
      calf:          roundEighth(validated.calf),
      ankle:         roundEighth(validated.ankle),
      height:        roundEighth(heightIn),
      weight:        Math.round(weightKg * 10) / 10,
      underBust,
      roundArm,
      halfSleeve,
      halfLength,
      blouseLength,
      fullLength,
      shoulderToBust,
      shoulderToHip,
      crotchLength,
    },
    confidence: roundEighth(confidence),
    landmarkQuality: roundEighth(avgVis),
    confidenceScores: confScores,
    aiEstimatedFields,
    scaleSource,
    clothingWarnings: clothingWarnings.length > 0 ? clothingWarnings : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/*  Tape recalibration                                                          */
/*                                                                              */
/*  Designer measures ONE field with a tape (in inches) — we use the ratio to  */
/*  rescale every CIRCUMFERENCE proportionally (lengths are already accurate). */
/* -------------------------------------------------------------------------- */

const CIRCUMFERENCE_FIELDS = new Set([
  "bust", "chest", "underBust", "waist", "hips",
  "neck", "thigh", "knee", "calf", "ankle", "wrist", "roundArm",
]);

export interface TapeRecalibration {
  /** Field the designer measured manually. */
  anchorField: string;
  /** Real value in inches measured with a tape. */
  anchorInches: number;
  /** Result: the AI measurements rescaled to honour the anchor. */
  recalibrated: Record<string, number>;
  /** Multiplicative factor that was applied. */
  factor: number;
}

export function recalibrateWithTape(
  measurements: Record<string, number>,
  anchorField: string,
  anchorInches: number,
): TapeRecalibration | null {
  const orig = measurements[anchorField];
  if (!orig || orig <= 0 || !CIRCUMFERENCE_FIELDS.has(anchorField)) return null;
  const factor = anchorInches / orig;
  // Refuse silly factors — designer probably typed wrong unit
  if (factor < 0.5 || factor > 2.0) return null;

  const out: Record<string, number> = { ...measurements };
  for (const key of Object.keys(out)) {
    if (CIRCUMFERENCE_FIELDS.has(key)) {
      out[key] = roundEighth(out[key] * factor);
    }
  }
  out[anchorField] = roundEighth(anchorInches);
  return { anchorField, anchorInches, recalibrated: out, factor };
}
