"use client";

/* -------------------------------------------------------------------------- */
/*  CardCalibration                                                             */
/*                                                                              */
/*  Optional precision step: the user holds an ID/credit card (ISO 7810 ID-1, */
/*  85.60 × 53.98 mm) at chest height in the front photo. They then tap two   */
/*  opposite corners of the card on the captured image. We compute the long    */
/*  and short pixel sides (longest run vs. shorter run on the diagonal) and   */
/*  pass them through `scaleFromCard` to derive cm/pixel.                      */
/*                                                                              */
/*  This calibration kills the "self-reported height was wrong" failure mode. */
/* -------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react";
import { CreditCard, X, RotateCcw, Check } from "lucide-react";
import { scaleFromCard } from "@/lib/body-measurement";

interface Pt { x: number; y: number; }

interface CardCalibrationProps {
  imageUrl: string;
  /** Called with cm/pixel scale (or null if user skipped / it failed). */
  onDone: (cardScaleCmPerPx: number | null) => void;
  onCancel?: () => void;
}

export function CardCalibration({ imageUrl, onDone, onCancel }: CardCalibrationProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [pts, setPts] = useState<Pt[]>([]);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  /* Capture natural image dimensions once loaded */
  useEffect(() => {
    const i = imgRef.current;
    if (!i) return;
    if (i.complete && i.naturalWidth) {
      setImgSize({ w: i.naturalWidth, h: i.naturalHeight });
    }
  }, []);

  function handleImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const i = e.currentTarget;
    setImgSize({ w: i.naturalWidth, h: i.naturalHeight });
  }

  /** Map a tap/click on the rendered image back to natural-pixel coordinates. */
  function tap(e: React.MouseEvent | React.TouchEvent) {
    if (!imgSize) return;
    const i = imgRef.current;
    if (!i) return;
    const rect = i.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX : e.clientX;
    const clientY =
      "touches" in e ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY : e.clientY;
    if (clientX == null || clientY == null) return;

    const xRel = (clientX - rect.left) / rect.width;
    const yRel = (clientY - rect.top) / rect.height;
    const px: Pt = { x: xRel * imgSize.w, y: yRel * imgSize.h };

    setPts((prev) => (prev.length >= 2 ? [px] : [...prev, px]));
  }

  function reset() { setPts([]); }

  function confirm() {
    if (pts.length !== 2 || !imgSize) return;
    const [a, b] = pts;
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    // The card's long and short sides project to dx/dy depending on orientation;
    // assume the user marked opposite corners, so the long side is max(dx, dy).
    const longSidePx = Math.max(dx, dy);
    const shortSidePx = Math.min(dx, dy);
    const scale = scaleFromCard({ longSidePx, shortSidePx });
    onDone(scale);
  }

  function skip() { onDone(null); }

  /* ---- Render ---- */
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39]/15 to-[#D4A853]/15">
          <CreditCard className="h-5 w-5 text-[#C75B39]" />
        </div>
        <h3 className="text-base font-bold text-[#1A1A2E]">Calibrate with a card</h3>
        <p className="mt-1 text-xs text-[#1A1A2E]/55">
          Tap two opposite corners of the card you held in the photo. This sharpens accuracy.
        </p>
      </div>

      {/* Image with tap targets */}
      <div
        ref={wrapRef}
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[#1A1A2E]/8 bg-black/5"
        onClick={tap}
        onTouchStart={tap}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Captured front"
          onLoad={handleImgLoad}
          className="block w-full select-none"
          draggable={false}
        />
        {/* Render tap markers in screen coords by translating natural→rendered */}
        {imgSize &&
          pts.map((p, i) => (
            <span
              key={i}
              className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#C75B39] shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
              style={{
                left:  `${(p.x / imgSize.w) * 100}%`,
                top:   `${(p.y / imgSize.h) * 100}%`,
              }}
            >
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#C75B39] px-1 text-[9px] font-bold text-white">
                {i + 1}
              </span>
            </span>
          ))}
        {imgSize && pts.length === 2 && (() => {
          // Render the implied card rectangle so customers see whether their
          // taps actually cover the card. The card is the BOUNDING BOX of the
          // two opposite corners they picked.
          const minX = Math.min(pts[0].x, pts[1].x);
          const minY = Math.min(pts[0].y, pts[1].y);
          const maxX = Math.max(pts[0].x, pts[1].x);
          const maxY = Math.max(pts[0].y, pts[1].y);
          const w = maxX - minX;
          const h = maxY - minY;
          // ID-1 cards are 1.586:1 (long/short). Either orientation is fine.
          const aspect = Math.max(w, h) / Math.max(1, Math.min(w, h));
          const aspectOk = aspect >= 1.4 && aspect <= 1.8;
          const stroke = aspectOk ? "#10b981" : "#f59e0b";
          return (
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {/* Diagonal line they tapped */}
              <line
                x1={`${(pts[0].x / imgSize.w) * 100}%`}
                y1={`${(pts[0].y / imgSize.h) * 100}%`}
                x2={`${(pts[1].x / imgSize.w) * 100}%`}
                y2={`${(pts[1].y / imgSize.h) * 100}%`}
                stroke={stroke}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              {/* Implied card rectangle */}
              <rect
                x={`${(minX / imgSize.w) * 100}%`}
                y={`${(minY / imgSize.h) * 100}%`}
                width={`${(w / imgSize.w) * 100}%`}
                height={`${(h / imgSize.h) * 100}%`}
                stroke={stroke}
                strokeWidth="3"
                fill={aspectOk ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}
              />
            </svg>
          );
        })()}
      </div>

      {/* Hint */}
      <p className="mt-3 text-center text-xs text-[#1A1A2E]/45">
        {pts.length === 0 && "Tap the first corner of the card"}
        {pts.length === 1 && "Now tap the opposite corner"}
        {pts.length === 2 && (() => {
          const minX = Math.min(pts[0].x, pts[1].x);
          const minY = Math.min(pts[0].y, pts[1].y);
          const maxX = Math.max(pts[0].x, pts[1].x);
          const maxY = Math.max(pts[0].y, pts[1].y);
          const w = maxX - minX;
          const h = maxY - minY;
          const aspect = Math.max(w, h) / Math.max(1, Math.min(w, h));
          if (aspect >= 1.4 && aspect <= 1.8) {
            return (
              <span className="text-emerald-700">
                ✓ Card shape looks right — confirm to lock the scale.
              </span>
            );
          }
          return (
            <span className="text-amber-700">
              ⚠ The green rectangle doesn&apos;t look like a card shape (aspect{" "}
              {aspect.toFixed(2)}). Reset and tap two opposite corners of the
              physical card.
            </span>
          );
        })()}
      </p>

      {/* Actions */}
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
          onClick={reset}
          disabled={pts.length === 0}
          className="flex h-12 items-center gap-2 rounded-2xl border border-[#1A1A2E]/10 bg-white/40 px-4 text-sm font-medium text-[#1A1A2E]/70 disabled:opacity-40 active:bg-white/60"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
        <button
          onClick={skip}
          className="text-xs font-medium text-[#1A1A2E]/45 underline"
        >
          Skip
        </button>
        <button
          onClick={confirm}
          disabled={pts.length !== 2}
          className="ml-auto flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-5 text-sm font-semibold text-white shadow-lg active:scale-[0.98] disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          Use this calibration
        </button>
      </div>
    </div>
  );
}
