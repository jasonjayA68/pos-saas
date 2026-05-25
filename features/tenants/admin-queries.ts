import "server-only";
import type { Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { verifyPlatformAdmin } from "@/lib/auth/dal";
import {
  TenantsFiltersSchema,
  type TenantsFilters,
} from "./schemas";

// ── Tenants list ──────────────────────────────────────────────────────

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  planCode: string | null;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | "MISSING";
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  canceledAt: string | null;
  membersCount: number;
  totalSalesCentavos: number;
  totalSalesCount: number;
  createdAt: string;
  deletedAt: string | null;
};

export type TenantsPage = {
  items: TenantRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export async function listTenants(filters: TenantsFilters): Promise<TenantsPage> {
  await verifyPlatformAdmin();
  const parsed = TenantsFiltersSchema.parse(filters);

  const where: Prisma.BusinessWhereInput = parsed.includeDeleted
    ? {}
    : { deletedAt: null };

  if (parsed.search) {
    where.OR = [
      { name: { contains: parsed.search, mode: "insensitive" } },
      { slug: { contains: parsed.search, mode: "insensitive" } },
      {
        owner: {
          email: { contains: parsed.search, mode: "insensitive" },
        },
      },
      {
        owner: {
          fullName: { contains: parsed.search, mode: "insensitive" },
        },
      },
    ];
  }

  // Subscription-status filter: combine with planCode filter (both join
  // on the same `subscription` relation).
  const subFilter: Prisma.SubscriptionWhereInput = {};
  let hasSubFilter = false;
  if (parsed.status !== "all" && parsed.status !== "MISSING") {
    subFilter.status = parsed.status;
    hasSubFilter = true;
  }
  if (parsed.planCode) {
    subFilter.plan = { code: parsed.planCode };
    hasSubFilter = true;
  }
  if (hasSubFilter) {
    where.subscription = { is: subFilter };
  } else if (parsed.status === "MISSING") {
    where.subscription = { is: null };
  }

  const [total, businesses] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      include: {
        owner: { select: { fullName: true, email: true } },
        subscription: {
          include: { plan: { select: { code: true, name: true } } },
        },
        _count: {
          select: { members: { where: { deletedAt: null } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (parsed.page - 1) * parsed.perPage,
      take: parsed.perPage,
    }),
  ]);

  // Aggregate sales per business in a single groupBy — keeps the row
  // count one-per-tenant instead of one-per-sale joined.
  const businessIds = businesses.map((b) => b.id);
  const salesAgg =
    businessIds.length > 0
      ? await prisma.sale.groupBy({
          by: ["businessId"],
          where: {
            businessId: { in: businessIds },
            voidedAt: null,
          },
          _sum: { totalCentavos: true },
          _count: { _all: true },
        })
      : [];
  const salesByBusiness = new Map(
    salesAgg.map((s) => [
      s.businessId,
      { sum: s._sum.totalCentavos ?? 0, count: s._count._all },
    ]),
  );

  return {
    items: businesses.map<TenantRow>((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      ownerName: b.owner.fullName ?? "",
      ownerEmail: b.owner.email,
      planCode: b.subscription?.plan.code ?? null,
      planName: b.subscription?.plan.name ?? null,
      subscriptionStatus: b.subscription?.status ?? "MISSING",
      currentPeriodEnd: b.subscription?.currentPeriodEnd.toISOString() ?? null,
      trialEndsAt: b.subscription?.trialEndsAt?.toISOString() ?? null,
      canceledAt: b.subscription?.canceledAt?.toISOString() ?? null,
      membersCount: b._count.members,
      totalSalesCentavos: salesByBusiness.get(b.id)?.sum ?? 0,
      totalSalesCount: salesByBusiness.get(b.id)?.count ?? 0,
      createdAt: b.createdAt.toISOString(),
      deletedAt: b.deletedAt?.toISOString() ?? null,
    })),
    total,
    page: parsed.page,
    perPage: parsed.perPage,
    totalPages: Math.max(1, Math.ceil(total / parsed.perPage)),
  };
}

// ── Plans available for the change-plan menu ─────────────────────────

