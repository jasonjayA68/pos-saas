import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Per-tone palette for the icon chip. Each KPI gets a distinct color
// so the dashboard reads at a glance (mockup pattern: blue / green /
// purple / amber). Body of the card stays neutral — color budget
// is spent on the chip and the trend pill, never on the surface.
const TONE_CLASSES = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  emerald:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  violet:
    "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  neutral:
    "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
} as const;
export type KpiTone = keyof typeof TONE_CLASSES;

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  // Optional delta vs. yesterday/last-period. Pass null when there's
  // nothing to compare against ("first day of operation").
  deltaPct?: number | null;
  deltaLabel?: string; // "vs yesterday" / "this month"
  // Optional "View items" / "View all" link rendered at the bottom of
  // the card — used for low-stock / pending counts.
  actionHref?: string;
  actionLabel?: string;
  tone?: KpiTone;
  highlight?: boolean;
  href?: string;
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  deltaPct,
  deltaLabel = "vs yesterday",
  actionHref,
  actionLabel,
  tone = "neutral",
  highlight = false,
  href,
}: Props) {
  const positive = (deltaPct ?? 0) >= 0;
  const showDelta =
    deltaPct !== null && deltaPct !== undefined && isFinite(deltaPct);

  const inner = (
    <Card
      className={cn(
        "p-5",
        highlight && "border-amber-300 dark:border-amber-700",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            {label}
          </div>
          <div className="mt-1 truncate text-2xl font-semibold tabular-nums">
            {value}
          </div>
          {showDelta ? (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {positive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span className="tabular-nums">
                {positive ? "+" : ""}
                {deltaPct.toFixed(1)}%
              </span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {deltaLabel}
              </span>
            </div>
          ) : null}
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              className="mt-2 inline-block text-xs font-medium text-[var(--brand-accent)] hover:underline"
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            TONE_CLASSES[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl transition-shadow hover:shadow-[var(--shadow-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
