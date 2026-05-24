"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createProduct,
  updateProduct,
} from "@/features/products/actions";
import {
  CreateProductSchema,
  UpdateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/features/products/schemas";
import type { ProductTableRow } from "@/features/products/queries";
import type { CategoryRow } from "@/features/categories/queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ImageUploader } from "./image-uploader";

type FormShape = CreateProductInput & { id?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ProductTableRow;
  categories: CategoryRow[];
};

function getDefaults(initial?: ProductTableRow): FormShape {
  if (!initial) {
    return {
      name: "",
      sku: "",
      barcode: "",
      description: "",
      categoryId: "",
      price: 0,
      cost: 0,
      unit: "piece",
      imageUrl: "",
      trackInventory: true,
      isActive: true,
    };
  }
  return {
    id: initial.id,
    name: initial.name,
    sku: initial.sku,
    barcode: initial.barcode ?? "",
    description: initial.description ?? "",
    categoryId: initial.categoryId ?? "",
    price: initial.priceCentavos / 100,
    cost: initial.costCentavos / 100,
    unit: initial.unit,
    imageUrl: initial.imageUrl ?? "",
    trackInventory: initial.trackInventory,
    isActive: initial.isActive,
  };
}

function applyFieldErrors(
  form: UseFormReturn<FormShape>,
  fields?: Record<string, string[]>,
): void {
  if (!fields) return;
  for (const [key, messages] of Object.entries(fields)) {
    const msg = messages?.[0];
    if (msg) form.setError(key as keyof FormShape, { message: msg });
  }
}

export function ProductSheet({ open, onOpenChange, initial, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = !!initial;
  const schema = isEdit ? UpdateProductSchema : CreateProductSchema;

  const form = useForm<FormShape>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: getDefaults(initial),
  });

  useEffect(() => {
    if (open) form.reset(getDefaults(initial));
  }, [open, initial, form]);

  const onSubmit = (values: FormShape) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateProduct({ ...values, id: initial!.id } as UpdateProductInput)
        : await createProduct(values);
      if (!result.ok) {
        applyFieldErrors(form, result.error.fields);
        if (!result.error.fields) toast.error(result.error.message);
        return;
      }
      toast.success(isEdit ? "Product updated" : "Product created");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit product" : "New product"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? `Editing ${initial?.name}`
              : "Add a product to your catalog."}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
          noValidate
        >
          <ImageUploader
            initialUrl={form.watch("imageUrl") ?? ""}
            onChange={(url) => form.setValue("imageUrl", url)}
          />
          <Field
            label="Name"
            htmlFor="name"
            error={form.formState.errors.name?.message}
          >
            <Input id="name" {...form.register("name")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="SKU"
              htmlFor="sku"
              hint={isEdit ? undefined : "Leave blank to auto-generate"}
              error={form.formState.errors.sku?.message}
            >
              <Input
                id="sku"
                placeholder="e.g. SKU-001"
                {...form.register("sku")}
              />
            </Field>
            <Field
              label="Barcode"
              htmlFor="barcode"
              hint="Optional"
              error={form.formState.errors.barcode?.message}
            >
              <Input id="barcode" {...form.register("barcode")} />
            </Field>
          </div>
          <Field
            label="Category"
            htmlFor="categoryId"
            hint={
              categories.length === 0
                ? "Create a category in the Categories sheet first."
                : undefined
            }
            error={form.formState.errors.categoryId?.message}
          >
            <Select id="categoryId" {...form.register("categoryId")}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Description"
            htmlFor="description"
            hint="Optional"
            error={form.formState.errors.description?.message}
          >
            <Textarea id="description" rows={2} {...form.register("description")} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field
              label="Selling price (₱)"
              htmlFor="price"
              error={form.formState.errors.price?.message}
            >
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...form.register("price")}
              />
            </Field>
            <Field
              label="Cost (₱)"
              htmlFor="cost"
              error={form.formState.errors.cost?.message}
            >
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                {...form.register("cost")}
              />
            </Field>
            <Field
              label="Unit"
              htmlFor="unit"
              error={form.formState.errors.unit?.message}
            >
              <Input id="unit" {...form.register("unit")} />
            </Field>
          </div>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox className="mt-0.5" {...form.register("trackInventory")} />
              <span>
                <span className="font-medium">Track inventory</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  Deduct stock automatically on sale.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox className="mt-0.5" {...form.register("isActive")} />
              <span>
                <span className="font-medium">Active</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  Visible in the POS and product picker.
                </span>
              </span>
            </label>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create product"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
