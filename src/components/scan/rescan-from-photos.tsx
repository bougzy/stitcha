"use client";

/* -------------------------------------------------------------------------- */
/*  ReScanFromPhotos                                                            */
/*                                                                              */
/*  Designer-side entry point: drop in two photos (front + side) of a client   */
/*  and re-run the new AI pipeline against them — without sending the client a */
/*  new scan link.                                                              */
/*                                                                              */
/*  Reuses every Tier-1 primitive that doesn't strictly require a live stream: */
/*    • Photo-quality validation (brightness + sharpness)                       */
/*    • Pose-quality gate on the static photo                                   */
/*    • Optional ID-card calibration (tap two corners)                          */
/*    • Segmentation-mask body widths                                           */
/*    • Tape recalibration on the result                                        */
/*                                                                              */
/*  Multi-frame median doesn't apply — there's only one frame per view — but   */
/*  the segmentation + card calibration alone deliver most of the accuracy     */
/*  jump.                                                                       */
/* -------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Ruler,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import {
  initPoseLandmarker,
  detectLandmarks,
  loadImage,
  validatePhotoQuality,
  evaluatePoseQuality,
  calculateMeasurements,
  type CapturedFrame,
  type BodyGender,
  type MeasurementResult,
  type PoseQualityIssue,
} from "@/lib/body-measurement";
import { checkPlausibility, type MeasurementWarning } from "@/lib/measurement-plausibility";
import { CardCalibration } from "@/components/scan/card-calibration";
import { TapeRecalibrateDialog } from "@/components/scan/tape-recalibrate-dialog";

interface Props {
  /** Used to compute the height-fallback scale and plausibility ranges. */
  heightCm: number;
  gender: BodyGender;
  /** Called with the final measurements (in inches) and metadata. */
  onSave: (payload: {
    measurements: Record<string, number>;
    confidence: number;
    confidenceScores: Record<string, number>;
    aiEstimatedFields: string[];
    scaleSource: "card" | "height";
    plausibilityWarnings: MeasurementWarning[];
  }) => Promise<void> | void;
  onCancel?: () => void;
}

type Stage = "intake" | "card-prompt" | "card-calibrate" | "analyzing" | "results" | "error";

interface PhotoSlot {
  dataUrl: string;
  qualityIssues: string[];
  pose?: { ok: boolean; issues: PoseQualityIssue[] };
  frame?: CapturedFrame;
}

const MAX_BYTES = 20 * 1024 * 1024;

