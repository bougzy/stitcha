"use client";

import { useEffect, useState } from "react";
import {
  Crown,
  Star,
  User,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Shirt,
  Clock,
} from "lucide-react";
import { GlassCard } from "@/components/common/glass-card";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ClientInsightsData {
  totalOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  totalSpent: number;
  totalPaid: number;
  outstandingBalance: number;
  avgOrderValue: number;
  favoriteGarment: string | null;
  lastOrderDate: string | null;
  overdueOrders: number;
  tier: "vip" | "regular" | "new";
  monthsActive: number;
  ordersPerMonth: number;
}

interface ClientInsightsProps {
  clientId: string;
}

const TIER_CONFIG = {
  vip: {
    label: "VIP Client",
    icon: Crown,
    color: "text-[#D4A853]",
    bg: "bg-[#D4A853]/10",
    border: "border-[#D4A853]/20",
    description: "Top-tier client with consistent orders",
  },
  regular: {
    label: "Regular",
    icon: Star,
    color: "text-[#C75B39]",
    bg: "bg-[#C75B39]/10",
    border: "border-[#C75B39]/20",
    description: "Returning client with repeat business",
  },
  new: {
    label: "New",
    icon: User,
    color: "text-[#1A1A2E]/50",
    bg: "bg-[#1A1A2E]/5",
    border: "border-[#1A1A2E]/10",
    description: "Recently added client",
  },
};

export function ClientInsights({ clientId }: ClientInsightsProps) {
  const [data, setData] = useState<ClientInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch(`/api/clients/${clientId}/insights`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch {
        // Silently fail — insights are supplementary
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-xl bg-[#1A1A2E]/5" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-[#1A1A2E]/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.totalOrders === 0) return null;

  const tierConfig = TIER_CONFIG[data.tier];
  const TierIcon = tierConfig.icon;
  const paymentRate =
    data.totalSpent > 0
      ? Math.round((data.totalPaid / data.totalSpent) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* VIP Badge */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-4",
          tierConfig.bg,
          tierConfig.border
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tierConfig.bg
          )}
        >
          <TierIcon className={cn("h-5 w-5", tierConfig.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-bold", tierConfig.color)}>
            {tierConfig.label}
          </p>
          <p className="text-xs text-[#1A1A2E]/45">
            {tierConfig.description}
          </p>
        </div>
        {data.monthsActive > 0 && (
          <span className="text-xs text-[#1A1A2E]/35">
            {data.monthsActive} mo{data.monthsActive !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/30 bg-white/40 px-3 py-2.5 text-center">
          <ShoppingBag className="mx-auto h-4 w-4 text-[#1A1A2E]/30" />
          <p className="mt-1 text-lg font-bold text-[#1A1A2E]">
            {data.totalOrders}
          </p>
          <p className="text-[10px] text-[#1A1A2E]/40">Total Orders</p>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 px-3 py-2.5 text-center">
          <DollarSign className="mx-auto h-4 w-4 text-[#D4A853]/50" />
          <p className="mt-1 text-lg font-bold text-[#1A1A2E]">
            {formatCurrency(data.totalSpent)}
          </p>
          <p className="text-[10px] text-[#1A1A2E]/40">Lifetime Value</p>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 px-3 py-2.5 text-center">
          <TrendingUp className="mx-auto h-4 w-4 text-emerald-500/50" />
          <p className="mt-1 text-lg font-bold text-[#1A1A2E]">
            {formatCurrency(data.avgOrderValue)}
          </p>
          <p className="text-[10px] text-[#1A1A2E]/40">Avg Order</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {data.outstandingBalance > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-[#C75B39]/5 px-3 py-2">
            <span className="flex items-center gap-2 text-xs text-[#C75B39]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Outstanding Balance
            </span>
            <span className="text-xs font-bold text-[#C75B39]">
              {formatCurrency(data.outstandingBalance)}
            </span>
          </div>
        )}

        {/* Payment collection rate */}
        <div className="flex items-center justify-between rounded-lg bg-white/40 px-3 py-2">
          <span className="text-xs text-[#1A1A2E]/50">Collection Rate</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#1A1A2E]/8">
              <div
                className={cn(
                  "h-full rounded-full",
                  paymentRate >= 80
                    ? "bg-emerald-500"
                    : paymentRate >= 50
                    ? "bg-[#D4A853]"
                    : "bg-[#C75B39]"
                )}
                style={{ width: `${paymentRate}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-[#1A1A2E]">
              {paymentRate}%
            </span>
          </div>
        </div>

        {data.favoriteGarment && (
          <div className="flex items-center justify-between rounded-lg bg-white/40 px-3 py-2">
            <span className="flex items-center gap-2 text-xs text-[#1A1A2E]/50">
              <Shirt className="h-3.5 w-3.5" />
              Favorite Garment
            </span>
            <span className="text-xs font-semibold capitalize text-[#1A1A2E]">
              {data.favoriteGarment}
            </span>
          </div>
        )}

        {data.lastOrderDate && (
          <div className="flex items-center justify-between rounded-lg bg-white/40 px-3 py-2">
            <span className="flex items-center gap-2 text-xs text-[#1A1A2E]/50">
              <Clock className="h-3.5 w-3.5" />
              Last Order
            </span>
            <span className="text-xs font-semibold text-[#1A1A2E]">
              {new Date(data.lastOrderDate).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        {data.activeOrders > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-white/40 px-3 py-2">
            <span className="text-xs text-[#1A1A2E]/50">Active Orders</span>
            <span className="text-xs font-semibold text-[#D4A853]">
              {data.activeOrders}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
