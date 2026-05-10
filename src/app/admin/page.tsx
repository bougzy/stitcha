"use client";

/* -------------------------------------------------------------------------- */
/*  Admin Overview                                                              */
/*                                                                              */
/*  System-wide rollup. Every tile links to the deeper management view.       */
/* -------------------------------------------------------------------------- */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Package,
  ScanLine,
  Banknote,
  Compass,
  Sparkles,
  Megaphone,
  Clock,
  TrendingUp,
  ShieldOff,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

interface AdminStats {
  designers: { total: number; newLast30: number; suspended: number; plans: Record<string, number> };
  clients:   { total: number };
  orders:    { total: number; thisMonth: number; totalRevenue: number; totalCollected: number };
  scans:     { total: number; completedLast30: number };
  discover:  { featuredPosts: number; activeBoosts: number };
  addons:    { activeStudio: number; totalSmsBalance: number };
  payments:  { pending: number; verifiedThisMonth: number; manualRevenue: number; platformRevenue: number };
  broadcasts:{ thisMonth: number };
  totalActivityLogs: number;
}

function formatNGN(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/stats");
      const json = await res.json();
      if (json.success) setStats(json.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-white/5" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center">
        <p className="text-sm text-white/40">Failed to load stats.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform overview</h1>
          <p className="mt-1 text-sm text-white/45">
            Real-time signal across every Stitcha designer.
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.04] px-3 text-xs font-medium text-white/65 hover:bg-white/[0.08]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {/* Urgent attention strip */}
      {(stats.payments.pending > 0 || stats.designers.suspended > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {stats.payments.pending > 0 && (
            <Link
              href="/admin/payments"
              className="group flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/[0.10] to-amber-500/[0.05] p-4 transition-colors hover:border-amber-500/60"
            >
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-200">
                  {stats.payments.pending} payment{stats.payments.pending === 1 ? "" : "s"} awaiting verification
                </p>
                <p className="text-xs text-amber-200/60">
                  Verify in one tap to activate the feature for the designer.
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-amber-300/60 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          {stats.designers.suspended > 0 && (
            <Link
              href="/admin/designers"
              className="group flex items-start gap-3 rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-500/[0.10] to-red-500/[0.05] p-4 transition-colors hover:border-red-500/60"
            >
              <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-200">
                  {stats.designers.suspended} suspended designer{stats.designers.suspended === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-red-200/60">Review the queue and restore where appropriate.</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-red-300/60 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      )}

      {/* Section: People + commerce */}
      <Section title="People & commerce">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            href="/admin/designers"
            icon={<Users className="h-5 w-5" />}
            label="Designers"
            value={stats.designers.total}
            sub={`+${stats.designers.newLast30} last 30d`}
            tone="primary"
          />
          <Tile
            href={null}
            icon={<Users className="h-5 w-5" />}
            label="Clients"
            value={stats.clients.total}
            sub="Across all designers"
            tone="neutral"
          />
          <Tile
            href="/admin/orders"
            icon={<Package className="h-5 w-5" />}
            label="Orders"
            value={stats.orders.total}
            sub={`${stats.orders.thisMonth} this month`}
            tone="neutral"
          />
          <Tile
            href={null}
            icon={<TrendingUp className="h-5 w-5" />}
            label="Order revenue"
            value={formatNGN(stats.orders.totalCollected)}
            sub="Designer earnings"
            tone="emerald"
          />
        </div>

        {/* Plan distribution */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <PlanBar
            label="Free"
            value={stats.designers.plans.free ?? 0}
            total={stats.designers.total}
            tone="neutral"
          />
          <PlanBar
            label="Plus"
            value={stats.designers.plans.plus ?? 0}
            total={stats.designers.total}
            tone="primary"
          />
          <PlanBar
            label="Pro"
            value={stats.designers.plans.pro ?? 0}
            total={stats.designers.total}
            tone="gold"
          />
        </div>
      </Section>

      {/* Section: Stitcha revenue */}
      <Section title="Platform revenue (manual + Paystack)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            href="/admin/payments"
            icon={<Banknote className="h-5 w-5" />}
            label="Pending verification"
            value={stats.payments.pending}
            sub="Manual transfers"
            tone={stats.payments.pending > 0 ? "amber" : "neutral"}
            urgent={stats.payments.pending > 0}
          />
          <Tile
            href="/admin/payments"
            icon={<Banknote className="h-5 w-5" />}
            label="Verified this month"
            value={stats.payments.verifiedThisMonth}
            sub="Manual payments"
            tone="neutral"
          />
          <Tile
            href={null}
            icon={<TrendingUp className="h-5 w-5" />}
            label="Manual revenue"
            value={formatNGN(stats.payments.manualRevenue)}
            sub="Lifetime, verified"
            tone="emerald"
          />
          <Tile
            href={null}
            icon={<Sparkles className="h-5 w-5" />}
            label="Active addons"
            value={stats.addons.activeStudio}
            sub={`${stats.addons.totalSmsBalance.toLocaleString("en-NG")} SMS in float`}
            tone="gold"
          />
        </div>
      </Section>

      {/* Section: AI + Discover */}
      <Section title="AI scans & Discover feed">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            href={null}
            icon={<ScanLine className="h-5 w-5" />}
            label="Scan sessions"
            value={stats.scans.total}
            sub={`${stats.scans.completedLast30} completed last 30d`}
            tone="primary"
          />
          <Tile
            href="/admin/discover"
            icon={<Compass className="h-5 w-5" />}
            label="Featured posts"
            value={stats.discover.featuredPosts}
            sub="On Discover feed"
            tone="neutral"
          />
          <Tile
            href="/admin/discover"
            icon={<Sparkles className="h-5 w-5" />}
            label="Active boosts"
            value={stats.discover.activeBoosts}
            sub="Paid pinned posts"
            tone="amber"
          />
          <Tile
            href={null}
            icon={<Megaphone className="h-5 w-5" />}
            label="Broadcasts this month"
            value={stats.broadcasts.thisMonth}
            sub="Designer outreach"
            tone="neutral"
          />
        </div>
      </Section>

      {/* Section: Quick actions */}
      <Section title="Quick actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionTile
            href="/admin/payments"
            icon={<Banknote className="h-5 w-5" />}
            title="Verify payments"
            description={`${stats.payments.pending} in queue`}
          />
          <ActionTile
            href="/admin/designers"
            icon={<Users className="h-5 w-5" />}
            title="Manage designers"
            description="Subscriptions, grants, suspend"
          />
          <ActionTile
            href="/admin/announce"
            icon={<Megaphone className="h-5 w-5" />}
            title="Send announcement"
            description="In-app notification to all designers"
          />
          <ActionTile
            href="/admin/orders"
            icon={<Package className="h-5 w-5" />}
            title="Browse orders"
            description="System-wide order list"
          />
          <ActionTile
            href="/admin/discover"
            icon={<Compass className="h-5 w-5" />}
            title="Moderate Discover"
            description="Review featured + boosted posts"
          />
          <ActionTile
            href="/admin/activity"
            icon={<TrendingUp className="h-5 w-5" />}
            title="Activity log"
            description={`${stats.totalActivityLogs.toLocaleString("en-NG")} events`}
          />
        </div>
      </Section>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">
        {title}
      </h2>
      {children}
    </section>
  );
}

const TONES = {
  primary: { ring: "border-purple-500/20 bg-purple-500/[0.04]", icon: "text-purple-300" },
  emerald: { ring: "border-emerald-500/20 bg-emerald-500/[0.04]", icon: "text-emerald-300" },
  gold:    { ring: "border-amber-500/25 bg-amber-500/[0.04]", icon: "text-amber-300" },
  amber:   { ring: "border-amber-500/40 bg-amber-500/[0.08]", icon: "text-amber-300" },
  neutral: { ring: "border-white/8 bg-white/[0.02]", icon: "text-white/55" },
} as const;

function Tile({
  href,
  icon,
  label,
  value,
  sub,
  tone,
  urgent,
}: {
  href: string | null;
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  tone: keyof typeof TONES;
  urgent?: boolean;
}) {
  const palette = TONES[tone];
  const inner = (
    <div
      className={`group h-full rounded-2xl border p-4 transition-colors ${palette.ring} ${
        href ? "hover:border-white/20" : ""
      } ${urgent ? "ring-1 ring-amber-500/30" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className={palette.icon}>{icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
        {href && (
          <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-white/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-white/40">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

function PlanBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "primary" | "gold" | "neutral";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const fillClass =
    tone === "primary"
      ? "bg-purple-500"
      : tone === "gold"
      ? "bg-amber-500"
      : "bg-white/30";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{label}</p>
        <p className="text-xs font-bold text-white">
          {value} <span className="text-white/40">({pct}%)</span>
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ActionTile({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4 transition-colors hover:border-[#C75B39]/30 hover:bg-white/[0.04]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39]/20 to-[#D4A853]/15 text-[#C75B39]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <p className="truncate text-[11px] text-white/45">{description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-white/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

