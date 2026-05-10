"use client";

/* -------------------------------------------------------------------------- */
/*  /admin/payments                                                              */
/*                                                                              */
/*  Admin queue for manual bank-transfer payments. Two tabs:                  */
/*    • Pending (default) — verify or reject                                  */
/*    • All — full audit trail                                                  */
/*                                                                              */
/*  Verifying calls activatePurchase() server-side so the designer's          */
/*  subscription / boost / SMS credits / Studio addon are activated instantly.*/
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  AlertTriangle,
  User,
  CalendarDays,
  Hash,
  MessageCircle,
} from "lucide-react";

interface AdminPayment {
  id: string;
  purpose: "subscription" | "boost_post" | "sms_pack" | "studio_addon";
  amount: number;
  reference: string;
  status: "pending" | "verified" | "rejected";
  payload: Record<string, unknown>;
  proofImage?: string;
  senderName?: string;
  senderBank?: string;
  designerNote?: string;
  adminNote?: string;
  createdAt: string;
  verifiedAt?: string;
  rejectedAt?: string;
  designer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    businessName: string;
    subscription: string;
    smsBalance: number;
  } | null;
}

const PURPOSE_LABELS: Record<string, string> = {
  subscription: "Subscription",
  boost_post:   "Discover Boost",
  sms_pack:     "SMS Credits",
  studio_addon: "Studio Addon",
};

const PURPOSE_COLOURS: Record<string, string> = {
  subscription: "bg-purple-500/15 text-purple-300",
  boost_post:   "bg-amber-500/15 text-amber-300",
  sms_pack:     "bg-emerald-500/15 text-emerald-300",
  studio_addon: "bg-rose-500/15 text-rose-300",
};

