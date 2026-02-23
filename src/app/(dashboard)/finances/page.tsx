"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Banknote,
  Smartphone,
  PieChart,
  MessageCircle,
  FileText,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { SectionLoader } from "@/components/common/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { whatsapp } from "@/lib/whatsapp";
import { haptics } from "@/lib/haptics";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface FinanceSummary {
  totals: {
    totalRevenue: number;
    totalCollected: number;
    totalOutstanding: number;
    orderCount: number;
    collectionRate: number;
  };
  thisMonth: { revenue: number; collected: number; orders: number };
  monthlyGrowth: number;
  overdue: {
    _id: string;
    title: string;
    price: number;
    depositPaid: number;
    balance: number;
    dueDate: string;
    status: string;
    client?: { name: string; phone: string };
  }[];
  paymentMethods: { _id: string; total: number; count: number }[];
  monthlyTrend: { month: string; revenue: number; collected: number; orders: number }[];
  topDebtors: {
    _id: string;
    clientName: string;
    clientPhone: string;
    totalOwed: number;
    orderCount: number;
  }[];
}

/* -------------------------------------------------------------------------- */
/*  Animation variants                                                         */
/* -------------------------------------------------------------------------- */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

/* -------------------------------------------------------------------------- */
/*  Payment method icon helper                                                 */
/* -------------------------------------------------------------------------- */

function getMethodIcon(method: string) {
  switch (method) {
    case "cash":
      return <Banknote className="h-4 w-4" />;
    case "bank_transfer":
      return <Wallet className="h-4 w-4" />;
    case "card":
      return <CreditCard className="h-4 w-4" />;
    case "mobile_money":
      return <Smartphone className="h-4 w-4" />;
    default:
      return <DollarSign className="h-4 w-4" />;
  }
}

function getMethodLabel(method: string) {
  switch (method) {
    case "cash":
      return "Cash";
    case "bank_transfer":
      return "Bank Transfer";
    case "card":
      return "Card";
    case "mobile_money":
      return "Mobile Money";
    default:
      return "Other";
  }
}

/* -------------------------------------------------------------------------- */
/*  Finances Page                                                              */
/* -------------------------------------------------------------------------- */

