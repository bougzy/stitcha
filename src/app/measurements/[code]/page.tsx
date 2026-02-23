import Link from "next/link";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";
import { MEASUREMENT_TYPES } from "@/lib/constants";
import type { Metadata } from "next";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface MeasurementData {
  bust?: number;
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
  wrist?: number;
  thigh?: number;
  knee?: number;
  calf?: number;
  ankle?: number;
  height?: number;
  weight?: number;
  source?: string;
  confidence?: number;
  measuredAt?: string;
}

interface CardData {
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
/*  Data fetching                                                             */
/* -------------------------------------------------------------------------- */

async function getCardData(code: string): Promise<CardData | null> {
  try {
    await connectDB();

    const client = await Client.findOne({ shareCode: code }).lean();
    if (!client || !client.measurements) return null;

    const designer = await Designer.findById(client.designerId)
      .select("businessName name city state")
      .lean();

    const d = designer as Record<string, unknown> | null;

    return {
      clientName: client.name as string,
      clientGender: client.gender as "male" | "female",
      measurements: JSON.parse(JSON.stringify(client.measurements)),
      lastMeasuredAt: client.lastMeasuredAt
        ? new Date(client.lastMeasuredAt as Date).toISOString()
        : null,
      designer: d
        ? {
            businessName: d.businessName as string,
            name: d.name as string,
            location: [d.city, d.state].filter(Boolean).join(", "),
          }
        : null,
    };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Dynamic metadata for OpenGraph / WhatsApp preview                         */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const data = await getCardData(code);

  if (!data) {
    return { title: "Measurement Card — Stitcha" };
  }

  const measuredFields = MEASUREMENT_TYPES.filter(
    (t) => data.measurements[t.key as keyof MeasurementData]
  ).length;

  const description = `${data.clientName}'s body measurements (${measuredFields} measurements) — captured by ${data.designer?.businessName || "Stitcha"}`;

  return {
    title: `${data.clientName} — Measurement Card`,
    description,
    openGraph: {
      title: `${data.clientName} — Measurement Card`,
      description,
      siteName: "Stitcha",
      type: "profile",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Not-found view                                                            */
/* -------------------------------------------------------------------------- */

function NotFoundView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1A1A2E]/5">
          <span className="text-3xl">📏</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">
          Card Not Found
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#1A1A2E]/55">
          This measurement card doesn&apos;t exist or has been removed.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#D4A853] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Measurement Card view                                                     */
/* -------------------------------------------------------------------------- */

function MeasurementCardView({ data }: { data: CardData }) {
  const initials = data.clientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const m = data.measurements;

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  };

  // Group measurements by category for better presentation
  const upperBody = [
    { key: "bust", label: "Bust" },
    { key: "chest", label: "Chest" },
    { key: "shoulder", label: "Shoulder" },
    { key: "neck", label: "Neck" },
    { key: "backLength", label: "Back Length" },
    { key: "frontLength", label: "Front Length" },
  ];

  const arms = [
    { key: "armLength", label: "Arm Length" },
    { key: "sleeveLength", label: "Sleeve Length" },
    { key: "wrist", label: "Wrist" },
  ];

  const lowerBody = [
    { key: "waist", label: "Waist" },
    { key: "hips", label: "Hips" },
    { key: "inseam", label: "Inseam" },
    { key: "thigh", label: "Thigh" },
    { key: "knee", label: "Knee" },
    { key: "calf", label: "Calf" },
    { key: "ankle", label: "Ankle" },
  ];

  const renderGroup = (
    title: string,
    items: { key: string; label: string }[]
  ) => {
    const filtered = items.filter(
      (i) => m[i.key as keyof MeasurementData]
    );
    if (filtered.length === 0) return null;

    return (
      <div>
        <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#1A1A2E]/35">
          {title}
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-[#1A1A2E]/[0.06] bg-white/60 px-3 py-2.5"
            >
              <p className="text-[10px] font-medium text-[#1A1A2E]/40">
                {item.label}
              </p>
              <p className="mt-0.5 text-base font-bold text-[#1A1A2E]">
                {m[item.key as keyof MeasurementData] as number}{" "}
                <span className="text-[10px] font-normal text-[#1A1A2E]/30">
                  cm
                </span>
              </p>
            </div>
          ))}
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
            <div className="flex items-center gap-4">
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

            {/* Measurement date */}
            {(data.lastMeasuredAt || m.measuredAt) && (
              <p className="mt-3 text-xs text-[#1A1A2E]/40">
                Last measured:{" "}
                {formatDate(
                  (data.lastMeasuredAt || m.measuredAt) as string
                )}
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
                    {m.height}
                    <span className="ml-1 text-xs font-normal text-[#1A1A2E]/35">
                      cm
                    </span>
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

          {/* Measurement groups */}
          <div className="space-y-5 px-6 py-5 sm:px-8 sm:py-6">
            {renderGroup("Upper Body", upperBody)}
            {renderGroup("Arms", arms)}
            {renderGroup("Lower Body", lowerBody)}
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

/* -------------------------------------------------------------------------- */
/*  Server component — page                                                   */
/* -------------------------------------------------------------------------- */

export default async function MeasurementCardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getCardData(code);

  if (!data) {
    return <NotFoundView />;
  }

  return <MeasurementCardView data={data} />;
}
