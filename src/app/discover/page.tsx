"use client";

/* -------------------------------------------------------------------------- */
/*  /discover — Public Designer Discovery Feed                                 */
/*                                                                              */
/*  Anyone (logged-in designer or anonymous visitor) can browse work that     */
/*  designers have explicitly featured to the feed. Each post links to that   */
/*  designer's public profile.                                                  */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Sparkles, Loader2, MapPin, Filter, Heart, Bookmark, Flame } from "lucide-react";
import { GARMENT_PRESETS, NIGERIAN_STATES } from "@/lib/constants";

interface DiscoverPost {
  _id: string;
  title: string;
  garmentType: string;
  caption: string | null;
  images: string[];
  featuredAt: string;
  likeCount: number;
  likedByMe: boolean;
  designer: {
    id: string;
    name: string;
    businessName: string;
    city: string | null;
    state: string | null;
    avatar: string | null;
  } | null;
}

const ANON_LIKES_KEY = "stitcha:discover-likes";

function readAnonLikes(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(ANON_LIKES_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeAnonLikes(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ANON_LIKES_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function DiscoverPage() {
  const { status: sessionStatus } = useSession();
  const isLoggedIn = sessionStatus === "authenticated";

  const [posts, setPosts] = useState<DiscoverPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [garmentType, setGarmentType] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [anonLikes, setAnonLikes] = useState<Set<string>>(new Set());
  const [trending, setTrending] = useState<DiscoverPost[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // Hydrate anonymous-like memory once
  useEffect(() => {
    setAnonLikes(readAnonLikes());
  }, []);

  // Trending strip — fetched once on mount, refetched when sign-in state changes
  // (so likedByMe flags are populated correctly).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTrendingLoading(true);
      try {
        const res = await fetch("/api/discover/trending");
        const json = await res.json();
        if (!cancelled && json.success) {
          setTrending(json.data.posts as DiscoverPost[]);
        }
      } catch {
        /* silent — trending is non-critical */
      } finally {
        if (!cancelled) setTrendingLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionStatus]);

  const fetchPage = useCallback(async (cursor: string | null, replace: boolean) => {
    try {
      if (replace) setLoading(true); else setLoadingMore(true);

      let url: string;
      if (showSaved) {
        url = "/api/discover/saved";
      } else {
        const params = new URLSearchParams();
        if (cursor) params.set("cursor", cursor);
        if (garmentType) params.set("garmentType", garmentType);
        if (state) params.set("state", state);
        params.set("limit", "20");
        url = `/api/discover?${params}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to load feed");
      }
      const incoming: DiscoverPost[] = json.data.posts;
      setPosts((prev) => (replace ? incoming : [...prev, ...incoming]));
      setNextCursor(json.data.nextCursor ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [garmentType, state, showSaved]);

  useEffect(() => {
    fetchPage(null, true);
  }, [fetchPage]);

  /* ---- Like / unlike a post (optimistic) ---- */
  const toggleLike = useCallback(async (post: DiscoverPost) => {
    const isAnon = !isLoggedIn;
    const wasLiked = isAnon ? anonLikes.has(post._id) : post.likedByMe;

    // Anonymous: never unlike (would let one browser drain the counter to 0)
    if (isAnon && wasLiked) return;

    const wantToLike = !wasLiked;

    // Helper: mutate one post inside an array
    const updater = (p: DiscoverPost) =>
      p._id === post._id
        ? {
            ...p,
            likedByMe: isAnon ? p.likedByMe : wantToLike,
            likeCount: Math.max(0, p.likeCount + (wantToLike ? 1 : -1)),
          }
        : p;
    const rollback = (p: DiscoverPost) =>
      p._id === post._id
        ? {
            ...p,
            likedByMe: wasLiked,
            likeCount: Math.max(0, p.likeCount + (wantToLike ? -1 : 1)),
          }
        : p;
    const reconcile = (likeCount: number, likedByMe: boolean) => (p: DiscoverPost) =>
      p._id === post._id ? { ...p, likeCount, likedByMe } : p;

    // Optimistic update on both lists (the post may appear in either)
    setPosts((prev) => prev.map(updater));
    setTrending((prev) => prev.map(updater));

    if (isAnon) {
      const next = new Set(anonLikes);
      next.add(post._id);
      setAnonLikes(next);
      writeAnonLikes(next);
    }

    try {
      const res = await fetch(`/api/discover/${post._id}/like`, {
        method: wantToLike ? "POST" : "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Like failed");
      const fn = reconcile(json.data.likeCount, !!json.data.likedByMe);
      setPosts((prev) => prev.map(fn));
      setTrending((prev) => prev.map(fn));
    } catch {
      // Roll back optimistic update on failure
      setPosts((prev) => prev.map(rollback));
      setTrending((prev) => prev.map(rollback));
      if (isAnon) {
        const next = new Set(anonLikes);
        next.delete(post._id);
        setAnonLikes(next);
        writeAnonLikes(next);
      }
    }
  }, [anonLikes, isLoggedIn]);

  return (
    <div className="relative min-h-[100dvh] bg-[#FAFAF8]">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#C75B39]/[0.05] blur-[120px]" />
        <div className="absolute top-1/3 -left-24 h-[400px] w-[400px] rounded-full bg-[#D4A853]/[0.05] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#C75B39]" />
              <h1 className="text-2xl font-bold text-[#1A1A2E]">Discover</h1>
            </div>
            <p className="mt-1 text-sm text-[#1A1A2E]/55">
              Work from Stitcha designers across Nigeria.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                onClick={() => setShowSaved((v) => !v)}
                className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors ${
                  showSaved
                    ? "border-[#C75B39] bg-[#C75B39]/10 text-[#C75B39]"
                    : "border-[#1A1A2E]/10 bg-white/40 text-[#1A1A2E]/70 active:bg-white/60"
                }`}
              >
                <Bookmark className={`h-4 w-4 ${showSaved ? "fill-current" : ""}`} />
                {showSaved ? "Showing saves" : "My saves"}
              </button>
            )}
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              disabled={showSaved}
              className="flex h-10 items-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/40 px-3 text-sm font-medium text-[#1A1A2E]/70 active:bg-white/60 disabled:opacity-40"
            >
              <Filter className="h-4 w-4" />
              Filter
              {(garmentType || state) && (
                <span className="rounded-full bg-[#C75B39]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#C75B39]">
                  {[garmentType, state].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </header>

        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-[#1A1A2E]/8 bg-white/50 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1A1A2E]/60">Garment</label>
                <select
                  value={garmentType}
                  onChange={(e) => setGarmentType(e.target.value)}
                  className="glass-input flex h-10 w-full rounded-xl px-3 text-sm focus-visible:outline-none"
                >
                  <option value="">All garments</option>
                  {Object.entries(GARMENT_PRESETS).map(([k, p]) => (
                    <option key={k} value={k}>{p.icon} {p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1A1A2E]/60">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="glass-input flex h-10 w-full rounded-xl px-3 text-sm focus-visible:outline-none"
                >
                  <option value="">All states</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            {(garmentType || state) && (
              <button
                onClick={() => { setGarmentType(""); setState(""); }}
                className="mt-3 text-xs font-medium text-[#C75B39] underline"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        )}

        {/* Trending strip — only when browsing the main feed (not in saves view) */}
        {!showSaved && (trendingLoading || trending.length > 0) && (
          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#C75B39]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1A1A2E]/65">
                  Trending this week
                </h2>
              </div>
              {!trendingLoading && trending.length > 0 && (
                <span className="text-[10px] text-[#1A1A2E]/40">
                  Sorted by likes from the last 14 days
                </span>
              )}
            </div>
            {trendingLoading ? (
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] w-32 shrink-0 animate-pulse rounded-xl bg-[#1A1A2E]/[0.05] sm:w-40"
                  />
                ))}
              </div>
            ) : (
              <div
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
                style={{ scrollbarWidth: "thin" }}
              >
                {trending.map((post, i) => (
                  <article
                    key={post._id}
                    className="relative w-40 shrink-0 snap-start overflow-hidden rounded-xl border border-white/30 bg-white/60 shadow-[0_4px_20px_rgba(26,26,46,0.06)] sm:w-48"
                  >
                    {/* Rank badge */}
                    <span className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#C75B39] to-[#b14a2b] text-[10px] font-bold text-white shadow-md">
                      {i + 1}
                    </span>
                    <Link
                      href={post.designer ? `/designer/${post.designer.id}` : "#"}
                      className="block"
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.images[0]}
                          alt={post.title}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.04]"
                        />
                      </div>
                    </Link>
                    <LikeButton
                      post={post}
                      isLoggedIn={isLoggedIn}
                      isAnonLiked={anonLikes.has(post._id)}
                      onToggle={() => toggleLike(post)}
                    />
                    <div className="p-2">
                      <p className="truncate text-xs font-semibold text-[#1A1A2E]">
                        {post.title}
                      </p>
                      <div className="mt-0.5 flex items-center justify-between gap-1">
                        <p className="truncate text-[10px] text-[#1A1A2E]/45">
                          {post.designer?.businessName || post.designer?.name || ""}
                        </p>
                        <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-[#C75B39]">
                          <Heart className="h-2.5 w-2.5 fill-current" />
                          {post.likeCount}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#C75B39]" />
            <p className="mt-3 text-sm text-[#1A1A2E]/55">Loading the feed…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && posts.length === 0 && (
          <div className="rounded-2xl border border-[#1A1A2E]/8 bg-white/50 p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-[#1A1A2E]/30" />
            <p className="mt-3 text-sm font-medium text-[#1A1A2E]/70">
              {showSaved ? "You haven't saved any posts yet" : "No featured posts yet"}
            </p>
            <p className="mt-1 text-xs text-[#1A1A2E]/45">
              {showSaved
                ? "Tap the heart on any post to save it for later."
                : "Designers — feature your delivered orders to show them here."}
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && posts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <motion.article
                key={post._id}
                variants={itemVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: i * 0.04 }}
                className="overflow-hidden rounded-2xl border border-white/30 bg-white/60 shadow-[0_4px_20px_rgba(26,26,46,0.06)]"
              >
                <div className="relative">
                  <Link href={post.designer ? `/designer/${post.designer.id}` : "#"} className="block">
                    <div className="aspect-[3/4] overflow-hidden bg-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.images[0]}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                      />
                    </div>
                  </Link>
                  {/* Like button — overlaid on the image, top-right */}
                  <LikeButton
                    post={post}
                    isLoggedIn={isLoggedIn}
                    isAnonLiked={anonLikes.has(post._id)}
                    onToggle={() => toggleLike(post)}
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1A1A2E]">{post.title}</p>
                      <p className="mt-0.5 text-[10px] capitalize text-[#1A1A2E]/45">
                        {(GARMENT_PRESETS[post.garmentType]?.icon ?? "📐") + " "}
                        {GARMENT_PRESETS[post.garmentType]?.label ?? post.garmentType}
                      </p>
                    </div>
                    {post.likeCount > 0 && (
                      <div className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#C75B39]">
                        <Heart className="h-3 w-3 fill-current" />
                        {post.likeCount}
                      </div>
                    )}
                  </div>
                  {post.caption && (
                    <p className="mt-2 line-clamp-2 text-xs text-[#1A1A2E]/65">{post.caption}</p>
                  )}
                  {post.designer && (
                    <Link
                      href={`/designer/${post.designer.id}`}
                      className="mt-3 flex items-center gap-2 rounded-lg border border-[#1A1A2E]/8 bg-white/50 p-2 hover:bg-white/70"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C75B39] to-[#D4A853] text-[10px] font-bold text-white">
                        {(post.designer.businessName || post.designer.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#1A1A2E]">
                          {post.designer.businessName || post.designer.name}
                        </p>
                        {(post.designer.city || post.designer.state) && (
                          <p className="flex items-center gap-1 text-[10px] text-[#1A1A2E]/45">
                            <MapPin className="h-2.5 w-2.5" />
                            {[post.designer.city, post.designer.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </Link>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && nextCursor && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => fetchPage(nextCursor, false)}
              disabled={loadingMore}
              className="flex h-11 items-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/60 px-5 text-sm font-medium text-[#1A1A2E]/70 active:bg-white/80 disabled:opacity-50"
            >
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  LikeButton — overlaid heart                                                */
/*                                                                              */
/*  Visual states:                                                              */
/*    • signed-in & likedByMe       → filled heart                             */
/*    • anonymous & in localStorage → filled heart, click is a no-op           */
/*    • otherwise                   → outline heart                            */
/* -------------------------------------------------------------------------- */

function LikeButton({
  post,
  isLoggedIn,
  isAnonLiked,
  onToggle,
}: {
  post: DiscoverPost;
  isLoggedIn: boolean;
  isAnonLiked: boolean;
  onToggle: () => void;
}) {
  const filled = isLoggedIn ? post.likedByMe : isAnonLiked;
  const label =
    isLoggedIn
      ? filled ? "Remove from saves" : "Save"
      : filled ? "Already liked" : "Like";

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
      className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-all active:scale-90 ${
        filled
          ? "bg-[#C75B39] text-white shadow-lg"
          : "bg-black/40 text-white hover:bg-black/55"
      }`}
      aria-label={label}
      title={label}
    >
      <Heart className={`h-4 w-4 ${filled ? "fill-current" : ""}`} />
    </button>
  );
}
