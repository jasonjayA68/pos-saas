import type { PaymentMethod } from "@prisma/client";

export const MANUAL_PAYMENT_METHODS = [
  "GCASH",
  "PAYMAYA",
  "BANK_TRANSFER",
] as const satisfies readonly PaymentMethod[];

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export const MANUAL_PAYMENT_METHOD_LABELS: Record<ManualPaymentMethod, string> =
  {
    GCASH: "GCash",
    PAYMAYA: "Maya",
    BANK_TRANSFER: "Bank Transfer",
  };

export const TRIAL_DAYS = 14;
