import { z } from "zod";

const optionalTrimmed = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

export const UpdateBusinessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(160),
  businessType: optionalTrimmed,
  phone: optionalTrimmed,
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  addressLine1: optionalTrimmed,
  addressLine2: optionalTrimmed,
  city: optionalTrimmed,
  province: optionalTrimmed,
  postalCode: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  country: z.string().trim().length(2).default("PH"),
  timezone: z.string().trim().min(1).default("Asia/Manila"),
  currency: z.string().trim().length(3).default("PHP"),
});
export type UpdateBusinessInput = z.input<typeof UpdateBusinessSchema>;

export const UpdateReceiptSchema = z.object({
  receiptHeader: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  receiptFooter: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type UpdateReceiptInput = z.input<typeof UpdateReceiptSchema>;

export const UpdateTaxSchema = z.object({
  vatRegistered: z.coerce.boolean(),
  taxId: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  defaultTaxRateBps: z.coerce
    .number()
    .int()
    .min(0, "Tax rate cannot be negative")
    .max(10_000, "Tax rate cannot exceed 100%"),
});
export type UpdateTaxInput = z.input<typeof UpdateTaxSchema>;

export const UpdateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(160),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type UpdateProfileInput = z.input<typeof UpdateProfileSchema>;

export const UpdatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(72, "Password too long"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type UpdatePasswordInput = z.input<typeof UpdatePasswordSchema>;
