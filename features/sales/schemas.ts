import { z } from "zod";

export const POS_PAYMENT_METHODS = [
  "CASH",
  "GCASH",
  "PAYMAYA",
  "BANK_TRANSFER",
] as const;

export type PosPaymentMethod = (typeof POS_PAYMENT_METHODS)[number];

export const PaymentMethodLabels: Record<PosPaymentMethod, string> = {
  CASH: "Cash",
  GCASH: "GCash",
  PAYMAYA: "Maya",
  BANK_TRANSFER: "Bank transfer",
};

export const CreateSaleSchema = z.object({
  branchId: z.uuid(),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.coerce
          .number()
          .positive("Must be greater than 0")
          .max(100000),
      }),
    )
    .min(1, "Add at least one item to the cart"),
  discountCentavos: z.coerce.number().int().nonnegative().default(0),
  paymentMethod: z.enum(POS_PAYMENT_METHODS),
  amountPaidCentavos: z.coerce.number().int().nonnegative().default(0),
  customerId: z.uuid().optional(),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().min(8).max(64),
});

export type CreateSaleInput = z.input<typeof CreateSaleSchema>;
export type CreateSaleData = z.output<typeof CreateSaleSchema>;

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional();

export const SalesFiltersSchema = z.object({
  from: ymd,
  to: ymd,
  paymentMethod: z
    .enum(["all", "CASH", "GCASH", "PAYMAYA", "BANK_TRANSFER"])
    .default("all"),
  cashierId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(5).max(1000).default(25),
});
export type SalesFilters = z.input<typeof SalesFiltersSchema>;
export type SalesFiltersData = z.output<typeof SalesFiltersSchema>;
