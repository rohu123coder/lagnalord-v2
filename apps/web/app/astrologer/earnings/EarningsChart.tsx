"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { themeColor } from "@/lib/tenantBranding";

export function EarningsChart({
  last7Days,
}: {
  last7Days: Array<{ date: string; amount: number }>;
}) {
  const chartData = last7Days.map((d) => ({
    date: d.date.slice(5),
    amount: d.amount,
  }));

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Last 7 days</h2>
      <div className="mt-6 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => [`₹${v.toFixed(0)}`, "Earned"]} />
            <Bar
              dataKey="amount"
              fill={themeColor.violet600}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
