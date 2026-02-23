"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RevenueTrendItem } from "@/types";

interface RevenueChartProps {
  data: RevenueTrendItem[];
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4A853" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#D4A853" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A1A2E10" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#1A1A2E60" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#1A1A2E40" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatCompact}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(255,255,255,0.95)",
              border: "1px solid #1A1A2E15",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [
              `\u20A6${Number(value).toLocaleString()}`,
              name === "revenue" ? "Total Revenue" : "Collected",
            ]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#D4A853"
            strokeWidth={2}
            fill="url(#revenueGrad)"
          />
          <Area
            type="monotone"
            dataKey="collected"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#collectedGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-[#1A1A2E]/40">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#D4A853]" /> Revenue
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Collected
        </span>
      </div>
    </div>
  );
}
