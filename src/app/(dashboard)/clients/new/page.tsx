"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { clientSchema, type ClientInput } from "@/lib/validations";

function NewClientForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);

  const [loading, setLoading] = useState(false);
  const [fetchingClient, setFetchingClient] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      gender: "female",
      notes: "",
    },
  });

  /* ---- Fetch existing client data when editing ---- */
  useEffect(() => {
    if (!editId) return;

    const fetchClient = async () => {
      try {
        setFetchingClient(true);
        const res = await fetch(`/api/clients/${editId}`);
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.error || "Client not found");
        }

        reset({
          name: json.data.name,
          phone: json.data.phone,
          email: json.data.email || "",
          gender: json.data.gender,
          notes: json.data.notes || "",
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load client"
        );
        router.push("/clients");
      } finally {
        setFetchingClient(false);
      }
    };

    fetchClient();
  }, [editId, reset, router]);

  /* ---- Submit handler ---- */
  const onSubmit = async (data: ClientInput) => {
    try {
      setLoading(true);

      const url = isEditing ? `/api/clients/${editId}` : "/api/clients";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to save client");
      }

      toast.success(
        isEditing
          ? "Client updated successfully"
          : "Client created successfully"
      );

      const clientId = isEditing ? editId : json.data._id;
      router.push(`/clients/${clientId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save client"
      );
    } finally {
      setLoading(false);
    }
  };

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
            <UserPlus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A1A2E]">
              {isEditing ? "Edit Client" : "New Client"}
            </h1>
            <p className="text-sm text-[#1A1A2E]/50">
              {isEditing
                ? "Update client information"
                : "Add a new client to your roster"}
            </p>
          </div>
        </div>

        {/* Form */}
        <GlassCard padding="lg" gradientBorder>
          {fetchingClient ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 animate-pulse rounded bg-[#1A1A2E]/8" />
                  <div className="h-10 animate-pulse rounded-lg bg-[#1A1A2E]/6" />
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Name */}
              <Input
                label="Full Name"
                placeholder="Enter client's full name"
                error={errors.name?.message}
                {...register("name")}
              />

              {/* Phone */}
              <Input
                label="Phone Number"
                type="tel"
                placeholder="08012345678"
                error={errors.phone?.message}
                {...register("phone")}
              />

              {/* Email */}
              <Input
                label="Email (Optional)"
                type="email"
                placeholder="client@example.com"
                error={errors.email?.message}
                {...register("email")}
              />

              {/* Gender */}
              <Select
                label="Gender"
                error={errors.gender?.message}
                options={[
                  { value: "female", label: "Female" },
                  { value: "male", label: "Male" },
                ]}
                {...register("gender")}
              />

              {/* Notes */}
              <div className="w-full space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Any special notes about this client..."
                  rows={3}
                  className="glass-input flex w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  {...register("notes")}
                />
                {errors.notes && (
                  <p className="text-xs text-destructive">
                    {errors.notes.message}
                  </p>
                )}
              </div>

              {/* Submit */}
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
                  {isEditing ? "Update Client" : "Create Client"}
                </Button>
              </div>
            </form>
          )}
        </GlassCard>
      </div>
    </PageTransition>
  );
}

export default function NewClientPage() {
  return (
    <Suspense>
      <NewClientForm />
    </Suspense>
  );
}
