import Link from "next/link";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";
import { Order } from "@/lib/models/order";
import { MEASUREMENT_TYPES, ORDER_STATUSES } from "@/lib/constants";
import type { Metadata } from "next";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface MeasurementData {
  [key: string]: number | string | undefined;
  source?: string;
  measuredAt?: string;
}

interface PortalStatusEntry {
  status: string;
  changedAt: string;
  note?: string;
}

interface PortalOrder {
  _id: string;
  title: string;
  garmentType: string;
  status: string;
  statusHistory: PortalStatusEntry[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PortalData {
  clientName: string;
  clientGender: "male" | "female";
  measurements: MeasurementData | null;
  lastMeasuredAt: string | null;
  designer: {
    businessName: string;
    name: string;
    phone: string;
    location: string;
  } | null;
  orders: PortalOrder[];
}

/* -------------------------------------------------------------------------- */
/*  Data fetching                                                             */
/* -------------------------------------------------------------------------- */

async function getPortalData(code: string): Promise<PortalData | null> {
  try {
    await connectDB();

    const client = await Client.findOne({ shareCode: code }).lean();
    if (!client) return null;

    const designer = await Designer.findById(client.designerId)
      .select("businessName name phone city state")
      .lean();

    const orders = await Order.find({
      clientId: client._id,
      status: { $ne: "cancelled" },
    })
      .select("title garmentType status statusHistory dueDate createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const d = designer as Record<string, unknown> | null;

    return {
      clientName: client.name as string,
      clientGender: client.gender as "male" | "female",
      measurements: client.measurements
        ? JSON.parse(JSON.stringify(client.measurements))
        : null,
      lastMeasuredAt: client.lastMeasuredAt
        ? new Date(client.lastMeasuredAt as Date).toISOString()
        : null,
      designer: d
        ? {
            businessName: d.businessName as string,
            name: d.name as string,
            phone: d.phone as string,
            location: [d.city, d.state].filter(Boolean).join(", "),
          }
        : null,
      orders: orders.map((o) => {
        const order = o as Record<string, unknown>;
        return {
          _id: String(order._id),
          title: order.title as string,
          garmentType: order.garmentType as string,
          status: order.status as string,
          statusHistory: Array.isArray(order.statusHistory)
            ? (order.statusHistory as { status: string; changedAt: Date; note?: string }[]).map(
                (h) => ({
                  status: h.status,
                  changedAt: new Date(h.changedAt).toISOString(),
                  note: h.note,
                })
              )
            : [],
          dueDate: order.dueDate
            ? new Date(order.dueDate as Date).toISOString()
            : null,
          createdAt: new Date(order.createdAt as Date).toISOString(),
          updatedAt: new Date(order.updatedAt as Date).toISOString(),
        };
      }),
    };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const data = await getPortalData(code);

  if (!data) return { title: "Client Portal — Stitcha" };

  return {
    title: `${data.clientName} — My Portal`,
    description: `View your measurements and order status from ${data.designer?.businessName || "your designer"}`,
    openGraph: {
      title: `${data.clientName} — Client Portal`,
      description: `Your measurements and orders from ${data.designer?.businessName || "Stitcha"}`,
      siteName: "Stitcha",
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
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Portal Not Found</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#1A1A2E]/55">
          This client portal link is not valid. Please contact your designer for a new link.
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
/*  Status helpers                                                            */
/* -------------------------------------------------------------------------- */

function getStatusConfig(status: string) {
  const found = ORDER_STATUSES.find((s) => s.value === status);
  const colorMap: Record<string, string> = {
    gold: "bg-[#D4A853]/15 text-[#D4A853] border-[#D4A853]/20",
    info: "bg-blue-500/10 text-blue-600 border-blue-200",
    terracotta: "bg-[#C75B39]/10 text-[#C75B39] border-[#C75B39]/20",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    destructive: "bg-red-500/10 text-red-600 border-red-200",
  };
  return {
    label: found?.label || status,
    className: colorMap[found?.color || "gold"] || colorMap.gold,
  };
}

function getStatusProgress(status: string): number {
  const steps = [
    "pending",
    "confirmed",
    "cutting",
    "sewing",
    "fitting",
    "finishing",
    "ready",
    "delivered",
  ];
  const idx = steps.indexOf(status);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / steps.length) * 100);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

/* -------------------------------------------------------------------------- */
/*  Portal view                                                               */
/* -------------------------------------------------------------------------- */

function PortalView({ data }: { data: PortalData }) {
  const initials = data.clientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const m = data.measurements;

  const measurementGroups = [
    {
      title: "Upper Body",
      items: ["bust", "chest", "shoulder", "neck", "backLength", "frontLength"],
    },
    {
      title: "Arms",
      items: ["armLength", "sleeveLength", "wrist"],
    },
    {
      title: "Lower Body",
      items: ["waist", "hips", "inseam", "thigh", "knee", "calf", "ankle"],
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#FAFAF8]">
      {/* Background mesh */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#C75B39]/[0.06] blur-[120px]" />
        <div className="absolute top-1/3 -left-24 h-[400px] w-[400px] rounded-full bg-[#D4A853]/[0.05] blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[350px] w-[350px] rounded-full bg-[#F5E6D3]/[0.08] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-lg space-y-4 px-4 py-8 sm:px-6 sm:py-12">
        {/* Welcome header */}
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(26,26,46,0.08)] backdrop-blur-xl">
          <div className="h-2 bg-gradient-to-r from-[#C75B39] to-[#D4A853]" />
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg ${
                  data.clientGender === "female"
                    ? "bg-gradient-to-br from-[#C75B39] to-[#D4A853]"
                    : "bg-gradient-to-br from-[#1A1A2E] to-[#C75B39]"
                }`}
              >
                {initials}
              </div>
              <div>
                <p className="text-xs text-[#1A1A2E]/40">Welcome back</p>
                <h1 className="text-xl font-bold text-[#1A1A2E]">
                  {data.clientName}
                </h1>
              </div>
            </div>

            {data.designer && (
              <div className="mt-4 rounded-xl bg-[#1A1A2E]/[0.03] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1A1A2E]/30">
                  Your Designer
                </p>
                <p className="mt-1 text-sm font-semibold text-[#1A1A2E]">
                  {data.designer.businessName}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-[#1A1A2E]/50">
                  {data.designer.location && (
                    <span>{data.designer.location}</span>
                  )}
                  {data.designer.phone && (
                    <a
                      href={`tel:${data.designer.phone}`}
                      className="text-[#C75B39] hover:underline"
                    >
                      Call
                    </a>
                  )}
                  {data.designer.phone && (
                    <a
                      href={`https://wa.me/${data.designer.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders section */}
        {data.orders.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(26,26,46,0.06)] backdrop-blur-xl">
            <div className="px-6 pt-5 pb-3 sm:px-8">
              <h2 className="text-sm font-semibold text-[#1A1A2E]">
                Your Orders
              </h2>
            </div>

            <div className="divide-y divide-[#1A1A2E]/[0.05]">
              {data.orders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                const progress = getStatusProgress(order.status);

                return (
                  <div key={order._id} className="px-6 py-4 sm:px-8">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1A1A2E]">
                          {order.title}
                        </p>
                        <p className="text-xs text-[#1A1A2E]/40">
                          {order.garmentType}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusConfig.className}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1A1A2E]/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#C75B39] to-[#D4A853] transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#1A1A2E]/35">
                        <span>Ordered {formatDate(order.createdAt)}</span>
                        {order.dueDate && (
                          <span>Due {formatDate(order.dueDate)}</span>
                        )}
                      </div>
                    </div>

                    {/* Mini timeline */}
                    {order.statusHistory.length > 1 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {order.statusHistory
                          .sort(
                            (a, b) =>
                              new Date(a.changedAt).getTime() -
                              new Date(b.changedAt).getTime()
                          )
                          .map((h, i) => (
                            <span
                              key={`${h.status}-${i}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[#1A1A2E]/[0.04] px-2 py-0.5 text-[9px] text-[#1A1A2E]/40"
                            >
                              {i > 0 && <span className="text-[#1A1A2E]/20">&rarr;</span>}
                              {getStatusConfig(h.status).label}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Measurements section */}
        {m && (
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(26,26,46,0.06)] backdrop-blur-xl">
            <div className="px-6 pt-5 pb-2 sm:px-8">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#1A1A2E]">
                  Your Measurements
                </h2>
                {m.source === "ai_scan" && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    AI Scanned
                  </span>
                )}
              </div>
              {data.lastMeasuredAt && (
                <p className="mt-0.5 text-[10px] text-[#1A1A2E]/35">
                  Last updated: {formatDate(data.lastMeasuredAt)}
                </p>
              )}
            </div>

            {/* Height & Weight */}
            {(m.height || m.weight) && (
              <div className="flex gap-0 divide-x divide-[#1A1A2E]/[0.06] border-b border-[#1A1A2E]/[0.06] mx-6 sm:mx-8">
                {m.height && (
                  <div className="flex-1 py-3 pr-4">
                    <p className="text-[10px] text-[#1A1A2E]/35">Height</p>
                    <p className="text-lg font-bold text-[#1A1A2E]">
                      {m.height as number}{" "}
                      <span className="text-xs font-normal text-[#1A1A2E]/30">cm</span>
                    </p>
                  </div>
                )}
                {m.weight && (
                  <div className="flex-1 py-3 pl-4">
                    <p className="text-[10px] text-[#1A1A2E]/35">Weight</p>
                    <p className="text-lg font-bold text-[#1A1A2E]">
                      {m.weight as number}{" "}
                      <span className="text-xs font-normal text-[#1A1A2E]/30">kg</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Grouped measurements */}
            <div className="space-y-4 px-6 py-4 sm:px-8">
              {measurementGroups.map((group) => {
                const items = group.items.filter(
                  (key) => m[key]
                );
                if (items.length === 0) return null;

                return (
                  <div key={group.title}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#1A1A2E]/30">
                      {group.title}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {items.map((key) => {
                        const mt = MEASUREMENT_TYPES.find(
                          (t) => t.key === key
                        );
                        return (
                          <div
                            key={key}
                            className="rounded-lg bg-[#1A1A2E]/[0.025] px-3 py-2"
                          >
                            <p className="text-[10px] text-[#1A1A2E]/40">
                              {mt?.label || key}
                            </p>
                            <p className="text-sm font-bold text-[#1A1A2E]">
                              {m[key] as number}{" "}
                              <span className="text-[9px] font-normal text-[#1A1A2E]/25">
                                cm
                              </span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No measurements */}
        {!m && (
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 p-8 text-center shadow-[0_8px_32px_rgba(26,26,46,0.06)] backdrop-blur-xl">
            <span className="text-3xl">📏</span>
            <p className="mt-3 text-sm font-medium text-[#1A1A2E]/60">
              No measurements recorded yet
            </p>
            <p className="mt-1 text-xs text-[#1A1A2E]/40">
              Your designer will add your measurements soon.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 text-center">
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

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getPortalData(code);

  if (!data) {
    return <NotFoundView />;
  }

  return <PortalView data={data} />;
}
