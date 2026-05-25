import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import type { TopProduct } from "@/features/dashboard/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TopSellingProducts({
  products,
}: {
  products: TopProduct[];
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Top Selling Products</CardTitle>
        <Link
          href="/products"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--brand-accent)] hover:underline"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {products.length === 0 ? (
          <div className="px-6 pb-6 text-sm text-neutral-500 dark:text-neutral-400">
            Top sellers will show up here as you make sales.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {products.map((p, i) => (
              <li
                key={p.productId}
                className="flex items-center gap-3 px-6 py-3"
              >
                <span className="w-4 shrink-0 text-sm font-semibold text-neutral-400 tabular-nums">
                  {i + 1}
                </span>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
                  {p.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-4 w-4 text-neutral-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {p.unitsSold} sold
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
