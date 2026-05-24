"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { CategoryRow } from "@/features/categories/queries";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Filters = {
  q?: string;
  categoryId?: string;
  status: string;
  stock: string;
};

export function ProductsToolbar({
  filters,
  categories,
}: {
  filters: Filters;
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(filters.q ?? "");

  useEffect(() => {
    if (q === (filters.q ?? "")) return;
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(handle);
  }, [q, filters.q, pathname, router, searchParams]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="Search by name, SKU, or barcode…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={filters.categoryId ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
        className="sm:w-48"
        aria-label="Category"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select
        value={filters.status}
        onChange={(e) => setParam("status", e.target.value)}
        className="sm:w-36"
        aria-label="Status"
      >
        <option value="all">All status</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </Select>
      <Select
        value={filters.stock}
        onChange={(e) => setParam("stock", e.target.value)}
        className="sm:w-36"
        aria-label="Stock"
      >
        <option value="all">All stock</option>
        <option value="out">Out of stock</option>
      </Select>
    </div>
  );
}
