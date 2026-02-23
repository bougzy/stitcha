"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Scissors, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FabricCalculator } from "@/components/common/fabric-calculator";
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
  const preselectedClientId = searchParams.get("clientId");
  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);

  const [loading, setLoading] = useState(false);
  const [fetchingOrder, setFetchingOrder] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [selectedClientMeasurements, setSelectedClientMeasurements] =
    useState<Measurements | null>(null);
  const [showFabricCalc, setShowFabricCalc] = useState(false);

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

              {/* Price and Deposit row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="w-full space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Price (NGN)
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
                      {...register("price", { valueAsNumber: true })}
                    />
                  </div>
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
