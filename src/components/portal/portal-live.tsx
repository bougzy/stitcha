"use client";

/* -------------------------------------------------------------------------- */
/*  PortalLive                                                                  */
/*                                                                              */
/*  Client component that owns the portal UI after first paint:                */
/*    • Polls /api/portal/[code] every 30s for fresh status                    */
/*    • Refreshes on tab focus                                                  */
/*    • Toggles "Notify me on WhatsApp when ready" per order                   */
/*    • Renders payment summary block per order                                */
/*    • Surfaces the existing PWA install prompt (mounted globally already)    */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  Loader2,
  Banknote,
  Phone,
  MessageCircle,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { ORDER_STATUSES, MEASUREMENT_TYPES } from "@/lib/constants";

export interface PortalMeasurements {
  [key: string]: number | string | undefined;
  source?: string;
  height?: number;
  weight?: number;
}

export interface PortalOrder {
  _id: string;
  title: string;
  garmentType: string;
  status: string;
  statusHistory: { status: string; changedAt: string; note?: string }[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  price: number;
  currency: string;
  totalPaid: number;
  balance: number;
  paymentStatus: string;
  notifyWhenReady: boolean;
}

export interface PortalData {
  clientName: string;
  clientGender: "male" | "female";
  clientPhone?: string;
  measurements: PortalMeasurements | null;
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
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const POLL_INTERVAL_MS = 30_000;

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
    "pending", "confirmed", "cutting", "sewing",
    "fitting", "finishing", "ready", "delivered",
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

function formatNGN(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

export function PortalLive({
  code,
  initialData,
}: {
  code: string;
  initialData: PortalData;
}) {
  const [data, setData] = useState<PortalData>(initialData);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/portal/${code}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(Date.now());
      }
    } catch {
      /* swallow — portal is best-effort */
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [code]);

