"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pause,
  TrendingDown,
  XCircle,
} from "lucide-react";
import type {
  SubscriptionBuckets,
  SubscriptionRow,
} from "@/features/tenants/admin-queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPHDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "active", label: "Active", icon: CheckCircle2 },
  { key: "trialing", label: "Trialing", icon: Clock },
  { key: "expiring", label: "Expiring (7d)", icon: AlertTriangle },
  { key: "past_due", label: "Past due", icon: TrendingDown },
  { key: "canceled", label: "Suspended", icon: Pause },
  { key: "expired", label: "Expired", icon: XCircle },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function SubscriptionsClient({
  buckets,
  activeTab,
}: {
  buckets: SubscriptionBuckets;
  activeTab: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab: TabKey = (TABS.find((t) => t.key === activeTab)?.key ?? "active") as TabKey;

  const rowsForTab = (t: TabKey): SubscriptionRow[] => {
    switch (t) {
      case "active": return buckets.active;
      case "trialing": return buckets.trialing;
      case "expiring": return buckets.expiringWithin7Days;
      case "past_due": return buckets.pastDue;
      case "canceled": return buckets.canceled;
      case "expired": return buckets.expired;
    }
  };

  const setTab = (t: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.push(`${pathname}?${params.toString()}`);
  };

  const rows = rowsForTab(tab);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TABS.map((t) => {
          const count = rowsForTab(t.key).length;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                tab === t.key
                  ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-900"
                  : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900",
              )}
            >
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {count}
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="No subscriptions in this bucket"
                description="Switch tabs to see other states."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Business</th>
                    <th className="px-6 py-3 font-medium">Owner</th>
                    <th className="px-6 py-3 font-medium">Plan</th>
                    <th className="px-6 py-3 font-medium">Period end</th>
                    <th className="px-6 py-3 text-right font-medium">Days left</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.businessId}
                      className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                    >
                      <td className="px-6 py-3 font-medium">
                        <Link
                          href={`/admin/tenants/${r.businessId}`}
                          className="hover:underline"
                        >
                          {r.businessName}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-neutral-600 dark:text-neutral-400">
                        {r.ownerEmail}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="secondary">{r.planName}</Badge>
                      </td>
                      <td className="px-6 py-3 text-neutral-600 dark:text-neutral-400">
                        {formatPHDate(new Date(r.currentPeriodEnd))}
                      </td>
                      <td
                        className={cn(
                          "px-6 py-3 text-right tabular-nums",
                          r.daysRemaining <= 3 && "text-amber-700 dark:text-amber-400",
                          r.daysRemaining === 0 && "text-rose-700 dark:text-rose-400",
                        )}
                      >
                        {r.daysRemaining}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
