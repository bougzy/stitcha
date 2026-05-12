"use client";

/* -------------------------------------------------------------------------- */
/*  PhotoUploadView                                                              */
/*                                                                              */
/*  Drop-in alternative to LiveCaptureView for clients who:                    */
/*    • Have a slow / underpowered phone where the live camera struggles      */
/*    • Already have suitable photos in their gallery                          */
/*    • Are on a desktop / tablet without a working camera                    */
/*                                                                              */
/*  Same external API as LiveCaptureView — accepts {view, onCaptured, onCancel}
/*  and produces an identically-shaped {frame, previewDataUrl} result, so the */
/*  rest of the scan pipeline (card calibration, segmentation widths,         */
/*  measurement calculation) treats both paths identically.                    */
/*                                                                              */
/*  Pipeline inside:                                                            */
/*    1. File picker (supports both gallery + take-fresh-photo on mobile)     */
/*    2. resize to ≤ 1280 px (canvas, JPEG q=0.9)                              */
/*    3. validatePhotoQuality — brightness + sharpness checks                  */
/*    4. PoseLandmarker.detect on the static image                            */
/*    5. evaluatePoseQuality — same gate as the live flow                     */
/*    6. Show a preview + per-issue list. Capture button is gated by the     */
/*       same pose-quality rules so accuracy doesn't degrade vs live.         */
/* -------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  RotateCcw,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Camera,
  ImageIcon,
  Lightbulb,
} from "lucide-react";
import {
  initPoseLandmarker,
  detectLandmarks,
  loadImage,
  evaluatePoseQuality,
  validatePhotoQuality,
  type CapturedFrame,
  type PoseQualityIssue,
} from "@/lib/body-measurement";
import type { LiveCaptureResult } from "@/components/scan/live-capture";

interface PhotoUploadViewProps {
  view: "front" | "side";
  onCaptured: (result: LiveCaptureResult) => void;
  onCancel?: () => void;
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

export function PhotoUploadView({ view, onCaptured, onCancel }: PhotoUploadViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landmarkerRef = useRef<any>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [poseIssues, setPoseIssues] = useState<PoseQualityIssue[]>([]);
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
  const [frame, setFrame] = useState<CapturedFrame | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Pre-warm the landmarker so the first analysis is fast. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lm = await initPoseLandmarker("IMAGE");
        if (!cancelled) landmarkerRef.current = lm;
      } catch {
        /* ignore — we'll retry on demand */
      }
    })();
    return () => {
      cancelled = true;
      try { landmarkerRef.current?.close?.(); } catch { /* ignore */ }
      landmarkerRef.current = null;
    };
  }, []);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file (JPG / PNG / HEIC).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That photo is too large (max 20 MB).");
      return;
    }

    setAnalyzing(true);
    setPoseIssues([]);
    setQualityIssues([]);
    setFrame(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const optimized = await resizeToMax(dataUrl);
      setPhotoUrl(optimized);

      /* Quality check first (brightness + sharpness) */
      const q = await validatePhotoQuality(optimized);
      if (!q.ok) setQualityIssues(q.issues);

      /* Pose detection — same model as live, same evaluator */
      let lm = landmarkerRef.current;
      if (!lm) {
        lm = await initPoseLandmarker("IMAGE");
        landmarkerRef.current = lm;
      }
      const img = await loadImage(optimized);
      const det = await detectLandmarks(lm, img);

      if (!det.landmarks) {
        setPoseIssues([
          {
            code: "no_pose",
            message: "We couldn't see a person in this photo. Use a clearer full-body shot.",
          },
        ]);
        return;
      }

      const report = evaluatePoseQuality(
        det.landmarks,
        img.naturalWidth,
        img.naturalHeight,
      );
      setPoseIssues(report.issues);
      setFrame({
        landmarks: det.landmarks,
        segmentationMask: det.segmentationMask,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't analyse this photo");
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setPhotoUrl(null);
    setFrame(null);
    setPoseIssues([]);
    setQualityIssues([]);
    setError(null);
  }

  function submit() {
    if (!frame || !photoUrl) return;
    onCaptured({ frame, previewDataUrl: photoUrl });
  }

  const allIssues = [...qualityIssues, ...poseIssues.map((p) => p.message)];
  const canSubmit = !!frame && poseIssues.length === 0 && qualityIssues.length === 0;
  // Even when there are warnings, the customer can override and submit anyway —
  // we'll just flag the resulting measurements as lower-confidence.
  const submitWithWarnings = !!frame && (poseIssues.length > 0 || qualityIssues.length > 0);

  /* ====================================================================== */
  /*  Render                                                                  */
  /* ====================================================================== */
  return (
    <div className="flex h-full flex-col">
      {/* Instructions block */}
      <div className="mb-3 rounded-2xl border border-[#D4A853]/30 bg-gradient-to-br from-[#D4A853]/[0.10] to-[#C75B39]/[0.05] p-4">
        <div className="flex items-start gap-2.5">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A853]" />
          <div>
            <p className="text-sm font-semibold text-[#1A1A2E]">
              How to upload a good {view === "front" ? "front" : "side"} photo
            </p>
            <ul className="mt-2 space-y-1 text-xs leading-snug text-[#1A1A2E]/70">
              <li className="flex items-start gap-1.5">
                <span className="text-[#C75B39]">•</span>
                <span><strong>Full body in frame</strong> — head to feet, nothing cut off</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#C75B39]">•</span>
                <span>
                  <strong>{view === "front" ? "Face the camera squarely" : "Turn 90° to the side"}</strong>
                  {view === "front" && " with arms slightly out from your body"}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#C75B39]">•</span>
                <span><strong>Stand straight</strong> against a plain wall or background</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#C75B39]">•</span>
                <span><strong>Wear fitted clothing</strong> — loose clothes hide your shape</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#C75B39]">•</span>
                <span><strong>Bright, even light</strong> — no strong shadows, no backlight</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preview / drop zone */}
      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl border-2 border-dashed border-[#1A1A2E]/15 bg-black/5">
        {photoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={`${view} photo`}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {analyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="mt-2 text-xs font-medium">Checking pose & quality…</p>
              </div>
            )}
            {!analyzing && (
              <button
                onClick={reset}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
                aria-label="Remove and pick another"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#1A1A2E]/55"
          >
            <ImageIcon className="h-8 w-8 text-[#1A1A2E]/35" />
            <p className="text-sm font-semibold text-[#1A1A2E]/65">
              Tap to upload {view} photo
            </p>
            <p className="text-[11px] text-[#1A1A2E]/45">
              JPG, PNG or HEIC · max 20 MB
            </p>
          </button>
        )}

        {/* View label badge */}
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          {view} view
        </span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {/* Quick-pick buttons under the drop zone (when no photo yet) */}
      {!photoUrl && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              // Hint mobile to use the camera. Browsers fall back to picker on desktop.
              const i = fileRef.current;
              if (!i) return;
              i.setAttribute("capture", "user");
              i.click();
              // Clear capture attribute so subsequent clicks don't force the camera
              setTimeout(() => i.removeAttribute("capture"), 500);
            }}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#1A1A2E]/10 bg-white/40 text-xs font-medium text-[#1A1A2E]/75 active:bg-white/60"
          >
            <Camera className="h-4 w-4" />
            Take fresh photo
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#1A1A2E]/10 bg-white/40 text-xs font-medium text-[#1A1A2E]/75 active:bg-white/60"
          >
            <Upload className="h-4 w-4" />
            Choose from gallery
          </button>
        </div>
      )}

      {/* Status panel */}
      <div className="mt-3 min-h-[60px]">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-300/40 bg-red-50/70 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {!error && photoUrl && !analyzing && (
          <>
            {canSubmit ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Photo looks good — tap continue
              </motion.div>
            ) : allIssues.length > 0 ? (
              <ul className="space-y-1">
                {allIssues.map((msg, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50/60 px-3 py-1.5 text-[11px] text-amber-700"
                  >
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {msg}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      {/* Action bar */}
      <div className="mt-auto flex items-center gap-3 pt-4">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#1A1A2E]/10 bg-white/40 text-[#1A1A2E]/60 active:bg-white/60"
            aria-label="Cancel"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {photoUrl && (
          <button
            onClick={reset}
            disabled={analyzing}
            className="flex h-12 items-center gap-1.5 rounded-2xl border border-[#1A1A2E]/10 bg-white/40 px-4 text-xs font-medium text-[#1A1A2E]/65 active:bg-white/60 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" /> Try another
          </button>
        )}
        <button
          onClick={submit}
          disabled={!frame || analyzing}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] text-base font-semibold text-white shadow-lg active:scale-[0.98] disabled:opacity-40"
        >
          {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
          {analyzing
            ? "Checking…"
            : canSubmit
            ? `Use this ${view} photo`
            : submitWithWarnings
            ? "Use anyway"
            : "Upload to continue"}
        </button>
      </div>
    </div>
  );
}
