import { getSubscriptionBuckets } from "@/features/tenants/admin-queries";
import { PageHeader } from "@/components/layout/page-header";
import { SubscriptionsClient } from "./_components/subscriptions-client";

export const metadata = { title: "Admin · Subscriptions" };

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const buckets = await getSubscriptionBuckets();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Lifecycle view across every tenant's subscription."
      />
      <SubscriptionsClient buckets={buckets} activeTab={tab ?? "active"} />
    </div>
  );
}
