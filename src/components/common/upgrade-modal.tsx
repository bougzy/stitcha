"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Zap, Star, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Current usage info */
  lifetimeUsed: number;
  limit: number;
  planName: string;
  /** What resource triggered the upgrade (e.g. "clients", "scans") */
  resource?: string;
}

export function UpgradeModal({
  open,
  onClose,
  lifetimeUsed,
  limit,
  planName,
  resource = "clients",
}: UpgradeModalProps) {
  const proPlan = SUBSCRIPTION_PLANS.find((p) => p.id === "pro");

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A2E]/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/30 bg-white/95 shadow-[0_24px_64px_rgba(26,26,46,0.2)] backdrop-blur-xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-lg p-1 text-[#1A1A2E]/30 transition-colors hover:text-[#1A1A2E]/60"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header gradient */}
            <div className="bg-gradient-to-br from-[#C75B39] to-[#D4A853] px-6 py-8 text-center text-white">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
              >
                <TrendingUp className="h-8 w-8" />
              </motion.div>
              <h2 className="text-xl font-bold">Your Business is Growing!</h2>
              <p className="mt-2 text-sm text-white/80">
                You&apos;ve created {lifetimeUsed} of {limit} lifetime {resource} on the {planName} plan.
                Time to level up!
              </p>
            </div>

            {/* Usage bar */}
            <div className="px-6 pt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#1A1A2E]/60">Lifetime {resource} used</span>
                <span className="font-bold text-[#C75B39]">{lifetimeUsed} / {limit}</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#1A1A2E]/8">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#C75B39] to-[#D4A853]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (lifetimeUsed / limit) * 100)}%` }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-[#1A1A2E]/40">
                Deleting {resource} does not free up slots — this counter is permanent
              </p>
            </div>

            {/* Pro plan features */}
            {proPlan && (
              <div className="px-6 pt-5 pb-2">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-[#D4A853]" />
                  <span className="text-sm font-bold text-[#1A1A2E]">
                    {proPlan.name} Plan — {formatCurrency(proPlan.price)}/mo
                  </span>
                </div>
                <div className="space-y-2">
                  {proPlan.features.slice(0, 5).map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="text-xs text-[#1A1A2E]/70">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-6 pb-6 pt-4 space-y-2">
              <Button className="w-full gap-2" size="lg">
                <Zap className="h-4 w-4" />
                Upgrade to Professional
              </Button>
              <button
                onClick={onClose}
                className="w-full text-center text-xs text-[#1A1A2E]/40 hover:text-[#1A1A2E]/60 transition-colors py-2"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact usage bar for the client list page header.
 */
export function UsageBar({
  used,
  limit,
  planName,
  onUpgrade,
}: {
  used: number;
  limit: number;
  planName: string;
  onUpgrade: () => void;
}) {
  if (limit === -1) return null; // Unlimited plan

  const pct = Math.min(100, (used / limit) * 100);
  const isNearLimit = pct >= 80;
  const isAtLimit = used >= limit;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors ${
        isAtLimit
          ? "bg-red-50/80 border border-red-200/40"
          : isNearLimit
          ? "bg-amber-50/80 border border-amber-200/40"
          : "bg-[#1A1A2E]/[0.03] border border-transparent"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
            isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-600" : "text-[#1A1A2E]/40"
          }`}>
            {used} of {limit} Lifetime Clients Used
          </span>
          <span className="text-[10px] text-[#1A1A2E]/30">{planName}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#1A1A2E]/8">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAtLimit
                ? "bg-red-500"
                : isNearLimit
                ? "bg-amber-500"
                : "bg-gradient-to-r from-[#C75B39] to-[#D4A853]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {isNearLimit && (
        <button
          onClick={onUpgrade}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${
            isAtLimit
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-[#C75B39] text-white hover:bg-[#b14a2b]"
          }`}
        >
          Upgrade
        </button>
      )}
    </div>
  );
}
