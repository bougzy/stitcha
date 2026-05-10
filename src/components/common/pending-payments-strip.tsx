"use client";

/* -------------------------------------------------------------------------- */
/*  PendingPaymentsStrip                                                        */
/*                                                                              */
/*  Compact horizontal card surfaced on /billing whenever the designer has    */
/*  pending manual-payment submissions. Lets them see status + reference     */
/*  per submission, plus a "Notify admin" deep-link.                          */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Clock,
  Copy,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { GlassCard } from "@/components/common/glass-card";
import { BANK_DETAILS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

interface ManualPaymentRow {
  id: string;
  purpose: string;
  amount: number;
  reference: string;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
  adminNote?: string;
}

const PURPOSE_LABEL: Record<string, string> = {
  subscription: "Subscription",
  boost_post: "Discover Boost",
  sms_pack: "SMS Credits",
  studio_addon: "Studio Addon",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

export function PendingPaymentsStrip({
  count,
  onChange,
}: {
  count: number;
  onChange: () => void;
}) {
  const [rows, setRows] = useState<ManualPaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manual-payments");
      const json = await res.json();
      if (json.success) setRows(json.data.payments);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  /* Refresh every 25s while expanded — fast feedback if admin verifies */
  useEffect(() => {
    if (!expanded) return;
    const t = window.setInterval(() => {
      refresh();
      onChange();
    }, 25_000);
    return () => window.clearInterval(t);
  }, [expanded, refresh, onChange]);

  function copy(value: string, label: string) {
    navigator.clipboard.writeText(value).then(
      () => toast.success(`${label} copied`),
      () => toast.error(`Couldn't copy ${label.toLowerCase()}`),
    );
  }

  const recent = rows.slice(0, 6);
  const adminWA = BANK_DETAILS.adminWhatsApp.replace(/\D/g, "");

  return (
    <GlassCard padding="md">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="-m-1 flex w-full items-center justify-between rounded-xl p-1 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-[#1A1A2E]">
              {count} payment{count === 1 ? "" : "s"} awaiting verification
            </p>
            <p className="mt-0.5 text-xs text-[#1A1A2E]/55">
              Admin will activate the feature once they confirm receipt.
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-[#1A1A2E]/45" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#1A1A2E]/45" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 overflow-hidden"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
              Your recent submissions
            </p>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1 text-[10px] font-medium text-[#1A1A2E]/45 hover:text-[#1A1A2E]"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <ul className="space-y-1.5">
            {recent.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#1A1A2E]/8 bg-white/60 px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#1A1A2E]">
                      {PURPOSE_LABEL[p.purpose] || p.purpose}
                    </p>
                    <button
                      onClick={() => copy(p.reference, "Reference")}
                      className="font-mono text-[10px] text-[#1A1A2E]/55 hover:text-[#1A1A2E] inline-flex items-center gap-1"
                      title="Copy reference"
                    >
                      {p.reference}
                      <Copy className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#1A1A2E]/45">
                    {formatCurrency(p.amount)} · {formatDate(p.createdAt)}
                  </p>
                  {p.status === "rejected" && p.adminNote && (
                    <p className="mt-1 text-[10px] text-red-700">
                      Reason: {p.adminNote}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {p.status === "pending" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      <Clock className="h-2.5 w-2.5" /> Pending
                    </span>
                  )}
                  {p.status === "verified" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Activated
                    </span>
                  )}
                  {p.status === "rejected" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      <XCircle className="h-2.5 w-2.5" /> Rejected
                    </span>
                  )}
                  {p.status === "pending" && adminWA && (
                    <a
                      href={`https://wa.me/${adminWA}?text=${encodeURIComponent(
                        `Hello, I just paid for ${PURPOSE_LABEL[p.purpose] || p.purpose}. Reference: ${p.reference}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md bg-[#25D366]/10 px-2 py-0.5 text-[10px] font-semibold text-[#25D366]"
                    >
                      <MessageCircle className="inline h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </GlassCard>
  );
}