function formatNGN(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

function formatDate(iso: string | undefined | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/admin/manual-payments?status=${tab === "pending" ? "pending" : "all"}&limit=100`);
      const json = await res.json();
      if (json.success) setPayments(json.data.payments);
      else if (res.status === 401) {
        window.location.href = "/admin/login";
      }
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tab]);

  useEffect(() => { refresh(); }, [refresh]);

  /* Poll every 25s for new payments while the page is open. Silent so we
     don't kick the loading state if a backgrounded tab refreshes. */
  useEffect(() => {
    const interval = window.setInterval(() => refresh(true), 25_000);
    const onFocus = () => refresh(true);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  async function verify(id: string) {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/manual-payments/${id}/verify`, { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Verify failed");
      toast.success(json.data?.alreadyVerified ? "Already verified" : "Verified — feature activated");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setActing(null);
    }
  }

  async function submitReject(id: string) {
    if (!rejectNote.trim() || rejectNote.trim().length < 3) {
      toast.error("Add a short note for the designer.");
      return;
    }
    setActing(id);
    try {
      const res = await fetch(`/api/admin/manual-payments/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: rejectNote.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Reject failed");
      toast.success("Payment rejected");
      setRejectingId(null);
      setRejectNote("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActing(null);
    }
  }

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-[#C75B39]" />
          <h1 className="text-xl font-bold text-white">Manual payments</h1>
        </div>
        <p className="mt-1 text-sm text-white/55">
          Verify bank-transfer payments. Verifying instantly activates the feature for the designer.
        </p>
      </header>

      {/* Tabs + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/[0.04] p-1">
          <button
            onClick={() => setTab("pending")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === "pending"
                ? "bg-[#C75B39] text-white"
                : "text-white/55 hover:text-white"
            }`}
          >
            Pending {tab === "pending" && pendingCount > 0 ? `(${pendingCount})` : ""}
          </button>
          <button
            onClick={() => setTab("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === "all"
                ? "bg-[#C75B39] text-white"
                : "text-white/55 hover:text-white"
            }`}
          >
            All payments
          </button>
        </div>
        <button
          onClick={() => refresh()}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.04] px-3 text-xs font-medium text-white/65 hover:bg-white/[0.08]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Payments list */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-sm text-white/55">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading payments…
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center">
          <Banknote className="mx-auto h-9 w-9 text-white/20" />
          <p className="mt-3 text-sm font-medium text-white/65">
            {tab === "pending" ? "Nothing to verify right now." : "No manual payments yet."}
          </p>
          <p className="mt-1 text-xs text-white/40">
            {tab === "pending" ? "Designer-submitted bank transfers show up here." : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              acting={acting === p.id}
              onVerify={() => verify(p.id)}
              onStartReject={() => { setRejectingId(p.id); setRejectNote(""); }}
              isRejectingMe={rejectingId === p.id}
              rejectNote={rejectNote}
              setRejectNote={setRejectNote}
              onCancelReject={() => { setRejectingId(null); setRejectNote(""); }}
              onSubmitReject={() => submitReject(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PaymentRow({
  payment: p,
  acting,
  onVerify,
  onStartReject,
  isRejectingMe,
  rejectNote,
  setRejectNote,
  onCancelReject,
  onSubmitReject,
}: {
  payment: AdminPayment;
  acting: boolean;
  onVerify: () => void;
  onStartReject: () => void;
  isRejectingMe: boolean;
  rejectNote: string;
  setRejectNote: (s: string) => void;
  onCancelReject: () => void;
  onSubmitReject: () => void;
}) {
  const isPending = p.status === "pending";
  const phoneClean = p.designer?.phone?.replace(/\D/g, "");
  const waLink = phoneClean
    ? `https://wa.me/${phoneClean.startsWith("0") ? "234" + phoneClean.slice(1) : phoneClean}?text=${encodeURIComponent(
        `Hello ${p.designer?.name?.split(" ")[0] || ""}! About your payment ${p.reference} for ${PURPOSE_LABELS[p.purpose]}.`,
      )}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-2xl border ${
        isPending
          ? "border-amber-500/30 bg-amber-500/[0.06]"
          : p.status === "verified"
          ? "border-emerald-500/15 bg-white/[0.02]"
          : "border-red-500/15 bg-white/[0.02]"
      }`}
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px]">
        {/* Left: details */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PURPOSE_COLOURS[p.purpose]}`}>
              {PURPOSE_LABELS[p.purpose]}
            </span>
            <StatusChip status={p.status} />
            <span className="font-mono text-[11px] text-white/45">
              <Hash className="mr-0.5 inline h-3 w-3" />
              {p.reference}
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Amount sent">
              <span className="text-base font-bold text-white">{formatNGN(p.amount)}</span>
            </Field>
            <Field label="Submitted">
              <span className="text-white/75">
                <CalendarDays className="mr-1 inline h-3.5 w-3.5 text-white/40" />
                {formatDate(p.createdAt)}
              </span>
            </Field>
            {p.senderName && (
              <Field label="Sender name">
                <span className="text-white/75">
                  <User className="mr-1 inline h-3.5 w-3.5 text-white/40" />
                  {p.senderName}
                </span>
              </Field>
            )}
            {p.senderBank && (
              <Field label="Sending bank">
                <span className="text-white/75">
                  <Building2 className="mr-1 inline h-3.5 w-3.5 text-white/40" />
                  {p.senderBank}
                </span>
              </Field>
            )}
          </div>

          {/* Payload sub-details */}
          {Object.keys(p.payload || {}).length > 0 && (
            <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Payload</p>
              <p className="mt-1 font-mono text-[11px] text-white/65">
                {p.payload.planId ? `plan: ${p.payload.planId}` : ""}
                {p.payload.packId ? `pack: ${p.payload.packId}` : ""}
                {p.payload.orderId ? `order: ${String(p.payload.orderId).slice(0, 8)}…` : ""}
              </p>
            </div>
          )}

          {p.designerNote && (
            <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Designer note</p>
              <p className="mt-1 text-xs text-white/75">{p.designerNote}</p>
            </div>
          )}

          {p.adminNote && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-300">
                <AlertTriangle className="h-3 w-3" /> Rejection reason (visible to designer)
              </p>
              <p className="mt-1 text-xs text-red-200">{p.adminNote}</p>
            </div>
          )}
        </div>

        {/* Right: designer + actions */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
          {p.designer ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Designer</p>
              <p className="mt-1 text-sm font-semibold text-white">{p.designer.businessName || p.designer.name}</p>
              <p className="text-[11px] text-white/55">{p.designer.name}</p>
              <div className="mt-2 space-y-1 text-[11px] text-white/65">
                {p.designer.email && (
                  <p><Mail className="mr-1 inline h-3 w-3 text-white/40" />{p.designer.email}</p>
                )}
                {p.designer.phone && (
                  <p><Phone className="mr-1 inline h-3 w-3 text-white/40" />{p.designer.phone}</p>
                )}
              </div>
              <p className="mt-2 inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/55">
                Plan: <span className="font-semibold text-white/75">{p.designer.subscription}</span>
                {" · "}SMS bal: {p.designer.smsBalance}
              </p>
            </div>
          ) : (
            <p className="text-xs text-white/40">Designer record missing</p>
          )}

          {/* Actions */}
          {isPending && !isRejectingMe && (
            <div className="space-y-2">
              <button
                onClick={onVerify}
                disabled={acting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
              >
                {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Verify & activate
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onStartReject}
                  disabled={acting}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  Reject
                </button>
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#25D366]/15 px-2 py-1.5 text-xs font-semibold text-[#25D366] transition hover:bg-[#25D366]/25"
                  >
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {isRejectingMe && (
            <div className="space-y-2">
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Why? e.g. couldn't find this transfer in our account"
                rows={3}
                className="w-full resize-none rounded-md border border-red-500/30 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/50"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onCancelReject}
                  disabled={acting}
                  className="rounded-lg border border-white/8 bg-white/[0.04] px-2 py-1.5 text-xs font-semibold text-white/65 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmitReject}
                  disabled={acting || rejectNote.trim().length < 3}
                  className="rounded-lg bg-red-600 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Confirm reject
                </button>
              </div>
            </div>
          )}

          {!isPending && (
            <div className="text-[11px] text-white/45">
              {p.status === "verified" && p.verifiedAt && (
                <>Verified {formatDate(p.verifiedAt)}</>
              )}
              {p.status === "rejected" && p.rejectedAt && (
                <>Rejected {formatDate(p.rejectedAt)}</>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
        <Clock className="h-2.5 w-2.5" /> Pending
      </span>
    );
  }
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
        <CheckCircle2 className="h-2.5 w-2.5" /> Activated
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
        <XCircle className="h-2.5 w-2.5" /> Rejected
      </span>
    );
  }
  return null;
}
