"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSale } from "@/features/sales/actions";
import type { PosProduct } from "@/features/sales/queries";
import type { PosPaymentMethod } from "@/features/sales/schemas";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "./product-grid";
import { CartPanel } from "./cart-panel";
import { ReceiptView } from "./receipt-view";

export type CartLine = {
  productId: string;
  name: string;
  sku: string;
  unitPriceCentavos: number;
  taxRateBps: number;
  unit: string;
  imageUrl: string | null;
  trackInventory: boolean;
  available: number;
  quantity: number;
};

export type CompletedSaleSnapshot = {
  receiptNumber: string;
  createdAtIso: string;
  cashierName: string;
  branchName: string;
  items: CartLine[];
  subtotalCentavos: number;
  discountCentavos: number;
  taxCentavos: number;
  totalCentavos: number;
  amountPaidCentavos: number;
  changeCentavos: number;
  paymentMethod: PosPaymentMethod;
};

function freshIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now();
}

type Props = {
  branchId: string;
  branchName: string;
  products: PosProduct[];
  cashierName: string;
};

export function PosClient({
  branchId,
  branchName,
  products,
  cashierName,
}: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState<number>(0); // in PHP
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("CASH");
  const [amountPaid, setAmountPaid] = useState<number>(0); // in PHP
  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    () => freshIdempotencyKey(),
  );
  const [completed, setCompleted] = useState<CompletedSaleSnapshot | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const subtotalCentavos = cart.reduce(
    (sum, l) => sum + Math.round(l.quantity * l.unitPriceCentavos),
    0,
  );
  const taxCentavos = cart.reduce(
    (sum, l) =>
      sum +
      Math.round(
        (l.quantity * l.unitPriceCentavos * l.taxRateBps) / 10000,
      ),
    0,
  );
  const discountCentavos = Math.min(
    Math.max(0, Math.round(discount * 100)),
    subtotalCentavos,
  );
  const totalCentavos = subtotalCentavos - discountCentavos + taxCentavos;
  const amountPaidCentavos =
    paymentMethod === "CASH"
      ? Math.round(amountPaid * 100)
      : totalCentavos;
  const changeCentavos = Math.max(0, amountPaidCentavos - totalCentavos);

  const canSubmit =
    cart.length > 0 &&
    (paymentMethod !== "CASH" || amountPaidCentavos >= totalCentavos) &&
    !pending;

  const addToCart = (product: PosProduct) => {
    if (product.trackInventory && product.available <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (
          product.trackInventory &&
          existing.quantity + 1 > product.available
        ) {
          toast.error(
            `Only ${product.available} ${product.unit} of ${product.name} available`,
          );
          return prev;
        }
        return prev.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPriceCentavos: product.priceCentavos,
          taxRateBps: product.taxRateBps,
          unit: product.unit,
          imageUrl: product.imageUrl,
          trackInventory: product.trackInventory,
          available: product.available,
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const product = productMap.get(productId);
        if (
          product?.trackInventory &&
          qty > product.available
        ) {
          toast.error(
            `Only ${product.available} ${product.unit} of ${product.name} available`,
          );
          return l;
        }
        return { ...l, quantity: qty };
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const resetSale = () => {
    setCart([]);
    setDiscount(0);
    setAmountPaid(0);
    setPaymentMethod("CASH");
    setIdempotencyKey(freshIdempotencyKey());
    setCompleted(null);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const completeSale = () => {
    if (!canSubmit) return;
    const snapshot: CompletedSaleSnapshot = {
      receiptNumber: "",
      createdAtIso: new Date().toISOString(),
      cashierName,
      branchName,
      items: cart,
      subtotalCentavos,
      discountCentavos,
      taxCentavos,
      totalCentavos,
      amountPaidCentavos,
      changeCentavos,
      paymentMethod,
    };

    startTransition(async () => {
      const result = await createSale({
        branchId,
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
        discountCentavos,
        paymentMethod,
        amountPaidCentavos,
        idempotencyKey,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setCompleted({
        ...snapshot,
        receiptNumber: result.data.receiptNumber,
      });
      router.refresh();
    });
  };

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  if (completed) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <ReceiptView sale={completed} onNewSale={resetSale} />
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr,420px]">
      <ProductGrid
        products={products}
        searchInputRef={searchInputRef}
        onAdd={addToCart}
      />
      <CartPanel
        cart={cart}
        subtotalCentavos={subtotalCentavos}
        taxCentavos={taxCentavos}
        discount={discount}
        discountCentavos={discountCentavos}
        totalCentavos={totalCentavos}
        paymentMethod={paymentMethod}
        amountPaid={amountPaid}
        amountPaidCentavos={amountPaidCentavos}
        changeCentavos={changeCentavos}
        pending={pending}
        canSubmit={canSubmit}
        onUpdateQty={updateQty}
        onRemove={removeFromCart}
        onChangeDiscount={setDiscount}
        onChangePaymentMethod={setPaymentMethod}
        onChangeAmountPaid={setAmountPaid}
        onCompleteSale={completeSale}
      />
    </div>
  );
}
