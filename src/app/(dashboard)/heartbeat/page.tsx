"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Heart,
  Flame,
  Sun,
  Snowflake,
  Moon,
  MessageCircle,
  ChevronRight,
  User,
  DollarSign,
  Copy,
  Check,
  Phone,
  Filter,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { SectionLoader } from "@/components/common/loading";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, getInitials } from "@/lib/utils";

interface ClientHeartbeat {
  clientId: string;
  name: string;
  phone: string;
  temperature: "hot" | "warm" | "cold" | "dormant";
  daysSinceLastOrder: number | null;
  totalOrders: number;
  totalSpent: number;
  outstandingBalance: number;
  lastOrderTitle: string | null;
  suggestedAction: string;
  suggestedMessage: string;
}

interface HeartbeatSummary {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  dormant: number;
  needsAttention: number;
}

const TEMP_CONFIG = {
  hot: {
    icon: Flame,
    label: "Hot",
    color: "text-red-500",
    bg: "bg-red-50/50",
    border: "border-red-200/40",
    description: "Active orders or recent activity",
  },
  warm: {
    icon: Sun,
    label: "Warm",
    color: "text-amber-500",
    bg: "bg-amber-50/50",
    border: "border-amber-200/40",
    description: "Ordered within last 45 days",
  },
  cold: {
    icon: Snowflake,
    label: "Cold",
    color: "text-blue-500",
    bg: "bg-blue-50/50",
    border: "border-blue-200/40",
    description: "No orders in 45-90 days",
  },
  dormant: {
    icon: Moon,
    label: "Dormant",
    color: "text-slate-400",
    bg: "bg-slate-50/50",
    border: "border-slate-200/40",
    description: "No orders in 90+ days",
  },
};

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

