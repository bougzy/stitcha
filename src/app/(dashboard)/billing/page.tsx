"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Crown,
  Zap,
  CheckCircle2,
  ArrowRight,
  Shield,
  Star,
  Users,
  ScanLine,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { SectionLoader } from "@/components/common/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import type { Designer } from "@/types";

export default function BillingPage() {
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/profile");
      const json = await res.json();
      if (json.success) setDesigner(json.data);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleUpgrade(planId: string) {
    setUpgrading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (json.needsConfig) {
        toast.error(
          "Payment system not configured. Contact support or set PAYSTACK_SECRET_KEY."
        );
        return;
      }
      if (!json.success) {
        toast.error(json.error || "Failed to initiate checkout");
        return;
      }
      window.location.href = json.data.authorizationUrl;
    } catch {
      toast.error("Failed to connect to payment system");
    } finally {
      setUpgrading(null);
    }
  }

  const currentPlan = designer
    ? SUBSCRIPTION_PLANS.find((p) => p.id === designer.subscription) ||
      SUBSCRIPTION_PLANS[0]
    : SUBSCRIPTION_PLANS[0];

  const currentPlanIndex = SUBSCRIPTION_PLANS.findIndex(
    (p) => p.id === currentPlan.id
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] lg:text-3xl">
            Billing & Plans
          </h1>
          <p className="mt-1 text-sm text-[#1A1A2E]/50">
            Manage your subscription and view your usage
          </p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            <SectionLoader lines={3} />
            <SectionLoader lines={5} />
          </div>
        ) : designer ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="space-y-6"
          >
            {/* Current Plan Banner */}
            <GlassCard
              gradientBorder
              padding="lg"
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-lg shadow-[#C75B39]/15">
                    <Crown className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#1A1A2E]">
                        {currentPlan.name} Plan
                      </h2>
                      <Badge variant="secondary">{designer.subscription}</Badge>
                    </div>
                    <p className="text-sm text-[#1A1A2E]/50">
                      {currentPlan.price === 0
                        ? "Free forever"
                        : `${formatCurrency(currentPlan.price)}/month`}
                      {designer.subscriptionExpiry && (
                        <span className="ml-2 text-xs text-[#1A1A2E]/40">
                          Renews{" "}
                          {new Date(
                            designer.subscriptionExpiry
                          ).toLocaleDateString("en-NG", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {currentPlan.price === 0 && (
                  <Button
                    className="gap-2"
                    onClick={() => handleUpgrade("pro")}
                    loading={upgrading === "pro"}
                  >
                    <Zap className="h-4 w-4" />
                    Upgrade Now
                  </Button>
                )}
              </div>
            </GlassCard>

            {/* Usage Overview */}
            <div className="grid gap-4 sm:grid-cols-3">
              <GlassCard padding="md">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#1A1A2E]/50">
                      Lifetime Clients
                    </p>
                    <p className="text-lg font-bold text-[#1A1A2E]">
                      {designer.lifetimeCounts?.totalClientsCreated ?? 0}
                      {currentPlan.clientLimit !== -1 && (
                        <span className="text-sm font-normal text-[#1A1A2E]/40">
                          {" "}
                          / {currentPlan.clientLimit}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {currentPlan.clientLimit !== -1 && (
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1A1A2E]/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                      style={{
                        width: `${Math.min(100, ((designer.lifetimeCounts?.totalClientsCreated ?? 0) / currentPlan.clientLimit) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </GlassCard>

              <GlassCard padding="md">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                    <ScanLine className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#1A1A2E]/50">
                      AI Scans (Monthly)
                    </p>
                    <p className="text-lg font-bold text-[#1A1A2E]">
                      {designer.lifetimeCounts?.totalScansUsed ?? 0}
                      {currentPlan.scanLimit !== -1 && (
                        <span className="text-sm font-normal text-[#1A1A2E]/40">
                          {" "}
                          / {currentPlan.scanLimit}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {currentPlan.scanLimit !== -1 && (
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1A1A2E]/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all"
                      style={{
                        width: `${Math.min(100, ((designer.lifetimeCounts?.totalScansUsed ?? 0) / currentPlan.scanLimit) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </GlassCard>

              <GlassCard padding="md">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                    <FileText className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#1A1A2E]/50">
                      Total Orders
                    </p>
                    <p className="text-lg font-bold text-[#1A1A2E]">
                      {designer.lifetimeCounts?.totalOrdersCreated ?? 0}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Plan Comparison */}
            <div>
              <h2 className="mb-4 text-lg font-bold text-[#1A1A2E]">
                Choose Your Plan
              </h2>
              <div className="grid gap-4 lg:grid-cols-3">
                {SUBSCRIPTION_PLANS.map((plan, index) => {
                  const isCurrent = plan.id === designer.subscription;
                  const isDowngrade = index < currentPlanIndex;
                  const isUpgrade = index > currentPlanIndex;

                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                    >
                      <GlassCard
                        padding="lg"
                        className={cn(
                          "relative h-full",
                          isCurrent && "ring-2 ring-[#C75B39]/30",
                          plan.badge === "Most Popular" &&
                            !isCurrent &&
                            "ring-1 ring-[#D4A853]/30"
                        )}
                      >
                        {/* Badge */}
                        {plan.badge && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge
                              variant={
                                isCurrent ? "default" : "secondary"
                              }
                              className="whitespace-nowrap text-[10px]"
                            >
                              {isCurrent ? "Current Plan" : plan.badge}
                            </Badge>
                          </div>
                        )}
                        {isCurrent && !plan.badge && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge variant="default" className="text-[10px]">
                              Current Plan
                            </Badge>
                          </div>
                        )}

                        <div className="pt-2">
                          {/* Plan icon & name */}
                          <div className="mb-4 flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-xl",
                                plan.id === "free" &&
                                  "bg-[#1A1A2E]/5",
                                plan.id === "pro" &&
                                  "bg-gradient-to-br from-[#C75B39]/15 to-[#D4A853]/15",
                                plan.id === "business" &&
                                  "bg-gradient-to-br from-[#D4A853]/15 to-[#C75B39]/15"
                              )}
                            >
                              {plan.id === "free" && (
                                <Star className="h-5 w-5 text-[#1A1A2E]/50" />
                              )}
                              {plan.id === "pro" && (
                                <Zap className="h-5 w-5 text-[#C75B39]" />
                              )}
                              {plan.id === "business" && (
                                <Crown className="h-5 w-5 text-[#D4A853]" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-[#1A1A2E]">
                                {plan.name}
                              </h3>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-[#1A1A2E]">
                                  {plan.price === 0
                                    ? "Free"
                                    : formatCurrency(plan.price)}
                                </span>
                                {plan.price > 0 && (
                                  <span className="text-sm text-[#1A1A2E]/40">
                                    /mo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Limits summary */}
                          <div className="mb-4 flex gap-3">
                            <div className="flex items-center gap-1.5 rounded-lg bg-[#1A1A2E]/[0.03] px-2.5 py-1.5">
                              <Users className="h-3.5 w-3.5 text-[#1A1A2E]/40" />
                              <span className="text-xs font-medium text-[#1A1A2E]/60">
                                {plan.clientLimit === -1
                                  ? "Unlimited"
                                  : plan.clientLimit}{" "}
                                clients
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-lg bg-[#1A1A2E]/[0.03] px-2.5 py-1.5">
                              <ScanLine className="h-3.5 w-3.5 text-[#1A1A2E]/40" />
                              <span className="text-xs font-medium text-[#1A1A2E]/60">
                                {plan.scanLimit === -1
                                  ? "Unlimited"
                                  : plan.scanLimit}{" "}
                                scans
                              </span>
                            </div>
                          </div>

                          {/* Features */}
                          <div className="mb-6 space-y-2.5">
                            {plan.features.map((feature) => (
                              <div
                                key={feature}
                                className="flex items-start gap-2.5"
                              >
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                <span className="text-sm text-[#1A1A2E]/70">
                                  {feature}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Action */}
                          {isCurrent ? (
                            <div className="rounded-xl border border-[#C75B39]/20 bg-[#C75B39]/5 py-3 text-center">
                              <span className="text-sm font-semibold text-[#C75B39]">
                                Your Current Plan
                              </span>
                            </div>
                          ) : isUpgrade ? (
                            <Button
                              className="w-full gap-2"
                              onClick={() => handleUpgrade(plan.id)}
                              loading={upgrading === plan.id}
                            >
                              <Zap className="h-4 w-4" />
                              Upgrade to {plan.name}
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          ) : isDowngrade ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              disabled
                            >
                              Downgrade (Coming Soon)
                            </Button>
                          ) : null}

                          {/* Trial info */}
                          {plan.trialDays > 0 && isUpgrade && (
                            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-[#1A1A2E]/40">
                              <Clock className="h-3 w-3" />
                              {plan.trialDays}-day free trial included
                            </p>
                          )}
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Feature Comparison Table */}
            <GlassCard padding="lg">
              <h2 className="mb-4 text-lg font-bold text-[#1A1A2E]">
                Feature Comparison
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1A1A2E]/8">
                      <th className="pb-3 text-left font-medium text-[#1A1A2E]/50">
                        Feature
                      </th>
                      {SUBSCRIPTION_PLANS.map((plan) => (
                        <th
                          key={plan.id}
                          className={cn(
                            "pb-3 text-center font-semibold",
                            plan.id === designer.subscription
                              ? "text-[#C75B39]"
                              : "text-[#1A1A2E]"
                          )}
                        >
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A2E]/5">
                    {[
                      {
                        feature: "Clients",
                        values: ["10 lifetime", "Unlimited", "Unlimited"],
                      },
                      {
                        feature: "AI Scans",
                        values: ["3/month", "50/month", "Unlimited"],
                      },
                      {
                        feature: "Order Management",
                        values: ["Basic", "Full", "Full"],
                      },
                      {
                        feature: "PDF Invoices",
                        values: [false, true, true],
                      },
                      {
                        feature: "Financial Dashboard",
                        values: [false, true, true],
                      },
                      {
                        feature: "WhatsApp Integration",
                        values: ["Templates", "Full", "Full"],
                      },
                      {
                        feature: "Offline Mode",
                        values: [false, true, true],
                      },
                      {
                        feature: "Public Profile",
                        values: [false, false, true],
                      },
                      {
                        feature: "Client Portal",
                        values: [false, false, true],
                      },
                      {
                        feature: "Team Collaboration",
                        values: [false, false, true],
                      },
                      {
                        feature: "Priority Support",
                        values: [false, false, true],
                      },
                    ].map((row) => (
                      <tr key={row.feature}>
                        <td className="py-3 text-[#1A1A2E]/70">
                          {row.feature}
                        </td>
                        {row.values.map((val, i) => (
                          <td key={i} className="py-3 text-center">
                            {typeof val === "boolean" ? (
                              val ? (
                                <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                              ) : (
                                <span className="text-[#1A1A2E]/20">--</span>
                              )
                            ) : (
                              <span className="text-xs font-medium text-[#1A1A2E]/60">
                                {val}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* FAQ / Info */}
            <GlassCard padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-[#1A1A2E]/40" />
                <h2 className="text-lg font-bold text-[#1A1A2E]">
                  Billing FAQ
                </h2>
              </div>
              <div className="space-y-4">
                {[
                  {
                    q: "How does billing work?",
                    a: "Plans are billed monthly via Paystack. You can upgrade anytime and your new plan takes effect immediately.",
                  },
                  {
                    q: "What happens to my data if I downgrade?",
                    a: "Your data is always safe. If you downgrade, you keep all existing clients and orders but new limits apply to future actions.",
                  },
                  {
                    q: "Why are client slots permanent?",
                    a: "Client slots use lifetime counts to prevent gaming the system. Deleting a client does not free up a slot — this ensures fair usage across all tiers.",
                  },
                  {
                    q: "Can I cancel anytime?",
                    a: "Yes, you can cancel your subscription at any time. Your plan remains active until the end of the billing period.",
                  },
                ].map((faq) => (
                  <div key={faq.q}>
                    <p className="text-sm font-semibold text-[#1A1A2E]">
                      {faq.q}
                    </p>
                    <p className="mt-1 text-sm text-[#1A1A2E]/55">{faq.a}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          <GlassCard padding="lg">
            <p className="text-center text-sm text-[#1A1A2E]/50">
              Unable to load billing information. Please refresh the page.
            </p>
          </GlassCard>
        )}
      </div>
    </PageTransition>
  );
}
