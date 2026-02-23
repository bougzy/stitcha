"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { GarmentBreakdownItem } from "@/types";

interface GarmentChartProps {
  data: GarmentBreakdownItem[];
}

const COLORS = [
  "#C75B39",
  "#D4A853",
  "#1A1A2E",
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
];

export default function GarmentChart({ data }: GarmentChartProps) {
  return (
    <div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A2E10" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "#1A1A2E40" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="type"
              type="category"
              tick={{ fontSize: 11, fill: "#1A1A2E60" }}
              axisLine={false}
              tickLine={false}
              width={70}
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
                name === "count"
                  ? `${value} orders`
                  : `\u20A6${Number(value).toLocaleString()}`,
                name === "count" ? "Orders" : "Revenue",
              ]}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Summary */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {data.slice(0, 4).map((item, i) => (
          <div key={item.type} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="truncate text-[#1A1A2E]/55">{item.type}</span>
            <span className="ml-auto font-semibold text-[#1A1A2E]">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
