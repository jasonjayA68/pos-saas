"use client";

import { useMemo, useState, type RefObject } from "react";
import { Search } from "lucide-react";
import type { PosProduct } from "@/features/sales/queries";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatPHP } from "@/lib/money";

type Props = {
  products: PosProduct[];
  searchInputRef: RefObject<HTMLInputElement | null>;
  onAdd: (product: PosProduct) => void;
};

export function ProductGrid({ products, searchInputRef, onAdd }: Props) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!term) return products;
    return products.filter((p) => {
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.barcode?.toLowerCase().includes(term) ?? false) ||
        (p.categoryName?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [products, term]);

  // Enter in search: if exactly one match, add it. Useful for barcode scanners.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filtered.length === 1) {
      e.preventDefault();
      onAdd(filtered[0]);
      setQ("");
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          ref={searchInputRef}
          placeholder="Search products, SKU, or scan barcode…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-11 pl-9 text-base"
          autoComplete="off"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-neutral-500 dark:text-neutral-400">
          No products match &quot;{q}&quot;.
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filtered.map((product) => {
            const outOfStock =
              product.trackInventory && product.available <= 0;
            return (
              <button
                key={product.id}
                onClick={() => onAdd(product)}
                disabled={outOfStock}
                className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white text-left transition-colors hover:border-neutral-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <div className="relative aspect-square w-full bg-neutral-100 dark:bg-neutral-800">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-neutral-400">
                      {product.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {outOfStock ? (
                    <div className="absolute right-2 top-2">
                      <Badge variant="destructive">Out</Badge>
                    </div>
                  ) : product.trackInventory && product.available <= 5 ? (
                    <div className="absolute right-2 top-2">
                      <Badge variant="warning">{product.available} left</Badge>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <div className="line-clamp-2 text-sm font-medium leading-tight">
                    {product.name}
                  </div>
                  <div className="text-base font-semibold tabular-nums">
                    {formatPHP(product.priceCentavos)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
