"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Compass,
  Heart,
  Eye,
  Sparkles,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldOff,
} from "lucide-react";

interface DiscoverPost {
  id: string;
  title: string;
  garmentType: string;
  caption: string | null;
  heroImage: string | null;
  featuredAt: string;
  boostedUntil: string | null;
  boostActive: boolean;
  boostCount: number;
  likes: number;
  impressions: number;
  designer: {
    id: string;
    name: string;
    businessName: string;
    city: string | null;
    state: string | null;
    suspended: boolean;
  } | null;
}

export default function AdminDiscoverPage() {
  const [posts, setPosts] = useState<DiscoverPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [boostedOnly, setBoostedOnly] = useState(false);
  const [moderating, setModerating] = useState<string | null>(null);
  const [reasonForId, setReasonForId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/discover-posts?limit=100${boostedOnly ? "&boosted=1" : ""}`);
      const json = await res.json();
      if (json.success) setPosts(json.data.posts);
      else if (res.status === 401) window.location.href = "/admin/login";
    } finally {
      setLoading(false);
    }
  }, [boostedOnly]);
  useEffect(() => { refresh(); }, [refresh]);

  async function unfeature(id: string) {
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Add a reason — it's shown to the designer.");
      return;
    }
    setModerating(id);
    try {
      const res = await fetch(`/api/admin/discover-posts/${id}/unfeature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");
      toast.success("Post removed from Discover");
      setReasonForId(null);
      setReason("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setModerating(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-[#C75B39]" />
            <h1 className="text-2xl font-bold text-white">Discover moderation</h1>
          </div>
          <p className="mt-1 text-sm text-white/55">
            Featured posts on the public feed. Force-unfeature anything inappropriate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBoostedOnly((v) => !v)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
              boostedOnly
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-white/8 bg-white/[0.04] text-white/65"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Boosted only
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.04] px-3 text-xs font-medium text-white/65 hover:bg-white/[0.08]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-sm text-white/55">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center">
          <Compass className="mx-auto h-9 w-9 text-white/20" />
          <p className="mt-3 text-sm text-white/65">No featured posts.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]"
            >
              <div className="relative aspect-[3/4] bg-black">
                {p.heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.heroImage} alt={p.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/20">No image</div>
                )}
                {p.boostActive && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                    <Sparkles className="h-2.5 w-2.5" /> BOOSTED
                  </span>
                )}
                {p.designer?.suspended && (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold text-red-950">
                    SUSPENDED
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-semibold text-white">{p.title}</p>
                <p className="truncate text-[10px] capitalize text-white/40">{p.garmentType}</p>
                {p.caption && (
                  <p className="mt-1 line-clamp-2 text-[11px] text-white/65">{p.caption}</p>
                )}

                {p.designer && (
                  <Link
                    href={`/admin/designers/${p.designer.id}`}
                    className="mt-2 flex items-center gap-1 text-[11px] text-white/55 hover:text-white"
                  >
                    {p.designer.businessName || p.designer.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}

                <div className="mt-2 flex items-center gap-2 text-[10px] text-white/55">
                  <span className="inline-flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{p.likes}</span>
                  <span className="inline-flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{p.impressions}</span>
                  {p.boostCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-400">
                      <Sparkles className="h-2.5 w-2.5" />×{p.boostCount}
                    </span>
                  )}
                </div>

                {/* Moderation */}
                {reasonForId === p.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      placeholder="Reason for removal (shown to designer)"
                      className="w-full resize-none rounded-md border border-red-500/30 bg-black/40 px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus-visible:outline-none"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setReasonForId(null); setReason(""); }}
                        className="flex-1 rounded-md border border-white/8 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-white/65"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => unfeature(p.id)}
                        disabled={moderating === p.id || reason.trim().length < 3}
                        className="flex-1 rounded-md bg-red-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                      >
                        {moderating === p.id ? "..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setReasonForId(p.id); setReason(""); }}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/20"
                  >
                    <ShieldOff className="h-3 w-3" /> Unfeature
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-white/40">
        <AlertTriangle className="h-3 w-3" />
        Unfeaturing only removes the post from the public feed. The order itself is untouched.
      </p>
    </div>
  );
}
