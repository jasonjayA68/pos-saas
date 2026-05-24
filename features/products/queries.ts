import "server-only";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/dal";
import { formatPHP } from "@/lib/money";
import { ProductFiltersSchema, type ProductFilters } from "./schemas";

export type ProductTableRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  priceCentavos: number;
  costCentavos: number;
  priceDisplay: string;
  costDisplay: string;
  unit: string;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  trackInventory: boolean;
  isActive: boolean;
  quantity: number;
  reorder: number;
  stockStatus: "ok" | "low" | "out" | "untracked";
};

export type ProductsPage = {
  items: ProductTableRow[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export async function listProducts(
  rawFilters: Partial<ProductFilters>,
): Promise<ProductsPage> {
  const member = await requirePermission("product:read");
  const filters = ProductFiltersSchema.parse(rawFilters);

  const branch = await prisma.branch.findFirst({
    where: {
      businessId: member.businessId,
      isDefault: true,
      deletedAt: null,
    },
    select: { id: true },
  });

  const where = {
    businessId: member.businessId,
    deletedAt: null,
    ...(filters.status === "active"
      ? { isActive: true }
      : filters.status === "archived"
        ? { isActive: false }
        : {}),
    ...(filters.categoryId
      ? { categoryId: filters.categoryId }
      : {}),
    ...(filters.stock === "out"
      ? {
          trackInventory: true,
          inventory: branch
            ? { none: { branchId: branch.id, quantity: { gt: 0 } } }
            : undefined,
        }
      : {}),
    ...(filters.q
      ? {
          OR: [
            {
              name: { contains: filters.q, mode: "insensitive" as const },
            },
            { sku: { contains: filters.q, mode: "insensitive" as const } },
            {
              barcode: { contains: filters.q, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        inventory: branch ? { where: { branchId: branch.id } } : false,
      },
      orderBy: { [filters.sort]: filters.dir },
      skip: (filters.page - 1) * filters.perPage,
      take: filters.perPage,
    }),
  ]);

  const items = products.map<ProductTableRow>((p) => {
    const inv = p.inventory[0];
    const qty = inv ? inv.quantity.toNumber() : 0;
    const reorder = inv ? inv.reorderPoint.toNumber() : 0;
    const stockStatus: ProductTableRow["stockStatus"] = !p.trackInventory
      ? "untracked"
      : qty <= 0
        ? "out"
        : qty <= reorder
          ? "low"
          : "ok";
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      description: p.description,
      priceCentavos: p.priceCentavos,
      costCentavos: p.costCentavos,
      priceDisplay: formatPHP(p.priceCentavos),
      costDisplay: formatPHP(p.costCentavos),
      unit: p.unit,
      imageUrl: p.imageUrl,
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? null,
      trackInventory: p.trackInventory,
      isActive: p.isActive,
      quantity: qty,
      reorder,
      stockStatus,
    };
  });

  return {
    items,
    page: filters.page,
    perPage: filters.perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / filters.perPage)),
  };
}
