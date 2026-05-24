import "server-only";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/dal";

export type CategoryRow = { id: string; name: string };

export async function listCategories(): Promise<CategoryRow[]> {
  const member = await requirePermission("category:read");
  return prisma.category.findMany({
    where: { businessId: member.businessId, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
