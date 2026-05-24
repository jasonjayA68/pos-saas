import Link from "next/link";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";
import type { SubscriptionGate } from "@/lib/billing/guard";

export function BillingStatusBanner({ gate }: { gate: SubscriptionGate }) {
  if (gate.status === "active") return null;

  if (gate.status === "trialing") {
    const isWarning = (gate.daysRemaining ?? 0) <= 3;
    return (
      <div
        className={`mb-4 flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
          isWarning
            ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
            : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            {isWarning ? "Trial ending soon — " : "Free trial — "}
            <strong>
              {gate.daysRemaining ?? 0}{" "}
              {gate.daysRemaining === 1 ? "day" : "days"} remaining
            </strong>{" "}
            on the {gate.planName ?? "Starter"} plan.
          </span>
        </div>
        <Link
          href="/billing/plans"
          className="font-medium underline underline-offset-2"
        >
          Choose a plan →
        </Link>
      </div>
    );
  }

  if (gate.status === "past_due") {
    return (
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Your subscription is past due. Submit a payment to keep your
            account active.
          </span>
        </div>
        <Link
          href="/billing"
          className="font-medium underline underline-offset-2"
        >
          Pay now →
        </Link>
      </div>
    );
  }

  // Inactive states surface on /billing pages where the layout still renders.
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 shrink-0" />
        <span>
          {gate.status === "canceled"
            ? "Subscription canceled."
            : "Subscription is not active."}{" "}
          Choose a plan to restore access.
        </span>
      </div>
      <Link
        href="/billing/plans"
        className="font-medium underline underline-offset-2"
      >
        See plans →
      </Link>
    </div>
  );
}
