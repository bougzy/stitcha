"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Link2,
  Mail,
  Phone,
  Plus,
  Ruler,
  Scissors,
  Share2,
  ShoppingBag,
  StickyNote,
  Trash2,
  TrendingUp,
  TrendingDown,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/common/page-transition";
import { EmptyState } from "@/components/common/empty-state";
import { GlassCard } from "@/components/common/glass-card";
import { SectionLoader } from "@/components/common/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MeasurementForm } from "@/components/clients/measurement-form";
import { ClientInsights } from "@/components/clients/client-insights";
import { EaseCalculator } from "@/components/common/ease-calculator";
import { FabricCalculator } from "@/components/common/fabric-calculator";
import { WhatsAppActions } from "@/components/common/whatsapp-actions";
import { ClientSummaryCard } from "@/components/clients/client-summary-card";
import { MEASUREMENT_TYPES } from "@/lib/constants";
import {
  cn,
  getInitials,
  formatPhone,
  formatDate,
  generateScanLink,
} from "@/lib/utils";
import type { Client, Measurements, Order } from "@/types";
import type { MeasurementInput } from "@/lib/validations";

/* -------------------------------------------------------------------------- */
/*  Confidence color helper                                                   */
/* -------------------------------------------------------------------------- */

function confidenceColor(confidence?: number) {
  if (!confidence) return "bg-[#1A1A2E]/10 text-[#1A1A2E]/50";
  if (confidence >= 0.9) return "bg-emerald-500/15 text-emerald-700";
  if (confidence >= 0.7) return "bg-[#D4A853]/20 text-[#D4A853]";
  return "bg-red-500/15 text-red-600";
}

