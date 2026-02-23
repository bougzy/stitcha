"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Plus, Search, Users, Filter, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/common/page-transition";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientCard } from "@/components/clients/client-card";
import { UsageBar, UpgradeModal } from "@/components/common/upgrade-modal";
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
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [usage, setUsage] = useState<{
    lifetimeClientsCreated: number;
    clientLimit: number;
    planName: string;
    subscription: string;
  } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
      if (json.data.usage) setUsage(json.data.usage);
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

  /* ---- CSV Import handler ---- */
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV file must have a header row and at least one data row");
        setImporting(false);
        return;
      }

      // Parse header
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = headers.findIndex((h) => h.includes("name"));
      const phoneIdx = headers.findIndex((h) => h.includes("phone"));
      const emailIdx = headers.findIndex((h) => h.includes("email"));
      const genderIdx = headers.findIndex((h) => h.includes("gender"));
      const notesIdx = headers.findIndex((h) => h.includes("note"));

      if (nameIdx === -1 || phoneIdx === -1) {
        toast.error("CSV must have 'name' and 'phone' columns");
        setImporting(false);
        return;
      }

      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        return {
          name: cols[nameIdx] || "",
          phone: cols[phoneIdx] || "",
          email: emailIdx >= 0 ? cols[emailIdx] : undefined,
          gender: genderIdx >= 0 ? cols[genderIdx] : undefined,
          notes: notesIdx >= 0 ? cols[notesIdx] : undefined,
        };
      });

      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json();

      if (json.success) {
        setImportResult(json.data);
        if (json.data.imported > 0) {
          fetchClients();
          toast.success(`Imported ${json.data.imported} clients`);
        }
      } else {
        toast.error(json.error || "Import failed");
      }
    } catch {
      toast.error("Failed to parse CSV file");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

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
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button variant="outline" onClick={() => window.open("/api/clients/export", "_blank")}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button onClick={() => router.push("/clients/new")} size="lg">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Usage bar — shows lifetime client usage for free plan */}
        {usage && usage.clientLimit !== -1 && (
          <UsageBar
            used={usage.lifetimeClientsCreated}
            limit={usage.clientLimit}
            planName={usage.planName}
            onUpgrade={() => setShowUpgradeModal(true)}
          />
        )}

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

      {/* Upgrade Modal */}
      {usage && (
        <UpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          lifetimeUsed={usage.lifetimeClientsCreated}
          limit={usage.clientLimit}
          planName={usage.planName}
          resource="clients"
          onUpgrade={async (planId) => {
            try {
              const res = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId }),
              });
              const json = await res.json();
              if (json.needsConfig) {
                toast.error("Payment not configured. Contact the administrator.");
                return;
              }
              if (json.success) {
                window.location.href = json.data.authorizationUrl;
              } else {
                toast.error(json.error || "Failed to start checkout");
              }
            } catch {
              toast.error("Failed to connect to payment system");
            }
          }}
        />
      )}

      {/* CSV Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A2E]/40 backdrop-blur-sm p-4" onClick={() => { setShowImport(false); setImportResult(null); }}>
          <div
            className="w-full max-w-md rounded-2xl border border-white/30 bg-white/90 p-6 shadow-[0_16px_48px_rgba(26,26,46,0.15)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
                <FileSpreadsheet className="h-5 w-5 text-[#C75B39]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1A1A2E]">Import Clients</h3>
                <p className="text-xs text-[#1A1A2E]/50">Upload a CSV file with client data</p>
              </div>
            </div>

            {!importResult ? (
              <>
                <div className="rounded-xl border-2 border-dashed border-[#C75B39]/20 bg-[#C75B39]/[0.03] p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-[#C75B39]/40" />
                  <p className="mt-3 text-sm font-medium text-[#1A1A2E]/70">
                    {importing ? "Importing..." : "Choose CSV file"}
                  </p>
                  <p className="mt-1 text-xs text-[#1A1A2E]/40">
                    Must have &quot;name&quot; and &quot;phone&quot; columns
                  </p>
                  <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-95">
                    <Upload className="h-4 w-4" />
                    {importing ? "Importing..." : "Select File"}
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvImport}
                      disabled={importing}
                    />
                  </label>
                </div>

                <div className="mt-4 rounded-lg bg-[#D4A853]/8 p-3">
                  <p className="text-xs font-medium text-[#1A1A2E]/60 mb-1">CSV format example:</p>
                  <code className="block text-[10px] text-[#1A1A2E]/50 font-mono leading-relaxed">
                    name,phone,email,gender,notes<br />
                    Amina Bello,08012345678,amina@email.com,female,VIP<br />
                    Chidi Okafor,07098765432,,male,
                  </code>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-green-50/50 p-4">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">
                      {importResult.imported} clients imported
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-xs text-[#1A1A2E]/50">
                        {importResult.skipped} skipped
                      </p>
                    )}
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-lg bg-red-50/50 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                      <p className="text-xs font-medium text-red-600">Issues:</p>
                    </div>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-[10px] text-red-500/70 leading-relaxed">{err}</p>
                    ))}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => { setShowImport(false); setImportResult(null); }}
                >
                  Done
                </Button>
              </div>
            )}

            {!importResult && (
              <button
                onClick={() => { setShowImport(false); setImportResult(null); }}
                className="mt-4 w-full text-center text-sm text-[#1A1A2E]/40 hover:text-[#1A1A2E]/60 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
