"use client";

import { GlassCard } from "@/components/common/glass-card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, getInitials } from "@/lib/utils";
import {
  Phone,
  Mail,
  Calendar,
  Ruler,
  Package,
  DollarSign,
  TrendingUp,
  Star,
} from "lucide-react";
import type { Client, Order } from "@/types";

interface ClientSummaryCardProps {
  client: Client;
  orders?: Order[];
  className?: string;
}

export function ClientSummaryCard({ client, orders = [], className }: ClientSummaryCardProps) {
  const totalOrders = orders.length;
  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status)
  ).length;
  const totalSpent = orders.reduce((sum, o) => sum + o.price, 0);
  const totalPaid = orders.reduce((sum, o) => sum + o.depositPaid, 0);
  const hasMeasurements = !!client.measurements && Object.keys(client.measurements).length > 2;

  // Client tier based on order count
  const tier =
    totalOrders >= 10 ? "VIP" : totalOrders >= 5 ? "Loyal" : totalOrders >= 2 ? "Returning" : "New";

  const tierColors = {
    VIP: "bg-[#D4A853]/10 text-[#D4A853] border-[#D4A853]/20",
    Loyal: "bg-[#C75B39]/10 text-[#C75B39] border-[#C75B39]/20",
    Returning: "bg-blue-50 text-blue-600 border-blue-100",
    New: "bg-gray-50 text-gray-500 border-gray-100",
  };

  return (
    <GlassCard padding="lg" className={cn("relative overflow-hidden", className)}>
      {/* Decorative accent */}
      <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[60px] bg-gradient-to-br from-[#C75B39]/[0.06] to-[#D4A853]/[0.04]" />

      {/* Header */}
      <div className="relative flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39]/15 to-[#D4A853]/15">
          <span className="text-lg font-bold text-[#C75B39]">
            {getInitials(client.name)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-[#1A1A2E]">
              {client.name}
            </h3>
            <Badge
              variant="outline"
              className={cn("text-[9px] font-semibold", tierColors[tier])}
            >
              {tier === "VIP" && <Star className="mr-0.5 h-2.5 w-2.5" />}
              {tier}
            </Badge>
          </div>

          {/* Contact info */}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#1A1A2E]/50">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {client.phone}
            </span>
            {client.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {client.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-[#1A1A2E]/[0.02] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[#1A1A2E]/40">
            <Package className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Orders</span>
          </div>
          <p className="mt-1 text-lg font-bold text-[#1A1A2E]">{totalOrders}</p>
          {activeOrders > 0 && (
            <p className="text-[10px] text-[#C75B39]">{activeOrders} active</p>
          )}
        </div>

        <div className="rounded-xl bg-[#1A1A2E]/[0.02] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[#1A1A2E]/40">
            <TrendingUp className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total</span>
          </div>
          <p className="mt-1 text-lg font-bold text-[#1A1A2E]">{formatCurrency(totalSpent)}</p>
          <p className="text-[10px] text-[#1A1A2E]/40">{formatCurrency(totalPaid)} paid</p>
        </div>

        <div className="rounded-xl bg-[#1A1A2E]/[0.02] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[#1A1A2E]/40">
            <Ruler className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Measured</span>
          </div>
          <p className="mt-1 text-lg font-bold text-[#1A1A2E]">
            {hasMeasurements ? "Yes" : "No"}
          </p>
          {client.measurements?.source && (
            <p className="text-[10px] text-[#1A1A2E]/40">
              via {client.measurements.source === "ai_scan" ? "AI Scan" : "Manual"}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-[#1A1A2E]/[0.02] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[#1A1A2E]/40">
            <Calendar className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Since</span>
          </div>
          <p className="mt-1 text-sm font-bold text-[#1A1A2E]">
            {new Date(client.createdAt).toLocaleDateString("en-NG", {
              month: "short",
              year: "numeric",
            })}
          </p>
          {client.lastMeasuredAt && (
            <p className="text-[10px] text-[#1A1A2E]/40">
              Last measured{" "}
              {new Date(client.lastMeasuredAt).toLocaleDateString("en-NG", {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Outstanding balance warning */}
      {totalSpent - totalPaid > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50/80 px-3 py-2">
          <DollarSign className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-amber-700">
            {formatCurrency(totalSpent - totalPaid)} outstanding balance
          </span>
        </div>
      )}
    </GlassCard>
  );
}