export async function listPlanOptions(): Promise<
  Array<{ code: string; name: string; priceCentavos: number }>
> {
  await verifyPlatformAdmin();
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { priceCentavos: "asc" },
    select: { code: true, name: true, priceCentavos: true },
  });
  return plans;
}

// ── Single tenant detail ──────────────────────────────────────────────

export type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  businessType: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  taxId: string | null;
  vatRegistered: boolean;
  createdAt: string;
  deletedAt: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  subscription: {
    status: SubscriptionStatus;
    planCode: string;
    planName: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    trialEndsAt: string | null;
    canceledAt: string | null;
  } | null;
  stats: {
    membersCount: number;
    productsCount: number;
    salesCount: number;
    salesTotalCentavos: number;
    lastActiveAt: string | null;
  };
  payments: Array<{
    id: string;
    method: string;
    amountCentavos: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    referenceNumber: string | null;
    createdAt: string;
    reviewedAt: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    actorName: string | null;
    createdAt: string;
  }>;
};

export async function getTenantDetail(
  businessId: string,
): Promise<TenantDetail | null> {
  await verifyPlatformAdmin();

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      subscription: {
        include: { plan: { select: { code: true, name: true } } },
      },
      _count: {
        select: {
          members: { where: { deletedAt: null } },
          products: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!business) return null;

  const [salesAgg, lastSale, payments, activity] = await Promise.all([
    prisma.sale.aggregate({
      where: { businessId, voidedAt: null },
      _sum: { totalCentavos: true },
      _count: { _all: true },
    }),
    prisma.sale.findFirst({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.subscriptionPayment.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        method: true,
        amountCentavos: true,
        status: true,
        referenceNumber: true,
        createdAt: true,
        reviewedAt: true,
      },
    }),
    prisma.activityLog.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { fullName: true, email: true } } },
    }),
  ]);

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    businessType: business.businessType,
    email: business.email,
    phone: business.phone,
    city: business.city,
    province: business.province,
    taxId: business.taxId,
    vatRegistered: business.vatRegistered,
    createdAt: business.createdAt.toISOString(),
    deletedAt: business.deletedAt?.toISOString() ?? null,
    owner: {
      id: business.owner.id,
      name: business.owner.fullName ?? "",
      email: business.owner.email,
    },
    subscription: business.subscription
      ? {
          status: business.subscription.status,
          planCode: business.subscription.plan.code,
          planName: business.subscription.plan.name,
          currentPeriodStart:
            business.subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd:
            business.subscription.currentPeriodEnd.toISOString(),
          trialEndsAt:
            business.subscription.trialEndsAt?.toISOString() ?? null,
          canceledAt:
            business.subscription.canceledAt?.toISOString() ?? null,
        }
      : null,
    stats: {
      membersCount: business._count.members,
      productsCount: business._count.products,
      salesCount: salesAgg._count._all,
      salesTotalCentavos: salesAgg._sum.totalCentavos ?? 0,
      lastActiveAt: lastSale?.createdAt.toISOString() ?? null,
    },
    payments: payments.map((p) => ({
      id: p.id,
      method: p.method,
      amountCentavos: p.amountCentavos,
      status: p.status,
      referenceNumber: p.referenceNumber,
      createdAt: p.createdAt.toISOString(),
      reviewedAt: p.reviewedAt?.toISOString() ?? null,
    })),
    recentActivity: activity.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      actorName: a.user?.fullName ?? a.user?.email ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

// ── Subscriptions cross-section ──────────────────────────────────────

export type SubscriptionRow = {
  businessId: string;
  businessName: string;
  ownerEmail: string;
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  daysRemaining: number;
};

