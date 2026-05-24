"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  archiveProduct,
  deleteProduct,
} from "@/features/products/actions";
import type { ProductTableRow } from "@/features/products/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  items: ProductTableRow[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (product: ProductTableRow) => void;
};

function StockCell({ row }: { row: ProductTableRow }) {
  if (row.stockStatus === "untracked") {
    return <Badge variant="secondary">Not tracked</Badge>;
  }
  if (row.stockStatus === "out") {
    return <Badge variant="destructive">Out · {row.quantity}</Badge>;
  }
  if (row.stockStatus === "low") {
    return <Badge variant="warning">Low · {row.quantity}</Badge>;
  }
  return <Badge variant="success">{row.quantity}</Badge>;
}

export function ProductsTable({ items, canEdit, canDelete, onEdit }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onArchive = (id: string) => {
    startTransition(async () => {
      const result = await archiveProduct(id);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(
        result.data.isActive ? "Product unarchived" : "Product archived",
      );
      router.refresh();
    });
  };

  const onDelete = (id: string, name: string) => {
    if (
      !window.confirm(
        `Delete "${name}"? This can't be undone — sales history stays but the product is removed from the catalog.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Product deleted");
      router.refresh();
    });
  };

  const columns = useMemo<ColumnDef<ProductTableRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-900">
              {row.original.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.original.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{row.original.name}</div>
              <div className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                {row.original.sku}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "categoryName",
        header: "Category",
        cell: ({ row }) =>
          row.original.categoryName ?? (
            <span className="text-neutral-400">—</span>
          ),
      },
      {
        accessorKey: "priceCentavos",
        header: () => <div className="text-right">Price</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {row.original.priceDisplay}
          </div>
        ),
      },
      {
        id: "stock",
        header: "Stock",
        cell: ({ row }) => <StockCell row={row.original} />,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Archived</Badge>
          ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Actions"
                  disabled={pending}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canEdit ? (
                  <DropdownMenuItem onClick={() => onEdit(row.original)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                ) : null}
                {canEdit ? (
                  <DropdownMenuItem
                    onClick={() => onArchive(row.original.id)}
                  >
                    {row.original.isActive ? (
                      <>
                        <Archive className="h-4 w-4" /> Archive
                      </>
                    ) : (
                      <>
                        <ArchiveRestore className="h-4 w-4" /> Unarchive
                      </>
                    )}
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        onDelete(row.original.id, row.original.name)
                      }
                      className="text-red-600 focus:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [canEdit, canDelete, pending, onEdit],
  );

  const table = useReactTable({
    data: items,
    columns,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
  });

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-800 dark:bg-neutral-950">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No products match your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 font-medium">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(
                    cell.column.columnDef.cell,
                    cell.getContext(),
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
