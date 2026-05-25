"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type {
  TenantRow,
  TenantsPage,
} from "@/features/tenants/admin-queries";
import {
  TENANT_STATUS_FILTERS,
  type TenantStatusFilter,
} from "@/features/tenants/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatPHDate } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { TenantActionsMenu } from "./tenant-actions-menu";

type PlanOption = { code: string; name: string; priceCentavos: number };

type Filters = {
  search?: string;
  status: TenantStatusFilter;
  planCode?: string;
  includeDeleted: boolean;
  page: number;
  perPage: number;
};

const STATUS_LABEL: Record<TenantStatusFilter, string> = {
  all: "All statuses",
  ACTIVE: "Active",
  TRIALING: "Trialing",
  PAST_DUE: "Past due",
  CANCELED: "Suspended",
  EXPIRED: "Expired",
  MISSING: "No subscription",
};

export function TenantsClient({
  page,
  filters,
  plans,
}: {
  page: TenantsPage;
  filters: Filters;
  plans: PlanOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [, startTransition] = useTransition();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== "") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParam("search", searchInput.trim());
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const columns = useMemo<ColumnDef<TenantRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Business",
        cell: ({ row }) => (
          <Link
            href={`/admin/tenants/${row.original.id}`}
            className="block min-w-0"
          >
            <div className="truncate font-medium hover:underline">
              {row.original.name}
              {row.original.deletedAt ? (
                <Badge variant="destructive" className="ml-2">
                  Deleted
                </Badge>
              ) : null}
            </div>
            <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {row.original.slug}
            </div>
          </Link>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate">{row.original.ownerName || "—"}</div>
            <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {row.original.ownerEmail}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "planName",
        header: "Plan",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.planName ?? (
              <span className="text-neutral-400">none</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "subscriptionStatus",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.subscriptionStatus} />,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {formatPHDate(new Date(row.original.createdAt))}
          </span>
        ),
      },
      {
        accessorKey: "currentPeriodEnd",
        header: "Expires",
        cell: ({ row }) =>
          row.original.currentPeriodEnd ? (
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {formatPHDate(new Date(row.original.currentPeriodEnd))}
            </span>
          ) : (
            <span className="text-neutral-400">—</span>
          ),
      },
      {
        accessorKey: "membersCount",
        header: () => <div className="text-right">Members</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {row.original.membersCount}
          </div>
        ),
      },
      {
        accessorKey: "totalSalesCentavos",
        header: () => <div className="text-right">Total sales</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            <div className="font-medium">
              {formatPHP(row.original.totalSalesCentavos)}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {row.original.totalSalesCount} tx
            </div>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <TenantActionsMenu tenant={row.original} plans={plans} />
          </div>
        ),
      },
    ],
    [plans],
  );

  const table = useReactTable({
    data: page.items,
    columns,
    manualPagination: true,
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const start = page.total === 0 ? 0 : (page.page - 1) * page.perPage + 1;
  const end = Math.min(start + page.perPage - 1, page.total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={submitSearch} className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search business name, slug, or owner email…"
            className="pl-9"
            aria-label="Search tenants"
          />
        </form>

        <Select
          value={filters.status}
          onChange={(e) => setParam("status", e.target.value)}
          className="w-48"
          aria-label="Status filter"
        >
          {TENANT_STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>

        <Select
          value={filters.planCode ?? ""}
          onChange={(e) => setParam("planCode", e.target.value)}
          className="w-40"
          aria-label="Plan filter"
        >
          <option value="">All plans</option>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </Select>

        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={filters.includeDeleted}
            onChange={(e) => setParam("includeDeleted", e.target.checked ? "1" : "")}
            className="h-4 w-4 rounded border-neutral-300"
          />
          Include deleted
        </label>
      </div>

      {page.items.length === 0 ? (
        <EmptyState
          title="No tenants match"
          description="Try adjusting the search or filters above."
        />
      ) : (
        <>
          {/* ── Mobile card list — shown on <md ──────────────────── */}
          <ul className="space-y-2 md:hidden">
            {page.items.map((tenant) => (
              <li
                key={tenant.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-[var(--shadow-card)] dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/admin/tenants/${tenant.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="truncate font-medium">
                      {tenant.name}
                      {tenant.deletedAt ? (
                        <Badge variant="destructive" className="ml-2">
                          Deleted
                        </Badge>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {tenant.ownerEmail}
                    </div>
                  </Link>
                  <div className="shrink-0">
                    <TenantActionsMenu tenant={tenant} plans={plans} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <StatusBadge status={tenant.subscriptionStatus} />
                  {tenant.planName ? (
                    <Badge variant="secondary">{tenant.planName}</Badge>
                  ) : null}
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {tenant.membersCount}{" "}
                    {tenant.membersCount === 1 ? "member" : "members"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Created {formatPHDate(new Date(tenant.createdAt))}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatPHP(tenant.totalSalesCentavos)}{" "}
                    <span className="text-neutral-400">
                      ({tenant.totalSalesCount} tx)
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* ── Desktop table — shown on md+ ─────────────────────── */}
          <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[var(--shadow-card)] md:block dark:border-neutral-800 dark:bg-neutral-950">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id} className="px-4 py-3 font-medium">
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
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
                      <td key={cell.id} className="px-4 py-3 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {page.total === 0 ? "0 tenants" : `${start}–${end} of ${page.total}`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page.page <= 1}
            onClick={() => goToPage(page.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
            Page {page.page} of {page.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page.page >= page.totalPages}
            onClick={() => goToPage(page.page + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TenantRow["subscriptionStatus"] }) {
  const config: Record<TenantRow["subscriptionStatus"], { variant: "default" | "secondary" | "success" | "destructive"; label: string }> = {
    ACTIVE: { variant: "success", label: "Active" },
    TRIALING: { variant: "secondary", label: "Trialing" },
    PAST_DUE: { variant: "secondary", label: "Past due" },
    CANCELED: { variant: "destructive", label: "Suspended" },
    EXPIRED: { variant: "destructive", label: "Expired" },
    MISSING: { variant: "secondary", label: "No subscription" },
  };
  const c = config[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
