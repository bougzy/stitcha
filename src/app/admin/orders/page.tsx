"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Package, Search, Loader2, RefreshCw, ExternalLink, Calendar } from "lucide-react";

interface AdminOrder {
  id: string;
  title: string;
  status: string;
  paymentStatus: string;
  garmentType: string;
  price: number;
  collected: number;
  balance: number;
  dueDate: string | null;
  createdAt: string;
  designer: { id: string; name: string; businessName: string } | null;
  client: { name: string; phone: string } | null;
}

const ORDER_STATUSES = ["", "pending", "confirmed", "cutting", "sewing", "fitting", "finishing", "ready", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["", "unpaid", "partial", "paid", "overdue"];

function formatNGN(n: number) { return `₦${n.toLocaleString("en-NG")}`; }
function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  confirmed: "bg-blue-500/15 text-blue-300",
  cutting: "bg-purple-500/15 text-purple-300",
  sewing: "bg-purple-500/15 text-purple-300",
  fitting: "bg-amber-500/15 text-amber-300",
  finishing: "bg-purple-500/15 text-purple-300",
  ready: "bg-emerald-500/15 text-emerald-300",
  delivered: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-red-500/15 text-red-300",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/orders?${params}`);
      const json = await res.json();
      if (json.success) setOrders(json.data.orders);
      else if (res.status === 401) window.location.href = "/admin/login";
      else toast.error(json.error || "Failed");
    } finally {
      setLoading(false);
    }
  }, [status, paymentStatus, search]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#C75B39]" />
            <h1 className="text-2xl font-bold text-white">Orders</h1>
          </div>
          <p className="mt-1 text-sm text-white/55">
            Read-only view of every order across the platform.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.04] px-3 text-xs font-medium text-white/65 hover:bg-white/[0.08]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {/* Filters */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title…"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-white/25 focus:border-[#C75B39]/40 focus:outline-none"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All statuses"}</option>
            ))}
          </select>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "Any payment"}</option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-[11px] text-white/40">
          {loading ? "Loading…" : `${orders.length} order${orders.length === 1 ? "" : "s"} shown`}
        </p>
      </div>

      {/* Orders */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-sm text-white/55">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center">
          <Package className="mx-auto h-9 w-9 text-white/20" />
          <p className="mt-3 text-sm font-medium text-white/65">No orders match these filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
            >
              <div className="grid gap-3 lg:grid-cols-[1fr_240px_220px_auto]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{o.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        STATUS_COLORS[o.status] || "bg-white/[0.06] text-white/55"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/45 capitalize">{o.garmentType}</p>
                  {o.dueDate && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/40">
                      <Calendar className="h-3 w-3" /> Due {formatDate(o.dueDate)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                    Designer
                  </p>
                  {o.designer ? (
                    <Link
                      href={`/admin/designers/${o.designer.id}`}
                      className="flex items-center gap-1 text-xs font-semibold text-white hover:text-[#C75B39]"
                    >
                      {o.designer.businessName || o.designer.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <p className="text-xs text-white/40">—</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                    Client
                  </p>
                  <p className="text-xs text-white/85">{o.client?.name || "—"}</p>
                  <p className="text-[10px] text-white/40">{o.client?.phone || ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{formatNGN(o.price)}</p>
                  <p className="text-[10px] text-emerald-400">+{formatNGN(o.collected)} paid</p>
                  {o.balance > 0 && (
                    <p className="text-[10px] text-amber-300">{formatNGN(o.balance)} owed</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
