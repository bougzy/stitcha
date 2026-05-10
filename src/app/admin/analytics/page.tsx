"use client";

/* -------------------------------------------------------------------------- */
/*  /admin/analytics                                                            */
/*                                                                              */
/*  Charts powered by recharts. Range toggle (30 / 90 / 365 days).             */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  Banknote,
  Clock,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface AnalyticsData {
  rangeDays: number;
  totals: {
    lifetimeRevenue: number;
    lifetimeCount: number;
    rangeRevenue: number;
    rangeCount: number;
    pendingPayments: number;
  };
  series: {
    date: string;
    manualNGN: number;
    manualCount: number;
    signups: number;
    scans: number;
    broadcasts: number;
  }[];
  revenueByPurpose: { purpose: string; total: number; count: number }[];
  topContributors: {
    designerId: string;
    name: string;
    businessName: string | null;
    email: string | null;
    totalNGN: number;
    count: number;
  }[];
  plans: Record<string, number>;
  sla: { averageMs: number; medianMs: number; p95Ms: number; sampleCount: number };
}

const PURPOSE_LABEL: Record<string, string> = {
  subscription: "Subscriptions",
  boost_post:   "Discover Boost",
  sms_pack:     "SMS Credits",
  studio_addon: "Studio Addon",
};

const PIE_COLOURS = ["#C75B39", "#D4A853", "#7C3AED", "#10B981", "#F472B6"];

