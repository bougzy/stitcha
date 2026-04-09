"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, MessageCircle, CheckCircle2, RefreshCw, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/common/glass-card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ChaseOrder {
  _id: string;
  title: string;
  balance: number;
  days: number;
  urgency: "urgent" | "chase" | "remind" | "new";
  client: { _id: string; name: string; phone: string };
  lastChasedAt: string | null;
}

interface ChaserData {
  urgent: ChaseOrder[];
  chase:  ChaseOrder[];
  remind: ChaseOrder[];
  new:    ChaseOrder[];
  total:  number;
  count:  number;
}

type ChaseTone = "gentle" | "firm" | "final";

/* -------------------------------------------------------------------------- */
/*  Urgency config                                                             */
/* -------------------------------------------------------------------------- */

const URGENCY_CONFIG = {
  urgent: {
    label: "Overdue 14+ days",
    color: "text-red-600",
    bg:    "bg-red-50/60 border-red-200/50",
    icon:  AlertTriangle,
    tone:  "final" as ChaseTone,
  },
  chase: {
    label: "Overdue 7–13 days",
    color: "text-amber-600",
    bg:    "bg-amber-50/60 border-amber-200/50",
    icon:  TrendingDown,
    tone:  "firm" as ChaseTone,
  },
  remind: {
    label: "Overdue 3–6 days",
    color: "text-yellow-600",
    bg:    "bg-yellow-50/60 border-yellow-200/50",
    icon:  Clock,
    tone:  "gentle" as ChaseTone,
  },
};

/* -------------------------------------------------------------------------- */
/*  Single chase row                                                           */
/* -------------------------------------------------------------------------- */

function ChaseRow({ order, tone, onSent }: { order: ChaseOrder; tone: ChaseTone; onSent: () => void }) {
  const [sending, setSending] = useState(false);

  const handleChase = async () => {
    setSending(true);
    try {
      const res  = await fetch("/api/payment-chaser", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orderId: order._id, tone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      window.open(json.data.whatsappUrl, "_blank");
      toast.success(`Reminder opened for ${order.client.name}`);
      onSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate reminder");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/20 bg-white/30 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#1A1A2E]">
          {order.client.name}
        </p>
        <p className="truncate text-xs text-[#1A1A2E]/50">
          {order.title} · {order.days}d overdue
        </p>
        {order.lastChasedAt && (
          <p className="text-[10px] text-[#1A1A2E]/35">
            Last chased {Math.floor((Date.now() - new Date(order.lastChasedAt).getTime()) / 86400000)}d ago
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold text-[#1A1A2E]">
          {formatCurrency(order.balance)}
        </span>
        <Button size="sm" variant="outline" onClick={handleChase} loading={sending}>
          <MessageCircle className="h-3.5 w-3.5" />
          Chase
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function PaymentChaser() {
  const [data,    setData]    = useState<ChaserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch("/api/payment-chaser");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.error("Failed to load payment chaser");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <GlassCard padding="lg">
        <div className="flex items-center gap-2 text-[#1A1A2E]/40">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading payment tracker...</span>
        </div>
      </GlassCard>
    );
  }

  if (!data || data.count === 0) {
    return (
      <GlassCard padding="lg">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <div>
            <p className="font-semibold text-[#1A1A2E]">All payments settled! 🎉</p>
            <p className="text-sm text-[#1A1A2E]/50">No outstanding balances right now.</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="lg">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-[#1A1A2E]">
            Payment Chaser
          </h2>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
            {data.count} unpaid
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#1A1A2E]/40">Total owed</p>
          <p className="text-lg font-bold text-red-600">
            {formatCurrency(data.total)}
          </p>
        </div>
      </div>

      {/* Urgency groups */}
      <div className="space-y-4">
        {(["urgent", "chase", "remind"] as const).map((urgency) => {
          const orders = data[urgency];
          if (!orders.length) return null;
          const cfg = URGENCY_CONFIG[urgency];
          const Icon = cfg.icon;

          return (
            <motion.div
              key={urgency}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={cn("rounded-xl border p-3", cfg.bg)}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", cfg.color)} />
                  <span className={cn("text-xs font-semibold", cfg.color)}>
                    {cfg.label} ({orders.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {orders.map((order) => (
                    <ChaseRow
                      key={order._id}
                      order={order}
                      tone={cfg.tone}
                      onSent={fetchData}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* New orders (not yet chaseable) */}
        {data.new.length > 0 && (
          <div className="rounded-xl border border-[#1A1A2E]/8 bg-white/20 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#1A1A2E]/40" />
              <span className="text-xs font-semibold text-[#1A1A2E]/40">
                Recent — too soon to chase ({data.new.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {data.new.map((order) => (
                <div key={order._id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A2E]">{order.client.name}</p>
                    <p className="text-xs text-[#1A1A2E]/40">{order.title}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#1A1A2E]/60">
                    {formatCurrency(order.balance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[10px] text-[#1A1A2E]/30">
        Tap Chase to open a pre-written WhatsApp message. The message is sent by you — Stitcha never contacts your clients directly.
      </p>
    </GlassCard>
  );
}
