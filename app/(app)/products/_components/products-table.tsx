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
    <>
      {/* ── Mobile card list — shown on <md ──────────────────────── */}
      <ul className="space-y-2 md:hidden">
        {items.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-[var(--shadow-card)] dark:border-neutral-800 dark:bg-neutral-950"
          >
            <div className="flex items-start gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
                {p.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.name}</div>
                <div className="truncate font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                  {p.sku}
                </div>
                {p.categoryName ? (
                  <div className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {p.categoryName}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="text-base font-semibold tabular-nums">
                  {p.priceDisplay}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Actions"
                      disabled={pending}
                      className="-mr-2 h-8 w-8"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {canEdit ? (
                      <DropdownMenuItem onClick={() => onEdit(p)}>
                        <Pencil className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                    ) : null}
                    {canEdit ? (
                      <DropdownMenuItem onClick={() => onArchive(p.id)}>
                        {p.isActive ? (
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
                          onClick={() => onDelete(p.id, p.name)}
                          className="text-red-600 focus:text-red-700 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StockCell row={p} />
              {p.isActive ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Archived</Badge>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* ── Desktop table — shown on md+ ─────────────────────────── */}
      <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[var(--shadow-card)] md:block dark:border-neutral-800 dark:bg-neutral-950">
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
    </>
  );
}
