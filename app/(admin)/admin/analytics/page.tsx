import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSaasAnalytics } from "@/features/tenants/admin-queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPHDate } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { AnalyticsCharts } from "./_components/analytics-charts";

export const metadata = { title: "Admin · Analytics" };

export default async function AnalyticsPage() {
  const data = await getSaasAnalytics();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Platform-wide SaaS health: revenue, growth, and subscription mix."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Monthly Recurring Revenue"
          value={formatPHP(data.totals.mrrCentavos)}
          sub="from ACTIVE subscriptions"
        />
        <StatCard
          label="Active tenants"
          value={data.totals.activeTenants.toLocaleString()}
          sub={`${data.totals.tenants} total`}
        />
        <StatCard
          label="On trial"
          value={data.totals.trialingTenants.toLocaleString()}
        />
        <StatCard
          label="Expiring (7d)"
          value={data.totals.expiringSoon.toLocaleString()}
          highlight={data.totals.expiringSoon > 0}
        />
      </div>

      <AnalyticsCharts data={data} />

      <Card>
        <CardHeader>
          <CardTitle>Recent signups</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentSignups.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No signups yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Business</th>
                    <th className="px-6 py-3 font-medium">Owner</th>
                    <th className="px-6 py-3 font-medium">Plan</th>
                    <th className="px-6 py-3 font-medium">Signed up</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.recentSignups.map((s) => (
                    <tr key={s.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="px-6 py-3 font-medium">{s.name}</td>
                      <td className="px-6 py-3 text-neutral-600 dark:text-neutral-400">
                        {s.ownerEmail}
                      </td>
                      <td className="px-6 py-3">{s.planName ?? "—"}</td>
                      <td className="px-6 py-3 text-neutral-600 dark:text-neutral-400">
                        {formatPHDate(new Date(s.createdAt))}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/admin/tenants/${s.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-amber-300 ring-1 ring-amber-200 dark:border-amber-700" : ""}>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        {sub ? (
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {sub}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
