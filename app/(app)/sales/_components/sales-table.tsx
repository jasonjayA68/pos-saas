"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { SaleRow } from "@/features/sales/queries";
import {
  PaymentMethodLabels,
  type PosPaymentMethod,
} from "@/features/sales/schemas";
import { Badge } from "@/components/ui/badge";
import { formatPHDateTime } from "@/lib/dates";
import { formatPHP } from "@/lib/money";

type Props = {
  items: SaleRow[];
  onSelect: (row: SaleRow) => void;
};

export function SalesTable({ items, onSelect }: Props) {
  const columns = useMemo<ColumnDef<SaleRow>[]>(
    () => [
      {
        accessorKey: "receiptNumber",
        header: "Receipt #",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.receiptNumber}</span>
        ),
      },
      {
        accessorKey: "createdAtIso",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-neutral-700 dark:text-neutral-300">
            {formatPHDateTime(row.original.createdAtIso)}
          </span>
        ),
      },
      {
        accessorKey: "itemCount",
        header: () => <div className="text-right">Items</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-neutral-600 dark:text-neutral-400">
            {row.original.itemCount}
          </div>
        ),
      },
      {
        accessorKey: "totalCentavos",
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium tabular-nums">
            {formatPHP(row.original.totalCentavos)}
          </div>
        ),
      },
      {
        accessorKey: "paymentMethod",
        header: "Payment",
        cell: ({ row }) => (
          <Badge variant="secondary">
            {PaymentMethodLabels[
              row.original.paymentMethod as PosPaymentMethod
            ] ?? row.original.paymentMethod}
          </Badge>
        ),
      },
      {
        accessorKey: "cashierName",
        header: "Cashier",
        cell: ({ row }) => (
          <span className="text-neutral-700 dark:text-neutral-300">
            {row.original.cashierName}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.voidedAt ? (
            <Badge variant="destructive">Voided</Badge>
          ) : (
            <Badge variant="success">Paid</Badge>
          ),
      },
    ],
    [],
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
          No sales match your filters.
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
              onClick={() => onSelect(row.original)}
              className="cursor-pointer border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
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
