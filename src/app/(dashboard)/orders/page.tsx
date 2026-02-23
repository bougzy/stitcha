"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Plus, Search, ShoppingBag, Filter } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/common/page-transition";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderCard } from "@/components/orders/order-card";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Filter tabs                                                               */
/* -------------------------------------------------------------------------- */

const STATUS_TABS = [
  { key: "all", label: "All", statuses: "" },
  { key: "pending", label: "Pending", statuses: "pending" },
  {
    key: "in_progress",
    label: "In Progress",
    statuses: "cutting,sewing,fitting,finishing",
  },
  { key: "ready", label: "Ready", statuses: "ready" },
  { key: "delivered", label: "Delivered", statuses: "delivered" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["key"];

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */

function OrderCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-white/40 backdrop-blur-md",
        "shadow-[0_8px_32px_rgba(26,26,46,0.06)]",
        "animate-pulse p-4"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-[#1A1A2E]/8" />
          <div className="h-3 w-24 rounded bg-[#1A1A2E]/6" />
        </div>
        <div className="h-5 w-16 rounded-full bg-[#1A1A2E]/6" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="h-5 w-16 rounded-lg bg-[#1A1A2E]/6" />
        <div className="h-4 w-20 rounded bg-[#1A1A2E]/6" />
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-[#1A1A2E]/6" />
      <div className="mt-2.5 flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-[#1A1A2E]/5" />
        <div className="h-3 w-16 rounded bg-[#1A1A2E]/5" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  /* ---- Fetch orders ---- */
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const tab = STATUS_TABS.find((t) => t.key === statusFilter);
      if (tab && tab.statuses) {
        params.set("status", tab.statuses);
      }

      const res = await fetch(`/api/orders?${params.toString()}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch orders");
      }

      setOrders(json.data.orders);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchOrders, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [fetchOrders, search]);

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Orders</h1>
            <p className="mt-1 text-sm text-[#1A1A2E]/55">
              Track and manage your garment orders
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open("/api/orders/export", "_blank")}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => router.push("/orders/new")} size="lg">
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <Input
          placeholder="Search orders by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search />}
          iconPosition="left"
          className="bg-white/50"
        />

        {/* Filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-white/30 p-1 backdrop-blur-sm scrollbar-hide">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                "whitespace-nowrap",
                statusFilter === tab.key
                  ? "bg-white/80 text-[#1A1A2E] shadow-sm"
                  : "text-[#1A1A2E]/50 hover:text-[#1A1A2E]/70"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Order grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <OrderCardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={search || statusFilter !== "all" ? Filter : ShoppingBag}
            title={
              search
                ? "No orders found"
                : statusFilter !== "all"
                ? "No orders in this category"
                : "No orders yet"
            }
            description={
              search
                ? `No orders match "${search}". Try a different search term.`
                : statusFilter !== "all"
                ? "Orders matching this filter will appear here."
                : "Create your first order to start tracking garments for your clients."
            }
            action={
              !search && statusFilter === "all" ? (
                <Button onClick={() => router.push("/orders/new")}>
                  <Plus className="h-4 w-4" />
                  Create Your First Order
                </Button>
              ) : undefined
            }
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            {orders.map((order, index) => (
              <OrderCard key={order._id} order={order} index={index} />
            ))}
          </motion.div>
        )}

        {/* Order count */}
        {!loading && orders.length > 0 && (
          <p className="text-center text-xs text-[#1A1A2E]/40">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </PageTransition>
  );
}