export default function FinancesPage() {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/finances/summary");
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load financial data");
          return;
        }
        setData(json.data);
      } catch {
        setError("Failed to load financial data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function handleWhatsAppChase(clientName: string, clientPhone: string, orderTitle: string, balance: number) {
    haptics.medium();
    const url = whatsapp.paymentReminder(clientPhone, clientName, orderTitle, balance);
    window.open(url, "_blank");
  }

  if (loading) {
    return (
      <PageTransition>
        <SectionLoader />
      </PageTransition>
    );
  }

  if (error || !data) {
    return (
      <PageTransition>
        <EmptyState
          icon={DollarSign}
          title="Unable to load finances"
          description={error || "Something went wrong"}
          action={
            <Button size="sm" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          }
        />
      </PageTransition>
    );
  }

  const overdueTotal = data.overdue.reduce((sum, o) => sum + o.balance, 0);

  return (
    <PageTransition>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 lg:space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] lg:text-3xl">
              Finances
            </h1>
            <p className="mt-1 text-sm text-[#1A1A2E]/50">
              Track your revenue, payments, and outstanding balances
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            icon={DollarSign}
            label="Total Revenue"
            value={formatCurrency(data.totals.totalRevenue)}
          />
          <StatCard
            icon={Wallet}
            label="Collected"
            value={formatCurrency(data.totals.totalCollected)}
          />
          <StatCard
            icon={AlertTriangle}
            label="Outstanding"
            value={formatCurrency(data.totals.totalOutstanding)}
          />
          <StatCard
            icon={PieChart}
            label="Collection Rate"
            value={`${data.totals.collectionRate}%`}
          />
        </motion.div>

        {/* This Month Performance */}
        <motion.div variants={itemVariants}>
          <GlassCard padding="lg" className="bg-gradient-to-r from-[#C75B39]/[0.04] to-[#D4A853]/[0.04]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1A1A2E]/35">
                  This Month
                </p>
                <p className="mt-1 text-2xl font-bold text-[#1A1A2E]">
                  {formatCurrency(data.thisMonth.revenue)}
                </p>
                <p className="mt-0.5 text-xs text-[#1A1A2E]/50">
                  {data.thisMonth.orders} order{data.thisMonth.orders !== 1 ? "s" : ""} &middot;{" "}
                  {formatCurrency(data.thisMonth.collected)} collected
                </p>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                  data.monthlyGrowth >= 0
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                )}
              >
                {data.monthlyGrowth >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {Math.abs(data.monthlyGrowth)}% vs last month
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Overdue Orders */}
          <motion.div variants={itemVariants}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">
                  Overdue ({data.overdue.length})
                </h2>
              </div>
              {overdueTotal > 0 && (
                <Badge variant="destructive">{formatCurrency(overdueTotal)}</Badge>
              )}
            </div>

            {data.overdue.length === 0 ? (
              <GlassCard padding="lg">
                <div className="py-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-[#1A1A2E]">All caught up!</p>
                  <p className="mt-1 text-xs text-[#1A1A2E]/45">No overdue payments</p>
                </div>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {data.overdue.map((order) => (
                  <GlassCard key={order._id} padding="sm" className="border-red-100/60">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1A1A2E]">
                          {order.title}
                        </p>
                        <p className="text-xs text-[#1A1A2E]/45">
                          {order.client?.name || "Unknown"} &middot;{" "}
                          Due {new Date(order.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-red-600">
                          {formatCurrency(order.balance)}
                        </span>
                        {order.client?.phone && (
                          <button
                            onClick={() =>
                              handleWhatsAppChase(
                                order.client!.name,
                                order.client!.phone,
                                order.title,
                                order.balance
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#25D366] transition-colors hover:bg-[#25D366]/20"
                            title="Send WhatsApp reminder"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <Link href={`/orders/${order._id}`}>
                          <ChevronRight className="h-4 w-4 text-[#1A1A2E]/25" />
                        </Link>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>

          {/* Top Debtors */}
          <motion.div variants={itemVariants}>
            <div className="mb-3 flex items-center gap-2">
              <DollarSign className="h-4.5 w-4.5 text-amber-500" />
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                Outstanding Balances
              </h2>
            </div>

            {data.topDebtors.length === 0 ? (
              <GlassCard padding="lg">
                <div className="py-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <Wallet className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-[#1A1A2E]">No outstanding balances</p>
                  <p className="mt-1 text-xs text-[#1A1A2E]/45">All clients are paid up</p>
                </div>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {data.topDebtors.map((debtor) => (
                  <GlassCard key={debtor._id} padding="sm">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1A1A2E]">
                          {debtor.clientName || "Unknown Client"}
                        </p>
                        <p className="text-xs text-[#1A1A2E]/45">
                          {debtor.orderCount} order{debtor.orderCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-amber-600">
                          {formatCurrency(debtor.totalOwed)}
                        </span>
                        {debtor.clientPhone && (
                          <button
                            onClick={() => {
                              haptics.medium();
                              const url = whatsapp.paymentReminder(
                                debtor.clientPhone,
                                debtor.clientName,
                                `${debtor.orderCount} order${debtor.orderCount !== 1 ? "s" : ""}`,
                                debtor.totalOwed
                              );
                              window.open(url, "_blank");
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#25D366] transition-colors hover:bg-[#25D366]/20"
                            title="Send WhatsApp reminder"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Payment Methods Breakdown */}
        {data.paymentMethods.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4.5 w-4.5 text-[#C75B39]" />
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                Payment Methods
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data.paymentMethods.map((method) => {
                const pct =
                  data.totals.totalCollected > 0
                    ? Math.round((method.total / data.totals.totalCollected) * 100)
                    : 0;
                return (
                  <GlassCard key={method._id} padding="sm">
                    <div className="flex items-center gap-2 text-[#1A1A2E]/50">
                      {getMethodIcon(method._id)}
                      <span className="text-[10px] font-semibold uppercase tracking-wider">
                        {getMethodLabel(method._id)}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-[#1A1A2E]">
                      {formatCurrency(method.total)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1A1A2E]/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#C75B39] to-[#D4A853]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-[#1A1A2E]/40">
                        {pct}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#1A1A2E]/35">
                      {method.count} payment{method.count !== 1 ? "s" : ""}
                    </p>
                  </GlassCard>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Monthly Trend */}
        {data.monthlyTrend.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-[#D4A853]" />
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                Monthly Trend
              </h2>
            </div>
            <GlassCard padding="lg">
              <div className="space-y-3">
                {data.monthlyTrend.map((month) => {
                  const pct =
                    month.revenue > 0
                      ? Math.round((month.collected / month.revenue) * 100)
                      : 0;
                  const monthLabel = new Date(month.month + "-01").toLocaleDateString("en-NG", {
                    month: "short",
                    year: "numeric",
                  });
                  return (
                    <div key={month.month} className="flex items-center gap-4">
                      <span className="w-16 text-xs font-medium text-[#1A1A2E]/50">
                        {monthLabel}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1A1A2E]/5">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#C75B39] to-[#D4A853]"
                              style={{
                                width: `${
                                  data.totals.totalRevenue > 0
                                    ? Math.round((month.revenue / (data.monthlyTrend.reduce((max, m) => Math.max(max, m.revenue), 0) || 1)) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="w-20 text-right text-xs font-semibold text-[#1A1A2E]">
                            {formatCurrency(month.revenue)}
                          </span>
                        </div>
                      </div>
                      <Badge variant={pct >= 80 ? "success" : pct >= 50 ? "warning" : "outline"}>
                        {pct}% collected
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <div className="flex flex-wrap gap-2">
            <Link href="/orders?paymentStatus=unpaid">
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Unpaid Orders
              </Button>
            </Link>
            <Link href="/orders?paymentStatus=partial">
              <Button variant="outline" size="sm" className="gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Partial Payments
              </Button>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
