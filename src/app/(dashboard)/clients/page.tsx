"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Plus, Search, Users, Filter } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/common/page-transition";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientCard } from "@/components/clients/client-card";
import { cn } from "@/lib/utils";
import type { Client } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Filter tabs                                                               */
/* -------------------------------------------------------------------------- */

const GENDER_TABS = [
  { key: "all", label: "All" },
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
] as const;

type GenderFilter = (typeof GENDER_TABS)[number]["key"];

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */

function ClientCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-white/40 backdrop-blur-md",
        "shadow-[0_8px_32px_rgba(26,26,46,0.06)]",
        "animate-pulse p-4"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-[#1A1A2E]/8" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded bg-[#1A1A2E]/8" />
            <div className="h-4 w-12 rounded-full bg-[#1A1A2E]/6" />
          </div>
          <div className="h-3 w-32 rounded bg-[#1A1A2E]/6" />
          <div className="h-3 w-28 rounded bg-[#1A1A2E]/5" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");

  /* ---- Fetch clients ---- */
  const fetchClients = useCallback(async () => {
    try {
      if (clients.length === 0) setLoading(true);
      else setSearching(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (genderFilter !== "all") params.set("gender", genderFilter);

      const res = await fetch(`/api/clients?${params.toString()}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch clients");
      }

      setClients(json.data.clients);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load clients");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [search, genderFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const debounce = setTimeout(fetchClients, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [fetchClients, search]);

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Clients</h1>
            <p className="mt-1 text-sm text-[#1A1A2E]/55">
              Manage your client profiles and measurements
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open("/api/clients/export", "_blank")}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => router.push("/clients/new")} size="lg">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <Input
          placeholder="Search clients by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search />}
          iconPosition="left"
          className="bg-white/50"
        />

        {/* Filter tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-white/30 p-1 backdrop-blur-sm">
          {GENDER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setGenderFilter(tab.key)}
              className={cn(
                "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                genderFilter === tab.key
                  ? "bg-white/80 text-[#1A1A2E] shadow-sm"
                  : "text-[#1A1A2E]/50 hover:text-[#1A1A2E]/70"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Client grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ClientCardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={search ? Filter : Users}
            title={search ? "No clients found" : "No clients yet"}
            description={
              search
                ? `No clients match "${search}". Try a different search term.`
                : "Add your first client to start managing measurements and orders."
            }
            action={
              !search ? (
                <Button onClick={() => router.push("/clients/new")}>
                  <Plus className="h-4 w-4" />
                  Add Your First Client
                </Button>
              ) : undefined
            }
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            {clients.map((client, index) => (
              <ClientCard key={client._id} client={client} index={index} />
            ))}
          </motion.div>
        )}

        {/* Client count */}
        {!loading && clients.length > 0 && (
          <p className="text-center text-xs text-[#1A1A2E]/40">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </PageTransition>
  );
}
