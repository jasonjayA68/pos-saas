import {
  PackageOpen,
  Receipt,
  ShoppingCart,
  TriangleAlert,
  Users,
} from "lucide-react";
import { getActiveMember } from "@/lib/auth/dal";
import {
  getCustomerCount,
  getDashboardKpis,
  getOnboardingProgress,
  getRecentTransactions,
  getSalesByDay,
  getTopSellingProducts,
} from "@/features/dashboard/queries";
import { formatPHP } from "@/lib/money";
import { GetStartedChecklist } from "./_components/get-started-checklist";
import { KpiCard } from "./_components/kpi-card";
import { RecentTransactions } from "./_components/recent-transactions";
import { SalesOverviewChart } from "./_components/sales-overview-chart";
import { TopSellingProducts } from "./_components/top-selling-products";
import { WelcomeBanner } from "./_components/welcome-banner";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const member = await getActiveMember();
  const [
    kpis,
    customerCount,
    onboarding,
    salesByDay,
    transactions,
    topProducts,
  ] = await Promise.all([
    getDashboardKpis(),
    getCustomerCount(),
    getOnboardingProgress(),
    getSalesByDay(7),
    getRecentTransactions(5),
    getTopSellingProducts(4),
  ]);

  const displayName =
    member.fullName?.trim() || member.email.split("@")[0];
  const firstName = displayName.split(" ")[0];

  // Trend deltas — hidden when yesterday had no sales (would otherwise
  // show misleading "+∞%").
  const salesDelta =
    kpis.yesterdaySalesCentavos > 0
      ? ((kpis.todaySalesCentavos - kpis.yesterdaySalesCentavos) /
          kpis.yesterdaySalesCentavos) *
        100
      : null;
  const ordersDelta =
    kpis.yesterdayOrders > 0
      ? ((kpis.todayOrders - kpis.yesterdayOrders) / kpis.yesterdayOrders) *
        100
      : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <WelcomeBanner displayName={firstName} />

      <GetStartedChecklist progress={onboarding} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={ShoppingCart}
          label="Today's Sales"
          value={formatPHP(kpis.todaySalesCentavos)}
          deltaPct={salesDelta}
          tone="blue"
          href="/sales"
        />
        <KpiCard
          icon={Receipt}
          label="Total Orders"
          value={kpis.todayOrders.toString()}
          deltaPct={ordersDelta}
          tone="emerald"
          href="/sales"
        />
        <KpiCard
          icon={Users}
          label="Total Customers"
          value={customerCount.toString()}
          tone="violet"
          href="/customers"
        />
        <KpiCard
          icon={TriangleAlert}
          label="Low Stock Items"
          value={kpis.lowStockCount.toString()}
          tone="amber"
          highlight={kpis.lowStockCount > 0}
          actionHref="/inventory"
          actionLabel="View items"
        />
      </div>

      {/* 3-widget content row: chart spans 2 cols, transactions + top
          products each take 1 col on lg+. Stacks on mobile. */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <SalesOverviewChart data={salesByDay} />
        </div>
        <div className="lg:col-span-1">
          <RecentTransactions transactions={transactions} />
        </div>
        <div className="lg:col-span-1">
          <TopSellingProducts products={topProducts} />
        </div>
      </div>
    </div>
  );
}
