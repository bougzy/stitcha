"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Measurement guide data                                                    */
/* -------------------------------------------------------------------------- */

interface GuideEntry {
  label: string;
  instruction: string;
  tip: string;
  /** SVG highlight region (cx, cy for the indicator dot on the body) */
  dotY: number;
  dotX: number;
  /** Which side: front, side, or lower */
  region: "upper" | "lower" | "arm";
}

const MEASUREMENT_GUIDES: Record<string, GuideEntry> = {
  bust: {
    label: "Bust",
    instruction:
      "Wrap the tape around the fullest part of the bust, across the shoulder blades at the back. Keep the tape level and snug but not tight.",
    tip: "Client should breathe normally — don't ask them to inhale or exhale.",
    dotY: 38,
    dotX: 50,
    region: "upper",
  },
  chest: {
    label: "Chest",
    instruction:
      "Measure around the chest just under the arms and above the bust. The tape should be horizontal all around.",
    tip: "For men, this is often the same as bust. Measure both if in doubt.",
    dotY: 35,
    dotX: 50,
    region: "upper",
  },
  waist: {
    label: "Waist",
    instruction:
      "Find the natural waist — the narrowest part of the torso. Wrap the tape snugly around this point. Ask the client to bend sideways to find it.",
    tip: "Tie a string around the waist first as a visual guide.",
    dotY: 48,
    dotX: 50,
    region: "upper",
  },
  hips: {
    label: "Hips",
    instruction:
      "Measure around the fullest part of the hips and buttocks. Stand to the side to ensure the tape is level.",
    tip: "Usually 18-23cm below the natural waist.",
    dotY: 57,
    dotX: 50,
    region: "lower",
  },
  shoulder: {
    label: "Shoulder Width",
    instruction:
      "Measure from the edge of one shoulder to the other, across the back. Feel for the bony point at each shoulder tip.",
    tip: "Ask the client to relax their shoulders — not shrug.",
    dotY: 26,
    dotX: 50,
    region: "upper",
  },
  neck: {
    label: "Neck",
    instruction:
      "Wrap the tape around the base of the neck, where a shirt collar sits. You should be able to fit one finger between the tape and skin.",
    tip: "Don't measure too high — it's the base, not the middle of the neck.",
    dotY: 22,
    dotX: 50,
    region: "upper",
  },
  armLength: {
    label: "Arm Length",
    instruction:
      "From the shoulder point, down along a slightly bent arm, to the wrist bone. Keep the arm relaxed.",
    tip: "A slight bend at the elbow gives a more comfortable fit.",
    dotY: 40,
    dotX: 20,
    region: "arm",
  },
  sleeveLength: {
    label: "Sleeve Length",
    instruction:
      "From the shoulder seam point, along the outside of the arm to the desired sleeve end. Can be wrist, elbow, or short.",
    tip: "For suits, measure to 2cm past the wrist bone.",
    dotY: 45,
    dotX: 20,
    region: "arm",
  },
  backLength: {
    label: "Back Length",
    instruction:
      "From the prominent bone at the back of the neck (C7 vertebra) straight down to the natural waist.",
    tip: "Ask the client to tilt their head forward to find the neck bone.",
    dotY: 36,
    dotX: 50,
    region: "upper",
  },
  frontLength: {
    label: "Front Length",
    instruction:
      "From the highest point of the shoulder (near the neck), over the bust, straight down to the natural waist.",
    tip: "Keep the tape flat against the body — don't let it swing out.",
    dotY: 40,
    dotX: 50,
    region: "upper",
  },
  wrist: {
    label: "Wrist",
    instruction:
      "Measure around the wrist bone. Keep the tape snug against the skin.",
    tip: "Measure on the dominant hand — it's usually slightly larger.",
    dotY: 62,
    dotX: 15,
    region: "arm",
  },
  inseam: {
    label: "Inseam",
    instruction:
      "From the crotch point straight down to the ankle bone along the inner leg. Client should stand straight with feet slightly apart.",
    tip: "Use a hardcover book pressed up to the crotch for accuracy.",
    dotY: 68,
    dotX: 42,
    region: "lower",
  },
  thigh: {
    label: "Thigh",
    instruction:
      "Measure around the fullest part of the thigh, just below the crotch. Keep the tape horizontal.",
    tip: "Measure both legs — there can be a slight difference.",
    dotY: 62,
    dotX: 42,
    region: "lower",
  },
  knee: {
    label: "Knee",
    instruction:
      "Measure around the knee with the leg slightly bent. Place the tape at the center of the kneecap.",
    tip: "A slight bend gives a more comfortable trouser fit.",
    dotY: 72,
    dotX: 42,
    region: "lower",
  },
  calf: {
    label: "Calf",
    instruction:
      "Measure around the fullest part of the calf muscle. The tape should be level.",
    tip: "Ask the client to stand on tiptoe briefly to find the fullest point.",
    dotY: 80,
    dotX: 42,
    region: "lower",
  },
  ankle: {
    label: "Ankle",
    instruction:
      "Measure around the ankle just above the ankle bones.",
    tip: "Keep it snug — trouser hems need to clear shoes comfortably.",
    dotY: 90,
    dotX: 42,
    region: "lower",
  },
};

/* -------------------------------------------------------------------------- */
/*  Body diagram SVG component                                                */
/* -------------------------------------------------------------------------- */

