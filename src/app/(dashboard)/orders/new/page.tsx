"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Lock, Save, Scissors, ShoppingBag, Sparkles, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FabricCalculator } from "@/components/common/fabric-calculator";
import { whatsapp } from "@/lib/whatsapp";
import { orderSchema, type OrderInput } from "@/lib/validations";
import type { Client, Measurements } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Garment type options                                                      */
/* -------------------------------------------------------------------------- */

const GARMENT_TYPES = [
  { value: "Agbada", label: "Agbada" },
  { value: "Kaftan", label: "Kaftan" },
  { value: "Dress", label: "Dress" },
  { value: "Suit", label: "Suit" },
  { value: "Shirt", label: "Shirt" },
  { value: "Trousers", label: "Trousers" },
  { value: "Skirt", label: "Skirt" },
  { value: "Blouse", label: "Blouse" },
  { value: "Gown", label: "Gown" },
  { value: "Other", label: "Other" },
] as const;

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

function NewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const preselectedClientId = searchParams.get("clientId");
  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);

  // Role-based Price Lock ("Oga Protocol")
  const userRole = (session?.user as Record<string, unknown>)?.role as string || "owner";
  const isOwner = userRole === "owner";

  const [loading, setLoading] = useState(false);
  const [fetchingOrder, setFetchingOrder] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [priceUnlocked, setPriceUnlocked] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [verifyingPin, setVerifyingPin] = useState(false);

  const [selectedClientMeasurements, setSelectedClientMeasurements] =
    useState<Measurements | null>(null);
  const [showFabricCalc, setShowFabricCalc] = useState(false);

  // AI Price Suggestion
  const [aiSuggestion, setAiSuggestion] = useState<{
    suggestedPrice: number;
    priceRangeLow: number;
    priceRangeHigh: number;
    reasoning: string;
    factors: string[];
    source: "ai" | "heuristic";
  } | null>(null);
  const [loadingAiPrice, setLoadingAiPrice] = useState(false);
  const [aiPriceError, setAiPriceError] = useState<string | null>(null);

  // AI Quotation Generator
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLang, setQuoteLang] = useState<"english" | "pidgin">("english");

  // Price is locked for non-owners when editing (unless unlocked via PIN)
  const isPriceLocked = isEditing && !isOwner && !priceUnlocked;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      clientId: preselectedClientId || "",
      title: "",
      description: "",
      garmentType: "",
      fabric: "",
      price: 0,
      depositPaid: 0,
      dueDate: "",
      notes: "",
    },
  });

  /* ---- Fetch clients ---- */
  const fetchClients = useCallback(async () => {
    try {
      setLoadingClients(true);
      const res = await fetch("/api/clients?limit=50");
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch clients");
      }

      setClients(json.data.clients);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load clients"
      );
    } finally {
      setLoadingClients(false);
    }
  }, []);

  /* ---- Fetch existing order when editing ---- */
  const fetchOrder = useCallback(async () => {
    if (!editId) return;

    try {
      setFetchingOrder(true);
      const res = await fetch(`/api/orders/${editId}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Order not found");
      }

      const order = json.data;
      reset({
        clientId: order.clientId,
        title: order.title,
        description: order.description || "",
        garmentType: order.garmentType,
        fabric: order.fabric || "",
        price: order.price,
        depositPaid: order.depositPaid || 0,
        dueDate: order.dueDate
          ? new Date(order.dueDate).toISOString().split("T")[0]
          : "",
        notes: order.notes || "",
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load order"
      );
      router.push("/orders");
    } finally {
      setFetchingOrder(false);
    }
  }, [editId, reset, router]);

  useEffect(() => {
    fetchClients();
    fetchOrder();
  }, [fetchClients, fetchOrder]);

  /* ---- Pre-select client from query param ---- */
  useEffect(() => {
    if (preselectedClientId && !isEditing) {
      setValue("clientId", preselectedClientId);
    }
  }, [preselectedClientId, isEditing, setValue]);

  /* ---- Watch client selection to load measurements ---- */
  const watchedClientId = watch("clientId");
  const watchedGarmentType = watch("garmentType");

  useEffect(() => {
    if (!watchedClientId) {
      setSelectedClientMeasurements(null);
      return;
    }
    const selected = clients.find((c) => c._id === watchedClientId);
    setSelectedClientMeasurements(selected?.measurements || null);
  }, [watchedClientId, clients]);

  /* ---- Owner Override PIN verification ---- */
  const handleVerifyPin = async () => {
    if (pinInput.length !== 4) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    try {
      setVerifyingPin(true);
      const res = await fetch("/api/designer/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Invalid PIN");
      }

      setPriceUnlocked(true);
      setShowPinDialog(false);
      setPinInput("");
      toast.success("Price field unlocked by owner override");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid PIN");
      setPinInput("");
    } finally {
      setVerifyingPin(false);
    }
  };

  /* ---- AI Price Suggestion ---- */
  const handleGetAiPrice = async () => {
    const garmentType = watch("garmentType");
    if (!garmentType) {
      toast.error("Select a garment type first");
      return;
    }

    try {
      setLoadingAiPrice(true);
      setAiPriceError(null);
      setAiSuggestion(null);

      const res = await fetch("/api/ai/price-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garmentType,
          fabric: watch("fabric"),
          description: watch("description"),
          measurements: selectedClientMeasurements || undefined,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setAiPriceError(json.error || "Couldn't get a price suggestion right now");
        return;
      }

      setAiSuggestion(json.data);
    } catch {
      setAiPriceError("Couldn't reach the pricing assistant. Try again in a moment.");
    } finally {
      setLoadingAiPrice(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setValue("price", aiSuggestion.suggestedPrice);
    toast.success("Applied AI-suggested price");
  };

  /* ---- AI Quotation Generator ---- */
  const handleGenerateQuote = async (lang: "english" | "pidgin" = quoteLang) => {
    const garmentType = watch("garmentType");
    const price = watch("price");
    const client = clients.find((c) => c._id === watch("clientId"));

    if (!client) {
      toast.error("Select a client first");
      return;
    }
    if (!garmentType || !price) {
      toast.error("Add a garment type and price first");
      return;
    }

    try {
      setLoadingQuote(true);
      setQuoteError(null);
      setQuoteLang(lang);

      const res = await fetch("/api/ai/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: client.name,
          garmentType,
          fabric: watch("fabric"),
          description: watch("description"),
          price: Number(price),
          depositPercent: 50,
          dueDate: watch("dueDate") || undefined,
          lang,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setQuoteError(json.error || "Couldn't generate a quote right now");
        return;
      }

      setQuoteMessage(json.data.message);
      setShowQuoteDialog(true);
    } catch {
      setQuoteError("Couldn't reach the quotation assistant. Try again in a moment.");
    } finally {
      setLoadingQuote(false);
    }
  };

  const sendQuoteViaWhatsApp = () => {
    const client = clients.find((c) => c._id === watch("clientId"));
    if (!client || !quoteMessage) return;
    const url = whatsapp.custom(client.phone, quoteMessage);
    window.open(url, "_blank");
  };

  /* ---- Submit handler ---- */
  const onSubmit = async (data: OrderInput) => {
    try {
      setLoading(true);

      const url = isEditing ? `/api/orders/${editId}` : "/api/orders";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          price: Number(data.price),
          depositPaid: Number(data.depositPaid) || 0,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to save order");
      }

      toast.success(
        isEditing
          ? "Order updated successfully"
          : "Order created successfully"
      );

      const newOrderId = isEditing ? editId : json.data._id;
      router.push(`/orders/${newOrderId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save order"
      );
    } finally {
      setLoading(false);
    }
  };

  const clientOptions = clients.map((c) => ({
    value: c._id,
    label: c.name,
  }));

  const isFormLoading = fetchingOrder || loadingClients;

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[#1A1A2E]/55 transition-colors hover:text-[#1A1A2E]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39] to-[#D4A853]">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A1A2E]">
              {isEditing ? "Edit Order" : "New Order"}
            </h1>
            <p className="text-sm text-[#1A1A2E]/50">
              {isEditing
                ? "Update order details"
                : "Create a new garment order for a client"}
            </p>
          </div>
        </div>

        {/* Form */}
        <GlassCard padding="lg" gradientBorder>
          {isFormLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 animate-pulse rounded bg-[#1A1A2E]/8" />
                  <div className="h-10 animate-pulse rounded-lg bg-[#1A1A2E]/6" />
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Client select */}
              <Select
                label="Client"
                placeholder="Select a client"
                error={errors.clientId?.message}
                options={clientOptions}
                {...register("clientId")}
              />

              {/* Order title */}
              <Input
                label="Order Title"
                placeholder="e.g., Wedding Agbada Set"
                error={errors.title?.message}
                {...register("title")}
              />

              {/* Garment type */}
              <Select
                label="Garment Type"
                placeholder="Select garment type"
                error={errors.garmentType?.message}
                options={GARMENT_TYPES.map((g) => ({
                  value: g.value,
                  label: g.label,
                }))}
                {...register("garmentType")}
              />

              {/* Description */}
              <Textarea
                label="Description (Optional)"
                placeholder="Describe the garment details, style preferences..."
                rows={3}
                error={errors.description?.message}
                {...register("description")}
              />

              {/* Fabric */}
              <Input
                label="Fabric (Optional)"
                placeholder="e.g., Ankara, Lace, Guinea Brocade"
                error={errors.fabric?.message}
                {...register("fabric")}
              />

              {/* Fabric Calculator */}
              {selectedClientMeasurements && watchedGarmentType && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowFabricCalc(!showFabricCalc)}
                    className="flex items-center gap-2 text-xs font-medium text-[#C75B39] transition-colors hover:text-[#C75B39]/80"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    {showFabricCalc
                      ? "Hide Fabric Estimate"
                      : "Estimate Fabric Needed"}
                  </button>
                  {showFabricCalc && (
                    <div className="mt-3">
                      <FabricCalculator
                        measurements={selectedClientMeasurements}
                        initialGarment={watchedGarmentType.toLowerCase()}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* AI Price Suggestion */}
              {watchedGarmentType && !isPriceLocked && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGetAiPrice}
                    disabled={loadingAiPrice}
                    className="flex items-center gap-2 text-xs font-medium text-[#C75B39] transition-colors hover:text-[#C75B39]/80 disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {loadingAiPrice ? "Thinking..." : "Get AI Price Suggestion"}
                  </button>

                  {aiPriceError && (
                    <p className="text-xs text-destructive">{aiPriceError}</p>
                  )}

                  {aiSuggestion && (
                    <div className="rounded-xl border border-[#D4A853]/30 bg-gradient-to-br from-[#D4A853]/10 to-[#C75B39]/5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-[#1A1A2E]/55">Suggested price</p>
                          <p className="text-lg font-bold text-[#1A1A2E]">
                            ₦{aiSuggestion.suggestedPrice.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-[#1A1A2E]/45">
                            Range: ₦{aiSuggestion.priceRangeLow.toLocaleString()} – ₦{aiSuggestion.priceRangeHigh.toLocaleString()}
                          </p>
                        </div>
                        <Button type="button" size="sm" onClick={applyAiSuggestion}>
                          Use this price
                        </Button>
                      </div>
                      {aiSuggestion.reasoning && (
                        <p className="mt-3 text-xs text-[#1A1A2E]/65">{aiSuggestion.reasoning}</p>
                      )}
                      {aiSuggestion.factors.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {aiSuggestion.factors.map((f, i) => (
                            <li key={i} className="text-[11px] text-[#1A1A2E]/50">• {f}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Price and Deposit row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="w-full space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    Price (NGN)
                    {isPriceLocked && (
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      NGN
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                      disabled={isPriceLocked}
                      className="glass-input flex h-10 w-full rounded-lg pl-12 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      {...register("price", { valueAsNumber: true })}
                    />
                  </div>
                  {isPriceLocked && (
                    <button
                      type="button"
                      onClick={() => setShowPinDialog(true)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-[#C75B39] transition-colors hover:text-[#C75B39]/80"
                    >
                      <Lock className="h-3 w-3" />
                      Request Owner Override (PIN)
                    </button>
                  )}
                  {errors.price && (
                    <p className="text-xs text-destructive">
                      {errors.price.message}
                    </p>
                  )}
                </div>

                <div className="w-full space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Deposit Paid (NGN)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      NGN
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                      className="glass-input flex h-10 w-full rounded-lg pl-12 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      {...register("depositPaid", { valueAsNumber: true })}
                    />
                  </div>
                  {errors.depositPaid && (
                    <p className="text-xs text-destructive">
                      {errors.depositPaid.message}
                    </p>
                  )}
                </div>
              </div>

              {/* AI Quotation Generator */}
              {watchedClientId && watchedGarmentType && watch("price") > 0 && (
                <div className="rounded-xl border border-[#1A1A2E]/8 bg-[#1A1A2E]/[0.02] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateQuote(quoteLang)}
                      disabled={loadingQuote}
                      className="flex items-center gap-2 text-xs font-medium text-[#C75B39] transition-colors hover:text-[#C75B39]/80 disabled:opacity-50"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {loadingQuote ? "Writing quote..." : "Generate Client Quote (WhatsApp)"}
                    </button>
                    <div className="flex overflow-hidden rounded-md border border-[#1A1A2E]/10 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setQuoteLang("english")}
                        className={`px-2 py-1 ${quoteLang === "english" ? "bg-[#C75B39] text-white" : "bg-transparent text-[#1A1A2E]/50"}`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuoteLang("pidgin")}
                        className={`px-2 py-1 ${quoteLang === "pidgin" ? "bg-[#C75B39] text-white" : "bg-transparent text-[#1A1A2E]/50"}`}
                      >
                        Pidgin
                      </button>
                    </div>
                  </div>
                  {quoteError && (
                    <p className="mt-2 text-xs text-destructive">{quoteError}</p>
                  )}
                </div>
              )}

              {/* Due date */}
              <Input
                label="Due Date (Optional)"
                type="date"
                error={errors.dueDate?.message}
                {...register("dueDate")}
              />

              {/* Notes */}
              <Textarea
                label="Notes (Optional)"
                placeholder="Any additional notes about this order..."
                rows={3}
                error={errors.notes?.message}
                {...register("notes")}
              />

              {/* Submit buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={loading}>
                  <Save className="h-4 w-4" />
                  {isEditing ? "Update Order" : "Create Order"}
                </Button>
              </div>
            </form>
          )}
        </GlassCard>

        {/* Owner Override PIN Dialog */}
        <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
          <DialogContent>
            <DialogClose />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#C75B39]" />
                Owner Override Required
              </DialogTitle>
              <DialogDescription>
                The price field is locked. Ask the account owner (Oga) to enter
                their 4-digit PIN to authorize this change.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-amber-50/50 border border-amber-200 px-4 py-3">
                <p className="text-xs text-amber-700">
                  Hand the phone to the Oga. Only the account owner knows this PIN.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#1A1A2E]/55">
                  4-Digit Owner PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="w-full rounded-lg border border-[#1A1A2E]/10 bg-white/70 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-[#C75B39]/40 focus:ring-1 focus:ring-[#C75B39]/20 placeholder:tracking-[0.3em]"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPinDialog(false);
                    setPinInput("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyPin}
                  loading={verifyingPin}
                  disabled={pinInput.length !== 4}
                >
                  Verify PIN
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Quotation Preview Dialog */}
        <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
          <DialogContent>
            <DialogClose />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#C75B39]" />
                Client Quote
              </DialogTitle>
              <DialogDescription>
                Edit if needed, then send it straight to your client on WhatsApp.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <textarea
                value={quoteMessage}
                onChange={(e) => setQuoteMessage(e.target.value)}
                rows={9}
                className="w-full rounded-lg border border-[#1A1A2E]/10 bg-white/70 px-4 py-3 text-sm text-[#1A1A2E] outline-none focus:border-[#C75B39]/40 focus:ring-1 focus:ring-[#C75B39]/20"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>
                  Close
                </Button>
                <Button onClick={sendQuoteViaWhatsApp}>
                  <MessageCircle className="h-4 w-4" />
                  Send via WhatsApp
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense>
      <NewOrderForm />
    </Suspense>
  );
}
