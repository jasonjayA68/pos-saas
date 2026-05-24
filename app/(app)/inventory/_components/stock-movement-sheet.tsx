"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  adjustStock,
  stockIn,
  stockOut,
} from "@/features/inventory/actions";
import {
  AdjustStockSchema,
  StockInSchema,
  StockOutSchema,
  type AdjustStockInput,
  type StockInInput,
  type StockOutInput,
} from "@/features/inventory/schemas";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export type StockMode = "in" | "out" | "adjust";

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  currentQty: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: StockMode;
  branchId: string;
  products: ProductOption[];
  initialProductId?: string;
};

const TITLE: Record<StockMode, string> = {
  in: "Stock in",
  out: "Stock out",
  adjust: "Adjust quantity",
};

const DESCRIPTION: Record<StockMode, string> = {
  in: "Receive new stock into this branch.",
  out: "Remove stock — damage, transfer, internal use.",
  adjust: "Set the absolute on-hand quantity (cycle count).",
};

const CTA: Record<StockMode, string> = {
  in: "Receive",
  out: "Remove",
  adjust: "Update",
};

export function StockMovementSheet(props: Props) {
  if (props.mode === "adjust") {
    return <AdjustForm {...props} mode="adjust" />;
  }
  if (props.mode === "out") {
    return <StockOutForm {...props} mode="out" />;
  }
  return <StockInForm {...props} mode="in" />;
}

function StockInForm({
  open,
  onOpenChange,
  branchId,
  products,
  initialProductId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<StockInInput>({
    resolver: zodResolver(StockInSchema),
    defaultValues: {
      productId: initialProductId ?? products[0]?.id ?? "",
      branchId,
      quantity: 1,
      reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        productId: initialProductId ?? products[0]?.id ?? "",
        branchId,
        quantity: 1,
        reason: "",
      });
    }
  }, [open, initialProductId, branchId, products, form]);

  const onSubmit = (values: StockInInput) => {
    startTransition(async () => {
      const result = await stockIn(values);
      if (!result.ok) {
        applyFieldErrors(form, result.error.fields);
        if (!result.error.fields) toast.error(result.error.message);
        return;
      }
      toast.success(`Stock updated — on hand: ${result.data.balanceAfter}`);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <SheetShell open={open} onOpenChange={onOpenChange} mode="in">
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <ProductField form={form} products={products} disabled={!!initialProductId} />
        <Field
          label="Quantity"
          htmlFor="quantity"
          error={form.formState.errors.quantity?.message}
        >
          <Input id="quantity" type="number" step="0.0001" min="0" {...form.register("quantity")} />
        </Field>
        <Field
          label="Reason"
          htmlFor="reason"
          hint="Optional (e.g. 'Delivery from supplier ABC')"
          error={form.formState.errors.reason?.message}
        >
          <Textarea id="reason" rows={2} {...form.register("reason")} />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : CTA.in}
        </Button>
      </form>
    </SheetShell>
  );
}

function StockOutForm({
  open,
  onOpenChange,
  branchId,
  products,
  initialProductId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<StockOutInput>({
    resolver: zodResolver(StockOutSchema),
    defaultValues: {
      productId: initialProductId ?? products[0]?.id ?? "",
      branchId,
      quantity: 1,
      reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        productId: initialProductId ?? products[0]?.id ?? "",
        branchId,
        quantity: 1,
        reason: "",
      });
    }
  }, [open, initialProductId, branchId, products, form]);

  const onSubmit = (values: StockOutInput) => {
    startTransition(async () => {
      const result = await stockOut(values);
      if (!result.ok) {
        applyFieldErrors(form, result.error.fields);
        if (!result.error.fields) toast.error(result.error.message);
        return;
      }
      toast.success(`Stock updated — on hand: ${result.data.balanceAfter}`);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <SheetShell open={open} onOpenChange={onOpenChange} mode="out">
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <ProductField form={form} products={products} disabled={!!initialProductId} />
        <Field
          label="Quantity to remove"
          htmlFor="quantity"
          error={form.formState.errors.quantity?.message}
        >
          <Input id="quantity" type="number" step="0.0001" min="0" {...form.register("quantity")} />
        </Field>
        <Field
          label="Reason"
          htmlFor="reason"
          hint="Required — e.g. 'Damaged', 'Transfer out', 'Internal use'"
          error={form.formState.errors.reason?.message}
        >
          <Textarea id="reason" rows={2} {...form.register("reason")} />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : CTA.out}
        </Button>
      </form>
    </SheetShell>
  );
}

function AdjustForm({
  open,
  onOpenChange,
  branchId,
  products,
  initialProductId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<AdjustStockInput>({
    resolver: zodResolver(AdjustStockSchema),
    defaultValues: {
      productId: initialProductId ?? products[0]?.id ?? "",
      branchId,
      newQuantity: 0,
      reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      const selected =
        products.find((p) => p.id === initialProductId) ?? products[0];
      form.reset({
        productId: selected?.id ?? "",
        branchId,
        newQuantity: selected?.currentQty ?? 0,
        reason: "",
      });
    }
  }, [open, initialProductId, branchId, products, form]);

  const onSubmit = (values: AdjustStockInput) => {
    startTransition(async () => {
      const result = await adjustStock(values);
      if (!result.ok) {
        applyFieldErrors(form, result.error.fields);
        if (!result.error.fields) toast.error(result.error.message);
        return;
      }
      toast.success(`Stock set to ${result.data.balanceAfter}`);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <SheetShell open={open} onOpenChange={onOpenChange} mode="adjust">
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <ProductField form={form} products={products} disabled={!!initialProductId} />
        <Field
          label="New on-hand quantity"
          htmlFor="newQuantity"
          error={form.formState.errors.newQuantity?.message}
        >
          <Input
            id="newQuantity"
            type="number"
            step="0.0001"
            min="0"
            {...form.register("newQuantity")}
          />
        </Field>
        <Field
          label="Reason"
          htmlFor="reason"
          hint="Required — e.g. 'Cycle count', 'Found discrepancy'"
          error={form.formState.errors.reason?.message}
        >
          <Textarea id="reason" rows={2} {...form.register("reason")} />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : CTA.adjust}
        </Button>
      </form>
    </SheetShell>
  );
}

function SheetShell({
  open,
  onOpenChange,
  mode,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: StockMode;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{TITLE[mode]}</SheetTitle>
          <SheetDescription>{DESCRIPTION[mode]}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProductField({ form, products, disabled }: { form: any; products: ProductOption[]; disabled: boolean }) {
  const selectedId = form.watch("productId");
  const selected = products.find((p) => p.id === selectedId);
  return (
    <Field
      label="Product"
      htmlFor="productId"
      hint={selected ? `On hand: ${selected.currentQty}` : undefined}
      error={form.formState.errors.productId?.message}
    >
      <Select id="productId" disabled={disabled} {...form.register("productId")}>
        {products.length === 0 ? (
          <option value="">No products available</option>
        ) : (
          products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))
        )}
      </Select>
    </Field>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFieldErrors(form: any, fields?: Record<string, string[]>) {
  if (!fields) return;
  for (const [key, messages] of Object.entries(fields)) {
    const msg = messages?.[0];
    if (msg) form.setError(key, { message: msg });
  }
}
