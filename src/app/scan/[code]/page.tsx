"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Upload,
  User,
  Shirt,
  Ruler,
  Loader2,
  ImagePlus,
  XCircle,
  Shield,
  Lightbulb,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  initPoseLandmarker,
  detectLandmarks,
  loadImage,
  calculateMeasurements,
  type MeasurementResult,
  type BodyGender,
} from "@/lib/body-measurement";

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

type ScanStep =
  | "loading"
  | "valid"
  | "guest-info"
  | "height"
  | "gender"
  | "pre-scan-check"
  | "front-photo"
  | "side-photo"
  | "review"
  | "analyzing"
  | "low-confidence"
  | "manual-entry"
  | "complete"
  | "expired"
  | "invalid"
  | "error";

interface SessionInfo {
  status: string;
  designerName?: string;
  businessName?: string;
  clientName?: string;
  clientGender?: string;
  isQuickScan?: boolean;
  expiresAt?: string;
  message?: string;
}

/* ========================================================================== */
/*  Animation variants                                                         */
/* ========================================================================== */

const stepVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.98,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
};

/* ========================================================================== */
/*  Height presets (common Nigerian heights)                                    */
/* ========================================================================== */

const HEIGHT_PRESETS = [150, 155, 160, 163, 165, 168, 170, 173, 175, 178, 180, 185];

/* ========================================================================== */
/*  Image resize utility                                                       */
/*  Resizes large photos to reduce MediaPipe processing time                   */
/* ========================================================================== */