  /* Poll every 30s + on focus */
  useEffect(() => {
    const t = window.setInterval(() => refresh(true), POLL_INTERVAL_MS);
    const onFocus = () => refresh(true);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  async function toggleNotify(orderId: string, current: boolean) {
    setTogglingId(orderId);
    // Optimistic update
    setData((d) => ({
      ...d,
      orders: d.orders.map((o) =>
        o._id === orderId ? { ...o, notifyWhenReady: !current } : o,
      ),
    }));
    try {
      const res = await fetch(`/api/portal/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, notifyWhenReady: !current }),
      });
      const json = await res.json();
      if (!json.success) {
        // Roll back on failure
        setData((d) => ({
          ...d,
          orders: d.orders.map((o) =>
            o._id === orderId ? { ...o, notifyWhenReady: current } : o,
          ),
        }));
        toast.error(json.error || "Couldn't update notification preference");
        return;
      }
      toast.success(
        !current
          ? "We'll ask your tailor to ping you when it's ready"
          : "Notifications turned off",
      );
    } catch {
      setData((d) => ({
        ...d,
        orders: d.orders.map((o) =>
          o._id === orderId ? { ...o, notifyWhenReady: current } : o,
        ),
      }));
      toast.error("Network error");
    } finally {
      setTogglingId(null);
    }
  }

  /* Time-ago string for the "Live · updated Xs ago" chip */
  const ago = (() => {
    const sec = Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000));
    if (sec < 5) return "just now";
    if (sec < 60) return `${sec}s ago`;
    const mn = Math.floor(sec / 60);
    return `${mn}m ago`;
  })();
  // Tick clock for the ago label without flooding renders
  const [, force] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => force((x) => x + 1), 5000);
    return () => window.clearInterval(t);
  }, []);

  const initials = data.clientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const m = data.measurements;
  const measurementGroups = [
    { title: "Upper Body", items: ["bust", "chest", "shoulder", "neck", "backLength", "frontLength"] },
    { title: "Arms",       items: ["armLength", "sleeveLength", "wrist"] },
    { title: "Lower Body", items: ["waist", "hips", "inseam", "thigh", "knee", "calf", "ankle"] },
  ];

  return (
    <div className="relative min-h-[100dvh] bg-[#FAFAF8]">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#C75B39]/[0.06] blur-[120px]" />
        <div className="absolute top-1/3 -left-24 h-[400px] w-[400px] rounded-full bg-[#D4A853]/[0.05] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6">
        {/* Header card */}
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(26,26,46,0.08)] backdrop-blur-xl">
          <div className="h-2 bg-gradient-to-r from-[#C75B39] to-[#D4A853]" />
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white shadow-md ${
                    data.clientGender === "female"
                      ? "bg-gradient-to-br from-[#C75B39] to-[#D4A853]"
                      : "bg-gradient-to-br from-[#1A1A2E] to-[#C75B39]"
                  }`}
                >
                  {initials}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#1A1A2E]/35">
                    Welcome back
                  </p>
                  <h1 className="text-lg font-bold text-[#1A1A2E]">{data.clientName}</h1>
                </div>
              </div>

              {/* Live status chip */}
              <button
                onClick={() => refresh()}
                disabled={refreshing}
                className="flex h-8 items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-50/60 px-2.5 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100/60 disabled:opacity-60"
                title="Refresh"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                {refreshing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Live · {ago}
              </button>
            </div>

            {data.designer && (
              <div className="mt-4 rounded-xl bg-[#1A1A2E]/[0.03] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1A1A2E]/30">
                  Your designer
                </p>
                <p className="mt-1 text-sm font-semibold text-[#1A1A2E]">
                  {data.designer.businessName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                  {data.designer.location && (
                    <span className="text-[#1A1A2E]/50">{data.designer.location}</span>
                  )}
                  {data.designer.phone && (
                    <a
                      href={`tel:${data.designer.phone}`}
                      className="inline-flex items-center gap-1 text-[#C75B39] hover:underline"
                    >
                      <Phone className="h-3 w-3" /> Call
                    </a>
                  )}
                  {data.designer.phone && (
                    <a
                      href={`https://wa.me/${data.designer.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                    >
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders */}
        {data.orders.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(26,26,46,0.06)] backdrop-blur-xl">
            <div className="px-5 pt-5 pb-2 sm:px-6">
              <h2 className="text-sm font-semibold text-[#1A1A2E]">Your orders</h2>
            </div>
            <ul className="divide-y divide-[#1A1A2E]/[0.06]">
              {data.orders.map((order) => (
                <li key={order._id}>
                  <OrderRow
                    order={order}
                    onToggleNotify={() =>
                      toggleNotify(order._id, order.notifyWhenReady)
                    }
                    toggling={togglingId === order._id}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Measurements */}
        {m && (
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(26,26,46,0.06)] backdrop-blur-xl">
            <div className="px-5 pt-5 pb-2 sm:px-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#1A1A2E]">Your measurements</h2>
                {m.source === "ai_scan" && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    AI scanned
                  </span>
                )}
              </div>
              {data.lastMeasuredAt && (
                <p className="mt-0.5 text-[10px] text-[#1A1A2E]/35">
                  Last updated: {formatDate(data.lastMeasuredAt)}
                </p>
              )}
            </div>

            {(m.height || m.weight) && (
              <div className="mx-5 flex gap-0 divide-x divide-[#1A1A2E]/[0.06] border-b border-[#1A1A2E]/[0.06] sm:mx-6">
                {m.height && (
                  <div className="flex-1 py-3 pr-4">
                    <p className="text-[10px] text-[#1A1A2E]/35">Height</p>
                    <p className="text-lg font-bold text-[#1A1A2E]">
                      {m.height as number}
                      <span className="ml-1 text-xs font-normal text-[#1A1A2E]/30">&quot;</span>
                    </p>
                  </div>
                )}
                {m.weight && (
                  <div className="flex-1 py-3 pl-4">
                    <p className="text-[10px] text-[#1A1A2E]/35">Weight</p>
                    <p className="text-lg font-bold text-[#1A1A2E]">
                      {m.weight as number}
                      <span className="ml-1 text-xs font-normal text-[#1A1A2E]/30">kg</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 px-5 py-4 sm:px-6">
              {measurementGroups.map((group) => {
                const items = group.items.filter((key) => m[key]);
                if (items.length === 0) return null;
                return (
                  <div key={group.title}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#1A1A2E]/30">
                      {group.title}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {items.map((key) => {
                        const mt = MEASUREMENT_TYPES.find((t) => t.key === key);
                        return (
                          <div
                            key={key}
                            className="rounded-lg bg-[#1A1A2E]/[0.025] px-3 py-2"
                          >
                            <p className="text-[10px] text-[#1A1A2E]/40">
                              {mt?.label || key}
                            </p>
                            <p className="text-sm font-bold text-[#1A1A2E]">
                              {m[key] as number}
                              <span className="ml-0.5 text-[9px] font-normal text-[#1A1A2E]/25">
                                &quot;
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

        {!m && (
          <div className="rounded-2xl border border-white/40 bg-white/70 p-8 text-center backdrop-blur-xl">
            <span className="text-3xl">📏</span>
            <p className="mt-3 text-sm font-medium text-[#1A1A2E]/60">
              No measurements recorded yet
            </p>
            <p className="mt-1 text-xs text-[#1A1A2E]/40">
              Your designer will add your measurements soon.
            </p>
          </div>
        )}

        {/* Add-to-home-screen prompt for customers (uses the global InstallPrompt
            mounted in app/layout.tsx — already shows on iOS + Android.) */}

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
/*  OrderRow — status + payment summary + notify-me toggle                    */
/* -------------------------------------------------------------------------- */

function OrderRow({
  order,
  onToggleNotify,
  toggling,
}: {
  order: PortalOrder;
  onToggleNotify: () => void;
  toggling: boolean;
}) {
  const statusConfig = getStatusConfig(order.status);
  const progress = getStatusProgress(order.status);
  const isReadyish = order.status === "ready" || order.status === "delivered";
  const showPayments = order.price > 0;

  const paymentColor =
    order.paymentStatus === "paid"
      ? "bg-emerald-50/60 text-emerald-700"
      : order.paymentStatus === "partial"
      ? "bg-amber-50/60 text-amber-700"
      : order.paymentStatus === "overdue"
      ? "bg-red-50/60 text-red-700"
      : "bg-[#1A1A2E]/[0.04] text-[#1A1A2E]/60";

  return (
    <div className="px-5 py-4 sm:px-6">
      {/* Top — title + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#1A1A2E]">{order.title}</p>
          <p className="text-xs capitalize text-[#1A1A2E]/40">{order.garmentType}</p>
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
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6 }}
            className="h-full rounded-full bg-gradient-to-r from-[#C75B39] to-[#D4A853]"
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#1A1A2E]/35">
          <span>Ordered {formatDate(order.createdAt)}</span>
          {order.dueDate && <span>Due {formatDate(order.dueDate)}</span>}
        </div>
      </div>

      {/* Payment summary */}
      {showPayments && (
        <div className={`mt-3 rounded-xl px-3 py-2 ${paymentColor}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">
              <Banknote className="h-3 w-3" /> Payment
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
              {order.paymentStatus}
            </p>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <p className="opacity-55">Price</p>
              <p className="font-bold text-[#1A1A2E]">{formatNGN(order.price)}</p>
            </div>
            <div>
              <p className="opacity-55">Paid</p>
              <p className="font-bold text-[#1A1A2E]">{formatNGN(order.totalPaid)}</p>
            </div>
            <div>
              <p className="opacity-55">Balance</p>
              <p className="font-bold text-[#1A1A2E]">{formatNGN(order.balance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status timeline pills */}
      {order.statusHistory.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {order.statusHistory
            .slice()
            .sort(
              (a, b) =>
                new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
            )
            .map((h, i) => (
              <span
                key={`${h.status}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-[#1A1A2E]/[0.04] px-2 py-0.5 text-[9px] text-[#1A1A2E]/45"
              >
                {i > 0 && <ChevronRight className="h-2 w-2 text-[#1A1A2E]/20" />}
                {getStatusConfig(h.status).label}
              </span>
            ))}
        </div>
      )}

      {/* Notify-me toggle */}
      {!isReadyish && (
        <button
          onClick={onToggleNotify}
          disabled={toggling}
          className={`mt-3 flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
            order.notifyWhenReady
              ? "border-emerald-300/60 bg-emerald-50/60 text-emerald-700"
              : "border-[#1A1A2E]/8 bg-white/40 text-[#1A1A2E]/65 hover:bg-white/60"
          } disabled:opacity-60`}
        >
          <span className="flex items-center gap-2">
            {order.notifyWhenReady ? (
              <Bell className="h-3.5 w-3.5 fill-current" />
            ) : (
              <BellOff className="h-3.5 w-3.5" />
            )}
            <span>
              {order.notifyWhenReady
                ? "We'll WhatsApp you when it's ready"
                : "Notify me on WhatsApp when ready"}
            </span>
          </span>
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : order.notifyWhenReady ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#1A1A2E]/35" />
          )}
        </button>
      )}
    </div>
  );
}