function resizeToMax(dataUrl: string, maxDim = 1280): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const m = Math.max(img.width, img.height);
      if (m <= maxDim) return resolve(dataUrl);
      const scale = maxDim / m;
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function ReScanFromPhotos({ heightCm, gender, onSave, onCancel }: Props) {
  const [stage, setStage] = useState<Stage>("intake");
  const [front, setFront] = useState<PhotoSlot | null>(null);
  const [side, setSide] = useState<PhotoSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [useCard, setUseCard] = useState(false);
  const [cardScale, setCardScale] = useState<number | null>(null);
  const [result, setResult] = useState<MeasurementResult | null>(null);
  const [warnings, setWarnings] = useState<MeasurementWarning[]>([]);
  const [tapeOpen, setTapeOpen] = useState(false);
  const [recalibrated, setRecalibrated] = useState(false);
  const [saving, setSaving] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landmarkerRef = useRef<any>(null);

  /* Preload pose landmarker so the analysis step is instant. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lm = await initPoseLandmarker("IMAGE");
        if (!cancelled) landmarkerRef.current = lm;
      } catch {
        /* ignore — analysis step will retry */
      }
    })();
    return () => {
      cancelled = true;
      try { landmarkerRef.current?.close?.(); } catch { /* ignore */ }
      landmarkerRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /*  Intake: read photo, validate quality, run pose detection on the still */
  /* ---------------------------------------------------------------------- */
  async function ingestPhoto(file: File, view: "front" | "side") {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrorMsg("That photo is too large (max 20 MB).");
      return;
    }
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const raw = e.target?.result as string;
      const optimized = await resizeToMax(raw);

      // Brightness + sharpness gate
      const q = await validatePhotoQuality(optimized);

      // Static-pose quality gate: load image → run pose detection → evaluate
      let pose: { ok: boolean; issues: PoseQualityIssue[] } | undefined;
      let frame: CapturedFrame | undefined;
      try {
        let lm = landmarkerRef.current;
        if (!lm) {
          lm = await initPoseLandmarker("IMAGE");
          landmarkerRef.current = lm;
        }
        const img = await loadImage(optimized);
        const det = await detectLandmarks(lm, img);
        if (det.landmarks) {
          const report = evaluatePoseQuality(det.landmarks, img.naturalWidth, img.naturalHeight);
          pose = report;
          frame = {
            landmarks: det.landmarks,
            segmentationMask: det.segmentationMask,
            width: img.naturalWidth,
            height: img.naturalHeight,
          };
        } else {
          pose = {
            ok: false,
            issues: [{ code: "no_pose", message: "We couldn't see a person in this photo. Please try a clearer image." }],
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Pose detection failed";
        pose = { ok: false, issues: [{ code: "no_pose", message: msg }] };
      }

      const slot: PhotoSlot = { dataUrl: optimized, qualityIssues: q.issues, pose, frame };
      if (view === "front") setFront(slot);
      else setSide(slot);
    };
    reader.readAsDataURL(file);
  }

  /* ---------------------------------------------------------------------- */
  /*  Continue past intake: card prompt OR straight to analysis             */
  /* ---------------------------------------------------------------------- */
  function continueFromIntake() {
    if (!front?.frame || !side?.frame) {
      setErrorMsg("Both front and side photos are required.");
      return;
    }
    setErrorMsg(null);
    setStage("card-prompt");
  }

  function continueFromCardPrompt(withCard: boolean) {
    setUseCard(withCard);
    if (withCard) {
      setStage("card-calibrate");
    } else {
      setCardScale(null);
      runAnalysis(null);
    }
  }

  function continueFromCardCalibrate(scale: number | null) {
    setCardScale(scale);
    runAnalysis(scale);
  }

  /* ---------------------------------------------------------------------- */
  /*  Analysis                                                                */
  /* ---------------------------------------------------------------------- */
  async function runAnalysis(scale: number | null) {
    if (!front?.frame || !side?.frame) return;
    setStage("analyzing");
    setBusy(true);
    setErrorMsg(null);
    try {
      const r = calculateMeasurements(front.frame, side.frame, heightCm, gender, scale);
      const w = checkPlausibility(r.measurements, heightCm / 2.54, gender);
      setResult(r);
      setWarnings(w);
      setStage("results");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Re-scan analysis failed.");
      setStage("error");
    } finally {
      setBusy(false);
    }
  }

  function handleTapeApplied(rec: Record<string, number>) {
    setResult((prev) => (prev ? { ...prev, measurements: { ...prev.measurements, ...rec } } : prev));
    setRecalibrated(true);
  }

  /* ---------------------------------------------------------------------- */
  /*  Save                                                                    */
  /* ---------------------------------------------------------------------- */
  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await onSave({
        measurements:        result.measurements,
        confidence:          result.confidence,
        confidenceScores:    result.confidenceScores,
        aiEstimatedFields:   result.aiEstimatedFields,
        scaleSource:         result.scaleSource ?? "height",
        plausibilityWarnings: warnings,
      });
    } finally {
      setSaving(false);
    }
  }

  /* ====================================================================== */
  /*  Render                                                                  */
  /* ====================================================================== */

  if (stage === "card-calibrate" && front?.dataUrl) {
    return (
      <CardCalibration
        imageUrl={front.dataUrl}
        onCancel={() => setStage("card-prompt")}
        onDone={continueFromCardCalibrate}
      />
    );
  }

  if (stage === "card-prompt") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <CreditCard className="mx-auto h-9 w-9 text-[#C75B39]" />
          <h3 className="mt-2 text-base font-bold text-[#1A1A2E]">Calibrate with a card?</h3>
          <p className="mt-1 text-xs text-[#1A1A2E]/55">
            If the front photo shows a credit/debit card flat against the chest,
            we can lock the scale precisely (85.6×54 mm).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => continueFromCardPrompt(false)}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#1A1A2E]/10 bg-white/40 text-sm font-medium text-[#1A1A2E]/70 active:bg-white/60"
          >
            Skip — use height
          </button>
          <button
            onClick={() => continueFromCardPrompt(true)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] text-sm font-semibold text-white shadow-md active:scale-[0.98]"
          >
            <CreditCard className="h-4 w-4" />
            I have a card
          </button>
        </div>
      </div>
    );
  }

  if (stage === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Loader2 className="h-9 w-9 animate-spin text-[#C75B39]" />
        <p className="mt-3 text-sm font-medium text-[#1A1A2E]">Re-running analysis…</p>
        <p className="mt-1 text-xs text-[#1A1A2E]/55">
          Multi-frame averaging skipped (single photo per view). Segmentation + card scale active.
        </p>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="flex flex-col items-center text-center py-6">
        <AlertTriangle className="h-9 w-9 text-red-500" />
        <p className="mt-2 text-sm font-medium text-[#1A1A2E]">Re-scan failed</p>
        <p className="mt-1 text-xs text-[#1A1A2E]/55 whitespace-pre-line">{errorMsg}</p>
        <button
          onClick={() => setStage("intake")}
          className="mt-4 flex items-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/60 px-4 py-2 text-sm text-[#1A1A2E]/70"
        >
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  if (stage === "results" && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-[#1A1A2E]">Re-scan complete</p>
            <p className="mt-0.5 text-xs text-[#1A1A2E]/60">
              Confidence {Math.round(result.confidence * 100)}%
              {result.scaleSource === "card" && " · Card calibrated"}
              {recalibrated && " · Tape recalibrated"}
            </p>
          </div>
        </div>

        {/* Quick measurements summary */}
        <div className="max-h-72 overflow-y-auto rounded-xl border border-[#1A1A2E]/8 bg-white/50">
          {Object.entries(result.measurements)
            .filter(([, v]) => typeof v === "number" && v > 0)
            .map(([k, v]) => {
              const conf = result.confidenceScores[k] ?? 0;
              const tone =
                conf >= 0.85 ? "bg-emerald-500/15 text-emerald-700"
                : conf >= 0.70 ? "bg-amber-500/15 text-amber-700"
                : "bg-red-500/15 text-red-600";
              const isEst = result.aiEstimatedFields.includes(k);
              return (
                <div key={k} className="flex items-center justify-between border-b border-[#1A1A2E]/5 px-3 py-2 last:border-0">
                  <span className="text-xs capitalize text-[#1A1A2E]/65">
                    {k.replace(/([A-Z])/g, " $1")}
                    {isEst && (
                      <span className="ml-1 rounded bg-[#1A1A2E]/8 px-1 text-[8px] font-semibold uppercase text-[#1A1A2E]/40">
                        est
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#1A1A2E]">{(v as number).toFixed(1)}"</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${tone}`}>
                      {Math.round(conf * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="flex items-start gap-2 rounded-lg bg-amber-50/60 px-3 py-1.5 text-[11px] text-amber-700">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {w.message}
              </p>
            ))}
          </div>
        )}

        <button
          onClick={() => setTapeOpen(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#C75B39]/30 bg-[#C75B39]/5 text-sm font-semibold text-[#C75B39] active:scale-[0.98]"
        >
          <Ruler className="h-4 w-4" />
          {recalibrated ? "Re-anchor with another tape value" : "Verify with a tape"}
        </button>

        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#1A1A2E]/10 bg-white/60 text-sm font-medium text-[#1A1A2E]/70"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] text-sm font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? "Saving…" : "Save measurements"}
          </button>
        </div>

        <TapeRecalibrateDialog
          open={tapeOpen}
          onClose={() => setTapeOpen(false)}
          measurements={result.measurements}
          onApplied={handleTapeApplied}
        />
      </div>
    );
  }

  /* ---- Default: intake stage ---- */
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#C75B39]/15 bg-[#C75B39]/[0.04] p-3">
        <div className="flex items-start gap-2">
          <Camera className="mt-0.5 h-4 w-4 shrink-0 text-[#C75B39]" />
          <div>
            <p className="text-xs font-semibold text-[#1A1A2E]">Re-scan from existing photos</p>
            <p className="mt-0.5 text-[11px] leading-snug text-[#1A1A2E]/55">
              Drop in a front and side photo of the client. Runs the new pipeline:
              segmentation widths, card calibration, and tape recalibration —
              without sending a new scan link.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PhotoUploadSlot
          label="Front"
          slot={front}
          onClear={() => setFront(null)}
          onPick={() => frontInputRef.current?.click()}
        />
        <PhotoUploadSlot
          label="Side"
          slot={side}
          onClear={() => setSide(null)}
          onPick={() => sideInputRef.current?.click()}
        />
      </div>

      <input
        ref={frontInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) ingestPhoto(f, "front");
          e.target.value = "";
        }}
      />
      <input
        ref={sideInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) ingestPhoto(f, "side");
          e.target.value = "";
        }}
      />

      {errorMsg && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{errorMsg}</p>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#1A1A2E]/10 bg-white/60 text-sm font-medium text-[#1A1A2E]/70"
          >
            Cancel
          </button>
        )}
        <button
          onClick={continueFromIntake}
          disabled={!front?.frame || !side?.frame || busy}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] text-sm font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-40"
        >
          <Upload className="h-4 w-4" /> Re-analyse
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Photo slot tile                                                             */
/* -------------------------------------------------------------------------- */

