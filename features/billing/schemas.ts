import { z } from "zod";
import { MANUAL_PAYMENT_METHODS } from "./constants";

export const SubmitPaymentSchema = z
  .object({
    planCode: z.string().trim().min(1),
    method: z.enum(MANUAL_PAYMENT_METHODS),
    amountCentavos: z.coerce.number().int().min(1),
    referenceNumber: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    // proofPresent is forwarded by the client form so server can validate
    // "at least one of reference OR proof" without inspecting FormData itself.
    proofPresent: z.coerce.boolean().default(false),
  })
  .refine((v) => Boolean(v.referenceNumber) || v.proofPresent, {
    message: "Provide a reference number or upload a screenshot.",
    path: ["referenceNumber"],
  });

export type SubmitPaymentInput = z.input<typeof SubmitPaymentSchema>;
export type SubmitPaymentData = z.output<typeof SubmitPaymentSchema>;

export const ApprovePaymentSchema = z.object({
  paymentId: z.string().uuid(),
  reviewerNote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});
export type ApprovePaymentInput = z.input<typeof ApprovePaymentSchema>;

export const RejectPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  rejectionReason: z.string().trim().min(3).max(500),
});
export type RejectPaymentInput = z.input<typeof RejectPaymentSchema>;

export const UpdateBillingSettingsSchema = z.object({
  gcashAccountName: z.string().trim().max(120).nullable().optional(),
  gcashAccountNumber: z.string().trim().max(60).nullable().optional(),
  gcashQrUrl: z.string().url().nullable().optional(),
  mayaAccountName: z.string().trim().max(120).nullable().optional(),
  mayaAccountNumber: z.string().trim().max(60).nullable().optional(),
  mayaQrUrl: z.string().url().nullable().optional(),
  bankName: z.string().trim().max(120).nullable().optional(),
  bankAccountName: z.string().trim().max(120).nullable().optional(),
  bankAccountNumber: z.string().trim().max(60).nullable().optional(),
  bankBranch: z.string().trim().max(120).nullable().optional(),
  instructions: z.string().trim().max(2000).nullable().optional(),
});
export type UpdateBillingSettingsInput = z.input<
  typeof UpdateBillingSettingsSchema
>;
