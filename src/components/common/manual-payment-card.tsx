"use client";

/* -------------------------------------------------------------------------- */
/*  ManualPaymentCard                                                           */
/*                                                                              */
/*  Bank-transfer alternative to Paystack. Designer:                          */
/*    1. Picks the plan / pack / addon they want.                              */
/*    2. Sees the destination account + a unique reference code.              */
/*    3. Transfers (in their bank app) using the reference as narration.      */
/*    4. Submits a "I sent it" form with the amount + sender info.            */
/*    5. Admin verifies in /admin/payments → feature is activated.             */
/*                                                                              */
/*  Used on /billing (subscription, sms, studio) and on order detail (boost). */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Banknote,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { GlassCard } from "@/components/common/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SUBSCRIPTION_PLANS,
  SMS_PACKS,
  STUDIO_ADDON,
  BOOST_PRICE_NGN,
  BANK_DETAILS,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

type Purpose = "subscription" | "sms_pack" | "studio_addon";

interface ManualPayment {
  id: string;
  purpose: string;
  amount: number;
  reference: string;
  status: "pending" | "verified" | "rejected";
  payload: Record<string, unknown>;
  adminNote?: string;
  createdAt: string;
  verifiedAt?: string;
  rejectedAt?: string;
}

const PURPOSE_LABELS: Record<string, string> = {
  subscription: "Subscription",
  boost_post:   "Discover Boost",
  sms_pack:     "SMS Credits",
  studio_addon: "Studio Addon",
};

function copy(value: string, label: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error(`Couldn't copy ${label.toLowerCase()}`),
  );
}