function PhotoUploadSlot({
  label,
  slot,
  onPick,
  onClear,
}: {
  label: string;
  slot: PhotoSlot | null;
  onPick: () => void;
  onClear: () => void;
}) {
  const issues = slot
    ? [...slot.qualityIssues, ...(slot.pose?.ok === false ? slot.pose.issues.map((i) => i.message) : [])]
    : [];
  const ok = slot?.pose?.ok && slot.qualityIssues.length === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative overflow-hidden rounded-xl border-2 ${
        slot
          ? ok
            ? "border-emerald-300/70 bg-white/50"
            : "border-amber-300/60 bg-white/50"
          : "border-dashed border-[#1A1A2E]/15 bg-white/30"
      }`}
    >
      {slot ? (
        <>
          <div className="aspect-[3/4] w-full overflow-hidden bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slot.dataUrl} alt={label} className="h-full w-full object-cover" />
          </div>
          <button
            onClick={onClear}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/55 text-white"
            aria-label={`Remove ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="border-t border-[#1A1A2E]/5 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/50">
              {label}
            </p>
            {issues.length === 0 ? (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Looks good
              </p>
            ) : (
              <ul className="mt-0.5 space-y-0.5">
                {issues.map((m, i) => (
                  <li key={i} className="flex items-start gap-1 text-[10px] text-amber-700">
                    <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 text-[#1A1A2E]/50 active:bg-white/40"
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs font-semibold">Upload {label.toLowerCase()}</span>
          <span className="text-[10px] text-[#1A1A2E]/40">JPG / PNG / HEIC</span>
        </button>
      )}
    </motion.div>
  );
}
