"use client";

import { useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getMyProofUrl } from "@/features/billing/actions";
import type { MyPaymentRow } from "@/features/billing/queries";
import {
  MANUAL_PAYMENT_METHOD_LABELS,
  type ManualPaymentMethod,
} from "@/features/billing/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPHDateTime } from "@/lib/dates";
import { formatPHP } from "@/lib/money";

export function PaymentHistory({ payments }: { payments: MyPaymentRow[] }) {
  const [pending, startTransition] = useTransition();

  const openProof = (paymentId: string) => {
    startTransition(async () => {
      const result = await getMyProofUrl(paymentId);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment history</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="When you submit a manual payment, it'll appear here with its status."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                  >
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                      {formatPHDateTime(p.createdAtIso)}
                    </td>
                    <td className="px-4 py-3">{p.planName}</td>
                    <td className="px-4 py-3">
                      {MANUAL_PAYMENT_METHOD_LABELS[
                        p.method as ManualPaymentMethod
                      ] ?? p.method}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPHP(p.amountCentavos)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {p.referenceNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                      {p.status === "REJECTED" && p.rejectionReason ? (
                        <div className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                          {p.rejectionReason}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => openProof(p.id)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Proof
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: MyPaymentRow["status"] }) {
  if (status === "APPROVED") return <Badge variant="success">Approved</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending review</Badge>;
}
