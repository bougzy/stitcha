"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Star,
  Zap,
  Target,
  ChevronRight,
  Lock,
  Award,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { SectionLoader } from "@/components/common/loading";
import { cn } from "@/lib/utils";

interface RankData {
  xp: number;
  tier: {
    name: string;
    title: string;
    icon: string;
    color: string;
  };
  nextTier: {
    title: string;
    icon: string;
    xpNeeded: number;
  } | null;
  progress: number;
  stats: {
    totalOrders: number;
    deliveredOrders: number;
    totalClients: number;
    onTimeRate: number;
    deliveredThisMonth: number;
    deliveredLastMonth: number;
    monthsActive: number;
    avgOrdersPerMonth: number;
  };
  achievements: {
    label: string;
    icon: string;
    earned: boolean;
  }[];
  xpBreakdown: Record<string, number>;
}

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

const XP_LABELS: Record<string, string> = {
  orders: "Creating Orders",
  deliveries: "Completing Deliveries",
  payments: "Collecting Payments",
  clients: "Adding Clients",
  measurements: "Taking Measurements",
  onTime: "On-Time Deliveries",
  portfolio: "Portfolio Photos",
};

export default function RankPage() {
  const [data, setData] = useState<RankData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRank() {
      try {
        const res = await fetch("/api/designer/rank");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchRank();
  }, []);

  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <SectionLoader lines={3} />
          <SectionLoader lines={4} />
        </div>
      </PageTransition>
    );
  }

  if (!data) return null;

  const totalXPFromBreakdown = Object.values(data.xpBreakdown).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <PageTransition>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 lg:space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] lg:text-3xl">
            Designer Rank
          </h1>
          <p className="mt-1 text-sm text-[#1A1A2E]/50">
            Level up your craft and earn recognition
          </p>
        </motion.div>

        {/* Tier Card */}
        <motion.div variants={itemVariants}>
          <GlassCard gradientBorder padding="lg">
            <div className="text-center">
              {/* Tier Icon */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-white/80 to-white/40 shadow-lg">
                <span className="text-4xl">{data.tier.icon}</span>
              </div>

              {/* Tier Title */}
              <h2
                className="mt-4 text-2xl font-bold"
                style={{ color: data.tier.color }}
              >
                {data.tier.title}
              </h2>

              {/* XP */}
              <div className="mt-2 flex items-center justify-center gap-2">
                <Zap className="h-4 w-4 text-[#D4A853]" />
                <span className="text-lg font-bold text-[#1A1A2E]">
                  {data.xp.toLocaleString()} XP
                </span>
              </div>

              {/* Progress to Next Tier */}
              {data.nextTier && (
                <div className="mx-auto mt-4 max-w-sm">
                  <div className="flex items-center justify-between text-xs text-[#1A1A2E]/50">
                    <span>{data.tier.icon} {data.tier.title}</span>
                    <span>{data.nextTier.icon} {data.nextTier.title}</span>
                  </div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-[#1A1A2E]/8">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: data.tier.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${data.progress}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-[#1A1A2E]/40">
                    {data.nextTier.xpNeeded.toLocaleString()} XP to{" "}
                    {data.nextTier.title}
                  </p>
                </div>
              )}

              {!data.nextTier && (
                <p className="mt-3 text-sm text-emerald-600 font-medium">
                  Maximum rank achieved!
                </p>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4.5 w-4.5 text-[#C75B39]" />
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              Your Stats
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Orders", value: data.stats.totalOrders, icon: "📦" },
              { label: "Delivered", value: data.stats.deliveredOrders, icon: "✅" },
              { label: "Clients", value: data.stats.totalClients, icon: "👥" },
              { label: "On-Time Rate", value: `${data.stats.onTimeRate}%`, icon: "⏰" },
              { label: "This Month", value: data.stats.deliveredThisMonth, icon: "📈" },
              { label: "Last Month", value: data.stats.deliveredLastMonth, icon: "📊" },
              { label: "Months Active", value: data.stats.monthsActive, icon: "📅" },
              { label: "Avg/Month", value: data.stats.avgOrdersPerMonth, icon: "⚡" },
            ].map(({ label, value, icon }) => (
              <GlassCard key={label} padding="sm">
                <div className="text-center">
                  <span className="text-lg">{icon}</span>
                  <p className="mt-1 text-xl font-bold text-[#1A1A2E]">
                    {value}
                  </p>
                  <p className="text-[10px] text-[#1A1A2E]/40">{label}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>

        {/* XP Breakdown */}
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4.5 w-4.5 text-[#D4A853]" />
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              XP Breakdown
            </h2>
          </div>
          <GlassCard padding="md">
            <div className="space-y-3">
              {Object.entries(data.xpBreakdown)
                .filter(([, val]) => val > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([key, val]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#1A1A2E]/60">
                        {XP_LABELS[key] || key}
                      </span>
                      <span className="font-semibold text-[#1A1A2E]">
                        +{val} XP
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#1A1A2E]/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#C75B39] to-[#D4A853]"
                        style={{
                          width: `${
                            totalXPFromBreakdown > 0
                              ? (val / totalXPFromBreakdown) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Achievements */}
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4.5 w-4.5 text-[#D4A853]" />
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              Achievements
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {data.achievements.map((a, i) => (
              <GlassCard
                key={i}
                padding="sm"
                className={cn(!a.earned && "opacity-40")}
              >
                <div className="text-center">
                  <div
                    className={cn(
                      "mx-auto flex h-12 w-12 items-center justify-center rounded-xl",
                      a.earned
                        ? "bg-gradient-to-br from-[#D4A853]/15 to-[#C75B39]/10"
                        : "bg-[#1A1A2E]/5"
                    )}
                  >
                    {a.earned ? (
                      <span className="text-xl">{a.icon}</span>
                    ) : (
                      <Lock className="h-4 w-4 text-[#1A1A2E]/25" />
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-[10px] font-medium",
                      a.earned ? "text-[#1A1A2E]" : "text-[#1A1A2E]/40"
                    )}
                  >
                    {a.label}
                  </p>
                  {a.earned && (
                    <Award className="mx-auto mt-1 h-3 w-3 text-[#D4A853]" />
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>

        {/* How to Earn XP */}
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4.5 w-4.5 text-amber-500" />
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              How to Earn XP
            </h2>
          </div>
          <GlassCard padding="md">
            <div className="space-y-2">
              {[
                { action: "Create an order", xp: 10 },
                { action: "Deliver an order", xp: 50 },
                { action: "Collect full payment", xp: 30 },
                { action: "On-time delivery", xp: 25 },
                { action: "Add a new client", xp: 20 },
                { action: "Take measurements", xp: 15 },
                { action: "Add portfolio photo", xp: 5 },
                { action: "5+ deliveries in a month", xp: 100 },
              ].map(({ action, xp }) => (
                <div
                  key={action}
                  className="flex items-center justify-between rounded-lg bg-white/40 px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-xs text-[#1A1A2E]/60">
                    <ChevronRight className="h-3 w-3" />
                    {action}
                  </span>
                  <span className="text-xs font-bold text-[#D4A853]">
                    +{xp} XP
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
