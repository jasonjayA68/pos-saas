import Link from "next/link";
import { CreditCard } from "lucide-react";
import {
  getMySubscriptionGate,
  listMyPayments,
} from "@/features/billing/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPHDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PaymentHistory } from "./_components/payment-history";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const [gate, payments] = await Promise.all([
    getMySubscriptionGate(),
    listMyPayments(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <PageHeader
        title="Billing"
        description="Your subscription and payment history."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Current subscription</CardTitle>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {gate.planName ? `${gate.planName} plan` : "No active plan"}
            </p>
          </div>
          <StatusBadge status={gate.status} />
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Status"
              value={gate.status.replace("_", " ").toUpperCase()}
            />
            <Field
              label={
                gate.status === "trialing"
                  ? "Trial ends"
                  : "Current period ends"
              }
              value={
                gate.currentPeriodEnd
                  ? formatPHDateTime(gate.currentPeriodEnd.toISOString())
                  : "—"
              }
            />
            {gate.daysRemaining !== null ? (
              <Field
                label="Days remaining"
                value={`${gate.daysRemaining}`}
              />
            ) : null}
          </dl>
          <div className="mt-6">
            <Link
              href="/billing/plans"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <CreditCard className="h-4 w-4" />
              {gate.status === "active" || gate.status === "trialing"
                ? "Change or renew plan"
                : "Choose a plan"}
            </Link>
          </div>
        </CardContent>
      </Card>

      <PaymentHistory payments={payments} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: "success" | "secondary" | "destructive" =
    status === "active"
      ? "success"
      : status === "trialing" || status === "past_due"
        ? "secondary"
        : "destructive";
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
        {value}
      </dd>
    </div>
  );
}
