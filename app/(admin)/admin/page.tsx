import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getAdminDashboardStats } from "@/features/billing/admin-queries";
import { getTenantsByPlan } from "@/features/tenants/admin-queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/app/(app)/dashboard/_components/kpi-card";
import { formatPHDate } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { TenantsByPlanChart } from "./_components/tenants-by-plan-chart";

export const metadata = { title: "Platform Admin" };

export default async function AdminHome() {
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );

  const [stats, planDistribution, activeSubs, businesses, signupsThisMonth] =
    await Promise.all([
      getAdminDashboardStats(),
      getTenantsByPlan(),
      // MRR — sum of monthly-normalized plan prices for ACTIVE subs.
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        include: {
          plan: { select: { priceCentavos: true, billingInterval: true } },
        },
      }),
      // Most recent 5 signups for the right-rail card.
      prisma.business.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          owner: { select: { email: true, fullName: true } },
          subscription: { include: { plan: { select: { name: true } } } },
        },
      }),
      // Signups in the current calendar month — feeds "new this month".
      prisma.business.count({
        where: { deletedAt: null, createdAt: { gte: startOfMonth } },
      }),
    ]);

  const mrrCentavos = activeSubs.reduce((sum, s) => {
    const monthly =
      s.plan.billingInterval === "YEARLY"
        ? Math.round(s.plan.priceCentavos / 12)
        : s.plan.priceCentavos;
    return sum + monthly;
  }, 0);

  const totalTenants =
    stats.activeBusinesses + stats.trialingBusinesses;

  return (
    <div className="space-y-6 p-6 lg:p-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          System Summary · platform-wide health and growth.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Total Tenants"
          value={totalTenants.toLocaleString()}
          deltaPct={signupsThisMonth > 0 ? signupsThisMonth : null}
          deltaLabel="new this month"
          tone="blue"
          href="/admin/tenants"
        />
        <KpiCard
          icon={Users}
          label="Active Tenants"
          value={stats.activeBusinesses.toLocaleString()}
          tone="emerald"
          href="/admin/subscriptions"
        />
        <KpiCard
          icon={TrendingUp}
          label="Monthly Recurring Revenue"
          value={formatPHP(mrrCentavos)}
          tone="violet"
          href="/admin/analytics"
        />
        <KpiCard
          icon={CreditCard}
          label="Pending Payments"
          value={stats.pendingPayments.toLocaleString()}
          tone="amber"
          highlight={stats.pendingPayments > 0}
          actionHref="/admin/payments"
          actionLabel="View all"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TenantsByPlanChart data={planDistribution} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Tenants</CardTitle>
              <CardDescription>Last 5 signups.</CardDescription>
            </div>
            <Link
              href="/admin/tenants"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-accent)] hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {businesses.length === 0 ? (
              <div className="px-6 pb-6 text-sm text-neutral-500 dark:text-neutral-400">
                No tenants yet.
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {businesses.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 px-6 py-3"
                  >
                    <Link
                      href={`/admin/tenants/${b.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-semibold text-[var(--brand-primary)]">
                        {b.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {b.name}
                        </div>
                        <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {b.owner.email}
                        </div>
                      </div>
                    </Link>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-medium">
                        {b.subscription?.plan.name ?? "—"}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatPHDate(b.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Need more?</CardTitle>
          <CardDescription>
            Deeper analytics, lifecycle views, and tenant management.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <Link
            href="/admin/payments"
            className="inline-flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm transition-colors hover:border-[var(--brand-accent)] hover:bg-[var(--brand-soft)] dark:border-neutral-800"
          >
            <span className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-amber-600" /> Review payments
            </span>
            <ArrowRight className="h-4 w-4 text-neutral-400" />
          </Link>
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm transition-colors hover:border-[var(--brand-accent)] hover:bg-[var(--brand-soft)] dark:border-neutral-800"
          >
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" /> Subscriptions
            </span>
            <ArrowRight className="h-4 w-4 text-neutral-400" />
          </Link>
          <Link
            href="/admin/analytics"
            className="inline-flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm transition-colors hover:border-[var(--brand-accent)] hover:bg-[var(--brand-soft)] dark:border-neutral-800"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Full analytics
            </span>
            <ArrowRight className="h-4 w-4 text-neutral-400" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
