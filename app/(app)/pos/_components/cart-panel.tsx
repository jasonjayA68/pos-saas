"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import {
  PaymentMethodLabels,
  POS_PAYMENT_METHODS,
  type PosPaymentMethod,
} from "@/features/sales/schemas";
import type { CartLine } from "./pos-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatPHP } from "@/lib/money";

type Props = {
  cart: CartLine[];
  subtotalCentavos: number;
  taxCentavos: number;
  discount: number;
  discountCentavos: number;
  totalCentavos: number;
  paymentMethod: PosPaymentMethod;
  amountPaid: number;
  amountPaidCentavos: number;
  changeCentavos: number;
  pending: boolean;
  canSubmit: boolean;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onChangeDiscount: (value: number) => void;
  onChangePaymentMethod: (method: PosPaymentMethod) => void;
  onChangeAmountPaid: (value: number) => void;
  onCompleteSale: () => void;
};

export function CartPanel({
  cart,
  subtotalCentavos,
  taxCentavos,
  discount,
  discountCentavos,
  totalCentavos,
  paymentMethod,
  amountPaid,
  amountPaidCentavos,
  changeCentavos,
  pending,
  canSubmit,
  onUpdateQty,
  onRemove,
  onChangeDiscount,
  onChangePaymentMethod,
  onChangeAmountPaid,
  onCompleteSale,
}: Props) {
  const quickAmounts = [
    { label: "Exact", value: totalCentavos / 100 },
    { label: "₱100", value: 100 },
    { label: "₱200", value: 200 },
    { label: "₱500", value: 500 },
    { label: "₱1,000", value: 1000 },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          <span className="font-semibold">Cart</span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {cart.length} {cart.length === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {cart.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-neutral-500 dark:text-neutral-400">
            Tap a product to add it.
          </div>
        ) : (
          <ul className="space-y-2">
            {cart.map((line) => (
              <li
                key={line.productId}
                className="rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {line.name}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatPHP(line.unitPriceCentavos)} / {line.unit}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(line.productId)}
                    className="rounded p-1 text-neutral-400 hover:text-red-500"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        onUpdateQty(line.productId, line.quantity - 1)
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={line.quantity}
                      onChange={(e) =>
                        onUpdateQty(
                          line.productId,
                          Number(e.target.value) || 0,
                        )
                      }
                      className="h-8 w-16 text-center tabular-nums"
                      min="0"
                      step="0.01"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        onUpdateQty(line.productId, line.quantity + 1)
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="font-mono text-sm font-semibold tabular-nums">
                    {formatPHP(
                      Math.round(line.quantity * line.unitPriceCentavos),
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-neutral-200 p-4 dark:border-neutral-800">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              Subtotal
            </span>
            <span className="tabular-nums">
              {formatPHP(subtotalCentavos)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="discount"
              className="text-neutral-600 dark:text-neutral-400"
            >
              Discount (₱)
            </label>
            <Input
              id="discount"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) =>
                onChangeDiscount(Math.max(0, Number(e.target.value) || 0))
              }
              className="h-8 w-24 text-right tabular-nums"
              disabled={cart.length === 0}
            />
          </div>
          {taxCentavos > 0 ? (
            <div className="flex justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">
                Tax
              </span>
              <span className="tabular-nums">
                {formatPHP(taxCentavos)}
              </span>
            </div>
          ) : null}
          {discountCentavos > 0 ? (
            <div className="flex justify-between text-amber-700 dark:text-amber-400">
              <span>Discount applied</span>
              <span className="tabular-nums">
                −{formatPHP(discountCentavos)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold dark:border-neutral-800">
            <span>Total</span>
            <span className="tabular-nums">{formatPHP(totalCentavos)}</span>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Payment
          </div>
          <div className="grid grid-cols-2 gap-2">
            {POS_PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                onClick={() => onChangePaymentMethod(m)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  m === paymentMethod
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900",
                )}
              >
                {PaymentMethodLabels[m]}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === "CASH" ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {quickAmounts.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => onChangeAmountPaid(q.value)}
                  className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="amountPaid"
                className="text-sm text-neutral-600 dark:text-neutral-400"
              >
                Amount paid (₱)
              </label>
              <Input
                id="amountPaid"
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) =>
                  onChangeAmountPaid(Number(e.target.value) || 0)
                }
                className="h-10 w-32 text-right text-base tabular-nums"
              />
            </div>
            <div className="rounded-md bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Change
                </span>
                <span
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    amountPaidCentavos < totalCentavos
                      ? "text-red-600 dark:text-red-400"
                      : "",
                  )}
                >
                  {formatPHP(changeCentavos)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            Confirm the customer paid{" "}
            <strong>{formatPHP(totalCentavos)}</strong> via{" "}
            {PaymentMethodLabels[paymentMethod]}, then complete the sale.
          </div>
        )}

        <Button
          onClick={onCompleteSale}
          disabled={!canSubmit}
          className="h-12 w-full text-base"
        >
          {pending ? "Processing…" : "Complete sale"}
        </Button>
      </div>
    </div>
  );
}
