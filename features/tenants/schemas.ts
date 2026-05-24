import { z } from "zod";

// Statuses the UI exposes for filtering. "MISSING" is synthetic — covers
// the case where a business exists but has no Subscription row at all
// (shouldn't happen if ensureTrialSubscription ran, but defensive).
export const TENANT_STATUS_FILTERS = [
  "all",
  "ACTIVE",
  "TRIALING",
  "PAST_DUE",
  "CANCELED",
  "EXPIRED",
  "MISSING",
] as const;
export type TenantStatusFilter = (typeof TENANT_STATUS_FILTERS)[number];

export const TenantsFiltersSchema = z.object({
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  status: z.enum(TENANT_STATUS_FILTERS).default("all"),
  planCode: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  includeDeleted: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(10).max(100).default(25),
});
export type TenantsFilters = z.input<typeof TenantsFiltersSchema>;
export type TenantsFiltersData = z.output<typeof TenantsFiltersSchema>;

// ── Admin action schemas ──────────────────────────────────────────────

export const SuspendTenantSchema = z.object({
  businessId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});
export type SuspendTenantInput = z.input<typeof SuspendTenantSchema>;

export const ReactivateTenantSchema = z.object({
  businessId: z.string().uuid(),
});
export type ReactivateTenantInput = z.input<typeof ReactivateTenantSchema>;

export const ExtendSubscriptionSchema = z.object({
  businessId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(365),
  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});
export type ExtendSubscriptionInput = z.input<typeof ExtendSubscriptionSchema>;

export const ChangeTenantPlanSchema = z.object({
  businessId: z.string().uuid(),
  planCode: z.string().trim().min(1).max(40),
  resetPeriod: z.coerce.boolean().default(false),
});
export type ChangeTenantPlanInput = z.input<typeof ChangeTenantPlanSchema>;

export const ResetTenantTrialSchema = z.object({
  businessId: z.string().uuid(),
  trialDays: z.coerce.number().int().min(1).max(60).default(14),
});
export type ResetTenantTrialInput = z.input<typeof ResetTenantTrialSchema>;

export const DeleteTenantSchema = z.object({
  businessId: z.string().uuid(),
  // Hard guard — caller must explicitly opt in with the literal `true`
  // so a typo in JSON can't accidentally nuke a tenant.
  confirm: z.literal(true),
});
export type DeleteTenantInput = z.input<typeof DeleteTenantSchema>;
