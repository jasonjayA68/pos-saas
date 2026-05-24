import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  // Optional delta vs. yesterday/last-period. Pass null when there's
  // nothing to compare against ("first day of operation").
  deltaPct?: number | null;
  tone?: "default" | "warning";
  href?: string;
};

// Stripe-style KPI tile: icon chip + tiny label + big value + trend chip.
// Keep these visually quiet — color should live in the trend chip, not the
// card surface.
export function KpiCard({
  icon: Icon,
  label,
  value,
  deltaPct,
  tone = "default",
  href,
}: Props) {
  const positive = (deltaPct ?? 0) >= 0;
  const showDelta = deltaPct !== null && deltaPct !== undefined && isFinite(deltaPct);

  const inner = (
    <Card className={cn("p-5", tone === "warning" && "border-amber-300 dark:border-amber-700")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          <Icon className="h-4 w-4" />
        </div>
        {showDelta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
              positive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
            )}
          >
            {positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(deltaPct).toFixed(0)}%
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );

  if (href) {
    return (
      <a href={href} className="block transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 dark:focus-visible:ring-neutral-300 rounded-xl">
        {inner}
      </a>
    );
  }
  return inner;
}
