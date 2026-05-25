import Link from "next/link";
import type { CurrentPlanSummary } from "@/features/dashboard/queries";

// Pinned to the bottom of the desktop sidebar. Surfaces the current plan
// + a progress bar of period elapsed + a "Manage Billing" CTA so owners
// never lose track of where they stand. Hides when there's no
// subscription at all (rare — ensureTrialSubscription auto-creates one).
export function CurrentPlanCard({ plan }: { plan: CurrentPlanSummary | null }) {
  if (!plan) return null;

  const statusLabel: Record<string, string> = {
    TRIALING: "Trial",
    ACTIVE: "Active",
    PAST_DUE: "Past due",
    CANCELED: "Canceled",
    EXPIRED: "Expired",
  };
  const validUntil = plan.validUntilIso
    ? new Date(plan.validUntilIso).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-3 mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Current Plan
        </span>
        <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-xs font-medium text-[var(--brand-primary)]">
          {statusLabel[plan.status] ?? plan.status}
        </span>
      </div>
      <div className="text-sm font-semibold">{plan.planName}</div>
      {validUntil ? (
        <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Valid until {validUntil}
        </div>
      ) : null}
      {plan.pctElapsed !== null ? (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-[var(--brand-accent)] transition-all"
            style={{ width: `${plan.pctElapsed}%` }}
            aria-hidden="true"
          />
        </div>
      ) : null}
      <Link
        href="/billing"
        className="mt-3 flex h-8 w-full items-center justify-center rounded-md border border-neutral-200 bg-white text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900"
      >
        Manage Billing
      </Link>
    </div>
  );
}
