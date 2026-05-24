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
