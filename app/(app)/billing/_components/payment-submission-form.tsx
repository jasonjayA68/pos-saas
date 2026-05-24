"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitPayment } from "@/features/billing/actions";
import {
  MANUAL_PAYMENT_METHODS,
  MANUAL_PAYMENT_METHOD_LABELS,
  type ManualPaymentMethod,
} from "@/features/billing/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  planCode: string;
  planName: string;
  priceCentavos: number;
};

export function PaymentSubmissionForm({
  planCode,
  planName,
  priceCentavos,
}: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<ManualPaymentMethod>("GCASH");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});

    if (proof && proof.size > MAX_BYTES) {
      setFieldErrors({ proof: ["File must be under 5 MB."] });
      return;
    }
    if (!reference.trim() && !proof) {
      setFieldErrors({
        referenceNumber: [
          "Provide a reference number or upload a screenshot.",
        ],
      });
      return;
    }

    const formData = new FormData();
    formData.set("planCode", planCode);
    formData.set("method", method);
    formData.set("amountCentavos", String(priceCentavos));
    if (reference.trim()) formData.set("referenceNumber", reference.trim());
    if (notes.trim()) formData.set("notes", notes.trim());
    if (proof) formData.set("proof", proof);

    startTransition(async () => {
      const result = await submitPayment(formData);
      if (!result.ok) {
        setFieldErrors(result.error.fields ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success("Payment submitted", {
        description:
          "We'll review it and activate your subscription within 24 hours.",
      });
      router.push("/billing");
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="method">Payment method</Label>
        <Select
          id="method"
          value={method}
          onChange={(e) => setMethod(e.target.value as ManualPaymentMethod)}
          disabled={pending}
        >
          {MANUAL_PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {MANUAL_PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="referenceNumber">Reference number</Label>
        <Input
          id="referenceNumber"
          type="text"
          placeholder="e.g. GC1234567890"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          disabled={pending}
          aria-invalid={Boolean(fieldErrors.referenceNumber)}
        />
        {fieldErrors.referenceNumber ? (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {fieldErrors.referenceNumber[0]}
          </p>
        ) : (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Required if you don&apos;t upload a screenshot.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="proof">Payment screenshot</Label>
        <Input
          id="proof"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => setProof(e.target.files?.[0] ?? null)}
          disabled={pending}
          aria-invalid={Boolean(fieldErrors.proof)}
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          PNG, JPEG, WEBP, or PDF — up to 5 MB.
        </p>
        {fieldErrors.proof ? (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {fieldErrors.proof[0]}
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Anything we should know about this payment?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={pending}
        />
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        Submitting payment for <strong>{planName}</strong>. Status will appear
        on the Billing page within a few seconds of approval.
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Submitting…" : "Submit payment for review"}
      </Button>
    </form>
  );
}
