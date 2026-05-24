"use client";

import { useEffect, useState, useTransition } from "react";
import { Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { fetchReceiptData } from "@/features/sales/actions";
import type { ReceiptData, SaleRow } from "@/features/sales/queries";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptDocument } from "./receipt-document";

type Props = {
  sale: SaleRow | null;
  onOpenChange: (open: boolean) => void;
  canRefund: boolean;
};

export function SaleDetailsSheet({ sale, onOpenChange, canRefund }: Props) {
  const open = !!sale;
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !sale) {
      setReceipt(null);
      return;
    }
    startTransition(async () => {
      const result = await fetchReceiptData(sale.id);
      if (result.ok) {
        setReceipt(result.data);
      } else {
        toast.error(result.error.message);
      }
    });
  }, [open, sale]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Transaction details</SheetTitle>
          <SheetDescription>
            {sale ? sale.receiptNumber : "Loading…"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {pending || !receipt ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
              <ReceiptDocument data={receipt} />
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!receipt}
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Print receipt
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={!canRefund || !receipt}
              onClick={() =>
                toast.info("Refunds coming soon", {
                  description:
                    "The refund workflow will be added in an upcoming release.",
                })
              }
            >
              <RotateCcw className="h-4 w-4" /> Refund
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
