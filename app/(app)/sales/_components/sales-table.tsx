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

// Compact "May 22 · 3:24 PM" — used in mobile cards where the full
// "May 22, 2026, 03:24 PM" would force awkward text wrapping.
function formatCompact(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
  const time = d.toLocaleString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  });
  return `${date} · ${time}`;
}

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
    <>
      {/* ── Mobile card list — shown on <md ──────────────────────── */}
      <ul className="space-y-2 md:hidden">
        {items.map((sale) => {
          const paymentLabel =
            PaymentMethodLabels[sale.paymentMethod as PosPaymentMethod] ??
            sale.paymentMethod;
          return (
            <li key={sale.id}>
              <button
                type="button"
                onClick={() => onSelect(sale)}
                className="w-full rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-neutral-50 active:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatCompact(sale.createdAtIso)}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                      {sale.receiptNumber}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold tabular-nums">
                      {formatPHP(sale.totalCentavos)}
                    </div>
                    {sale.voidedAt ? (
                      <Badge variant="destructive" className="mt-1">
                        Voided
                      </Badge>
                    ) : (
                      <Badge variant="success" className="mt-1">
                        Paid
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  <Badge variant="secondary">{paymentLabel}</Badge>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {sale.itemCount}{" "}
                    {sale.itemCount === 1 ? "item" : "items"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{sale.cashierName}</span>
                </div>
              </button>
            </li>
          );
        })}
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
    </>
  );
}
