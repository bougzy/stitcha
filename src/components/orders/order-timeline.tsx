"use client";

import { ORDER_STATUSES } from "@/lib/constants";
import type { StatusHistoryEntry } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

interface OrderTimelineProps {
  history: StatusHistoryEntry[];
  currentStatus: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getStatusLabel(status: string) {
  return ORDER_STATUSES.find((s) => s.value === status)?.label || status;
}

function getStatusColor(status: string) {
  const s = ORDER_STATUSES.find((st) => st.value === status);
  switch (s?.color) {
    case "gold":
      return "bg-[#D4A853]";
    case "info":
      return "bg-blue-500";
    case "terracotta":
      return "bg-[#C75B39]";
    case "success":
      return "bg-emerald-500";
    case "destructive":
      return "bg-red-500";
    default:
      return "bg-[#1A1A2E]/30";
  }
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDateTime(date);
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function OrderTimeline({ history, currentStatus }: OrderTimelineProps) {
  // Sort history in reverse chronological order (newest first)
  const sorted = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-[#1A1A2E]/35">
        No status history yet
      </p>
    );
  }

  return (
    <div className="relative">
      {sorted.map((entry, i) => {
        const isLatest = i === 0;
        const isCurrent = entry.status === currentStatus && isLatest;

        return (
          <div key={`${entry.status}-${entry.changedAt}`} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Timeline line */}
            {i < sorted.length - 1 && (
              <div className="absolute left-[9px] top-5 h-[calc(100%-12px)] w-px bg-[#1A1A2E]/8" />
            )}

            {/* Dot */}
            <div className="relative z-10 mt-1 shrink-0">
              <div
                className={`h-[18px] w-[18px] rounded-full border-2 ${
                  isCurrent
                    ? `${getStatusColor(entry.status)} border-white shadow-md`
                    : "border-[#1A1A2E]/15 bg-white"
                }`}
              >
                {isCurrent && (
                  <div className="absolute inset-0 animate-ping rounded-full bg-current opacity-20" />
                )}
              </div>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold ${
                    isCurrent ? "text-[#1A1A2E]" : "text-[#1A1A2E]/55"
                  }`}
                >
                  {getStatusLabel(entry.status)}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-[#C75B39]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#C75B39]">
                    CURRENT
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-[#1A1A2E]/35">
                {isLatest ? timeAgo(entry.changedAt) : formatDateTime(entry.changedAt)}
              </p>
              {entry.note && (
                <p className="mt-1 text-xs text-[#1A1A2E]/50">{entry.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