function formatNGN(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(1)}k`;
  return `₦${n.toLocaleString("en-NG")}`;
}
function formatNGNFull(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}
function formatDuration(ms: number): string {
  if (ms < 60_000) return "< 1m";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<"30d" | "90d" | "365d">("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else if (res.status === 401) window.location.href = "/admin/login";
    } finally {
      setLoading(false);
    }
  }, [range]);
  useEffect(() => { refresh(); }, [refresh]);

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/55">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading analytics…
      </div>
    );
  }

  const series = data.series;
  const purposeData = data.revenueByPurpose.map((p) => ({
    name: PURPOSE_LABEL[p.purpose] || p.purpose,
    value: p.total,
  }));
  const planTotal = (data.plans.free || 0) + (data.plans.plus || 0) + (data.plans.pro || 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#C75B39]" />
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-white/55">
            Revenue, growth, and engagement across the platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/[0.04] p-1">
            {(["30d", "90d", "365d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  range === r
                    ? "bg-[#C75B39] text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {r === "30d" ? "30 days" : r === "90d" ? "90 days" : "12 months"}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.04] px-3 text-xs font-medium text-white/65 hover:bg-white/[0.08]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Headline cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HeadlineCard
          icon={<Banknote className="h-4 w-4" />}
          label="Revenue (lifetime)"
          value={formatNGN(data.totals.lifetimeRevenue)}
          sub={`${data.totals.lifetimeCount} verified payments`}
          tone="emerald"
        />
        <HeadlineCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={`Revenue (last ${data.rangeDays}d)`}
          value={formatNGN(data.totals.rangeRevenue)}
          sub={`${data.totals.rangeCount} payments in range`}
          tone="primary"
        />
        <HeadlineCard
          icon={<Clock className="h-4 w-4" />}
          label="Avg. verification time"
          value={formatDuration(data.sla.averageMs)}
          sub={`p95: ${formatDuration(data.sla.p95Ms)} · ${data.sla.sampleCount} samples`}
          tone={data.sla.averageMs < 60 * 60 * 1000 ? "emerald" : "amber"}
        />
        <HeadlineCard
          icon={<Banknote className="h-4 w-4" />}
          label="Pending payments"
          value={data.totals.pendingPayments.toString()}
          sub={data.totals.pendingPayments > 0 ? "Action required" : "All clear"}
          tone={data.totals.pendingPayments > 0 ? "amber" : "neutral"}
          link={data.totals.pendingPayments > 0 ? "/admin/payments" : undefined}
        />
      </div>

      {/* Revenue line chart */}
      <ChartCard
        title="Daily revenue"
        subtitle={`Verified manual-payment revenue per day · ${data.rangeDays}-day window`}
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              minTickGap={20}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickFormatter={(v) => formatNGN(v)}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(15,15,26,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "white",
                fontSize: 12,
              }}
              formatter={(v) => formatNGNFull(typeof v === "number" ? v : Number(v) || 0)}
              labelFormatter={(l) => new Date(l).toLocaleDateString("en-NG", { day: "numeric", month: "long" })}
            />
            <Line
              type="monotone"
              dataKey="manualNGN"
              stroke="#C75B39"
              strokeWidth={2}
              dot={{ r: 2, fill: "#C75B39" }}
              activeDot={{ r: 4 }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Two-column: purpose breakdown + plan distribution */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Revenue by purpose"
          subtitle={`What designers are paying for · ${data.rangeDays}-day window`}
        >
          {purposeData.length === 0 ? (
            <p className="py-12 text-center text-xs text-white/40">
              No verified revenue in this window.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={purposeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  label={({ name, value }) => `${name}: ${formatNGN((value as number) || 0)}`}
                >
                  {purposeData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,15,26,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "white",
                    fontSize: 12,
                  }}
                  formatter={(v) => formatNGNFull(typeof v === "number" ? v : Number(v) || 0)}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Plan distribution" subtitle="Active subscriptions right now">
          {planTotal === 0 ? (
            <p className="py-12 text-center text-xs text-white/40">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={[
                  { plan: "Free", count: data.plans.free || 0 },
                  { plan: "Plus", count: data.plans.plus || 0 },
                  { plan: "Pro",  count: data.plans.pro  || 0 },
                ]}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="plan" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} width={30} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,15,26,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "white",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#C75B39" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Designer growth + engagement */}
      <ChartCard
        title="Designer signups & activity"
        subtitle="New designers, completed scans, and broadcasts per day"
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              minTickGap={20}
            />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} width={30} />
            <Tooltip
              contentStyle={{
                background: "rgba(15,15,26,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "white",
                fontSize: 12,
              }}
              labelFormatter={(l) => new Date(l).toLocaleDateString("en-NG", { day: "numeric", month: "long" })}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
            <Line type="monotone" dataKey="signups"   stroke="#7C3AED" strokeWidth={2} dot={false} name="Signups" />
            <Line type="monotone" dataKey="scans"     stroke="#10B981" strokeWidth={2} dot={false} name="Scans" />
            <Line type="monotone" dataKey="broadcasts" stroke="#D4A853" strokeWidth={2} dot={false} name="Broadcasts" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top contributors */}
      <ChartCard
        title="Top revenue contributors"
        subtitle="Designers ordered by money paid to Stitcha (lifetime)"
      >
        {data.topContributors.length === 0 ? (
          <p className="py-8 text-center text-xs text-white/40">
            No verified revenue yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {data.topContributors.map((c, i) => (
              <Link
                key={c.designerId}
                href={`/admin/designers/${c.designerId}`}
                className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-xs transition-colors hover:bg-white/[0.04]"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    i === 0
                      ? "bg-amber-500/20 text-amber-300"
                      : i === 1
                      ? "bg-slate-400/20 text-slate-300"
                      : i === 2
                      ? "bg-orange-700/20 text-orange-400"
                      : "bg-white/[0.06] text-white/55"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {c.businessName || c.name}
                  </p>
                  <p className="text-[10px] text-white/45">
                    {c.email} · {c.count} payment{c.count === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-emerald-400">
                  {formatNGNFull(c.totalNGN)}
                </p>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/30" />
              </Link>
            ))}
          </div>
        )}
      </ChartCard>

      <div className="rounded-lg bg-white/[0.02] px-3 py-2 text-[10px] text-white/35">
        Lifetime totals include all verified manual payments. Paystack auto-activated
        payments are reflected in the activity log; once Paystack is live, they'll
        be added to revenue too.
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                              */
/* -------------------------------------------------------------------------- */

const TONES = {
  primary: "border-purple-500/30 bg-purple-500/[0.06] text-purple-300",
  emerald: "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300",
  amber:   "border-amber-500/30 bg-amber-500/[0.06] text-amber-300",
  neutral: "border-white/8 bg-white/[0.02] text-white/65",
} as const;

function HeadlineCard({
  icon,
  label,
  value,
  sub,
  tone,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: keyof typeof TONES;
  link?: string;
}) {
  const inner = (
    <div className={`group h-full rounded-2xl border p-4 transition-colors ${TONES[tone]}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-75">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] opacity-65">{sub}</p>
    </div>
  );
  return link ? (
    <Link href={link} className="block">{inner}</Link>
  ) : inner;
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-white/45">{subtitle}</p>}
      </div>
      {children}
    </motion.section>
  );
}

