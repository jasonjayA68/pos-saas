import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  PackageOpen,
  Receipt,
  ScanLine,
  ShoppingCart,
  TriangleAlert,
} from "lucide-react";
import { getActiveMember } from "@/lib/auth/dal";
import {
  getDashboardKpis,
  getOnboardingProgress,
  getRecentActivity,
} from "@/features/dashboard/queries";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPHP } from "@/lib/money";
import { formatPHDateTime } from "@/lib/dates";
import { KpiCard } from "./_components/kpi-card";
import { GetStartedChecklist } from "./_components/get-started-checklist";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const member = await getActiveMember();
  const [kpis, onboarding, activity] = await Promise.all([
    getDashboardKpis(),
    getOnboardingProgress(),
    getRecentActivity(8),
  ]);

  const displayName =
    member.fullName?.trim() || member.email.split("@")[0];

  // Day-over-day delta. Hide when yesterday had no sales (division by zero
  // would also overstate growth — "+∞%" isn't useful).
  const salesDelta =
    kpis.yesterdaySalesCentavos > 0
      ? ((kpis.todaySalesCentavos - kpis.yesterdaySalesCentavos) /
          kpis.yesterdaySalesCentavos) *
        100
      : null;
  const ordersDelta =
    kpis.yesterdayOrders > 0
      ? ((kpis.todayOrders - kpis.yesterdayOrders) /
          kpis.yesterdayOrders) *
        100
      : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title={`Welcome back, ${displayName}`}
        description={`${member.businessName} · here's how today is going.`}
        actions={
          <Link
            href="/pos"
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-card)] transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <ScanLine className="h-4 w-4" />
            Open POS
          </Link>
        }
      />

      <GetStartedChecklist progress={onboarding} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={ShoppingCart}
          label="Today's sales"
          value={formatPHP(kpis.todaySalesCentavos)}
          deltaPct={salesDelta}
          href="/sales"
        />
        <KpiCard
          icon={Receipt}
          label="Orders today"
          value={kpis.todayOrders.toString()}
          deltaPct={ordersDelta}
          href="/sales"
        />
        <KpiCard
          icon={PackageOpen}
          label="Active products"
          value={kpis.activeProducts.toString()}
          href="/products"
        />
        <KpiCard
          icon={TriangleAlert}
          label="Low stock"
          value={kpis.lowStockCount.toString()}
          tone={kpis.lowStockCount > 0 ? "warning" : "default"}
          href="/inventory"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Sales, voids, and team actions across your business.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {activity.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState
                  icon={Receipt}
                  title="No activity yet"
                  description="Once you ring your first sale or adjust inventory, it will show up here."
                />
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {activity.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-4 px-6 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{prettifyAction(a.action)}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        by {a.actorName}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                      {formatPHDateTime(a.createdAtIso)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <ShortcutLink href="/pos" icon={ScanLine} label="Open POS" />
            <ShortcutLink href="/products" icon={PackageOpen} label="Manage products" />
            <ShortcutLink href="/inventory" icon={Boxes} label="Check inventory" />
            <ShortcutLink href="/sales" icon={Receipt} label="View sales" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ShortcutLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof ScanLine;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-neutral-500" />
        {label}
      </span>
      <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
    </Link>
  );
}

// Activity codes look like `product.created` / `admin.tenant.suspend`.
// Turn them into something human-readable for the activity feed.
function prettifyAction(code: string): string {
  return code
    .split(".")
    .map((p) => p.replace(/_/g, " "))
    .join(" → ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
