"use client";

/* -------------------------------------------------------------------------- */
/*  /insights — Designer's private Discover-feed performance                   */
/* -------------------------------------------------------------------------- */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Heart,
  Eye,
  TrendingUp,
  Sparkles,
  Flame,
  Globe,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";

interface Piece {
  id: string;
  title: string;
  garmentType: string;
  heroImage: string | null;
  caption: string | null;
  featuredAt: string | null;
  status: string;
  totalLikes: number;
  likesThisWeek: number;
  impressions: number;
}

interface InsightsData {
  totalFeatured: number;
  totalLikes: number;
  totalLikesThisWeek: number;
  totalImpressions: number;
  pieces: Piece[];
  topThisWeek: Piece[];
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/insights");
        const json = await res.json();
        if (!cancelled) {
          if (json.success) setData(json.data);
          else setError(json.error || "Failed to load insights");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load insights");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center py-20 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-[#C75B39]" />
          <p className="mt-3 text-sm text-[#1A1A2E]/55">Loading insights…</p>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </PageTransition>
    );
  }

  if (!data || data.totalFeatured === 0) {
    return (
      <PageTransition>
        <div className="rounded-2xl border border-[#1A1A2E]/8 bg-white/50 p-10 text-center">
          <Sparkles className="mx-auto h-9 w-9 text-[#1A1A2E]/30" />
          <h1 className="mt-3 text-lg font-bold text-[#1A1A2E]">No featured pieces yet</h1>
          <p className="mt-1 text-sm text-[#1A1A2E]/55">
            Feature one of your delivered orders on Discover, and you&apos;ll start seeing engagement here.
          </p>
          <Link
            href="/orders?status=delivered"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-4 py-2 text-sm font-semibold text-white shadow-md active:scale-[0.98]"
          >
            <Globe className="h-4 w-4" />
            View delivered orders
          </Link>
        </div>
      </PageTransition>
    );
  }

  const avgLikesPerPiece = data.totalFeatured > 0
    ? (data.totalLikes / data.totalFeatured).toFixed(1)
    : "0";

  return (
    <PageTransition>
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#C75B39]" />
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Discover insights</h1>
        </div>
        <p className="mt-1 text-sm text-[#1A1A2E]/55">
          How your featured pieces are performing on the public feed.
        </p>
      </header>

      {/* Stat cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Featured pieces"
          value={data.totalFeatured}
          icon={<Globe className="h-4 w-4" />}
          tone="neutral"
        />
        <StatCard
          label="Total likes"
          value={data.totalLikes}
          icon={<Heart className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Likes this week"
          value={data.totalLikesThisWeek}
          icon={<Flame className="h-4 w-4" />}
          tone="hot"
          hint="Signed-in saves only — anonymous likes counted in the total"
        />
        <StatCard
          label="Impressions"
          value={data.totalImpressions}
          icon={<Eye className="h-4 w-4" />}
          tone="neutral"
          hint="Times your pieces appeared on /discover"
        />
      </div>

      {/* Top movers this week */}
      {data.topThisWeek.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/50">
            🔥 Top movers this week
          </h2>
          <GlassCard padding="sm">
            <ul className="divide-y divide-[#1A1A2E]/5">
              {data.topThisWeek.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C75B39] to-[#b14a2b] text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  {p.heroImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.heroImage}
                      alt={p.title}
                      className="h-12 w-9 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1A1A2E]">{p.title}</p>
                    <p className="truncate text-[10px] capitalize text-[#1A1A2E]/45">{p.garmentType}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#C75B39]/10 px-2 py-0.5 text-[11px] font-semibold text-[#C75B39]">
                    <Heart className="h-3 w-3 fill-current" />
                    +{p.likesThisWeek}
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>
        </motion.section>
      )}

      {/* All pieces table */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/50">
        All featured pieces · avg {avgLikesPerPiece} likes / piece
      </h2>
      <GlassCard padding="sm">
        <div className="space-y-2">
          {data.pieces.map((p) => (
            <PieceRow key={p.id} piece={p} />
          ))}
        </div>
      </GlassCard>

      <p className="mt-4 text-center text-[10px] text-[#1A1A2E]/35">
        Insights update each time someone interacts with the Discover feed.
      </p>
    </PageTransition>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "primary" | "hot" | "neutral";
  hint?: string;
}) {
  const tones = {
    primary: "from-[#C75B39]/[0.08] to-[#D4A853]/[0.08] text-[#C75B39]",
    hot: "from-orange-100/60 to-amber-100/60 text-orange-700",
    neutral: "from-[#1A1A2E]/[0.04] to-[#1A1A2E]/[0.06] text-[#1A1A2E]/60",
  } as const;
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-75">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-[#1A1A2E]">{value.toLocaleString("en-NG")}</p>
      {hint && <p className="mt-1 text-[10px] leading-tight text-[#1A1A2E]/40">{hint}</p>}
    </div>
  );
}

function PieceRow({ piece: p }: { piece: Piece }) {
  return (
    <Link
      href={`/orders/${p.id}`}
      className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-[#1A1A2E]/8 hover:bg-white/40"
    >
      {p.heroImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.heroImage}
          alt={p.title}
          className="h-14 w-11 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="h-14 w-11 shrink-0 rounded-md bg-[#1A1A2E]/[0.05]" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-[#1A1A2E]">{p.title}</p>
          <ArrowUpRight className="h-3 w-3 shrink-0 text-[#1A1A2E]/30" />
        </div>
        <p className="truncate text-[10px] capitalize text-[#1A1A2E]/45">
          {p.garmentType}
          {p.featuredAt &&
            " · featured " + new Date(p.featuredAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
            })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Stat icon={<Heart className="h-3 w-3" />} value={p.totalLikes} primary />
        {p.likesThisWeek > 0 && (
          <Stat icon={<Flame className="h-3 w-3" />} value={`+${p.likesThisWeek}`} accent />
        )}
        <Stat icon={<Eye className="h-3 w-3" />} value={p.impressions} />
      </div>
    </Link>
  );
}

function Stat({
  icon,
  value,
  primary,
  accent,
}: {
  icon: React.ReactNode;
  value: number | string;
  primary?: boolean;
  accent?: boolean;
}) {
  const tone = primary
    ? "bg-[#C75B39]/10 text-[#C75B39]"
    : accent
    ? "bg-orange-100/70 text-orange-700"
    : "bg-[#1A1A2E]/[0.05] text-[#1A1A2E]/55";
  return (
    <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {icon}
      {value}
    </span>
  );
}
