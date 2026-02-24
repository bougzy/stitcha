"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
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
  Plus,
  X,
  Package,
  Trash2,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { cn } from "@/lib/utils";
import {
  getUpcomingEvents,
  getMonthlyInsights,
  type NigerianEvent,
} from "@/lib/owambe-data";

interface CalendarEventData {
  _id: string;
  title: string;
  date: string;
  type: "owambe" | "deadline" | "custom";
  orderId?: { _id: string; title: string; status: string; garmentType?: string };
  notes?: string;
  color?: string;
}

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

const TYPE_STYLES = {
  deadline: { bg: "bg-red-50/60", text: "text-red-600", icon: "🎯" },
  custom: { bg: "bg-blue-50/60", text: "text-blue-600", icon: "📌" },
  owambe: { bg: "bg-[#D4A853]/10", text: "text-[#D4A853]", icon: "🎉" },
};

export default function CalendarPage() {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [customEvents, setCustomEvents] = useState<CalendarEventData[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState<"custom" | "deadline">("custom");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const upcomingEvents = useMemo(() => getUpcomingEvents(8), []);
  const monthlyInsights = useMemo(() => getMonthlyInsights(), []);
  const currentMonth = new Date().getMonth() + 1;

  const fetchEvents = useCallback(async () => {
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const to = new Date(now.getFullYear() + 1, now.getMonth(), 0).toISOString();
      const res = await fetch(`/api/calendar?from=${from}&to=${to}`);
      const json = await res.json();
      if (json.success) {
        setCustomEvents(json.data.events);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function handleAddEvent() {
    if (!newTitle.trim() || !newDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          date: newDate,
          type: newType,
          notes: newNotes.trim() || undefined,
          color: newType === "deadline" ? "#ef4444" : "#3b82f6",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCustomEvents((prev) => [...prev, json.data]);
        setShowAddDialog(false);
        setNewTitle("");
        setNewDate("");
        setNewNotes("");
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent(id: string) {
    try {
      const res = await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setCustomEvents((prev) => prev.filter((e) => e._id !== id));
      }
    } catch {
      // silently fail
    }
  }

  // Sort custom events by date
  const sortedCustomEvents = useMemo(
    () => [...customEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [customEvents]
  );

  // Split into upcoming deadlines and other events
  const now = new Date();
  const upcomingDeadlines = sortedCustomEvents.filter(
    (e) => e.type === "deadline" && new Date(e.date) >= now
  );
  const upcomingCustom = sortedCustomEvents.filter(
    (e) => e.type !== "deadline" && new Date(e.date) >= now
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
        <motion.div variants={itemVariants} className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] lg:text-3xl">
              Owambe Calendar
            </h1>
            <p className="mt-1 text-sm text-[#1A1A2E]/50">
              Nigerian events, order deadlines & custom reminders
            </p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#C75B39] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#b14a2b]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Event
          </button>
        </motion.div>

        {/* Order Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-4.5 w-4.5 text-red-500" />
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                Order Deadlines
              </h2>
              <span className="text-xs text-[#1A1A2E]/35">({upcomingDeadlines.length})</span>
            </div>
            <div className="space-y-2">
              {upcomingDeadlines.map((event) => {
                const daysUntil = Math.ceil((new Date(event.date).getTime() - now.getTime()) / 86400000);
                const isUrgent = daysUntil <= 3;
                return (
                  <div
                    key={event._id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3",
                      isUrgent
                        ? "border-red-200/60 bg-red-50/40"
                        : "border-[#1A1A2E]/5 bg-white/40"
                    )}
                  >
                    <span className="text-lg">🎯</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1A1A2E]">{event.title}</p>
                      {event.orderId && (
                        <p className="text-[10px] text-[#1A1A2E]/40">
                          Order: {event.orderId.title} • {event.orderId.status}
                        </p>
                      )}
                      {event.notes && (
                        <p className="text-[10px] text-[#1A1A2E]/35">{event.notes}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("text-xs font-bold", isUrgent ? "text-red-500" : "text-[#1A1A2E]/50")}>
                        {daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                      </p>
                      <p className="text-[10px] text-[#1A1A2E]/30">
                        {new Date(event.date).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(event._id)}
                      className="shrink-0 rounded-lg p-1.5 text-[#1A1A2E]/20 transition-colors hover:bg-red-50 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Custom Events */}
        {upcomingCustom.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-blue-500" />
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                My Events
              </h2>
            </div>
            <div className="space-y-2">
              {upcomingCustom.map((event) => {
                const style = TYPE_STYLES[event.type];
                return (
                  <div
                    key={event._id}
                    className="flex items-center gap-3 rounded-xl border border-[#1A1A2E]/5 bg-white/40 px-4 py-3"
                  >
                    <span className="text-lg">{style.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1A1A2E]">{event.title}</p>
                      {event.notes && (
                        <p className="text-[10px] text-[#1A1A2E]/35">{event.notes}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-[#1A1A2E]/40">
                      {new Date(event.date).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                    </p>
                    <button
                      onClick={() => handleDeleteEvent(event._id)}
                      className="shrink-0 rounded-lg p-1.5 text-[#1A1A2E]/20 transition-colors hover:bg-red-50 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Next Owambe Event Highlight */}
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

        {/* Upcoming Owambe Events List */}
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-[#C75B39]" />
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              Nigerian Events
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
                  setExpandedEvent(expandedEvent === event.id ? null : event.id)
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
                          className={cn("h-full rounded-full transition-all", config.bar)}
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
                    <span className={cn("w-12 text-right text-[10px] font-bold", config.color)}>
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
                    <span className="text-xs font-medium text-[#1A1A2E]">{e.name}</span>
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

      {/* Add Event Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-[#1A1A2E]/30 backdrop-blur-sm"
            onClick={() => setShowAddDialog(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1A1A2E]">Add Event</h3>
              <button
                onClick={() => setShowAddDialog(false)}
                className="rounded-lg p-1.5 text-[#1A1A2E]/40 hover:bg-[#1A1A2E]/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                {(["custom", "deadline"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewType(type)}
                    className={cn(
                      "flex-1 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors",
                      newType === type
                        ? type === "deadline"
                          ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                          : "bg-blue-50 text-blue-600 ring-1 ring-blue-200"
                        : "bg-[#1A1A2E]/5 text-[#1A1A2E]/40"
                    )}
                  >
                    {type === "deadline" ? "🎯 Deadline" : "📌 Custom Event"}
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#1A1A2E]/60">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={newType === "deadline" ? "e.g. Aso Ebi order due" : "e.g. Fabric shopping"}
                  className="w-full rounded-xl border border-[#1A1A2E]/10 bg-white px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-[#1A1A2E]/25 outline-none focus:border-[#C75B39]/40"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#1A1A2E]/60">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl border border-[#1A1A2E]/10 bg-white px-4 py-2.5 text-sm text-[#1A1A2E] outline-none focus:border-[#C75B39]/40"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#1A1A2E]/60">Notes (optional)</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Any extra details..."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-[#1A1A2E]/10 bg-white px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-[#1A1A2E]/25 outline-none focus:border-[#C75B39]/40"
                />
              </div>

              <button
                onClick={handleAddEvent}
                disabled={!newTitle.trim() || !newDate || saving}
                className="w-full rounded-xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-4 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-40"
              >
                {saving ? "Saving..." : "Add Event"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
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

          <div className="rounded-lg bg-emerald-50/50 px-3 py-2">
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <p className="text-xs text-emerald-700">{event.tip}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-[#1A1A2E]/3 px-3 py-2">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[#1A1A2E]/40" />
            <p className="text-[10px] text-[#1A1A2E]/50">
              Recommended prep time: <strong>{event.prepWeeks} weeks</strong>{" "}
              before the event
              {prepStartsIn <= 0 ? (
                <span className="ml-1 font-bold text-red-500">— Start now!</span>
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