export type SubscriptionBuckets = {
  active: SubscriptionRow[];
  trialing: SubscriptionRow[];
  pastDue: SubscriptionRow[];
  canceled: SubscriptionRow[];
  expired: SubscriptionRow[];
  expiringWithin7Days: SubscriptionRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getSubscriptionBuckets(): Promise<SubscriptionBuckets> {
  await verifyPlatformAdmin();
  const subs = await prisma.subscription.findMany({
    include: {
      business: { select: { id: true, name: true, deletedAt: true } },
      plan: { select: { code: true, name: true } },
    },
    orderBy: { currentPeriodEnd: "asc" },
  });

  // Pull owner emails in one shot — avoids N+1.
  const ownerIds = await prisma.business.findMany({
    where: { id: { in: subs.map((s) => s.business.id) } },
    select: { id: true, ownerUserId: true },
  });
  const ownerByBusiness = new Map(ownerIds.map((b) => [b.id, b.ownerUserId]));
  const owners = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set(ownerByBusiness.values())) } },
    select: { id: true, email: true },
  });
  const emailByUser = new Map(owners.map((u) => [u.id, u.email]));

  const now = Date.now();
  const rows = subs
    .filter((s) => !s.business.deletedAt)
    .map<SubscriptionRow>((s) => ({
      businessId: s.business.id,
      businessName: s.business.name,
      ownerEmail:
        emailByUser.get(ownerByBusiness.get(s.business.id) ?? "") ?? "",
      planCode: s.plan.code,
      planName: s.plan.name,
      status: s.status,
      currentPeriodEnd: s.currentPeriodEnd.toISOString(),
      trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
      daysRemaining: Math.max(
        0,
        Math.ceil((s.currentPeriodEnd.getTime() - now) / DAY_MS),
      ),
    }));

  return {
    active: rows.filter((r) => r.status === "ACTIVE"),
    trialing: rows.filter((r) => r.status === "TRIALING"),
    pastDue: rows.filter((r) => r.status === "PAST_DUE"),
    canceled: rows.filter((r) => r.status === "CANCELED"),
    expired: rows.filter((r) => r.status === "EXPIRED"),
    expiringWithin7Days: rows.filter(
      (r) =>
        (r.status === "ACTIVE" || r.status === "TRIALING") &&
        r.daysRemaining <= 7,
    ),
  };
}

// ── SaaS analytics ───────────────────────────────────────────────────

