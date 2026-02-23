"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  ScanLine,
  Package,
  Users as UsersIcon,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

interface AdminDesigner {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  subscription: string;
  subscriptionExpiry?: string;
  role: string;
  lifetimeCounts: {
    totalClientsCreated: number;
    totalScansUsed: number;
    totalOrdersCreated: number;
  };
  city?: string;
  state?: string;
  createdAt: string;
}

export default function AdminDesignersPage() {
  const [designers, setDesigners] = useState<AdminDesigner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchDesigners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      if (planFilter) params.set("plan", planFilter);
      const res = await fetch(`/api/admin/designers?${params}`);
      const json = await res.json();
      if (json.success) {
        setDesigners(json.data.designers);
        setTotalPages(json.data.pagination.totalPages);
        setTotal(json.data.pagination.total);
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter]);

  useEffect(() => {
    fetchDesigners();
  }, [fetchDesigners]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  const planBadgeStyles: Record<string, string> = {
    free: "bg-gray-500/20 text-gray-300 border-gray-500/20",
    pro: "bg-[#C75B39]/20 text-[#C75B39] border-[#C75B39]/20",
    business: "bg-[#D4A853]/20 text-[#D4A853] border-[#D4A853]/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Designers</h1>
        <p className="mt-1 text-sm text-white/40">
          Manage all registered designers on the platform
        </p>
      </div>

      {/* Search & Filters */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
            <input
              placeholder="Search by name, email, or business..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:border-[#C75B39]/50 focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5">
            {["", "free", "pro", "business"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setPlanFilter(f);
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  planFilter === f
                    ? "bg-[#C75B39] text-white"
                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                )}
              >
                {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </form>
        <p className="mt-2 text-xs text-white/25">
          {total} designer{total !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Designers List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      ) : designers.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-12 text-center">
          <p className="text-sm text-white/40">No designers found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {designers.map((d, i) => (
            <motion.div
              key={d._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Avatar & Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C75B39]/20 to-[#D4A853]/20">
                    <span className="text-sm font-bold text-[#C75B39]">
                      {getInitials(d.name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">
                        {d.name}
                      </p>
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase",
                          planBadgeStyles[d.subscription] ||
                            planBadgeStyles.free
                        )}
                      >
                        {d.subscription}
                      </span>
                    </div>
                    <p className="truncate text-xs text-white/35">
                      {d.businessName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-white/25">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {d.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {d.phone}
                      </span>
                      {d.city && (
                        <span>
                          {d.city}
                          {d.state ? `, ${d.state}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-white/25">
                      <UsersIcon className="h-3 w-3" />
                    </div>
                    <p className="text-lg font-bold text-white">
                      {d.lifetimeCounts?.totalClientsCreated ?? 0}
                    </p>
                    <p className="text-[10px] text-white/25">clients</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-white/25">
                      <Package className="h-3 w-3" />
                    </div>
                    <p className="text-lg font-bold text-white">
                      {d.lifetimeCounts?.totalOrdersCreated ?? 0}
                    </p>
                    <p className="text-[10px] text-white/25">orders</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-white/25">
                      <ScanLine className="h-3 w-3" />
                    </div>
                    <p className="text-lg font-bold text-white">
                      {d.lifetimeCounts?.totalScansUsed ?? 0}
                    </p>
                    <p className="text-[10px] text-white/25">scans</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="flex items-center gap-1 text-[11px] text-white/20">
                      <Calendar className="h-3 w-3" />
                      Joined
                    </div>
                    <p className="text-xs font-medium text-white/40">
                      {format(new Date(d.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/50 transition-colors hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-white/40">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/50 transition-colors hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
