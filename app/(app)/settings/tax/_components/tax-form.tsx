"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTaxSettings } from "@/features/settings/actions";
import type { TaxSettings } from "@/features/settings/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Tax rate in the DB is stored in basis points (1200 = 12%) so we
// translate at the form boundary.
const bpsToPercent = (bps: number) => (bps / 100).toFixed(2);
const percentToBps = (pct: string) =>
  Math.round(Number.parseFloat(pct || "0") * 100);

export function TaxForm({ initial }: { initial: TaxSettings }) {
  const [vatRegistered, setVatRegistered] = useState(initial.vatRegistered);
  const [taxId, setTaxId] = useState(initial.taxId ?? "");
  const [ratePercent, setRatePercent] = useState(
    bpsToPercent(initial.defaultTaxRateBps),
  );
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateTaxSettings({
        vatRegistered,
        taxId,
        defaultTaxRateBps: percentToBps(ratePercent),
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Tax settings saved");
    });
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>VAT registration</CardTitle>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            When toggled on, receipts show your TIN and the VAT amount per
            line. Off means receipts are tagged NON-VAT.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3">
            <Checkbox
              checked={vatRegistered}
              onChange={(e) => setVatRegistered(e.target.checked)}
              disabled={pending}
            />
            <div>
              <div className="text-sm font-medium">
                My business is VAT-registered
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Standard PH VAT rate is 12%. If you&apos;re below the ₱3M
                annual threshold and not VAT-registered, leave this off.
              </div>
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="taxId">TIN / Tax ID</Label>
              <Input
                id="taxId"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="000-000-000-000"
                disabled={pending}
              />
            </div>
            <div>
              <Label htmlFor="rate">Default tax rate (%)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={ratePercent}
                onChange={(e) => setRatePercent(e.target.value)}
                disabled={pending || !vatRegistered}
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Applied to new products. Existing products keep their own rate.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save tax settings"}
        </Button>
      </div>
    </form>
  );
}
