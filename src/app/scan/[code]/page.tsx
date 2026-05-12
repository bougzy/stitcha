"use client";

/* -------------------------------------------------------------------------- */
/*  Client-Facing Scan Page                                                    */
/*                                                                              */
/*  Wires up the Tier-1 AI primitives:                                         */
/*    1. Pose-quality gating + multi-frame median   (LiveCaptureView)          */
/*    2. ID-card scale calibration                  (CardCalibration)          */
/*    3. Tape recalibration on results              (TapeRecalibrateDialog)    */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  RotateCcw,
  Ruler,
  Loader2,
  CreditCard,
  Sparkles,
  Shield,
} from "lucide-react";

import {
  calculateMeasurements,
  type MeasurementResult,
  type BodyGender,
  type CapturedFrame,
} from "@/lib/body-measurement";
import { checkPlausibility, type MeasurementWarning } from "@/lib/measurement-plausibility";
import { LiveCaptureView, type LiveCaptureResult } from "@/components/scan/live-capture";
import { PhotoUploadView } from "@/components/scan/photo-upload";
import { CardCalibration } from "@/components/scan/card-calibration";
import { TapeRecalibrateDialog } from "@/components/scan/tape-recalibrate-dialog";
import { AccuracyChip } from "@/components/scan/accuracy-chip";
import { recalibrateWithTape } from "@/lib/body-measurement";
import { parseInchesInput } from "@/lib/units";

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

type ScanStep =
  | "loading"
  | "valid"
  | "guest-info"
  | "height"
  | "gender"
  | "card-prompt"
  | "front-capture"
  | "card-calibrate"
  | "side-capture"
  | "analyzing"
  | "tape-verify"
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

/** Quick-pick heights, capped at 175cm (97th percentile for Nigerian women).
 *  Heights above that have to be typed in explicitly — picking the highest
 *  preset by default was the #1 source of "way bigger" measurement errors
 *  in production feedback. */
const HEIGHT_PRESETS: { cm: number; label: string }[] = [
  { cm: 150, label: "4'11\"" },
  { cm: 155, label: "5'1\"" },
  { cm: 158, label: "5'2\"" },
  { cm: 160, label: "5'3\"" },
  { cm: 163, label: "5'4\"" },
  { cm: 165, label: "5'5\"" },
  { cm: 168, label: "5'6\"" },
  { cm: 170, label: "5'7\"" },
  { cm: 173, label: "5'8\"" },
  { cm: 175, label: "5'9\"" },
];

const stepVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -16 },
};

/* ========================================================================== */
/*  Page                                                                        */
/* ========================================================================== */

