"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  Zap,
  Shield,
  MessageCircle,
  ScanLine,
  Crown,
  ArrowRight,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { SectionLoader } from "@/components/common/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_PLANS, CREDIT_PACKS, SCAN_CREDIT_PRICE } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import type { Designer } from "@/types";

export default function BillingPage() {
  const [designer,  setDesigner]  = useState<Designer | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res  = await fetch("/api/designer/profile");
      const json = await res.json();
      if (json.success) setDesigner(json.data);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function handleUpgrade(planId: string) {
    setUpgrading(planId);
    try {
      const res  = await fetch("/api/billing/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (json.needsConfig) {
        toast.error("Payment system not configured. Contact support.");
        return;
      }
      if (!json.success) { toast.error(json.error || "Failed to initiate checkout"); return; }
      window.location.href = json.data.authorizationUrl;
    } catch {
      toast.error("Failed to connect to payment system");
    } finally {
      setUpgrading(null);
    }
  }

  if (loading) return <SectionLoader />;

  const currentSub = designer?.subscription || "free";

  /* ------------------------------------------------------------------ */
  /*  Plan order: free → plus → pro                                      */
  /* ------------------------------------------------------------------ */
  const planOrder: Record<string, number> = { free: 0, plus: 1, pro: 2 };
  const currentLevel = planOrder[currentSub] ?? 0;

  return (
    <PageTransition>
      <div className="space-y-8">

        {/* ---- Header ---- */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">
            Plans & Billing
          </h1>
          <p className="mt-1 text-sm text-[#1A1A2E]/50">
            Stitcha is free forever for the essentials. Upgrade only when you need AI scanning.
          </p>
        </motion.div>

        {/* ---- Current plan badge ---- */}
        {designer && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <GlassCard padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C75B39]/10">
                    {currentSub === "pro" ? <Crown className="h-5 w-5 text-[#C75B39]" /> : <Shield className="h-5 w-5 text-[#C75B39]" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">
                      Current plan: <span className="capitalize text-[#C75B39]">{currentSub}</span>
                    </p>
                    <p className="text-xs text-[#1A1A2E]/50">
                      {currentSub === "free"
                        ? "Free forever — no expiry"
                        : designer.subscriptionExpiry
                        ? `Renews ${new Date(designer.subscriptionExpiry).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`
                        : "Active subscription"}
                    </p>
                  </div>
                </div>
                {currentSub === "free" && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                    Free forever
                  </Badge>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ---- Pricing grid ---- */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid gap-4 sm:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const planLevel   = planOrder[plan.id] ?? 0;
              const isCurrent   = plan.id === currentSub;
              const isDowngrade = planLevel < currentLevel;
              const isUpgrade   = planLevel > currentLevel;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative rounded-2xl border p-5 transition-all",
                    isCurrent
                      ? "border-[#C75B39]/40 bg-[#C75B39]/[0.04] shadow-md"
                      : "border-[#1A1A2E]/8 bg-white/40 hover:border-[#C75B39]/20 hover:bg-white/60"
                  )}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-[#C75B39] px-3 py-1 text-[10px] font-bold text-white shadow">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-[#1A1A2E]">{plan.name}</h3>
                    <p className="mt-0.5 text-xs text-[#1A1A2E]/50">{(plan as any).description}</p>
                    <div className="mt-3 flex items-baseline gap-1">
                      {plan.price === 0 ? (
                        <span className="text-3xl font-black text-[#1A1A2E]">Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-black text-[#1A1A2E]">
                            {formatCurrency(plan.price)}
                          </span>
                          <span className="text-sm text-[#1A1A2E]/40">/month</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mb-5 space-y-2">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="text-xs text-[#1A1A2E]/65">{f}</span>
                      </div>
                    ))}
                  </div>

                  {isCurrent ? (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-[#C75B39]/10 py-2">
                      <CheckCircle2 className="h-4 w-4 text-[#C75B39]" />
                      <span className="text-sm font-semibold text-[#C75B39]">Current Plan</span>
                    </div>
                  ) : isUpgrade ? (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(plan.id)}
                      loading={upgrading === plan.id}
                    >
                      Upgrade to {plan.name}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      {isDowngrade ? "Downgrade" : "Select"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ---- Pay-per-scan section ---- */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard padding="lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4A853]/10">
                <ScanLine className="h-5 w-5 text-[#D4A853]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1A1A2E]">Pay-per-scan</h3>
                <p className="text-xs text-[#1A1A2E]/50">
                  No subscription needed. Buy scan credits and use them whenever.
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-lg font-bold text-[#1A1A2E]">
                  {formatCurrency(SCAN_CREDIT_PRICE)}
                </p>
                <p className="text-xs text-[#1A1A2E]/40">per scan</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handleUpgrade(pack.id)}
                  disabled={!!upgrading}
                  className={cn(
                    "rounded-xl border border-[#1A1A2E]/8 bg-white/40 p-3 text-center transition-all hover:border-[#C75B39]/30 hover:bg-white/60",
                    upgrading === pack.id && "opacity-70"
                  )}
                >
                  <p className="text-lg font-bold text-[#1A1A2E]">{pack.scans}</p>
                  <p className="text-[10px] text-[#1A1A2E]/40">scans</p>
                  <p className="mt-1 text-sm font-semibold text-[#C75B39]">
                    {formatCurrency(pack.price)}
                  </p>
                  {pack.badge && (
                    <span className="mt-1 inline-block rounded-full bg-[#C75B39]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#C75B39]">
                      {pack.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* ---- Why upgrade section ---- */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard padding="lg">
            <h3 className="mb-4 font-semibold text-[#1A1A2E]">
              Why upgrade to Plus?
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: ScanLine,
                  title: "AI body scanning in 2 minutes",
                  desc: "No tape measure needed. Send a scan link to your client, get 25+ measurements.",
                },
                {
                  icon: Zap,
                  title: "Measurement history",
                  desc: "Track how your clients' measurements change over time. Never make the wrong size again.",
                },
                {
                  icon: MessageCircle,
                  title: "Shareable measurement cards",
                  desc: "Share a professional measurement card with clients via WhatsApp. Looks impressive.",
                },
                {
                  icon: Shield,
                  title: "Financial dashboard",
                  desc: "See your monthly revenue, outstanding payments, and profit margins at a glance.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3 rounded-xl border border-[#1A1A2E]/6 bg-white/30 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C75B39]/10">
                    <Icon className="h-4 w-4 text-[#C75B39]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">{title}</p>
                    <p className="text-xs text-[#1A1A2E]/50">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {currentSub === "free" && (
              <div className="mt-4">
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade("plus")}
                  loading={upgrading === "plus"}
                >
                  Start 14-day free trial — Plus plan
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="mt-2 text-center text-xs text-[#1A1A2E]/35">
                  No charge until trial ends. Cancel anytime.
                </p>
              </div>
            )}
          </GlassCard>
        </motion.div>

      </div>
    </PageTransition>
  );
}
