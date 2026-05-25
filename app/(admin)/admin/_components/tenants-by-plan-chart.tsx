"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PlanDistribution } from "@/features/tenants/admin-queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Brand-aligned palette for plan slices — top tier (Pro) uses brand
// navy; the rest descend through accent + teal + neutral.
const SLICE_COLORS = [
  "var(--brand-primary)",
  "var(--brand-accent)",
  "var(--brand-teal)",
  "#a3a3a3",
  "#d4d4d4",
];

export function TenantsByPlanChart({ data }: { data: PlanDistribution }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Tenants by Plan</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
            No subscriptions yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative h-48 w-48 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="planName"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label — total tenant count. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
              >
                <span className="text-2xl font-semibold tabular-nums">
                  {total}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  Total
                </span>
              </div>
            </div>
            <ul className="flex-1 space-y-2 text-sm">
              {data.map((d, i) => {
                const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : "0";
                return (
                  <li
                    key={d.planCode}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            SLICE_COLORS[i % SLICE_COLORS.length],
                        }}
                        aria-hidden="true"
                      />
                      <span>{d.planName}</span>
                    </span>
                    <span className="tabular-nums text-neutral-600 dark:text-neutral-400">
                      {d.count}{" "}
                      <span className="text-xs text-neutral-400">
                        ({pct}%)
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
