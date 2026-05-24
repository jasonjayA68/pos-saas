import Link from "next/link";
import { listAdminPayments } from "@/features/billing/admin-queries";
import { AdminPaymentsClient } from "./_components/admin-payments-client";

export const metadata = { title: "Admin · Payments" };

type Status = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: raw } = await searchParams;
  const status: Status =
    raw === "APPROVED" || raw === "REJECTED" || raw === "ALL"
      ? raw
      : "PENDING";

  const payments = await listAdminPayments({ status });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Manual subscription payments awaiting review.
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as Status[]).map((s) => (
          <Link
            key={s}
            href={`/admin/payments?status=${s}`}
            className={`rounded-md border px-3 py-1.5 ${
              status === s
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                : "border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            }`}
          >
            {s === "ALL" ? "All" : s[0] + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      <AdminPaymentsClient payments={payments} />
    </div>
  );
}
