"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalesByDay } from "@/features/dashboard/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPHP } from "@/lib/money";

// Last-7-days sales line chart on the dashboard. Compact-axis,
// brand-blue stroke, custom tooltip showing peso amount + order count.
export function SalesOverviewChart({ data }: { data: SalesByDay }) {
  const hasData = data.some((d) => d.total > 0);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Sales Overview</CardTitle>
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          This Week
        </span>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          {!hasData ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
              No sales yet this week — ring your first one at the POS.
            </div>
          ) : (
            <ResponsiveContainer>
              <LineChart
                data={data}
                margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#737373" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#737373" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 12px -2px rgb(0 0 0 / 0.06)",
                  }}
                  formatter={(value, _name, item: { payload?: { orders?: number } }) => [
                    `${formatPHP(Number(value) * 100)} (${item.payload?.orders ?? 0} orders)`,
                    "Sales",
                  ]}
                  labelFormatter={(label) => label}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--brand-accent)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--brand-accent)", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
