"use client";

import { CheckCircle2, Plus, Printer } from "lucide-react";
import {
  PaymentMethodLabels,
  type PosPaymentMethod,
} from "@/features/sales/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPHDateTime } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import type { CompletedSaleSnapshot } from "./pos-client";

type Props = {
  sale: CompletedSaleSnapshot;
  onNewSale: () => void;
};

export function ReceiptView({ sale, onNewSale }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        <div>
          <div className="font-semibold">Sale completed</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Inventory updated, receipt below.
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="space-y-1 text-center">
          <Badge variant="outline" className="font-mono">
            {sale.receiptNumber}
          </Badge>
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            {formatPHDateTime(sale.createdAtIso)}
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {sale.branchName} · Cashier: {sale.cashierName}
          </p>
        </div>

        <Separator className="my-4" />

        <ul className="space-y-2 text-sm">
          {sale.items.map((line) => (
            <li
              key={line.productId}
              className="flex items-baseline justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{line.name}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {line.quantity} {line.unit} ×{" "}
                  {formatPHP(line.unitPriceCentavos)}
                </div>
              </div>
              <div className="font-mono tabular-nums">
                {formatPHP(
                  Math.round(line.quantity * line.unitPriceCentavos),
                )}
              </div>
            </li>
          ))}
        </ul>

        <Separator className="my-4" />

        <div className="space-y-1 text-sm">
          <Row label="Subtotal" value={formatPHP(sale.subtotalCentavos)} />
          {sale.taxCentavos > 0 ? (
            <Row label="Tax" value={formatPHP(sale.taxCentavos)} />
          ) : null}
          {sale.discountCentavos > 0 ? (
            <Row
              label="Discount"
              value={`−${formatPHP(sale.discountCentavos)}`}
              accent="amber"
            />
          ) : null}
          <div className="flex justify-between pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="font-mono tabular-nums">
              {formatPHP(sale.totalCentavos)}
            </span>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-1 text-sm">
          <Row
            label="Payment"
            value={PaymentMethodLabels[sale.paymentMethod as PosPaymentMethod]}
          />
          <Row
            label="Amount paid"
            value={formatPHP(sale.amountPaidCentavos)}
          />
          {sale.changeCentavos > 0 ? (
            <Row
              label="Change"
              value={formatPHP(sale.changeCentavos)}
              accent="emerald"
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button className="flex-1" onClick={onNewSale}>
          <Plus className="h-4 w-4" /> New sale
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "amber" | "emerald";
}) {
  return (
    <div
      className={`flex justify-between ${
        accent === "amber"
          ? "text-amber-700 dark:text-amber-400"
          : accent === "emerald"
            ? "text-emerald-700 dark:text-emerald-400"
            : ""
      }`}
    >
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
