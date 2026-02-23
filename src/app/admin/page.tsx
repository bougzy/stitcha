"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Package,
  DollarSign,
  Crown,
  Zap,
  Star,
  Activity,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AdminStats {
  totalDesigners: number;
  planDistribution: Record<string, number>;
  recentSignups: number;
  totalOrders: number;
  totalRevenue: number;
  totalCollected: number;
  totalActivityLogs: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        const json = await res.json();
        if (json.success) setStats(json.data);
      } catch {
        /* handled by loading state */
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center">
        <p className="text-sm text-white/40">Failed to load admin stats.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <p className="mt-1 text-sm text-white/40">
          Real-time metrics across all Stitcha designers
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            icon: Users,
            label: "Total Designers",
            value: stats.totalDesigners,
            color: "from-blue-500/20 to-blue-600/10",
            iconColor: "text-blue-400",
          },
          {
            icon: UserPlus,
            label: "New (30 days)",
            value: stats.recentSignups,
            color: "from-emerald-500/20 to-emerald-600/10",
            iconColor: "text-emerald-400",
          },
          {
            icon: Package,
            label: "Total Orders",
            value: stats.totalOrders,
            color: "from-amber-500/20 to-amber-600/10",
            iconColor: "text-amber-400",
          },
          {
            icon: DollarSign,
            label: "Platform Revenue",
            value: formatCurrency(stats.totalRevenue),
            color: "from-[#C75B39]/20 to-[#D4A853]/10",
            iconColor: "text-[#D4A853]",
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/5 bg-white/[0.03] p-5"
          >
            <div
              className={cn(
                "mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br",
                stat.color
              )}
            >
              <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="mt-0.5 text-xs text-white/40">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Plan Distribution */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
        <h2 className="mb-4 text-lg font-bold text-white">
          Plan Distribution
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              id: "free",
              name: "Starter",
              icon: Star,
              color: "text-gray-400",
              barColor: "bg-gray-400",
              bg: "bg-gray-500/10",
            },
            {
              id: "pro",
              name: "Professional",
              icon: Zap,
              color: "text-[#C75B39]",
              barColor: "bg-[#C75B39]",
              bg: "bg-[#C75B39]/10",
            },
            {
              id: "business",
              name: "Business",
              icon: Crown,
              color: "text-[#D4A853]",
              barColor: "bg-[#D4A853]",
              bg: "bg-[#D4A853]/10",
            },
          ].map((plan) => {
            const count = stats.planDistribution[plan.id] || 0;
            const pct =
              stats.totalDesigners > 0
                ? Math.round((count / stats.totalDesigners) * 100)
                : 0;

            return (
              <div
                key={plan.id}
                className={cn("rounded-xl border border-white/5 p-4", plan.bg)}
              >
                <div className="flex items-center gap-3">
                  <plan.icon className={cn("h-5 w-5", plan.color)} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white/80">
                      {plan.name}
                    </p>
                    <p className="text-2xl font-bold text-white">{count}</p>
                  </div>
                  <span className="text-sm font-medium text-white/30">
                    {pct}%
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      plan.barColor
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#D4A853]" />
          <h2 className="text-lg font-bold text-white">Revenue Summary</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
            <p className="text-xs font-medium text-emerald-400/70">
              Total Revenue
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4">
            <p className="text-xs font-medium text-blue-400/70">Collected</p>
            <p className="mt-1 text-2xl font-bold text-blue-400">
              {formatCurrency(stats.totalCollected)}
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
            <p className="text-xs font-medium text-amber-400/70">Outstanding</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">
              {formatCurrency(stats.totalRevenue - stats.totalCollected)}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Count */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-white/30" />
          <div>
            <h2 className="text-lg font-bold text-white">Platform Activity</h2>
            <p className="text-sm text-white/40">
              {stats.totalActivityLogs.toLocaleString()} total activity log
              entries across all designers
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
