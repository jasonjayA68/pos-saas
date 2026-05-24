import {
  getMySubscriptionGate,
  listActivePlans,
} from "@/features/billing/queries";
import { PageHeader } from "@/components/layout/page-header";
import { PlanCard } from "../_components/plan-card";

export const metadata = { title: "Choose a plan" };

const REASON_COPY: Record<string, { title: string; body: string }> = {
  trial_expired: {
    title: "Your free trial has ended",
    body: "Pick a plan and submit a payment to keep using the POS.",
  },
  expired: {
    title: "Your subscription has expired",
    body: "Renew by submitting a payment for any plan below.",
  },
  canceled: {
    title: "Your subscription was canceled",
    body: "Pick a plan and submit a payment to reactivate your account.",
  },
  no_subscription: {
    title: "No active subscription",
    body: "Pick a plan and submit a payment to get started.",
  },
};

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const [plans, gate] = await Promise.all([
    listActivePlans(),
    getMySubscriptionGate(),
  ]);

  const reasonCopy = reason ? REASON_COPY[reason] : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <PageHeader
        title="Choose a plan"
        description="Manual payments via GCash, Maya, or bank transfer. Approval usually takes under 24 hours."
      />

      {reasonCopy ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <div className="font-medium">{reasonCopy.title}</div>
          <div className="mt-1">{reasonCopy.body}</div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={gate.planCode === plan.code}
          />
        ))}
      </div>
    </div>
  );
}
