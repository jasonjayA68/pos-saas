"use client";

import { useState } from "react";
import { Package, Plus, Tags } from "lucide-react";
import type { CategoryRow } from "@/features/categories/queries";
import type {
  ProductsPage,
  ProductTableRow,
} from "@/features/products/queries";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { CategoriesSheet } from "./categories-sheet";
import { ProductSheet } from "./product-sheet";
import { ProductsPagination } from "./products-pagination";
import { ProductsTable } from "./products-table";
import { ProductsToolbar } from "./products-toolbar";

type Filters = {
  q?: string;
  categoryId?: string;
  status: string;
  stock: string;
  sort: string;
  dir: string;
  page: number;
  perPage: number;
};

type Props = {
  productsPage: ProductsPage;
  categories: CategoryRow[];
  filters: Filters;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function ProductsClient({
  productsPage,
  categories,
  filters,
  canCreate,
  canEdit,
  canDelete,
}: Props) {
  const [productSheet, setProductSheet] = useState<{
    open: boolean;
    initial?: ProductTableRow;
  }>({ open: false });
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const hasAnyFilter =
    !!filters.q ||
    !!filters.categoryId ||
    filters.status !== "all" ||
    filters.stock !== "all";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Products"
        description={`${productsPage.total} ${productsPage.total === 1 ? "product" : "products"}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
              <Tags className="h-4 w-4" /> Categories
            </Button>
            {canCreate ? (
              <Button onClick={() => setProductSheet({ open: true })}>
                <Plus className="h-4 w-4" /> New product
              </Button>
            ) : null}
          </div>
        }
      />

      <ProductsToolbar filters={filters} categories={categories} />

      {productsPage.items.length === 0 && !hasAnyFilter ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product to start selling."
          action={
            canCreate ? (
              <Button onClick={() => setProductSheet({ open: true })}>
                <Plus className="h-4 w-4" /> Add product
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <ProductsTable
            items={productsPage.items}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={(product) =>
              setProductSheet({ open: true, initial: product })
            }
          />
          <ProductsPagination
            page={productsPage.page}
            totalPages={productsPage.totalPages}
            total={productsPage.total}
            perPage={productsPage.perPage}
          />
        </>
      )}

      <ProductSheet
        open={productSheet.open}
        onOpenChange={(open) =>
          setProductSheet((s) => ({ open, initial: open ? s.initial : undefined }))
        }
        initial={productSheet.initial}
        categories={categories}
      />

      <CategoriesSheet
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
      />
    </div>
  );
}
