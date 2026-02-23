"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import {
  Users,
  ShoppingBag,
  DollarSign,
  ScanLine,
  Plus,
  ClipboardList,
  LinkIcon,
  Phone,
  Calendar,
  ChevronRight,
  UserPlus,
  Package,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { PageTransition } from "@/components/common/page-transition";
import { StatCard } from "@/components/common/stat-card";
import { GlassCard } from "@/components/common/glass-card";
import { EmptyState } from "@/components/common/empty-state";
import { SectionLoader } from "@/components/common/loading";
import { DashboardSkeleton } from "@/components/common/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatPhone, getInitials } from "@/lib/utils";
import type { DashboardStats } from "@/types";

const RevenueChart = dynamic(() => import("@/components/dashboard/revenue-chart"), { ssr: false });
const GarmentChart = dynamic(() => import("@/components/dashboard/garment-chart"), { ssr: false });
const DailyPulse = dynamic(() => import("@/components/dashboard/daily-pulse"), { ssr: false });
const StitchaScore = dynamic(() => import("@/components/dashboard/stitcha-score"), { ssr: false });
const RankBadge = dynamic(() => import("@/components/dashboard/rank-badge"), { ssr: false });

/* -------------------------------------------------------------------------- */
/*  Animation variants                                                         */
/* -------------------------------------------------------------------------- */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
};

/* -------------------------------------------------------------------------- */
/*  Status badge variant mapping                                               */
/* -------------------------------------------------------------------------- */

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "pending":
      return "warning";
    case "confirmed":
    case "cutting":
    case "sewing":
    case "fitting":
    case "finishing":
      return "secondary";
    case "ready":
    case "delivered":
      return "success";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function capitalizeStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/* -------------------------------------------------------------------------- */
