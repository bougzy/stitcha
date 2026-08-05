"use client";

/* -------------------------------------------------------------------------- */
/*  /pay/[code]                                                                */
/*                                                                              */
/*  Public payment request page. No login required — access is by the         */
/*  unguessable link code only, same pattern as /portal/[code].                */
/*                                                                              */
/*  Shows the amount owed and the designer's own bank account (Stitcha         */
/*  never touches this money). The client copies the account number, sends    */
/*  the transfer in their own banking app, then taps "I've sent this" so      */
/*  the designer gets notified to go check and confirm.                       */
/* -------------------------------------------------------------------------- */

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Copy, CheckCircle2, Loader2, Banknote, ShieldCheck } from "lucide-react";

interface PayData {
  label: string;
  amount: number;
  currency: string;
  status: "pending" | "client_marked_paid" | "confirmed" | "cancelled";
  orderTitle: string;
  businessName: string;
  businessPhone?: string;
  bankAccount: { bankName?: string; accountNumber?: string; accountName?: string } | null;
}

function amt(n: number, currency: string) {
  const symbol = currency === "NGN" ? "₦" : currency + " ";
  return `${symbol}${Math.round(n).toLocaleString()}`;
}

export default function PayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [data, setData] = useState<PayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetch(`/api/pay/${code}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setError(json.error || "Payment link not found");
        } else {
          setData(json.data);
        }
      })
      .catch(() => setError("Couldn't load this payment link"))
      .finally(() => setLoading(false));
  }, [code]);

  const copyAccountNumber = () => {
    if (!data?.bankAccount?.accountNumber) return;
    navigator.clipboard.writeText(data.bankAccount.accountNumber);
    toast.success("Account number copied");
  };

  const markPaid = async () => {
    try {
      setMarking(true);
      const res = await fetch(`/api/pay/${code}/mark-paid`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Something went wrong");
        return;
      }
      setData((d) => (d ? { ...d, status: "client_marked_paid" } : d));
      toast.success("Thanks! We've let them know.");
    } catch {
      toast.error("Couldn't reach the server. Try again.");
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF7F0]">
        <Loader2 className="h-6 w-6 animate-spin text-[#C75B39]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF7F0] px-6">
        <p className="text-center text-[#1A1A2E]/60">{error || "Payment link not found"}</p>
      </div>
    );
  }

  const isDone = data.status === "confirmed";
  const isMarked = data.status === "client_marked_paid";

  return (
    <div className="min-h-screen bg-[#FBF7F0] px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-md"
      >
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-wide text-[#1A1A2E]/40">Payment request from</p>
          <h1 className="mt-1 text-xl font-bold text-[#1A1A2E]">{data.businessName}</h1>
        </div>

        <div className="rounded-2xl border border-[#1A1A2E]/8 bg-white p-6 shadow-sm">
          <div className="text-center">
            <p className="text-sm text-[#1A1A2E]/50">{data.label} — {data.orderTitle}</p>
            <p className="mt-2 text-3xl font-bold text-[#1A1A2E]">{amt(data.amount, data.currency)}</p>
          </div>

          {isDone ? (
            <div className="mt-6 flex flex-col items-center gap-2 rounded-xl bg-emerald-50 py-6 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
              <p className="font-medium">Payment confirmed. Thank you!</p>
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-3 rounded-xl bg-[#1A1A2E]/[0.03] p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#1A1A2E]/50">
                  <Banknote className="h-3.5 w-3.5" /> Pay directly into
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold tracking-wide text-[#1A1A2E]">
                      {data.bankAccount?.accountNumber || "—"}
                    </p>
                    <p className="text-sm text-[#1A1A2E]/60">
                      {data.bankAccount?.bankName} · {data.bankAccount?.accountName}
                    </p>
                  </div>
                  <button
                    onClick={copyAccountNumber}
                    className="rounded-lg border border-[#1A1A2E]/10 p-2 text-[#1A1A2E]/60 transition-colors hover:bg-[#1A1A2E]/5"
                    aria-label="Copy account number"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-4 flex items-start gap-1.5 text-xs text-[#1A1A2E]/45">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This goes straight to {data.businessName}&apos;s own bank account. Stitcha does not hold or process this payment.
              </p>

              {isMarked ? (
                <div className="mt-5 rounded-xl bg-amber-50 py-3 text-center text-sm text-amber-700">
                  Marked as sent — waiting for {data.businessName} to confirm.
                </div>
              ) : (
                <button
                  onClick={markPaid}
                  disabled={marking}
                  className="mt-5 w-full rounded-xl bg-[#C75B39] py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {marking ? "Please wait..." : "I've sent this payment"}
                </button>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-[#1A1A2E]/30">Powered by Stitcha</p>
      </motion.div>
    </div>
  );
}
