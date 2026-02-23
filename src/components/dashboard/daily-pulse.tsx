"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  Sunrise,
  TrendingUp,
  Clock,
  AlertTriangle,
  Trophy,
  Lightbulb,
  Quote,
  DollarSign,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/common/glass-card";
import { cn, formatCurrency } from "@/lib/utils";

interface PulseData {
  mood: "great" | "good" | "caution" | "alert";
  nudge: string;
  money: {
    revenueThisMonth: number;
    collectedThisMonth: number;
    outstanding: number;
    unpaidOrders: number;
  };
  deadlines: {
    id: string;
    title: string;
    status: string;
    daysLeft: number;
    dueDate: string;
  }[];
  overdueCount: number;
  activeOrders: number;
  wins: string[];
  proverb: string;
  tip: string;
}

const MOOD_CONFIG = {
  great: { gradient: "from-emerald-500/10 to-[#D4A853]/10", border: "border-emerald-200/40", emoji: "🌟" },
  good: { gradient: "from-[#D4A853]/10 to-[#C75B39]/5", border: "border-[#D4A853]/20", emoji: "☀️" },
  caution: { gradient: "from-amber-500/10 to-[#C75B39]/10", border: "border-amber-200/40", emoji: "⚡" },
  alert: { gradient: "from-red-500/10 to-amber-500/10", border: "border-red-200/40", emoji: "🔥" },
};

function getTimeIcon() {
  const hour = new Date().getHours();
  if (hour < 6) return Moon;
  if (hour < 12) return Sunrise;
  if (hour < 18) return Sun;
  return Moon;
}

export function DailyPulse() {
  const [data, setData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchPulse() {
      try {
        const res = await fetch("/api/dashboard/pulse");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch {
        // Pulse is supplementary
      } finally {
        setLoading(false);
      }
    }
    fetchPulse();
  }, []);

  if (loading) {
    return (
      <div className="h-32 animate-pulse rounded-2xl bg-gradient-to-r from-[#D4A853]/5 to-[#C75B39]/5" />
    );
  }

  if (!data) return null;

  const moodConfig = MOOD_CONFIG[data.mood];
  const TimeIcon = getTimeIcon();

  return (
    <div className="space-y-3">
      {/* Main Pulse Card */}
      <GlassCard
        padding="none"
        className={cn(
          "overflow-hidden border",
          moodConfig.border
        )}
      >
        <div className={cn("bg-gradient-to-r p-4", moodConfig.gradient)}>
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm">
              <TimeIcon className="h-5 w-5 text-[#D4A853]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1A1A2E]">
                  Daily Pulse
                </h3>
                <span className="text-base">{moodConfig.emoji}</span>
              </div>
              <p className="mt-0.5 text-xs text-[#1A1A2E]/60">
                {data.nudge}
              </p>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 rounded-lg p-1.5 text-[#1A1A2E]/40 transition-colors hover:bg-white/40 hover:text-[#1A1A2E]"
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  expanded && "rotate-90"
                )}
              />
            </button>
          </div>

          {/* Quick Stats Row */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/50 px-2.5 py-2 text-center backdrop-blur-sm">
              <DollarSign className="mx-auto h-3.5 w-3.5 text-[#D4A853]" />
              <p className="mt-0.5 text-xs font-bold text-[#1A1A2E]">
                {formatCurrency(data.money.revenueThisMonth)}
              </p>
              <p className="text-[9px] text-[#1A1A2E]/40">This Month</p>
            </div>
            <div className="rounded-xl bg-white/50 px-2.5 py-2 text-center backdrop-blur-sm">
              <Clock className="mx-auto h-3.5 w-3.5 text-[#C75B39]" />
              <p className="mt-0.5 text-xs font-bold text-[#1A1A2E]">
                {data.activeOrders}
              </p>
              <p className="text-[9px] text-[#1A1A2E]/40">Active Orders</p>
            </div>
            <div className="rounded-xl bg-white/50 px-2.5 py-2 text-center backdrop-blur-sm">
              <TrendingUp className="mx-auto h-3.5 w-3.5 text-emerald-500" />
              <p className="mt-0.5 text-xs font-bold text-[#1A1A2E]">
                {formatCurrency(data.money.collectedThisMonth)}
              </p>
              <p className="text-[9px] text-[#1A1A2E]/40">Collected</p>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="space-y-3 border-t border-[#1A1A2E]/5 p-4">
            {/* Outstanding Alert */}
            {data.money.outstanding > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-[#C75B39]/5 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-[#C75B39]" />
                <span className="text-xs text-[#C75B39]">
                  {formatCurrency(data.money.outstanding)} outstanding across{" "}
                  {data.money.unpaidOrders} order
                  {data.money.unpaidOrders !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Deadlines */}
            {data.deadlines.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
                  <Clock className="h-3 w-3" />
                  Upcoming Deadlines
                </p>
                <div className="space-y-1.5">
                  {data.deadlines.map((d) => (
                    <Link key={d.id} href={`/orders/${d.id}`}>
                      <div className="flex items-center justify-between rounded-lg bg-white/50 px-3 py-2 transition-colors hover:bg-white/70">
                        <span className="truncate text-xs font-medium text-[#1A1A2E]">
                          {d.title}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[10px] font-bold",
                            d.daysLeft <= 1 ? "text-red-500" : "text-amber-500"
                          )}
                        >
                          {d.daysLeft === 0
                            ? "Today!"
                            : d.daysLeft === 1
                            ? "Tomorrow"
                            : `${d.daysLeft} days`}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Wins */}
            {data.wins.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
                  <Trophy className="h-3 w-3" />
                  Wins
                </p>
                <div className="space-y-1">
                  {data.wins.map((win, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-emerald-50/50 px-3 py-2"
                    >
                      <Sparkles className="h-3 w-3 shrink-0 text-emerald-500" />
                      <span className="text-xs text-emerald-700">{win}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Tip */}
            <div className="rounded-lg bg-[#D4A853]/5 px-3 py-2">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4A853]" />
                <p className="text-xs text-[#1A1A2E]/70">{data.tip}</p>
              </div>
            </div>

            {/* Proverb */}
            <div className="rounded-lg bg-[#1A1A2E]/3 px-3 py-2">
              <div className="flex items-start gap-2">
                <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1A1A2E]/30" />
                <p className="text-[11px] italic text-[#1A1A2E]/50">
                  {data.proverb}
                </p>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default DailyPulse;
