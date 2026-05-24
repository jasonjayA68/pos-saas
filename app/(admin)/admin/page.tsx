import Link from "next/link";
import { ArrowRight, Receipt, Settings } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getAdminDashboardStats } from "@/features/billing/admin-queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPHDate } from "@/lib/dates";

export const metadata = { title: "Platform Admin" };

export default async function AdminHome() {
  const [stats, businesses] = await Promise.all([
    getAdminDashboardStats(),
    prisma.business.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        owner: { select: { email: true, fullName: true } },
        subscription: { include: { plan: { select: { code: true } } } },
        _count: { select: { members: true, branches: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6 p-6 lg:p-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Platform-wide snapshot of billing, subscriptions, and tenants.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending payments"
          value={stats.pendingPayments}
          highlight={stats.pendingPayments > 0}
        />
        <StatCard
          label="Approved this month"
          value={stats.approvedThisMonth}
        />
        <StatCard
          label="Rejected this month"
          value={stats.rejectedThisMonth}
        />
        <StatCard
          label="Active businesses"
          value={stats.activeBusinesses}
          sub={`${stats.trialingBusinesses} on trial`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Review pending payments
            </CardTitle>
            <CardDescription>
              Approve or reject manual GCash, Maya, or bank-transfer payments.
              Approving activates the subscription immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/payments"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Go to payments <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Billing settings
            </CardTitle>
            <CardDescription>
              Update GCash and Maya QR codes and the bank account details
              shown on the payment page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/billing-settings"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Edit settings <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent businesses</CardTitle>
          <CardDescription>
            Last {businesses.length} signups with plan and team counts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Business</th>
                  <th className="px-6 py-3 font-medium">Owner</th>
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-6 py-3 font-medium">Members</th>
                  <th className="px-6 py-3 font-medium">Branches</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {businesses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400"
                    >
                      No businesses yet.
                    </td>
                  </tr>
                ) : (
                  businesses.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                    >
                      <td className="px-6 py-3">
                        <div className="font-medium">{b.name}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {b.slug}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div>{b.owner.fullName ?? "—"}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {b.owner.email}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {b.subscription?.plan.code ?? (
                          <span className="text-neutral-400">no plan</span>
                        )}
                      </td>
                      <td className="px-6 py-3">{b._count.members}</td>
                      <td className="px-6 py-3">{b._count.branches}</td>
                      <td className="px-6 py-3 text-neutral-600 dark:text-neutral-400">
                        {formatPHDate(b.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={
        highlight ? "border-amber-300 ring-1 ring-amber-200 dark:border-amber-700" : ""
      }
    >
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </div>
        <div className="mt-1 text-3xl font-semibold tabular-nums">
          {value.toLocaleString()}
        </div>
        {sub ? (
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {sub}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
