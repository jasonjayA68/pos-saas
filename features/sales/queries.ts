import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import {
  SalesFiltersSchema,
  type SalesFilters,
} from "./schemas";

export type PosProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  priceCentavos: number;
  taxRateBps: number;
  unit: string;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  trackInventory: boolean;
  available: number;
};

export type PosContext = {
  branchId: string;
  branchName: string;
  products: PosProduct[];
};

export async function getPosContext(): Promise<PosContext> {
  const member = await requirePermission("sale:create");

  const branch = await prisma.branch.findFirst({
    where: {
      businessId: member.businessId,
      isDefault: true,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });
  if (!branch) {
    throw new AppError(
      "NOT_FOUND",
      "No default branch found. Set one up in Settings.",
    );
  }

  const products = await prisma.product.findMany({
    where: {
      businessId: member.businessId,
      deletedAt: null,
      isActive: true,
    },
    include: {
      category: { select: { name: true } },
      inventory: { where: { branchId: branch.id } },
    },
    orderBy: { name: "asc" },
    take: 500,
  });

  return {
    branchId: branch.id,
    branchName: branch.name,
    products: products.map<PosProduct>((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      priceCentavos: p.priceCentavos,
      taxRateBps: p.taxRateBps,
      unit: p.unit,
      imageUrl: p.imageUrl,
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? null,
      trackInventory: p.trackInventory,
      available: p.inventory[0]?.quantity.toNumber() ?? 0,
    })),
  };
}

export type ReceiptData = {
  receiptNumber: string;
  createdAtIso: string;
  business: {
    name: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    province: string | null;
    phone: string | null;
    email: string | null;
    taxId: string | null;
    vatRegistered: boolean;
    receiptHeader: string | null;
    receiptFooter: string | null;
  };
  branchName: string;
  cashierName: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPriceCentavos: number;
    totalCentavos: number;
  }>;
  subtotalCentavos: number;
  discountCentavos: number;
  taxCentavos: number;
  totalCentavos: number;
  amountPaidCentavos: number;
  changeCentavos: number;
  paymentMethod: string;
  notes: string | null;
};

export async function getReceiptData(
  saleId: string,
): Promise<ReceiptData | null> {
  const member = await requirePermission("sale:read");
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, businessId: member.businessId },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      branch: { select: { name: true } },
      cashier: { select: { fullName: true, email: true } },
      business: {
        select: {
          name: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          province: true,
          phone: true,
          email: true,
          taxId: true,
          vatRegistered: true,
          receiptHeader: true,
          receiptFooter: true,
        },
      },
    },
  });
  if (!sale) return null;

  return {
    receiptNumber: sale.receiptNumber,
    createdAtIso: sale.createdAt.toISOString(),
    business: sale.business,
    branchName: sale.branch.name,
    cashierName:
      sale.cashier.fullName || sale.cashier.email || "Cashier",
    items: sale.items.map((i) => ({
      name: i.productName,
      sku: i.productSku,
      quantity: i.quantity.toNumber(),
      unitPriceCentavos: i.unitPriceCentavos,
      totalCentavos: i.totalCentavos,
    })),
    subtotalCentavos: sale.subtotalCentavos,
    discountCentavos: sale.discountCentavos,
    taxCentavos: sale.taxCentavos,
    totalCentavos: sale.totalCentavos,
    amountPaidCentavos: sale.amountPaidCentavos,
    changeCentavos: sale.changeCentavos,
    paymentMethod: sale.paymentMethod,
    notes: sale.notes,
  };
}

export type SaleRow = {
  id: string;
  receiptNumber: string;
  createdAtIso: string;
  itemCount: number;
  subtotalCentavos: number;
  discountCentavos: number;
  taxCentavos: number;
  totalCentavos: number;
  paymentMethod: string;
  cashierName: string;
  voidedAt: string | null;
};

export type SalesPage = {
  items: SaleRow[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export async function listSales(
  rawFilters: Partial<SalesFilters>,
): Promise<SalesPage> {
  const member = await requirePermission("sale:read");
  const filters = SalesFiltersSchema.parse(rawFilters);

  const where: Prisma.SaleWhereInput = {
    businessId: member.businessId,
  };

  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.from) {
      createdAt.gte = new Date(`${filters.from}T00:00:00+08:00`);
    }
    if (filters.to) {
      createdAt.lte = new Date(`${filters.to}T23:59:59.999+08:00`);
    }
    where.createdAt = createdAt;
  }

  if (filters.paymentMethod !== "all") {
    where.paymentMethod = filters.paymentMethod;
  }

  if (filters.cashierId) {
    where.cashierUserId = filters.cashierId;
  }

  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        items: { select: { id: true } },
        cashier: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.perPage,
      take: filters.perPage,
    }),
  ]);

  return {
    items: sales.map<SaleRow>((s) => ({
      id: s.id,
      receiptNumber: s.receiptNumber,
      createdAtIso: s.createdAt.toISOString(),
      itemCount: s.items.length,
      subtotalCentavos: s.subtotalCentavos,
      discountCentavos: s.discountCentavos,
      taxCentavos: s.taxCentavos,
      totalCentavos: s.totalCentavos,
      paymentMethod: s.paymentMethod,
      cashierName: s.cashier.fullName || s.cashier.email || "Cashier",
      voidedAt: s.voidedAt?.toISOString() ?? null,
    })),
    page: filters.page,
    perPage: filters.perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / filters.perPage)),
  };
}

export type CashierOption = { id: string; name: string };

export async function getCashiers(): Promise<CashierOption[]> {
  const member = await requirePermission("sale:read");
  const members = await prisma.businessMember.findMany({
    where: { businessId: member.businessId, deletedAt: null },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  });
  return members
    .map<CashierOption>((m) => ({
      id: m.user.id,
      name: m.user.fullName || m.user.email || "—",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