export default function HeartbeatPage() {
  const [summary, setSummary] = useState<HeartbeatSummary | null>(null);
  const [clients, setClients] = useState<ClientHeartbeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHeartbeat() {
      try {
        const res = await fetch("/api/clients/heartbeat");
        const json = await res.json();
        if (json.success) {
          setSummary(json.data.summary);
          setClients(json.data.clients);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchHeartbeat();
  }, []);

  const filteredClients =
    filter === "all"
      ? clients
      : clients.filter((c) => c.temperature === filter);

  function copyMessage(clientId: string, message: string) {
    navigator.clipboard.writeText(message);
    setCopiedId(clientId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openWhatsApp(phone: string, message: string) {
    let formatted = phone.replace(/\s+/g, "").replace(/^0/, "234");
    if (!formatted.startsWith("+") && !formatted.startsWith("234")) {
      formatted = "234" + formatted;
    }
    window.open(
      `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <SectionLoader lines={3} />
          <SectionLoader lines={5} />
        </div>
      </PageTransition>
    );
  }

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
            Client Heartbeat
          </h1>
          <p className="mt-1 text-sm text-[#1A1A2E]/50">
            Track and nurture your client relationships
          </p>
        </motion.div>

        {/* Temperature Summary */}
        {summary && (
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-4 gap-2.5">
              {(
                [
                  { key: "hot", count: summary.hot },
                  { key: "warm", count: summary.warm },
                  { key: "cold", count: summary.cold },
                  { key: "dormant", count: summary.dormant },
                ] as const
              ).map(({ key, count }) => {
                const config = TEMP_CONFIG[key];
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(filter === key ? "all" : key)}
                    className={cn(
                      "rounded-xl border p-3 text-center transition-all",
                      filter === key
                        ? `${config.bg} ${config.border}`
                        : "border-white/20 bg-white/40 hover:bg-white/55"
                    )}
                  >
                    <Icon
                      className={cn("mx-auto h-5 w-5", config.color)}
                    />
                    <p className="mt-1.5 text-xl font-bold text-[#1A1A2E]">
                      {count}
                    </p>
                    <p className="text-[10px] text-[#1A1A2E]/40">
                      {config.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Attention Needed Alert */}
        {summary && summary.needsAttention > 0 && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-3 rounded-xl border border-[#C75B39]/15 bg-[#C75B39]/5 px-4 py-3">
              <Heart className="h-4 w-4 shrink-0 text-[#C75B39]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#1A1A2E]">
                  {summary.needsAttention} client
                  {summary.needsAttention !== 1 ? "s" : ""} need
                  {summary.needsAttention === 1 ? "s" : ""} attention
                </p>
                <p className="text-[10px] text-[#1A1A2E]/50">
                  Cold and dormant clients haven&apos;t ordered in a while.
                  Reach out to re-engage them.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filter indicator */}
        {filter !== "all" && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[#1A1A2E]/40" />
              <span className="text-xs text-[#1A1A2E]/50">
                Showing {TEMP_CONFIG[filter as keyof typeof TEMP_CONFIG]?.label} clients
              </span>
              <button
                onClick={() => setFilter("all")}
                className="text-xs font-medium text-[#C75B39]"
              >
                Clear filter
              </button>
            </div>
          </motion.div>
        )}

        {/* Client List */}
        <motion.div variants={itemVariants}>
          <div className="space-y-2.5">
            {filteredClients.length === 0 ? (
              <GlassCard padding="lg">
                <div className="py-8 text-center">
                  <Heart className="mx-auto h-8 w-8 text-[#1A1A2E]/15" />
                  <p className="mt-3 text-sm text-[#1A1A2E]/40">
                    {filter === "all"
                      ? "No clients yet. Add clients to see their relationship status."
                      : "No clients in this category."}
                  </p>
                </div>
              </GlassCard>
            ) : (
              filteredClients.map((client, i) => (
                <ClientCard
                  key={client.clientId}
                  client={client}
                  index={i}
                  copiedId={copiedId}
                  onCopyMessage={copyMessage}
                  onWhatsApp={openWhatsApp}
                />
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}

function ClientCard({
  client,
  index,
  copiedId,
  onCopyMessage,
  onWhatsApp,
}: {
  client: ClientHeartbeat;
  index: number;
  copiedId: string | null;
  onCopyMessage: (id: string, msg: string) => void;
  onWhatsApp: (phone: string, msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = TEMP_CONFIG[client.temperature];
  const TempIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <GlassCard padding="none" className="overflow-hidden">
        {/* Main row */}
        <div
          className="flex cursor-pointer items-center gap-3 p-3"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Avatar */}
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#C75B39]/15 to-[#D4A853]/15">
              <span className="text-sm font-semibold text-[#C75B39]">
                {getInitials(client.name)}
              </span>
            </div>
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white",
                config.bg
              )}
            >
              <TempIcon className={cn("h-2.5 w-2.5", config.color)} />
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#1A1A2E]">
              {client.name}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-[#1A1A2E]/40">
              <span>
                {client.daysSinceLastOrder !== null
                  ? client.daysSinceLastOrder === 0
                    ? "Ordered today"
                    : `${client.daysSinceLastOrder}d ago`
                  : "No orders"}
              </span>
              <span className="text-[#1A1A2E]/15">|</span>
              <span>{client.totalOrders} orders</span>
              {client.outstandingBalance > 0 && (
                <>
                  <span className="text-[#1A1A2E]/15">|</span>
                  <span className="font-medium text-[#C75B39]">
                    {formatCurrency(client.outstandingBalance)} owed
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Temperature badge */}
          <span
            className={cn(
              "shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold",
              config.bg,
              config.color
            )}
          >
            {config.label}
          </span>

          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-[#1A1A2E]/20 transition-transform",
              expanded && "rotate-90"
            )}
          />
        </div>

        {/* Expanded: Suggested action */}
        {expanded && (
          <div className="border-t border-[#1A1A2E]/5 px-3 pb-3 pt-2.5">
            {/* Suggested action */}
            <div className="mb-2.5 flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-[#D4A853]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#D4A853]">
                {client.suggestedAction}
              </span>
            </div>

            {/* Pre-written message */}
            <div className="rounded-lg bg-[#1A1A2E]/3 p-3">
              <p className="text-xs leading-relaxed text-[#1A1A2E]/60">
                {client.suggestedMessage}
              </p>
            </div>

            {/* Action buttons */}
            <div className="mt-2.5 flex gap-2">
              <Button
                size="sm"
                className="flex-1 gap-1.5 bg-[#25D366] text-xs hover:bg-[#20BD5A]"
                onClick={(e) => {
                  e.stopPropagation();
                  onWhatsApp(client.phone, client.suggestedMessage);
                }}
              >
                <Phone className="h-3 w-3" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyMessage(client.clientId, client.suggestedMessage);
                }}
              >
                {copiedId === client.clientId ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
              <Link href={`/clients/${client.clientId}`}>
                <Button size="sm" variant="glass" className="gap-1.5 text-xs">
                  <User className="h-3 w-3" />
                  Profile
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/40 px-2 py-1.5 text-center">
                <p className="text-xs font-bold text-[#1A1A2E]">
                  {client.totalOrders}
                </p>
                <p className="text-[9px] text-[#1A1A2E]/35">Orders</p>
              </div>
              <div className="rounded-lg bg-white/40 px-2 py-1.5 text-center">
                <p className="text-xs font-bold text-[#1A1A2E]">
                  {formatCurrency(client.totalSpent)}
                </p>
                <p className="text-[9px] text-[#1A1A2E]/35">Total Spent</p>
              </div>
              <div className="rounded-lg bg-white/40 px-2 py-1.5 text-center">
                <p className="text-xs font-bold text-[#1A1A2E]">
                  {client.lastOrderTitle || "—"}
                </p>
                <p className="text-[9px] text-[#1A1A2E]/35">Last Order</p>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