export type SaasAnalytics = {
  totals: {
    tenants: number;
    activeTenants: number;
    trialingTenants: number;
    suspendedTenants: number;
    expiredTenants: number;
    mrrCentavos: number; // Monthly Recurring Revenue
    expiringSoon: number;
  };
  signupsByDay: Array<{ day: string; count: number }>;
  revenueByMonth: Array<{ month: string; revenueCentavos: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  recentSignups: Array<{
    id: string;
    name: string;
    ownerEmail: string;
    planName: string | null;
    createdAt: string;
  }>;
  paymentTrends: Array<{
    day: string;
    approved: number;
    rejected: number;
    pending: number;
  }>;
};

// Plan distribution for the donut chart on the admin overview. One row
// per plan, descending count.
export type PlanDistribution = Array<{
  planCode: string;
  planName: string;
  count: number;
}>;

export async function getTenantsByPlan(): Promise<PlanDistribution> {
  await verifyPlatformAdmin();
  const grouped = await prisma.subscription.groupBy({
    by: ["planId"],
    _count: { _all: true },
  });
  const planIds = grouped.map((g) => g.planId);
  const plans = await prisma.plan.findMany({
    where: { id: { in: planIds } },
    select: { id: true, code: true, name: true },
  });
  const byId = new Map(plans.map((p) => [p.id, p]));
  return grouped
    .map<PlanDistribution[number] | null>((g) => {
      const p = byId.get(g.planId);
      if (!p) return null;
      return { planCode: p.code, planName: p.name, count: g._count._all };
    })
    .filter((p): p is PlanDistribution[number] => p !== null)
    .sort((a, b) => b.count - a.count);
}

export async function getSaasAnalytics(): Promise<SaasAnalytics> {
  await verifyPlatformAdmin();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * DAY_MS);

  const [
    totalTenants,
    activeCount,
    trialingCount,
    suspendedCount,
    expiredCount,
    activeSubs,
    expiringSoonCount,
    recentSignupsRaw,
    signupsRaw,
    approvedPayments,
    paymentsLast30,
  ] = await Promise.all([
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIALING" } }),
    prisma.subscription.count({ where: { status: "CANCELED" } }),
    prisma.subscription.count({ where: { status: "EXPIRED" } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      include: {
        plan: {
          select: { priceCentavos: true, billingInterval: true },
        },
      },
    }),
    prisma.subscription.count({
      where: {
        status: { in: ["ACTIVE", "TRIALING"] },
        currentPeriodEnd: { lte: sevenDaysFromNow, gte: now },
      },
    }),
    prisma.business.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        owner: { select: { email: true } },
        subscription: { include: { plan: { select: { name: true } } } },
      },
    }),
    prisma.business.findMany({
      where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.subscriptionPayment.findMany({
      where: {
        status: "APPROVED",
        reviewedAt: { gte: sixMonthsAgo },
      },
      include: { plan: { select: { priceCentavos: true } } },
    }),
    prisma.subscriptionPayment.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { status: true, createdAt: true },
    }),
  ]);

  // MRR: sum of ACTIVE plan prices, monthly-normalized.
  const mrrCentavos = activeSubs.reduce((sum, s) => {
    const monthly =
      s.plan.billingInterval === "YEARLY"
        ? Math.round(s.plan.priceCentavos / 12)
        : s.plan.priceCentavos;
    return sum + monthly;
  }, 0);

  // Signups by day — fill in zero days so the chart spans the full range.
  const signupsByDay = buildDailyBuckets(thirtyDaysAgo, now, (key) => {
    return signupsRaw.filter(
      (s) => s.createdAt.toISOString().slice(0, 10) === key,
    ).length;
  });

  // Revenue by month from approved payments.
  const revenueByMonth = buildMonthlyBuckets(sixMonthsAgo, now, (monthKey) => {
    return approvedPayments
      .filter((p) => {
        const reviewed = p.reviewedAt;
        if (!reviewed) return false;
        return monthKey === reviewed.toISOString().slice(0, 7);
      })
      .reduce((sum, p) => sum + p.amountCentavos, 0);
  });

  // Payment trends — group by day.
  const paymentTrends = buildDailyBuckets(thirtyDaysAgo, now, (key) => {
    const dayPayments = paymentsLast30.filter(
      (p) => p.createdAt.toISOString().slice(0, 10) === key,
    );
    return {
      approved: dayPayments.filter((p) => p.status === "APPROVED").length,
      rejected: dayPayments.filter((p) => p.status === "REJECTED").length,
      pending: dayPayments.filter((p) => p.status === "PENDING").length,
    };
  }).map((b) => ({ day: b.day, ...(b.count as any) })) as Array<{
    day: string;
    approved: number;
    rejected: number;
    pending: number;
  }>;

  return {
    totals: {
      tenants: totalTenants,
      activeTenants: activeCount,
      trialingTenants: trialingCount,
      suspendedTenants: suspendedCount,
      expiredTenants: expiredCount,
      mrrCentavos,
      expiringSoon: expiringSoonCount,
    },
    signupsByDay: signupsByDay.map((b) => ({
      day: b.day,
      count: b.count as number,
    })),
    revenueByMonth,
    statusDistribution: [
      { status: "Active", count: activeCount },
      { status: "Trialing", count: trialingCount },
      { status: "Past due", count: 0 },
      { status: "Suspended", count: suspendedCount },
      { status: "Expired", count: expiredCount },
    ].filter((s) => s.count > 0),
    recentSignups: recentSignupsRaw.map((b) => ({
      id: b.id,
      name: b.name,
      ownerEmail: b.owner.email,
      planName: b.subscription?.plan.name ?? null,
      createdAt: b.createdAt.toISOString(),
    })),
    paymentTrends,
  };
}

// ── helpers ───────────────────────────────────────────────────────────

function buildDailyBuckets<T>(
  from: Date,
  to: Date,
  compute: (key: string) => T,
): Array<{ day: string; count: T }> {
  const buckets: Array<{ day: string; count: T }> = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor <= to) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.push({ day: key, count: compute(key) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}

function buildMonthlyBuckets(
  from: Date,
  to: Date,
  compute: (monthKey: string) => number,
): Array<{ month: string; revenueCentavos: number }> {
  const buckets: Array<{ month: string; revenueCentavos: number }> = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ month: key, revenueCentavos: compute(key) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}
