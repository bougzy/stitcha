"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminActivityLog {
  _id: string;
  designerId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
  designer?: {
    name: string;
    email: string;
    businessName: string;
  } | null;
}

const entityColors: Record<string, { bg: string; text: string }> = {
  client: { bg: "bg-blue-500/20", text: "text-blue-300" },
  order: { bg: "bg-amber-500/20", text: "text-amber-300" },
  payment: { bg: "bg-emerald-500/20", text: "text-emerald-300" },
  measurement: { bg: "bg-purple-500/20", text: "text-purple-300" },
  settings: { bg: "bg-gray-500/20", text: "text-gray-300" },
};

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityFilter, setEntityFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (entityFilter) params.set("entity", entityFilter);
      const res = await fetch(`/api/admin/activity?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
        setTotalPages(json.data.pagination.totalPages);
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [page, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
        <p className="mt-1 text-sm text-white/40">
          Monitor all actions across the platform
        </p>
      </div>

      {/* Entity filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-white/30" />
        {["", "client", "order", "payment", "measurement", "settings"].map(
          (e) => (
            <button
              key={e}
              onClick={() => {
                setEntityFilter(e);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                entityFilter === e
                  ? "bg-[#C75B39] text-white"
                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
              )}
            >
              {e === "" ? "All" : e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-white/5"
            />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-12 text-center">
          <p className="text-sm text-white/40">No activity logs found.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log, i) => {
            const colors =
              entityColors[log.entity] || entityColors.settings;

            return (
              <motion.div
                key={log._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-start gap-3 rounded-xl border border-transparent bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]"
              >
                <div className="mt-0.5">
                  <Clock className="h-4 w-4 text-white/15" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white/80">
                      {log.designer?.name || "Unknown"}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase",
                        colors.bg,
                        colors.text
                      )}
                    >
                      {log.entity}
                    </span>
                    <span className="text-xs text-white/30">
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </div>
                  {log.details && (
                    <p className="mt-0.5 truncate text-xs text-white/25">
                      {log.details}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-white/15">
                    {format(
                      new Date(log.createdAt),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                    {log.designer?.email && (
                      <span className="ml-2 text-white/10">
                        {log.designer.email}
                      </span>
                    )}
                  </p>
                </div>
              </motion.div>
            );
          })}
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