/*  Dashboard Page                                                             */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<{
    id: string;
    type: string;
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    actionUrl: string;
    actionLabel: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, alertsRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/alerts"),
        ]);
        const statsJson = await statsRes.json();
        const alertsJson = await alertsRes.json();

        if (!statsJson.success) {
          setError(statsJson.error || "Failed to load dashboard data");
          return;
        }

        setStats(statsJson.data);
        if (alertsJson.success) {
          setAlerts(alertsJson.data);
        }
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const designerName = session?.user?.name?.split(" ")[0] || "Designer";

  return (
    <PageTransition>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 lg:space-y-8"
      >
        {/* ---- Header / Greeting ---- */}
        <motion.div variants={itemVariants} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] lg:text-3xl">
              {greeting()}, {designerName}
            </h1>
            <p className="mt-1 text-sm text-[#1A1A2E]/50">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>

          {/* Quick actions - desktop */}
          <div className="mt-3 flex gap-2 sm:mt-0">
            <Link href="/clients/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add Client</span>
                <span className="sm:hidden">Client</span>
              </Button>
            </Link>
            <Link href="/orders/new">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Order</span>
                <span className="sm:hidden">Order</span>
              </Button>
            </Link>
            <Link href="/scan">
              <Button variant="glass" size="sm" className="gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Scan Link</span>
                <span className="sm:hidden">Scan</span>
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* ---- Loading State — content-shaped skeletons ---- */}
        {loading && <DashboardSkeleton />}

        {/* ---- Error State ---- */}
        {error && !loading && (
          <GlassCard padding="lg">
            <div className="text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  window.location.reload();
                }}
              >
                Try Again
              </Button>
            </div>
          </GlassCard>
        )}

        {/* ---- Daily Pulse + Score + Rank ---- */}
        {!loading && !error && (
          <motion.div variants={itemVariants} className="space-y-3">
            <DailyPulse />
            <div className="grid gap-3 lg:grid-cols-2">
              <StitchaScore />
              <RankBadge />
            </div>
          </motion.div>
        )}

        {/* ---- Smart Alerts ---- */}
        {alerts.length > 0 && !loading && (
          <motion.div variants={itemVariants} className="space-y-2">
            {alerts.slice(0, 4).map((alert) => (
              <Link key={alert.id} href={alert.actionUrl}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:shadow-sm",
                    alert.severity === "critical"
                      ? "border-red-200/60 bg-red-50/50"
                      : alert.severity === "warning"
                      ? "border-amber-200/60 bg-amber-50/50"
                      : "border-[#1A1A2E]/6 bg-white/50"
                  )}
                >
                  <AlertCircle
                    className={cn(
                      "h-4 w-4 shrink-0",
                      alert.severity === "critical"
                        ? "text-red-500"
                        : alert.severity === "warning"
                        ? "text-amber-500"
                        : "text-[#1A1A2E]/30"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#1A1A2E]">
                      {alert.title}
                    </p>
                    <p className="text-[10px] text-[#1A1A2E]/45">
                      {alert.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-[#C75B39]">
                    {alert.actionLabel} &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </motion.div>
        )}

        {/* ---- Stats Grid ---- */}
        {stats && !loading && (
          <>
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
            >
              <StatCard
                icon={Users}
                label="Total Clients"
                value={stats.totalClients}
              />
              <StatCard
                icon={ShoppingBag}
                label="Active Orders"
                value={stats.activeOrders}
              />
              <StatCard
                icon={DollarSign}
                label="Revenue This Month"
                value={formatCurrency(stats.revenue)}
              />
              <StatCard
                icon={ScanLine}
                label="Scans This Month"
                value={stats.scansThisMonth ?? 0}
              />
            </motion.div>

            {/* ---- Receivables Alert ---- */}
            {(stats.receivables ?? 0) > 0 && (
              <motion.div variants={itemVariants}>
                <GlassCard padding="md" className="border-[#C75B39]/15 bg-gradient-to-r from-[#C75B39]/[0.04] to-[#D4A853]/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C75B39]/10">
                      <AlertCircle className="h-5 w-5 text-[#C75B39]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1A1A2E]">
                        Outstanding Receivables
                      </p>
                      <p className="text-xs text-[#1A1A2E]/50">
                        You have {formatCurrency(stats.receivables ?? 0)} in unpaid balances across active orders
                      </p>
                    </div>
                    <Link href="/orders?status=cutting,sewing,fitting,finishing,ready">
                      <Button size="sm" variant="outline" className="shrink-0">
                        View
                      </Button>
                    </Link>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* ---- Analytics Charts ---- */}
            {((stats.revenueTrend && stats.revenueTrend.length > 0) ||
              (stats.garments && stats.garments.length > 0)) && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Revenue Trend */}
                {stats.revenueTrend && stats.revenueTrend.length > 0 && (
                  <motion.div variants={itemVariants}>
                    <div className="mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4.5 w-4.5 text-[#D4A853]" />
                      <h2 className="text-lg font-semibold text-[#1A1A2E]">
                        Revenue Trend
                      </h2>
                    </div>
                    <GlassCard padding="lg">
                      <RevenueChart data={stats.revenueTrend} />
                    </GlassCard>
                  </motion.div>
                )}

                {/* Garment Breakdown */}
                {stats.garments && stats.garments.length > 0 && (
                  <motion.div variants={itemVariants}>
                    <div className="mb-3 flex items-center gap-2">
                      <ShoppingBag className="h-4.5 w-4.5 text-[#C75B39]" />
                      <h2 className="text-lg font-semibold text-[#1A1A2E]">
                        Popular Garments
                      </h2>
                    </div>
                    <GlassCard padding="lg">
                      <GarmentChart data={stats.garments} />
                    </GlassCard>
                  </motion.div>
                )}
              </div>
            )}

            {/* ---- Payment Overview ---- */}
            {stats.paymentBreakdown && Object.keys(stats.paymentBreakdown).length > 0 && (
              <motion.div variants={itemVariants}>
                <div className="mb-3 flex items-center gap-2">
                  <DollarSign className="h-4.5 w-4.5 text-emerald-600" />
                  <h2 className="text-lg font-semibold text-[#1A1A2E]">
                    Payment Overview
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { key: "paid", label: "Paid", color: "emerald" },
                    { key: "partial", label: "Partial", color: "amber" },
                    { key: "unpaid", label: "Unpaid", color: "gray" },
                    { key: "overdue", label: "Overdue", color: "red" },
                  ].map(({ key, label, color }) => {
                    const data = stats.paymentBreakdown?.[key];
                    return (
                      <GlassCard key={key} padding="sm">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1A1A2E]/35">
                          {label}
                        </p>
                        <p className={`mt-1 text-xl font-bold text-${color}-600`}>
                          {data?.count || 0}
                        </p>
                        <p className="text-[10px] text-[#1A1A2E]/40">
                          {formatCurrency(data?.total || 0)}
                        </p>
                      </GlassCard>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ---- Recent Data Grid ---- */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Clients */}
              <motion.div variants={itemVariants}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#1A1A2E]">
                    Recent Clients
                  </h2>
                  <Link
                    href="/clients"
                    className="flex items-center gap-1 text-xs font-medium text-[#C75B39] transition-colors hover:text-[#933a22]"
                  >
                    View all
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {stats.recentClients.length === 0 ? (
                  <EmptyState
                    icon={UserPlus}
                    title="No clients yet"
                    description="Add your first client to start managing measurements and orders."
                    action={
                      <Link href="/clients/new">
                        <Button size="sm" className="gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          Add First Client
                        </Button>
                      </Link>
                    }
                  />
                ) : (
                  <div className="space-y-2.5">
                    {stats.recentClients.map((client, index) => (
                      <motion.div
                        key={client._id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.3 + index * 0.06,
                          duration: 0.35,
                          ease: [0.25, 0.1, 0.25, 1],
                        }}
                      >
                        <Link href={`/clients/${client._id}`}>
                          <GlassCard hover padding="sm" className="cursor-pointer">
                            <div className="flex items-center gap-3">
                              {/* Avatar */}
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C75B39]/15 to-[#D4A853]/15">
                                <span className="text-sm font-semibold text-[#C75B39]">
                                  {getInitials(client.name)}
                                </span>
                              </div>

                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[#1A1A2E]">
                                  {client.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-[#1A1A2E]/45">
                                  <Phone className="h-3 w-3" />
                                  <span>{formatPhone(client.phone)}</span>
                                </div>
                              </div>

                              {/* Last measured */}
                              {client.lastMeasuredAt && (
                                <div className="hidden items-center gap-1 text-xs text-[#1A1A2E]/40 sm:flex">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {format(new Date(client.lastMeasuredAt), "MMM d")}
                                  </span>
                                </div>
                              )}

                              <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#1A1A2E]/25" />
                            </div>
                          </GlassCard>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Recent Orders */}
              <motion.div variants={itemVariants}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#1A1A2E]">
                    Recent Orders
                  </h2>
                  <Link
                    href="/orders"
                    className="flex items-center gap-1 text-xs font-medium text-[#C75B39] transition-colors hover:text-[#933a22]"
                  >
                    View all
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {stats.recentOrders.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No orders yet"
                    description="Create your first order to start tracking garments and deliveries."
                    action={
                      <Link href="/orders/new">
                        <Button size="sm" className="gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          Create First Order
                        </Button>
                      </Link>
                    }
                  />
                ) : (
                  <div className="space-y-2.5">
                    {stats.recentOrders.map((order, index) => (
                      <motion.div
                        key={order._id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.3 + index * 0.06,
                          duration: 0.35,
                          ease: [0.25, 0.1, 0.25, 1],
                        }}
                      >
                        <Link href={`/orders/${order._id}`}>
                          <GlassCard hover padding="sm" className="cursor-pointer">
                            <div className="flex items-center gap-3">
                              {/* Icon */}
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A853]/15 to-[#C75B39]/10">
                                <ShoppingBag className="h-4.5 w-4.5 text-[#D4A853]" strokeWidth={1.5} />
                              </div>

                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[#1A1A2E]">
                                  {order.title}
                                </p>
                                <p className="truncate text-xs text-[#1A1A2E]/45">
                                  {order.client?.name || "Unknown client"}
                                </p>
                              </div>

                              {/* Status & Price */}
                              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                                <Badge variant={getStatusBadgeVariant(order.status)}>
                                  {capitalizeStatus(order.status)}
                                </Badge>
                                <span className="text-xs font-medium text-[#1A1A2E]/60">
                                  {formatCurrency(order.price)}
                                </span>
                              </div>
                            </div>
                          </GlassCard>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* ---- Mobile Quick Actions ---- */}
            <motion.div
              variants={itemVariants}
              className="sm:hidden"
            >
              <h2 className="mb-3 text-lg font-semibold text-[#1A1A2E]">
                Quick Actions
              </h2>
              <div className="grid grid-cols-3 gap-2.5">
                <Link href="/clients/new">
                  <GlassCard hover padding="sm" className="text-center">
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
                        <UserPlus className="h-5 w-5 text-[#C75B39]" strokeWidth={1.5} />
                      </div>
                      <span className="text-xs font-medium text-[#1A1A2E]/70">
                        Add Client
                      </span>
                    </div>
                  </GlassCard>
                </Link>
                <Link href="/orders/new">
                  <GlassCard hover padding="sm" className="text-center">
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A853]/10 to-[#C75B39]/10">
                        <ClipboardList className="h-5 w-5 text-[#D4A853]" strokeWidth={1.5} />
                      </div>
                      <span className="text-xs font-medium text-[#1A1A2E]/70">
                        New Order
                      </span>
                    </div>
                  </GlassCard>
                </Link>
                <Link href="/scan">
                  <GlassCard hover padding="sm" className="text-center">
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
                        <ScanLine className="h-5 w-5 text-[#C75B39]" strokeWidth={1.5} />
                      </div>
                      <span className="text-xs font-medium text-[#1A1A2E]/70">
                        Scan Link
                      </span>
                    </div>
                  </GlassCard>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </PageTransition>
  );
}
