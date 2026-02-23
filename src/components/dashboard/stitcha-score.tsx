"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Target,
  ChevronRight,
  Zap,
  TrendingUp,
} from "lucide-react";
import { GlassCard } from "@/components/common/glass-card";
import { cn } from "@/lib/utils";

interface ScoreData {
  score: number;
  grade: string;
  components: {
    name: string;
    score: number;
    maxScore: number;
    description: string;
    tip: string;
  }[];
  challenges: {
    title: string;
    reward: string;
    type: string;
  }[];
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-emerald-500",
  A: "text-emerald-500",
  B: "text-[#D4A853]",
  C: "text-amber-500",
  D: "text-[#C75B39]",
  F: "text-red-500",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 65) return "#D4A853";
  if (score >= 50) return "#f59e0b";
  if (score >= 35) return "#C75B39";
  return "#ef4444";
}

export function StitchaScore() {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    async function fetchScore() {
      try {
        const res = await fetch("/api/dashboard/score");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchScore();
  }, []);

  if (loading) {
    return (
      <div className="h-24 animate-pulse rounded-2xl bg-gradient-to-r from-[#D4A853]/5 to-emerald-500/5" />
    );
  }

  if (!data) return null;

  const scoreColor = getScoreColor(data.score);

  return (
    <div className="space-y-3">
      {/* Main Score Card */}
      <GlassCard padding="none" className="overflow-hidden">
        <div
          className="flex cursor-pointer items-center gap-4 p-4"
          onClick={() => setShowDetails(!showDetails)}
        >
          {/* Score Circle */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg
              className="h-16 w-16 -rotate-90"
              viewBox="0 0 64 64"
            >
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-[#1A1A2E]/5"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke={scoreColor}
                strokeWidth="4"
                strokeDasharray={`${(data.score / 100) * 175.93} 175.93`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-lg font-black"
                style={{ color: scoreColor }}
              >
                {data.score}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1A1A2E]">
                Stitcha Score
              </h3>
              <span
                className={cn(
                  "text-sm font-black",
                  GRADE_COLORS[data.grade] || "text-[#1A1A2E]"
                )}
              >
                {data.grade}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-[#1A1A2E]/45">
              Your business health score based on payments, delivery, retention,
              and activity
            </p>

            {/* Mini component bars */}
            <div className="mt-2 flex gap-1">
              {data.components.map((c) => (
                <div
                  key={c.name}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1A1A2E]/5"
                  title={`${c.name}: ${c.score}/${c.maxScore}`}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(c.score / c.maxScore) * 100}%`,
                      backgroundColor: scoreColor,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-[#1A1A2E]/20 transition-transform",
              showDetails && "rotate-90"
            )}
          />
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="border-t border-[#1A1A2E]/5 p-4 space-y-4">
            {/* Score Components */}
            <div className="space-y-3">
              {data.components.map((c) => (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1A1A2E]/70">
                      {c.name}
                    </span>
                    <span className="font-bold text-[#1A1A2E]">
                      {c.score}/{c.maxScore}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#1A1A2E]/5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(c.score / c.maxScore) * 100}%`,
                        backgroundColor: getScoreColor(
                          (c.score / c.maxScore) * 100
                        ),
                      }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#1A1A2E]/40">
                    {c.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Weekly Challenges */}
            {data.challenges.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#D4A853]">
                  <Target className="h-3 w-3" />
                  Weekly Challenges
                </p>
                <div className="space-y-1.5">
                  {data.challenges.map((ch, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-[#D4A853]/5 px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-xs text-[#1A1A2E]/60">
                        <Zap className="h-3 w-3 text-[#D4A853]" />
                        {ch.title}
                      </span>
                      <span className="text-[10px] font-bold text-[#D4A853]">
                        {ch.reward}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default StitchaScore;
