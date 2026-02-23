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
  RotateCcw,
  Upload,
  User,
  Shirt,
  Ruler,
  Loader2,
  ImagePlus,
  XCircle,
} from "lucide-react";

import {
  initPoseLandmarker,
  detectLandmarks,
  loadImage,
  calculateMeasurements,
  type MeasurementResult,
} from "@/lib/body-measurement";

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

type ScanStep =
  | "loading"
  | "valid"
  | "guest-info"
  | "height"
  | "front-photo"
  | "side-photo"
  | "review"
  | "analyzing"
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
/*  Height presets                                                              */
/* ========================================================================== */

const HEIGHT_PRESETS = [150, 160, 165, 170, 175, 180];

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
  const [guestGender, setGuestGender] = useState<"male" | "female">("female");
  const [errorMessage, setErrorMessage] = useState("");
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [measurementResult, setMeasurementResult] =
    useState<MeasurementResult | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoCapture = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "side"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a photo (image file).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("Photo is too large. Please use a photo under 15MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === "front") {
        setFrontPhoto(dataUrl);
        setStep("side-photo");
      } else {
        setSidePhoto(dataUrl);
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

    try {
      setStep("analyzing");
      setAnalyzeProgress(0);
      setAnalyzeStatus("Loading AI model...");

      // Step 1: Initialize PoseLandmarker
      const poseLandmarker = await initPoseLandmarker();
      setAnalyzeProgress(25);

      // Step 2: Load and detect landmarks on front photo
      setAnalyzeStatus("Detecting body pose (front)...");
      const frontImg = await loadImage(frontPhoto);
      const frontLandmarks = await detectLandmarks(poseLandmarker, frontImg);
      setAnalyzeProgress(50);

      if (!frontLandmarks) {
        setStep("error");
        setErrorMessage(
          "Could not detect your body pose in the front photo. Please make sure your full body is visible and try again."
        );
        return;
      }

      // Step 3: Load and detect landmarks on side photo
      setAnalyzeStatus("Detecting body pose (side)...");
      const sideImg = await loadImage(sidePhoto);
      const sideLandmarks = await detectLandmarks(poseLandmarker, sideImg);
      setAnalyzeProgress(75);

      // Side landmarks are optional — we can calculate with front only
      if (!sideLandmarks) {
        // Continue without side landmarks — results will be less accurate
      }

      // Step 4: Calculate measurements
      setAnalyzeStatus("Calculating measurements...");
      const result = calculateMeasurements(
        frontLandmarks,
        sideLandmarks,
        Number(heightCm),
        frontImg.naturalWidth,
        frontImg.naturalHeight,
        sideImg.naturalWidth,
        sideImg.naturalHeight
      );
      setAnalyzeProgress(90);

      // Step 5: Send measurements to the API
      setAnalyzeStatus("Saving measurements...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {
        measurements: result.measurements,
        confidence: result.confidence,
        heightCm: Number(heightCm),
      };

      // Include guest info for quick scans
      if (sessionInfo?.isQuickScan && guestName.trim()) {
        payload.guestName = guestName.trim();
        payload.guestPhone = guestPhone.trim();
        payload.guestGender = guestGender;
      }

      const res = await fetch(`/api/scan/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      setAnalyzeProgress(100);

      if (json.success) {
        setMeasurementResult(result);
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
        "An error occurred during analysis. Please try again."
      );
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
            {/* Loading bar */}
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
              {/* Designer avatar */}
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
                    ? "Welcome! We'll guide you through taking two quick photos to capture your body measurements accurately."
                    : "Your designer needs your body measurements. We will guide you through taking two quick photos so we can measure you accurately."}
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
                description="Tight or fitted clothes help us measure accurately. Avoid baggy or loose outfits."
              />
              <InstructionItem
                icon={Ruler}
                title="Stand 2 meters from the camera"
                description="Ask someone to help take the photo, or use a timer. Full body must be visible."
              />
              <InstructionItem
                icon={Camera}
                title="Two photos needed"
                description="We need one photo from the front and one from the side. Stand straight with arms slightly away from your body."
              />
            </div>

            {/* Start button */}
            <div className="mt-auto pt-8">
              <button
                onClick={() => setStep(sessionInfo.isQuickScan ? "guest-info" : "height")}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98] hover:shadow-xl"
              >
                <Camera className="h-5 w-5" />
                Start Measurement Scan
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/*  GUEST INFO - Collect name/phone for quick scans                */}
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
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
                <User className="h-8 w-8 text-[#C75B39]" />
              </div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                Your Details
              </h2>
              <p className="mt-1 text-sm text-[#1A1A2E]/55">
                Please enter your information so your designer can identify your measurements
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {/* Name */}
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

              {/* Phone */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]/70">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="e.g. +234 801 234 5678"
                  className="w-full rounded-xl border border-[#1A1A2E]/15 bg-white/60 px-4 py-3 text-sm text-[#1A1A2E] shadow-sm backdrop-blur-sm transition-all placeholder:text-[#1A1A2E]/30 focus:border-[#C75B39]/40 focus:outline-none focus:ring-2 focus:ring-[#C75B39]/15"
                />
              </div>

              {/* Gender */}
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
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Info note */}
            <div className="mt-5 rounded-xl bg-[#D4A853]/8 p-3 text-center">
              <p className="text-xs leading-relaxed text-[#1A1A2E]/60">
                Your details will be shared with your designer to help manage your
                fitting and orders.
              </p>
            </div>

            {/* Continue button */}
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
        {/*  HEIGHT - Enter height for scale calibration                     */}
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
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
                {/* Body / height icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8 text-[#C75B39]"
                >
                  {/* Person silhouette */}
                  <circle cx="12" cy="4" r="2" />
                  <line x1="12" y1="6" x2="12" y2="16" />
                  <line x1="12" y1="10" x2="8" y2="13" />
                  <line x1="12" y1="10" x2="16" y2="13" />
                  <line x1="12" y1="16" x2="9" y2="21" />
                  <line x1="12" y1="16" x2="15" y2="21" />
                  {/* Height arrow */}
                  <line x1="20" y1="2" x2="20" y2="22" />
                  <line x1="18.5" y1="2" x2="21.5" y2="2" />
                  <line x1="18.5" y1="22" x2="21.5" y2="22" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                What is your height?
              </h2>
              <p className="mt-1 text-sm text-[#1A1A2E]/55">
                We need your height to accurately calculate your measurements
              </p>
            </div>

            {/* Height input */}
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

            {/* Quick presets */}
            <div className="mt-5">
              <p className="mb-3 text-center text-xs font-medium text-[#1A1A2E]/40">
                Quick select
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {HEIGHT_PRESETS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHeightCm(h)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                      heightCm === h
                        ? "bg-gradient-to-r from-[#C75B39] to-[#D4A853] text-white shadow-md"
                        : "border border-[#1A1A2E]/10 bg-white/50 text-[#1A1A2E]/70 backdrop-blur-sm hover:bg-white/70"
                    }`}
                  >
                    {h} cm
                  </button>
                ))}
              </div>
            </div>

            {/* Info note */}
            <div className="mt-5 rounded-xl bg-[#D4A853]/8 p-3 text-center">
              <p className="text-xs leading-relaxed text-[#1A1A2E]/60">
                Your height is used as a reference scale to convert your
                photo proportions into real-world measurements.
              </p>
            </div>

            {/* Continue button */}
            <div className="mt-auto pt-8">
              <button
                onClick={() => setStep("front-photo")}
                disabled={!heightCm}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
              >
                Continue
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
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
            {/* Progress indicator */}
            <ProgressBar current={sessionInfo?.isQuickScan ? 3 : 2} total={sessionInfo?.isQuickScan ? 4 : 3} />

            <h2 className="mt-4 text-center text-lg font-bold text-[#1A1A2E]">
              Front Photo
            </h2>
            <p className="mt-1 text-center text-sm text-[#1A1A2E]/55">
              Stand facing the camera with arms slightly away from your body
            </p>

            {/* Body outline guide */}
            <div className="relative mx-auto mt-5 flex w-full max-w-[280px] flex-col items-center">
              <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#C75B39]/25 bg-white/30 backdrop-blur-sm">
                {/* Body silhouette - front facing */}
                <div className="relative h-[75%] w-[40%]">
                  {/* Head */}
                  <div className="mx-auto h-[14%] w-[38%] rounded-full border-2 border-[#C75B39]/20" />
                  {/* Neck */}
                  <div className="mx-auto h-[3%] w-[15%] border-x-2 border-[#C75B39]/20" />
                  {/* Torso */}
                  <div className="mx-auto h-[30%] w-[70%] rounded-t-lg border-2 border-b-0 border-[#C75B39]/20" />
                  {/* Hips */}
                  <div className="mx-auto h-[8%] w-[75%] border-x-2 border-[#C75B39]/20" />
                  {/* Left leg */}
                  <div className="flex h-[42%] justify-center gap-[10%]">
                    <div className="h-full w-[30%] rounded-b-lg border-2 border-t-0 border-[#C75B39]/20" />
                    <div className="h-full w-[30%] rounded-b-lg border-2 border-t-0 border-[#C75B39]/20" />
                  </div>
                  {/* Arms guide lines */}
                  <div className="absolute left-[-22%] top-[19%] h-[38%] w-[15%] rounded-b-lg border-2 border-t-0 border-[#C75B39]/15" />
                  <div className="absolute right-[-22%] top-[19%] h-[38%] w-[15%] rounded-b-lg border-2 border-t-0 border-[#C75B39]/15" />
                </div>

                {/* Corner guides */}
                <div className="absolute left-3 top-3 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-[#C75B39]/40" />
                <div className="absolute right-3 top-3 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-[#C75B39]/40" />
                <div className="absolute bottom-3 left-3 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-[#C75B39]/40" />
                <div className="absolute bottom-3 right-3 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-[#C75B39]/40" />

                {/* Label */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="rounded-full bg-[#C75B39]/10 px-3 py-1 text-xs font-medium text-[#C75B39]">
                    FRONT VIEW
                  </span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 rounded-xl bg-[#D4A853]/8 p-3 text-center">
              <p className="text-xs leading-relaxed text-[#1A1A2E]/60">
                Make sure your full body is visible from head to toe. Stand on a
                plain background if possible.
              </p>
            </div>

            {/* Capture button */}
            <div className="mt-auto pt-6">
              <button
                onClick={() => frontInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                <Camera className="h-5 w-5" />
                Take Front Photo
              </button>
              {/* Or choose from gallery */}
              <button
                onClick={() => {
                  // Create a non-capture input to pick from gallery
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
            {/* Progress */}
            <ProgressBar current={sessionInfo?.isQuickScan ? 4 : 3} total={sessionInfo?.isQuickScan ? 4 : 3} />

            <h2 className="mt-4 text-center text-lg font-bold text-[#1A1A2E]">
              Side Photo
            </h2>
            <p className="mt-1 text-center text-sm text-[#1A1A2E]/55">
              Turn sideways. Keep your arms relaxed at your sides.
            </p>

            {/* Front photo preview - small */}
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

            {/* Body outline guide - side view */}
            <div className="relative mx-auto mt-4 flex w-full max-w-[280px] flex-col items-center">
              <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#D4A853]/25 bg-white/30 backdrop-blur-sm">
                {/* Side body silhouette */}
                <div className="relative h-[75%] w-[25%]">
                  {/* Head */}
                  <div className="mx-auto h-[14%] w-[85%] rounded-full border-2 border-[#D4A853]/20" />
                  {/* Neck */}
                  <div className="mx-auto h-[3%] w-[40%] border-x-2 border-[#D4A853]/20" />
                  {/* Torso - side is narrower */}
                  <div className="mx-auto h-[30%] w-full rounded-t-md border-2 border-b-0 border-[#D4A853]/20" />
                  {/* Hips */}
                  <div className="mx-auto h-[8%] w-full border-x-2 border-[#D4A853]/20" />
                  {/* Legs */}
                  <div className="mx-auto h-[42%] w-[75%] rounded-b-md border-2 border-t-0 border-[#D4A853]/20" />
                </div>

                {/* Corner guides */}
                <div className="absolute left-3 top-3 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-[#D4A853]/40" />
                <div className="absolute right-3 top-3 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-[#D4A853]/40" />
                <div className="absolute bottom-3 left-3 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-[#D4A853]/40" />
                <div className="absolute bottom-3 right-3 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-[#D4A853]/40" />

                {/* Label */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="rounded-full bg-[#D4A853]/10 px-3 py-1 text-xs font-medium text-[#D4A853]">
                    SIDE VIEW
                  </span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 rounded-xl bg-[#D4A853]/8 p-3 text-center">
              <p className="text-xs leading-relaxed text-[#1A1A2E]/60">
                Stand naturally from the side. Keep your posture straight and
                look forward.
              </p>
            </div>

            {/* Capture buttons */}
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

            {/* Photo previews */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {/* Front */}
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

              {/* Side */}
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

            {/* Checklist */}
            <div className="mt-5 space-y-2">
              <ReviewCheckItem text="Full body visible from head to toe" />
              <ReviewCheckItem text="Photo is clear and well lit" />
              <ReviewCheckItem text="Standing straight with arms slightly out" />
            </div>

            {/* Action buttons */}
            <div className="mt-auto space-y-3 pt-6">
              <button
                onClick={handleAnalyze}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4.5 text-base font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                <Upload className="h-5 w-5" />
                Submit Photos
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
        {/*  ANALYZING - Client-side AI pose detection                      */}
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
            {/* Processing animation */}
            <div className="relative">
              {/* Outer ring */}
              <div
                className="absolute inset-[-8px] animate-spin rounded-full border-2 border-transparent border-t-[#C75B39]/40"
                style={{ animationDuration: "2s" }}
              />
              {/* Middle ring */}
              <div
                className="absolute inset-[-4px] animate-spin rounded-full border-2 border-transparent border-b-[#D4A853]/30"
                style={{
                  animationDuration: "3s",
                  animationDirection: "reverse",
                }}
              />
              {/* Icon */}
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
                <Ruler className="h-9 w-9 text-[#C75B39]" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-[#1A1A2E]">
                Analysing your photos...
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#1A1A2E]/50">
                {analyzeStatus}
              </p>
            </div>

            {/* Progress bar */}
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

            {/* Animated dots */}
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
            {/* Success icon */}
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
                    will review them shortly.
                  </>
                )}
              </p>
            </motion.div>

            {/* Measurement results */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-2 w-full rounded-2xl border border-green-200/40 bg-green-50/30 p-5 backdrop-blur-sm"
            >
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  {
                    label: "Bust",
                    key: "bust",
                  },
                  {
                    label: "Waist",
                    key: "waist",
                  },
                  {
                    label: "Hips",
                    key: "hips",
                  },
                  {
                    label: "Shoulder",
                    key: "shoulder",
                  },
                  {
                    label: "Arm",
                    key: "armLength",
                  },
                  {
                    label: "Inseam",
                    key: "inseam",
                  },
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

              {/* Confidence */}
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
              <p className="mt-2 text-sm leading-relaxed text-[#1A1A2E]/55">
                {errorMessage ||
                  "An error occurred. Please try again or contact your designer."}
              </p>
            </div>
            <div className="flex gap-3">
              {/* Retry from review (if photos exist) */}
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
                onClick={validateLink}
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

function ReviewCheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-green-50/40 px-3 py-2.5">
      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
      <span className="text-sm text-[#1A1A2E]/70">{text}</span>
    </div>
  );
}
