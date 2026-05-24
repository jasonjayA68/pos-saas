"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { createSale } from "@/features/sales/actions";
import type { PosProduct } from "@/features/sales/queries";
import type { PosPaymentMethod } from "@/features/sales/schemas";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPHP } from "@/lib/money";
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
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("CASH");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    () => freshIdempotencyKey(),
  );
  const [completed, setCompleted] = useState<CompletedSaleSnapshot | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
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

  const cartItemCount = cart.reduce((sum, l) => sum + l.quantity, 0);

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
        if (product?.trackInventory && qty > product.available) {
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
    setMobileCartOpen(false);
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
      setMobileCartOpen(false);
      router.refresh();
    });
  };

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  if (completed) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <ReceiptView sale={completed} onNewSale={resetSale} />
      </div>
    );
  }

  // The cart UI is the same on desktop and mobile — desktop renders it
  // as a column, mobile renders it inside a slide-up Sheet triggered by
  // the sticky bottom bar. One source of truth, two layouts.
  const cartProps = {
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
    onUpdateQty: updateQty,
    onRemove: removeFromCart,
    onChangeDiscount: setDiscount,
    onChangePaymentMethod: setPaymentMethod,
    onChangeAmountPaid: setAmountPaid,
    onCompleteSale: completeSale,
  };

  return (
    <>
      <div className="flex h-full flex-col gap-4 p-3 sm:p-4 lg:grid lg:grid-cols-[1fr,420px]">
        <ProductGrid
          products={products}
          searchInputRef={searchInputRef}
          onAdd={addToCart}
        />
        {/* Desktop cart — hidden below lg, where the sheet takes over. */}
        <div className="hidden lg:block">
          <CartPanel {...cartProps} />
        </div>
      </div>

      {/* Mobile-only sticky CTA — appears when the cart has items.
          Pinned above the bottom nav (bottom: 4.5rem ≈ 72px). */}
      {cart.length > 0 ? (
        <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-16 z-30 px-3 lg:hidden">
          <Button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="pointer-events-auto h-14 w-full justify-between gap-3 rounded-xl px-5 text-base shadow-[var(--shadow-overlay)]"
            aria-label={`View cart with ${cartItemCount} items, total ${formatPHP(totalCentavos)}`}
          >
            <span className="flex items-center gap-3">
              <span className="relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-semibold text-neutral-900">
                  {cartItemCount}
                </span>
              </span>
              <span>View cart</span>
            </span>
            <span className="tabular-nums">{formatPHP(totalCentavos)}</span>
          </Button>
        </div>
      ) : null}

      {/* Mobile cart drawer. The desktop layout already shows the cart
          permanently in its own column. */}
      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetContent
          side="right"
          className="flex w-full max-w-md flex-col gap-0 p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b border-neutral-200 px-4 py-3 text-left dark:border-neutral-800">
            <SheetTitle className="text-base">Your cart</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CartPanel {...cartProps} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
