"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  TrendingUp,
  Shirt,
  Scissors,
  ChevronRight,
  AlertCircle,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { cn } from "@/lib/utils";
import {
  getUpcomingEvents,
  getMonthlyInsights,
  type NigerianEvent,
  type SeasonalInsight,
} from "@/lib/owambe-data";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
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

const DEMAND_CONFIG = {
  peak: { color: "text-red-500", bg: "bg-red-50/50", bar: "bg-red-500", label: "Peak" },
  high: { color: "text-[#C75B39]", bg: "bg-[#C75B39]/5", bar: "bg-[#C75B39]", label: "High" },
  medium: { color: "text-[#D4A853]", bg: "bg-[#D4A853]/5", bar: "bg-[#D4A853]", label: "Medium" },
  low: { color: "text-[#1A1A2E]/35", bg: "bg-[#1A1A2E]/3", bar: "bg-[#1A1A2E]/15", label: "Low" },
};

const EVENT_DEMAND_CONFIG = {
  extreme: { color: "text-red-500", bg: "bg-red-50/50", label: "Extreme" },
  high: { color: "text-[#C75B39]", bg: "bg-[#C75B39]/5", label: "High" },
  medium: { color: "text-[#D4A853]", bg: "bg-[#D4A853]/5", label: "Medium" },
};

