"use client";

/* -------------------------------------------------------------------------- */
/*  AI Body Measurement Module                                                 */
/*  Uses MediaPipe PoseLandmarker for real body landmark detection             */
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
  x: number;   // normalized 0-1
  y: number;
  z: number;
  visibility?: number;
}

export interface MeasurementResult {
  measurements: Record<string, number>;
  confidence: number;
  landmarkQuality: number;
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

  const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
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
/* -------------------------------------------------------------------------- */

export function calculateMeasurements(
  front: Landmark[],
  side: Landmark[] | null,
  heightCm: number,
  frontW: number,
  frontH: number,
  sideW?: number,
  sideH?: number
): MeasurementResult {
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
  const shoulder = cm(shoulderPx);

  /* ---- Arm length (average L+R: shoulder → elbow → wrist) ---- */
  const leftArmPx =
    dist2D(front[L.LEFT_SHOULDER], front[L.LEFT_ELBOW], frontW, frontH) +
    dist2D(front[L.LEFT_ELBOW], front[L.LEFT_WRIST], frontW, frontH);
  const rightArmPx =
    dist2D(front[L.RIGHT_SHOULDER], front[L.RIGHT_ELBOW], frontW, frontH) +
    dist2D(front[L.RIGHT_ELBOW], front[L.RIGHT_WRIST], frontW, frontH);
  const armLength = cm((leftArmPx + rightArmPx) / 2);

  /* ---- Sleeve length ---- */
  const sleeveLength = armLength * 0.97;

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
  const inseam = cm((leftInseam + rightInseam) / 2);

  /* ---- Back / front length (shoulder midpoint → waist estimate) ---- */
  const waistRatio = 0.55; // waist is ~55% between shoulder and hip
  const hipMidY = midY(front[L.LEFT_HIP], front[L.RIGHT_HIP]);
  const waistY = shoulderMidY + (hipMidY - shoulderMidY) * waistRatio;
  const backLengthPx = (waistY - shoulderMidY) * frontH;
  const backLength = cm(backLengthPx) * 1.15; // curve correction
  const frontLength = backLength * 0.95;

  /* ---- Hip width (from front landmarks, with body correction) ---- */
  const hipWidthPx = dist2D(front[L.LEFT_HIP], front[L.RIGHT_HIP], frontW, frontH);
  const hipWidthCm = cm(hipWidthPx);

  /* ---- Circumference estimates ---- */
  let bust: number, waist: number, hips: number, chest: number;

  if (side && sideW && sideH) {
    // Use both views for elliptical circumference
    const sideNoseY = side[L.NOSE].y;
    const sideShouldMidY = midY(side[L.LEFT_SHOULDER], side[L.RIGHT_SHOULDER]);
    const sideHeadTopY = Math.max(0, sideNoseY - (sideShouldMidY - sideNoseY) * 0.55);
    const sideFeetY = Math.max(side[L.LEFT_ANKLE].y, side[L.RIGHT_ANKLE].y);
    const sideBodyPx = (sideFeetY - sideHeadTopY) * sideH;
    const sideScale = sideBodyPx > 0 ? heightCm / sideBodyPx : scale;
    const sCm = (px: number) => px * sideScale;

    // Side body depth at chest level
    const sideShoulderWidthPx = dist2D(side[L.LEFT_SHOULDER], side[L.RIGHT_SHOULDER], sideW, sideH);
    const chestDepthCm = sCm(sideShoulderWidthPx) * 0.9;

    // Side body depth at hip level
    const sideHipWidthPx = dist2D(side[L.LEFT_HIP], side[L.RIGHT_HIP], sideW, sideH);
    const hipDepthCm = sCm(sideHipWidthPx) * 1.1;

    const waistDepthCm = (chestDepthCm + hipDepthCm) / 2 * 0.85;

    // Ellipse circumferences (half-widths)
    const bustHalfW = shoulder * 0.52;
    const waistHalfW = hipWidthCm * 0.48;
    const hipHalfW = hipWidthCm * 0.58;

    bust = ellipseCirc(bustHalfW, chestDepthCm / 2);
    chest = bust;
    waist = ellipseCirc(waistHalfW, waistDepthCm / 2);
    hips = ellipseCirc(hipHalfW, hipDepthCm / 2);
  } else {
    // Fallback: anthropometric ratio-based estimation
    bust = shoulder * 2.55;
    chest = bust;
    waist = hipWidthCm * 2.35;
    hips = hipWidthCm * 2.5;
  }

  /* ---- Neck circumference ---- */
  const earDist = dist2D(front[L.LEFT_EAR], front[L.RIGHT_EAR], frontW, frontH);
  const neckWidth = cm(earDist) * 0.65;
  const neck = neckWidth * Math.PI * 0.33;

  /* ---- Thigh circumference ---- */
  // Estimate thigh width at mid-thigh (midpoint between hip and knee)
  const thighWidthEstimate = hipWidthCm * 0.38;
  const thigh = thighWidthEstimate * 2.3;

  /* ---- Knee circumference ---- */
  const kneeWidthPx = dist2D(front[L.LEFT_KNEE], front[L.RIGHT_KNEE], frontW, frontH);
  const kneeWidth = cm(kneeWidthPx);
  const knee = kneeWidth * 1.15;

  /* ---- Calf (estimated at mid-calf between knee and ankle) ---- */
  const calfWidth = kneeWidth * 0.88;
  const calf = calfWidth * 2.2;

  /* ---- Ankle ---- */
  const ankleWidthPx = dist2D(front[L.LEFT_ANKLE], front[L.RIGHT_ANKLE], frontW, frontH);
  const ankle = cm(ankleWidthPx) * 1.0;

  /* ---- Wrist ---- */
  const wristWidthPx = dist2D(front[L.LEFT_WRIST], front[L.RIGHT_WRIST], frontW, frontH);
  const wrist = cm(wristWidthPx) * 0.85;

  /* ---- Weight estimate (BMI-based approximation) ---- */
  const heightM = heightCm / 100;
  const estimatedBMI = 22.5; // average healthy BMI
  const weight = estimatedBMI * heightM * heightM;

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

  // Side photo boosts confidence
  const sideBonus = side ? 0.1 : 0;
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
