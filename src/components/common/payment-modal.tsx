"use client";

/* -------------------------------------------------------------------------- */
/*  PaymentModal                                                                */
/*                                                                              */
/*  Single entry point for every billable feature in the app. Handles the     */
/*  full bank-transfer flow:                                                    */
/*    1. Shows bank details (one-tap copy on the account number)              */
/*    2. Shows the exact amount the designer should send                      */
/*    3. Captures sender info + optional receipt screenshot                    */
/*    4. Submits to /api/manual-payments → returns a unique STC- reference   */
/*    5. Confirmation screen with the reference + "Notify admin on WhatsApp" */
/*                                                                              */
/*  Used by /billing (subscription, SMS pack, Studio addon) and the order    */
/*  detail page (Boost). Single canonical paid-feature checkout in the app.  */
/* -------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  X,
  Banknote,
  Copy,
  Upload,
  Loader2,
  CheckCircle2,
  MessageCircle,
  AlertTriangle,
  Share2,
} from "lucide-react";
import { BANK_DETAILS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export type PaymentPurpose =
  | "subscription"
  | "sms_pack"
  | "studio_addon"
  | "boost_post";

export interface PaymentRequest {
  purpose: PaymentPurpose;
  /** Expected amount in NGN — pre-fills the amount field. */
  amount: number;
  /** Per-purpose payload (planId, packId, orderId, durationDays). */
  payload: {
    planId?: "free" | "plus" | "pro";
    orderId?: string;
    packId?: string;
    durationDays?: number;
  };
  /** Title shown in the modal header. */
  title: string;
  /** One-line description of what they're paying for. */
  description: string;
}

interface PaymentModalProps {
  open: boolean;
  request: PaymentRequest | null;
  onClose: () => void;
  /** Called after a successful submission so the parent can refresh state. */
  onSubmitted?: (reference: string) => void;
}

const PURPOSE_LABEL: Record<PaymentPurpose, string> = {
  subscription: "Subscription",
  sms_pack: "SMS pack",
  studio_addon: "Studio addon",
  boost_post: "Discover boost",
};