function confidenceLabel(confidence?: number) {
  if (!confidence) return "";
  if (confidence >= 0.9) return "High";
  if (confidence >= 0.7) return "Medium";
  return "Low";
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [measurementHistory, setMeasurementHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [measurementDialogOpen, setMeasurementDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);

  /* ---- Fetch client data ---- */
  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch client");
      }

      setClient(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load client");
      router.push("/clients");
    } finally {
      setLoading(false);
    }
  }, [clientId, router]);

  /* ---- Fetch client orders ---- */
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?clientId=${clientId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOrders(json.data.orders);
      }
    } catch {
      // Silently fail - orders section is supplementary
    }
  }, [clientId]);

  /* ---- Fetch measurement history ---- */
  const fetchMeasurementHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/measurements`);
      const json = await res.json();
      if (json.success && json.data?.history) {
        setMeasurementHistory(json.data.history);
      }
    } catch {
      // Silently fail
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
    fetchOrders();
    fetchMeasurementHistory();
  }, [fetchClient, fetchOrders, fetchMeasurementHistory]);

  /* ---- Save measurements ---- */
  const handleSaveMeasurements = async (data: MeasurementInput) => {
    try {
      setSavingMeasurements(true);
      const res = await fetch(`/api/clients/${clientId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to save measurements");
      }

      toast.success("Measurements saved successfully");
      setMeasurementDialogOpen(false);
      fetchClient();
      fetchMeasurementHistory();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save measurements"
      );
    } finally {
      setSavingMeasurements(false);
    }
  };

  /* ---- Generate scan link ---- */
  const handleGenerateScanLink = async () => {
    try {
      const scanLink = generateScanLink();
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...client,
          scanLink,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to generate scan link");
      }

      const fullLink = `${window.location.origin}/scan/${scanLink}`;
      await navigator.clipboard.writeText(fullLink);
      toast.success("Scan link copied to clipboard");
      fetchClient();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate scan link"
      );
    }
  };

  /* ---- Share measurement card ---- */
  const handleShareMeasurementCard = async () => {
    try {
      setSharing(true);
      const res = await fetch(`/api/clients/${clientId}/share`, {
        method: "POST",
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to generate share link");
      }

      // Use the full URL from the API (uses APP_URL / Vercel URL)
      const shareUrl = json.data.shareUrl || `${window.location.origin}/measurements/${json.data.shareCode}`;

      // Try native share first (mobile), fallback to clipboard
      if (navigator.share) {
        await navigator.share({
          title: `${client?.name} — Measurement Card`,
          text: `View ${client?.name}'s body measurements`,
          url: shareUrl,
        });
        toast.success("Shared successfully");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Measurement card link copied to clipboard");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error(
        err instanceof Error ? err.message : "Failed to share"
      );
    } finally {
      setSharing(false);
    }
  };

  /* ---- Share client portal link ---- */
  const handleSharePortal = async () => {
    try {
      setSharing(true);
      const res = await fetch(`/api/clients/${clientId}/share`, {
        method: "POST",
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to generate portal link");
      }

      // Construct portal URL from the share code using APP_URL base
      const baseUrl = json.data.shareUrl
        ? json.data.shareUrl.replace(/\/measurements\/.*$/, "")
        : window.location.origin;
      const portalUrl = `${baseUrl}/portal/${json.data.shareCode}`;

      if (navigator.share) {
        await navigator.share({
          title: `${client?.name} — Your Fashion Portal`,
          text: `View your measurements and order status`,
          url: portalUrl,
        });
        toast.success("Portal link shared");
      } else {
        await navigator.clipboard.writeText(portalUrl);
        toast.success("Client portal link copied to clipboard");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error(
        err instanceof Error ? err.message : "Failed to share portal"
      );
    } finally {
      setSharing(false);
    }
  };

  /* ---- Delete client ---- */
  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to delete client");
      }

      toast.success("Client deleted successfully");
      router.push("/clients");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete client"
      );
    } finally {
      setDeleting(false);
    }
  };

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <PageTransition>
        <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-[#1A1A2E]/8" />
            <div className="h-6 w-40 animate-pulse rounded bg-[#1A1A2E]/8" />
          </div>
          <SectionLoader lines={4} />
          <SectionLoader lines={6} />
        </div>
      </PageTransition>
    );
  }

  if (!client) return null;

  const measurements = client.measurements as Measurements | undefined;

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        {/* Back button */}
        <button
          onClick={() => router.push("/clients")}
          className="flex items-center gap-2 text-sm text-[#1A1A2E]/55 transition-colors hover:text-[#1A1A2E]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </button>

        {/* Client header */}
        <GlassCard padding="lg" gradientBorder>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* Large avatar */}
            <div
              className={cn(
                "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl",
                "text-2xl font-bold text-white shadow-lg",
                client.gender === "female"
                  ? "bg-gradient-to-br from-[#C75B39] to-[#D4A853]"
                  : "bg-gradient-to-br from-[#1A1A2E] to-[#C75B39]"
              )}
            >
              {getInitials(client.name)}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <h1 className="text-xl font-bold text-[#1A1A2E]">
                  {client.name}
                </h1>
                <Badge
                  variant={
                    client.gender === "female" ? "default" : "secondary"
                  }
                  className="capitalize"
                >
                  {client.gender}
                </Badge>
              </div>

              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-center gap-2 text-sm text-[#1A1A2E]/60 sm:justify-start">
                  <Phone className="h-4 w-4" />
                  <span>{formatPhone(client.phone)}</span>
                </div>
                {client.email && (
                  <div className="flex items-center justify-center gap-2 text-sm text-[#1A1A2E]/60 sm:justify-start">
                    <Mail className="h-4 w-4" />
                    <span>{client.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSharePortal}
                loading={sharing}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Client Portal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/clients/new?edit=${client._id}`)}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <WhatsAppActions
                phone={client.phone}
                clientName={client.name}
                measurementUrl={client.shareCode ? `${window.location.origin}/measurements/${client.shareCode}` : undefined}
                portalUrl={client.shareCode ? `${window.location.origin}/portal/${client.shareCode}` : undefined}
              />
            </div>
          </div>
        </GlassCard>

        {/* Client Summary Card */}
        {orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <ClientSummaryCard client={client} orders={orders} />
          </motion.div>
        )}

        {/* Client Insights */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <GlassCard padding="lg">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#D4A853]" />
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                Client Insights
              </h2>
            </div>
            <ClientInsights clientId={client._id} />
          </GlassCard>
        </motion.div>

        {/* Measurements section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-[#C75B39]" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">
                  Measurements
                </h2>
              </div>
              <div className="flex gap-2">
                {measurements && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShareMeasurementCard}
                    loading={sharing}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Share Card</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateScanLink}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Scan Link</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setMeasurementDialogOpen(true)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {measurements ? "Edit" : "Add"}
                  </span>
                </Button>
              </div>
            </div>

            {measurements ? (
              <>
                {/* Source and confidence */}
                {measurements.source && (
                  <div className="mb-4 flex items-center gap-2">
                    <Badge
                      variant={
                        measurements.source === "ai_scan"
                          ? "success"
                          : "outline"
                      }
                    >
                      {measurements.source === "ai_scan"
                        ? "AI Scan"
                        : "Manual"}
                    </Badge>
                    {measurements.source === "ai_scan" &&
                      measurements.confidence && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            confidenceColor(measurements.confidence)
                          )}
                        >
                          {confidenceLabel(measurements.confidence)} confidence (
                          {Math.round(measurements.confidence * 100)}%)
                        </span>
                      )}
                    {measurements.measuredAt && (
                      <span className="text-xs text-[#1A1A2E]/40">
                        {formatDate(measurements.measuredAt)}
                      </span>
                    )}
                  </div>
                )}

                {/* Height and Weight */}
                {(measurements.height || measurements.weight) && (
                  <div className="mb-4 flex gap-4">
                    {measurements.height && (
                      <div className="rounded-xl bg-[#C75B39]/5 px-4 py-2">
                        <p className="text-xs text-[#1A1A2E]/50">Height</p>
                        <p className="text-lg font-semibold text-[#1A1A2E]">
                          {measurements.height}{" "}
                          <span className="text-xs font-normal text-[#1A1A2E]/40">
                            cm
                          </span>
                        </p>
                      </div>
                    )}
                    {measurements.weight && (
                      <div className="rounded-xl bg-[#D4A853]/10 px-4 py-2">
                        <p className="text-xs text-[#1A1A2E]/50">Weight</p>
                        <p className="text-lg font-semibold text-[#1A1A2E]">
                          {measurements.weight}{" "}
                          <span className="text-xs font-normal text-[#1A1A2E]/40">
                            kg
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Measurement grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {MEASUREMENT_TYPES.map((type) => {
                    const value =
                      measurements[type.key as keyof Measurements] as
                        | number
                        | undefined;
                    if (!value) return null;
                    return (
                      <div
                        key={type.key}
                        className="rounded-xl border border-white/30 bg-white/30 px-3 py-2.5"
                      >
                        <p className="text-[11px] font-medium text-[#1A1A2E]/45">
                          {type.label}
                        </p>
                        <p className="mt-0.5 text-base font-semibold text-[#1A1A2E]">
                          {value}{" "}
                          <span className="text-[10px] font-normal text-[#1A1A2E]/35">
                            {type.unit}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyState
                icon={Ruler}
                title="No measurements yet"
                description="Add measurements manually or generate a scan link for AI-powered body scanning."
                action={
                  <Button
                    onClick={() => setMeasurementDialogOpen(true)}
                    size="sm"
                  >
                    Add Measurements
                  </Button>
                }
                className="border-0 bg-transparent p-8 shadow-none"
              />
            )}
          </GlassCard>
        </motion.div>

        {/* Measurement Comparison */}
        {measurements && measurementHistory.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <GlassCard padding="lg">
              <div className="mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-[#C75B39]" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">
                  Measurement History
                </h2>
                <span className="rounded-full bg-[#C75B39]/10 px-2 py-0.5 text-xs font-medium text-[#C75B39]">
                  {measurementHistory.length} records
                </span>
              </div>

              {/* Compare latest vs previous */}
              {(() => {
                const latest = measurementHistory[measurementHistory.length - 1];
                const previous = measurementHistory[measurementHistory.length - 2];
                if (!latest || !previous) return null;

                return (
                  <div>
                    <p className="mb-3 text-xs font-medium text-[#1A1A2E]/40">
                      Comparing latest ({latest.measuredAt ? new Date(latest.measuredAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" }) : "current"})
                      {" vs "}
                      previous ({previous.measuredAt ? new Date(previous.measuredAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" }) : "older"})
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {MEASUREMENT_TYPES.map((type) => {
                        const curr = latest[type.key] as number | undefined;
                        const prev = previous[type.key] as number | undefined;
                        if (!curr || !prev) return null;

                        const diff = Math.round((curr - prev) * 10) / 10;
                        if (diff === 0) return null;

                        return (
                          <div
                            key={type.key}
                            className="flex items-center justify-between rounded-lg border border-white/20 bg-white/30 px-2.5 py-2"
                          >
                            <div>
                              <p className="text-[10px] text-[#1A1A2E]/40">{type.label}</p>
                              <p className="text-sm font-semibold text-[#1A1A2E]">
                                {curr} <span className="text-[10px] font-normal text-[#1A1A2E]/35">{type.unit}</span>
                              </p>
                            </div>
                            <div
                              className={cn(
                                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                diff > 0
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-red-50 text-red-500"
                              )}
                            >
                              {diff > 0 ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                              {diff > 0 ? "+" : ""}
                              {diff}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </GlassCard>
          </motion.div>
        )}

        {/* Fabric Calculator section */}
        {measurements && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <GlassCard padding="lg">
              <div className="mb-4 flex items-center gap-2">
                <Scissors className="h-5 w-5 text-[#D4A853]" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">
                  Fabric Calculator
                </h2>
              </div>
              <FabricCalculator measurements={measurements} />
            </GlassCard>
          </motion.div>
        )}

        {/* Ease Allowance section */}
        {measurements && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <GlassCard padding="lg">
              <div className="mb-4 flex items-center gap-2">
                <Ruler className="h-5 w-5 text-[#C75B39]" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">
                  Ease Allowance
                </h2>
              </div>
              <EaseCalculator measurements={measurements} />
            </GlassCard>
          </motion.div>
        )}

        {/* Orders section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#D4A853]" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">
                  Orders
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/orders/new?clientId=${client._id}`)
                }
              >
                <Plus className="h-3.5 w-3.5" />
                New Order
              </Button>
            </div>

            {orders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No orders yet"
                description="Create an order for this client to start tracking their garments."
                className="border-0 bg-transparent p-8 shadow-none"
              />
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    onClick={() => router.push(`/orders/${order._id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-white/20 bg-white/30 px-4 py-3 transition-all hover:bg-white/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1A1A2E]">
                        {order.title}
                      </p>
                      <p className="text-xs text-[#1A1A2E]/50">
                        {order.garmentType}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Notes section */}
        {client.notes && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard padding="lg">
              <div className="mb-3 flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-[#1A1A2E]/40" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">Notes</h2>
              </div>
              <p className="text-sm leading-relaxed text-[#1A1A2E]/60">
                {client.notes}
              </p>
            </GlassCard>
          </motion.div>
        )}

        {/* Measurement dialog */}
        <Dialog
          open={measurementDialogOpen}
          onOpenChange={setMeasurementDialogOpen}
        >
          <DialogContent className="max-w-2xl">
            <DialogClose />
            <DialogHeader>
              <DialogTitle>
                {measurements ? "Edit Measurements" : "Add Measurements"}
              </DialogTitle>
              <DialogDescription>
                Enter body measurements in centimeters. Leave fields empty if
                not applicable.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <MeasurementForm
                initialData={measurements || undefined}
                previousData={
                  measurementHistory.length > 0
                    ? measurementHistory[measurementHistory.length - 1]
                    : null
                }
                clientGender={client.gender}
                onSubmit={handleSaveMeasurements}
                loading={savingMeasurements}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogClose />
            <DialogHeader>
              <DialogTitle>Delete Client</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {client.name}? This will also
                delete all their orders. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                loading={deleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete Client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

