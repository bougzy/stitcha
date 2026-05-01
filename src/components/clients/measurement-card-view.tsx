"use client";

import Link from "next/link";
import { MEASUREMENT_TYPES, MEASUREMENT_GROUPS } from "@/lib/constants";
import { toDisplayInches } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface MeasurementData {
  bust?: number;
  underBust?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  armLength?: number;
  inseam?: number;
  neck?: number;
  chest?: number;
  backLength?: number;
  frontLength?: number;
  sleeveLength?: number;
  halfSleeve?: number;
  wrist?: number;
  thigh?: number;
  knee?: number;
  calf?: number;
  ankle?: number;
  roundArm?: number;
  blouseLength?: number;
  fullLength?: number;
  halfLength?: number;
  crotchLength?: number;
  shoulderToBust?: number;
  shoulderToHip?: number;
  height?: number;
  weight?: number;
  source?: string;
  confidence?: number;
  measuredAt?: string;
  aiEstimatedFields?: string[];
  confidenceScores?: Record<string, number>;
}

export interface CardData {
  clientName: string;
  clientGender: "male" | "female";
  measurements: MeasurementData;
  lastMeasuredAt: string | null;
  designer: {
    businessName: string;
    name: string;
    location: string;
  } | null;
}

/* -------------------------------------------------------------------------- */
/*  Label lookup from constants                                               */
/* -------------------------------------------------------------------------- */

const labelMap: Record<string, string> = Object.fromEntries(
  MEASUREMENT_TYPES.map((m) => [m.key, m.label])
);

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function MeasurementCardView({ data }: { data: CardData }) {
  const initials = data.clientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const m = data.measurements;

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));

  const displayVal = (inches: number) => `${toDisplayInches(inches)}"`;

  /* ---- Group rendering ---- */
  const renderGroup = (
    groupLabel: string,
    keys: readonly string[]
  ) => {
    const items = keys
      .map((key) => ({ key, label: labelMap[key] ?? key, value: m[key as keyof MeasurementData] as number | undefined }))
      .filter((i) => typeof i.value === "number" && i.value > 0);

    if (items.length === 0) return null;

    return (
      <div key={groupLabel}>
        <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#1A1A2E]/35">
          {groupLabel}
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map(({ key, label, value }) => {
            const isAiEst = m.aiEstimatedFields?.includes(key);
            const conf = m.confidenceScores?.[key];
            return (
              <div
                key={key}
                className="rounded-xl border border-[#1A1A2E]/[0.06] bg-white/60 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] font-medium text-[#1A1A2E]/40 truncate">
                    {label}
                  </p>
                  {isAiEst && (
                    <span
                      title="AI estimated — verify with tape"
                      className="shrink-0 text-[9px] text-amber-400"
                    >
                      ★
                    </span>
                  )}
                  {!isAiEst && conf !== undefined && (
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        conf >= 0.85 ? "bg-emerald-400" : conf >= 0.6 ? "bg-amber-400" : "bg-red-400"
                      }`}
                      title={`Confidence: ${Math.round(conf * 100)}%`}
                    />
                  )}
                </div>
                <p className="mt-0.5 text-base font-bold text-[#1A1A2E]">
                  {displayVal(value!)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-[#FAFAF8]">
      {/* Background mesh */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#C75B39]/[0.06] blur-[120px]" />
        <div className="absolute top-1/3 -left-24 h-[400px] w-[400px] rounded-full bg-[#D4A853]/[0.05] blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[350px] w-[350px] rounded-full bg-[#F5E6D3]/[0.08] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-12">
        {/* Main card */}
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(26,26,46,0.08)] backdrop-blur-xl">
          {/* Header gradient bar */}
          <div className="h-2 bg-gradient-to-r from-[#C75B39] to-[#D4A853]" />

          {/* Card header */}
          <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar */}
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg ${
                    data.clientGender === "female"
                      ? "bg-gradient-to-br from-[#C75B39] to-[#D4A853]"
                      : "bg-gradient-to-br from-[#1A1A2E] to-[#C75B39]"
                  }`}
                >
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-[#1A1A2E]">
                    {data.clientName}
                  </h1>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        data.clientGender === "female"
                          ? "bg-[#C75B39]/10 text-[#C75B39]"
                          : "bg-[#1A1A2E]/8 text-[#1A1A2E]/60"
                      }`}
                    >
                      {data.clientGender}
                    </span>
                    {m.source === "ai_scan" && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                        AI Scanned
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Measurement date */}
            {(data.lastMeasuredAt || m.measuredAt) && (
              <p className="mt-3 text-xs text-[#1A1A2E]/40">
                Last measured:{" "}
                {formatDate((data.lastMeasuredAt || m.measuredAt) as string)}
              </p>
            )}
          </div>

          <div className="h-px bg-[#1A1A2E]/[0.06]" />

          {/* Height & Weight highlight */}
          {(m.height || m.weight) && (
            <div className="flex gap-0 divide-x divide-[#1A1A2E]/[0.06]">
              {m.height && (
                <div className="flex-1 px-6 py-4 text-center sm:px-8">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1A1A2E]/35">
                    Height
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#1A1A2E]">
                    {toDisplayInches(m.height)}
                    <span className="ml-1 text-xs font-normal text-[#1A1A2E]/35">in</span>
                  </p>
                </div>
              )}
              {m.weight && (
                <div className="flex-1 px-6 py-4 text-center sm:px-8">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1A1A2E]/35">
                    Weight
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#1A1A2E]">
                    {m.weight}
                    <span className="ml-1 text-xs font-normal text-[#1A1A2E]/35">
                      kg
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {(m.height || m.weight) && (
            <div className="h-px bg-[#1A1A2E]/[0.06]" />
          )}

          {/* AI-estimated note */}
          {m.aiEstimatedFields && m.aiEstimatedFields.length > 0 && (
            <div className="mx-6 mt-4 rounded-lg bg-amber-50/60 px-3 py-2 text-[10px] text-amber-700 sm:mx-8">
              ★ Measurements marked with a star were AI-estimated and should be verified with a tape measure.
            </div>
          )}

          {/* Measurement groups */}
          <div className="space-y-5 px-6 py-5 sm:px-8 sm:py-6">
            {(Object.entries(MEASUREMENT_GROUPS) as Array<[string, { label: string; keys: readonly string[] }]>).map(
              ([key, group]) => renderGroup(group.label, group.keys)
            )}
          </div>

          {/* Designer branding footer */}
          {data.designer && (
            <>
              <div className="h-px bg-[#1A1A2E]/[0.06]" />
              <div className="flex items-center gap-3 px-6 py-4 sm:px-8">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#C75B39] to-[#D4A853]">
                  <span className="text-[10px] font-bold text-white">
                    {data.designer.businessName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#1A1A2E]">
                    {data.designer.businessName}
                  </p>
                  {data.designer.location && (
                    <p className="text-[10px] text-[#1A1A2E]/40">
                      {data.designer.location}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-[#C75B39]/8 px-2.5 py-1 text-[9px] font-semibold text-[#C75B39]">
                  MEASURED BY
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-[#1A1A2E]/40 transition-colors hover:text-[#C75B39]"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#C75B39] to-[#D4A853]">
              <span className="text-[8px] font-bold text-white">S</span>
            </span>
            Powered by Stitcha
          </Link>
        </div>
      </div>
    </div>
  );
}
