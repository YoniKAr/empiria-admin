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
import type { RevenueDataPoint } from "@/lib/types";

export default function RevenueChart({ data }: { data: RevenueDataPoint[] }) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No revenue data for this period.
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.82 0.16 75)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="oklch(0.82 0.16 75)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillFees" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.18 0.01 60)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="oklch(0.18 0.01 60)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.89 0.02 80)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: any) =>
              new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
            }
            tick={{ fontSize: 12, fill: "oklch(0.48 0.01 60)" }}
          />
          <YAxis tick={{ fontSize: 12, fill: "oklch(0.48 0.01 60)" }} />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid oklch(0.89 0.02 80)",
              fontSize: "13px",
              backgroundColor: "oklch(0.98 0.02 80)",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any, name: any) => [
              `$${Number(value ?? 0).toFixed(2)}`,
              name === "revenue" ? "Total Revenue" : "Platform Fees",
            ]) as any}
            labelFormatter={(label: any) =>
              new Date(label).toLocaleDateString("en-CA", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="oklch(0.82 0.16 75)"
            strokeWidth={2}
            fill="url(#fillRevenue)"
          />
          <Area
            type="monotone"
            dataKey="platformFees"
            stroke="oklch(0.18 0.01 60)"
            strokeWidth={2}
            fill="url(#fillFees)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
