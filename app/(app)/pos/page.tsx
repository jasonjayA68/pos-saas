import Link from "next/link";
import { Package } from "lucide-react";
import { getActiveMember } from "@/lib/auth/dal";
import { getPosContext } from "@/features/sales/queries";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PosClient } from "./_components/pos-client";

export const metadata = { title: "POS" };

export default async function PosPage() {
  const member = await getActiveMember();
  const context = await getPosContext();

  if (context.products.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <PageHeader
          title="POS"
          description={`${context.branchName} · ${member.email}`}
        />
        <EmptyState
          icon={Package}
          title="No active products"
          description="Add at least one active product before you can ring up a sale."
          action={
            <Link href="/products">
              <Button>Go to products</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <PosClient
      branchId={context.branchId}
      branchName={context.branchName}
      products={context.products}
      cashierName={member.fullName || member.email}
    />
  );
}
