import { getActiveMember } from "@/lib/auth/dal";
import { getCashiers, listSales } from "@/features/sales/queries";
import { SalesClient } from "./_components/sales-client";

export const metadata = { title: "Sales" };

type SearchParams = Promise<{
  from?: string;
  to?: string;
  paymentMethod?: string;
  cashierId?: string;
  page?: string;
  perPage?: string;
}>;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const member = await getActiveMember();

  const filters = {
    from: params.from,
    to: params.to,
    paymentMethod:
      (params.paymentMethod as
        | "all"
        | "CASH"
        | "GCASH"
        | "PAYMAYA"
        | "BANK_TRANSFER"
        | undefined) ?? "all",
    cashierId: params.cashierId,
    page: params.page ? Number.parseInt(params.page) : 1,
    perPage: params.perPage ? Number.parseInt(params.perPage) : 25,
  } as const;

  const [salesPage, cashiers] = await Promise.all([
    listSales(filters),
    getCashiers(),
  ]);

  return (
    <SalesClient
      salesPage={salesPage}
      cashiers={cashiers}
      filters={filters}
      canRefund={member.permissions.includes("sale:void")}
    />
  );
}