function resizeImageIfNeeded(dataUrl: string, maxDim = 1280): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxDim && img.height <= maxDim) {
        resolve(dataUrl);
        return;
      }
      const scale = maxDim / Math.max(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/* ========================================================================== */
/*  Client-Facing Scan Page                                                    */
/* ========================================================================== */

export default function ClientScanPage() {
  const params = useParams();
  const code = params.code as string;

  const [step, setStep] = useState<ScanStep>("loading");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [sidePhoto, setSidePhoto] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestGender, setGuestGender] = useState<BodyGender>("female");
  const [selectedGender, setSelectedGender] = useState<BodyGender>("female");
  const [errorMessage, setErrorMessage] = useState("");
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [measurementResult, setMeasurementResult] =
    useState<MeasurementResult | null>(null);
  const [manualMeasurements, setManualMeasurements] = useState<Record<string, string>>({});
  const [deviceChecks, setDeviceChecks] = useState({ lighting: true, camera: true });

  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);
  const poseLandmarkerRef = useRef<ReturnType<typeof initPoseLandmarker> | null>(null);

  /* ---------------------------------------------------------------------- */
  /*  Preload MediaPipe when user reaches review step                        */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (step === "review" && !poseLandmarkerRef.current) {
      // Start loading the AI model in the background so it's ready on "Analyze"
      poseLandmarkerRef.current = initPoseLandmarker();
    }
  }, [step]);

  /* ---------------------------------------------------------------------- */
  /*  Validate the scan link on mount                                        */
  /* ---------------------------------------------------------------------- */

  const validateLink = useCallback(async () => {
    try {
      setStep("loading");
      const res = await fetch(`/api/scan/${code}`);
      const json = await res.json();

      if (!json.success && res.status === 404) {
        setStep("invalid");
        return;
      }

      const data = json.data as SessionInfo;
      setSessionInfo(data);

      // Pre-set gender from client profile if available
      if (data.clientGender) {
        setSelectedGender(data.clientGender as BodyGender);
      }

      switch (data.status) {
        case "pending":
          setStep("valid");
          break;
        case "expired":
          setStep("expired");
          break;
        case "completed":
          setStep("complete");
          break;
        case "failed":
          setStep("error");
          setErrorMessage(
            data.message ||
              "There was a problem with your scan. Please ask your designer for a new link."
          );
          break;
        default:
          setStep("invalid");
      }
    } catch {
      setStep("error");
      setErrorMessage(
        "Could not connect. Please check your internet and try again."
      );
    }
  }, [code]);

  useEffect(() => {
    if (code) {
      validateLink();
    }
  }, [code, validateLink]);

  /* ---------------------------------------------------------------------- */
  /*  Handle photo capture via file input                                    */
  /* ---------------------------------------------------------------------- */

  const handlePhotoCapture = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "side"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a photo (image file).");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage("Photo is too large. Please use a photo under 20MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      // Resize for faster processing
      const optimized = await resizeImageIfNeeded(dataUrl);
      if (type === "front") {
        setFrontPhoto(optimized);
        setStep("side-photo");
      } else {
        setSidePhoto(optimized);
        setStep("review");
      }
    };
    reader.readAsDataURL(file);
  };

  /* ---------------------------------------------------------------------- */
  /*  Analyze photos client-side with MediaPipe                              */
  /* ---------------------------------------------------------------------- */

  const handleAnalyze = async () => {
    if (!frontPhoto || !sidePhoto || !heightCm) return;

    // Determine gender for calibration
    const gender: BodyGender = sessionInfo?.isQuickScan
      ? guestGender
      : selectedGender;

    try {
      setStep("analyzing");
      setAnalyzeProgress(0);
      setAnalyzeStatus("Loading AI measurement model...");

      // Step 1: Initialize PoseLandmarker (may already be preloaded)
      const poseLandmarker = poseLandmarkerRef.current
        ? await poseLandmarkerRef.current
        : await initPoseLandmarker();
      setAnalyzeProgress(20);

      // Step 2: Load and detect landmarks on front photo
      setAnalyzeStatus("Analyzing front pose...");
      const frontImg = await loadImage(frontPhoto);
      const frontLandmarks = await detectLandmarks(poseLandmarker, frontImg);
      setAnalyzeProgress(45);

      if (!frontLandmarks) {
        setStep("error");
        setErrorMessage(
          "Could not detect your body in the front photo. Please make sure:\n\n• Your full body is visible (head to toe)\n• You're standing upright\n• The lighting is good\n• There's no one else in the photo"
        );
        return;
      }

      // Step 3: Load and detect landmarks on side photo
      setAnalyzeStatus("Analyzing side pose...");
      const sideImg = await loadImage(sidePhoto);
      const sideLandmarks = await detectLandmarks(poseLandmarker, sideImg);
      setAnalyzeProgress(70);

      // Step 4: Calculate measurements (gender-calibrated for African body types)
      setAnalyzeStatus("Calculating your measurements...");
      const result = calculateMeasurements(
        frontLandmarks,
        sideLandmarks,
        Number(heightCm),
        frontImg.naturalWidth,
        frontImg.naturalHeight,
        sideImg.naturalWidth,
        sideImg.naturalHeight,
        gender
      );
      setAnalyzeProgress(85);

      // Step 5: Send measurements to the API
      setAnalyzeStatus("Saving your measurements...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {
        measurements: result.measurements,
        confidence: result.confidence,
        heightCm: Number(heightCm),
        gender,
      };

      // Include guest info for quick scans
      if (sessionInfo?.isQuickScan && guestName.trim()) {
        payload.guestName = guestName.trim();
        payload.guestPhone = guestPhone.trim();
        payload.guestGender = guestGender;
      }

      setMeasurementResult(result);

      // Check confidence — below 70% triggers low-confidence fallback
      if (result.confidence < 0.70) {
        setAnalyzeProgress(100);
        // Pre-fill manual measurements with confident values
        const prefill: Record<string, string> = {};
        for (const [key, val] of Object.entries(result.measurements)) {
          if (val && key !== "height" && key !== "weight") {
            prefill[key] = String(val);
          }
        }
        setManualMeasurements(prefill);
        setStep("low-confidence");
        return;
      }

      const res = await fetch(`/api/scan/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      setAnalyzeProgress(100);

      if (json.success) {
        setStep("complete");
      } else {
        setStep("error");
        setErrorMessage(
          json.error || "Failed to save measurements. Please try again."
        );
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setStep("error");
      setErrorMessage(
        "An error occurred during analysis. Please check your internet connection and try again."
      );
    }
  };

  /* ---------------------------------------------------------------------- */
  /*  Save measurements (shared by accept-anyway and manual-entry)           */
  /* ---------------------------------------------------------------------- */

  const saveMeasurements = async (measurements: Record<string, number>, confidence: number) => {
    const gender: BodyGender = sessionInfo?.isQuickScan ? guestGender : selectedGender;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {
        measurements,
        confidence,
        heightCm: Number(heightCm),
        gender,
      };
      if (sessionInfo?.isQuickScan && guestName.trim()) {
        payload.guestName = guestName.trim();
        payload.guestPhone = guestPhone.trim();
        payload.guestGender = guestGender;
      }
      setAnalyzeStatus("Saving your measurements...");
      setStep("analyzing");
      setAnalyzeProgress(90);

      const res = await fetch(`/api/scan/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setAnalyzeProgress(100);

      if (json.success) {
        setMeasurementResult({ measurements, confidence, landmarkQuality: confidence });
        setStep("complete");
      } else {
        setStep("error");
        setErrorMessage(json.error || "Failed to save measurements. Please try again.");
      }
    } catch {
      setStep("error");
      setErrorMessage("Failed to save measurements. Please check your internet connection.");
    }
  };

  /* ---------------------------------------------------------------------- */
  /*  Reset photos                                                           */
  /* ---------------------------------------------------------------------- */

  const resetPhotos = () => {
    setFrontPhoto(null);
    setSidePhoto(null);
    setStep("front-photo");
  };

  /* ---------------------------------------------------------------------- */
  /*  Step navigation helpers                                                */
  /* ---------------------------------------------------------------------- */

  const getStepCount = () => {
    if (sessionInfo?.isQuickScan) return 5; // guest-info, height, pre-scan-check, front, side
    return sessionInfo?.clientGender ? 4 : 5; // height, [gender], pre-scan-check, front, side
  };

  const getCurrentStep = () => {
    if (sessionInfo?.isQuickScan) {
      if (step === "guest-info") return 1;
      if (step === "height") return 2;
      if (step === "pre-scan-check") return 3;
      if (step === "front-photo") return 4;
      if (step === "side-photo") return 5;
    } else {
      if (step === "height") return 1;
      if (step === "gender") return 2;
      if (step === "pre-scan-check") return sessionInfo?.clientGender ? 2 : 3;
      if (step === "front-photo") return sessionInfo?.clientGender ? 3 : 4;
      if (step === "side-photo") return sessionInfo?.clientGender ? 4 : 5;
    }
    return 1;
  };

  /* ====================================================================== */
  /*  RENDER                                                                 */
  /* ====================================================================== */

  return (
    <div className="flex flex-1 flex-col">
      {/* Hidden file inputs for camera capture */}
      <input
        ref={frontInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handlePhotoCapture(e, "front")}
      />
      <input
        ref={sideInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handlePhotoCapture(e, "side")}
      />

      <AnimatePresence mode="wait">
        {/* ============================================================== */}
        {/*  LOADING                                                        */}
        {/* ============================================================== */}
        {step === "loading" && (
          <motion.div
            key="loading"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col items-center justify-center gap-5"
          >
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-[#C75B39]/20" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-lg">
                <span className="text-2xl font-bold text-white">S</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-[#1A1A2E]">
                Checking your link...
              </p>
              <p className="mt-1 text-sm text-[#1A1A2E]/50">
                Please wait a moment
              </p>
            </div>
            <div className="h-1 w-40 overflow-hidden rounded-full bg-[#C75B39]/10">
              <div className="h-full w-1/2 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#C75B39]/0 via-[#C75B39] to-[#C75B39]/0" />
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  VALID - Welcome screen                                         */}
        {/* ============================================================== */}
        {step === "valid" && sessionInfo && (
          <motion.div
            key="valid"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col"
          >
            {/* Welcome card */}
            <div className="rounded-2xl border border-white/30 bg-white/50 p-6 shadow-[0_8px_32px_rgba(26,26,46,0.06)] backdrop-blur-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#C75B39]/15 to-[#D4A853]/15">
                  <User className="h-6 w-6 text-[#C75B39]" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[#1A1A2E]">
                    {sessionInfo.designerName}
                  </p>
                  {sessionInfo.businessName && (
                    <p className="text-sm text-[#1A1A2E]/50">
                      {sessionInfo.businessName}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-1 h-px bg-[#1A1A2E]/8" />

              <div className="mt-4">
                <h1 className="text-xl font-bold text-[#1A1A2E]">
                  Hello
                  {sessionInfo.clientName
                    ? `, ${sessionInfo.clientName.split(" ")[0]}`
                    : ""}
                  !
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#1A1A2E]/65">
                  {sessionInfo.isQuickScan
                    ? "Welcome! We'll guide you through taking two quick photos to capture your body measurements using AI."
                    : "Your designer needs your body measurements. We'll guide you through taking two quick photos so our AI can measure you accurately."}
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
                Before you start
              </p>

              <InstructionItem
                icon={Shirt}
                title="Wear fitted clothing"
                description="Tight or fitted clothes give the best results. Avoid baggy outfits like agbada or flowing gowns."
              />
              <InstructionItem
                icon={Ruler}
                title="Full body in frame"
                description="Stand 2-3 meters from the camera. Ask someone to help or use a timer. Head to toe must be visible."
              />
              <InstructionItem
                icon={Camera}
                title="Two photos needed"
                description="One from the front, one from the side. Stand straight with arms slightly away from your body."
              />
              <InstructionItem
                icon={Shield}
                title="Military-Grade Privacy"
                description="Photos are processed by AI on your phone and NEVER leave your device. Only measurements are saved. Zero data stored on any server."
              />
            </div>

            {/* Start button */}
            <div className="mt-auto pt-8">
              <button
                onClick={() =>
                  setStep(sessionInfo.isQuickScan ? "guest-info" : "height")
                }
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98] hover:shadow-xl"
              >
                <Sparkles className="h-5 w-5" />
                Start AI Measurement
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  GUEST INFO                                                     */}
        {/* ============================================================== */}
        {step === "guest-info" && (
          <motion.div
            key="guest-info"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col"
          >
            <ProgressBar current={1} total={getStepCount()} />

            <div className="mt-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
                <User className="h-8 w-8 text-[#C75B39]" />
              </div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                Your Details
              </h2>
              <p className="mt-1 text-sm text-[#1A1A2E]/55">
                So your designer can identify your measurements
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]/70">
                  Full Name
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-[#1A1A2E]/15 bg-white/60 px-4 py-3 text-sm text-[#1A1A2E] shadow-sm backdrop-blur-sm transition-all placeholder:text-[#1A1A2E]/30 focus:border-[#C75B39]/40 focus:outline-none focus:ring-2 focus:ring-[#C75B39]/15"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]/70">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="e.g. 0801 234 5678"
                  className="w-full rounded-xl border border-[#1A1A2E]/15 bg-white/60 px-4 py-3 text-sm text-[#1A1A2E] shadow-sm backdrop-blur-sm transition-all placeholder:text-[#1A1A2E]/30 focus:border-[#C75B39]/40 focus:outline-none focus:ring-2 focus:ring-[#C75B39]/15"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]/70">
                  Gender
                </label>
                <div className="flex gap-3">
                  {(["female", "male"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGuestGender(g)}
                      className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold capitalize transition-all duration-200 active:scale-95 ${
                        guestGender === g
                          ? "bg-gradient-to-r from-[#C75B39] to-[#D4A853] text-white shadow-md"
                          : "border border-[#1A1A2E]/10 bg-white/50 text-[#1A1A2E]/70 backdrop-blur-sm hover:bg-white/70"
                      }`}
                    >
                      {g === "female" ? "Female" : "Male"}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-[#1A1A2E]/40">
                  Helps our AI calibrate measurements for your body type
                </p>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <button
                onClick={() => setStep("height")}
                disabled={!guestName.trim() || !guestPhone.trim()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
              >
                Continue
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  HEIGHT                                                         */}
        {/* ============================================================== */}
        {step === "height" && (
          <motion.div
            key="height"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col"
          >
            <ProgressBar current={getCurrentStep()} total={getStepCount()} />

            <div className="mt-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8 text-[#C75B39]"
                >
                  <circle cx="12" cy="4" r="2" />
                  <line x1="12" y1="6" x2="12" y2="16" />
                  <line x1="12" y1="10" x2="8" y2="13" />
                  <line x1="12" y1="10" x2="16" y2="13" />
                  <line x1="12" y1="16" x2="9" y2="21" />
                  <line x1="12" y1="16" x2="15" y2="21" />
                  <line x1="20" y1="2" x2="20" y2="22" />
                  <line x1="18.5" y1="2" x2="21.5" y2="2" />
                  <line x1="18.5" y1="22" x2="21.5" y2="22" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                What is your height?
              </h2>
              <p className="mt-1 text-sm text-[#1A1A2E]/55">
                This is the key reference for all your measurements
              </p>
            </div>

            <div className="mt-6">
              <div className="relative mx-auto max-w-[220px]">
                <input
                  type="number"
                  inputMode="numeric"
                  value={heightCm}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setHeightCm("");
                    } else {
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num >= 0 && num <= 250) {
                        setHeightCm(num);
                      }
                    }
                  }}
                  placeholder="170"
                  className="w-full rounded-2xl border border-[#C75B39]/20 bg-white/60 px-6 py-4 text-center text-3xl font-bold text-[#1A1A2E] shadow-sm backdrop-blur-sm transition-all placeholder:text-[#1A1A2E]/20 focus:border-[#C75B39]/50 focus:outline-none focus:ring-2 focus:ring-[#C75B39]/20"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-base font-medium text-[#1A1A2E]/40">
                  cm
                </span>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-center text-xs font-medium text-[#1A1A2E]/40">
                Quick select (tap your height)
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {HEIGHT_PRESETS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHeightCm(h)}
                    className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                      heightCm === h
                        ? "bg-gradient-to-r from-[#C75B39] to-[#D4A853] text-white shadow-md"
                        : "border border-[#1A1A2E]/10 bg-white/50 text-[#1A1A2E]/70 backdrop-blur-sm hover:bg-white/70"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-[#D4A853]/8 p-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A853]" />
              <p className="text-xs leading-relaxed text-[#1A1A2E]/60">
                Don&apos;t know your exact height? Stand against a wall, mark
                the top of your head, and measure from the floor to the mark.
              </p>
            </div>

            <div className="mt-auto flex gap-3 pt-8">
              <button
                onClick={() =>
                  setStep(sessionInfo?.isQuickScan ? "guest-info" : "valid")
                }
                className="flex items-center justify-center rounded-2xl border border-[#1A1A2E]/10 bg-white/50 px-4 py-4.5 text-[#1A1A2E]/60 transition-colors active:bg-white/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  if (!sessionInfo?.isQuickScan && !sessionInfo?.clientGender) {
                    setStep("gender");
                  } else {
                    setStep("pre-scan-check");
                  }
                }}
                disabled={!heightCm}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
              >
                Continue
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  GENDER - For non-quick scans where client gender isn't set      */}
        {/* ============================================================== */}
        {step === "gender" && (
          <motion.div
            key="gender"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col"
          >
            <ProgressBar current={2} total={getStepCount()} />

            <div className="mt-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
                <User className="h-8 w-8 text-[#C75B39]" />
              </div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                Select Your Gender
              </h2>
              <p className="mt-1 text-sm text-[#1A1A2E]/55">
                Helps our AI calibrate for your body type
              </p>
            </div>

            <div className="mt-8 flex gap-4">
              {(["female", "male"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGender(g)}
                  className={`flex flex-1 flex-col items-center gap-3 rounded-2xl px-4 py-6 transition-all duration-200 active:scale-[0.97] ${
                    selectedGender === g
                      ? "border-2 border-[#C75B39]/30 bg-gradient-to-br from-[#C75B39]/8 to-[#D4A853]/8 shadow-md"
                      : "border-2 border-[#1A1A2E]/8 bg-white/40 hover:bg-white/60"
                  }`}
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                      selectedGender === g
                        ? "bg-gradient-to-br from-[#C75B39] to-[#D4A853]"
                        : "bg-[#1A1A2E]/8"
                    }`}
                  >
                    <span className="text-2xl">
                      {g === "female" ? "👩" : "👨"}
                    </span>
                  </div>
                  <span
                    className={`text-base font-semibold capitalize ${
                      selectedGender === g
                        ? "text-[#C75B39]"
                        : "text-[#1A1A2E]/60"
                    }`}
                  >
                    {g}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-[#D4A853]/8 p-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A853]" />
              <p className="text-xs leading-relaxed text-[#1A1A2E]/60">
                Our AI uses different body proportion models for male and
                female measurements, calibrated for African body types.
              </p>
            </div>

            <div className="mt-auto flex gap-3 pt-8">
              <button
                onClick={() => setStep("height")}
                className="flex items-center justify-center rounded-2xl border border-[#1A1A2E]/10 bg-white/50 px-4 py-4.5 text-[#1A1A2E]/60 transition-colors active:bg-white/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setStep("pre-scan-check")}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                Continue
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  PRE-SCAN CHECKLIST                                             */}
        {/* ============================================================== */}
        {step === "pre-scan-check" && (
          <motion.div
            key="pre-scan-check"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col"
          >
            <ProgressBar current={getCurrentStep()} total={getStepCount()} />

            <div className="mt-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
                <CheckCircle2 className="h-8 w-8 text-[#C75B39]" />
              </div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                Before You Start
              </h2>
              <p className="mt-1 text-sm text-[#1A1A2E]/55">
                Check these items for the best measurement results
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <PreScanCheckItem
                icon="☀️"
                title="Good lighting"
                description="Stand near a window or in a well-lit room. Avoid harsh shadows."
                status={deviceChecks.lighting ? "pass" : "warn"}
              />
              <PreScanCheckItem
                icon="👕"
                title="Fitted clothing"
                description="Wear tight or fitted clothes. Avoid baggy agbada, flowing gowns, or thick jackets."
                status="info"
              />
              <PreScanCheckItem
                icon="🧱"
                title="Plain background"
                description="Stand against a plain wall. Clear the area around you."
                status="info"
              />
              <PreScanCheckItem
                icon="📱"
                title="Full body visible"
                description="Ask someone to help or prop your phone 2-3 meters away. Head to toe must be visible."
                status="info"
              />
            </div>

            <div className="mt-4 rounded-xl bg-[#D4A853]/8 p-3">
              <p className="text-xs leading-relaxed text-[#1A1A2E]/60">
                <span className="font-semibold text-[#D4A853]">Tip:</span> For the best accuracy,
                hold a standard A4 paper flat against your chest in the front photo. This helps
                our AI calibrate pixel-to-centimetre conversion on your specific camera.
              </p>
            </div>

            <div className="mt-auto flex gap-3 pt-6">
              <button
                onClick={() => {
                  if (!sessionInfo?.isQuickScan && !sessionInfo?.clientGender) {
                    setStep("gender");
                  } else {
                    setStep("height");
                  }
                }}
                className="flex items-center justify-center rounded-2xl border border-[#1A1A2E]/10 bg-white/50 px-4 py-4.5 text-[#1A1A2E]/60 transition-colors active:bg-white/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setStep("front-photo")}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                <Camera className="h-5 w-5" />
                Ready — Take Photos
              </button>
            </div>

            {/* Manual measurement option */}
            <button
              onClick={() => setStep("manual-entry")}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/40 px-4 py-3 text-sm font-medium text-[#1A1A2E]/60 transition-colors active:bg-white/60"
            >
              <Ruler className="h-4 w-4" />
              Enter Measurements Manually Instead
            </button>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  FRONT PHOTO                                                    */}
        {/* ============================================================== */}
        {step === "front-photo" && (
          <motion.div
            key="front-photo"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col"
          >
            <ProgressBar current={getCurrentStep()} total={getStepCount()} />

            <h2 className="mt-4 text-center text-lg font-bold text-[#1A1A2E]">
              Front Photo
            </h2>
            <p className="mt-1 text-center text-sm text-[#1A1A2E]/55">
              Stand facing the camera with arms slightly away from your body
            </p>

            {/* Body outline guide */}
            <div className="relative mx-auto mt-5 flex w-full max-w-[280px] flex-col items-center">
              <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#C75B39]/25 bg-white/30 backdrop-blur-sm">
                <div className="relative h-[75%] w-[40%]">
                  <div className="mx-auto h-[14%] w-[38%] rounded-full border-2 border-[#C75B39]/20" />
                  <div className="mx-auto h-[3%] w-[15%] border-x-2 border-[#C75B39]/20" />
                  <div className="mx-auto h-[30%] w-[70%] rounded-t-lg border-2 border-b-0 border-[#C75B39]/20" />
                  <div className="mx-auto h-[8%] w-[75%] border-x-2 border-[#C75B39]/20" />
                  <div className="flex h-[42%] justify-center gap-[10%]">
                    <div className="h-full w-[30%] rounded-b-lg border-2 border-t-0 border-[#C75B39]/20" />
                    <div className="h-full w-[30%] rounded-b-lg border-2 border-t-0 border-[#C75B39]/20" />
                  </div>
                  <div className="absolute left-[-22%] top-[19%] h-[38%] w-[15%] rounded-b-lg border-2 border-t-0 border-[#C75B39]/15" />
                  <div className="absolute right-[-22%] top-[19%] h-[38%] w-[15%] rounded-b-lg border-2 border-t-0 border-[#C75B39]/15" />
                </div>

                <div className="absolute left-3 top-3 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-[#C75B39]/40" />
                <div className="absolute right-3 top-3 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-[#C75B39]/40" />
                <div className="absolute bottom-3 left-3 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-[#C75B39]/40" />
                <div className="absolute bottom-3 right-3 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-[#C75B39]/40" />

                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="rounded-full bg-[#C75B39]/10 px-3 py-1 text-xs font-medium text-[#C75B39]">
                    FRONT VIEW
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <PhotoTip text="Full body visible — head to toe" />
              <PhotoTip text="Arms slightly away from body" />
              <PhotoTip text="Good lighting, plain background" />
              <PhotoTip text="Stand straight, face the camera" />
            </div>

            <div className="mt-auto pt-6">
              <button
                onClick={() => frontInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                <Camera className="h-5 w-5" />
                Take Front Photo
              </button>
              <button
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) =>
                    handlePhotoCapture(
                      e as unknown as React.ChangeEvent<HTMLInputElement>,
                      "front"
                    );
                  input.click();
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/40 px-4 py-3 text-sm font-medium text-[#1A1A2E]/60 transition-colors active:bg-white/60"
              >
                <ImagePlus className="h-4 w-4" />
                Choose from Gallery
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  SIDE PHOTO                                                     */}
        {/* ============================================================== */}
        {step === "side-photo" && (
          <motion.div
            key="side-photo"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col"
          >
            <ProgressBar current={getCurrentStep()} total={getStepCount()} />

            <h2 className="mt-4 text-center text-lg font-bold text-[#1A1A2E]">
              Side Photo
            </h2>
            <p className="mt-1 text-center text-sm text-[#1A1A2E]/55">
              Turn sideways (left or right). Keep your arms relaxed.
            </p>

            {frontPhoto && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="h-12 w-9 overflow-hidden rounded-lg border border-green-400/30 bg-green-50/50">
                  <img
                    src={frontPhoto}
                    alt="Front photo preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-600">
                  Front photo saved
                </span>
              </div>
            )}

            <div className="relative mx-auto mt-4 flex w-full max-w-[280px] flex-col items-center">
              <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#D4A853]/25 bg-white/30 backdrop-blur-sm">
                <div className="relative h-[75%] w-[25%]">
                  <div className="mx-auto h-[14%] w-[85%] rounded-full border-2 border-[#D4A853]/20" />
                  <div className="mx-auto h-[3%] w-[40%] border-x-2 border-[#D4A853]/20" />
                  <div className="mx-auto h-[30%] w-full rounded-t-md border-2 border-b-0 border-[#D4A853]/20" />
                  <div className="mx-auto h-[8%] w-full border-x-2 border-[#D4A853]/20" />
                  <div className="mx-auto h-[42%] w-[75%] rounded-b-md border-2 border-t-0 border-[#D4A853]/20" />
                </div>

                <div className="absolute left-3 top-3 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-[#D4A853]/40" />
                <div className="absolute right-3 top-3 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-[#D4A853]/40" />
                <div className="absolute bottom-3 left-3 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-[#D4A853]/40" />
                <div className="absolute bottom-3 right-3 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-[#D4A853]/40" />

                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="rounded-full bg-[#D4A853]/10 px-3 py-1 text-xs font-medium text-[#D4A853]">
                    SIDE VIEW
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <PhotoTip text="Turn 90 degrees — left or right side" />
              <PhotoTip text="Stand naturally, look forward" />
              <PhotoTip text="Arms at your sides or slightly forward" />
            </div>

            <div className="mt-auto pt-6">
              <button
                onClick={() => sideInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#D4A853] to-[#c48e30] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                <Camera className="h-5 w-5" />
                Take Side Photo
              </button>
              <button
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) =>
                    handlePhotoCapture(
                      e as unknown as React.ChangeEvent<HTMLInputElement>,
                      "side"
                    );
                  input.click();
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/40 px-4 py-3 text-sm font-medium text-[#1A1A2E]/60 transition-colors active:bg-white/60"
              >
                <ImagePlus className="h-4 w-4" />
                Choose from Gallery
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  REVIEW                                                         */}
        {/* ============================================================== */}
        {step === "review" && (
          <motion.div
            key="review"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col"
          >
            <h2 className="text-center text-lg font-bold text-[#1A1A2E]">
              Review Your Photos
            </h2>
            <p className="mt-1 text-center text-sm text-[#1A1A2E]/55">
              Make sure both photos are clear and your full body is visible
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-green-400/30 bg-white/30 shadow-sm">
                  {frontPhoto && (
                    <img
                      src={frontPhoto}
                      alt="Front photo"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute left-2 top-2">
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[#1A1A2E] shadow-sm backdrop-blur-sm">
                      FRONT
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 drop-shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-green-400/30 bg-white/30 shadow-sm">
                  {sidePhoto && (
                    <img
                      src={sidePhoto}
                      alt="Side photo"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute left-2 top-2">
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[#1A1A2E] shadow-sm backdrop-blur-sm">
                      SIDE
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 drop-shadow-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Military-Grade Privacy Badge */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200/40 bg-emerald-500/5 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-700">Military-Grade Privacy</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-600/70">
                  Photos processed on-device only. Never uploaded. Never stored. Only measurements are saved.
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <ReviewCheckItem text="Full body visible from head to toe" />
              <ReviewCheckItem text="Photos are clear and well lit" />
              <ReviewCheckItem text="Standing straight with arms slightly out" />
            </div>

            <div className="mt-auto space-y-3 pt-6">
              <button
                onClick={handleAnalyze}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                <Sparkles className="h-5 w-5" />
                Analyze My Measurements
              </button>
              <button
                onClick={resetPhotos}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/40 px-4 py-3 text-sm font-medium text-[#1A1A2E]/60 transition-colors active:bg-white/60"
              >
                <RotateCcw className="h-4 w-4" />
                Retake Photos
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  ANALYZING                                                      */}
        {/* ============================================================== */}
        {step === "analyzing" && (
          <motion.div
            key="analyzing"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col items-center justify-center gap-6"
          >
            <div className="relative">
              <div
                className="absolute inset-[-8px] animate-spin rounded-full border-2 border-transparent border-t-[#C75B39]/40"
                style={{ animationDuration: "2s" }}
              />
              <div
                className="absolute inset-[-4px] animate-spin rounded-full border-2 border-transparent border-b-[#D4A853]/30"
                style={{
                  animationDuration: "3s",
                  animationDirection: "reverse",
                }}
              />
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
                <Ruler className="h-9 w-9 text-[#C75B39]" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-[#1A1A2E]">
                AI is measuring you...
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#1A1A2E]/50">
                {analyzeStatus}
              </p>
            </div>

            <div className="w-56">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#C75B39]/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#C75B39] to-[#D4A853]"
                  initial={{ width: "0%" }}
                  animate={{ width: `${analyzeProgress}%` }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </div>
              <p className="mt-2 text-center text-xs font-medium text-[#1A1A2E]/40">
                {analyzeProgress}%
              </p>
            </div>

            <div className="space-y-1.5 text-center">
              {analyzeProgress >= 20 && (
                <p className="text-[10px] text-green-600">
                  {analyzeProgress > 20 ? "✓" : "..."} AI model loaded
                </p>
              )}
              {analyzeProgress >= 45 && (
                <p className="text-[10px] text-green-600">
                  {analyzeProgress > 45 ? "✓" : "..."} Front pose detected
                </p>
              )}
              {analyzeProgress >= 70 && (
                <p className="text-[10px] text-green-600">
                  {analyzeProgress > 70 ? "✓" : "..."} Side pose analyzed
                </p>
              )}
              {analyzeProgress >= 85 && (
                <p className="text-[10px] text-green-600">
                  {analyzeProgress > 85 ? "✓" : "..."} Measurements calculated
                </p>
              )}
            </div>

            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2.5 w-2.5 rounded-full bg-[#C75B39]"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  LOW CONFIDENCE — AI wasn't confident enough                    */}
        {/* ============================================================== */}
        {step === "low-confidence" && measurementResult && (
          <motion.div
            key="low-confidence"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col items-center gap-5"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold text-[#1A1A2E]">
                Results Need Review
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#1A1A2E]/60">
                Our AI confidence was{" "}
                <span className="font-semibold text-amber-600">
                  {Math.round(measurementResult.confidence * 100)}%
                </span>{" "}
                — below the 70% threshold. This can happen with poor lighting, baggy clothing, or if your full body wasn&apos;t visible.
              </p>
            </div>

            <div className="w-full space-y-3 pt-2">
              {/* Option 1: Retake (recommended) */}
              <button
                onClick={resetPhotos}
                className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-5 py-4 text-left text-white shadow-lg transition-all active:scale-[0.98]"
              >
                <RotateCcw className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Retake Photos</p>
                  <p className="text-xs text-white/70">Recommended — try better lighting or clothing</p>
                </div>
              </button>

              {/* Option 2: Accept anyway */}
              <button
                onClick={() => {
                  if (measurementResult) {
                    saveMeasurements(measurementResult.measurements, measurementResult.confidence);
                  }
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#1A1A2E]/10 bg-white/50 px-5 py-4 text-left transition-all active:scale-[0.98]"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-[#1A1A2E]">Accept Results Anyway</p>
                  <p className="text-xs text-[#1A1A2E]/50">Results may not be fully accurate</p>
                </div>
              </button>

              {/* Option 3: Manual entry */}
              <button
                onClick={() => setStep("manual-entry")}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#1A1A2E]/10 bg-white/50 px-5 py-4 text-left transition-all active:scale-[0.98]"
              >
                <Ruler className="h-5 w-5 shrink-0 text-[#D4A853]" />
                <div>
                  <p className="text-sm font-semibold text-[#1A1A2E]">Switch to Manual Entry</p>
                  <p className="text-xs text-[#1A1A2E]/50">AI-detected values pre-filled where confident</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  MANUAL ENTRY MODE                                              */}
        {/* ============================================================== */}
        {step === "manual-entry" && (
          <motion.div
            key="manual-entry"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col"
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4A853]/10 to-[#C75B39]/10">
                <Ruler className="h-7 w-7 text-[#D4A853]" />
              </div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                Manual Measurements
              </h2>
              <p className="mt-1 text-sm text-[#1A1A2E]/55">
                Enter your measurements in centimetres. Leave blank any you don&apos;t know.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 overflow-y-auto" style={{ maxHeight: "50vh" }}>
              {[
                { key: "bust", label: "Bust" },
                { key: "waist", label: "Waist" },
                { key: "hips", label: "Hips" },
                { key: "shoulder", label: "Shoulder" },
                { key: "chest", label: "Chest" },
                { key: "neck", label: "Neck" },
                { key: "armLength", label: "Arm Length" },
                { key: "sleeveLength", label: "Sleeve" },
                { key: "backLength", label: "Back Length" },
                { key: "frontLength", label: "Front Length" },
                { key: "inseam", label: "Inseam" },
                { key: "thigh", label: "Thigh" },
                { key: "knee", label: "Knee" },
                { key: "calf", label: "Calf" },
                { key: "wrist", label: "Wrist" },
                { key: "ankle", label: "Ankle" },
              ].map((m) => (
                <div key={m.key}>
                  <label className="mb-1 block text-[10px] font-medium text-[#1A1A2E]/55">
                    {m.label} (cm)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={manualMeasurements[m.key] || ""}
                    onChange={(e) =>
                      setManualMeasurements((prev) => ({ ...prev, [m.key]: e.target.value }))
                    }
                    placeholder="—"
                    className="w-full rounded-xl border border-[#1A1A2E]/10 bg-white/60 px-3 py-2.5 text-sm text-[#1A1A2E] backdrop-blur-sm placeholder:text-[#1A1A2E]/20 focus:border-[#C75B39]/40 focus:outline-none focus:ring-1 focus:ring-[#C75B39]/15"
                  />
                </div>
              ))}
            </div>

            <div className="mt-auto space-y-3 pt-6">
              <button
                onClick={() => {
                  const measurements: Record<string, number> = {};
                  let count = 0;
                  for (const [key, val] of Object.entries(manualMeasurements)) {
                    const num = parseFloat(val);
                    if (!isNaN(num) && num > 0) {
                      measurements[key] = Math.round(num * 10) / 10;
                      count++;
                    }
                  }
                  if (heightCm) measurements.height = Number(heightCm);
                  if (count < 3) {
                    setErrorMessage("Please enter at least 3 measurements.");
                    return;
                  }
                  saveMeasurements(measurements, 1.0);
                }}
                disabled={Object.values(manualMeasurements).filter((v) => v && parseFloat(v) > 0).length < 3}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
              >
                <CheckCircle2 className="h-5 w-5" />
                Save Measurements
              </button>
              <button
                onClick={() => setStep(measurementResult ? "low-confidence" : "pre-scan-check")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/40 px-4 py-3 text-sm font-medium text-[#1A1A2E]/60 transition-colors active:bg-white/60"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  COMPLETE                                                       */}
        {/* ============================================================== */}
        {step === "complete" && (
          <motion.div
            key="complete"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col items-center justify-center gap-5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.1,
              }}
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-50 shadow-[0_0_40px_rgba(22,163,74,0.15)]">
                <CheckCircle2 className="h-14 w-14 text-green-500" />
              </div>
            </motion.div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-[#1A1A2E]">All Done!</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#1A1A2E]/60">
                Your measurements have been recorded
                <br />
                successfully.{" "}
                {sessionInfo?.designerName && (
                  <>
                    <span className="font-medium text-[#1A1A2E]/80">
                      {sessionInfo.designerName}
                    </span>{" "}
                    will review and confirm them before use.
                  </>
                )}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1">
                <Shield className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-600">Photos deleted from memory</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-2 w-full rounded-2xl border border-green-200/40 bg-green-50/30 p-5 backdrop-blur-sm"
            >
              <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-green-600/70">
                Your Measurements
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Bust", key: "bust" },
                  { label: "Waist", key: "waist" },
                  { label: "Hips", key: "hips" },
                  { label: "Shoulder", key: "shoulder" },
                  { label: "Arm", key: "armLength" },
                  { label: "Inseam", key: "inseam" },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="text-xs text-[#1A1A2E]/40">{m.label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-green-600">
                      {measurementResult?.measurements[m.key]
                        ? `${measurementResult.measurements[m.key]} cm`
                        : "--"}
                    </p>
                  </div>
                ))}
              </div>

              {measurementResult && (
                <div className="mt-4 flex items-center justify-center gap-2 border-t border-green-200/30 pt-3">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <p className="text-xs font-medium text-[#1A1A2E]/50">
                    Confidence:{" "}
                    <span className="text-green-600">
                      {Math.round(measurementResult.confidence * 100)}%
                    </span>
                  </p>
                </div>
              )}

              <p className="mt-3 text-center text-[10px] text-[#1A1A2E]/35">
                Your designer can view the full measurements in their dashboard
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-4 text-center text-sm text-[#1A1A2E]/45"
            >
              You can safely close this page now.
            </motion.p>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  EXPIRED                                                        */}
        {/* ============================================================== */}
        {step === "expired" && (
          <motion.div
            key="expired"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col items-center justify-center gap-5"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#D4A853]/10">
              <Clock className="h-10 w-10 text-[#D4A853]" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#1A1A2E]">
                Link Expired
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#1A1A2E]/55">
                {sessionInfo?.message ||
                  "This scan link has expired. Please contact your designer to get a new link."}
              </p>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  INVALID                                                        */}
        {/* ============================================================== */}
        {step === "invalid" && (
          <motion.div
            key="invalid"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col items-center justify-center gap-5"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-10 w-10 text-red-400" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#1A1A2E]">
                Invalid Link
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#1A1A2E]/55">
                This scan link is not valid. Please check the link or ask your
                designer to send you a new one.
              </p>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  ERROR                                                          */}
        {/* ============================================================== */}
        {step === "error" && (
          <motion.div
            key="error"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 flex-col items-center justify-center gap-5"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#1A1A2E]">
                Something Went Wrong
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#1A1A2E]/55">
                {errorMessage ||
                  "An error occurred. Please try again or contact your designer."}
              </p>
            </div>
            <div className="flex gap-3">
              {frontPhoto && sidePhoto && (
                <button
                  onClick={() => setStep("review")}
                  className="mt-2 flex items-center gap-2 rounded-xl border border-[#C75B39]/20 bg-[#C75B39]/5 px-5 py-3 text-sm font-medium text-[#C75B39] transition-colors active:bg-[#C75B39]/10"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry Analysis
                </button>
              )}
              <button
                onClick={() => {
                  setFrontPhoto(null);
                  setSidePhoto(null);
                  setErrorMessage("");
                  validateLink();
                }}
                className="mt-2 flex items-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/60 px-5 py-3 text-sm font-medium text-[#1A1A2E]/70 transition-colors active:bg-white/80"
              >
                <RotateCcw className="h-4 w-4" />
                Start Over
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================== */
/*  Sub-components                                                             */
/* ========================================================================== */

function InstructionItem({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Camera;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/30 bg-white/40 p-3.5 backdrop-blur-sm">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
        <Icon className="h-4.5 w-4.5 text-[#C75B39]" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1A1A2E]">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#1A1A2E]/55">
          {description}
        </p>
      </div>
    </div>
  );
}

function PhotoTip({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C75B39]/40" />
      <span className="text-xs text-[#1A1A2E]/55">{text}</span>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="text-xs font-medium text-[#1A1A2E]/50">
        Step {current} of {total}
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
              i < current
                ? "bg-gradient-to-r from-[#C75B39] to-[#D4A853]"
                : "bg-[#1A1A2E]/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function PreScanCheckItem({
  icon,
  title,
  description,
  status,
}: {
  icon: string;
  title: string;
  description: string;
  status: "pass" | "warn" | "info";
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-3.5 backdrop-blur-sm",
        status === "warn"
          ? "border-amber-200/60 bg-amber-50/40"
          : status === "pass"
          ? "border-green-200/60 bg-green-50/30"
          : "border-white/30 bg-white/40"
      )}
    >
      <span className="mt-0.5 text-lg">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-[#1A1A2E]">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#1A1A2E]/55">{description}</p>
      </div>
      {status === "pass" && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-green-500" />}
      {status === "warn" && <AlertTriangle className="ml-auto h-4 w-4 shrink-0 text-amber-500" />}
    </div>
  );
}

function ReviewCheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-green-50/40 px-3 py-2.5">
      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
      <span className="text-sm text-[#1A1A2E]/70">{text}</span>
    </div>
  );
}
