"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants";
import type { Order, OrderStatus } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Status badge helper                                                       */
/* -------------------------------------------------------------------------- */

function getStatusBadgeVariant(
  status: OrderStatus
): "default" | "secondary" | "outline" | "destructive" | "success" | "warning" {
  const statusConfig = ORDER_STATUSES.find((s) => s.value === status);
  if (!statusConfig) return "outline";

  switch (statusConfig.color) {
    case "gold":
      return "warning";
    case "info":
      return "secondary";
    case "terracotta":
      return "default";
    case "success":
      return "success";
    case "destructive":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusLabel(status: OrderStatus): string {
  const statusConfig = ORDER_STATUSES.find((s) => s.value === status);
  return statusConfig?.label || status;
}

/* -------------------------------------------------------------------------- */
/*  Progress indicator                                                        */
/* -------------------------------------------------------------------------- */

const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "confirmed",
  "cutting",
  "sewing",
  "fitting",
  "finishing",
  "ready",
  "delivered",
];

function getProgressPercent(status: OrderStatus): number {
  if (status === "cancelled") return 0;
  const index = STATUS_ORDER.indexOf(status);
  if (index === -1) return 0;
  return Math.round(((index + 1) / STATUS_ORDER.length) * 100);
}

/* -------------------------------------------------------------------------- */
/*  Due date helpers                                                          */
/* -------------------------------------------------------------------------- */

function getDueDateInfo(dueDate?: string) {
  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d overdue`, urgent: true };
  }
  if (diffDays === 0) {
    return { label: "Due today", urgent: true };
  }
  if (diffDays <= 3) {
    return { label: `${diffDays}d left`, urgent: true };
  }
  return { label: `${diffDays}d left`, urgent: false };
}

/* -------------------------------------------------------------------------- */
/*  OrderCard component                                                       */
/* -------------------------------------------------------------------------- */

interface OrderCardProps {
  order: Order;
  index?: number;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function OrderCard({ order, index = 0, selected, onToggleSelect }: OrderCardProps) {
  const router = useRouter();
  const progress = getProgressPercent(order.status);
  const dueDateInfo = getDueDateInfo(order.dueDate);
  const clientName = order.client?.name || "Unknown Client";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => router.push(`/orders/${order._id}`)}
      className={cn(
        "group relative cursor-pointer",
        "rounded-2xl border bg-white/40 backdrop-blur-md",
        "shadow-[0_8px_32px_rgba(26,26,46,0.06)]",
        "transition-all duration-200",
        "hover:border-white/30 hover:bg-white/55",
        "hover:shadow-[0_12px_40px_rgba(26,26,46,0.1)]",
        "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
        "p-4",
        selected ? "border-[#C75B39]/30 bg-[#C75B39]/[0.04]" : "border-white/20"
      )}
    >
      {/* Selection checkbox */}
      {onToggleSelect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(order._id);
          }}
          className="absolute right-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded border border-[#1A1A2E]/15 bg-white/80 text-[#C75B39] transition-all hover:border-[#C75B39]/30"
          aria-label={selected ? "Deselect order" : "Select order"}
        >
          {selected && (
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
              <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}
      {/* Top row: title + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[#1A1A2E]">
            {order.title}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#1A1A2E]/55">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{clientName}</span>
          </div>
        </div>
        <Badge
          variant={getStatusBadgeVariant(order.status)}
          className="shrink-0 capitalize"
        >
          {getStatusLabel(order.status)}
        </Badge>
      </div>

      {/* Middle: garment type + price */}
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-lg bg-[#C75B39]/8 px-2 py-0.5 text-xs font-medium text-[#C75B39]">
          {order.garmentType}
        </span>
        <span className="text-sm font-semibold text-[#1A1A2E]">
          {formatCurrency(order.price)}
        </span>
      </div>

      {/* Progress bar */}
      {order.status !== "cancelled" && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1A1A2E]/8">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                order.status === "delivered" || order.status === "ready"
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-[#C75B39] to-[#D4A853]"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom: due date */}
      {order.dueDate && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-[#1A1A2E]/45">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(order.dueDate)}</span>
          </div>
          {dueDateInfo && order.status !== "delivered" && order.status !== "cancelled" && (
            <div
              className={cn(
                "flex items-center gap-1 font-medium",
                dueDateInfo.urgent
                  ? "text-red-500"
                  : "text-[#1A1A2E]/45"
              )}
            >
              <Clock className="h-3 w-3" />
              <span>{dueDateInfo.label}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
