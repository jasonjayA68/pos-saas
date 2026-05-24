import { z } from "zod";

export const StockInSchema = z.object({
  productId: z.uuid("Select a product"),
  branchId: z.uuid("Select a branch"),
  quantity: z.coerce
    .number()
    .positive("Must be greater than 0")
    .max(1_000_000, "Too large"),
  reason: z.string().trim().max(500).optional(),
});
export type StockInInput = z.input<typeof StockInSchema>;
export type StockInData = z.output<typeof StockInSchema>;

export const StockOutSchema = z.object({
  productId: z.uuid("Select a product"),
  branchId: z.uuid("Select a branch"),
  quantity: z.coerce
    .number()
    .positive("Must be greater than 0")
    .max(1_000_000, "Too large"),
  reason: z.string().trim().min(1, "Reason is required").max(500),
});
export type StockOutInput = z.input<typeof StockOutSchema>;
export type StockOutData = z.output<typeof StockOutSchema>;

export const AdjustStockSchema = z.object({
  productId: z.uuid("Select a product"),
  branchId: z.uuid("Select a branch"),
  newQuantity: z.coerce
    .number()
    .nonnegative("Cannot be negative")
    .max(1_000_000, "Too large"),
  reason: z.string().trim().min(1, "Reason is required").max(500),
});
export type AdjustStockInput = z.input<typeof AdjustStockSchema>;
export type AdjustStockData = z.output<typeof AdjustStockSchema>;

export type InventoryMovementRow = {
  id: string;
  type:
    | "STOCK_IN"
    | "STOCK_OUT"
    | "SALE"
    | "RETURN"
    | "ADJUSTMENT";
  delta: number;
  balance: number;
  branchName: string;
  reason: string | null;
  userName: string;
  createdAt: string;
};
