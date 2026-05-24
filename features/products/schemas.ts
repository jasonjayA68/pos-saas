import { z } from "zod";

const skuPattern = /^[A-Za-z0-9-_.]*$/;

export const CreateProductSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  sku: z
    .string()
    .trim()
    .max(64)
    .regex(skuPattern, "Use only letters, numbers, -, _, .")
    .optional(),
  barcode: z.string().trim().max(64).optional(),
  description: z.string().trim().max(1000).optional(),
  categoryId: z.string().trim().optional(),
  price: z.coerce
    .number()
    .nonnegative("Must be 0 or more")
    .max(10_000_000),
  cost: z.coerce
    .number()
    .nonnegative("Must be 0 or more")
    .max(10_000_000)
    .default(0),
  unit: z.string().trim().default("piece"),
  imageUrl: z.string().trim().max(2048).optional(),
  trackInventory: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
export type CreateProductInput = z.input<typeof CreateProductSchema>;
export type CreateProductData = z.output<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.extend({
  id: z.uuid(),
});
export type UpdateProductInput = z.input<typeof UpdateProductSchema>;

export const ProductFiltersSchema = z.object({
  q: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  status: z.enum(["all", "active", "archived"]).default("all"),
  stock: z.enum(["all", "out"]).default("all"),
  sort: z
    .enum(["name", "sku", "priceCentavos", "createdAt"])
    .default("name"),
  dir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(20),
});
export type ProductFilters = z.input<typeof ProductFiltersSchema>;
export type ProductFiltersData = z.output<typeof ProductFiltersSchema>;