export function ManualPaymentCard() {
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<ManualPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* Form state */
  const [purpose, setPurpose] = useState<Purpose>("subscription");
  const [planId, setPlanId] = useState<"plus" | "pro">("plus");
  const [packId, setPackId] = useState<string>(SMS_PACKS[0].id);
  const [amount, setAmount] = useState<string>("");
  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [note, setNote] = useState("");

  /* Track the latest submission so we can show its reference + status */
  const [latestSubmission, setLatestSubmission] = useState<{
    reference: string;
    amount: number;
    purpose: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/manual-payments");
      const json = await res.json();
      if (json.success) setPayments(json.data.payments);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  /* Derived expected price for the form */
  const expected = (() => {
    if (purpose === "subscription") {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      return plan?.price ?? 0;
    }
    if (purpose === "sms_pack") {
      const pack = SMS_PACKS.find((p) => p.id === packId);
      return pack?.price ?? 0;
    }
    if (purpose === "studio_addon") return STUDIO_ADDON.price;
    return 0;
  })();

  /* Pre-fill amount when expected changes */
  useEffect(() => {
    setAmount(expected ? String(expected) : "");
  }, [expected]);

  async function submit() {
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      toast.error("Enter the amount you sent.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      if (purpose === "subscription") payload.planId = planId;
      if (purpose === "sms_pack")     payload.packId = packId;

      const res = await fetch("/api/manual-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          amount: amt,
          payload,
          senderName: senderName.trim() || undefined,
          senderBank: senderBank.trim() || undefined,
          designerNote: note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Submit failed");
        return;
      }
      toast.success("Payment submitted — admin will verify shortly");
      setLatestSubmission({
        reference: json.data.reference,
        amount: json.data.amount,
        purpose,
      });
      setSenderName("");
      setSenderBank("");
      setNote("");
      refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const pending = payments.filter((p) => p.status === "pending");
  const recent = payments.slice(0, 5);

  return (
    <GlassCard padding="lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="-m-1 flex w-full items-center justify-between rounded-xl p-1 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-[#D4A853]/15">
            <Banknote className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1A1A2E]">
              Pay by bank transfer
              {pending.length > 0 && (
                <Badge variant="warning" className="text-[10px]">
                  {pending.length} pending
                </Badge>
              )}
            </h2>
            <p className="mt-0.5 text-xs text-[#1A1A2E]/55">
              No card needed. Transfer to our account, submit a quick form, admin verifies.
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-[#1A1A2E]/45" /> : <ChevronDown className="h-4 w-4 text-[#1A1A2E]/45" />}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-5 space-y-5 overflow-hidden"
        >
          {/* Bank details */}
          <div className="rounded-2xl border border-emerald-200/50 bg-emerald-50/40 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80">
              Send money to
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <BankField label="Bank" value={BANK_DETAILS.bankName} />
              <BankField label="Account name" value={BANK_DETAILS.accountName} />
              <BankField label="Account number" value={BANK_DETAILS.accountNumber} copyable />
            </div>
          </div>

          {/* Purpose picker */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
              What are you paying for?
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              <PurposeButton
                active={purpose === "subscription"}
                onClick={() => setPurpose("subscription")}
                label="Subscription"
                description="Plus or Pro plan, 30 days"
              />
              <PurposeButton
                active={purpose === "sms_pack"}
                onClick={() => setPurpose("sms_pack")}
                label="SMS pack"
                description="Bulk SMS credits"
              />
              <PurposeButton
                active={purpose === "studio_addon"}
                onClick={() => setPurpose("studio_addon")}
                label="Studio addon"
                description="Branded PDFs, 30 days"
              />
            </div>
          </div>

          {/* Sub-pickers depending on purpose */}
          {purpose === "subscription" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {(["plus", "pro"] as const).map((id) => {
                const plan = SUBSCRIPTION_PLANS.find((p) => p.id === id);
                if (!plan) return null;
                const active = planId === id;
                return (
                  <button
                    key={id}
                    onClick={() => setPlanId(id)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-[#C75B39] bg-[#C75B39]/[0.06]"
                        : "border-[#1A1A2E]/8 bg-white/40"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A2E]">{plan.name}</p>
                      <p className="text-[10px] text-[#1A1A2E]/50">{plan.description}</p>
                    </div>
                    <span className="text-sm font-bold text-[#1A1A2E]">{formatCurrency(plan.price)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {purpose === "sms_pack" && (
            <div className="grid gap-2 sm:grid-cols-3">
              {SMS_PACKS.map((pack) => {
                const active = packId === pack.id;
                return (
                  <button
                    key={pack.id}
                    onClick={() => setPackId(pack.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-[#C75B39] bg-[#C75B39]/[0.06]"
                        : "border-[#1A1A2E]/8 bg-white/40"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#1A1A2E]">{pack.label}</p>
                    <p className="text-[10px] text-[#1A1A2E]/50">{pack.count} SMS</p>
                    <p className="mt-1 text-sm font-bold text-[#1A1A2E]">{formatCurrency(pack.price)}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Form */}
          <div className="rounded-2xl border border-[#1A1A2E]/8 bg-white/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
                  Amount sent (NGN)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="glass-input flex h-10 w-full rounded-md px-3 text-sm focus-visible:outline-none"
                />
                {expected > 0 && (
                  <p className="mt-1 text-[11px] text-[#1A1A2E]/45">
                    Expected: <span className="font-semibold">{formatCurrency(expected)}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
                  Your name on the transfer
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="(matches the account name you paid from)"
                  className="glass-input flex h-10 w-full rounded-md px-3 text-sm focus-visible:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
                  Sending bank (optional)
                </label>
                <input
                  type="text"
                  value={senderBank}
                  onChange={(e) => setSenderBank(e.target.value)}
                  placeholder="Opay / Access / GTB / …"
                  className="glass-input flex h-10 w-full rounded-md px-3 text-sm focus-visible:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. paid 2pm Tuesday"
                  className="glass-input flex h-10 w-full rounded-md px-3 text-sm focus-visible:outline-none"
                />
              </div>
            </div>

            <Button
              onClick={submit}
              disabled={submitting || !amount}
              className="mt-4 w-full"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              I&apos;ve sent the money — submit for review
            </Button>
          </div>

          {/* Just-submitted reference panel */}
          {latestSubmission && (
            <div className="rounded-2xl border border-amber-300/60 bg-amber-50/60 p-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    Payment submitted — quote this if you contact admin
                  </p>
                  <p className="mt-1 font-mono text-base font-bold text-amber-900">
                    {latestSubmission.reference}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700/70">
                    Amount: {formatCurrency(latestSubmission.amount)} · {PURPOSE_LABELS[latestSubmission.purpose] || latestSubmission.purpose}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => copy(latestSubmission.reference, "Reference")}
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy reference
                    </Button>
                    {BANK_DETAILS.adminWhatsApp && (
                      <a
                        href={`https://wa.me/${BANK_DETAILS.adminWhatsApp.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Hello, I just paid for ${PURPOSE_LABELS[latestSubmission.purpose]}. Reference: ${latestSubmission.reference}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#25D366]/10 px-3 text-xs font-semibold text-[#25D366]"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Notify admin on WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent submissions */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
                Your recent submissions
              </p>
              <button
                onClick={refresh}
                disabled={loading}
                className="text-[10px] font-medium text-[#1A1A2E]/45 hover:text-[#1A1A2E]"
              >
                <RefreshCw className={`inline h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
            {loading ? (
              <p className="text-xs text-[#1A1A2E]/50">Loading…</p>
            ) : recent.length === 0 ? (
              <p className="text-xs text-[#1A1A2E]/50">None yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {recent.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#1A1A2E]/8 bg-white/40 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#1A1A2E]">
                        {PURPOSE_LABELS[p.purpose] || p.purpose}{" "}
                        <span className="font-mono text-[10px] text-[#1A1A2E]/45">{p.reference}</span>
                      </p>
                      <p className="text-[10px] text-[#1A1A2E]/45">
                        {formatCurrency(p.amount)} · {new Date(p.createdAt).toLocaleString("en-NG", {
                          day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                        })}
                      </p>
                      {p.status === "rejected" && p.adminNote && (
                        <p className="mt-1 flex items-start gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">
                          <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                          {p.adminNote}
                        </p>
                      )}
                    </div>
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
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-center text-[11px] text-[#1A1A2E]/40">
            Boost your post on{" "}
            <Link href="/orders" className="underline">an order page</Link> — boost has its own bank-transfer button there.
          </p>
        </motion.div>
      )}
    </GlassCard>
  );
}

/* -------------------------------------------------------------------------- */

function BankField({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700/60">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2 rounded-md bg-white/70 px-2.5 py-1.5">
        <p className="truncate text-sm font-bold text-[#1A1A2E]">{value}</p>
        {copyable && (
          <button
            type="button"
            onClick={() => copy(value, label)}
            className="shrink-0 rounded p-1 text-[#1A1A2E]/40 hover:bg-[#1A1A2E]/5 hover:text-[#1A1A2E]/70"
            aria-label={`Copy ${label}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function PurposeButton({
  active,
  onClick,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-all ${
        active
          ? "border-[#C75B39] bg-[#C75B39]/[0.06] shadow-sm"
          : "border-[#1A1A2E]/8 bg-white/40 hover:border-[#C75B39]/30"
      }`}
    >
      <p className="text-sm font-semibold text-[#1A1A2E]">{label}</p>
      <p className="mt-0.5 text-[10px] text-[#1A1A2E]/55">{description}</p>
    </button>
  );
}

/* Boost-specific helper exported for the order detail page (see usage there) */
export function getBoostBankSubmitPayload(orderId: string) {
  return {
    purpose: "boost_post" as const,
    amount: BOOST_PRICE_NGN,
    payload: { orderId },
  };
}
