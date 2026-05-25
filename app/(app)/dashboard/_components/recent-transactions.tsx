import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RecentTransaction } from "@/features/dashboard/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPHDate } from "@/lib/dates";
import { formatPHP } from "@/lib/money";

export function RecentTransactions({
  transactions,
}: {
  transactions: RecentTransaction[];
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Recent Transactions</CardTitle>
        <Link
          href="/sales"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--brand-accent)] hover:underline"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <div className="px-6 pb-6 text-sm text-neutral-500 dark:text-neutral-400">
            No transactions yet.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-4 px-6 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {t.receiptNumber}
                  </div>
                  <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {t.customerName}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {formatPHP(t.totalCentavos)}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatPHDate(new Date(t.createdAtIso))}
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
