"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import {
  approvePayment,
  getAdminProofUrl,
  rejectPayment,
} from "@/features/billing/admin-actions";
import type { AdminPaymentRow } from "@/features/billing/admin-queries";
import {
  MANUAL_PAYMENT_METHOD_LABELS,
  type ManualPaymentMethod,
} from "@/features/billing/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatPHDateTime } from "@/lib/dates";
import { formatPHP } from "@/lib/money";

export function AdminPaymentsClient({
  payments,
}: {
  payments: AdminPaymentRow[];
}) {
  const [selected, setSelected] = useState<AdminPaymentRow | null>(null);

  if (payments.length === 0) {
    return (
      <EmptyState
        title="No payments here"
        description="Switch filter tabs to see approved or rejected payments."
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelected(p)}
                className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50 last:border-0 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                  {formatPHDateTime(p.createdAtIso)}
                </td>
                <td className="px-4 py-3 font-medium">{p.businessName}</td>
                <td className="px-4 py-3">{p.planName}</td>
                <td className="px-4 py-3">
                  {MANUAL_PAYMENT_METHOD_LABELS[
                    p.method as ManualPaymentMethod
                  ] ?? p.method}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatPHP(p.amountCentavos)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-right text-xs text-neutral-500 dark:text-neutral-400">
                  Review →
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReviewSheet
        payment={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function StatusBadge({ status }: { status: AdminPaymentRow["status"] }) {
  if (status === "APPROVED") return <Badge variant="success">Approved</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function ReviewSheet({
  payment,
  onClose,
}: {
  payment: AdminPaymentRow | null;
  onClose: () => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setRejectReason("");
    setReviewerNote("");
    setShowRejectForm(false);
  };

  const onApprove = () => {
    if (!payment) return;
    startTransition(async () => {
      const result = await approvePayment({
        paymentId: payment.id,
        reviewerNote: reviewerNote || undefined,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Payment approved and subscription activated");
      reset();
      onClose();
    });
  };

  const onReject = () => {
    if (!payment) return;
    if (rejectReason.trim().length < 3) {
      toast.error("Provide a reason (at least 3 characters)");
      return;
    }
    startTransition(async () => {
      const result = await rejectPayment({
        paymentId: payment.id,
        rejectionReason: rejectReason.trim(),
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Payment rejected");
      reset();
      onClose();
    });
  };

  const openProof = () => {
    if (!payment) return;
    startTransition(async () => {
      const result = await getAdminProofUrl(payment.id);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  };

  return (
    <Sheet
      open={!!payment}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>Review payment</SheetTitle>
          <SheetDescription>
            {payment ? payment.businessName : ""}
          </SheetDescription>
        </SheetHeader>

        {payment ? (
          <div className="mt-6 space-y-5 text-sm">
            <DetailGrid
              rows={[
                ["Plan", `${payment.planName} (${formatPHP(payment.planPriceCentavos)} / ${payment.billingInterval === "MONTHLY" ? "mo" : "yr"})`],
                [
                  "Method",
                  MANUAL_PAYMENT_METHOD_LABELS[
                    payment.method as ManualPaymentMethod
                  ] ?? payment.method,
                ],
                ["Amount", formatPHP(payment.amountCentavos)],
                ["Reference #", payment.referenceNumber ?? "—"],
                [
                  "Submitted by",
                  `${payment.submittedByName} (${payment.submittedByEmail})`,
                ],
                ["Submitted at", formatPHDateTime(payment.createdAtIso)],
              ]}
            />

            {payment.notes ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  Notes
                </div>
                <div className="mt-1 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                  {payment.notes}
                </div>
              </div>
            ) : null}

            {payment.proofStoragePath ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={openProof}
                disabled={pending}
              >
                <ExternalLink className="h-4 w-4" /> View proof
              </Button>
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                No screenshot attached. Reference number provided only.
              </div>
            )}

            {payment.status === "PENDING" ? (
              <div className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                {showRejectForm ? (
                  <>
                    <Label htmlFor="rejectReason">Rejection reason</Label>
                    <Textarea
                      id="rejectReason"
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="What was wrong with this payment?"
                      disabled={pending}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={onReject}
                        disabled={pending}
                      >
                        Confirm rejection
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectForm(false)}
                        disabled={pending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Label htmlFor="reviewerNote">
                      Reviewer note (optional)
                    </Label>
                    <Textarea
                      id="reviewerNote"
                      rows={2}
                      value={reviewerNote}
                      onChange={(e) => setReviewerNote(e.target.value)}
                      placeholder="Internal note about this approval"
                      disabled={pending}
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={onApprove}
                        disabled={pending}
                      >
                        <Check className="h-4 w-4" />
                        {pending ? "Approving…" : "Approve & activate"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectForm(true)}
                        disabled={pending}
                      >
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-900">
                {payment.status === "APPROVED" ? "Approved" : "Rejected"}
                {payment.reviewedAtIso
                  ? ` on ${formatPHDateTime(payment.reviewedAtIso)}`
                  : ""}
                {payment.reviewedByName ? ` by ${payment.reviewedByName}` : ""}.
                {payment.rejectionReason ? (
                  <div className="mt-1">Reason: {payment.rejectionReason}</div>
                ) : null}
                {payment.reviewerNote ? (
                  <div className="mt-1">Note: {payment.reviewerNote}</div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-1 gap-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-4 border-b border-neutral-100 pb-2 last:border-0 dark:border-neutral-800"
        >
          <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