function BodyDiagram({
  highlightKey,
  gender,
}: {
  highlightKey: string | null;
  gender: "male" | "female";
}) {
  const guide = highlightKey ? MEASUREMENT_GUIDES[highlightKey] : null;

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Body outline */}
      <g
        fill="none"
        stroke="#1A1A2E"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.25"
      >
        {/* Head */}
        <ellipse cx="50" cy="12" rx="6" ry="7" />
        {/* Neck */}
        <line x1="47" y1="19" x2="47" y2="23" />
        <line x1="53" y1="19" x2="53" y2="23" />
        {/* Shoulders */}
        <line x1="47" y1="23" x2="32" y2="26" />
        <line x1="53" y1="23" x2="68" y2="26" />

        {gender === "female" ? (
          <>
            {/* Female torso */}
            <path d="M32,26 L33,38 L35,48 L34,56 L36,62 L36,64" />
            <path d="M68,26 L67,38 L65,48 L66,56 L64,62 L64,64" />
            {/* Bust curve */}
            <path d="M33,35 Q40,42 50,40 Q60,42 67,35" strokeDasharray="1,1" opacity="0.4" />
          </>
        ) : (
          <>
            {/* Male torso */}
            <path d="M32,26 L33,35 L35,48 L36,56 L37,62 L37,64" />
            <path d="M68,26 L67,35 L65,48 L64,56 L63,62 L63,64" />
          </>
        )}

        {/* Waist line */}
        <path d="M35,48 Q50,46 65,48" strokeDasharray="1,1" opacity="0.4" />
        {/* Hip line */}
        <path d="M34,56 Q50,59 66,56" strokeDasharray="1,1" opacity="0.4" />

        {/* Left arm */}
        <path d="M32,26 L25,38 L22,50 L20,62" />
        {/* Right arm */}
        <path d="M68,26 L75,38 L78,50 L80,62" />

        {/* Left leg */}
        <path d={gender === "female"
          ? "M36,64 L38,72 L40,80 L41,90 L41,96"
          : "M37,64 L38,72 L40,80 L41,90 L41,96"
        } />
        {/* Right leg */}
        <path d={gender === "female"
          ? "M64,64 L62,72 L60,80 L59,90 L59,96"
          : "M63,64 L62,72 L60,80 L59,90 L59,96"
        } />
      </g>

      {/* Highlight dot for selected measurement */}
      {guide && (
        <>
          {/* Pulse ring */}
          <circle
            cx={guide.dotX}
            cy={guide.dotY}
            r="3"
            fill="none"
            stroke="#C75B39"
            strokeWidth="0.5"
            opacity="0.4"
          >
            <animate
              attributeName="r"
              from="2"
              to="5"
              dur="1.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from="0.6"
              to="0"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Dot */}
          <circle cx={guide.dotX} cy={guide.dotY} r="2" fill="#C75B39" />
          {/* Measurement line indicator */}
          {guide.region === "upper" && (
            <line
              x1={guide.dotX - 15}
              y1={guide.dotY}
              x2={guide.dotX + 15}
              y2={guide.dotY}
              stroke="#C75B39"
              strokeWidth="0.4"
              strokeDasharray="1,1"
              opacity="0.6"
            />
          )}
          {guide.region === "lower" && (
            <line
              x1={guide.dotX - 8}
              y1={guide.dotY}
              x2={guide.dotX + 16}
              y2={guide.dotY}
              stroke="#C75B39"
              strokeWidth="0.4"
              strokeDasharray="1,1"
              opacity="0.6"
            />
          )}
          {guide.region === "arm" && (
            <line
              x1={guide.dotX}
              y1={guide.dotY - 8}
              x2={guide.dotX}
              y2={guide.dotY + 8}
              stroke="#C75B39"
              strokeWidth="0.4"
              strokeDasharray="1,1"
              opacity="0.6"
            />
          )}
        </>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Guide Component                                                      */
/* -------------------------------------------------------------------------- */

interface MeasurementGuideProps {
  activeField: string | null;
  gender: "male" | "female";
}

export function MeasurementGuide({ activeField, gender }: MeasurementGuideProps) {
  const guide = activeField ? MEASUREMENT_GUIDES[activeField] : null;

  if (!guide) return null;

  return (
    <div className="rounded-xl border border-[#C75B39]/10 bg-gradient-to-br from-[#C75B39]/[0.03] to-[#D4A853]/[0.03] p-3">
      <div className="flex gap-3">
        {/* Body diagram */}
        <div className="w-16 shrink-0 sm:w-20">
          <BodyDiagram highlightKey={activeField} gender={gender} />
        </div>

        {/* Instructions */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#C75B39]">{guide.label}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#1A1A2E]/65">
            {guide.instruction}
          </p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[#D4A853]">
            Tip: {guide.tip}
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inline guide toggle button                                                */
/* -------------------------------------------------------------------------- */

export function MeasurementGuideToggle({
  measurementKey,
  gender,
}: {
  measurementKey: string;
  gender: "male" | "female";
}) {
  const [open, setOpen] = useState(false);
  const guide = MEASUREMENT_GUIDES[measurementKey];

  if (!guide) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center rounded-full p-0.5 text-[#1A1A2E]/25 transition-colors hover:text-[#C75B39]"
        title={`How to measure ${guide.label}`}
      >
        {open ? <X className="h-3 w-3" /> : <HelpCircle className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-1.5">
          <MeasurementGuide activeField={measurementKey} gender={gender} />
        </div>
      )}
    </div>
  );
}
