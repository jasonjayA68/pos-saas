import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getPlanByCode,
  getPublicBillingSettings,
} from "@/features/billing/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPHP } from "@/lib/money";
import { PaymentSubmissionForm } from "../../_components/payment-submission-form";

export const metadata = { title: "Submit payment" };

export default async function PayPage({
  params,
}: {
  params: Promise<{ planCode: string }>;
}) {
  const { planCode } = await params;
  const [plan, settings] = await Promise.all([
    getPlanByCode(planCode),
    getPublicBillingSettings(),
  ]);

  if (!plan) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <Link
        href="/billing/plans"
        className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" /> Back to plans
      </Link>

      <PageHeader
        title={`Pay for ${plan.name}`}
        description={`${formatPHP(plan.priceCentavos)} / ${plan.billingInterval === "MONTHLY" ? "month" : "year"} — manual payment via GCash, Maya, or bank transfer.`}
      />

      {settings.instructions ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          {settings.instructions}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Send your payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <PaymentMethodBlock
              title="GCash"
              qrUrl={settings.gcashQrUrl}
              rows={[
                ["Account name", settings.gcashAccountName],
                ["Account number", settings.gcashAccountNumber],
              ]}
            />
            <Separator />
            <PaymentMethodBlock
              title="Maya"
              qrUrl={settings.mayaQrUrl}
              rows={[
                ["Account name", settings.mayaAccountName],
                ["Account number", settings.mayaAccountNumber],
              ]}
            />
            <Separator />
            <PaymentMethodBlock
              title="Bank transfer"
              qrUrl={null}
              rows={[
                ["Bank", settings.bankName],
                ["Account name", settings.bankAccountName],
                ["Account number", settings.bankAccountNumber],
                ["Branch", settings.bankBranch],
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submit proof</CardTitle>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Upload a screenshot of your payment receipt and/or paste the
              reference number. We&apos;ll activate your subscription once
              we&apos;ve verified it.
            </p>
          </CardHeader>
          <CardContent>
            <PaymentSubmissionForm
              planCode={plan.code}
              planName={plan.name}
              priceCentavos={plan.priceCentavos}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PaymentMethodBlock({
  title,
  qrUrl,
  rows,
}: {
  title: string;
  qrUrl: string | null;
  rows: Array<[string, string | null]>;
}) {
  const populated = rows.filter(([, v]) => Boolean(v));
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {qrUrl ? (
          <div className="shrink-0 rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt={`${title} QR code`}
              className="h-32 w-32 object-contain"
            />
          </div>
        ) : null}
        <dl className="grid flex-1 grid-cols-1 gap-2">
          {populated.length === 0 ? (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              {title} details haven&apos;t been configured yet.
            </div>
          ) : (
            populated.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {label}
                </dt>
                <dd className="font-mono text-sm">{value}</dd>
              </div>
            ))
          )}
        </dl>
      </div>
    </div>
  );
}
