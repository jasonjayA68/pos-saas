import type { ReceiptData } from "@/features/sales/queries";
import {
  PaymentMethodLabels,
  type PosPaymentMethod,
} from "@/features/sales/schemas";
import { Separator } from "@/components/ui/separator";
import { formatPHDateTime } from "@/lib/dates";
import { formatPHP } from "@/lib/money";

export function ReceiptDocument({ data }: { data: ReceiptData }) {
  const addressLines = [
    data.business.addressLine1,
    data.business.addressLine2,
    [data.business.city, data.business.province].filter(Boolean).join(", "),
  ].filter((s) => s && s.length > 0);

  return (
    <div className="print-receipt mx-auto max-w-sm space-y-3 font-mono text-sm leading-snug">
      <div className="text-center">
        <div className="text-base font-semibold uppercase tracking-tight">
          {data.business.name}
        </div>
        {addressLines.map((line) => (
          <div key={line} className="text-xs">
            {line}
          </div>
        ))}
        {data.business.phone ? (
          <div className="text-xs">Tel: {data.business.phone}</div>
        ) : null}
        {data.business.taxId ? (
          <div className="text-xs">TIN: {data.business.taxId}</div>
        ) : null}
        <div className="text-xs">
          {data.business.vatRegistered ? "VAT REGISTERED" : "NON-VAT"}
        </div>
      </div>

      {data.business.receiptHeader ? (
        <>
          <Separator />
          <div className="text-center text-xs">
            {data.business.receiptHeader}
          </div>
        </>
      ) : null}

      <Separator />

      <div className="text-center text-xs">
        <div className="font-semibold tracking-wide">
          {data.receiptNumber}
        </div>
        <div>{formatPHDateTime(data.createdAtIso)}</div>
        <div>
          {data.branchName} · Cashier: {data.cashierName}
        </div>
      </div>

      <Separator />

      <ul className="space-y-1">
        {data.items.map((item, idx) => (
          <li key={idx}>
            <div className="truncate">{item.name}</div>
            <div className="flex justify-between text-xs">
              <span>
                {item.quantity} × {formatPHP(item.unitPriceCentavos)}
              </span>
              <span className="tabular-nums">
                {formatPHP(item.totalCentavos)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <Separator />

      <div className="space-y-0.5">
        <Row label="Subtotal" value={formatPHP(data.subtotalCentavos)} />
        {data.taxCentavos > 0 ? (
          <Row label="Tax" value={formatPHP(data.taxCentavos)} />
        ) : null}
        {data.discountCentavos > 0 ? (
          <Row
            label="Discount"
            value={`-${formatPHP(data.discountCentavos)}`}
          />
        ) : null}
        <div className="mt-1 flex justify-between border-t border-neutral-300 pt-1 text-base font-bold">
          <span>TOTAL</span>
          <span className="tabular-nums">{formatPHP(data.totalCentavos)}</span>
        </div>
      </div>

      <Separator />

      <div className="space-y-0.5 text-xs">
        <Row
          label="Payment"
          value={
            PaymentMethodLabels[data.paymentMethod as PosPaymentMethod] ??
            data.paymentMethod
          }
        />
        <Row
          label="Amount paid"
          value={formatPHP(data.amountPaidCentavos)}
        />
        {data.changeCentavos > 0 ? (
          <Row label="Change" value={formatPHP(data.changeCentavos)} />
        ) : null}
      </div>

      {data.business.receiptFooter ? (
        <>
          <Separator />
          <div className="text-center text-xs">
            {data.business.receiptFooter}
          </div>
        </>
      ) : null}

      {data.notes ? (
        <>
          <Separator />
          <div className="text-center text-xs italic">{data.notes}</div>
        </>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
