"use client";

/* -------------------------------------------------------------------------- */
/*  LiveCaptureView                                                            */
/*                                                                              */
/*  Real-time camera capture with:                                             */
/*    • Live pose detection                                                    */
/*    • Pose-quality gating (capture button disabled until subject is OK)      */
/*    • Multi-frame median capture (10 frames over ~1s) for noise reduction    */
/*    • Optional device-pitch enforcement via DeviceOrientation                */
/*                                                                              */
/*  Returns the merged CapturedFrame + a preview JPEG data URL of the best     */
/*  frame (highest landmark visibility).                                       */
/* -------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RotateCcw, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  initPoseLandmarker,
  detectLandmarks,
  evaluatePoseQuality,
  medianPose,
  type CapturedFrame,
  type Landmark,
  type PoseQualityIssue,
} from "@/lib/body-measurement";

export interface LiveCaptureResult {
  frame: CapturedFrame;
  previewDataUrl: string;
}

interface LiveCaptureViewProps {
  view: "front" | "side";
  onCaptured: (result: LiveCaptureResult) => void;
  onCancel?: () => void;
}

const CAPTURE_FRAMES = 10;
const CAPTURE_INTERVAL_MS = 100;

export function LiveCaptureView({ view, onCaptured, onCancel }: LiveCaptureViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectTsRef = useRef<number>(0);
  const devicePitchRef = useRef<number | undefined>(undefined);

  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState<PoseQualityIssue[]>([]);
  const [poseOk, setPoseOk] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);

  /* ---- Init: camera + pose landmarker (VIDEO mode) ---- */
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        // Camera: rear-facing, portrait-ish aspect
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width:  { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play();
        }

        // Init pose landmarker for VIDEO mode + segmentation masks
        landmarkerRef.current = await initPoseLandmarker("VIDEO");

        if (cancelled) return;
        setReady(true);
        loop();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStreamError(
          /permission/i.test(msg)
            ? "Camera permission was denied. Please allow camera access and try again."
            : "Couldn't open the camera. Please check your device settings.",
        );
      }
    }

    start();

    // Device pitch via DeviceOrientation. Phone tilt powers the camera-height
    // nudge ("phone tilted up — raise it" / "tilted down — lower it"). On
    // iOS 13+, DeviceOrientationEvent requires explicit permission via a
    // user gesture; if it's never granted we silently degrade — pose-quality
    // still works, just without the pitch dimension.
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta != null) devicePitchRef.current = e.beta - 90; // 0 when phone is upright
    };
    type IOSPermissionAPI = { requestPermission?: () => Promise<"granted" | "denied"> };
    const DOE = (typeof DeviceOrientationEvent !== "undefined"
      ? (DeviceOrientationEvent as unknown as IOSPermissionAPI)
      : undefined);
    if (DOE && typeof DOE.requestPermission === "function") {
      // iOS 13+ — request on first user interaction with the capture page.
      // We attach the listener regardless; if permission is denied the
      // event just never fires and the pitch nudge silently disables.
      DOE.requestPermission()
        .then((state) => {
          if (state === "granted") {
            window.addEventListener("deviceorientation", onOrient);
          }
        })
        .catch(() => { /* ignore — silent degrade */ });
    } else {
      window.addEventListener("deviceorientation", onOrient);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("deviceorientation", onOrient);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      try { landmarkerRef.current?.close?.(); } catch { /* ignore */ }
      landmarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Detection loop: ~10–15 fps quality check ---- */
  function loop() {
    rafRef.current = requestAnimationFrame(loop);
    const v = videoRef.current;
    const lm = landmarkerRef.current;
    if (!v || !lm || v.readyState < 2) return;

    const now = performance.now();
    if (now - lastDetectTsRef.current < 80) return; // ~12 fps
    lastDetectTsRef.current = now;

    try {
      const res = lm.detectForVideo(v, now);
      const landmarks: Landmark[] | null =
        res.landmarks?.length ? (res.landmarks[0] as Landmark[]) : null;

      // Close any returned segmentation mask resource (we don't use it for live preview)
      if (res.segmentationMasks?.length) {
        for (const m of res.segmentationMasks) {
          try { m.close?.(); } catch { /* ignore */ }
        }
      }

      const report = evaluatePoseQuality(
        landmarks,
        v.videoWidth,
        v.videoHeight,
        devicePitchRef.current,
      );
      setIssues(report.issues);
      setPoseOk(report.ok);
    } catch {
      /* swallow per-frame detection errors */
    }
  }

  /* ---- Capture: snap N frames, collect landmarks + masks, median them ---- */
  async function capture() {
    const v = videoRef.current;
    const c = canvasRef.current;
    const lm = landmarkerRef.current;
    if (!v || !c || !lm || capturing) return;

    setCapturing(true);
    setCaptureProgress(0);

    const frames: CapturedFrame[] = [];
    const W = v.videoWidth;
    const H = v.videoHeight;
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) {
      setCapturing(false);
      return;
    }

    let bestFrameDataUrl: string | null = null;
    let bestVis = -1;

    for (let i = 0; i < CAPTURE_FRAMES; i++) {
      const ts = performance.now();
      ctx.drawImage(v, 0, 0, W, H);

      // Run pose+segmentation on the captured pixels (so frame and detection are aligned)
      const det = await detectLandmarks(lm, c, ts);

      if (det.landmarks) {
        frames.push({
          landmarks: det.landmarks,
          segmentationMask: det.segmentationMask,
          width: W,
          height: H,
        });

        // Track the highest-visibility frame for the preview thumbnail
        const vis = det.landmarks.reduce(
          (s, l) => s + (l.visibility ?? 0),
          0,
        );
        if (vis > bestVis) {
          bestVis = vis;
          bestFrameDataUrl = c.toDataURL("image/jpeg", 0.9);
        }
      }

      setCaptureProgress(Math.round(((i + 1) / CAPTURE_FRAMES) * 100));
      // Small wait between frames so we sample real motion noise
      await new Promise(r => setTimeout(r, CAPTURE_INTERVAL_MS));
    }

    setCapturing(false);

    if (frames.length === 0 || !bestFrameDataUrl) {
      setStreamError("Couldn't read your pose during capture. Please try again.");
      return;
    }

    const merged = medianPose(frames);
    if (!merged) {
      setStreamError("Couldn't combine frames. Please try again.");
      return;
    }

    onCaptured({ frame: merged, previewDataUrl: bestFrameDataUrl });
  }

  /* ---- Render ---- */
  return (
    <div className="relative flex h-full min-h-[80dvh] flex-col">
      {/* Video preview */}
      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Body silhouette guide */}
        <svg
          aria-hidden
          viewBox="0 0 100 133"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
        >
          <ellipse cx="50" cy="14" rx="7" ry="9" stroke="#fff" strokeWidth="0.6" strokeDasharray="2 2" fill="none" />
          <line x1="50" y1="23" x2="50" y2="28" stroke="#fff" strokeWidth="0.6" strokeDasharray="2 2" />
          <path d="M 35 30 L 37 100 M 65 30 L 63 100 M 35 30 L 65 30"
            stroke="#fff" strokeWidth="0.6" strokeDasharray="2 2" fill="none" />
          <line x1="32" y1="30" x2={view === "front" ? "24" : "30"} y2="62" stroke="#fff" strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1="68" y1="30" x2={view === "front" ? "76" : "70"} y2="62" stroke="#fff" strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1="40" y1="100" x2="40" y2="128" stroke="#fff" strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1="60" y1="100" x2="60" y2="128" stroke="#fff" strokeWidth="0.5" strokeDasharray="2 2" />
        </svg>

        {/* Live status badge */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${ready ? (poseOk ? "bg-emerald-400" : "bg-amber-400") : "bg-white/40"}`}
          />
          <span className="rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            {view === "front" ? "Front view" : "Side view"}
          </span>
        </div>

        {/* Capture progress overlay */}
        <AnimatePresence>
          {capturing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white"
            >
              <p className="text-sm font-medium">Hold still — capturing</p>
              <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{ width: `${captureProgress}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] opacity-70">
                Averaging {CAPTURE_FRAMES} frames for accuracy
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error overlay */}
        {streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 px-6 text-center text-white">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            <p className="mt-3 text-sm">{streamError}</p>
            {onCancel && (
              <button
                onClick={onCancel}
                className="mt-4 rounded-xl bg-white/20 px-4 py-2 text-xs font-semibold backdrop-blur"
              >
                Go back
              </button>
            )}
          </div>
        )}
      </div>

      {/* Issue list (live coaching) */}
      <div className="mt-4 min-h-[60px]">
        {!ready && !streamError && (
          <p className="text-center text-xs text-[#1A1A2E]/45">Starting camera…</p>
        )}
        {ready && issues.length === 0 && poseOk && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50/70 px-3 py-2 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Pose looks good — tap capture
          </div>
        )}
        {ready && issues.length > 0 && (
          <ul className="space-y-1">
            {issues.map((iss) => (
              <li
                key={iss.code}
                className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/60 px-3 py-1.5 text-[11px] text-amber-700"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {iss.message}
              </li>
            ))}
          </ul>
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
        <button
          onClick={capture}
          disabled={!ready || !poseOk || capturing}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] text-base font-semibold text-white shadow-lg active:scale-[0.98] disabled:opacity-40"
        >
          {capturing ? (
            <RotateCcw className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          {capturing ? "Capturing…" : `Capture ${view}`}
        </button>
      </div>
    </div>
  );
}
