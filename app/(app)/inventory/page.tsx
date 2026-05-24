import Link from "next/link";
import { Layers } from "lucide-react";
import { getActiveMember } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  InventoryClient,
  type InventoryRow,
} from "./_components/inventory-client";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const member = await getActiveMember();
  const branch = await prisma.branch.findFirst({
    where: {
      businessId: member.businessId,
      isDefault: true,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!branch) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <PageHeader
          title="Inventory"
          description="Track stock across all branches."
        />
        <EmptyState
          icon={Layers}
          title="No branches yet"
          description="Set up a branch in Settings before tracking inventory."
        />
      </div>
    );
  }

  const products = await prisma.product.findMany({
    where: {
      businessId: member.businessId,
      deletedAt: null,
      trackInventory: true,
    },
    include: {
      inventory: { where: { branchId: branch.id } },
    },
    orderBy: { name: "asc" },
  });

  if (products.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <PageHeader
          title="Inventory"
          description={`Stock for ${branch.name}`}
        />
        <EmptyState
          icon={Layers}
          title="No products tracked yet"
          description="Create a product with inventory tracking enabled to see it here."
          action={
            <Link href="/products">
              <Button variant="outline">Go to products</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const items: InventoryRow[] = products.map((p) => {
    const inv = p.inventory[0];
    const quantity = inv ? inv.quantity.toNumber() : 0;
    const reorder = inv ? inv.reorderPoint.toNumber() : 0;
    const status: InventoryRow["status"] =
      quantity <= 0 ? "out" : quantity <= reorder ? "low" : "ok";
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      quantity,
      reorder,
      status,
    };
  });

  return (
    <InventoryClient
      items={items}
      branchId={branch.id}
      branchName={branch.name}
      canEdit={member.permissions.includes("inventory:update")}
    />
  );
}