export default function ClientScanPage() {
  const params = useParams();
  const code = params.code as string;

  const [step, setStep] = useState<ScanStep>("loading");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Guest scan inputs
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestGender, setGuestGender] = useState<BodyGender>("female");
  const [selectedGender, setSelectedGender] = useState<BodyGender>("female");
  const [heightCm, setHeightCm] = useState<number | "">("");

  // Capture artefacts
  const [frontFrame, setFrontFrame] = useState<CapturedFrame | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sideFrame, setSideFrame] = useState<CapturedFrame | null>(null);
  const [cardScaleCmPerPx, setCardScaleCmPerPx] = useState<number | null>(null);
  const [useCard, setUseCard] = useState(false);
  /** How the customer is providing their photos. Choice persists across
   *  the front + side capture so they don't accidentally mix paths. */
  const [captureMode, setCaptureMode] = useState<"live" | "upload">("live");

  // Result + UI state
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [measurementResult, setMeasurementResult] = useState<MeasurementResult | null>(null);
  const [plausibilityWarnings, setPlausibilityWarnings] = useState<MeasurementWarning[]>([]);
  const [tapeOpen, setTapeOpen] = useState(false);
  const [recalibrated, setRecalibrated] = useState<boolean>(false);

  /* ---- Validate scan link ---- */
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
      if (data.clientGender) setSelectedGender(data.clientGender as BodyGender);

      switch (data.status) {
        case "pending":   setStep("valid"); break;
        case "expired":   setStep("expired"); break;
        case "completed": setStep("complete"); break;
        case "failed":
          setStep("error");
          setErrorMessage(data.message || "There was a problem with your scan.");
          break;
        default:
          setStep("invalid");
      }
    } catch {
      setStep("error");
      setErrorMessage("Could not connect. Please check your internet and try again.");
    }
  }, [code]);

  useEffect(() => {
    if (code) validateLink();
  }, [code, validateLink]);

  /* Save once we're ready — extracted so tape-verify can call it after
   * an optional recalibration. */
  const persistResult = useCallback(
    async (result: MeasurementResult, warnings: MeasurementWarning[]) => {
      try {
        const gender: BodyGender = sessionInfo?.isQuickScan ? guestGender : selectedGender;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: Record<string, any> = {
          measurements:        result.measurements,
          confidence:          result.confidence,
          confidenceScores:    result.confidenceScores,
          aiEstimatedFields:   result.aiEstimatedFields,
          scaleSource:         result.scaleSource ?? "height",
          heightCm:            Number(heightCm),
          gender,
          plausibilityWarnings: warnings,
        };
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
        if (!json.success) {
          setStep("error");
          setErrorMessage(json.error || "Failed to save measurements.");
          return;
        }
        setMeasurementResult(result);
        setStep("complete");
      } catch (err) {
        setStep("error");
        setErrorMessage(err instanceof Error ? err.message : "Save failed.");
      }
    },
    [
      sessionInfo, guestGender, selectedGender, guestName, guestPhone,
      heightCm, code,
    ],
  );

  /* ---- Analyze: feed primitives into calculateMeasurements ---- */
  const runAnalysis = useCallback(async () => {
    if (!frontFrame || !sideFrame || !heightCm) return;
    setStep("analyzing");
    setAnalyzeProgress(10);
    setAnalyzeStatus("Calculating your measurements…");

    try {
      const gender: BodyGender = sessionInfo?.isQuickScan ? guestGender : selectedGender;
      const result = calculateMeasurements(
        frontFrame,
        sideFrame,
        Number(heightCm),
        gender,
        cardScaleCmPerPx,
      );
      setAnalyzeProgress(60);

      // Plausibility checks (inches)
      const warnings = checkPlausibility(
        result.measurements,
        Number(heightCm) / 2.54,
        gender,
      );
      setPlausibilityWarnings(warnings);
      setAnalyzeProgress(100);

      // Hold the in-memory result so tape-verify can recalibrate it
      setMeasurementResult(result);

      /* THE KEY GATE — if we don't have a card scale, force tape verification
       * before saving. The single biggest cause of "way too big" measurements
       * in production was a wrong self-reported height with no anchor. */
      if (result.scaleSource === "height") {
        setStep("tape-verify");
        return;
      }

      // Card-calibrated → save straight away
      setAnalyzeStatus("Saving your measurements…");
      await persistResult(result, warnings);
    } catch (err) {
      setStep("error");
      setErrorMessage(err instanceof Error ? err.message : "Analysis failed.");
    }
  }, [
    frontFrame, sideFrame, heightCm, sessionInfo, guestGender, selectedGender,
    cardScaleCmPerPx, persistResult,
  ]);

  /* Auto-run when both frames ready */
  useEffect(() => {
    if (frontFrame && sideFrame && step === "side-capture") runAnalysis();
  }, [frontFrame, sideFrame, step, runAnalysis]);

  /* ---- Apply tape recalibration to the displayed result ---- */
  function handleTapeApplied(rec: Record<string, number>) {
    setMeasurementResult((prev) =>
      prev ? { ...prev, measurements: { ...prev.measurements, ...rec } } : prev,
    );
    setRecalibrated(true);
  }

  /* ====================================================================== */
  /*  Render                                                                  */
  /* ====================================================================== */

  return (
    <div className="relative min-h-[100dvh] bg-[#FAFAF8]">
      {/* Background mesh */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#C75B39]/[0.06] blur-[120px]" />
        <div className="absolute top-1/3 -left-24 h-[400px] w-[400px] rounded-full bg-[#D4A853]/[0.05] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait">
          {step === "loading" && (
            <motion.div key="loading" {...stepVariants} className="flex flex-1 flex-col items-center justify-center text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#C75B39]" />
              <p className="mt-4 text-sm text-[#1A1A2E]/55">Loading your scan…</p>
            </motion.div>
          )}

          {step === "valid" && sessionInfo && (
            <motion.div key="valid" {...stepVariants} className="flex flex-1 flex-col">
              <div className="text-center">
                <Sparkles className="mx-auto h-10 w-10 text-[#C75B39]" />
                <h1 className="mt-3 text-2xl font-bold text-[#1A1A2E]">
                  Hi {sessionInfo.clientName || "there"}!
                </h1>
                <p className="mt-1 text-sm text-[#1A1A2E]/55">
                  {sessionInfo.businessName || sessionInfo.designerName} needs your measurements.
                </p>
                <p className="mt-3 text-xs text-[#1A1A2E]/45">
                  We&apos;ll guide you through 2 quick photos.<br />
                  Your photos never leave this device.
                </p>
              </div>

              <ul className="mt-6 space-y-2.5">
                {[
                  ["Multi-frame AI", "We average 10 frames for noise-free accuracy."],
                  ["Optional ID-card calibration", "Hold a credit card for the front photo to lock in the scale."],
                  ["Verify with tape", "Tape one measurement at the end and we rescale the rest."],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3 rounded-xl border border-[#1A1A2E]/8 bg-white/40 p-3">
                    <Shield className="mt-0.5 h-4 w-4 text-[#C75B39]" />
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A2E]">{t}</p>
                      <p className="mt-0.5 text-xs text-[#1A1A2E]/55">{d}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6">
                <button
                  onClick={() => setStep(sessionInfo.isQuickScan ? "guest-info" : "height")}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4 text-base font-semibold text-white shadow-lg active:scale-[0.98]"
                >
                  Get started
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "guest-info" && (
            <motion.div key="guest-info" {...stepVariants} className="flex flex-1 flex-col">
              <h2 className="text-center text-lg font-bold text-[#1A1A2E]">Quick details</h2>
              <p className="mt-1 text-center text-sm text-[#1A1A2E]/55">
                Just so the designer knows whose measurements these are.
              </p>
              <div className="mt-6 space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="glass-input flex h-12 w-full rounded-xl px-4 text-sm focus-visible:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="glass-input flex h-12 w-full rounded-xl px-4 text-sm focus-visible:outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  {(["female", "male"] as BodyGender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGuestGender(g)}
                      className={`h-12 rounded-xl border text-sm font-medium ${
                        guestGender === g
                          ? "border-[#C75B39] bg-[#C75B39]/10 text-[#C75B39]"
                          : "border-[#1A1A2E]/10 bg-white/40 text-[#1A1A2E]/60"
                      }`}
                    >
                      {g === "female" ? "Female" : "Male"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-auto pt-6">
                <button
                  disabled={!guestName.trim()}
                  onClick={() => setStep("height")}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4 text-base font-semibold text-white shadow-lg active:scale-[0.98] disabled:opacity-40"
                >
                  Continue <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "height" && (
            <motion.div key="height" {...stepVariants} className="flex flex-1 flex-col">
              <h2 className="text-center text-lg font-bold text-[#1A1A2E]">Your height</h2>
              <p className="mt-1 text-center text-sm text-[#1A1A2E]/55">
                <strong className="text-[#1A1A2E]/85">Be accurate here.</strong> Even a 5 cm error
                makes every measurement off by ~3%.
              </p>
              <div className="mt-5">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={120}
                  max={220}
                  placeholder="Height in cm (e.g. 165)"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value === "" ? "" : Number(e.target.value))}
                  className="glass-input flex h-12 w-full rounded-xl px-4 text-base font-semibold focus-visible:outline-none"
                />
                {/* Live ft+in translation as the user types */}
                {heightCm && Number(heightCm) >= 120 && Number(heightCm) <= 220 && (
                  <p className="mt-1 text-[11px] text-[#1A1A2E]/55">
                    ≈ {(() => {
                      const totalIn = Number(heightCm) / 2.54;
                      const ft = Math.floor(totalIn / 12);
                      const inch = Math.round(totalIn - ft * 12);
                      return `${ft}'${inch}"`;
                    })()}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#1A1A2E]/45">
                  Quick pick
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {HEIGHT_PRESETS.map((h) => (
                    <button
                      key={h.cm}
                      onClick={() => setHeightCm(h.cm)}
                      className={`rounded-xl border py-2 text-center text-[11px] font-medium ${
                        heightCm === h.cm
                          ? "border-[#C75B39] bg-[#C75B39]/10 text-[#C75B39]"
                          : "border-[#1A1A2E]/10 bg-white/40 text-[#1A1A2E]/60"
                      }`}
                    >
                      <span className="font-bold">{h.label}</span>
                      <span className="ml-1 opacity-60">({h.cm}cm)</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-[#1A1A2E]/40">
                  Over 5&apos;9&quot; / 175 cm? Type the exact number above — most Nigerian adults are
                  between 5&apos;0&quot; and 5&apos;9&quot;.
                </p>
              </div>

              {/* "Not sure?" path — route them to the card calibration */}
              <div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-50/50 p-3">
                <p className="text-xs font-semibold text-amber-800">
                  Don&apos;t know your exact height?
                </p>
                <p className="mt-0.5 text-[11px] text-amber-700/85">
                  Guessing will make your measurements wrong. Skip the height step and
                  hold a credit card during the photo instead — that locks the scale
                  precisely without needing your height at all.
                </p>
                <button
                  onClick={() => {
                    // Set a neutral fallback height so the math still runs, but force the
                    // card path. The card scale supersedes the height anyway.
                    setHeightCm(165);
                    setUseCard(true);
                    if (sessionInfo?.clientGender) setStep("card-prompt");
                    else setStep("gender");
                  }}
                  className="mt-2 text-[11px] font-semibold text-amber-900 underline underline-offset-2"
                >
                  I&apos;m not sure — use a credit card instead →
                </button>
              </div>

              <div className="mt-auto pt-6">
                <button
                  disabled={!heightCm || Number(heightCm) < 120 || Number(heightCm) > 220}
                  onClick={() => {
                    if (sessionInfo?.clientGender) setStep("card-prompt");
                    else setStep("gender");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4 text-base font-semibold text-white shadow-lg active:scale-[0.98] disabled:opacity-40"
                >
                  Continue <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "gender" && (
            <motion.div key="gender" {...stepVariants} className="flex flex-1 flex-col">
              <h2 className="text-center text-lg font-bold text-[#1A1A2E]">Your body type</h2>
              <p className="mt-1 text-center text-sm text-[#1A1A2E]/55">
                We calibrate for African body proportions.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {(["female", "male"] as BodyGender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGender(g)}
                    className={`flex h-28 flex-col items-center justify-center rounded-2xl border text-sm font-medium ${
                      selectedGender === g
                        ? "border-[#C75B39] bg-[#C75B39]/10 text-[#C75B39]"
                        : "border-[#1A1A2E]/10 bg-white/40 text-[#1A1A2E]/60"
                    }`}
                  >
                    <span className="text-3xl">{g === "female" ? "👗" : "👔"}</span>
                    <span className="mt-2">{g === "female" ? "Female" : "Male"}</span>
                  </button>
                ))}
              </div>
              <div className="mt-auto pt-6">
                <button
                  onClick={() => setStep("card-prompt")}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-6 py-4 text-base font-semibold text-white shadow-lg active:scale-[0.98]"
                >
                  Continue <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "card-prompt" && (
            <motion.div key="card-prompt" {...stepVariants} className="flex flex-1 flex-col">
              <div className="text-center">
                <CreditCard className="mx-auto h-10 w-10 text-[#C75B39]" />
                <h2 className="mt-3 text-lg font-bold text-[#1A1A2E]">
                  Calibrate the scan with a card
                </h2>
                <p className="mt-1 text-sm text-[#1A1A2E]/55">
                  Recommended — every credit/debit/national-ID card is the same size
                  (85.6 × 54 mm). Hold one flat against your chest in the front photo
                  and we lock the measurement scale precisely. <strong>±1 cm typical.</strong>
                </p>
              </div>

              {/* Visual comparison: card vs height-only */}
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-300/40 bg-emerald-50/60 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    <Sparkles className="h-3 w-3" /> With card
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">±1 cm</p>
                  <p className="mt-0.5 text-[11px] text-emerald-700/70">
                    Trustworthy for fitted garments.
                  </p>
                </div>
                <div className="rounded-xl border border-orange-300/50 bg-orange-50/60 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-700">
                    <AlertTriangle className="h-3 w-3" /> Height only
                  </p>
                  <p className="mt-1 text-xl font-bold text-orange-700">±5–10 cm</p>
                  <p className="mt-0.5 text-[11px] text-orange-700/70">
                    Verify with a tape before cutting fabric.
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-1.5 text-xs text-[#1A1A2E]/65">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#C75B39]">•</span>
                  Hold the card flat, fully visible, on your chest for the front photo
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#C75B39]">•</span>
                  You&apos;ll mark its corners after the photo (2 taps)
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#C75B39]">•</span>
                  No card? You can still continue — but we&apos;ll ask for one tape
                  measurement at the end to verify accuracy.
                </li>
              </ul>

              <div className="mt-auto flex flex-col gap-2 pt-6">
                <button
                  onClick={() => { setUseCard(true); setStep("front-capture"); }}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] text-sm font-semibold text-white shadow-lg active:scale-[0.98]"
                >
                  <CreditCard className="h-4 w-4" />
                  I have a card — use it (recommended)
                </button>
                <button
                  onClick={() => { setUseCard(false); setStep("front-capture"); }}
                  className="flex h-11 items-center justify-center rounded-2xl border border-[#1A1A2E]/10 bg-white/40 text-xs font-medium text-[#1A1A2E]/55 active:bg-white/60"
                >
                  Continue without a card · I&apos;ll tape-verify at the end
                </button>
              </div>
            </motion.div>
          )}

          {step === "front-capture" && (
            <motion.div key="front-capture" {...stepVariants} className="flex flex-1 flex-col">
              <h2 className="text-center text-lg font-bold text-[#1A1A2E]">Front view</h2>
              <p className="mt-1 mb-2 text-center text-xs text-[#1A1A2E]/55">
                Stand straight, arms slightly out, full body in frame.
                {useCard && " Hold the card on your chest."}
              </p>
              <div className="mb-3 flex justify-center">
                <AccuracyChip mode={useCard ? "card" : "verified"} />
              </div>
              <CaptureModeToggle mode={captureMode} onChange={setCaptureMode} />
              {captureMode === "live" ? (
                <LiveCaptureView
                  view="front"
                  onCancel={() => setStep("valid")}
                  onCaptured={(r: LiveCaptureResult) => {
                    setFrontFrame(r.frame);
                    setFrontPreview(r.previewDataUrl);
                    setStep(useCard ? "card-calibrate" : "side-capture");
                  }}
                />
              ) : (
                <PhotoUploadView
                  view="front"
                  onCancel={() => setStep("valid")}
                  onCaptured={(r: LiveCaptureResult) => {
                    setFrontFrame(r.frame);
                    setFrontPreview(r.previewDataUrl);
                    setStep(useCard ? "card-calibrate" : "side-capture");
                  }}
                />
              )}
            </motion.div>
          )}

          {step === "card-calibrate" && frontPreview && (
            <motion.div key="card-calibrate" {...stepVariants} className="flex flex-1 flex-col">
              <CardCalibration
                imageUrl={frontPreview}
                onCancel={() => setStep("front-capture")}
                onDone={(scale) => {
                  setCardScaleCmPerPx(scale);
                  setStep("side-capture");
                }}
              />
            </motion.div>
          )}

          {step === "side-capture" && (
            <motion.div key="side-capture" {...stepVariants} className="flex flex-1 flex-col">
              <h2 className="text-center text-lg font-bold text-[#1A1A2E]">Side view</h2>
              <p className="mt-1 mb-2 text-center text-xs text-[#1A1A2E]/55">
                Turn 90° (left or right). Stand naturally.
              </p>
              <div className="mb-3 flex justify-center">
                <AccuracyChip mode={useCard ? "card" : "verified"} />
              </div>
              <CaptureModeToggle mode={captureMode} onChange={setCaptureMode} />
              {captureMode === "live" ? (
                <LiveCaptureView
                  view="side"
                  onCancel={() => { setSideFrame(null); setStep("front-capture"); }}
                  onCaptured={(r: LiveCaptureResult) => setSideFrame(r.frame)}
                />
              ) : (
                <PhotoUploadView
                  view="side"
                  onCancel={() => { setSideFrame(null); setStep("front-capture"); }}
                  onCaptured={(r: LiveCaptureResult) => setSideFrame(r.frame)}
                />
              )}
            </motion.div>
          )}

          {step === "analyzing" && (
            <motion.div key="analyzing" {...stepVariants} className="flex flex-1 flex-col items-center justify-center text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#C75B39]" />
              <h2 className="mt-4 text-lg font-bold text-[#1A1A2E]">Working on it…</h2>
              <p className="mt-1 text-sm text-[#1A1A2E]/55">{analyzeStatus}</p>
              <div className="mt-5 h-1.5 w-64 overflow-hidden rounded-full bg-[#1A1A2E]/8">
                <div
                  className="h-full bg-gradient-to-r from-[#C75B39] to-[#D4A853] transition-all"
                  style={{ width: `${analyzeProgress}%` }}
                />
              </div>
            </motion.div>
          )}

          {step === "tape-verify" && measurementResult && (
            <TapeVerifyStep
              result={measurementResult}
              warnings={plausibilityWarnings}
              onSaveAfterRecalibrate={(rec, warns) => persistResult(rec, warns)}
              onSkip={() => persistResult(measurementResult, plausibilityWarnings)}
              onRescan={() => {
                setFrontFrame(null);
                setSideFrame(null);
                setMeasurementResult(null);
                setStep("card-prompt");
              }}
            />
          )}

          {step === "complete" && measurementResult && (
            <motion.div key="complete" {...stepVariants} className="flex flex-1 flex-col">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <h2 className="mt-3 text-lg font-bold text-[#1A1A2E]">All done!</h2>
                <p className="mt-1 text-sm text-[#1A1A2E]/55">
                  {measurementResult.scaleSource === "card"
                    ? "Calibrated using your ID card."
                    : "Using your height as the scale reference."}
                  {recalibrated && " Recalibrated with your tape value."}
                </p>
              </div>

              <ResultsList result={measurementResult} />

              {plausibilityWarnings.length > 0 && (
                <div className="mt-4 space-y-1">
                  {plausibilityWarnings.map((w, i) => (
                    <p key={i} className="flex items-start gap-2 rounded-xl bg-amber-50/60 px-3 py-2 text-[11px] text-amber-700">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {w.message}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={() => setTapeOpen(true)}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#C75B39]/30 bg-[#C75B39]/5 text-sm font-semibold text-[#C75B39] active:scale-[0.98]"
                >
                  <Ruler className="h-4 w-4" />
                  Verify with a tape (recommended)
                </button>
                <p className="text-center text-[11px] text-[#1A1A2E]/45">
                  Measuring one field with a tape rescales the rest. Optional but boosts accuracy a lot.
                </p>
              </div>

              <TapeRecalibrateDialog
                open={tapeOpen}
                onClose={() => setTapeOpen(false)}
                measurements={measurementResult.measurements}
                onApplied={handleTapeApplied}
              />
            </motion.div>
          )}

          {step === "expired" && (
            <motion.div key="expired" {...stepVariants} className="flex flex-1 flex-col items-center justify-center text-center">
              <Clock className="h-10 w-10 text-amber-500" />
              <h2 className="mt-3 text-lg font-bold text-[#1A1A2E]">This link has expired</h2>
              <p className="mt-1 text-sm text-[#1A1A2E]/55">Ask your designer for a new link.</p>
            </motion.div>
          )}

          {step === "invalid" && (
            <motion.div key="invalid" {...stepVariants} className="flex flex-1 flex-col items-center justify-center text-center">
              <AlertTriangle className="h-10 w-10 text-red-500" />
              <h2 className="mt-3 text-lg font-bold text-[#1A1A2E]">Invalid scan link</h2>
              <p className="mt-1 text-sm text-[#1A1A2E]/55">Double-check the link from your designer.</p>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div key="error" {...stepVariants} className="flex flex-1 flex-col items-center justify-center text-center">
              <AlertTriangle className="h-10 w-10 text-red-500" />
              <h2 className="mt-3 text-lg font-bold text-[#1A1A2E]">Something went wrong</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-[#1A1A2E]/55">
                {errorMessage || "Please try again."}
              </p>
              <button
                onClick={validateLink}
                className="mt-5 flex items-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/60 px-5 py-3 text-sm font-medium text-[#1A1A2E]/70 active:bg-white/80"
              >
                <RotateCcw className="h-4 w-4" />
                Start over
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Sub-components                                                              */
/* ========================================================================== */

function ResultsList({ result }: { result: MeasurementResult }) {
  const m = result.measurements;
  const conf = result.confidenceScores;
  const aiEst = new Set(result.aiEstimatedFields);

  const ROWS: { key: string; label: string }[] = [
    { key: "bust",         label: "Bust" },
    { key: "underBust",    label: "Under bust" },
    { key: "waist",        label: "Waist" },
    { key: "hips",         label: "Hips" },
    { key: "chest",        label: "Chest" },
    { key: "shoulder",     label: "Shoulder" },
    { key: "neck",         label: "Neck" },
    { key: "armLength",    label: "Arm length" },
    { key: "sleeveLength", label: "Sleeve length" },
    { key: "halfSleeve",   label: "Half sleeve" },
    { key: "wrist",        label: "Wrist" },
    { key: "roundArm",     label: "Round arm" },
    { key: "backLength",   label: "Back length" },
    { key: "frontLength",  label: "Front length" },
    { key: "blouseLength", label: "Blouse length" },
    { key: "fullLength",   label: "Full length" },
    { key: "shoulderToBust", label: "Shoulder → bust" },
    { key: "shoulderToHip",  label: "Shoulder → hip" },
    { key: "inseam",       label: "Inseam" },
    { key: "crotchLength", label: "Crotch length" },
    { key: "thigh",        label: "Thigh" },
    { key: "knee",         label: "Knee" },
    { key: "calf",         label: "Calf" },
    { key: "ankle",        label: "Ankle" },
  ];

  return (
    <div className="mt-5 max-h-[60vh] overflow-y-auto rounded-2xl border border-[#1A1A2E]/8 bg-white/50">
      {ROWS.map(({ key, label }) => {
        const v = m[key];
        if (typeof v !== "number") return null;
        const c = conf?.[key] ?? 0;
        const tone =
          c >= 0.85 ? "bg-emerald-500/15 text-emerald-700"
          : c >= 0.70 ? "bg-amber-500/15 text-amber-700"
          : "bg-red-500/15 text-red-600";
        return (
          <div key={key} className="flex items-center justify-between border-b border-[#1A1A2E]/5 px-4 py-2.5 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#1A1A2E]/70">{label}</span>
              {aiEst.has(key) && (
                <span className="rounded bg-[#1A1A2E]/8 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[#1A1A2E]/45">est</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-[#1A1A2E]">
                {v.toFixed(1)}&quot;
              </span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${tone}`}>
                {Math.round(c * 100)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CaptureModeToggle                                                            */
/*  Pill-style switch between live camera and photo upload. Lives above       */
/*  whichever view is active so customers can flip at any time without       */
/*  losing their other progress.                                              */
/* -------------------------------------------------------------------------- */

function CaptureModeToggle({
  mode,
  onChange,
}: {
  mode: "live" | "upload";
  onChange: (m: "live" | "upload") => void;
}) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl border border-[#1A1A2E]/8 bg-white/30 p-1">
      <button
        type="button"
        onClick={() => onChange("live")}
        className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
          mode === "live"
            ? "bg-white text-[#1A1A2E] shadow-sm"
            : "text-[#1A1A2E]/55 hover:text-[#1A1A2E]"
        }`}
      >
        <ScanLineIcon className="h-3.5 w-3.5" />
        Use camera
      </button>
      <button
        type="button"
        onClick={() => onChange("upload")}
        className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
          mode === "upload"
            ? "bg-white text-[#1A1A2E] shadow-sm"
            : "text-[#1A1A2E]/55 hover:text-[#1A1A2E]"
        }`}
      >
        <UploadIcon className="h-3.5 w-3.5" />
        Upload photo
      </button>
    </div>
  );
}

/* Inline icon shims — Lucide imports collide with names used elsewhere in
 * the file, so we re-bind them locally to avoid touching the top imports. */
function ScanLineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  TapeVerifyStep                                                              */
/*                                                                              */
/*  Gates the save when no card was used. The single biggest production       */
/*  bug — "way bigger measurements" — was caused by self-reported height      */
/*  being wrong with no second anchor. We block save here unless the user    */
/*  EITHER enters one tape value (we then rescale every circumference) OR    */
/*  explicitly skips with a warning shown.                                    */
/* -------------------------------------------------------------------------- */

function TapeVerifyStep({
  result,
  warnings,
  onSaveAfterRecalibrate,
  onSkip,
  onRescan,
}: {
  result: MeasurementResult;
  warnings: MeasurementWarning[];
  onSaveAfterRecalibrate: (rec: MeasurementResult, warns: MeasurementWarning[]) => void;
  onSkip: () => void;
  onRescan: () => void;
}) {
  const [field, setField] = useState<"waist" | "bust" | "hips">("waist");
  const [tapeInput, setTapeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiValue = result.measurements[field];

  function handleApply() {
    setError(null);
    const inches = parseInchesInput(tapeInput);
    if (inches == null || inches <= 0) {
      setError(`Enter a number — e.g. 32 or 32.5 or 32 1/2`);
      return;
    }
    const out = recalibrateWithTape(result.measurements, field, inches);
    if (!out) {
      setError(
        `That value looks off vs the AI's ${typeof aiValue === "number" ? aiValue.toFixed(1) : ""}". Double-check the unit and tape position.`,
      );
      return;
    }
    setSubmitting(true);
    onSaveAfterRecalibrate(
      {
        ...result,
        measurements: out.recalibrated,
        scaleSource: result.scaleSource, // unchanged — still "height" — but values now anchored
      },
      warnings,
    );
  }

  return (
    <motion.div {...stepVariants} className="flex flex-1 flex-col">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/50 bg-orange-50/70 px-3 py-1 text-[11px] font-semibold text-orange-700">
          <AlertTriangle className="h-3 w-3" />
          Verify one measurement before we save
        </span>
        <h2 className="mt-3 text-lg font-bold text-[#1A1A2E]">
          One tape check — keeps the scan accurate
        </h2>
        <p className="mt-1 text-sm text-[#1A1A2E]/55">
          Because you didn&apos;t use a credit card, the AI is using your height
          as the scale. A 5&nbsp;cm error in height means every measurement is
          off by ~3%. <strong className="text-[#1A1A2E]/85">One tape check fixes the whole scan.</strong>
        </p>
      </div>

      {/* Field picker */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {(["waist", "bust", "hips"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setField(f); setTapeInput(""); setError(null); }}
            className={`rounded-xl border py-2 text-xs font-semibold capitalize ${
              field === f
                ? "border-[#C75B39] bg-[#C75B39]/10 text-[#C75B39]"
                : "border-[#1A1A2E]/10 bg-white/40 text-[#1A1A2E]/60"
            }`}
          >
            {f}
            {typeof result.measurements[f] === "number" && (
              <span className="ml-1 opacity-60">
                ({(result.measurements[f] as number).toFixed(1)}&quot;)
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tape input */}
      <div className="mt-4">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
          Your tape value for {field} (inches)
        </label>
        <input
          autoFocus
          type="text"
          inputMode="decimal"
          value={tapeInput}
          onChange={(e) => setTapeInput(e.target.value)}
          placeholder={`e.g. ${field === "waist" ? "28" : field === "bust" ? "36" : "38"} or 28 1/2`}
          className="glass-input flex h-12 w-full rounded-xl px-4 text-xl font-bold focus-visible:outline-none"
        />
        <p className="mt-1 text-[11px] text-[#1A1A2E]/45">
          Tap the {field} with a tape measure → enter what it reads in inches.
        </p>
      </div>

      {/* AI vs tape diff hint (only after the user enters something) */}
      {tapeInput && typeof aiValue === "number" && parseInchesInput(tapeInput) ? (
        <div className="mt-2 rounded-lg bg-[#1A1A2E]/[0.04] px-3 py-2 text-[11px] text-[#1A1A2E]/65">
          {(() => {
            const tape = parseInchesInput(tapeInput) || 0;
            const pct = ((tape - aiValue) / aiValue) * 100;
            const abs = Math.abs(pct);
            if (abs < 3) return `Close match — small correction (${pct > 0 ? "+" : ""}${pct.toFixed(0)}%).`;
            if (abs < 10) return `Moderate correction — every measurement will adjust by ~${pct.toFixed(0)}%.`;
            return `Big correction (${pct > 0 ? "+" : ""}${pct.toFixed(0)}%) — height was likely wrong. The fix will rescale the whole scan.`;
          })()}
        </div>
      ) : null}

      {error && (
        <p className="mt-2 rounded-lg bg-red-50/70 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-6">
        <button
          onClick={handleApply}
          disabled={submitting || !tapeInput}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] text-sm font-semibold text-white shadow-lg active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ruler className="h-4 w-4" />}
          Verify & save
        </button>
        <button
          onClick={onRescan}
          className="flex h-11 items-center justify-center rounded-2xl border border-[#1A1A2E]/10 bg-white/40 text-xs font-medium text-[#1A1A2E]/65 active:bg-white/60"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Rescan with a credit card (most accurate)
        </button>
        <button
          onClick={onSkip}
          className="text-[10px] font-medium text-[#1A1A2E]/40 underline underline-offset-2"
        >
          Skip · save anyway (low confidence)
        </button>
      </div>
    </motion.div>
  );
}
