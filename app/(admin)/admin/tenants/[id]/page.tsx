import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getTenantDetail,
  listPlanOptions,
} from "@/features/tenants/admin-queries";
import { TenantDetailClient } from "./_components/tenant-detail-client";

export const metadata = { title: "Admin · Tenant" };

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tenant, plans] = await Promise.all([
    getTenantDetail(id),
    listPlanOptions(),
  ]);
  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/tenants"
        className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tenants
      </Link>
      <TenantDetailClient tenant={tenant} plans={plans} />
    </div>
  );
}
