import {
  listPlanOptions,
  listTenants,
} from "@/features/tenants/admin-queries";
import { PageHeader } from "@/components/layout/page-header";
import { TenantsClient } from "./_components/tenants-client";

export const metadata = { title: "Admin · Tenants" };

type SearchParams = Promise<{
  search?: string;
  status?: string;
  planCode?: string;
  includeDeleted?: string;
  page?: string;
  perPage?: string;
}>;

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const filters = {
    search: params.search,
    status: (params.status ?? "all") as
      | "all"
      | "ACTIVE"
      | "TRIALING"
      | "PAST_DUE"
      | "CANCELED"
      | "EXPIRED"
      | "MISSING",
    planCode: params.planCode,
    includeDeleted: params.includeDeleted === "1",
    page: params.page ? Number.parseInt(params.page, 10) : 1,
    perPage: params.perPage ? Number.parseInt(params.perPage, 10) : 25,
  } as const;

  const [page, plans] = await Promise.all([
    listTenants(filters),
    listPlanOptions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description={`${page.total.toLocaleString()} businesses on the platform.`}
      />
      <TenantsClient page={page} filters={filters} plans={plans} />
    </div>
  );
}
