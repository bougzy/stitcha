"use client";

/* -------------------------------------------------------------------------- */
/*  /broadcast/history                                                          */
/*                                                                              */
/*  Two stacked sections:                                                       */
/*    1. Pending / scheduled broadcasts (from /api/broadcast/schedule)         */
/*    2. Past broadcasts (from /api/broadcast/history)                         */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Calendar,
  Megaphone,
  MessageCircle,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  Users,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { Button } from "@/components/ui/button";

interface ScheduledRow {
  id: string;
  segment: string;
  channel: "sms" | "whatsapp";
  language: string;
  messagePreview: string;
  scheduledFor: string;
  recipientCount: number;
  sentCount: number;
  status: string;
}

interface HistoryRow {
  id: string;
  segment: string;
  channel: "sms" | "whatsapp";
  language: string;
  messagePreview: string;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  all: "All clients",
  debtors: "Owe money",
  dormant: "Dormant",
  "no-measure": "No measurements",
  vip: "VIP",
  loyal: "Loyal",
  new: "New",
  female: "Female",
  male: "Male",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BroadcastHistoryPage() {
  const [scheduled, setScheduled] = useState<ScheduledRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [totals, setTotals] = useState<{ totalReached: number; totalSMS: number; totalWA: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [sRes, hRes] = await Promise.all([
        fetch("/api/broadcast/schedule"),
        fetch("/api/broadcast/history?limit=50"),
      ]);
      const [sJson, hJson] = await Promise.all([sRes.json(), hRes.json()]);
      if (sJson.success) setScheduled(sJson.data.jobs);
      if (hJson.success) {
        setHistory(hJson.data.jobs);
        setTotals({
          totalReached: hJson.data.totalReached,
          totalSMS: hJson.data.totalSMS,
          totalWA: hJson.data.totalWA,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function cancelScheduled(id: string) {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/broadcast/schedule/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Cancel failed");
      toast.success("Broadcast cancelled");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <PageTransition>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#C75B39]" />
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Broadcast history</h1>
          </div>
          <p className="mt-1 text-sm text-[#1A1A2E]/55">
            What you&apos;ve sent and what&apos;s queued up.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/broadcast"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#1A1A2E]/10 bg-white/40 px-3 text-xs font-medium text-[#1A1A2E]/65 hover:bg-white/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Compose
          </Link>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#1A1A2E]/10 bg-white/40 px-3 text-xs font-medium text-[#1A1A2E]/65 hover:bg-white/60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* Aggregate stats */}
      {totals && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatBlock label="Total reached" value={totals.totalReached} icon={<Users className="h-4 w-4" />} tone="primary" />
          <StatBlock label="WhatsApp sent" value={totals.totalWA} icon={<MessageCircle className="h-4 w-4" />} tone="green" />
          <StatBlock label="SMS sent" value={totals.totalSMS} icon={<Send className="h-4 w-4" />} tone="neutral" />
        </div>
      )}

      {/* Pending / scheduled */}
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/50">
          Scheduled & in-flight
        </h2>
        {loading ? (
          <GlassCard padding="md">
            <div className="flex items-center gap-2 text-sm text-[#1A1A2E]/55">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          </GlassCard>
        ) : scheduled.length === 0 ? (
          <GlassCard padding="md">
            <p className="text-sm text-[#1A1A2E]/55">
              Nothing scheduled. Compose a broadcast and pick &quot;Schedule for later&quot; to queue one up.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {scheduled.map((s) => (
              <ScheduledCard
                key={s.id}
                row={s}
                onCancel={() => cancelScheduled(s.id)}
                cancelling={cancellingId === s.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/50">
          Past broadcasts
        </h2>
        {loading ? null : history.length === 0 ? (
          <GlassCard padding="md">
            <p className="text-sm text-[#1A1A2E]/55">
              No past broadcasts yet. Once you send one it&apos;ll show up here with delivery counts.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <HistoryCard key={h.id} row={h} />
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function StatBlock({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "primary" | "green" | "neutral";
}) {
  const tones = {
    primary: "from-[#C75B39]/[0.08] to-[#D4A853]/[0.08] text-[#C75B39]",
    green: "from-[#25D366]/[0.10] to-[#128C7E]/[0.06] text-[#128C7E]",
    neutral: "from-[#1A1A2E]/[0.04] to-[#1A1A2E]/[0.06] text-[#1A1A2E]/60",
  } as const;
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-75">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-[#1A1A2E]">{value.toLocaleString("en-NG")}</p>
    </div>
  );
}

function ChannelChip({ channel }: { channel: "sms" | "whatsapp" }) {
  return channel === "whatsapp" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/10 px-2 py-0.5 text-[10px] font-semibold text-[#128C7E]">
      <MessageCircle className="h-2.5 w-2.5" />
      WhatsApp
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#C75B39]/10 px-2 py-0.5 text-[10px] font-semibold text-[#C75B39]">
      <Send className="h-2.5 w-2.5" />
      SMS
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-2.5 w-2.5" /> Sent
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Running
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
        <Clock className="h-2.5 w-2.5" /> Ready to send
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1A2E]/[0.06] px-2 py-0.5 text-[10px] font-semibold text-[#1A1A2E]/60">
        <Calendar className="h-2.5 w-2.5" /> Scheduled
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1A2E]/[0.06] px-2 py-0.5 text-[10px] font-semibold text-[#1A1A2E]/40">
        <XCircle className="h-2.5 w-2.5" /> Cancelled
      </span>
    );
  }
  return <span className="text-[10px] text-[#1A1A2E]/45">{status}</span>;
}

function ScheduledCard({
  row,
  onCancel,
  cancelling,
}: {
  row: ScheduledRow;
  onCancel: () => void;
  cancelling: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <GlassCard padding="md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <ChannelChip channel={row.channel} />
              <StatusChip status={row.status} />
              <span className="rounded-full bg-[#1A1A2E]/[0.05] px-2 py-0.5 text-[10px] font-semibold text-[#1A1A2E]/55">
                {SEGMENT_LABELS[row.segment] || row.segment}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-[#1A1A2E]/85">{row.messagePreview}</p>
            <p className="mt-1 text-[11px] text-[#1A1A2E]/50">
              <Calendar className="mr-1 inline h-3 w-3" />
              {formatDateTime(row.scheduledFor)} · {row.recipientCount} recipient{row.recipientCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            {row.status === "ready" && row.channel === "whatsapp" && (
              <Link
                href={`/broadcast?resume=${row.id}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-gradient-to-r from-[#25D366] to-[#128C7E] px-3 text-[11px] font-semibold text-white shadow-md"
              >
                Send now
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cancel"}
            </Button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function HistoryCard({ row }: { row: HistoryRow }) {
  const fillPct =
    row.recipientCount > 0
      ? Math.round((row.sentCount / row.recipientCount) * 100)
      : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <GlassCard padding="md">
        <div className="flex flex-wrap items-center gap-1.5">
          <ChannelChip channel={row.channel} />
          <StatusChip status={row.status} />
          <span className="rounded-full bg-[#1A1A2E]/[0.05] px-2 py-0.5 text-[10px] font-semibold text-[#1A1A2E]/55">
            {SEGMENT_LABELS[row.segment] || row.segment}
          </span>
          {row.failedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              <AlertTriangle className="h-2.5 w-2.5" />
              {row.failedCount} failed
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-[#1A1A2E]/85">{row.messagePreview}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] font-medium text-[#1A1A2E]/55">
              <span>{row.sentCount} / {row.recipientCount} delivered</span>
              <span>{fillPct}%</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#1A1A2E]/[0.06]">
              <div
                className="h-full bg-gradient-to-r from-[#C75B39] to-[#D4A853]"
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
          <p className="shrink-0 text-[10px] text-[#1A1A2E]/45">
            {formatDateTime(row.completedAt || row.startedAt || row.createdAt)}
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}
