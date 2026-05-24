import { getActiveMember } from "@/lib/auth/dal";
import { listProducts } from "@/features/products/queries";
import { listCategories } from "@/features/categories/queries";
import { ProductsClient } from "./_components/products-client";

export const metadata = { title: "Products" };

type SearchParams = Promise<{
  q?: string;
  category?: string;
  status?: string;
  stock?: string;
  page?: string;
  perPage?: string;
  sort?: string;
  dir?: string;
}>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const member = await getActiveMember();

  const filters = {
    q: params.q,
    categoryId: params.category,
    status: (params.status as "all" | "active" | "archived" | undefined) ?? "all",
    stock: (params.stock as "all" | "out" | undefined) ?? "all",
    sort: (params.sort as "name" | "sku" | "priceCentavos" | "createdAt" | undefined) ?? "name",
    dir: (params.dir as "asc" | "desc" | undefined) ?? "asc",
    page: params.page ? Number.parseInt(params.page) : 1,
    perPage: params.perPage ? Number.parseInt(params.perPage) : 20,
  } as const;

  const [productsPage, categories] = await Promise.all([
    listProducts(filters),
    listCategories(),
  ]);

  return (
    <ProductsClient
      productsPage={productsPage}
      categories={categories}
      filters={filters}
      canCreate={member.permissions.includes("product:create")}
      canEdit={member.permissions.includes("product:update")}
      canDelete={member.permissions.includes("product:delete")}
    />
  );
}
