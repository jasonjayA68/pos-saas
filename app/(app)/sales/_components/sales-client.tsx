"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import type {
  CashierOption,
  SaleRow,
  SalesPage,
} from "@/features/sales/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SaleDetailsSheet } from "./sale-details-sheet";
import { SalesPagination } from "./sales-pagination";
import { SalesTable } from "./sales-table";
import { SalesToolbar } from "./sales-toolbar";

type Filters = {
  from?: string;
  to?: string;
  paymentMethod: string;
  cashierId?: string;
  page: number;
  perPage: number;
};

type Props = {
  salesPage: SalesPage;
  cashiers: CashierOption[];
  filters: Filters;
  canRefund: boolean;
};

export function SalesClient({
  salesPage,
  cashiers,
  filters,
  canRefund,
}: Props) {
  const [selected, setSelected] = useState<SaleRow | null>(null);

  const hasFilters =
    !!filters.from ||
    !!filters.to ||
    filters.paymentMethod !== "all" ||
    !!filters.cashierId;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Sales"
        description={`${salesPage.total} ${salesPage.total === 1 ? "sale" : "sales"}`}
      />

      <SalesToolbar filters={filters} cashiers={cashiers} />

      {salesPage.items.length === 0 && !hasFilters ? (
        <EmptyState
          icon={Receipt}
          title="No sales yet"
          description="Sales will show up here once you ring your first transaction at the POS."
        />
      ) : (
        <>
          <SalesTable items={salesPage.items} onSelect={setSelected} />
          <SalesPagination
            page={salesPage.page}
            totalPages={salesPage.totalPages}
            total={salesPage.total}
            perPage={salesPage.perPage}
          />
        </>
      )}

      <SaleDetailsSheet
        sale={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        canRefund={canRefund}
      />
    </div>
  );
}
