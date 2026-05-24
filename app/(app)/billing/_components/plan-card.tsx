import Link from "next/link";
import { Check } from "lucide-react";
import type { PlanRow } from "@/features/billing/queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";

const FEATURE_LABELS: Record<string, string> = {
  pos: "Point of sale",
  inventory: "Inventory tracking",
  basicReports: "Basic reports",
  advancedReports: "Advanced reports",
  customerDb: "Customer database",
  ecommerce: "E-commerce integration",
  multiBranch: "Multi-branch support",
  prioritySupport: "Priority support",
};

export function PlanCard({
  plan,
  isCurrent,
}: {
  plan: PlanRow;
  isCurrent: boolean;
}) {
  const enabledFeatures = Object.entries(plan.features ?? {})
    .filter(([, v]) => v === true)
    .map(([k]) => FEATURE_LABELS[k] ?? k);

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isCurrent && "border-blue-500 ring-1 ring-blue-500",
      )}
    >
      {isCurrent ? (
        <div className="absolute -top-3 left-4">
          <Badge variant="default">Current plan</Badge>
        </div>
      ) : null}
      <CardHeader>
        <div className="text-lg font-semibold">{plan.name}</div>
        {plan.description ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {plan.description}
          </p>
        ) : null}
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight">
            {formatPHP(plan.priceCentavos)}
          </span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            /{plan.billingInterval === "MONTHLY" ? "month" : "year"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <ul className="space-y-1.5 text-sm">
          <FeatureLine>Up to {plan.maxUsers} users</FeatureLine>
          <FeatureLine>Up to {plan.maxProducts.toLocaleString()} products</FeatureLine>
          <FeatureLine>
            {plan.maxBranches === 1
              ? "Single branch"
              : `Up to ${plan.maxBranches} branches`}
          </FeatureLine>
          {enabledFeatures.map((f) => (
            <FeatureLine key={f}>{f}</FeatureLine>
          ))}
        </ul>
        <div className="mt-auto">
          <Link
            href={`/billing/pay/${plan.code}`}
            className={cn(
              buttonVariants({ variant: isCurrent ? "outline" : "default" }),
              "w-full",
            )}
          >
            {isCurrent ? "Renew or extend" : "Select plan"}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}
