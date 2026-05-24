import { Skeleton } from "@/components/ui/skeleton";

// Reusable skeleton matching the table layout used across products, sales,
// staff, admin payments. Drop into loading.tsx files instead of bespoke
// skeleton markup. `rows` controls the row count, `columns` the column count.
export function TableSkeleton({
  rows = 8,
  columns = 5,
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading table"
      className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
    >
      {showHeader ? (
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-16" />
            ))}
          </div>
        </div>
      ) : null}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-4 py-3">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <Skeleton
                  key={colIdx}
                  className="h-5"
                  style={{ width: `${60 + ((rowIdx * 13 + colIdx * 7) % 35)}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