export function PaymentModal({ open, request, onClose, onSubmitted }: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [note, setNote] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Reset on open */
  useEffect(() => {
    if (open && request) {
      setAmount(String(request.amount));
      setSenderName("");
      setSenderBank("");
      setNote("");
      setProofImage(null);
      setReference(null);
    }
  }, [open, request]);

  /* Lock body scroll while open */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || !request) return null;

  function copy(value: string, label: string) {
    navigator.clipboard.writeText(value).then(
      () => toast.success(`${label} copied`),
      () => toast.error(`Couldn't copy ${label.toLowerCase()}`),
    );
  }

  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, HEIC).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large (5 MB max).");
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });
      const maxDim = 1280;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setProofImage(dataUrl);
      } else {
        ctx.drawImage(img, 0, 0, w, h);
        setProofImage(canvas.toDataURL("image/jpeg", 0.85));
      }
      e.target.value = "";
    } catch {
      toast.error("Couldn't read that image.");
    }
  }

  async function submit() {
    if (!request) return;
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      toast.error("Enter the amount you sent.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/manual-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: request.purpose,
          amount: amt,
          payload: request.payload,
          senderName: senderName.trim() || undefined,
          senderBank: senderBank.trim() || undefined,
          designerNote: note.trim() || undefined,
          proofImage: proofImage || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Submit failed");
        return;
      }
      setReference(json.data.reference);
      onSubmitted?.(json.data.reference);
    } finally {
      setSubmitting(false);
    }
  }

  const submitted = reference !== null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl border border-white/30 bg-white shadow-[0_40px_120px_rgba(26,26,46,0.30)] sm:max-h-[90vh] sm:overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-[#1A1A2E]/8 bg-gradient-to-br from-[#C75B39]/[0.06] to-[#D4A853]/[0.04] p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-[#D4A853]/15">
                <Banknote className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1A1A2E]/45">
                  Bank transfer · {PURPOSE_LABEL[request.purpose]}
                </p>
                <h2 className="text-base font-bold text-[#1A1A2E]">{request.title}</h2>
                <p className="mt-0.5 text-xs text-[#1A1A2E]/55">{request.description}</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#1A1A2E]/40 hover:bg-[#1A1A2E]/5"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body — submit form OR success state */}
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-5">
              {submitted ? (
                <SuccessPanel
                  reference={reference!}
                  amount={Number(amount)}
                  purpose={request.purpose}
                  onClose={onClose}
                  copy={copy}
                />
              ) : (
                <>
                  {/* Amount */}
                  <div className="mb-4 rounded-2xl border border-emerald-200/60 bg-emerald-50/60 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80">
                      Send this amount
                    </p>
                    <div className="mt-1 flex items-baseline justify-between">
                      <p className="text-3xl font-bold text-[#1A1A2E]">
                        {formatCurrency(request.amount)}
                      </p>
                      <button
                        onClick={() => copy(String(request.amount), "Amount")}
                        className="rounded p-1.5 text-emerald-700 hover:bg-emerald-100"
                        aria-label="Copy amount"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bank details */}
                  <div className="mb-2 grid gap-2 sm:grid-cols-3">
                    <BankField label="Bank" value={BANK_DETAILS.bankName} />
                    <BankField label="Account name" value={BANK_DETAILS.accountName} />
                    <BankField
                      label="Account number"
                      value={BANK_DETAILS.accountNumber}
                      onCopy={() => copy(BANK_DETAILS.accountNumber, "Account number")}
                    />
                  </div>

                  {/* Share-to-WhatsApp helper — useful when the designer is paying
                     from a different device than the one they're using right now */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1A1A2E]/8 bg-white/40 px-3 py-2">
                    <p className="text-[11px] text-[#1A1A2E]/55">
                      Paying from another device or asking someone to pay?
                    </p>
                    <a
                      href={(() => {
                        const lines = [
                          `Stitcha · ${PURPOSE_LABEL[request.purpose]} payment`,
                          ``,
                          `Bank:           ${BANK_DETAILS.bankName}`,
                          `Account name:   ${BANK_DETAILS.accountName}`,
                          `Account number: ${BANK_DETAILS.accountNumber}`,
                          `Amount:         ₦${request.amount.toLocaleString("en-NG")}`,
                          ``,
                          `Add the reference Stitcha gives me in the bank narration.`,
                        ];
                        return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#25D366]/15 px-2.5 text-[11px] font-semibold text-[#128C7E] hover:bg-[#25D366]/25"
                    >
                      <Share2 className="h-3 w-3" />
                      Share via WhatsApp
                    </a>
                  </div>

                  {/* Form fields */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
                        Amount you sent (NGN)
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="glass-input flex h-10 w-full rounded-md px-3 text-sm focus-visible:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
                        Sender name
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Name on the sending account"
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

                  {/* Proof image */}
                  <div className="mt-3">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
                      Bank receipt screenshot (recommended — speeds up verification)
                    </label>
                    {proofImage ? (
                      <div className="relative inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proofImage}
                          alt="Payment proof"
                          className="h-32 w-auto rounded-lg border border-emerald-200/40 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setProofImage(null)}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md"
                          aria-label="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#1A1A2E]/15 bg-white/30 text-xs font-medium text-[#1A1A2E]/55 transition-colors hover:border-[#C75B39]/30 hover:bg-white/50"
                      >
                        <Upload className="h-4 w-4" />
                        Upload receipt or transfer screenshot
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProofUpload}
                    />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={onClose}
                      className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#1A1A2E]/10 bg-white/60 text-sm font-medium text-[#1A1A2E]/70"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submit}
                      disabled={submitting || !amount}
                      className="flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] text-sm font-semibold text-white shadow-md disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      I've sent the money — submit
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */

function BankField({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700/60">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1.5">
        <p className="truncate text-sm font-bold text-[#1A1A2E]">{value}</p>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
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

function SuccessPanel({
  reference,
  amount,
  purpose,
  onClose,
  copy,
}: {
  reference: string;
  amount: number;
  purpose: PaymentPurpose;
  onClose: () => void;
  copy: (v: string, l: string) => void;
}) {
  const adminWA = BANK_DETAILS.adminWhatsApp.replace(/\D/g, "");
  const waLink = `https://wa.me/${adminWA}?text=${encodeURIComponent(
    `Hello, I just paid for ${PURPOSE_LABEL[purpose]}. Reference: ${reference}`,
  )}`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 p-5 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
        <p className="mt-2 text-sm font-semibold text-[#1A1A2E]">Payment submitted</p>
        <p className="mt-0.5 text-xs text-[#1A1A2E]/55">
          {formatCurrency(amount)} · {PURPOSE_LABEL[purpose]}
        </p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-700/70">
          Your reference
        </p>
        <button
          onClick={() => copy(reference, "Reference")}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 font-mono text-base font-bold text-[#1A1A2E] hover:bg-emerald-100"
          title="Copy"
        >
          {reference}
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-3">
        <p className="flex items-start gap-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Use this reference in the bank narration</strong> when you transfer.
            Admin will activate the feature on your account once they verify it.
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366]/15 text-sm font-semibold text-[#25D366] hover:bg-[#25D366]/25"
        >
          <MessageCircle className="h-4 w-4" />
          Notify admin on WhatsApp
        </a>
        <button
          onClick={onClose}
          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#1A1A2E]/10 bg-white/60 text-sm font-medium text-[#1A1A2E]/70"
        >
          Done
        </button>
      </div>
    </div>
  );
}
