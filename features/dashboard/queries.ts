import "server-only";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/dal";

const DAY_MS = 24 * 60 * 60 * 1000;
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

// Returns the UTC instant corresponding to the start of "today" in Manila.
// We need this so /dashboard's "Today's sales" matches what a cashier in
// Manila sees, not what UTC midnight gives them.
function startOfDayInManila(now: Date): Date {
  const manila = new Date(now.getTime() + PH_OFFSET_MS);
  manila.setUTCHours(0, 0, 0, 0);
  return new Date(manila.getTime() - PH_OFFSET_MS);
}

export type DashboardKpis = {
  todaySalesCentavos: number;
  todayOrders: number;
  yesterdaySalesCentavos: number;
  yesterdayOrders: number;
  activeProducts: number;
  lowStockCount: number;
};

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const member = await requirePermission("sale:read");
  const now = new Date();
  const todayStart = startOfDayInManila(now);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const todayEnd = new Date(todayStart.getTime() + DAY_MS);

  const [todayAgg, yesterdayAgg, activeProducts, lowStockRows] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          businessId: member.businessId,
          voidedAt: null,
          createdAt: { gte: todayStart, lt: todayEnd },
        },
        _sum: { totalCentavos: true },
        _count: { _all: true },
      }),
      prisma.sale.aggregate({
        where: {
          businessId: member.businessId,
          voidedAt: null,
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
        _sum: { totalCentavos: true },
        _count: { _all: true },
      }),
      prisma.product.count({
        where: {
          businessId: member.businessId,
          deletedAt: null,
          isActive: true,
        },
      }),
      // Prisma can't compare two columns in a WHERE clause directly; pull
      // the rows we'd consider "at risk" (quantity ≤ 50 or reorderPoint > 0)
      // then filter in app. Bounded by `take` so it never gets huge.
      prisma.inventoryLevel.findMany({
        where: {
          businessId: member.businessId,
          product: { trackInventory: true, deletedAt: null, isActive: true },
          reorderPoint: { gt: 0 },
        },
        select: { quantity: true, reorderPoint: true },
        take: 500,
      }),
    ]);

  const lowStockCount = lowStockRows.filter((r) =>
    r.quantity.lte(r.reorderPoint),
  ).length;

  return {
    todaySalesCentavos: todayAgg._sum.totalCentavos ?? 0,
    todayOrders: todayAgg._count._all,
    yesterdaySalesCentavos: yesterdayAgg._sum.totalCentavos ?? 0,
    yesterdayOrders: yesterdayAgg._count._all,
    activeProducts,
    lowStockCount,
  };
}

// Drives the "Get Started" onboarding checklist. Each boolean = step done.
export type OnboardingProgress = {
  hasProducts: boolean;
  hasSale: boolean;
  hasTeam: boolean;
  hasLogo: boolean;
  allComplete: boolean;
};

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const member = await requirePermission("sale:read");

  const [productCount, saleCount, memberCount, business] = await Promise.all([
    prisma.product.count({
      where: { businessId: member.businessId, deletedAt: null },
    }),
    prisma.sale.count({
      where: { businessId: member.businessId },
    }),
    prisma.businessMember.count({
      where: { businessId: member.businessId, deletedAt: null },
    }),
    prisma.business.findUnique({
      where: { id: member.businessId },
      select: { logoUrl: true },
    }),
  ]);

  const hasProducts = productCount > 0;
  const hasSale = saleCount > 0;
  const hasTeam = memberCount > 1; // owner + at least one teammate
  const hasLogo = !!business?.logoUrl;

  return {
    hasProducts,
    hasSale,
    hasTeam,
    hasLogo,
    allComplete: hasProducts && hasSale && hasTeam && hasLogo,
  };
}

export type RecentActivityRow = {
  id: string;
  action: string;
  entityType: string;
  actorName: string;
  createdAtIso: string;
};

export async function getRecentActivity(
  limit = 8,
): Promise<RecentActivityRow[]> {
  const member = await requirePermission("sale:read");
  const rows = await prisma.activityLog.findMany({
    where: { businessId: member.businessId },
    include: { user: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entityType,
    actorName: r.user?.fullName || r.user?.email || "System",
    createdAtIso: r.createdAt.toISOString(),
  }));
}

// Total customers — replaces "active products" in the new dashboard KPI
// row to match the mockup. Fast: indexed scalar count.
export async function getCustomerCount(): Promise<number> {
  const member = await requirePermission("sale:read");
  return prisma.customer.count({
    where: { businessId: member.businessId, deletedAt: null },
  });
}

