import { z } from "zod";

export const BUSINESS_TYPES = [
  "retail",
  "food",
  "service",
  "salon",
  "pharmacy",
  "other",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  retail: "Retail",
  food: "Food & beverage",
  service: "Services",
  salon: "Salon / beauty",
  pharmacy: "Pharmacy",
  other: "Other",
};

export const OnboardingInputSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  businessName: z.string().trim().min(2, "Enter your business name"),
  businessType: z.enum(BUSINESS_TYPES, {
    message: "Select a business type",
  }),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  email: z
    .union([z.literal(""), z.email("Enter a valid email")])
    .optional(),
  addressLine1: z.string().trim().min(2, "Enter your street address"),
  addressLine2: z.string().optional(),
  city: z.string().trim().min(1, "Required"),
  province: z.string().trim().min(1, "Required"),
  postalCode: z.string().optional(),
  taxId: z.string().optional(),
  vatRegistered: z.boolean(),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;
