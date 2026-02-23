"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ShieldCheck,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Crown,
  Zap,
  Star,
  Activity,
  Clock,
  UserPlus,
  Filter,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { StatCard } from "@/components/common/stat-card";
import { SectionLoader } from "@/components/common/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, getInitials } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface AdminStats {
  totalDesigners: number;
  planDistribution: Record<string, number>;
  recentSignups: number;
  totalOrders: number;
  totalRevenue: number;
  totalCollected: number;
  totalActivityLogs: number;
}

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
  createdAt: string;
}

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

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "designers" | "activity">("overview");

  const role = (session?.user as { role?: string } | undefined)?.role;

  useEffect(() => {
    if (status === "authenticated" && role !== "admin") {
      toast.error("Admin access required");
      router.push("/dashboard");
    }
  }, [status, role, router]);

  if (status === "loading") {
    return (
      <PageTransition>
        <SectionLoader lines={5} />
      </PageTransition>
    );
  }

  if (role !== "admin") {
    return (
      <PageTransition>
        <GlassCard padding="lg">
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <ShieldCheck className="h-12 w-12 text-[#1A1A2E]/20" />
            <h2 className="text-xl font-bold text-[#1A1A2E]">Admin Access Required</h2>
            <p className="text-sm text-[#1A1A2E]/50">
              You don&apos;t have permission to view this page.
            </p>
            <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
          </div>
        </GlassCard>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-[#C75B39]" />
              <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] lg:text-3xl">
                Admin Dashboard
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#1A1A2E]/50">
              Platform overview and designer management
            </p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-[#1A1A2E]/[0.03] p-1">
          {(["overview", "designers", "activity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                activeTab === tab
                  ? "bg-white text-[#1A1A2E] shadow-sm"
                  : "text-[#1A1A2E]/50 hover:text-[#1A1A2E]/70"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "designers" && <DesignersTab />}
        {activeTab === "activity" && <ActivityTab />}
      </div>
    </PageTransition>
  );
}

/* -------------------------------------------------------------------------- */
/*  Overview Tab                                                               */
/* -------------------------------------------------------------------------- */

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        const json = await res.json();
        if (json.success) setStats(json.data);
      } catch {
        toast.error("Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <SectionLoader lines={5} />;
  if (!stats) return <p className="text-sm text-[#1A1A2E]/50">Failed to load stats.</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Designers" value={stats.totalDesigners} />
        <StatCard icon={UserPlus} label="New (30d)" value={stats.recentSignups} />
        <StatCard icon={Package} label="Total Orders" value={stats.totalOrders} />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
        />
      </div>

      {/* Plan Distribution */}
      <GlassCard padding="lg">
        <h2 className="mb-4 text-lg font-bold text-[#1A1A2E]">Plan Distribution</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { id: "free", name: "Starter", icon: Star, color: "text-gray-500", bg: "bg-gray-50" },
            { id: "pro", name: "Professional", icon: Zap, color: "text-[#C75B39]", bg: "bg-[#C75B39]/5" },
            { id: "business", name: "Business", icon: Crown, color: "text-[#D4A853]", bg: "bg-[#D4A853]/5" },
          ].map((plan) => {
            const count = stats.planDistribution[plan.id] || 0;
            const pct = stats.totalDesigners > 0
              ? Math.round((count / stats.totalDesigners) * 100)
              : 0;

            return (
              <div
                key={plan.id}
                className={cn("rounded-xl border border-transparent p-4", plan.bg)}
              >
                <div className="flex items-center gap-3">
                  <plan.icon className={cn("h-5 w-5", plan.color)} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1A1A2E]">{plan.name}</p>
                    <p className="text-2xl font-bold text-[#1A1A2E]">{count}</p>
                  </div>
                  <span className="text-sm font-medium text-[#1A1A2E]/40">{pct}%</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1A1A2E]/8">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      plan.id === "free" && "bg-gray-400",
                      plan.id === "pro" && "bg-[#C75B39]",
                      plan.id === "business" && "bg-[#D4A853]"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Revenue Summary */}
      <GlassCard padding="lg">
        <h2 className="mb-4 text-lg font-bold text-[#1A1A2E]">Revenue Summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-emerald-50/80 p-4">
            <p className="text-xs font-medium text-emerald-600">Total Revenue</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </div>
          <div className="rounded-xl bg-blue-50/80 p-4">
            <p className="text-xs font-medium text-blue-600">Collected</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">
              {formatCurrency(stats.totalCollected)}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50/80 p-4">
            <p className="text-xs font-medium text-amber-600">Outstanding</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {formatCurrency(stats.totalRevenue - stats.totalCollected)}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Platform Activity */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#1A1A2E]/40" />
          <h2 className="text-lg font-bold text-[#1A1A2E]">Platform Activity</h2>
        </div>
        <p className="mt-2 text-sm text-[#1A1A2E]/50">
          {stats.totalActivityLogs.toLocaleString()} total activity log entries
        </p>
      </GlassCard>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Designers Tab                                                              */
/* -------------------------------------------------------------------------- */

function DesignersTab() {
  const [designers, setDesigners] = useState<AdminDesigner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
      toast.error("Failed to load designers");
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter]);

  useEffect(() => {
    fetchDesigners();
  }, [fetchDesigners]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchDesigners();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Search & Filters */}
      <GlassCard padding="md">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              placeholder="Search by name, email, or business..."
              icon={<Search />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {["", "free", "pro", "business"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setPlanFilter(f); setPage(1); }}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  planFilter === f
                    ? "bg-[#C75B39] text-white"
                    : "bg-[#1A1A2E]/5 text-[#1A1A2E]/60 hover:bg-[#1A1A2E]/10"
                )}
              >
                {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </form>
        <p className="mt-2 text-xs text-[#1A1A2E]/40">
          {total} designer{total !== 1 ? "s" : ""} found
        </p>
      </GlassCard>

      {/* Designers List */}
      {loading ? (
        <SectionLoader lines={5} />
      ) : designers.length === 0 ? (
        <GlassCard padding="lg">
          <p className="text-center text-sm text-[#1A1A2E]/50">
            No designers found matching your criteria.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {designers.map((d) => (
            <GlassCard key={d._id} padding="md" hover>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Avatar & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C75B39]/15 to-[#D4A853]/15">
                    <span className="text-sm font-semibold text-[#C75B39]">
                      {getInitials(d.name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[#1A1A2E]">
                        {d.name}
                      </p>
                      {d.role === "admin" && (
                        <Badge variant="default" className="text-[9px]">Admin</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#1A1A2E]/45">{d.email}</p>
                    <p className="truncate text-xs text-[#1A1A2E]/35">{d.businessName}</p>
                  </div>
                </div>

                {/* Plan & Stats */}
                <div className="flex items-center gap-4 text-xs">
                  <Badge
                    variant={
                      d.subscription === "business"
                        ? "default"
                        : d.subscription === "pro"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {d.subscription}
                  </Badge>
                  <div className="text-center">
                    <p className="font-bold text-[#1A1A2E]">
                      {d.lifetimeCounts?.totalClientsCreated ?? 0}
                    </p>
                    <p className="text-[#1A1A2E]/35">clients</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[#1A1A2E]">
                      {d.lifetimeCounts?.totalOrdersCreated ?? 0}
                    </p>
                    <p className="text-[#1A1A2E]/35">orders</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="font-bold text-[#1A1A2E]">
                      {d.lifetimeCounts?.totalScansUsed ?? 0}
                    </p>
                    <p className="text-[#1A1A2E]/35">scans</p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-[#1A1A2E]/40">
                      Joined {format(new Date(d.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-[#1A1A2E]/50">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Activity Tab                                                               */
/* -------------------------------------------------------------------------- */

function ActivityTab() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityFilter, setEntityFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (entityFilter) params.set("entity", entityFilter);
      const res = await fetch(`/api/admin/activity?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
        setTotalPages(json.data.pagination.totalPages);
      }
    } catch {
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  }, [page, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const entityColors: Record<string, string> = {
    client: "bg-blue-100 text-blue-700",
    order: "bg-amber-100 text-amber-700",
    payment: "bg-emerald-100 text-emerald-700",
    measurement: "bg-purple-100 text-purple-700",
    settings: "bg-gray-100 text-gray-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Entity filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[#1A1A2E]/40" />
        {["", "client", "order", "payment", "measurement", "settings"].map((e) => (
          <button
            key={e}
            onClick={() => { setEntityFilter(e); setPage(1); }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              entityFilter === e
                ? "bg-[#C75B39] text-white"
                : "bg-[#1A1A2E]/5 text-[#1A1A2E]/60 hover:bg-[#1A1A2E]/10"
            )}
          >
            {e === "" ? "All" : e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      {/* Activity List */}
      {loading ? (
        <SectionLoader lines={8} />
      ) : logs.length === 0 ? (
        <GlassCard padding="lg">
          <p className="text-center text-sm text-[#1A1A2E]/50">
            No activity logs found.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-1.5">
          {logs.map((log) => (
            <div
              key={log._id}
              className="flex items-start gap-3 rounded-xl border border-transparent bg-white/50 px-4 py-3 transition-colors hover:bg-white/80"
            >
              <div className="mt-0.5">
                <Clock className="h-4 w-4 text-[#1A1A2E]/25" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[#1A1A2E]">
                    {log.designer?.name || "Unknown"}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px]",
                      entityColors[log.entity] || "bg-gray-100 text-gray-700"
                    )}
                  >
                    {log.entity}
                  </Badge>
                  <span className="text-xs text-[#1A1A2E]/40">
                    {log.action.replace(/_/g, " ")}
                  </span>
                </div>
                {log.details && (
                  <p className="mt-0.5 truncate text-xs text-[#1A1A2E]/45">
                    {log.details}
                  </p>
                )}
                <p className="mt-0.5 text-[10px] text-[#1A1A2E]/30">
                  {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  {log.designer?.email && (
                    <span className="ml-2">{log.designer.email}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-[#1A1A2E]/50">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
