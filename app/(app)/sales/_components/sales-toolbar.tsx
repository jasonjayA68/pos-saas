"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import type { CashierOption } from "@/features/sales/queries";
import { PaymentMethodLabels, POS_PAYMENT_METHODS } from "@/features/sales/schemas";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Filters = {
  from?: string;
  to?: string;
  paymentMethod: string;
  cashierId?: string;
};

type Props = {
  filters: Filters;
  cashiers: CashierOption[];
};

export function SalesToolbar({ filters, cashiers }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const exportHref = `/api/sales/export?${searchParams.toString()}`;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label
            htmlFor="from"
            className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
          >
            From
          </label>
          <Input
            id="from"
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => setParam("from", e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="to"
            className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
          >
            To
          </label>
          <Input
            id="to"
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => setParam("to", e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="paymentMethod"
            className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
          >
            Payment
          </label>
          <Select
            id="paymentMethod"
            value={filters.paymentMethod}
            onChange={(e) => setParam("paymentMethod", e.target.value)}
          >
            <option value="all">All methods</option>
            {POS_PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PaymentMethodLabels[m]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label
            htmlFor="cashierId"
            className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
          >
            Cashier
          </label>
          <Select
            id="cashierId"
            value={filters.cashierId ?? ""}
            onChange={(e) => setParam("cashierId", e.target.value)}
          >
            <option value="">All cashiers</option>
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <a
        href={exportHref}
        download
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        <Download className="h-4 w-4" /> Export CSV
      </a>
    </div>
  );
}
