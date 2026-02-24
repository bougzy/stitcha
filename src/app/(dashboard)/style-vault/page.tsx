"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Scissors,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  Search,
  Sparkles,
  Calendar,
  ChevronRight,
  Tag,
  Loader2,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  getDailyContent,
  type TrendAlert,
} from "@/lib/style-vault-data";

interface DbStyleTip {
  _id: string;
  title: string;
  content: string;
  category: "technique" | "trend" | "fabric" | "business" | "inspiration";
  tags: string[];
  viewCount: number;
  bookmarkCount: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  technique: { bg: "bg-blue-50/60", text: "text-blue-600", border: "border-blue-200/40" },
  trend: { bg: "bg-rose-50/60", text: "text-rose-600", border: "border-rose-200/40" },
  fabric: { bg: "bg-amber-50/60", text: "text-amber-600", border: "border-amber-200/40" },
  business: { bg: "bg-emerald-50/60", text: "text-emerald-600", border: "border-emerald-200/40" },
  inspiration: { bg: "bg-purple-50/60", text: "text-purple-600", border: "border-purple-200/40" },
};

export default function StyleVaultPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [tips, setTips] = useState<DbStyleTip[]>([]);
  const [trendAlerts, setTrendAlerts] = useState<TrendAlert[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Daily featured content (static fallback while DB loads)
  const { featuredTip: staticFeaturedTip, featuredTrend } = useMemo(() => getDailyContent(), []);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeCategory !== "all") params.set("category", activeCategory);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("limit", "50");

      const [tipsRes, bookmarksRes] = await Promise.all([
        fetch(`/api/style-vault?${params}`),
        fetch("/api/style-vault/bookmarks"),
      ]);

      const tipsJson = await tipsRes.json();
      const bookmarksJson = await bookmarksRes.json();

      if (tipsJson.success) {
        setTips(tipsJson.data.tips);
        if (tipsJson.data.trendAlerts) setTrendAlerts(tipsJson.data.trendAlerts);
      }
      if (bookmarksJson.success) {
        setBookmarks(new Set(bookmarksJson.data.bookmarks));
      }
    } catch {
      // Fall back to static data on error
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTips = useMemo(() => {
    if (showBookmarksOnly) {
      return tips.filter((t) => bookmarks.has(t._id));
    }
    return tips;
  }, [tips, bookmarks, showBookmarksOnly]);

  // Use first DB tip as featured if available, else static
  const featuredTip = tips.length > 0
    ? { id: tips[0]._id, title: tips[0].title, content: tips[0].content, tags: tips[0].tags, category: tips[0].category }
    : staticFeaturedTip;

  async function toggleBookmark(id: string) {
    // Optimistic update
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      await fetch("/api/style-vault/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipId: id }),
      });
    } catch {
      // Revert on failure
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  }

  function trackView(tipId: string) {
    fetch("/api/style-vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipId, action: "view" }),
    }).catch(() => {});
  }

  return (
    <PageTransition>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 lg:space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] lg:text-3xl">
              Style Vault
            </h1>
            <p className="mt-1 text-sm text-[#1A1A2E]/50">
              Daily inspiration, techniques & trends for your craft
            </p>
          </div>
          <button
            onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all",
              showBookmarksOnly
                ? "bg-[#D4A853]/10 text-[#D4A853]"
                : "bg-[#1A1A2E]/5 text-[#1A1A2E]/50 hover:bg-[#1A1A2E]/8"
            )}
          >
            {showBookmarksOnly ? (
              <BookmarkCheck className="h-3.5 w-3.5" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
            Saved ({bookmarks.size})
          </button>
        </motion.div>

        {/* Featured Card — Tip of the Day */}
        <motion.div variants={itemVariants}>
          <GlassCard gradientBorder padding="lg">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A853]/20 to-[#C75B39]/10">
                <Sparkles className="h-5 w-5 text-[#D4A853]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#D4A853]">
                  Tip of the Day
                </p>
                <h3 className="mt-1 text-sm font-bold text-[#1A1A2E]">
                  {featuredTip.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#1A1A2E]/60">
                  {featuredTip.content}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {featuredTip.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-[#1A1A2E]/5 px-2 py-0.5 text-[10px] text-[#1A1A2E]/45"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => toggleBookmark(featuredTip.id)}
                className="shrink-0 p-1"
              >
                {bookmarks.has(featuredTip.id) ? (
                  <BookmarkCheck className="h-4 w-4 text-[#D4A853]" />
                ) : (
                  <Bookmark className="h-4 w-4 text-[#1A1A2E]/25" />
                )}
              </button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Trend Alert */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 rounded-xl border border-rose-200/40 bg-rose-50/30 px-4 py-3">
            <TrendingUp className="h-4 w-4 shrink-0 text-rose-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#1A1A2E]">
                {featuredTrend.title}
              </p>
              <p className="text-[10px] text-[#1A1A2E]/50">
                {featuredTrend.description}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-rose-500">
              <Calendar className="h-3 w-3" />
              {featuredTrend.season}
            </span>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div variants={itemVariants}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A2E]/30" />
            <input
              type="text"
              placeholder="Search tips, techniques, trends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/50 py-2.5 pl-10 pr-4 text-sm text-[#1A1A2E] placeholder:text-[#1A1A2E]/30 outline-none backdrop-blur-sm transition-all focus:border-[#C75B39]/30 focus:bg-white/60"
            />
          </div>
        </motion.div>

        {/* Category Filters */}
        <motion.div variants={itemVariants}>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all",
                  activeCategory === key
                    ? "bg-[#C75B39]/10 text-[#C75B39]"
                    : "bg-white/40 text-[#1A1A2E]/50 hover:bg-white/60"
                )}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Trend Alerts Section */}
        {activeCategory === "all" && !showBookmarksOnly && !searchQuery && trendAlerts.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-rose-500" />
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                Seasonal Trends
              </h2>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {trendAlerts.map((trend) => (
                <GlassCard key={trend.id} padding="sm">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        trend.relevance === "high"
                          ? "bg-rose-100/50"
                          : "bg-amber-100/50"
                      )}
                    >
                      <TrendingUp
                        className={cn(
                          "h-4 w-4",
                          trend.relevance === "high"
                            ? "text-rose-500"
                            : "text-amber-500"
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#1A1A2E]">
                        {trend.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#1A1A2E]/50">
                        {trend.description}
                      </p>
                      <p className="mt-1 text-[9px] font-medium text-[#C75B39]">
                        {trend.season}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tips Grid */}
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center gap-2">
            <Scissors className="h-4.5 w-4.5 text-[#C75B39]" />
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              {showBookmarksOnly
                ? "Saved Tips"
                : activeCategory === "all"
                ? "All Tips & Knowledge"
                : CATEGORIES.find((c) => c.key === activeCategory)?.label || "Tips"}
            </h2>
            <span className="text-xs text-[#1A1A2E]/35">
              ({filteredTips.length})
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#C75B39]/40" />
            </div>
          ) : filteredTips.length === 0 ? (
            <GlassCard padding="lg">
              <div className="py-8 text-center">
                <Bookmark className="mx-auto h-8 w-8 text-[#1A1A2E]/15" />
                <p className="mt-3 text-sm text-[#1A1A2E]/40">
                  {showBookmarksOnly
                    ? "No saved tips yet. Bookmark tips to find them here."
                    : "No tips match your search."}
                </p>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-2.5">
              {filteredTips.map((tip, i) => (
                <TipCard
                  key={tip._id}
                  tip={tip}
                  isBookmarked={bookmarks.has(tip._id)}
                  onToggleBookmark={() => toggleBookmark(tip._id)}
                  onView={() => trackView(tip._id)}
                  index={i}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}

function TipCard({
  tip,
  isBookmarked,
  onToggleBookmark,
  onView,
  index,
}: {
  tip: DbStyleTip;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onView: () => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = CATEGORY_COLORS[tip.category] || CATEGORY_COLORS.technique;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <GlassCard padding="sm" className="overflow-hidden">
        <div
          className="flex cursor-pointer items-start gap-3"
          onClick={() => {
            if (!expanded) onView();
            setExpanded(!expanded);
          }}
        >
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              colors.bg
            )}
          >
            <Tag className={cn("h-3.5 w-3.5", colors.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                  colors.bg,
                  colors.text
                )}
              >
                {tip.category}
              </span>
              {tip.viewCount > 0 && (
                <span className="text-[9px] text-[#1A1A2E]/25">
                  {tip.viewCount} views
                </span>
              )}
            </div>
            <h3 className="mt-1 text-sm font-semibold text-[#1A1A2E]">
              {tip.title}
            </h3>
            {!expanded && (
              <p className="mt-0.5 truncate text-xs text-[#1A1A2E]/45">
                {tip.content}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark();
              }}
              className="p-1"
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-4 w-4 text-[#D4A853]" />
              ) : (
                <Bookmark className="h-4 w-4 text-[#1A1A2E]/20" />
              )}
            </button>
            <ChevronRight
              className={cn(
                "h-4 w-4 text-[#1A1A2E]/20 transition-transform",
                expanded && "rotate-90"
              )}
            />
          </div>
        </div>

        {expanded && (
          <div className="mt-3 border-t border-[#1A1A2E]/5 pt-3">
            <p className="text-xs leading-relaxed text-[#1A1A2E]/65">
              {tip.content}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {tip.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-[#1A1A2E]/5 px-2 py-0.5 text-[10px] text-[#1A1A2E]/40"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
