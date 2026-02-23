"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/common/glass-card";
import { cn } from "@/lib/utils";

interface RankBadgeData {
  xp: number;
  tier: { name: string; title: string; icon: string; color: string };
  nextTier: { title: string; icon: string; xpNeeded: number } | null;
  progress: number;
}

export function RankBadge() {
  const [data, setData] = useState<RankBadgeData | null>(null);

  useEffect(() => {
    async function fetchRank() {
      try {
        const res = await fetch("/api/designer/rank");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        // silent
      }
    }
    fetchRank();
  }, []);

  if (!data) return null;

  return (
    <Link href="/rank">
      <GlassCard hover padding="sm" className="cursor-pointer">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${data.tier.color}15` }}
          >
            <span className="text-xl">{data.tier.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-bold"
                style={{ color: data.tier.color }}
              >
                {data.tier.title}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] text-[#D4A853]">
                <Zap className="h-3 w-3" />
                {data.xp.toLocaleString()} XP
              </span>
            </div>
            {data.nextTier && (
              <div className="mt-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-[#1A1A2E]/8">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${data.progress}%`,
                      backgroundColor: data.tier.color,
                    }}
                  />
                </div>
                <p className="mt-0.5 text-[9px] text-[#1A1A2E]/35">
                  {data.nextTier.xpNeeded} XP to {data.nextTier.title}
                </p>
              </div>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#1A1A2E]/25" />
        </div>
      </GlassCard>
    </Link>
  );
}

export default RankBadge;