export default function CalendarPage() {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const upcomingEvents = useMemo(() => getUpcomingEvents(8), []);
  const monthlyInsights = useMemo(() => getMonthlyInsights(), []);
  const currentMonth = new Date().getMonth() + 1;

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
            Owambe Calendar
          </h1>
          <p className="mt-1 text-sm text-[#1A1A2E]/50">
            Nigerian events & seasonal demand planner
          </p>
        </motion.div>

        {/* Next Event Highlight */}
        {upcomingEvents.length > 0 && (
          <motion.div variants={itemVariants}>
            <GlassCard gradientBorder padding="lg">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/60">
                  <span className="text-3xl">{upcomingEvents[0].emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C75B39]">
                    Coming Up
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold text-[#1A1A2E]">
                    {upcomingEvents[0].name}
                  </h2>
                  <p className="mt-1 text-xs text-[#1A1A2E]/55">
                    {upcomingEvents[0].description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="flex items-center gap-1 rounded-lg bg-[#C75B39]/8 px-2.5 py-1 text-[10px] font-bold text-[#C75B39]">
                      <Clock className="h-3 w-3" />
                      {upcomingEvents[0].daysUntil} days away
                    </span>
                    {upcomingEvents[0].prepStartsIn <= 0 ? (
                      <span className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-500">
                        <AlertCircle className="h-3 w-3" />
                        Start preparing NOW
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                        <Calendar className="h-3 w-3" />
                        Prep in {upcomingEvents[0].prepStartsIn} days
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Upcoming Events List */}
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-[#C75B39]" />
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              Upcoming Events
            </h2>
          </div>
          <div className="space-y-2.5">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                daysUntil={event.daysUntil}
                prepStartsIn={event.prepStartsIn}
                expanded={expandedEvent === event.id}
                onToggle={() =>
                  setExpandedEvent(
                    expandedEvent === event.id ? null : event.id
                  )
                }
              />
            ))}
          </div>
        </motion.div>

        {/* Demand Forecast — 12 Month View */}
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4.5 w-4.5 text-[#D4A853]" />
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              12-Month Demand Forecast
            </h2>
          </div>
          <GlassCard padding="md">
            <div className="space-y-2">
              {monthlyInsights.map((insight) => {
                const config = DEMAND_CONFIG[insight.demandLevel];
                const isCurrent = insight.month === currentMonth;
                return (
                  <div
                    key={insight.month}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2",
                      isCurrent && "bg-[#C75B39]/5 ring-1 ring-[#C75B39]/15"
                    )}
                  >
                    <span
                      className={cn(
                        "w-8 text-xs font-semibold",
                        isCurrent ? "text-[#C75B39]" : "text-[#1A1A2E]/40"
                      )}
                    >
                      {insight.monthName.slice(0, 3)}
                    </span>
                    <div className="flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-[#1A1A2E]/5">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            config.bar
                          )}
                          style={{
                            width:
                              insight.demandLevel === "peak"
                                ? "100%"
                                : insight.demandLevel === "high"
                                ? "75%"
                                : insight.demandLevel === "medium"
                                ? "50%"
                                : "20%",
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className={cn(
                        "w-12 text-right text-[10px] font-bold",
                        config.color
                      )}
                    >
                      {config.label}
                    </span>
                    {insight.events.length > 0 && (
                      <span className="text-xs">
                        {insight.events.map((e) => e.emoji).join("")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* Monthly Tips */}
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-amber-500" />
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              This Month&apos;s Strategy
            </h2>
          </div>
          <GlassCard padding="md">
            <p className="text-xs leading-relaxed text-[#1A1A2E]/60">
              {monthlyInsights[currentMonth - 1]?.tip}
            </p>
            {monthlyInsights[currentMonth - 1]?.events.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {monthlyInsights[currentMonth - 1].events.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 rounded-lg bg-white/40 px-3 py-2"
                  >
                    <span>{e.emoji}</span>
                    <span className="text-xs font-medium text-[#1A1A2E]">
                      {e.name}
                    </span>
                    <span
                      className={cn(
                        "ml-auto text-[10px] font-bold",
                        EVENT_DEMAND_CONFIG[e.demandLevel].color
                      )}
                    >
                      {EVENT_DEMAND_CONFIG[e.demandLevel].label} demand
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}

function EventCard({
  event,
  daysUntil,
  prepStartsIn,
  expanded,
  onToggle,
}: {
  event: NigerianEvent;
  daysUntil: number;
  prepStartsIn: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const demandConfig = EVENT_DEMAND_CONFIG[event.demandLevel];

  return (
    <GlassCard padding="none" className="overflow-hidden">
      <div
        className="flex cursor-pointer items-center gap-3 p-3"
        onClick={onToggle}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/60">
          <span className="text-xl">{event.emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#1A1A2E]">{event.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-[#1A1A2E]/40">
            <span>{daysUntil} days away</span>
            <span className="text-[#1A1A2E]/15">|</span>
            <span className={demandConfig.color}>
              {demandConfig.label} demand
            </span>
          </div>
        </div>
        {prepStartsIn <= 0 && (
          <span className="shrink-0 rounded-lg bg-red-50 px-2 py-1 text-[9px] font-bold text-red-500">
            PREP NOW
          </span>
        )}
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-[#1A1A2E]/20 transition-transform",
            expanded && "rotate-90"
          )}
        />
      </div>

      {expanded && (
        <div className="border-t border-[#1A1A2E]/5 p-3 space-y-3">
          <p className="text-xs text-[#1A1A2E]/55">{event.description}</p>

          {/* Popular Garments */}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
              <Shirt className="h-3 w-3" />
              Popular Garments
            </p>
            <div className="flex flex-wrap gap-1.5">
              {event.popularGarments.map((g) => (
                <span
                  key={g}
                  className="rounded-md bg-[#C75B39]/8 px-2 py-0.5 text-[10px] font-medium capitalize text-[#C75B39]"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Fabric Trends */}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
              <Scissors className="h-3 w-3" />
              Trending Fabrics
            </p>
            <div className="flex flex-wrap gap-1.5">
              {event.fabricTrends.map((f) => (
                <span
                  key={f}
                  className="rounded-md bg-[#D4A853]/8 px-2 py-0.5 text-[10px] font-medium text-[#D4A853]"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="rounded-lg bg-emerald-50/50 px-3 py-2">
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <p className="text-xs text-emerald-700">{event.tip}</p>
            </div>
          </div>

          {/* Prep Timeline */}
          <div className="flex items-center gap-2 rounded-lg bg-[#1A1A2E]/3 px-3 py-2">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[#1A1A2E]/40" />
            <p className="text-[10px] text-[#1A1A2E]/50">
              Recommended prep time: <strong>{event.prepWeeks} weeks</strong>{" "}
              before the event
              {prepStartsIn <= 0 ? (
                <span className="ml-1 font-bold text-red-500">
                  — Start now!
                </span>
              ) : (
                <span className="ml-1 text-emerald-600">
                  — Prep starts in {prepStartsIn} days
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