// Sales by day for the Sales Overview chart. Defaults to the last 7
// days. Returns one bucket per day even when there were no sales
// (so the chart line stays continuous instead of skipping zeros).
export type SalesByDay = Array<{
  day: string; // YYYY-MM-DD
  label: string; // "Mon", "Tue", …
  total: number; // pesos (Number, not centavos — chart-friendly)
  orders: number;
}>;

export async function getSalesByDay(days = 7): Promise<SalesByDay> {
  const member = await requirePermission("sale:read");
  const now = new Date();
  // Start at `days - 1` ago so today is included as the last bucket.
  const start = startOfDayInManila(
    new Date(now.getTime() - (days - 1) * DAY_MS),
  );

  const sales = await prisma.sale.findMany({
    where: {
      businessId: member.businessId,
      voidedAt: null,
      createdAt: { gte: start },
    },
    select: { totalCentavos: true, createdAt: true },
  });

  // Bucket by day in Manila time so the labels line up with what
  // cashiers see ("today" = Manila today, not UTC).
  const buckets = new Map<string, { total: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { total: 0, orders: 0 });
  }
  const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const s of sales) {
    const manila = new Date(s.createdAt.getTime() + PH_OFFSET_MS);
    const key = manila.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.total += s.totalCentavos;
    bucket.orders += 1;
  }
  return Array.from(buckets.entries()).map(([key, v]) => ({
    day: key,
    label: DAYS_OF_WEEK[new Date(`${key}T00:00:00+08:00`).getUTCDay()] ?? key,
    total: v.total / 100,
    orders: v.orders,
  }));
}

// Five most recent non-voided sales — feeds the Recent Transactions widget.
export type RecentTransaction = {
  id: string;
  receiptNumber: string;
  customerName: string;
  totalCentavos: number;
  createdAtIso: string;
};

export async function getRecentTransactions(
  limit = 5,
): Promise<RecentTransaction[]> {
  const member = await requirePermission("sale:read");
  const sales = await prisma.sale.findMany({
    where: { businessId: member.businessId, voidedAt: null },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return sales.map((s) => ({
    id: s.id,
    receiptNumber: s.receiptNumber,
    customerName: s.customer?.name ?? "Walk-in Customer",
    totalCentavos: s.totalCentavos,
    createdAtIso: s.createdAt.toISOString(),
  }));
}

// Top selling products — sums sale_items.quantity per product across
// non-voided sales. Joins back to product for name + imageUrl. The mockup
// shows last-30-day window; we use the same range for relevance.
export type TopProduct = {
  productId: string;
  name: string;
  imageUrl: string | null;
  unitsSold: number;
};

export async function getTopSellingProducts(
  limit = 5,
  windowDays = 30,
): Promise<TopProduct[]> {
  const member = await requirePermission("sale:read");
  const since = new Date(Date.now() - windowDays * DAY_MS);

  const aggregated = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: {
      businessId: member.businessId,
      sale: { voidedAt: null, createdAt: { gte: since } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  if (aggregated.length === 0) return [];

  const productIds = aggregated.map((a) => a.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, imageUrl: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  return aggregated
    .map<TopProduct | null>((a) => {
      const product = byId.get(a.productId);
      if (!product) return null;
      return {
        productId: a.productId,
        name: product.name,
        imageUrl: product.imageUrl,
        unitsSold: Number(a._sum.quantity ?? 0),
      };
    })
    .filter((p): p is TopProduct => p !== null);
}

// Subscription summary for the "Current Plan" card pinned to the sidebar.
// Pulled once per request in the (app) layout and passed down — cheaper
// than every page re-fetching it.
export type CurrentPlanSummary = {
  planName: string;
  status: string;
  validUntilIso: string | null;
  daysRemaining: number | null;
  // 0–100, used for the progress bar in the sidebar card.
  pctElapsed: number | null;
};

export async function getCurrentPlanSummary(
  businessId: string,
): Promise<CurrentPlanSummary | null> {
  const sub = await prisma.subscription.findUnique({
    where: { businessId },
    include: { plan: { select: { name: true } } },
  });
  if (!sub) return null;
  const now = Date.now();
  const start = sub.currentPeriodStart.getTime();
  const end = sub.currentPeriodEnd.getTime();
  const totalMs = end - start;
  const elapsedMs = now - start;
  const pctElapsed =
    totalMs > 0
      ? Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)))
      : null;
  const daysRemaining = Math.max(0, Math.ceil((end - now) / DAY_MS));
  return {
    planName: sub.plan.name,
    status: sub.status,
    validUntilIso: sub.currentPeriodEnd.toISOString(),
    daysRemaining,
    pctElapsed,
  };
}
